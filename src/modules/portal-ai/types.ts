export type PortalAssistantSkillId =
  | 'news-search'
  | 'tool-discovery'
  | 'content-guidance'
  | 'category-routing'
  | 'partner-offers';

export interface PortalAssistantSkill {
  id: PortalAssistantSkillId;
  label: string;
  description: string;
  guardrails: string[];
}

export interface PortalAssistantConfig {
  provider: 'local-preview' | 'openai-compatible';
  model: string;
  enabled: boolean;
  requiresApiKey: boolean;
  apiBaseUrl?: string;
  scope: string[];
}

export interface PortalAssistantReplyLink {
  label: string;
  href: string;
  type: 'post' | 'course' | 'category' | 'action';
}

export interface PortalAssistantReply {
  summary: string;
  suggestions: string[];
  links: PortalAssistantReplyLink[];
}

export interface PortalAssistantKnowledgePost {
  title: string;
  excerpt: string;
  slug: string;
  category?: string;
}

export interface PortalAssistantKnowledgeCourse {
  title: string;
  description: string;
  slug: string;
}

export interface PortalAssistantKnowledgeCategory {
  name: string;
  slug: string;
}

export interface PortalAssistantKnowledge {
  posts: PortalAssistantKnowledgePost[];
  courses: PortalAssistantKnowledgeCourse[];
  categories: PortalAssistantKnowledgeCategory[];
}
