/**
 * CMP — Type definitions
 * Shared across Core Engine, UI Layer, Script Loader, and API Layer.
 * Zero dependencies.
 */

export type ConsentCategory = 'necessary' | 'analytics' | 'marketing' | 'personalization';

export interface ConsentState {
  [key: string]: boolean;
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
}

export interface ConsentRecord {
  /** Anonymous or authenticated user ID */
  userId: string;
  /** Domain that collected consent */
  domain: string;
  /** Category-level consent choices */
  consent: ConsentState;
  /** ISO-8601 timestamp */
  timestamp: string;
  /** Policy version at time of consent */
  version: string;
  /** Consent collection method */
  method: 'banner' | 'preferences' | 'api';
}

export interface PolicyVersion {
  version: string;
  effectiveDate: string;
  categories: ConsentCategory[];
  defaultConsent: ConsentState;
}

export interface CMPConfig {
  /** Current domain */
  domain: string;
  /** Active policy version */
  policyVersion: string;
  /** Categories available */
  categories: CategoryInfo[];
  /** Default consent state for new visitors */
  defaults: ConsentState;
  /** Whether geo-based rules are active */
  geoRulesEnabled: boolean;
}

export interface CategoryInfo {
  id: ConsentCategory;
  label: string;
  description: string;
  required: boolean;
  /** LGPD/GDPR legal basis */
  legalBasis: 'legitimate-interest' | 'consent' | 'contract' | 'legal-obligation';
  /** Data retention period description */
  retention: string;
  /** Vendors/services using this category */
  vendors?: string[];
}

export type ConsentEventType =
  | 'consent:loaded'
  | 'consent:updated'
  | 'consent:reset'
  | 'consent:banner-show'
  | 'consent:banner-hide'
  | 'consent:scripts-released';

export interface ConsentEvent {
  type: ConsentEventType;
  consent: ConsentState;
  timestamp: string;
  version: string;
}

/** SaaS-ready flags (disabled by default) */
export interface SaaSFlags {
  multiTenant: boolean;
  whiteLabel: boolean;
  advancedLogs: boolean;
  customBranding: boolean;
}
