import { ref, computed, watch } from 'vue';

const SETTINGS_KEY = 'novel-workshop-settings';

export type AIProvider = 'openai' | 'openai-like' | 'gemini';

export interface AIConfig {
  id: string;
  name: string;
  provider: AIProvider;
  apiUrl: string;
  token: string;
  model: string;
  systemPrompt: string;
  tools: string;
  enableJsonMode: boolean;
  thinkingLevel: string;
  temperature: number;
}

export interface AppSettings {
  fontSize: number;
  displayScale: number;
  aiConfigs: AIConfig[];
  aiActiveConfigId: string;
}

const VALID_PROVIDERS: AIProvider[] = ['openai', 'openai-like', 'gemini'];

let configIdCounter = 0;
function makeConfigId(): string {
  configIdCounter++;
  return `aic_${Date.now()}_${configIdCounter}`;
}

function createDefaultConfig(name?: string): AIConfig {
  return {
    id: makeConfigId(),
    name: name || '默认配置',
    provider: 'openai',
    apiUrl: '',
    token: '',
    model: '',
    systemPrompt: '',
    tools: '',
    enableJsonMode: false,
    thinkingLevel: '',
    temperature: 0.7,
  };
}

const defaults: AppSettings = {
  fontSize: 16,
  displayScale: 1,
  aiConfigs: [],
  aiActiveConfigId: '',
};

const DISPLAY_SCALE_MIN = 0.75;
const DISPLAY_SCALE_MAX = 1.5;
const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 24;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeProvider(value: unknown): AIProvider {
  return typeof value === 'string' && VALID_PROVIDERS.includes(value as AIProvider) ? value as AIProvider : 'openai';
}

function normalizeConfig(config: Partial<AIConfig> & { id?: string }): AIConfig {
  return {
    id: typeof config.id === 'string' && config.id ? config.id : makeConfigId(),
    name: typeof config.name === 'string' && config.name ? config.name : '未命名',
    provider: normalizeProvider(config.provider),
    apiUrl: typeof config.apiUrl === 'string' ? config.apiUrl : '',
    token: typeof config.token === 'string' ? config.token : '',
    model: typeof config.model === 'string' ? config.model : '',
    systemPrompt: typeof config.systemPrompt === 'string' ? config.systemPrompt : '',
    tools: typeof config.tools === 'string' ? config.tools : '',
    enableJsonMode: typeof config.enableJsonMode === 'boolean' ? config.enableJsonMode : false,
    thinkingLevel: typeof config.thinkingLevel === 'string' ? config.thinkingLevel : '',
    temperature: Number.isFinite(config.temperature) ? clamp(Number(config.temperature), 0, 2) : 0.7,
  };
}

function normalize(input: Partial<AppSettings>): AppSettings {
  const nextFontSize = Number.isFinite(input.fontSize)
    ? clamp(Number(input.fontSize), FONT_SIZE_MIN, FONT_SIZE_MAX)
    : defaults.fontSize;
  const nextScale = Number.isFinite(input.displayScale)
    ? clamp(Number(input.displayScale), DISPLAY_SCALE_MIN, DISPLAY_SCALE_MAX)
    : defaults.displayScale;
  const configs = Array.isArray(input.aiConfigs)
    ? input.aiConfigs.map(normalizeConfig)
    : [];
  let activeId = typeof input.aiActiveConfigId === 'string' ? input.aiActiveConfigId : '';
  if (configs.length > 0 && !configs.find(c => c.id === activeId)) {
    activeId = configs[0]!.id;
  }
  return {
    fontSize: nextFontSize,
    displayScale: Number(nextScale.toFixed(2)),
    aiConfigs: configs,
    aiActiveConfigId: activeId,
  };
}

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate old single-config format
      if (!parsed.aiConfigs && typeof parsed.aiProvider === 'string') {
        const migrated = createDefaultConfig();
        migrated.provider = normalizeProvider(parsed.aiProvider);
        migrated.apiUrl = typeof parsed.aiApiUrl === 'string' ? parsed.aiApiUrl : '';
        migrated.token = typeof parsed.aiToken === 'string' ? parsed.aiToken : '';
        migrated.model = typeof parsed.aiModel === 'string' ? parsed.aiModel : '';
        migrated.systemPrompt = typeof parsed.aiSystemPrompt === 'string' ? parsed.aiSystemPrompt : '';
        migrated.tools = typeof parsed.aiTools === 'string' ? parsed.aiTools : '';
        parsed.aiConfigs = [migrated];
        parsed.aiActiveConfigId = migrated.id;
      }
      return normalize({ ...defaults, ...parsed });
    }
  } catch { /* ignore */ }
  const initial = createDefaultConfig();
  return { ...defaults, aiConfigs: [initial], aiActiveConfigId: initial.id };
}

