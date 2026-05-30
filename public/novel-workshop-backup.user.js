// ==UserScript==
// @name         小说工坊 - WebDAV 增强 (绕过 HTTPS 混合内容)
// @namespace    https://novel-manager.mryan2005.top
// @version      2.0
// @description  在 HTTPS 页面上透明拦截 WebDAV 请求，通过 GM_xmlhttpRequest 绕过混合内容限制，使 HTTP WebDAV 也能正常工作。
// @author       Novel Workshop
// @match        https://novel-manager.mryan2005.top/*
// @match        https://novelmanager.mryan2005.top/*
// @match        http://localhost:5000/*
// @match        http://127.0.0.1:5000/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      *
// ==/UserScript==

(function () {
  'use strict';

  const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  // Only activate on HTTPS pages (HTTP pages don't have the mixed content problem)
  if (win.location.protocol !== 'https:') {
    console.log('[小说工坊] HTTP 页面无需油猴脚本，WebDAV 可直接使用。');
    return;
  }

  const originalFetch = win.fetch;

  /**
   * Intercept fetch() calls to WebDAV URLs.
   *
   * When the page is HTTPS and the request target is HTTP, the browser
   * blocks it as mixed content. We intercept those calls and route them
   * through GM_xmlhttpRequest which bypasses this restriction.
   *
   * We detect WebDAV requests by checking the request body contains
   * JSON file paths (novel-workshop-*.json). Regular API calls to AI
   * providers are NOT intercepted.
   */
  async function patchedFetch(input, init) {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);

    // Only intercept HTTP requests (HTTPS requests work fine)
    if (!url.startsWith('http://')) {
      return originalFetch(input, init);
    }

    // Intercept all HTTP PUT requests (WebDAV upload) and HTTP GET to .json files (WebDAV download).
    // The app's AI API calls all go to HTTPS endpoints, so intercepting all HTTP .json
    // requests is safe and covers all WebDAV backup files.
    const method = (init?.method || 'GET').toUpperCase();
    const body = init?.body;
    const isWebDAV = method === 'PUT' || method === 'DELETE' ||
      (method === 'GET' && url.includes('.json'));

    if (!isWebDAV) {
      return originalFetch(input, init);
    }

    console.log('[小说工坊] 拦截 WebDAV', method, '请求 → 通过 GM_xmlhttpRequest 发送:', url);

    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method,
        url,
        headers: init?.headers ? Object.fromEntries(
          init.headers instanceof Headers
            ? [...init.headers.entries()]
            : Array.isArray(init.headers) ? init.headers : Object.entries(init.headers)
        ) : {},
        data: body || undefined,
        timeout: 120000,
        onload: (resp) => {
          console.log('[小说工坊] WebDAV 响应:', resp.status);
          resolve({
            ok: resp.status >= 200 && resp.status < 300,
            status: resp.status,
            statusText: resp.statusText || '',
            headers: new Headers(resp.responseHeaders || {}),
            json: () => Promise.resolve(JSON.parse(resp.responseText)),
            text: () => Promise.resolve(resp.responseText),
            blob: () => Promise.resolve(new Blob([resp.responseText])),
            arrayBuffer: () => Promise.resolve(new TextEncoder().encode(resp.responseText).buffer),
            clone: function () { return Promise.resolve(this); },
          });
        },
        onerror: (e) => {
          console.error('[小说工坊] WebDAV 请求失败:', e);
          reject(new Error('WebDAV 请求失败: ' + (e || 'unknown')));
        },
        ontimeout: () => {
          reject(new Error('WebDAV 请求超时'));
        },
      });
    });
  }

  // Replace window.fetch with our patched version
  win.fetch = patchedFetch;

  console.log('[小说工坊] WebDAV 增强已激活。HTTP WebDAV 请求将通过 GM_xmlhttpRequest 转发。');
})();
