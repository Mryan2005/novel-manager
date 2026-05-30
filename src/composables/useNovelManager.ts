import { ref, computed } from 'vue';

export interface NovelMeta {
  id: string;
  title: string;
  createdAt: number;
}

const NOVELS_KEY = 'novel-workshop-novels';
const ACTIVE_KEY = 'novel-workshop-active-novel';
const DEFAULT_ID = 'default';

// Keys that were previously global and need migration
const LEGACY_KEYS = [
  'novel-workshop-data',
  'novel-workshop-ai-chats',
  'novel-workshop-ai-active-session',
  'novel-workshop-worldsim-sessions',
  'novel-workshop-worldsim-active',
  'novel-workshop-worldsim-memories',
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function loadNovels(): NovelMeta[] {
  try {
    const raw = localStorage.getItem(NOVELS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

function saveNovels(novels: NovelMeta[]) {
  localStorage.setItem(NOVELS_KEY, JSON.stringify(novels));
}

function loadActiveId(): string {
  const id = localStorage.getItem(ACTIVE_KEY);
  return id || DEFAULT_ID;
}

function saveActiveId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id);
}

const novels = ref<NovelMeta[]>(loadNovels());
const activeNovelId = ref<string>(loadActiveId());

// Ensure at least one novel exists
if (novels.value.length === 0) {
  const defaultNovel: NovelMeta = {
    id: DEFAULT_ID,
    title: '我的小说',
    createdAt: Date.now(),
  };
  novels.value.push(defaultNovel);
  saveNovels(novels.value);
}

// Ensure activeId is valid
if (!novels.value.find(n => n.id === activeNovelId.value)) {
  activeNovelId.value = novels.value[0]!.id;
  saveActiveId(activeNovelId.value);
}

export function useNovelManager() {
  const activeNovel = computed(() =>
    novels.value.find(n => n.id === activeNovelId.value) ?? null
  );

  /** Generate a novel-scoped localStorage key */
  function getKey(baseKey: string): string {
    return `${baseKey}-${activeNovelId.value}`;
  }

  /** Migrate old global keys to the default novel */
  function migrateIfNeeded() {
    // Check if any legacy global key still has data
    const hasLegacy = LEGACY_KEYS.some(key => {
      const val = localStorage.getItem(key);
      return val && val !== '{}' && val !== '[]';
    });

    if (!hasLegacy) return;

    // Create default novel if not exists
    let defaultNovel = novels.value.find(n => n.id === DEFAULT_ID);
    if (!defaultNovel) {
      defaultNovel = { id: DEFAULT_ID, title: '我的小说', createdAt: Date.now() };
      novels.value.unshift(defaultNovel);
    }

    // Migrate each legacy key (overwrite scoped — legacy always takes priority)
    for (const legacyKey of LEGACY_KEYS) {
      const val = localStorage.getItem(legacyKey);
      if (val !== null && val !== '{}' && val !== '[]') {
        localStorage.setItem(`${legacyKey}-${DEFAULT_ID}`, val);
      }
      localStorage.removeItem(legacyKey);
    }

    // Migrate novel data timestamp
    const ts = localStorage.getItem('novel-workshop-timestamp');
    if (ts) {
      localStorage.setItem(`novel-workshop-timestamp-${DEFAULT_ID}`, ts);
      localStorage.removeItem('novel-workshop-timestamp');
    }

    saveNovels(novels.value);
    activeNovelId.value = DEFAULT_ID;
    saveActiveId(DEFAULT_ID);
  }

  function createNovel(title: string) {
    const novel: NovelMeta = {
      id: generateId(),
      title: title || `小说 ${novels.value.length + 1}`,
      createdAt: Date.now(),
    };
    novels.value.push(novel);
    saveNovels(novels.value);
    activeNovelId.value = novel.id;
    saveActiveId(novel.id);
    return novel;
  }

  function switchNovel(id: string) {
    if (novels.value.find(n => n.id === id)) {
      activeNovelId.value = id;
      saveActiveId(id);
    }
  }

  function deleteNovel(id: string) {
    if (novels.value.length <= 1) return;
    const idx = novels.value.findIndex(n => n.id === id);
    if (idx === -1) return;

    // Remove scoped localStorage keys
    const prefixes = [
      'novel-workshop-data',
      'novel-workshop-ai-chats',
      'novel-workshop-ai-active-session',
      'novel-workshop-worldsim-sessions',
      'novel-workshop-worldsim-active',
      'novel-workshop-worldsim-memories',
      'novel-workshop-timestamp',
    ];
    for (const prefix of prefixes) {
      localStorage.removeItem(`${prefix}-${id}`);
    }

    novels.value.splice(idx, 1);
    saveNovels(novels.value);

    if (activeNovelId.value === id) {
      activeNovelId.value = novels.value[0]!.id;
      saveActiveId(activeNovelId.value);
    }
  }

  function renameNovel(id: string, title: string) {
    const novel = novels.value.find(n => n.id === id);
    if (!novel) return;
    novel.title = title || '未命名';
    saveNovels(novels.value);
  }

  return {
    novels,
    activeNovelId,
    activeNovel,
    getKey,
    migrateIfNeeded,
    createNovel,
    switchNovel,
    deleteNovel,
    renameNovel,
  };
}
