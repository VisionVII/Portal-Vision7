// Coachmark do tutorial: destaca um elemento (via data-tour) e mostra título/corpo/progresso.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { TourStep } from './tour-types';

interface TourSpotlightProps {
  step: TourStep;
  stepIndex: number;
  stepCount: number;
  isLastStep: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onFinish: () => void;
}

/** Escolhe, entre todos os elementos com o mesmo data-tour, o primeiro que está
 * realmente visível — o sidebar renderiza nav mobile e desktop em simultâneo,
 * só a visibilidade CSS (breakpoint) muda. */
function resolveVisibleTarget(selector: string): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector));
  return candidates.find((el) => {
    if (el.offsetParent === null) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }) ?? null;
}

const CARD_WIDTH = 320;
const GAP = 12;

function computePosition(rect: DOMRect, placement: TourStep['placement']) {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const resolvedPlacement = placement ?? 'bottom';

  let top = rect.bottom + GAP;
  let left = rect.left;

  if (resolvedPlacement === 'top') {
    top = rect.top - GAP;
  } else if (resolvedPlacement === 'left') {
    top = rect.top;
    left = rect.left - CARD_WIDTH - GAP;
  } else if (resolvedPlacement === 'right') {
    top = rect.top;
    left = rect.right + GAP;
  }

  // Keep the card inside the viewport with a small margin.
  left = Math.min(Math.max(left, 12), viewportW - CARD_WIDTH - 12);
  if (resolvedPlacement !== 'top') {
    top = Math.min(top, viewportH - 12);
  }
  top = Math.max(top, 12);

  return { top, left, placement: resolvedPlacement };
}

export function TourSpotlight({
  step, stepIndex, stepCount, isLastStep, onNext, onPrev, onSkip, onFinish,
}: TourSpotlightProps) {
  const [coords, setCoords] = useState<{ top: number; left: number; placement: string } | null>(null);
  const [ringStyle, setRingStyle] = useState<React.CSSProperties | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useLayoutEffect(() => {
    const update = () => {
      const target = resolveVisibleTarget(step.targetSelector);
      if (!target) {
        setCoords(null);
        setRingStyle(null);
        return;
      }
      const rect = target.getBoundingClientRect();
      setCoords(computePosition(rect, step.placement));
      setRingStyle({
        position: 'fixed',
        top: rect.top - 4,
        left: rect.left - 4,
        width: rect.width + 8,
        height: rect.height + 8,
        pointerEvents: 'none',
        zIndex: 60,
        borderRadius: 12,
      });
    };

    const target = resolveVisibleTarget(step.targetSelector);
    target?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'center',
    });

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id]);

  useEffect(() => {
    cardRef.current?.focus();
  }, [step.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onSkip();
        return;
      }
      if (event.key === 'Tab' && cardRef.current) {
        const focusables = cardRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onSkip]);

  const progressValue = Math.round(((stepIndex + 1) / stepCount) * 100);

  return createPortal(
    <>
      {ringStyle && (
        <div
          style={ringStyle}
          className="ring-2 ring-primary ring-offset-2 ring-offset-background transition-all duration-200"
        />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-spotlight-title"
        tabIndex={-1}
        style={coords ? { position: 'fixed', top: coords.top, left: coords.left, width: CARD_WIDTH, zIndex: 61 } : {
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: CARD_WIDTH, zIndex: 61,
        }}
        className="rounded-xl border border-border bg-popover text-popover-foreground shadow-lg outline-none animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between gap-2 px-4 pt-4">
          <p id="tour-spotlight-title" className="text-sm font-semibold text-foreground">
            {step.title}
          </p>
          <button
            type="button"
            onClick={onSkip}
            aria-label="Saltar tutorial"
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <p className="px-4 pt-1.5 text-xs leading-relaxed text-muted-foreground">
          {step.body}
        </p>

        <div className="px-4 pt-3">
          <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
            <span>Passo {stepIndex + 1} de {stepCount}</span>
            <span>{progressValue}%</span>
          </div>
          <Progress value={progressValue} className="h-1.5" />
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <Button variant="ghost" size="sm" className="text-xs" onClick={onSkip}>
            Saltar tutorial
          </Button>
          <div className="flex items-center gap-1.5">
            {stepIndex > 0 && (
              <Button variant="outline" size="sm" className="text-xs" onClick={onPrev}>
                Anterior
              </Button>
            )}
            <Button size="sm" className="text-xs" onClick={isLastStep ? onFinish : onNext}>
              {isLastStep ? 'Concluir' : 'Seguinte'}
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
