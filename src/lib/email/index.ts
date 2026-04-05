export { renderEmailTemplate, getAvailableTemplates } from './templates';
export { generateSecurityCode, generateSecurityToken, isCodeExpired, formatRemainingTime, CODE_EXPIRY_MINUTES, MAX_VERIFICATION_ATTEMPTS, LOCKOUT_DURATION_MINUTES } from './security-codes';
export type { EmailTemplateType, EmailTemplateData, EmailPayload, SecurityCode } from './types';
