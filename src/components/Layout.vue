<template>
  <div class="min-h-screen flex flex-col">
    <header class="bg-white/80 backdrop-blur-md sticky top-0 z-40 h-16 flex items-center justify-between px-10 border-b border-[var(--border)]">
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 rounded-2xl flex items-center justify-center" style="background: var(--primary-gradient); box-shadow: var(--shadow-md);">
          <BookOpen class="text-white w-5 h-5" />
        </div>
        <span class="font-bold text-xl text-gradient">小说工坊</span>

        <!-- Novel selector -->
        <div class="relative" ref="novelDropdownRef">
          <button
            @click="showNovelDropdown = !showNovelDropdown"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-alt)] transition-colors text-sm text-[var(--text)] min-w-[140px]"
          >
            <BookOpen class="w-3.5 h-3.5 text-[var(--primary)]" />
            <span class="truncate max-w-[120px]">{{ activeNovel?.title || '我的小说' }}</span>
            <ChevronDown class="w-3 h-3 text-[var(--text-muted)]" :class="{ 'rotate-180': showNovelDropdown }" />
          </button>

          <div v-if="showNovelDropdown" class="novel-dropdown-menu">
            <div class="novel-dropdown-header">切换小说</div>
            <button
              v-for="novel in novels"
              :key="novel.id"
              @click="handleSwitchNovel(novel.id); showNovelDropdown = false"
              class="novel-dropdown-item"
              :class="{ active: novel.id === activeNovelId }"
            >
              <BookOpen class="w-3.5 h-3.5 shrink-0" />
              <span class="truncate">{{ novel.title }}</span>
              <span v-if="novel.id === activeNovelId" class="text-xs text-[var(--primary)] ml-auto">当前</span>
            </button>
            <div class="novel-dropdown-divider"></div>
            <button @click="showCreateNovel = true; showNovelDropdown = false" class="novel-dropdown-item">
              <Plus class="w-3.5 h-3.5" /> 新建小说
            </button>
            <label class="novel-dropdown-item cursor-pointer">
              <Upload class="w-3.5 h-3.5" /> 导入 JSON
              <input type="file" accept=".json" class="hidden" @change="handleImportNovelJson" />
            </label>
            <button
              v-if="novels.length > 1"
              @click="handleDeleteNovel(activeNovelId); showNovelDropdown = false"
              class="novel-dropdown-item text-red-500 hover:bg-red-50"
            >
              <Trash2 class="w-3.5 h-3.5" /> 删除当前小说
            </button>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="relative w-56">
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            v-model="globalSearchQuery"
            type="text"
            class="input input-with-left-icon py-2"
            placeholder="全文搜索..."
            aria-label="全文搜索"
            @keyup.enter="goToGlobalSearch"
          />
        </div>
        <button
          @click="aiVisible = !aiVisible"
          class="btn"
          :class="aiVisible ? 'btn-primary' : 'btn-secondary'"
          title="AI 写作助手"
        >
          <Sparkles class="w-4 h-4" />
          AI 助手
        </button>
        <div class="dropdown">
          <button
            @click="toggleDropdown"
            class="btn btn-primary"
          >
            <Download class="w-4 h-4" />
            导出
            <ChevronDown class="w-3.5 h-3.5 transition-transform" :class="showDropdown ? 'rotate-180' : ''" />
          </button>
          <div v-if="showDropdown" class="dropdown-menu">
          <button @mousedown.prevent="openExportDialog" class="dropdown-item">
            <FileJson class="w-4 h-4" />
            导出 JSON
          </button>
          <button @mousedown.prevent="exportTxt" class="dropdown-item">
            <FileText class="w-4 h-4" />
            导出 TXT
          </button>
          <button @mousedown.prevent="exportWord" class="dropdown-item">
            <FileText class="w-4 h-4" />
            导出 Word
          </button>
          <button @mousedown.prevent="exportPlotExcel" class="dropdown-item">
            <FileText class="w-4 h-4" />
            导出情节表（Excel）
          </button>
        </div>
        </div>
        <button @click="triggerImport" class="btn btn-secondary">
          <Upload class="w-4 h-4" />
          导入 JSON
        </button>
        <input
          ref="fileInput"
          type="file"
          accept=".json"
          class="hidden"
          @change="handleFileChange"
        />
      </div>
    </header>

    <div v-if="importMessage" class="fixed top-20 right-8 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg transition-all"
      :class="importSuccess ? 'bg-green-500/90 text-white backdrop-blur' : 'bg-red-500/90 text-white backdrop-blur'"
    >
      {{ importMessage }}
    </div>

    <div class="flex flex-1" style="height: calc(100vh - 4rem)">
      <aside class="w-64 shrink-0 bg-white border-r border-[var(--border)] overflow-y-auto pad-5">
        <nav class="space-y-2">
          <router-link
            to="/home"
            class="nav-link"
            :class="$route.path === '/home' ? 'nav-link-active' : ''"
          >
            <LayoutDashboard class="w-5 h-5" />
            仪表板
          </router-link>
          <router-link
            to="/chapters"
            class="nav-link"
            :class="$route.path === '/chapters' ? 'nav-link-active' : ''"
          >
            <FileText class="w-5 h-5" />
            章节管理
          </router-link>
          <router-link
            to="/series"
            class="nav-link"
            :class="$route.path === '/series' ? 'nav-link-active' : ''"
          >
            <Layers class="w-5 h-5" />
            系列管理
          </router-link>
          <router-link
            to="/plot-outline"
            class="nav-link"
            :class="$route.path === '/plot-outline' ? 'nav-link-active' : ''"
          >
            <FileText class="w-5 h-5" />
            整理情节
          </router-link>
          <router-link
            to="/characters"
            class="nav-link"
            :class="$route.path === '/characters' ? 'nav-link-active' : ''"
          >
            <Users class="w-5 h-5" />
            角色设定
          </router-link>
          <router-link
            to="/scenes"
            class="nav-link"
            :class="$route.path === '/scenes' ? 'nav-link-active' : ''"
          >
            <Map class="w-5 h-5" />
            场景设定
          </router-link>
          <router-link
            to="/items"
            class="nav-link"
            :class="$route.path === '/items' ? 'nav-link-active' : ''"
          >
            <Package class="w-5 h-5" />
            物品设定
          </router-link>
          <router-link
            to="/search"
            class="nav-link"
            :class="$route.path === '/search' ? 'nav-link-active' : ''"
          >
            <Search class="w-5 h-5" />
            全文搜索
          </router-link>
          <router-link
            to="/editor"
            class="nav-link"
            :class="$route.path.startsWith('/editor') ? 'nav-link-active' : ''"
          >
            <Edit class="w-5 h-5" />
            小说编辑
          </router-link>
          <router-link
            to="/world-simulation"
            class="nav-link"
            :class="$route.path === '/world-simulation' ? 'nav-link-active' : ''"
          >
            <CircuitBoard class="w-5 h-5" />
            世界模拟
          </router-link>
          <div class="my-3 border-t border-[var(--border)]"></div>
          <router-link
            to="/settings"
            class="nav-link"
            :class="$route.path === '/settings' ? 'nav-link-active' : ''"
          >
            <Settings class="w-5 h-5" />
            设置
          </router-link>
        </nav>
      </aside>

      <main class="flex-1 min-w-0 overflow-y-auto pad-10 bg-transparent">
        <slot />
      </main>
    </div>

    <AIAssistantWidget :visible="aiVisible" @close="aiVisible = false" />

    <ExportDialog
      :visible="showExportDialog"
      :summaries="exportSummaries"
      @close="showExportDialog = false"
      @export="handleExport"
    />

    <ImportDialog
      :visible="showImportDialog"
      :sections="importSections"
      @close="showImportDialog = false"
      @import="handleImport"
    />

    <!-- Create novel dialog -->
    <div v-if="showCreateNovel" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" @click.self="showCreateNovel = false">
      <div class="card p-6 max-w-sm w-full mx-4 space-y-4">
        <h3 class="text-lg font-semibold text-[var(--text)]">新建小说</h3>
        <input
          v-model="newNovelTitle"
          type="text"
          class="input w-full"
          placeholder="小说名称"
          @keyup.enter="handleCreateNovel"
        />
        <div class="flex gap-3 justify-end">
          <button @click="showCreateNovel = false" class="btn btn-secondary text-sm">取消</button>
          <button @click="handleCreateNovel" class="btn btn-primary text-sm" :disabled="!newNovelTitle.trim()">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { BookOpen, LayoutDashboard, FileText, Users, Map, Package, Edit, Download, Upload, ChevronDown, FileJson, Layers, Search, Settings, Sparkles, CircuitBoard, Plus, Trash2 } from 'lucide-vue-next';
