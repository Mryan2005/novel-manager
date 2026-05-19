import { ref, computed, watch } from 'vue';

const CHATS_KEY = 'novel-workshop-ai-chats';
const ACTIVE_SESSION_KEY = 'novel-workshop-ai-active-session';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(CHATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

function saveSessions(sessions: ChatSession[]) {
  localStorage.setItem(CHATS_KEY, JSON.stringify(sessions));
}

function loadActiveSessionId(): string | null {
  return localStorage.getItem(ACTIVE_SESSION_KEY);
}

function saveActiveSessionId(id: string | null) {
  if (id) {
    localStorage.setItem(ACTIVE_SESSION_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  }
}

const sessions = ref<ChatSession[]>(loadSessions());
const activeSessionId = ref<string | null>(loadActiveSessionId());

const activeSession = computed(() =>
  activeSessionId.value ? sessions.value.find(s => s.id === activeSessionId.value) ?? null : null
);

const sortedSessions = computed(() =>
  [...sessions.value].sort((a, b) => b.updatedAt - a.updatedAt)
);

watch(sessions, (v) => {
  saveSessions(v);
}, { deep: true });

watch(activeSessionId, (id) => {
  saveActiveSessionId(id);
});

export function useAIChat() {
  function createSession(title?: string): ChatSession {
    const session: ChatSession = {
      id: generateId(),
      title: title || `对话 ${sessions.value.length + 1}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    sessions.value.push(session);
    activeSessionId.value = session.id;
    return session;
  }

  function ensureSession(): ChatSession {
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

  function addMessage(sessionId: string, role: ChatMessage['role'], content: string, thinking?: string) {
    const session = sessions.value.find(s => s.id === sessionId);
    if (!session) return;
    const msg: ChatMessage = {
      id: generateId(),
      role,
      content,
      thinking,
      timestamp: Date.now(),
    };
    session.messages.push(msg);
    session.updatedAt = Date.now();
    if (session.messages.length === 1 && role === 'user') {
      session.title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
    }
  }

  function clearCurrentMessages() {
    if (!activeSession.value) return;
    activeSession.value.messages = [];
    activeSession.value.updatedAt = Date.now();
  }

  function importSessions(data: unknown[]): boolean {
    if (!Array.isArray(data)) return false;
    const valid: ChatSession[] = [];
    for (const item of data) {
      if (!item || typeof item !== 'object') continue;
      const s = item as Record<string, unknown>;
      if (typeof s.id !== 'string' || !Array.isArray(s.messages)) continue;
      valid.push({
        id: s.id,
        title: typeof s.title === 'string' ? s.title : '',
        messages: (s.messages as unknown[]).filter((m: unknown) => {
          if (!m || typeof m !== 'object') return false;
          const msg = m as Record<string, unknown>;
          return typeof msg.id === 'string' && typeof msg.content === 'string';
        }) as ChatMessage[],
        createdAt: typeof s.createdAt === 'number' ? s.createdAt : Date.now(),
        updatedAt: typeof s.updatedAt === 'number' ? s.updatedAt : Date.now(),
      });
    }
    sessions.value = valid;
    if (valid.length === 0 || !valid.find(s => s.id === activeSessionId.value)) {
      activeSessionId.value = valid.length > 0 ? valid[0]!.id : null;
    }
    return true;
  }

  function getContextForRoute(routePath: string): string {
    try {
      const raw = localStorage.getItem('novel-workshop-data');
      if (!raw) return '';
      const data = JSON.parse(raw);

      if (routePath.startsWith('/editor')) {
        const chapterId = routePath.split('/').pop();
        if (chapterId && data.chapters) {
          const chapter = data.chapters.find((c: any) => c.id === chapterId);
          if (chapter) {
            const volume = data.volumes?.find((v: any) => v.id === chapter.volumeId);
            return `当前编辑章节：\n卷：${volume?.title || '未知'}\n章节：${chapter.title}\n内容：\n${chapter.content || '(空)'}`;
          }
        }
        return '当前在编辑器页面。';
      }
      if (routePath === '/chapters') {
        const chapters = data.chapters || [];
        const volumes = data.volumes || [];
        const lines = volumes.map((v: any) => {
          const vChapters = chapters.filter((c: any) => c.volumeId === v.id);
          return `卷：${v.title}\n` + vChapters.map((c: any, i: number) => `  ${i + 1}. ${c.title} (${c.wordCount || 0}字)`).join('\n');
        });
        return lines.length > 0 ? `小说章节结构：\n${lines.join('\n')}` : '暂无章节数据。';
      }
      if (routePath === '/characters') {
        const characters = data.characters || [];
        return characters.length > 0
          ? `角色列表：\n${characters.map((c: any) => `- ${c.name}${c.role ? ` (${c.role})` : ''}${c.description ? `: ${c.description}` : ''}`).join('\n')}`
          : '暂无角色数据。';
      }
      if (routePath === '/scenes') {
        const scenes = data.scenes || [];
        return scenes.length > 0
          ? `场景列表：\n${scenes.map((s: any) => `- ${s.name}${s.description ? `: ${s.description}` : ''}`).join('\n')}`
          : '暂无场景数据。';
      }
      if (routePath === '/items') {
        const items = data.items || [];
        return items.length > 0
          ? `物品列表：\n${items.map((i: any) => `- ${i.name}${i.description ? `: ${i.description}` : ''}`).join('\n')}`
          : '暂无物品数据。';
      }
      if (routePath === '/home') {
        const chapters = data.chapters || [];
        const volumes = data.volumes || [];
        const characters = data.characters || [];
        return `小说概览：${volumes.length}卷, ${chapters.length}章, ${characters.length}个角色`;
      }
      return '';
    } catch {
      return '';
    }
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
    clearCurrentMessages,
    getContextForRoute,
    importSessions,
  };
}
