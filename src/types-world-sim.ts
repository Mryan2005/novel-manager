// ---- Memory Cards ----
export type MemoryCardType = 'user_profile' | 'conversation_memory' | 'world_setting' | 'plot_point';

export const MEMORY_CARD_TYPE_LABELS: Record<MemoryCardType, string> = {
  user_profile: '用户画像',
  conversation_memory: '对话记忆',
  world_setting: '世界设定',
  plot_point: '剧情节点',
};

export const MEMORY_CARD_TYPE_ORDER: MemoryCardType[] = [
  'user_profile',
  'conversation_memory',
  'world_setting',
  'plot_point',
];

export interface MemoryCard {
  id: string;
  type: MemoryCardType;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

// ---- Tool Calls ----
export interface WSToolCall {
  id: string;
  name: string;
  args: Record<string, string>;
}

export interface WSToolResult {
  toolCallId: string;
  name: string;
  result: string;
}

// ---- Super Power Plan ----
export interface SuperPowerStep {
  stepNumber: number;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  toolName?: string;
  toolArgs?: Record<string, string>;
  toolResult?: string;
  outputContent?: string;
}

export interface SuperPowerPlan {
  id: string;
  goal: string;
  steps: SuperPowerStep[];
}

// ---- Messages ----
export interface WSMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string;
  toolCalls?: WSToolCall[];
  toolResults?: WSToolResult[];
  plan?: SuperPowerPlan;
  timestamp: number;
}

// ---- Mode ----
export type WSMode = 'normal' | 'super-power';
export type WSSubMode = 'chapter-gen' | 'guided-gen';

// ---- Sessions ----
export interface WorldSimSession {
  id: string;
  title: string;
  messages: WSMessage[];
  systemPrompt: string;
  mode: WSMode;
  subMode: WSSubMode;
  memoryIds: string[];
  createdAt: number;
  updatedAt: number;
}

// ---- Persistence shape ----
export interface WorldSimData {
  sessions: WorldSimSession[];
  activeSessionId: string | null;
}
