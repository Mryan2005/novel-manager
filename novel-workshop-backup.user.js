// ==UserScript==
// @name         小说工坊 - WebDAV HTTP 透明代理
// @namespace    https://novel-manager.mryan2005.top
// @version      2.2
// @description  透明拦截 Setting 页面的 WebDAV 请求，通过 GM_xmlhttpRequest 绕过 HTTPS 混合内容限制。无 UI，安装即用。
// @author       Novel Workshop
// @match        https://novel-manager.mryan2005.top/*
// @match        https://novelmanager.mryan2005.top/*
// @match        http://localhost:5000/*
// @match        http://127.0.0.1:5000/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      *
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  var win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  if (win.location.protocol !== 'https:') return;

  var originalFetch = win.fetch;

  function gmFetch(method, url, headers, data) {
    return new Promise(function (resolve, reject) {
      GM_xmlhttpRequest({
        method: method,
        url: url,
        headers: headers || {},
        data: data || undefined,
        timeout: 120000,
        onload: function (r) {
          resolve({
            ok: r.status >= 200 && r.status < 300,
            status: r.status,
            statusText: r.statusText || '',
            _body: r.responseText,
            json: function () { return Promise.resolve(JSON.parse(this._body)); },
            text: function () { return Promise.resolve(this._body); },
            blob: function () { return Promise.resolve(new Blob([this._body])); },
          });
        },
        onerror: function () { reject(new Error('请求失败')); },
        ontimeout: function () { reject(new Error('请求超时')); },
      });
    });
  }

  win.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));
    var method = (init && init.method) || 'GET';

    // Only intercept HTTP requests (HTTPS works fine natively)
    if (!/^http:\/\//i.test(url)) return originalFetch(input, init);

    // Intercept: all PUT / DELETE, and GET to .json files
    var isWebDAV = method === 'PUT' || method === 'DELETE' || (method === 'GET' && url.indexOf('.json') !== -1);
    if (!isWebDAV) return originalFetch(input, init);

    console.log('[小说工坊] GM_xmlhttpRequest →', method, url);

    var headers = {};
    if (init && init.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach(function (v, k) { headers[k] = v; });
      } else if (Array.isArray(init.headers)) {
        for (var i = 0; i < init.headers.length; i++) headers[init.headers[i][0]] = init.headers[i][1];
      } else {
        var keys = Object.keys(init.headers);
        for (var j = 0; j < keys.length; j++) headers[keys[j]] = init.headers[keys[j]];
      }
    }

    return gmFetch(method, url, headers, init && init.body);
  };

  console.log('[小说工坊] WebDAV HTTP 透明代理已激活。');
})();
