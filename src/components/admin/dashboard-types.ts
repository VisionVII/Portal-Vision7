export type AdminView =
  | 'overview'
  | 'content'
  | 'audiocasts'
  | 'builder'
  | 'media'
  | 'automations'
  | 'courses'
  | 'crm'
  | 'access'
  | 'developer'
  | 'settings';

export const VIEW_ACCESS_RULES: Record<AdminView, string[]> = {
  overview: ['super_admin', 'admin', 'editor', 'redator', 'moderador', 'analyst'],
  builder: ['super_admin', 'admin', 'editor'],
  content: ['super_admin', 'admin', 'editor', 'redator', 'moderador'],
  audiocasts: ['super_admin', 'admin', 'editor'],
  media: ['super_admin', 'admin', 'editor', 'redator'],
  automations: ['super_admin', 'admin', 'editor'],
  courses: ['super_admin', 'admin', 'editor'],
  crm: ['super_admin', 'admin', 'editor', 'analyst'],
  access: ['super_admin', 'admin'],
  developer: ['super_admin', 'admin'],
  settings: ['super_admin', 'admin'],
};
