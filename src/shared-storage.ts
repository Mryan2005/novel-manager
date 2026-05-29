let dataKey = 'novel-workshop-data';
let timestampKey = 'novel-workshop-timestamp';

export function setSharedStorageKeys(data: string, ts: string) {
  dataKey = data;
  timestampKey = ts;
}

const DOMAIN_PAIRS: Record<string, string> = {
  'novelmanager.mryan2005.top': 'https://novel-manager.mryan2005.top',
  'novel-manager.mryan2005.top': 'https://novelmanager.mryan2005.top',
};

function getOtherDomain(): string | null {
  const host = window.location.hostname;
  // Check exact match first
  if (DOMAIN_PAIRS[host]) return DOMAIN_PAIRS[host];
  // Check if host ends with any known domain (for port variations)
  for (const [key, value] of Object.entries(DOMAIN_PAIRS)) {
    if (host.endsWith(key)) return value;
  }
  return null;
}

function createBridge(domain: string): Promise<HTMLIFrameElement> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.src = domain + '/storage-bridge.html';
    iframe.style.display = 'none';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';

    const timeout = setTimeout(() => {
      reject(new Error('Bridge iframe load timeout'));
    }, 5000);

    iframe.onload = () => {
      clearTimeout(timeout);
      resolve(iframe);
    };

    iframe.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Bridge iframe load error'));
    };

    document.body.appendChild(iframe);
  });
}

function sendMessage(iframe: HTMLIFrameElement, message: Record<string, unknown>): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Bridge message timeout'));
    }, 3000);

    const handler = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      clearTimeout(timeout);
      window.removeEventListener('message', handler);
      resolve(event.data as Record<string, unknown>);
    };

    window.addEventListener('message', handler);
    iframe.contentWindow!.postMessage(message, '*');
  });
}

let bridgeIframe: HTMLIFrameElement | null = null;
let syncInProgress = false;

function getLocalTimestamp(): number {
  const ts = localStorage.getItem(timestampKey);
  return ts ? parseInt(ts, 10) : 0;
}

function setLocalTimestamp(ts: number) {
  localStorage.setItem(timestampKey, ts.toString());
}

export async function initCrossDomainSync(getData: () => string, setData: (json: string) => boolean): Promise<boolean> {
  if (syncInProgress) return false;
  syncInProgress = true;

  try {
    const otherDomain = getOtherDomain();
    if (!otherDomain) {
      console.log('[SharedStorage] No paired domain for', window.location.hostname);
      return false;
    }

    console.log('[SharedStorage] Connecting to', otherDomain);
    const iframe = await createBridge(otherDomain);
    bridgeIframe = iframe;

    // Get remote data
    const response = await sendMessage(iframe, { action: 'get' });
    const remoteData = response.data as string | null;
    const remoteTimestamp = response.timestamp ? parseInt(response.timestamp as string, 10) : 0;

    if (remoteData) {
      const localTimestamp = getLocalTimestamp();

      if (remoteTimestamp > localTimestamp) {
        // Remote is newer, use it
        console.log('[SharedStorage] Remote data is newer, syncing to local');
        if (setData(remoteData)) {
          setLocalTimestamp(remoteTimestamp);
        }
      } else if (localTimestamp > remoteTimestamp) {
        // Local is newer, push to remote
        console.log('[SharedStorage] Local data is newer, syncing to remote');
        const localData = getData();
        await sendMessage(iframe, {
          action: 'set',
          data: localData,
          timestamp: localTimestamp.toString()
        });
      }
      // If equal, no sync needed
    } else if (getLocalTimestamp() > 0) {
      // No remote data but we have local, push to remote
      console.log('[SharedStorage] No remote data, pushing local');
      const localData = getData();
      await sendMessage(iframe, {
        action: 'set',
        data: localData,
        timestamp: getLocalTimestamp().toString()
      });
    }
    return true;
  } catch (e) {
    console.warn('[SharedStorage] Sync failed:', e);
    return false;
  } finally {
    syncInProgress = false;
  }
}

export async function pushToRemote(data: string): Promise<boolean> {
  if (!bridgeIframe) return false;
  try {
    const timestamp = Date.now();
    setLocalTimestamp(timestamp);
    await sendMessage(bridgeIframe, {
      action: 'set',
      data,
      timestamp: timestamp.toString()
    });
    return true;
  } catch (e) {
    console.warn('[SharedStorage] Push to remote failed:', e);
    return false;
  }
}
