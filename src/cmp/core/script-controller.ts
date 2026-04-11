/**
 * CMP — Script Blocking / Releasing System
 *
 * Intercepts scripts tagged with `type="text/plain" data-consent-category="..."`.
 * After consent is granted, dynamically activates them.
 *
 * Zero framework dependencies. Works with any HTML page.
 *
 * Usage in HTML:
 *   <script type="text/plain" data-consent-category="analytics" src="https://..."></script>
 *   <script type="text/plain" data-consent-category="marketing">
 *     // inline code
 *   </script>
 */

import type { ConsentCategory, ConsentState } from './types';
import { isAllowed, on } from './engine';

const ATTR = 'data-consent-category';
const BLOCKED_TYPE = 'text/plain';

/** Track which script elements we've already activated (avoid double-exec) */
const activatedScripts = new WeakSet<HTMLScriptElement>();

/**
 * Scan the DOM for blocked scripts and release those whose category is consented.
 * Called after engine init and on every consent update.
 */
export function releaseConsentedScripts(consent?: ConsentState): void {
  const scripts = document.querySelectorAll<HTMLScriptElement>(
    `script[${ATTR}][type="${BLOCKED_TYPE}"]`,
  );

  for (const original of scripts) {
    if (activatedScripts.has(original)) continue;

    const category = original.getAttribute(ATTR) as ConsentCategory | null;
    if (!category) continue;

    const allowed = consent ? consent[category] === true : isAllowed(category);
    if (!allowed) continue;

    activateScript(original);
  }
}

/**
 * Activate a blocked script by cloning it with the correct type.
 * The browser won't execute a `type="text/plain"` script, so we create a new one.
 */
function activateScript(original: HTMLScriptElement): void {
  activatedScripts.add(original);

  const activated = document.createElement('script');

  // Copy all attributes except type
  for (const attr of original.attributes) {
    if (attr.name === 'type') continue;
    activated.setAttribute(attr.name, attr.value);
  }

  // Set executable type
  activated.type = original.getAttribute('data-original-type') || 'text/javascript';

  // Copy inline content
  if (!original.src && original.textContent) {
    activated.textContent = original.textContent;
  }

  // Replace in DOM
  original.parentNode?.replaceChild(activated, original);
}

/**
 * Observe DOM for dynamically inserted blocked scripts (SPA navigation).
 */
let observer: MutationObserver | null = null;

export function startObserver(): void {
  if (observer || typeof MutationObserver === 'undefined') return;

  observer = new MutationObserver((mutations) => {
    let hasNewScripts = false;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (
          node instanceof HTMLScriptElement &&
          node.type === BLOCKED_TYPE &&
          node.hasAttribute(ATTR)
        ) {
          hasNewScripts = true;
          break;
        }
      }
      if (hasNewScripts) break;
    }
    if (hasNewScripts) releaseConsentedScripts();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

export function stopObserver(): void {
  observer?.disconnect();
  observer = null;
}

/**
 * Initialize the script controller.
 * Should be called after engine.init().
 */
export function initScriptController(): void {
  // Release currently consented scripts
  releaseConsentedScripts();

  // Start observing for new scripts
  startObserver();

  // Re-scan on consent changes
  on('consent:updated', (event) => {
    releaseConsentedScripts(event.consent);
  });

  // On reset, we don't need to do anything — blocked scripts stay blocked
}
