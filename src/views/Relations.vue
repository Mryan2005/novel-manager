<template>
  <Layout>
    <div class="page-space">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-[var(--text)]">章节关系</h1>
          <p class="text-[var(--text-light)] mt-1 text-lg">用关系图整理章节脉络与系列归属</p>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn btn-secondary" @click="zoomOut" :disabled="scale <= MIN_SCALE">缩小</button>
          <span class="text-sm font-semibold text-[var(--text-light)] w-14 text-center">{{ Math.round(scale * 100) }}%</span>
          <button class="btn btn-secondary" @click="zoomIn" :disabled="scale >= MAX_SCALE">放大</button>
          <button class="btn btn-primary" @click="resetViewport">重置视图</button>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_24rem] gap-6">
        <div class="card pad-5 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-[var(--text)]">关系图</h2>
            <span class="text-xs text-[var(--text-muted)]">滚轮缩放 · 拖拽移动</span>
          </div>
          <div
            ref="viewportRef"
            class="mermaid-viewport"
            :class="isPanning ? 'is-panning' : ''"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointerleave="onPointerUp"
            @wheel.prevent="onWheel"
          >
            <div class="mermaid-canvas" :style="canvasStyle">
              <div v-if="chapters.length === 0" class="empty-state">
                还没有章节，先创建章节再绘制关系图。
              </div>
              <div v-else ref="mermaidRef" class="mermaid-render"></div>
            </div>
          </div>
          <p v-if="mermaidError" class="text-xs text-[var(--error)]">{{ mermaidError }}</p>
        </div>

        <div class="space-y-4">
          <div class="card pad-5 space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-[var(--text)]">系列管理</h2>
              <span class="text-xs text-[var(--text-muted)]">{{ chapterSeries.length }} 个系列</span>
            </div>

            <div class="flex gap-2">
              <input v-model="newSeriesTitle" class="input text-sm" placeholder="输入系列名称" />
              <button class="btn btn-primary shrink-0" @click="createSeries">添加</button>
            </div>
            <p v-if="seriesError" class="text-xs text-[var(--error)]">{{ seriesError }}</p>

            <div v-if="chapterSeries.length === 0" class="text-sm text-[var(--text-muted)]">
              暂无系列，先创建系列以归类章节。
            </div>

            <div v-else class="space-y-3">
              <div v-for="series in chapterSeries" :key="series.id" class="series-row">
                <input
                  :value="series.title"
                  class="input text-sm flex-1"
                  placeholder="系列名称"
                  @change="updateChapterSeries(series.id, { title: ($event.target as HTMLInputElement).value })"
                />
                <button class="btn btn-secondary text-sm shrink-0" @click="removeSeries(series.id)">删除</button>
              </div>
            </div>

            <div class="border-t border-[var(--border)] pt-4 space-y-2">
              <h3 class="text-sm font-semibold text-[var(--text)]">章节归属</h3>
              <div v-if="chapters.length === 0" class="text-sm text-[var(--text-muted)]">
                还没有章节可分配。
              </div>
              <div v-else class="space-y-2 max-h-56 overflow-y-auto pr-1">
                <div v-for="chapter in chapters" :key="chapter.id" class="chapter-row">
                  <span class="text-sm text-[var(--text)] truncate">{{ chapter.title || '未命名章节' }}</span>
                  <select
                    class="input text-sm w-36"
                    :value="seriesByChapter.get(chapter.id) ?? ''"
                    @change="assignChapterSeries(chapter.id, ($event.target as HTMLSelectElement).value)"
                  >
                    <option value="">无系列</option>
                    <option v-for="series in chapterSeries" :key="series.id" :value="series.id">
                      {{ series.title || '未命名系列' }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="card pad-5 space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-[var(--text)]">章节关系</h2>
              <span class="text-xs text-[var(--text-muted)]">{{ chapterRelations.length }} 条关系</span>
            </div>

            <div class="space-y-2">
              <select v-model="relationForm.fromChapterId" class="input text-sm">
                <option value="">选择起点章节</option>
                <option v-for="chapter in chapters" :key="chapter.id" :value="chapter.id">
                  {{ chapter.title || '未命名章节' }}
                </option>
              </select>
              <select v-model="relationForm.toChapterId" class="input text-sm">
                <option value="">选择终点章节</option>
                <option v-for="chapter in chapters" :key="chapter.id" :value="chapter.id">
                  {{ chapter.title || '未命名章节' }}
                </option>
              </select>
              <input v-model="relationForm.label" class="input text-sm" placeholder="关系说明（可选）" />
              <button class="btn btn-primary w-full" @click="createRelation">添加关系</button>
            </div>

            <div v-if="chapterRelations.length === 0" class="text-sm text-[var(--text-muted)]">
              暂无关系，添加后将显示在关系图中。
            </div>

            <div v-else class="space-y-2 max-h-60 overflow-y-auto pr-1">
              <div v-for="relation in chapterRelations" :key="relation.id" class="relation-row">
                <div class="text-sm text-[var(--text)]">
                  {{ chapterName(relation.fromChapterId) }}
                  <span class="text-[var(--text-muted)]">→</span>
                  {{ chapterName(relation.toChapterId) }}
                  <span v-if="relation.label" class="text-xs text-[var(--text-muted)] ml-1">({{ relation.label }})</span>
                </div>
                <button class="btn btn-secondary text-xs shrink-0" @click="removeRelation(relation.id)">删除</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import mermaid from 'mermaid';
import Layout from '../components/Layout.vue';
import { useStore } from '../store';

const { chapters, chapterSeries, chapterRelations, addChapterSeries, updateChapterSeries, deleteChapterSeries, addChapterRelation, deleteChapterRelation } = useStore();

const MIN_SCALE = 0.4;
const MAX_SCALE = 2;

const scale = ref(1);
const offset = ref({ x: 0, y: 0 });
const isPanning = ref(false);
const panStart = ref({ x: 0, y: 0 });
const panOffset = ref({ x: 0, y: 0 });

const viewportRef = ref<HTMLDivElement | null>(null);
const mermaidRef = ref<HTMLDivElement | null>(null);
const mermaidError = ref('');

const newSeriesTitle = ref('');
const seriesError = ref('');
const relationForm = ref({ fromChapterId: '', toChapterId: '', label: '' });

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

watch(newSeriesTitle, () => {
  seriesError.value = '';
});

const canvasStyle = computed(() => ({
  transform: `translate(${offset.value.x}px, ${offset.value.y}px) scale(${scale.value})`,
}));

const sanitizeId = (value: string) => value.replace(/[^a-zA-Z0-9_]/g, '_');

const escapeLabel = (value: string) => value
  .replace(/"/g, '\'')
  .replace(/\|/g, '/')
  .replace(/\n/g, ' ');

const nodeId = (id: string) => `ch_${sanitizeId(id)}`;
const seriesId = (id: string) => `series_${sanitizeId(id)}`;

const mermaidCode = computed(() => {
  const nodes = chapters.value.map(chapter => {
    const label = escapeLabel(chapter.title || '未命名章节');
    return `  ${nodeId(chapter.id)}["${label}"]`;
  });

  const assigned = new Set<string>();
  const seriesBlocks = chapterSeries.value.map(series => {
    const chapterIds = series.chapterIds.filter(id => chapters.value.some(c => c.id === id) && !assigned.has(id));
    chapterIds.forEach(id => assigned.add(id));
    if (chapterIds.length === 0) return '';
    const label = escapeLabel(series.title || '未命名系列');
    const subgraphId = seriesId(series.id);
    return [
      `  subgraph ${subgraphId}["${label}"]`,
      '    direction LR',
      ...chapterIds.map(id => `    ${nodeId(id)}`),
      '  end',
      `  style ${subgraphId} fill:rgba(16,185,129,0.08),stroke:rgba(16,185,129,0.3),stroke-width:1px,rx:12,ry:12`,
    ].join('\n');
  }).filter(Boolean);

  const relations = chapterRelations.value
    .filter(rel => chapters.value.some(c => c.id === rel.fromChapterId) && chapters.value.some(c => c.id === rel.toChapterId))
    .map(rel => {
      const label = rel.label ? `|${escapeLabel(rel.label)}|` : '';
      return `  ${nodeId(rel.fromChapterId)} -->${label} ${nodeId(rel.toChapterId)}`;
    });

  return [
    'flowchart LR',
    ...nodes,
    ...seriesBlocks,
    ...relations,
  ].join('\n');
});

const renderMermaid = async () => {
  if (!mermaidRef.value || chapters.value.length === 0) return;
  try {
    mermaidError.value = '';
    const id = `mermaid-${Date.now()}`;
    const { svg } = await mermaid.render(id, mermaidCode.value);
    mermaidRef.value.innerHTML = svg;
  } catch (error) {
    mermaidError.value = '关系图渲染失败，请检查数据后重试。';
    console.error(error);
  }
};

watch(mermaidCode, async () => {
  await nextTick();
  renderMermaid();
});

onMounted(() => {
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
  renderMermaid();
});

const zoomIn = () => {
  scale.value = Math.min(MAX_SCALE, Number((scale.value + 0.1).toFixed(2)));
};

const zoomOut = () => {
  scale.value = Math.max(MIN_SCALE, Number((scale.value - 0.1).toFixed(2)));
};

const resetViewport = () => {
  scale.value = 1;
  offset.value = { x: 0, y: 0 };
};

const onWheel = (event: WheelEvent) => {
  const direction = event.deltaY > 0 ? -1 : 1;
  const next = scale.value + direction * 0.1;
  scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(next.toFixed(2))));
};

