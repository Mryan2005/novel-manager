<template>
  <Layout>
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold text-[var(--text)]">全文搜索</h1>
        <p class="text-[var(--text-light)] mt-1 text-lg">搜索章节正文、角色描述、场景描述和物品信息</p>
      </div>

      <div class="relative">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          v-model="query"
          type="text"
          class="input pl-10"
          placeholder="输入关键词后回车搜索..."
          @keyup.enter="runSearch"
        />
      </div>

      <div v-if="query.trim()" class="text-sm text-[var(--text-light)]">
        共找到 {{ totalCount }} 条结果
      </div>

      <div v-if="query.trim() && totalCount === 0" class="card p-12 text-center">
        <Search class="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
        <p class="text-[var(--text-light)]">没有找到匹配内容</p>
      </div>

      <div v-if="results.chapters.length > 0" class="card p-6">
        <h2 class="text-xl font-semibold mb-4">章节（{{ results.chapters.length }}）</h2>
        <div class="space-y-3">
          <div
            v-for="chapter in results.chapters"
            :key="chapter.id"
            class="p-4 rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/30 cursor-pointer"
            @click="goToChapter(chapter.id)"
          >
            <div class="font-semibold text-[var(--text)]">{{ chapter.title }}</div>
            <p class="text-sm text-[var(--text-light)] mt-1 line-clamp-2">{{ previewText(chapter.content) }}</p>
          </div>
        </div>
      </div>

      <div v-if="results.characters.length > 0" class="card p-6">
        <h2 class="text-xl font-semibold mb-4">角色（{{ results.characters.length }}）</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div v-for="character in results.characters" :key="character.id" class="p-4 rounded-xl border border-[var(--border)]">
            <div class="font-semibold text-[var(--text)]">{{ character.name }} · {{ character.role }}</div>
            <p class="text-sm text-[var(--text-light)] mt-1 line-clamp-3">{{ character.description || '（暂无描述）' }}</p>
          </div>
        </div>
      </div>

      <div v-if="results.scenes.length > 0" class="card p-6">
        <h2 class="text-xl font-semibold mb-4">场景（{{ results.scenes.length }}）</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div v-for="scene in results.scenes" :key="scene.id" class="p-4 rounded-xl border border-[var(--border)]">
            <div class="font-semibold text-[var(--text)]">{{ scene.name }} · {{ scene.location }}</div>
            <p class="text-sm text-[var(--text-light)] mt-1 line-clamp-3">{{ scene.description || '（暂无描述）' }}</p>
          </div>
        </div>
      </div>

      <div v-if="results.items.length > 0" class="card p-6">
        <h2 class="text-xl font-semibold mb-4">物品（{{ results.items.length }}）</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div v-for="item in results.items" :key="item.id" class="p-4 rounded-xl border border-[var(--border)]">
            <div class="font-semibold text-[var(--text)]">{{ item.name }} · {{ item.type }}</div>
            <p class="text-sm text-[var(--text-light)] mt-1 line-clamp-3">{{ item.description || '（暂无描述）' }}</p>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Search } from 'lucide-vue-next';
import Layout from '../components/Layout.vue';
import { useStore } from '../store';

const route = useRoute();
const router = useRouter();
const { fullTextSearch } = useStore();
const MAX_PREVIEW_LENGTH = 200;

const query = ref(typeof route.query.q === 'string' ? route.query.q : '');
const activeQuery = ref(query.value);

const results = computed(() => fullTextSearch(activeQuery.value));
const totalCount = computed(() =>
  results.value.chapters.length
  + results.value.characters.length
  + results.value.scenes.length
  + results.value.items.length
);

watch(
  () => route.query.q,
  (value) => {
    const nextQuery = typeof value === 'string' ? value : '';
    query.value = nextQuery;
    activeQuery.value = nextQuery;
  }
);

const runSearch = () => {
  const q = query.value.trim();
  activeQuery.value = q;
  router.replace({ path: '/search', query: q ? { q } : {} });
};

const goToChapter = (id: string) => {
  router.push(`/editor/${id}`);
};

const previewText = (text: string) => {
  const cleanText = text.trim();
  if (!cleanText) return '（暂无正文）';
  return cleanText.length > MAX_PREVIEW_LENGTH
    ? `${cleanText.slice(0, MAX_PREVIEW_LENGTH)}...`
    : cleanText;
};
</script>