import { useStore } from '../store';
import { useAIChat } from '../composables/useAIChat';
import { useSettings } from '../composables/useSettings';
import type { ExportBundle } from '../types';
import AIAssistantWidget from './AIAssistantWidget.vue';
import ExportDialog from './ExportDialog.vue';
import ImportDialog from './ImportDialog.vue';
import { useNovelManager } from '../composables/useNovelManager';

const { novel, downloadTxt, downloadWord, downloadPlotOutlineExcel, buildExportParts, importParts, wrapLegacyData } = useStore();
const { settings, importSettings } = useSettings();
const { sessions, importSessions } = useAIChat();

const router = useRouter();
const route = useRoute();

const showDropdown = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const importMessage = ref('');
const importSuccess = ref(false);
const globalSearchQuery = ref('');
const aiVisible = ref(false);

const showExportDialog = ref(false);
const showImportDialog = ref(false);
const showNovelDropdown = ref(false);
const showCreateNovel = ref(false);
const newNovelTitle = ref('');
const novelDropdownRef = ref<HTMLElement | null>(null);

const { novels, activeNovelId, activeNovel, createNovel, switchNovel, deleteNovel } = useNovelManager();
const importSections = ref<{ key: string; label: string; summary: string; checked: boolean }[]>([]);
const pendingImportData = ref<ExportBundle | null>(null);

