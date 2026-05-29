import { ref } from 'vue';

export interface WebDAVConfig {
  url: string;
  username: string;
  password: string;
}

const KEYS = [
  'novel-workshop-data',
  'novel-workshop-settings',
  'novel-workshop-worldsim-sessions',
  'novel-workshop-worldsim-memories',
  'novel-workshop-ai-chats',
] as const;

function authHeaders(config: WebDAVConfig): Record<string, string> {
  const headers: Record<string, string> = {};
  if (config.username || config.password) {
    headers['Authorization'] = 'Basic ' + btoa(`${config.username}:${config.password}`);
  }
  return headers;
}

function buildUrl(base: string, key: string): string {
  const clean = base.replace(/\/+$/, '');
  return `${clean}/${key}.json`;
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
    }, 4000);
  }

  /** Upload all localStorage keys to WebDAV as JSON files */
  async function uploadAll(config: WebDAVConfig): Promise<boolean> {
    if (!config.url) {
      setStatus('请先配置 WebDAV 地址', 'error');
      return false;
    }

    uploading.value = true;
    try {
      for (const key of KEYS) {
        const raw = localStorage.getItem(key);
        const data = raw ? raw : '{}';
        const url = buildUrl(config.url, key);

        const res = await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders(config),
          },
          body: data,
        });

        if (!res.ok) {
          setStatus(`上传 ${key} 失败: ${res.status} ${res.statusText}`, 'error');
          return false;
        }
      }
      setStatus(`成功上传 ${KEYS.length} 个文件到 WebDAV`, 'success');
      return true;
    } catch (e) {
      setStatus(`上传失败: ${e instanceof Error ? e.message : String(e)}`, 'error');
      return false;
    } finally {
      uploading.value = false;
    }
  }

  /** Download all data from WebDAV and write to localStorage */
  async function downloadAll(config: WebDAVConfig): Promise<boolean> {
    if (!config.url) {
      setStatus('请先配置 WebDAV 地址', 'error');
      return false;
    }

    downloading.value = true;
    try {
      for (const key of KEYS) {
        const url = buildUrl(config.url, key);

        const res = await fetch(url, {
          method: 'GET',
          headers: authHeaders(config),
        });

        if (!res.ok) {
          if (res.status === 404) continue; // skip missing files
          setStatus(`下载 ${key} 失败: ${res.status} ${res.statusText}`, 'error');
          return false;
        }

        const text = await res.text();
        // Validate JSON before writing
        try { JSON.parse(text); } catch {
          setStatus(`${key}.json 内容不是有效的 JSON`, 'error');
          return false;
        }
        localStorage.setItem(key, text);
      }
      setStatus('成功从 WebDAV 下载并恢复所有数据，请刷新页面', 'success');
      return true;
    } catch (e) {
      setStatus(`下载失败: ${e instanceof Error ? e.message : String(e)}`, 'error');
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
