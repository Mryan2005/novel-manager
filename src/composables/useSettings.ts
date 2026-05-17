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

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...defaults };
}

function save(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function apply(settings: AppSettings) {
  document.documentElement.style.fontSize = settings.fontSize + 'px';
  document.documentElement.style.setProperty('--display-scale', settings.displayScale.toString());
}

const settings = ref<AppSettings>(load());

apply(settings.value);

watch(settings, (v) => {
  save(v);
  apply(v);
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
