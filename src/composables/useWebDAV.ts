import { ref } from 'vue';
import { useNovelManager, type NovelMeta } from './useNovelManager';
import { useSettings } from './useSettings';
import { encrypt, decrypt, looksEncrypted } from './useCrypto';

export interface WebDAVConfig {
  url: string;
  username: string;
  password: string;
}

const NOVEL_KEYS = [
  'novel-workshop-data',
  'novel-workshop-ai-chats',
  'novel-workshop-ai-active-session',
  'novel-workshop-worldsim-sessions',
  'novel-workshop-worldsim-active',
  'novel-workshop-worldsim-memories',
];

function authHeaders(config: WebDAVConfig): Record<string, string> {
  const headers: Record<string, string> = {};
  if (config.username || config.password) {
    headers['Authorization'] = 'Basic ' + btoa(`${config.username}:${config.password}`);
  }
  return headers;
}

function buildUrl(base: string, ...parts: string[]): string {
  const clean = base.replace(/\/+$/, '');
  return [clean, ...parts].join('/');
}

export function useWebDAV() {
  const uploading = ref(false);
  const downloading = ref(false);
  const statusMessage = ref('');
  const statusType = ref<'success' | 'error' | ''>('');

  function setStatus(msg: string, type: 'success' | 'error') {
    statusMessage.value = msg;
    statusType.value = type;
    setTimeout(() => {
      statusMessage.value = '';
      statusType.value = '';
    }, 6000);
  }

  /** Upload all novels + settings to WebDAV */
  async function uploadAll(config: WebDAVConfig): Promise<boolean> {
    if (!config.url) {
      setStatus('请先配置 WebDAV 地址', 'error');
      return false;
    }

    uploading.value = true;
    try {
      const { novels } = useNovelManager();
      const { settings } = useSettings();
      const passkey = settings.value.encryptionPasskey;

      // Build list of all files to sync
      const filesToSync: { name: string; data: string }[] = [];
      filesToSync.push({ name: 'novel-list.json', data: JSON.stringify(novels.value) });

      // Strip encryptionPasskey from settings before upload — it should never leave the device
      let settingsRaw = localStorage.getItem('novel-workshop-settings');
      if (settingsRaw) {
        try {
          const parsed = JSON.parse(settingsRaw);
          delete (parsed as Record<string, unknown>).encryptionPasskey;
          settingsRaw = JSON.stringify(parsed);
        } catch { /* keep as-is */ }
      }
      filesToSync.push({ name: 'novel-workshop-settings.json', data: settingsRaw || '{}' });

      for (const novel of novels.value) {
        for (const baseKey of NOVEL_KEYS) {
          const scopedKey = `${baseKey}-${novel.id}`;
          let raw = localStorage.getItem(scopedKey);
          // Fallback: if scoped key is empty, check legacy unscoped key
          if (!raw) {
            raw = localStorage.getItem(baseKey);
          }
          filesToSync.push({ name: `${novel.id}-${baseKey}.json`, data: raw || '{}' });
        }
      }

      // Encrypt all file data if passkey is set
      if (passkey) {
        for (const file of filesToSync) {
          file.data = await encrypt(file.data, passkey);
        }
      }

      // Phase 1: Delete all existing files (ignore errors — files may not exist)
      const headers = authHeaders(config);
      for (const file of filesToSync) {
        await fetch(buildUrl(config.url, file.name), { method: 'DELETE', headers }).catch(function () {});
      }

      // Phase 2: Upload all files fresh
      for (const file of filesToSync) {
        const res = await fetch(buildUrl(config.url, file.name), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: file.data,
        });
        if (!res.ok) {
          setStatus(`上传 ${file.name} 失败: ${res.status}`, 'error');
          return false;
        }
      }

      setStatus(`成功备份 ${filesToSync.length} 个文件`, 'success');
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setStatus('连接失败：请检查 WebDAV 地址是否可访问。如果页面使用 HTTPS，WebDAV 也必须使用 HTTPS。', 'error');
      } else {
        setStatus(`上传失败: ${msg}`, 'error');
      }
      return false;
    } finally {
      uploading.value = false;
    }
  }

  /** Download all novels + settings from WebDAV and restore to localStorage */
  async function downloadAll(config: WebDAVConfig): Promise<boolean> {
    if (!config.url) {
      setStatus('请先配置 WebDAV 地址', 'error');
      return false;
    }

    downloading.value = true;
    try {
      const { settings } = useSettings();
      const passkey = settings.value.encryptionPasskey;

      // Helper to decrypt downloaded data if needed
      const tryDecrypt = async (raw: string): Promise<string> => {
        if (!passkey || !looksEncrypted(raw)) return raw;
        try {
          return await decrypt(raw, passkey);
        } catch {
          // If decryption fails (wrong passkey or not encrypted),
          // return raw — the caller will try to parse as JSON
          return raw;
        }
      };

      // Download novel list
      let res = await fetch(buildUrl(config.url, 'novel-list.json'), {
        headers: authHeaders(config),
      });
      if (!res.ok && res.status !== 404) {
        setStatus(`下载 novel-list.json 失败: ${res.status}`, 'error');
        return false;
      }

      let novels: NovelMeta[] = [];
      if (res.ok) {
        const raw = await res.text();
        const text = await tryDecrypt(raw);
        try { novels = JSON.parse(text); } catch {
          setStatus('novel-list.json 格式无效', 'error');
          return false;
        }
        localStorage.setItem('novel-workshop-novels', text);
      }

      // Download settings
      res = await fetch(buildUrl(config.url, 'novel-workshop-settings.json'), {
        headers: authHeaders(config),
      });
      if (res.ok) {
        const raw = await res.text();
        const text = await tryDecrypt(raw);
        try { JSON.parse(text); } catch {
          setStatus('settings.json 格式无效', 'error');
          return false;
        }
        // Preserve the local encryption passkey — never overwrite from remote
        let merged = text;
        if (passkey) {
          try {
            const remote = JSON.parse(text) as Record<string, unknown>;
            remote.encryptionPasskey = passkey;
            merged = JSON.stringify(remote);
          } catch { /* keep as-is */ }
        }
        localStorage.setItem('novel-workshop-settings', merged);
      }

      // Download each novel's data
      let restored = 0;
      for (const novel of novels) {
        for (const baseKey of NOVEL_KEYS) {
          const fileName = `${novel.id}-${baseKey}.json`;
          const url = buildUrl(config.url, fileName);
          res = await fetch(url, { headers: authHeaders(config) });

          if (!res.ok) {
            if (res.status === 404) continue;
            setStatus(`下载 ${fileName} 失败: ${res.status}`, 'error');
            return false;
          }

          const raw = await res.text();
          // Skip empty or whitespace-only files
          if (!raw || !raw.trim()) continue;
          const text = await tryDecrypt(raw);
          try { JSON.parse(text); } catch { continue; }
          const scopedKey = `${baseKey}-${novel.id}`;
          localStorage.setItem(scopedKey, text);
        }
        restored++;
      }

      // Set active novel to the first one if available
      if (novels.length > 0) {
        localStorage.setItem('novel-workshop-active-novel', novels[0]!.id);
      }

      setStatus(`成功恢复 ${restored} 部小说，请刷新页面`, 'success');
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setStatus('连接失败：请检查 WebDAV 地址是否可访问。如果页面使用 HTTPS，WebDAV 也必须使用 HTTPS。', 'error');
      } else {
        setStatus(`下载失败: ${msg}`, 'error');
      }
      return false;
    } finally {
      downloading.value = false;
    }
  }

  return {
    uploading,
    downloading,
    statusMessage,
    statusType,
    uploadAll,
    downloadAll,
  };
}
