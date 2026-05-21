<template>
  <Layout>
    <div class="page-space">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-[var(--text)]">关系图</h1>
          <p class="text-[var(--text-light)] mt-1 text-lg">查看章节关系与系列归属</p>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn btn-secondary" @click="zoomOut" :disabled="scale <= MIN_SCALE">缩小</button>
          <span class="text-sm font-semibold text-[var(--text-light)] w-14 text-center">{{ Math.round(scale * 100) }}%</span>
          <button class="btn btn-secondary" @click="zoomIn" :disabled="scale >= MAX_SCALE">放大</button>
          <button class="btn btn-primary" @click="resetViewport">重置视图</button>
          <button class="btn btn-secondary" @click="showFullscreen = true" title="全屏查看">
            <Maximize2 class="w-4 h-4" />
          </button>
        </div>
      </div>

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

      <Teleport to="body">
        <div v-if="showFullscreen" class="fixed inset-0 z-50 flex flex-col" style="background: rgba(0,0,0,0.3); backdrop-filter: blur(4px);">
          <div class="flex items-center justify-between pad-4 bg-[var(--surface)] border-b border-[var(--border)]">
            <h2 class="text-lg font-semibold text-[var(--text)]">关系图 · 全屏</h2>
            <div class="flex items-center gap-2">
              <button class="btn btn-secondary" @click="zoomOut" :disabled="scale <= MIN_SCALE">缩小</button>
              <span class="text-sm font-semibold text-[var(--text-light)] w-14 text-center">{{ Math.round(scale * 100) }}%</span>
              <button class="btn btn-secondary" @click="zoomIn" :disabled="scale >= MAX_SCALE">放大</button>
              <button class="btn btn-primary" @click="resetViewport">重置视图</button>
              <button class="btn btn-secondary" @click="showFullscreen = false">
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>
          <div
            class="flex-1 m-4 rounded-xl overflow-hidden bg-[var(--surface-alt)] border border-dashed border-[var(--border)]"
            :class="isPanning ? 'is-panning' : ''"
            style="cursor: grab;"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointerleave="onPointerUp"
            @wheel.prevent="onWheel"
          >
            <div class="mermaid-canvas" :style="canvasStyle" style="min-height: calc(100vh - 8rem);">
              <div v-if="chapters.length === 0" class="empty-state" style="min-height: calc(100vh - 8rem);">
                还没有章节，先创建章节再绘制关系图。
              </div>
              <div v-else ref="fullscreenMermaidRef" class="mermaid-render"></div>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import mermaid from 'mermaid';
import { X, Maximize2 } from 'lucide-vue-next';
import Layout from '../components/Layout.vue';
import { useStore } from '../store';

const { chapters, chapterSeries, chapterRelations } = useStore();

const mermaidInitialized = ref(false);
const mermaidRenderIndex = ref(0);

const MIN_SCALE = 0.4;
const MAX_SCALE = 2;

const scale = ref(1);
const offset = ref({ x: 0, y: 0 });
const isPanning = ref(false);
const panStart = ref({ x: 0, y: 0 });
const panOffset = ref({ x: 0, y: 0 });

const viewportRef = ref<HTMLDivElement | null>(null);
const mermaidRef = ref<HTMLDivElement | null>(null);
const fullscreenMermaidRef = ref<HTMLDivElement | null>(null);
const mermaidError = ref('');
const showFullscreen = ref(false);

const canvasStyle = computed(() => ({
  transform: `translate(${offset.value.x}px, ${offset.value.y}px) scale(${scale.value})`,
}));

const sanitizeId = (value: string) => value.replace(/[^a-zA-Z0-9_]/g, '_');

const escapeLabel = (value: string) => value
  .replace(/[\[\]<>]/g, '')
  .replace(/[(){}]/g, '')
  .replace(/["']/g, '')
  .replace(/\|/g, '/')
  .replace(/\n/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

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
      `  style ${subgraphId} fill:#10b98114,stroke:#10b9814d,stroke-width:1px,rx:12,ry:12`,
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

const renderMermaid = async (target?: HTMLDivElement) => {
  const el = target || mermaidRef.value;
  if (!el || chapters.value.length === 0) return;
  try {
    if (!target) mermaidError.value = '';
    const id = `mermaid-${mermaidRenderIndex.value++}`;
    const { svg } = await mermaid.render(id, mermaidCode.value);
    el.innerHTML = svg;
  } catch (error) {
    if (!target) {
      mermaidError.value = '关系图渲染失败，请检查数据后重试。';
    }
    console.error(error);
  }
};

watch(mermaidCode, async () => {
  await nextTick();
  renderMermaid();
  if (showFullscreen.value) {
    await nextTick();
    renderMermaid(fullscreenMermaidRef.value || undefined);
  }
});

watch(showFullscreen, async (val) => {
  if (val) {
    await nextTick();
    renderMermaid(fullscreenMermaidRef.value || undefined);
  }
});

const handleEsc = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && showFullscreen.value) {
    showFullscreen.value = false;
  }
};

onMounted(() => {
  if (!mermaidInitialized.value) {
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', flowchart: { rankDir: 'LR' } });
    mermaidInitialized.value = true;
  }
  renderMermaid();
  document.addEventListener('keydown', handleEsc);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEsc);
});

const zoomIn = () => {
  scale.value = Math.min(MAX_SCALE, scale.value + 0.1);
};

const zoomOut = () => {
  scale.value = Math.max(MIN_SCALE, scale.value - 0.1);
};

const resetViewport = () => {
  scale.value = 1;
  offset.value = { x: 0, y: 0 };
};

const onWheel = (event: WheelEvent) => {
  const direction = event.deltaY > 0 ? -1 : 1;
  const next = scale.value + direction * 0.1;
  scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
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

</style>