const onPointerDown = (event: PointerEvent) => {
  if (event.button !== 0) return;
  isPanning.value = true;
  panStart.value = { x: event.clientX, y: event.clientY };
  panOffset.value = { x: offset.value.x, y: offset.value.y };
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
};

const onPointerMove = (event: PointerEvent) => {
  if (!isPanning.value) return;
  const dx = event.clientX - panStart.value.x;
  const dy = event.clientY - panStart.value.y;
  offset.value = { x: panOffset.value.x + dx, y: panOffset.value.y + dy };
};

const onPointerUp = (event: PointerEvent) => {
  if (!isPanning.value) return;
  isPanning.value = false;
  (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
};

const createSeries = () => {
  const title = newSeriesTitle.value.trim();
  if (!title) return;
  const exists = chapterSeries.value.some(series => series.title.trim().toLowerCase() === title.toLowerCase());
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

const assignChapterSeries = (chapterId: string, seriesIdValue: string) => {
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

const createRelation = () => {
  const { fromChapterId, toChapterId, label } = relationForm.value;
  if (!fromChapterId || !toChapterId || fromChapterId === toChapterId) return;
  const exists = chapterRelations.value.some(rel =>
    rel.fromChapterId === fromChapterId && rel.toChapterId === toChapterId
  );
  if (exists) return;
  addChapterRelation({ fromChapterId, toChapterId, label: label.trim() || undefined });
  relationForm.value = { fromChapterId: '', toChapterId: '', label: '' };
};

const removeRelation = (id: string) => {
  deleteChapterRelation(id);
};

const chapterName = (id: string) => chapters.value.find(chapter => chapter.id === id)?.title || '未知章节';
</script>

<style scoped>
.mermaid-viewport {
  min-height: 520px;
  background: var(--surface-alt);
  border-radius: var(--radius-lg);
  border: 1px dashed var(--border);
  overflow: hidden;
  position: relative;
  user-select: none;
}

.mermaid-viewport.is-panning {
  cursor: grabbing;
}

.mermaid-viewport:not(.is-panning) {
  cursor: grab;
}

.mermaid-canvas {
  min-height: 520px;
  transform-origin: 0 0;
}

.mermaid-render :deep(svg) {
  max-width: none;
  height: auto;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 520px;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.series-row,
.chapter-row,
.relation-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.chapter-row span {
  flex: 1;
}

.relation-row {
  justify-content: space-between;
}
</style>
