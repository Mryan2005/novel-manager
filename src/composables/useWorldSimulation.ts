import { ref, computed, watch } from 'vue';
import type { WorldSimSession, WSMessage, WSMode, WSSubMode, SuperPowerPlan } from '../types-world-sim';
import type { MemoryCard } from '../types-world-sim';
import { useMemoryCards } from './useMemoryCards';
import { useNovelManager } from './useNovelManager';

let sessionsKey = 'novel-workshop-worldsim-sessions';
let activeKey = 'novel-workshop-worldsim-active';
let initialized = false;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadSessions(): WorldSimSession[] {
  try {
    const raw = localStorage.getItem(sessionsKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (s: unknown) => s && typeof s === 'object' && typeof (s as WorldSimSession).id === 'string'
        );
      }
    }
  } catch { /* ignore */ }
  return [];
}

function saveSessions(sessions: WorldSimSession[]) {
  localStorage.setItem(sessionsKey, JSON.stringify(sessions));
}

function loadActiveId(): string | null {
  return localStorage.getItem(activeKey);
}

function saveActiveId(id: string | null) {
  if (id) {
    localStorage.setItem(activeKey, id);
  } else {
    localStorage.removeItem(activeKey);
  }
}

const sessions = ref<WorldSimSession[]>(loadSessions());
const activeSessionId = ref<string | null>(loadActiveId());

const activeSession = computed(() =>
  activeSessionId.value
    ? sessions.value.find(s => s.id === activeSessionId.value) ?? null
    : null
);

const sortedSessions = computed(() =>
  [...sessions.value].sort((a, b) => b.updatedAt - a.updatedAt)
);

watch(sessions, (v) => saveSessions(v), { deep: true });
watch(activeSessionId, (id) => saveActiveId(id));

export function useWorldSimulation() {
  if (!initialized) {
    initialized = true;
    const { getKey, activeNovelId, migrateIfNeeded } = useNovelManager();
    migrateIfNeeded();

    sessionsKey = getKey('novel-workshop-worldsim-sessions');
    activeKey = getKey('novel-workshop-worldsim-active');

    sessions.value = loadSessions();
    activeSessionId.value = loadActiveId();

    watch(activeNovelId, () => {
      saveSessions(sessions.value);
      saveActiveId(activeSessionId.value);
      sessionsKey = getKey('novel-workshop-worldsim-sessions');
      activeKey = getKey('novel-workshop-worldsim-active');
      sessions.value = loadSessions();
      activeSessionId.value = loadActiveId();
    });
  }

  function createSession(title?: string, mode?: WSMode, subMode?: WSSubMode): WorldSimSession {
    const now = Date.now();
    const session: WorldSimSession = {
      id: generateId(),
      title: title || `世界模拟 ${sessions.value.length + 1}`,
      messages: [],
      systemPrompt: '',
      mode: mode || 'normal',
      subMode: subMode || 'chapter-gen',
      memoryIds: [],
      createdAt: now,
      updatedAt: now,
    };
    sessions.value.push(session);
    activeSessionId.value = session.id;
    return session;
  }

  function ensureSession(): WorldSimSession {
    if (activeSession.value) return activeSession.value;
    return createSession();
  }

  function selectSession(id: string) {
    const exists = sessions.value.find(s => s.id === id);
    if (exists) {
      activeSessionId.value = id;
    }
  }

  function deleteSession(id: string) {
    const idx = sessions.value.findIndex(s => s.id === id);
    if (idx === -1) return;
    sessions.value.splice(idx, 1);
    if (activeSessionId.value === id) {
      activeSessionId.value = sessions.value.length > 0 ? sessions.value[0]!.id : null;
    }
  }

  function addMessage(
    role: WSMessage['role'],
    content: string,
    extras?: {
      thinking?: string;
      toolCalls?: WSMessage['toolCalls'];
      toolResults?: WSMessage['toolResults'];
      plan?: SuperPowerPlan;
    }
  ): WSMessage {
    const session = activeSession.value;
    if (!session) throw new Error('No active session');

    const msg: WSMessage = {
      id: generateId(),
      role,
      content,
      thinking: extras?.thinking,
      toolCalls: extras?.toolCalls,
      toolResults: extras?.toolResults,
      plan: extras?.plan,
      timestamp: Date.now(),
    };
    session.messages.push(msg);
    session.updatedAt = Date.now();

    if (session.messages.filter(m => m.role === 'user').length === 1 && role === 'user') {
      session.title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
    }

    return msg;
  }

  function updateLastAssistantMessage(updates: Partial<WSMessage>) {
    const session = activeSession.value;
    if (!session) return;
    const lastMsg = [...session.messages].reverse().find(m => m.role === 'assistant');
    if (!lastMsg) return;
    if (updates.content !== undefined) lastMsg.content = updates.content;
    if (updates.thinking !== undefined) lastMsg.thinking = updates.thinking;
    if (updates.toolCalls !== undefined) lastMsg.toolCalls = updates.toolCalls;
    if (updates.toolResults !== undefined) lastMsg.toolResults = updates.toolResults;
    if (updates.plan !== undefined) lastMsg.plan = updates.plan;
    session.updatedAt = Date.now();
  }

  function clearMessages() {
    const session = activeSession.value;
    if (!session) return;
    session.messages = [];
    session.updatedAt = Date.now();
  }

  function updateSystemPrompt(prompt: string) {
    const session = activeSession.value;
    if (!session) return;
    session.systemPrompt = prompt;
    session.updatedAt = Date.now();
  }

  function setMode(mode: WSMode) {
    const session = activeSession.value;
    if (!session) return;
    session.mode = mode;
    session.updatedAt = Date.now();
  }

  function setSubMode(subMode: WSSubMode) {
    const session = activeSession.value;
    if (!session) return;
    session.subMode = subMode;
    session.updatedAt = Date.now();
  }

  function attachMemory(cardId: string) {
    const session = activeSession.value;
    if (!session) return;
    if (!session.memoryIds.includes(cardId)) {
      session.memoryIds.push(cardId);
      session.updatedAt = Date.now();
    }
  }

  function detachMemory(cardId: string) {
    const session = activeSession.value;
    if (!session) return;
    const idx = session.memoryIds.indexOf(cardId);
    if (idx !== -1) {
      session.memoryIds.splice(idx, 1);
      session.updatedAt = Date.now();
    }
  }

  function buildFullSystemPrompt(): string {
    const session = activeSession.value;
    if (!session) return '';

    const userPrompt = session.systemPrompt.trim();
    const memoryIds = session.memoryIds;

    const { getCardsByIds, formatMemoriesForPrompt } = useMemoryCards();
    const cards = memoryIds.length > 0 ? getCardsByIds(memoryIds) : [];
    const memoryBlock = formatMemoriesForPrompt(cards);

    const parts: string[] = [];
    if (userPrompt) parts.push(userPrompt);
    if (memoryBlock) parts.push(memoryBlock);
    return parts.join('\n\n');
  }

  return {
    sessions: sortedSessions,
    activeSession,
    activeSessionId,
    createSession,
    ensureSession,
    selectSession,
    deleteSession,
    addMessage,
    updateLastAssistantMessage,
    clearMessages,
    updateSystemPrompt,
    setMode,
    setSubMode,
    attachMemory,
    detachMemory,
    buildFullSystemPrompt,
  };
}
