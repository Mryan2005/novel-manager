<template>
  <Layout>
    <div class="page-space max-w-2xl">
      <div>
        <h1 class="text-3xl font-bold text-[var(--text)] mb-2">设置</h1>
        <p class="text-[var(--text-light)] text-lg">调整应用偏好与管理数据</p>
      </div>

      <section class="card settings-card p-2 space-y-6">
        <h2 class="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
          <Monitor class="w-5 h-5" style="color: var(--primary);" />
          显示设置
        </h2>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-[var(--text-light)]">字体大小</label>
            <span class="text-sm font-semibold text-[var(--primary)]">{{ settings.fontSize }}px</span>
          </div>
          <div class="flex items-center gap-3">
            <Type class="w-4 h-4 text-[var(--text-muted)] shrink-0" />
            <input type="range" min="12" max="24" step="1"
              :value="settings.fontSize"
              @input="settings.fontSize = Number(($event.target as HTMLInputElement).value)"
              class="slider flex-1"
            />
            <button @click="resetFontSize" class="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors px-2 py-1 rounded-lg hover:bg-[var(--surface-alt)]">重置</button>
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-[var(--text-light)]">显示比例</label>
            <span class="text-sm font-semibold text-[var(--primary)]">{{ (settings.displayScale * 100).toFixed(0) }}%</span>
          </div>
          <div class="flex items-center gap-3">
            <Maximize class="w-4 h-4 text-[var(--text-muted)] shrink-0" />
            <button
              class="scale-action"
              @click="adjustDisplayScale(-0.05)"
              title="缩小"
            >
              -
            </button>
            <input type="range" min="75" max="150" step="5"
              :value="settings.displayScale * 100"
              @input="settings.displayScale = Number(($event.target as HTMLInputElement).value) / 100"
              class="slider flex-1"
            />
            <button
              class="scale-action"
              @click="adjustDisplayScale(0.05)"
              title="放大"
            >
              +
            </button>
            <button @click="resetDisplayScale" class="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors px-2 py-1 rounded-lg hover:bg-[var(--surface-alt)]">重置</button>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="preset in [0.9, 1, 1.1, 1.25]"
              :key="preset"
              class="text-xs px-2.5 py-1 rounded-lg border transition-colors"
              :class="Math.abs(settings.displayScale - preset) < 0.01 ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'border-[var(--border)] text-[var(--text-light)] hover:bg-[var(--surface-alt)]'"
              @click="settings.displayScale = preset"
            >
              {{ Math.round(preset * 100) }}%
            </button>
          </div>
        </div>

        <div class="p-4 rounded-xl text-sm" style="background: var(--surface-alt); color: var(--text-light);">
          预览效果 — 调整滑块即可实时查看文字大小和界面比例的变动。
        </div>
      </section>

      <section class="card settings-card p-2 space-y-6">
        <h2 class="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
          <Sparkles class="w-5 h-5" style="color: var(--primary);" />
          AI 助手设置
        </h2>

        <p class="text-xs text-[var(--text-muted)] leading-relaxed">
          可以保存多个 AI 配置并随时切换。所有配置只保存在本地浏览器。
        </p>

        <!-- 配置选择器 -->
        <div class="flex items-center gap-2">
          <select
            :value="settings.aiActiveConfigId"
            @change="setActiveAIConfig(($event.target as HTMLSelectElement).value)"
            class="input text-sm flex-1"
          >
            <option v-for="cfg in settings.aiConfigs" :key="cfg.id" :value="cfg.id">{{ cfg.name }}</option>
          </select>
          <button @click="addNewConfig" class="btn btn-secondary text-sm shrink-0" title="新增配置">
            <Plus class="w-4 h-4" />
          </button>
          <button
            v-if="settings.aiConfigs.length > 1"
            @click="removeCurrentConfig"
            class="btn btn-secondary text-sm shrink-0"
            title="删除当前配置"
            style="color: var(--error);"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>

        <template v-if="activeConfig">
          <!-- 配置名称 -->
          <div class="space-y-2">
            <label class="text-sm font-medium text-[var(--text-light)]">配置名称</label>
            <input v-model="activeConfig.name" class="input text-sm" placeholder="如：GPT-4o、DeepSeek" />
          </div>

          <!-- AI 格式 -->
          <div class="space-y-2">
            <label class="text-sm font-medium text-[var(--text-light)]">AI 格式</label>
            <select v-model="activeConfig.provider" class="input text-sm">
              <option value="openai">OpenAI</option>
              <option value="openai-like">类 OpenAI（兼容接口）</option>
              <option value="gemini">Gemini AI</option>
            </select>
          </div>
          <!-- API URL（非 Gemini） -->
          <div v-if="activeConfig.provider !== 'gemini'" class="space-y-2">
            <label class="text-sm font-medium text-[var(--text-light)]">API URL / Base URL</label>
            <input v-model="activeConfig.apiUrl" class="input text-sm" placeholder="https://api.openai.com/v1" />
          </div>

          <!-- Token -->
          <div class="space-y-2">
            <label class="text-sm font-medium text-[var(--text-light)]">Token / API Key</label>
            <input v-model="activeConfig.token" class="input text-sm" type="password" placeholder="sk-..." />
          </div>

          <!-- 模型名称 -->
          <div class="space-y-2">
            <label class="text-sm font-medium text-[var(--text-light)]">模型名称</label>
            <input
              v-model="activeConfig.model"
              class="input text-sm"
              :placeholder="activeConfig.provider === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o-mini'"
            />
          </div>

          <!-- 系统提示词 -->
          <div class="space-y-2">
            <label class="text-sm font-medium text-[var(--text-light)]">系统提示词</label>
            <textarea
              v-model="activeConfig.systemPrompt"
              class="input text-sm min-h-[80px]"
              placeholder="设定 AI 的角色和行为..."
            ></textarea>
          </div>

          <!-- JSON 模式 -->
          <div class="flex items-center justify-between">
            <div>
              <label class="text-sm font-medium text-[var(--text-light)]">JSON 结构化输出</label>
              <p class="text-xs text-[var(--text-muted)]">强制模型返回 JSON 格式</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="activeConfig.enableJsonMode" class="sr-only peer" />
              <div class="w-9 h-5 rounded-full peer-checked:bg-[var(--primary)] bg-[var(--border)] transition-colors"></div>
              <div class="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-4"></div>
            </label>
          </div>

          <div v-if="hasAiConfig" class="p-3 rounded-xl text-xs" style="background: rgba(16, 185, 129, 0.08); color: var(--success);">
            当前配置已完成，可以点击 Header 中的「AI 助手」按钮开始使用。
          </div>
          <div v-else class="p-3 rounded-xl text-xs" style="background: var(--surface-alt); color: var(--text-muted);">
            {{ activeConfig.provider === 'gemini' ? '填写 Token 和模型名称后即可使用。' : '填写 API URL、Token 和模型名称后即可使用。' }}
          </div>
        </template>
      </section>

      <section class="card settings-card p-2 space-y-6">
        <h2 class="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
          <HardDrive class="w-5 h-5" style="color: var(--warning);" />
          缓存管理
        </h2>

        <div class="grid grid-cols-2 gap-3">
          <div class="p-3 rounded-xl" style="background: var(--surface-alt);">
            <div class="text-xs text-[var(--text-muted)]">小说数据</div>
            <div class="text-sm font-semibold text-[var(--text)]">{{ formatSize(stats.novelData) }}</div>
          </div>
          <div class="p-3 rounded-xl" style="background: var(--surface-alt);">
            <div class="text-xs text-[var(--text-muted)]">草稿</div>
            <div class="text-sm font-semibold text-[var(--text)]">{{ formatSize(stats.drafts) }}</div>
          </div>
          <div class="p-3 rounded-xl" style="background: var(--surface-alt);">
            <div class="text-xs text-[var(--text-muted)]">备份</div>
            <div class="text-sm font-semibold text-[var(--text)]">{{ formatSize(stats.backups) }}</div>
          </div>
          <div class="p-3 rounded-xl" style="background: var(--surface-alt);">
            <div class="text-xs text-[var(--text-muted)]">其他</div>
            <div class="text-sm font-semibold text-[var(--text)]">{{ formatSize(stats.other) }}</div>
          </div>
        </div>

        <div class="space-y-3">
          <button @click="handleClearDrafts" class="btn btn-secondary w-full justify-start" :disabled="stats.drafts === 0">
            <FileText class="w-4 h-4" /> 清除草稿缓存
          </button>
          <button @click="handleClearBackups" class="btn btn-secondary w-full justify-start" :disabled="stats.backups === 0">
            <Archive class="w-4 h-4" /> 清除备份缓存
          </button>
          <button @click="handleClearNovelData" class="btn btn-secondary w-full justify-start text-[var(--error)]" style="border-color: rgba(239, 68, 68, 0.3);">
            <Trash2 class="w-4 h-4" /> 清除小说数据
          </button>
          <button @click="handleClearAll" class="btn w-full justify-start" style="background: rgba(239, 68, 68, 0.1); color: var(--error);">
            <TriangleAlert class="w-4 h-4" /> 清除所有缓存
          </button>
        </div>
      </section>

      <section class="card settings-card p-2 space-y-6">
        <h2 class="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
          <Cloud class="w-5 h-5" style="color: var(--primary);" />
          WebDAV 同步
        </h2>

        <p class="text-sm text-[var(--text-muted)]">
          将小说数据、设置、AI 聊天记录和世界模拟会话备份到 WebDAV 服务器，或从服务器恢复。
        </p>

        <div class="space-y-4">
          <div>
            <label class="text-sm font-medium text-[var(--text-light)]">WebDAV 地址</label>
            <input
              type="text"
              :value="settings.webdavUrl"
              @input="settings.webdavUrl = ($event.target as HTMLInputElement).value"
              placeholder="https://dav.example.com/remote.php/dav/files/user/novel-backup"
              class="input mt-1"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-[var(--text-light)]">用户名</label>
              <input
                type="text"
                :value="settings.webdavUsername"
                @input="settings.webdavUsername = ($event.target as HTMLInputElement).value"
                placeholder="用户名"
                class="input mt-1"
              />
            </div>
            <div>
              <label class="text-sm font-medium text-[var(--text-light)]">密码</label>
              <input
                type="password"
                :value="settings.webdavPassword"
                @input="settings.webdavPassword = ($event.target as HTMLInputElement).value"
                placeholder="密码"
                class="input mt-1"
              />
            </div>
          </div>

          <div>
            <label class="text-sm font-medium text-[var(--text-light)]">加密口令</label>
            <input
              type="password"
              :value="settings.encryptionPasskey"
              @input="settings.encryptionPasskey = ($event.target as HTMLInputElement).value"
              placeholder="留空则不加密上传文件"
              class="input mt-1"
            />
            <p class="text-xs text-[var(--text-muted)] mt-1">
              设置口令后，上传到 WebDAV 的文件将使用 AES-GCM 加密。下载时需输入相同口令解密。
            </p>
          </div>

          <!-- HTTP on HTTPS warning -->
          <div
            v-if="isHttpsPage && settings.webdavUrl.startsWith('http://')"
            class="p-3 rounded-xl text-sm text-amber-700 bg-amber-50 border border-amber-200"
          >
            当前页面使用 HTTPS，但 WebDAV 地址使用 HTTP。浏览器可能会阻止此请求。建议将 WebDAV 地址改为 HTTPS，或通过反向代理访问。
          </div>

          <!-- Status message -->
          <div
            v-if="wdav.statusMessage.value"
            class="p-3 rounded-xl text-sm font-medium"
            :class="wdav.statusType.value === 'success'
              ? 'text-green-700 bg-green-50 border border-green-200'
              : 'text-red-700 bg-red-50 border border-red-200'"
          >
            {{ wdav.statusMessage.value }}
          </div>

          <div class="flex gap-3">
            <button
              @click="handleWebDAVUpload"
              class="btn btn-primary flex-1 justify-center"
              :disabled="wdav.uploading.value || wdav.downloading.value || !settings.webdavUrl"
            >
              <CloudUpload v-if="!wdav.uploading.value" class="w-4 h-4" />
              <span v-else class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              {{ wdav.uploading.value ? '上传中...' : '备份到 WebDAV' }}
            </button>
            <button
              @click="handleWebDAVDownload"
              class="btn btn-secondary flex-1 justify-center"
              :disabled="wdav.uploading.value || wdav.downloading.value || !settings.webdavUrl"
            >
              <CloudDownload v-if="!wdav.downloading.value" class="w-4 h-4" />
              <span v-else class="inline-block w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></span>
              {{ wdav.downloading.value ? '下载中...' : '从 WebDAV 恢复' }}
            </button>
          </div>
        </div>
      </section>

      <section v-if="isHttpsPage" class="card settings-card p-2 space-y-4">
        <h2 class="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
          <Download class="w-5 h-5" style="color: var(--primary);" />
          安装油猴脚本 — 解除 WebDAV HTTPS 限制
        </h2>

        <p class="text-sm text-[var(--text-muted)]">
          当前页面使用 HTTPS，浏览器会阻止 HTTP 的 WebDAV 请求。安装此脚本后，WebDAV 请求将自动通过油猴脚本转发，无需修改 WebDAV 地址。
        </p>

        <div class="space-y-3">
          <div class="flex flex-col gap-2">
            <p class="text-xs text-[var(--text-muted)]">1. 先安装浏览器扩展 <strong>Tampermonkey</strong></p>
            <p class="text-xs text-[var(--text-muted)]">2. 点击下方按钮安装脚本</p>
          </div>

          <a
            href="/novel-workshop-backup.user.js"
            class="btn btn-primary w-full justify-center"
            target="_blank"
          >
            <Download class="w-4 h-4" />
            安装油猴脚本
          </a>

          <p class="text-xs text-[var(--text-muted)]">
            Tampermonkey 将提示你确认安装。安装后无需任何配置，HTTP 的 WebDAV 即可在 HTTPS 页面上正常使用。脚本开源于项目仓库。
          </p>
        </div>
      </section>

      <div v-if="confirmAction" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" @click.self="confirmAction = null">
        <div class="card p-6 max-w-sm w-full mx-4 space-y-4">
          <h3 class="text-lg font-semibold text-[var(--text)]">确认操作</h3>
          <p class="text-sm text-[var(--text-light)]">{{ confirmMessage }}</p>
          <div class="flex gap-3 justify-end">
            <button @click="confirmAction = null" class="btn btn-secondary text-sm">取消</button>
            <button @click="executeConfirm" class="btn btn-primary text-sm" style="background: var(--error);">确认</button>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Monitor, Type, Maximize, HardDrive, FileText, Archive, Trash2, TriangleAlert, Sparkles, Plus, Cloud, CloudDownload, CloudUpload, Download } from 'lucide-vue-next';