function save(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function apply(settings: AppSettings) {
  const normalized = normalize(settings);
  document.documentElement.style.fontSize = normalized.fontSize + 'px';
  document.documentElement.style.setProperty('--display-scale', normalized.displayScale.toString());
}

const settings = ref<AppSettings>(load());

apply(settings.value);

watch(settings, (v) => {
  const normalized = normalize(v);
  save(normalized);
  apply(normalized);
}, { deep: true });

export function useSettings() {
  const activeAIConfig = computed(() =>
    settings.value.aiConfigs.find(c => c.id === settings.value.aiActiveConfigId) ?? null
  );

  function addAIConfig() {
    const cfg = createDefaultConfig(`配置 ${settings.value.aiConfigs.length + 1}`);
    settings.value.aiConfigs.push(cfg);
    if (!settings.value.aiActiveConfigId) {
      settings.value.aiActiveConfigId = cfg.id;
    }
    return cfg;
  }

  function removeAIConfig(id: string) {
    const idx = settings.value.aiConfigs.findIndex(c => c.id === id);
    if (idx === -1) return;
    if (settings.value.aiConfigs.length <= 1) return; // keep at least one
    settings.value.aiConfigs.splice(idx, 1);
    if (settings.value.aiActiveConfigId === id) {
      settings.value.aiActiveConfigId = settings.value.aiConfigs[0]?.id ?? '';
    }
  }

  function setActiveAIConfig(id: string) {
    if (settings.value.aiConfigs.find(c => c.id === id)) {
      settings.value.aiActiveConfigId = id;
    }
  }

  function resetFontSize() {
    settings.value.fontSize = defaults.fontSize;
  }

  function resetDisplayScale() {
    settings.value.displayScale = defaults.displayScale;
  }

  function clearAllCache() {
    const keysToKeep = [SETTINGS_KEY];
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !keysToKeep.includes(key)) keys.push(key);
    }
    keys.forEach(k => localStorage.removeItem(k));
    window.location.reload();
  }

  function clearNovelData() {
    localStorage.removeItem('novel-workshop-data');
    localStorage.removeItem('novel-workshop-timestamp');
    window.location.reload();
  }

  function clearDrafts() {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('novel-draft-')) keys.push(key);
    }
    keys.forEach(k => localStorage.removeItem(k));
  }

  function clearBackups() {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('novel-backup-')) keys.push(key);
    }
    keys.forEach(k => localStorage.removeItem(k));
  }

  function getCacheStats() {
    let novelData = 0;
    let drafts = 0;
    let backups = 0;
    let other = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const val = localStorage.getItem(key) || '';
      const size = new Blob([val]).size;
      if (key === 'novel-workshop-data' || key === 'novel-workshop-timestamp') {
        novelData += size;
      } else if (key.startsWith('novel-draft-')) {
        drafts += size;
      } else if (key.startsWith('novel-backup-')) {
        backups += size;
      } else if (key !== SETTINGS_KEY) {
        other += size;
      }
    }

    return { novelData, drafts, backups, other };
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    return (bytes / 1024).toFixed(1) + ' KB';
  }

  function importSettings(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    try {
      const normalized = normalize(data as Partial<AppSettings>);
      settings.value = normalized;
      return true;
    } catch {
      return false;
    }
  }

  return {
    settings,
    activeAIConfig,
    addAIConfig,
    removeAIConfig,
    setActiveAIConfig,
    resetFontSize,
    resetDisplayScale,
    clearAllCache,
    clearNovelData,
    clearDrafts,
    clearBackups,
    getCacheStats,
    formatSize,
    importSettings,
  };
}
