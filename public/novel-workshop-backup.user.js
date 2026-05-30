// ==UserScript==
// @name         小说工坊 - WebDAV HTTP 备份
// @namespace    https://novel-manager.mryan2005.top
// @version      2.1
// @description  在 HTTPS 页面上通过 GM_xmlhttpRequest 绕过混合内容限制，使 HTTP WebDAV 备份/恢复正常工作。
// @author       Novel Workshop
// @match        https://novel-manager.mryan2005.top/*
// @match        https://novelmanager.mryan2005.top/*
// @match        http://localhost:5000/*
// @match        http://127.0.0.1:5000/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      *
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  if (window.location.protocol !== 'https:') return;

  const NOVEL_KEYS = [
    'novel-workshop-data',
    'novel-workshop-ai-chats',
    'novel-workshop-ai-active-session',
    'novel-workshop-worldsim-sessions',
    'novel-workshop-worldsim-active',
    'novel-workshop-worldsim-memories',
  ];

  function getNovels() {
    try {
      const raw = localStorage.getItem('novel-workshop-novels');
      return raw ? JSON.parse(raw) : [{ id: 'default', title: '我的小说', createdAt: Date.now() }];
    } catch { return [{ id: 'default', title: '我的小说', createdAt: Date.now() }]; }
  }

  function collectFiles() {
    var files = [];
    var novels = getNovels();
    var s = localStorage.getItem('novel-workshop-settings');
    if (s) files.push({ name: 'novel-workshop-settings.json', content: s });
    files.push({ name: 'novel-list.json', content: JSON.stringify(novels) });
    for (var i = 0; i < novels.length; i++) {
      for (var j = 0; j < NOVEL_KEYS.length; j++) {
        var key = NOVEL_KEYS[j] + '-' + novels[i].id;
        var raw = localStorage.getItem(key);
        if (raw) files.push({ name: 'novels/' + novels[i].id + '/' + NOVEL_KEYS[j] + '.json', content: raw });
      }
    }
    return files;
  }

  function getFileNames() {
    var novels = getNovels();
    var names = ['novel-workshop-settings.json', 'novel-list.json'];
    for (var i = 0; i < novels.length; i++) {
      for (var j = 0; j < NOVEL_KEYS.length; j++) {
        names.push('novels/' + novels[i].id + '/' + NOVEL_KEYS[j] + '.json');
      }
    }
    return names;
  }

  function gmReq(method, url, data, headers) {
    return new Promise(function (resolve, reject) {
      GM_xmlhttpRequest({
        method: method,
        url: url,
        headers: headers || {},
        data: data || undefined,
        timeout: 120000,
        onload: function (r) { resolve({ ok: r.status >= 200 && r.status < 300, status: r.status, text: r.responseText }); },
        onerror: function (e) { reject(new Error('请求失败')); },
        ontimeout: function () { reject(new Error('请求超时')); },
      });
    });
  }

  function toast(msg, type) {
    var el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:500;'
      + (type === 'success' ? 'background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;' : 'background:#fef2f2;color:#dc2626;border:1px solid #fecaca;')
      + 'box-shadow:0 4px 12px rgba(0,0,0,0.1);';
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 4000);
  }

  function buildUrl(base) {
    var clean = base.replace(/\/+$/, '');
    for (var i = 1; i < arguments.length; i++) clean += '/' + arguments[i];
    return clean;
  }

  function injectPanel() {
    var savedUrl = GM_getValue('wdav_url', '');
    var savedUser = GM_getValue('wdav_user', '');
    var savedPass = GM_getValue('wdav_pass', '');

    var panel = document.createElement('div');
    panel.innerHTML =
      '<style>#nw-wdav-panel input:focus{outline:none;border-color:#6366f1!important}</style>' +
      '<div id="nw-wdav-panel" style="position:fixed;bottom:20px;right:20px;z-index:99997;background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.12);width:300px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:13px;">' +
        '<div style="padding:14px 16px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;">' +
          '<span style="font-weight:700;color:#1e293b;">WebDAV HTTP 备份</span>' +
          '<span style="font-size:11px;color:#94a3b8;">via GM_xmlhttpRequest</span>' +
        '</div>' +
        '<div style="padding:12px 16px;display:flex;flex-direction:column;gap:8px;">' +
          '<label style="font-size:12px;color:#64748b;">WebDAV 地址' +
            '<input id="nw-wdav-url" value="' + savedUrl + '" placeholder="http://nas:5005/backup" style="width:100%;margin-top:3px;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;">' +
          '</label>' +
          '<div style="display:flex;gap:8px;">' +
            '<label style="flex:1;font-size:12px;color:#64748b;">用户名' +
              '<input id="nw-wdav-user" value="' + savedUser + '" placeholder="用户名" style="width:100%;margin-top:3px;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;">' +
            '</label>' +
            '<label style="flex:1;font-size:12px;color:#64748b;">密码' +
              '<input id="nw-wdav-pass" type="password" value="' + savedPass + '" placeholder="密码" style="width:100%;margin-top:3px;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;">' +
            '</label>' +
          '</div>' +
          '<button id="nw-upload-btn" style="padding:10px;border:none;border-radius:8px;cursor:pointer;background:#6366f1;color:#fff;font-size:13px;font-weight:500;">备份到 WebDAV</button>' +
          '<button id="nw-download-btn" style="padding:10px;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer;background:#fff;color:#475569;font-size:13px;">从 WebDAV 恢复</button>' +
          '<button id="nw-export-btn" style="padding:8px;border:1px dashed #cbd5e1;border-radius:8px;cursor:pointer;background:#fff;color:#64748b;font-size:12px;">下载全部数据 (.json)</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(panel);

    function readCfg() {
      return {
        url: document.getElementById('nw-wdav-url').value.trim(),
        username: document.getElementById('nw-wdav-user').value.trim(),
        password: document.getElementById('nw-wdav-pass').value.trim(),
      };
    }

    function authHeader(cfg) {
      if (cfg.username || cfg.password) {
        return { 'Authorization': 'Basic ' + btoa(cfg.username + ':' + cfg.password) };
      }
      return {};
    }

    document.getElementById('nw-upload-btn').addEventListener('click', function () {
      var cfg = readCfg();
      if (!cfg.url) { toast('请填写 WebDAV 地址', 'error'); return; }
      GM_setValue('wdav_url', cfg.url);
      GM_setValue('wdav_user', cfg.username);
      GM_setValue('wdav_pass', cfg.password);

      var btn = document.getElementById('nw-upload-btn');
      btn.disabled = true; btn.textContent = '上传中...';

      var files = collectFiles();
      var auth = authHeader(cfg);
      var failed = false;

      function uploadNext(i) {
        if (i >= files.length || failed) {
          btn.disabled = false; btn.textContent = '备份到 WebDAV';
          if (!failed) toast('成功备份 ' + files.length + ' 个文件', 'success');
          return;
        }
        var url = buildUrl(cfg.url, files[i].name);
        gmReq('PUT', url, files[i].content, Object.assign({ 'Content-Type': 'application/json' }, auth)).then(function (r) {
          if (!r.ok) { toast('上传失败: ' + files[i].name + ' (' + r.status + ')', 'error'); failed = true; btn.disabled = false; btn.textContent = '备份到 WebDAV'; return; }
          uploadNext(i + 1);
        }).catch(function (e) {
          toast('上传失败: ' + e.message, 'error'); failed = true; btn.disabled = false; btn.textContent = '备份到 WebDAV';
        });
      }
      uploadNext(0);
    });

    document.getElementById('nw-download-btn').addEventListener('click', function () {
      var cfg = readCfg();
      if (!cfg.url) { toast('请填写 WebDAV 地址', 'error'); return; }
      GM_setValue('wdav_url', cfg.url);
      GM_setValue('wdav_user', cfg.username);
      GM_setValue('wdav_pass', cfg.password);

      var btn = document.getElementById('nw-download-btn');
      btn.disabled = true; btn.textContent = '下载中...';

      var names = getFileNames();
      var auth = authHeader(cfg);
      var restored = 0;

      function downloadNext(i) {
        if (i >= names.length) {
          if (restored > 0) { toast('成功恢复 ' + restored + ' 个文件，即将刷新...', 'success'); setTimeout(function () { location.reload(); }, 1500); }
          else { toast('未找到可恢复的文件', 'error'); }
          btn.disabled = false; btn.textContent = '从 WebDAV 恢复';
          return;
        }
        var url = buildUrl(cfg.url, names[i]);
        gmReq('GET', url, null, auth).then(function (r) {
          if (r.ok) {
            try { JSON.parse(r.text); } catch (e) { downloadNext(i + 1); return; }
            var key = names[i].replace('.json', '').replace('novels/', '').replace(/\//g, '-');
            if (key === 'novel-workshop-settings') localStorage.setItem(key, r.text);
            else if (key === 'novel-list') localStorage.setItem('novel-workshop-novels', r.text);
            else localStorage.setItem(key, r.text);
            restored++;
          }
          downloadNext(i + 1);
        }).catch(function () { downloadNext(i + 1); });
      }
      downloadNext(0);
    });

    document.getElementById('nw-export-btn').addEventListener('click', function () {
      var bundle = { version: 2, exportedAt: new Date().toISOString(), settings: JSON.parse(localStorage.getItem('novel-workshop-settings') || '{}'), novels: [] };
      var novels = getNovels();
      for (var i = 0; i < novels.length; i++) {
        var nd = {};
        for (var j = 0; j < NOVEL_KEYS.length; j++) {
          var sk = NOVEL_KEYS[j] + '-' + novels[i].id;
          var raw = localStorage.getItem(sk);
          if (raw) { try { nd[NOVEL_KEYS[j]] = JSON.parse(raw); } catch (e) { nd[NOVEL_KEYS[j]] = raw; } }
        }
        bundle.novels.push({ meta: novels[i], data: nd });
      }
      var blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'novel-workshop-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      toast('数据已下载', 'success');
    });
  }

  setTimeout(injectPanel, 1500);
  console.log('[小说工坊] WebDAV HTTP 备份脚本已加载。');
})();
