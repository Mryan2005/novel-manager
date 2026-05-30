import { ref } from 'vue';
import { useNovelManager, type NovelMeta } from './useNovelManager';

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

      async function putWithRetry(url: string, data: string) {
        let r = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeaders(config) },
          body: data,
        });
        if (r.status === 409) {
          await fetch(url, { method: 'DELETE', headers: authHeaders(config) }).catch(function () {});
          r = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeaders(config) },
            body: data,
          });
        }
        return r;
      }

      // Upload novel list
      let res = await putWithRetry(buildUrl(config.url, 'novel-list.json'), JSON.stringify(novels.value));
      if (!res.ok) {
        setStatus(`上传 novel-list.json 失败: ${res.status}`, 'error');
        return false;
      }

      // Upload settings
      const settingsRaw = localStorage.getItem('novel-workshop-settings');
      res = await putWithRetry(buildUrl(config.url, 'novel-workshop-settings.json'), settingsRaw || '{}');
      if (!res.ok) {
        setStatus(`上传 settings 失败: ${res.status}`, 'error');
        return false;
      }

      // Upload each novel's data
      for (const novel of novels.value) {
        for (const baseKey of NOVEL_KEYS) {
          const scopedKey = `${baseKey}-${novel.id}`;
          const raw = localStorage.getItem(scopedKey);
          const data = raw || '{}';
          const fileName = `novel-${novel.id}-${baseKey}.json`;
          const url = buildUrl(config.url, fileName);

          res = await putWithRetry(url, data);
          if (!res.ok) {
            setStatus(`上传 ${novel.title}/${baseKey}.json 失败: ${res.status}`, 'error');
            return false;
          }
        }
      }

      setStatus(`成功备份 ${novels.value.length} 部小说到 WebDAV`, 'success');
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
        const text = await res.text();
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
        const text = await res.text();
        try { JSON.parse(text); } catch {
          setStatus('settings.json 格式无效', 'error');
          return false;
        }
        localStorage.setItem('novel-workshop-settings', text);
      }

      // Download each novel's data
      let restored = 0;
      for (const novel of novels) {
        for (const baseKey of NOVEL_KEYS) {
          const fileName = `novel-${novel.id}-${baseKey}.json`;
          const url = buildUrl(config.url, fileName);
          res = await fetch(url, { headers: authHeaders(config) });

          if (!res.ok) {
            if (res.status === 404) continue;
            setStatus(`下载 ${fileName} 失败: ${res.status}`, 'error');
            return false;
          }

          const text = await res.text();
          try { JSON.parse(text); } catch {
            setStatus(`${fileName} 格式无效`, 'error');
            return false;
          }
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
