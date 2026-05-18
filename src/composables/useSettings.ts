import { ref, watch } from 'vue';

const SETTINGS_KEY = 'novel-workshop-settings';

export interface AppSettings {
  fontSize: number;
  displayScale: number;
}

const defaults: AppSettings = {
  fontSize: 16,
  displayScale: 1,
};

const DISPLAY_SCALE_MIN = 0.75;
const DISPLAY_SCALE_MAX = 1.5;
const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 24;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalize(input: Partial<AppSettings>): AppSettings {
  const nextFontSize = Number.isFinite(input.fontSize)
    ? clamp(Number(input.fontSize), FONT_SIZE_MIN, FONT_SIZE_MAX)
    : defaults.fontSize;
  const nextScale = Number.isFinite(input.displayScale)
    ? clamp(Number(input.displayScale), DISPLAY_SCALE_MIN, DISPLAY_SCALE_MAX)
    : defaults.displayScale;
  return {
    fontSize: nextFontSize,
    displayScale: Number(nextScale.toFixed(2)),
  };
}

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return normalize({ ...defaults, ...JSON.parse(raw) });
  } catch { /* ignore */ }
  return { ...defaults };
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

  return {
    settings,
    resetFontSize,
    resetDisplayScale,
    clearAllCache,
    clearNovelData,
    clearDrafts,
    clearBackups,
    getCacheStats,
    formatSize,
  };
}
