<template>
  <Layout>
    <div class="page-space">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-[var(--text)]">整理情节</h1>
          <p class="text-[var(--text-light)] mt-1 text-lg">按过程、章节、梗概与关联章节整理情节</p>
        </div>
        <button class="btn btn-primary" @click="downloadPlotOutlineExcel">
          导出 Excel
        </button>
      </div>

      <div class="card overflow-auto">
        <table class="plot-table">
          <thead>
            <tr>
              <th>目录（大概的过程）</th>
              <th>目录（章节标题）</th>
              <th>梗概</th>
              <th>关联的章节</th>
            </tr>
          </thead>
          <tbody v-if="groupedRows.length > 0">
            <template v-for="group in groupedRows" :key="group.key">
              <tr v-for="(chapter, index) in group.chapters" :key="chapter.id">
                <td v-if="index === 0" :rowspan="group.chapters.length" class="merge-cell">
                  {{ group.process }}
                </td>
                <td>{{ chapter.title }}</td>
                <td>{{ chapter.summary }}</td>
                <td>{{ chapter.related }}</td>
              </tr>
            </template>
          </tbody>
          <tbody v-else>
            <tr>
              <td class="merge-cell">未分卷</td>
              <td>暂无章节</td>
              <td>—</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Layout from '../components/Layout.vue';
import { useStore, buildChapterSynopsis, buildChapterRelationTitleMap } from '../store';

const { novel, downloadPlotOutlineExcel } = useStore();

const groupedRows = computed(() => {
  const sortedVolumes = [...novel.value.volumes].sort((a, b) => a.order - b.order);
  const volumeMap = new Map(sortedVolumes.map(volume => [volume.id, volume.title || '未分卷']));
  const relationMap = buildChapterRelationTitleMap(novel.value);

  const groups: { key: string; process: string; chapters: { id: string; title: string; summary: string; related: string }[] }[] = [];

  sortedVolumes.forEach(volume => {
    const chapterRows = novel.value.chapters
      .filter(chapter => chapter.volumeId === volume.id)
      .sort((a, b) => a.order - b.order)
      .map(chapter => {
        const relatedTitles = [...(relationMap.get(chapter.id) ?? new Set<string>())];
        return {
          id: chapter.id,
          title: chapter.title || '未命名章节',
          summary: buildChapterSynopsis(chapter),
          related: relatedTitles.length > 0 ? relatedTitles.join('、') : '—',
        };
      });
    if (chapterRows.length > 0) {
      groups.push({
        key: volume.id,
        process: volume.title || '未分卷',
        chapters: chapterRows,
      });
    }
  });

  const orphanRows = novel.value.chapters
    .filter(chapter => !volumeMap.has(chapter.volumeId))
    .sort((a, b) => a.order - b.order)
    .map(chapter => {
      const relatedTitles = [...(relationMap.get(chapter.id) ?? new Set<string>())];
      return {
        id: chapter.id,
        title: chapter.title || '未命名章节',
        summary: buildChapterSynopsis(chapter),
        related: relatedTitles.length > 0 ? relatedTitles.join('、') : '—',
      };
    });

  if (orphanRows.length > 0) {
    groups.push({
      key: '__orphan__',
      process: '未分卷',
      chapters: orphanRows,
    });
  }

  return groups;
});
</script>

<style scoped>
.plot-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 980px;
}

.plot-table th,
.plot-table td {
  border: 1px solid var(--border);
  padding: 0.85rem 0.9rem;
  text-align: center;
  vertical-align: middle;
  white-space: pre-wrap;
  line-height: 1.6;
}

.plot-table th {
  background: rgba(16, 185, 129, 0.1);
  font-weight: 700;
}

.merge-cell {
  background: rgba(59, 130, 246, 0.07);
  font-weight: 600;
}
</style>
