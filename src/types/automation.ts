export type Automation = {
  id: string;
  name: string;
  workflowId: string;
  active: boolean;
  interval: number;
  rssFeeds: string[];
  keywords: string[];
  prompt: string;
  createdAt: string;
};

export type N8nWorkflow = {
  id: string | number;
  name: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  tags?: Array<{ id?: string; name?: string }>;
  [key: string]: unknown;
};

export type N8nExecution = {
  id: string | number;
  workflowId?: string | number;
  status?: 'success' | 'error' | 'running' | string;
  mode?: string;
  startedAt?: string;
  stoppedAt?: string;
  finished?: boolean;
  data?: unknown;
  payload?: unknown;
  [key: string]: unknown;
};