const exportSummaries = computed(() => {
  const n = novel.value;
  const dayCountKeys = Object.keys(n.dayCount).length;
  const seriesCount = n.chapterSeries?.length ?? 0;
  const relationCount = n.chapterRelations?.length ?? 0;
  return {
    articles: `${n.volumes.length} 卷, ${n.chapters.length} 章, ${seriesCount} 系列, ${relationCount} 关系`,
    dayCount: `${dayCountKeys} 天记录`,
    lore: `${n.characters.length} 角色, ${n.scenes.length} 场景, ${n.items.length} 物品`,
    settings: `${settings.value.aiConfigs.length} 个 AI 配置`,
    aiChats: `${sessions.value.length} 个对话`,
  };
});

watch(
  () => route.query.q,
  (value) => {
    globalSearchQuery.value = typeof value === 'string' ? value : '';
  },
  { immediate: true }
);

const closeDropdown = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest('.dropdown')) {
    showDropdown.value = false;
  }
};

onMounted(() => document.addEventListener('click', closeDropdown));
onUnmounted(() => document.removeEventListener('click', closeDropdown));

const openExportDialog = () => {
  showDropdown.value = false;
  showExportDialog.value = true;
};

const handleExport = (selected: string[]) => {
  showExportDialog.value = false;
  const bundle: ExportBundle = {
    version: 1,
    exportedAt: new Date().toISOString(),
  };

  const novelParts = buildExportParts(new Set(selected));
  Object.assign(bundle, novelParts);

  if (selected.includes('settings')) {
    bundle.settings = JSON.parse(JSON.stringify(settings.value));
  }
  if (selected.includes('aiChats')) {
    bundle.aiChats = JSON.parse(JSON.stringify(sessions.value));
  }

  const content = JSON.stringify(bundle, null, 2);
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${novel.value.title || '小说'}.json`;
  link.click();
  URL.revokeObjectURL(url);

  importMessage.value = `已导出 ${selected.length} 项内容`;
  importSuccess.value = true;
  setTimeout(() => { importMessage.value = ''; }, 2000);
};

const exportTxt = () => {
  downloadTxt();
  showDropdown.value = false;
};

const exportWord = () => {
  downloadWord();
  showDropdown.value = false;
};

const exportPlotExcel = () => {
  downloadPlotOutlineExcel();
  showDropdown.value = false;
};

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value;
};

const triggerImport = () => {
  fileInput.value?.click();
};

const goToGlobalSearch = () => {
  const q = globalSearchQuery.value.trim();
  router.push({ path: '/search', query: q ? { q } : {} });
};

function detectSections(data: Record<string, unknown>): { key: string; label: string; summary: string }[] {
  const sections: { key: string; label: string; summary: string }[] = [];

  // New format: ExportBundle
  if (data.version && data.exportedAt) {
    if (data.articles && typeof data.articles === 'object') {
      const a = data.articles as Record<string, unknown>;
      const volumes = Array.isArray(a.volumes) ? a.volumes.length : 0;
      const chapters = Array.isArray(a.chapters) ? a.chapters.length : 0;
      const series = Array.isArray(a.chapterSeries) ? a.chapterSeries.length : 0;
      const relations = Array.isArray(a.chapterRelations) ? a.chapterRelations.length : 0;
      sections.push({ key: 'articles', label: '文章', summary: `${volumes} 卷, ${chapters} 章, ${series} 系列, ${relations} 关系` });
    }
    if (data.dayCount && typeof data.dayCount === 'object' && !Array.isArray(data.dayCount)) {
      const days = Object.keys(data.dayCount as Record<string, unknown>).length;
      sections.push({ key: 'dayCount', label: '码字记录', summary: `${days} 天记录` });
    }
    if (data.lore && typeof data.lore === 'object') {
      const l = data.lore as Record<string, unknown>;
      const chars = Array.isArray(l.characters) ? l.characters.length : 0;
      const scenes = Array.isArray(l.scenes) ? l.scenes.length : 0;
      const items = Array.isArray(l.items) ? l.items.length : 0;
      sections.push({ key: 'lore', label: '设定集', summary: `${chars} 角色, ${scenes} 场景, ${items} 物品` });
    }
    if (data.settings) {
      sections.push({ key: 'settings', label: '设置', summary: '应用设置' });
    }
    if (data.aiChats && Array.isArray(data.aiChats)) {
      sections.push({ key: 'aiChats', label: 'AI 对话', summary: `${data.aiChats.length} 个对话` });
    }
  } else {
    // Old format: raw Novel object
    if (data.chapters || data.volumes) {
      const volumes = Array.isArray(data.volumes) ? data.volumes.length : 0;
      const chapters = Array.isArray(data.chapters) ? data.chapters.length : 0;
      const series = Array.isArray(data.chapterSeries) ? data.chapterSeries.length : 0;
      const relations = Array.isArray(data.chapterRelations) ? data.chapterRelations.length : 0;
      sections.push({ key: 'articles', label: '文章', summary: `${volumes} 卷, ${chapters} 章, ${series} 系列, ${relations} 关系` });
    }
    if (data.dayCount && typeof data.dayCount === 'object' && !Array.isArray(data.dayCount)) {
      const days = Object.keys(data.dayCount as Record<string, unknown>).length;
      sections.push({ key: 'dayCount', label: '码字记录', summary: `${days} 天记录` });
    }
    if (data.characters || data.scenes || data.items) {
      const chars = Array.isArray(data.characters) ? data.characters.length : 0;
      const scs = Array.isArray(data.scenes) ? data.scenes.length : 0;
      const itms = Array.isArray(data.items) ? data.items.length : 0;
      sections.push({ key: 'lore', label: '设定集', summary: `${chars} 角色, ${scs} 场景, ${itms} 物品` });
    }
  }

  return sections;
}

const handleFileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  try {
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target?.result as string);
      reader.onerror = () => reject(new Error('读取失败'));
      reader.readAsText(file);
    });

    const data = JSON.parse(text);
    if (!data || typeof data !== 'object') {
      importMessage.value = '导入失败：无效的 JSON 格式';
      importSuccess.value = false;
      setTimeout(() => { importMessage.value = ''; }, 3000);
      target.value = '';
      return;
    }

    const sections = detectSections(data as Record<string, unknown>);
    if (sections.length === 0) {
      importMessage.value = '导入失败：未检测到可导入的内容';
      importSuccess.value = false;
      setTimeout(() => { importMessage.value = ''; }, 3000);
      target.value = '';
      return;
    }

    pendingImportData.value = data as ExportBundle;
    importSections.value = sections.map(s => ({ ...s, checked: true }));
    showImportDialog.value = true;
  } catch {
    importMessage.value = '导入失败：无法解析 JSON 文件';
    importSuccess.value = false;
    setTimeout(() => { importMessage.value = ''; }, 3000);
  }

  target.value = '';
};

const handleImport = (selected: string[]) => {
  showImportDialog.value = false;
  const raw = pendingImportData.value;
  if (!raw) return;

  const selectedSet = new Set(selected);
  const data: ExportBundle = raw.version
    ? raw
    : wrapLegacyData(raw as unknown as Record<string, unknown>);

  importParts(data, selectedSet);

  if (selectedSet.has('settings') && data.settings) {
    importSettings(data.settings);
  }
  if (selectedSet.has('aiChats') && data.aiChats && Array.isArray(data.aiChats)) {
    importSessions(data.aiChats);
  }

  pendingImportData.value = null;

  importMessage.value = `成功导入 ${selected.length} 项内容`;
  importSuccess.value = true;
  setTimeout(() => { importMessage.value = ''; }, 3000);
};

// === Novel management ===
function handleSwitchNovel(id: string) {
  switchNovel(id);
}

function handleCreateNovel() {
  const title = newNovelTitle.value.trim();
  if (!title) return;
  createNovel(title);
  newNovelTitle.value = '';
  showCreateNovel.value = false;
}

function handleDeleteNovel(id: string) {
  if (novels.value.length <= 1) return;
  deleteNovel(id);
}

async function handleImportNovelJson(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Determine novel title
    const title = data.title || data.articles?.title || file.name.replace('.json', '');
    const novel = createNovel(title);

    // If it's an ExportBundle, import the articles
    if (data.articles?.chapters) {
      const scopedDataKey = `novel-workshop-data-${novel.id}`;
      const novelData = {
        title: data.articles.title || title,
        volumes: data.articles.volumes || [],
        chapters: data.articles.chapters || [],
        chapterSeries: data.articles.chapterSeries || [],
        chapterRelations: data.articles.chapterRelations || [],
        characters: data.lore?.characters || [],
        scenes: data.lore?.scenes || [],
        items: data.lore?.items || [],
        dayCount: data.dayCount || {},
      };
      localStorage.setItem(scopedDataKey, JSON.stringify(novelData));
    } else if (data.chapters) {
      // Direct Novel data
      const scopedDataKey = `novel-workshop-data-${novel.id}`;
      localStorage.setItem(scopedDataKey, JSON.stringify(data));
    }

    importMessage.value = `已导入小说「${title}」`;
    importSuccess.value = true;
    setTimeout(() => { importMessage.value = ''; }, 3000);
    // Reload to apply the new data
    window.location.reload();
  } catch {
    importMessage.value = '导入失败：无法解析 JSON 文件';
    importSuccess.value = false;
    setTimeout(() => { importMessage.value = ''; }, 3000);
  }

  input.value = '';
}

// Click outside to close novel dropdown
function handleClickOutside(e: MouseEvent) {
  if (novelDropdownRef.value && !novelDropdownRef.value.contains(e.target as Node)) {
    showNovelDropdown.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.novel-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  min-width: 200px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  z-index: 50;
  overflow: hidden;
}

.novel-dropdown-header {
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.novel-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;
}

.novel-dropdown-item:hover {
  background: var(--surface-alt);
}

.novel-dropdown-item.active {
  background: rgba(99, 102, 241, 0.06);
}

.novel-dropdown-divider {
  height: 1px;
  background: var(--border);
  margin: 4px 0;
}
</style>
