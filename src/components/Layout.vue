<template>
  <div class="min-h-screen flex flex-col">
    <header class="bg-white/80 backdrop-blur-md sticky top-0 z-40 h-16 flex items-center justify-between px-10 border-b border-[var(--border)]">
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 rounded-2xl flex items-center justify-center" style="background: var(--primary-gradient); box-shadow: var(--shadow-md);">
          <BookOpen class="text-white w-5 h-5" />
        </div>
        <span class="font-bold text-xl text-gradient">小说工坊</span>
      </div>
      <div class="flex items-center gap-3">
        <div class="relative w-64">
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            v-model="globalSearchQuery"
            type="text"
            class="input pl-9 py-2"
            placeholder="全文搜索..."
            @keyup.enter="goToGlobalSearch"
          />
        </div>
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
          <button @mousedown.prevent="exportJson" class="dropdown-item">
            <FileJson class="w-4 h-4" />
            导出 JSON
          </button>
          <button @mousedown.prevent="exportTxt" class="dropdown-item">
            <FileText class="w-4 h-4" />
            导出 TXT
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
      <aside class="w-64 shrink-0 bg-white border-r border-[var(--border)] overflow-y-auto p-5">
        <nav class="space-y-1">
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
        </nav>
      </aside>

      <main class="flex-1 min-w-0 overflow-y-auto p-10 bg-transparent">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { BookOpen, LayoutDashboard, FileText, Users, Map, Package, Edit, Download, Upload, ChevronDown, FileJson, Search } from 'lucide-vue-next';
import { useStore } from '../store';

const { downloadTxt, downloadJson, importFromFile } = useStore();
const router = useRouter();
const route = useRoute();

const showDropdown = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const importMessage = ref('');
const importSuccess = ref(false);
const globalSearchQuery = ref('');

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

const exportJson = () => {
  downloadJson();
  showDropdown.value = false;
};

const exportTxt = () => {
  downloadTxt();
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

const handleFileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const ok = await importFromFile(file);
  if (ok) {
    importMessage.value = '导入成功！页面将刷新数据';
    importSuccess.value = true;
    setTimeout(() => window.location.reload(), 500);
  } else {
    importMessage.value = '导入失败，请检查文件格式';
    importSuccess.value = false;
  }

  setTimeout(() => {
    importMessage.value = '';
  }, 3000);

  target.value = '';
};
</script>
