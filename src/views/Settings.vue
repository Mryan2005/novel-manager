<template>
  <Layout>
    <div class="space-y-8 max-w-2xl">
      <div>
        <h1 class="text-3xl font-bold text-[var(--text)] mb-2">设置</h1>
        <p class="text-[var(--text-light)] text-lg">调整应用偏好与管理数据</p>
      </div>

      <section class="card p-6 space-y-6">
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
            <input type="range" min="75" max="150" step="5"
              :value="settings.displayScale * 100"
              @input="settings.displayScale = Number(($event.target as HTMLInputElement).value) / 100"
              class="slider flex-1"
            />
            <button @click="resetDisplayScale" class="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors px-2 py-1 rounded-lg hover:bg-[var(--surface-alt)]">重置</button>
          </div>
        </div>

        <div class="p-4 rounded-xl text-sm" style="background: var(--surface-alt); color: var(--text-light);">
          预览效果 — 调整滑块即可实时查看文字大小和界面比例的变动。
        </div>
      </section>

      <section class="card p-6 space-y-6">
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
import { Monitor, Type, Maximize, HardDrive, FileText, Archive, Trash2, TriangleAlert } from 'lucide-vue-next';
import Layout from '../components/Layout.vue';
import { useSettings } from '../composables/useSettings';

const { settings, resetFontSize, resetDisplayScale, clearAllCache, clearNovelData, clearDrafts, clearBackups, getCacheStats, formatSize } = useSettings();

const stats = computed(() => getCacheStats());

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
</script>

<style scoped>
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
