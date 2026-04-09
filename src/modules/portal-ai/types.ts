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
  provider: 'local-preview' | 'openai-compatible' | 'groq-edge';
  model: string;
  enabled: boolean;
  requiresApiKey: boolean;
  apiBaseUrl?: string;
  scope: string[];
  assistantId?: string;
  edgeFunctionName?: string;
  fallbackProvider?: 'local-preview' | 'openai-compatible' | 'groq-edge';
  sddPath?: string;
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
  provider?: 'local-preview' | 'groq-edge';
  assistantId?: string;
  sddVersion?: string;
}

export interface PortalAssistantConversationTurn {
  role: 'user' | 'assistant';
  text: string;
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

export interface PortalAssistantViewerContext {
  hasConsent: boolean;
  country?: string | null;
  region?: string | null;
  timezone?: string | null;
  localTime?: string | null;
  temperatureC?: number | null;
}

export interface PortalAssistantRequest {
  question: string;
  assistantId: string;
  provider: 'local-preview' | 'groq-edge';
  knowledge: PortalAssistantKnowledge;
  conversation?: PortalAssistantConversationTurn[];
  viewerContext?: PortalAssistantViewerContext;
}
