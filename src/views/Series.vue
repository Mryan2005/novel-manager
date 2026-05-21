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

        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Plus, Trash2, Layers } from 'lucide-vue-next';
import Layout from '../components/Layout.vue';
import { useStore } from '../store';

const {
  chapterSeries,
  addChapterSeries, updateChapterSeries, deleteChapterSeries
} = useStore();

const newSeriesTitle = ref('');
const seriesError = ref('');

watch(newSeriesTitle, () => { seriesError.value = ''; });

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

</script>
