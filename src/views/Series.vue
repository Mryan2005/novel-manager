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
          <div class="pad-5 flex items-center justify-between" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(16, 185, 129, 0.04) 100%);">
            <div class="flex items-center gap-4 flex-1">
              <Layers class="w-5 h-5 text-[var(--accent)]" />
              <input
                :value="series.title"
                class="input text-lg font-bold flex-1"
                style="background: transparent; border-color: transparent;"
                placeholder="系列名称"
                @change="updateChapterSeries(series.id, { title: ($event.target as HTMLInputElement).value })"
              />
              <span class="text-sm text-[var(--text-muted)]">{{ series.chapterIds.length }} 章</span>
            </div>
            <button
              @click="removeSeries(series.id)"
              class="pad-2 rounded-lg hover:bg-red-500/10 text-[var(--text-light)] hover:text-[var(--error)] transition-colors"
              title="删除系列"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>

          <div class="pad-5 space-y-2">
            <h3 class="text-sm font-semibold text-[var(--text)]">章节归属</h3>
            <div v-if="chapters.length === 0" class="text-sm text-[var(--text-muted)]">
              还没有章节可分配。
            </div>
            <div v-else class="space-y-2 max-h-72 overflow-y-auto pr-1">
              <div v-for="chapter in chapters" :key="chapter.id" class="flex items-center gap-3 pad-2 rounded-lg hover:bg-[var(--surface-alt)] transition-colors">
                <span class="text-sm text-[var(--text)] flex-1 truncate">{{ chapter.title || '未命名章节' }}</span>
                <select
                  class="input text-sm w-36"
                  :value="seriesByChapter.get(chapter.id) ?? ''"
                  @change="assignChapter(chapter.id, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="">无系列</option>
                  <option v-for="s in chapterSeries" :key="s.id" :value="s.id">
                    {{ s.title || '未命名系列' }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Plus, Trash2, Layers } from 'lucide-vue-next';
import Layout from '../components/Layout.vue';
import { useStore } from '../store';

const {
  chapters, chapterSeries,
  addChapterSeries, updateChapterSeries, deleteChapterSeries
} = useStore();

const newSeriesTitle = ref('');
const seriesError = ref('');

watch(newSeriesTitle, () => { seriesError.value = ''; });

const seriesByChapter = computed(() => {
  const map = new Map<string, string>();
  chapterSeries.value.forEach(series => {
    series.chapterIds.forEach(chapterId => {
      if (!map.has(chapterId)) {
        map.set(chapterId, series.id);
      }
    });
  });
  return map;
});

const createSeries = () => {
  const title = newSeriesTitle.value.trim();
  if (!title) return;
  const exists = chapterSeries.value.some(series => series.title.trim() === title);
  if (exists) {
    seriesError.value = '该系列名称已存在，请更换名称。';
    return;
  }
  seriesError.value = '';
  addChapterSeries(title);
  newSeriesTitle.value = '';
};

const removeSeries = (id: string) => {
  deleteChapterSeries(id);
};

const assignChapter = (chapterId: string, seriesIdValue: string) => {
  chapterSeries.value.forEach(series => {
    const hasChapter = series.chapterIds.includes(chapterId);
    if (series.id === seriesIdValue) {
      if (!hasChapter) {
        updateChapterSeries(series.id, { chapterIds: [...series.chapterIds, chapterId] });
      }
    } else if (hasChapter) {
      updateChapterSeries(series.id, { chapterIds: series.chapterIds.filter(id => id !== chapterId) });
    }
  });
};
</script>