import Layout from '../components/Layout.vue';
import { useSettings } from '../composables/useSettings';
import { useWebDAV } from '../composables/useWebDAV';

const { settings, activeAIConfig, addAIConfig, removeAIConfig, setActiveAIConfig, resetFontSize, resetDisplayScale, clearAllCache, clearNovelData, clearDrafts, clearBackups, getCacheStats, formatSize } = useSettings();
const wdav = useWebDAV();
const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';

const stats = computed(() => getCacheStats());

const activeConfig = computed(() =>
  settings.value.aiConfigs.find(c => c.id === settings.value.aiActiveConfigId) ?? null
);

const hasAiConfig = computed(() => {
  const cfg = activeConfig.value;
  if (!cfg) return false;
  const hasToken = cfg.token.trim() !== '';
  const hasModel = cfg.model.trim() !== '';
  if (cfg.provider === 'gemini') {
    return hasToken && hasModel;
  }
  return cfg.apiUrl.trim() !== '' && hasToken && hasModel;
});

function addNewConfig() {
  addAIConfig();
}

function removeCurrentConfig() {
  if (settings.value.aiActiveConfigId && settings.value.aiConfigs.length > 1) {
    removeAIConfig(settings.value.aiActiveConfigId);
  }
}

const confirmAction = ref<(() => void) | null>(null);
const confirmMessage = ref('');

