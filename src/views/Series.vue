<template>
  <Layout>
    <div class="page-space">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-[var(--text)]">系列管理</h1>
          <p class="text-[var(--text-light)] mt-1 text-lg">管理小说的系列分类与章节归属</p>
        </div>
        <div class="flex items-center gap-2">
          <input v-model="newSeriesTitle" class="input text-sm w-48" placeholder="输入系列名称" @keyup.enter="createSeries" />
          <button class="btn btn-primary" @click="createSeries">
            <Plus class="w-4 h-4" />
            添加
          </button>
        </div>
      </div>

      <p v-if="seriesError" class="text-xs text-[var(--error)] mt-2">{{ seriesError }}</p>

      <div v-if="chapterSeries.length === 0" class="card pad-12 text-center empty-state-card">
        <Layers class="w-20 h-20 text-[var(--text-muted)] mx-auto mb-6" />
        <h3 class="text-xl font-semibold text-[var(--text)] mb-3">还没有系列</h3>
        <p class="text-[var(--text-light)] mb-6 max-w-md mx-auto">创建系列以归类章节，用于关系图分组</p>
      </div>

      <div v-else class="space-y-6">
        <div v-for="series in chapterSeries" :key="series.id" class="card overflow-hidden">
          <div
            class="pad-3 flex items-center justify-between cursor-pointer hover:bg-[var(--surface-hover)] transition-colors"
            style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(16, 185, 129, 0.04) 100%);"
            @click="toggleSeries(series.id)"
          >
            <div class="flex items-center gap-4 flex-1">
              <button class="pad-1 rounded-lg hover:bg-[var(--surface-hover)] transition-colors" @click.stop="toggleSeries(series.id)">
                <ChevronRight :class="['w-5 h-5 text-[var(--text-light)] transition-transform', { 'rotate-90': expanded.has(series.id) }]" />
              </button>
              <Layers class="w-5 h-5 text-[var(--accent)]" />
              <input
                :value="series.title"
                class="input text-lg font-bold flex-1"
                style="background: transparent; border-color: transparent;"
                placeholder="系列名称"
                @click.stop
                @change="updateChapterSeries(series.id, { title: ($event.target as HTMLInputElement).value })"
              />
              <span class="text-sm text-[var(--text-muted)]">{{ series.chapterIds.length }} 章</span>
            </div>
            <button
              @click.stop="removeSeries(series.id)"
              class="pad-2 rounded-lg hover:bg-red-500/10 text-[var(--text-light)] hover:text-[var(--error)] transition-colors"
              title="删除系列"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>

          <div v-if="expanded.has(series.id)" class="pad-5 border-t border-[var(--border)] space-y-4">
            <div class="flex gap-2">
              <select v-model="addChapterId[series.id]" class="input text-sm flex-1">
                <option value="">添加章节到系列...</option>
                <option v-for="chapter in unassignedChapters(series.id)" :key="chapter.id" :value="chapter.id">
                  {{ chapter.title || '未命名章节' }}{{ chapter.status === 'discarded' ? ' [废稿]' : '' }}
                </option>
              </select>
              <button class="btn btn-primary text-sm shrink-0" @click="addToSeries(series.id)" :disabled="!addChapterId[series.id]">添加</button>
            </div>

            <div v-if="series.chapterIds.length === 0" class="text-sm text-[var(--text-muted)]">
              此系列暂无章节
            </div>
            <div v-else class="space-y-1">
              <div v-for="chapterId in series.chapterIds" :key="chapterId" class="flex items-center justify-between pad-3 rounded-lg hover:bg-[var(--surface-alt)] transition-colors">
                <span
                  class="text-sm cursor-pointer hover:text-[var(--primary)] transition-colors"
                  :class="getChapter(chapterId)?.status === 'discarded' ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text)]'"
                  @click="goToEditor(chapterId)"
                >{{ chapterTitle(chapterId) }}</span>
                <button
                  @click="removeFromSeries(series.id, chapterId)"
                  class="pad-1 rounded hover:bg-red-500/10 text-[var(--text-muted)] hover:text-[var(--error)] transition-colors"
                  title="从系列中移除"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, Trash2, Layers, ChevronRight, X } from 'lucide-vue-next';
import Layout from '../components/Layout.vue';
import { useStore } from '../store';

const router = useRouter();

const {
  chapters, chapterSeries,
  addChapterSeries, updateChapterSeries, deleteChapterSeries
} = useStore();

const newSeriesTitle = ref('');
const seriesError = ref('');
const expanded = reactive(new Set<string>());
const addChapterId = reactive<Record<string, string>>({});

watch(newSeriesTitle, () => { seriesError.value = ''; });

const unassignedChapters = (seriesId: string) => {
  const series = chapterSeries.value.find(s => s.id === seriesId);
  const ids = new Set(series?.chapterIds ?? []);
  return chapters.value.filter(c => !ids.has(c.id)).sort((a, b) => a.order - b.order);
};

const getChapter = (id: string) => chapters.value.find(c => c.id === id);
const chapterTitle = (id: string) => getChapter(id)?.title || '未知章节';

const toggleSeries = (id: string) => {
  if (expanded.has(id)) {
    expanded.delete(id);
  } else {
    expanded.add(id);
  }
};

const createSeries = () => {
  const title = newSeriesTitle.value.trim();
  if (!title) return;
  const exists = chapterSeries.value.some(series => series.title.trim() === title);
  if (exists) {
    seriesError.value = '该系列名称已存在，请更换名称。';
    return;
  }
  seriesError.value = '';
  const created = addChapterSeries(title);
  newSeriesTitle.value = '';
  expanded.add(created.id);
};

const removeSeries = (id: string) => {
  deleteChapterSeries(id);
};

const addToSeries = (seriesId: string) => {
  const chapterId = addChapterId[seriesId];
  if (!chapterId) return;
  const series = chapterSeries.value.find(s => s.id === seriesId);
  if (series && !series.chapterIds.includes(chapterId)) {
    updateChapterSeries(seriesId, { chapterIds: [...series.chapterIds, chapterId] });
  }
  addChapterId[seriesId] = '';
};

const removeFromSeries = (seriesId: string, chapterId: string) => {
  const series = chapterSeries.value.find(s => s.id === seriesId);
  if (series) {
    updateChapterSeries(seriesId, { chapterIds: series.chapterIds.filter(id => id !== chapterId) });
  }
};

const goToEditor = (chapterId: string) => {
  router.push(`/editor/${chapterId}`);
};
</script>