function handleClearAll() {
  confirmMessage.value = '将清除所有小说数据、草稿和备份，此操作不可恢复。确定继续？';
  confirmAction.value = clearAllCache;
}
function handleClearNovelData() {
  confirmMessage.value = '将清除小说数据（章节、角色、场景、物品），此操作不可恢复。确定继续？';
  confirmAction.value = clearNovelData;
}
function handleClearDrafts() {
  confirmMessage.value = '将清除所有草稿缓存。确定继续？';
  confirmAction.value = clearDrafts;
}
function handleClearBackups() {
  confirmMessage.value = '将清除所有备份。确定继续？';
  confirmAction.value = clearBackups;
}
function executeConfirm() {
  if (confirmAction.value) confirmAction.value();
  confirmAction.value = null;
}

function adjustDisplayScale(delta: number) {
  const next = Number((settings.value.displayScale + delta).toFixed(2));
  settings.value.displayScale = Math.min(1.5, Math.max(0.75, next));
}

async function handleWebDAVUpload() {
  await wdav.uploadAll({
    url: settings.value.webdavUrl,
    username: settings.value.webdavUsername,
    password: settings.value.webdavPassword,
  });
}

async function handleWebDAVDownload() {
  await wdav.downloadAll({
    url: settings.value.webdavUrl,
    username: settings.value.webdavUsername,
    password: settings.value.webdavPassword,
  });
}

</script>

<style scoped>
.settings-card {
  border-color: var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.scale-action {
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  color: var(--text-light);
  background: var(--surface);
}

.scale-action:hover {
  background: var(--surface-alt);
  color: var(--text);
}

.slider {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: var(--border);
  outline: none;
  cursor: pointer;
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--primary-gradient);
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(99, 102, 241, 0.3);
  transition: transform 0.15s;
}
.slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--primary-gradient);
  cursor: pointer;
  border: none;
}
</style>
