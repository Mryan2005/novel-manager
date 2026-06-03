<template>
  <Layout>
    <div class="page-space">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-[var(--text)]">关系图</h1>
          <p class="text-[var(--text-light)] mt-1 text-lg">{{ activeTab === 'chapter' ? '查看章节关系与系列归属' : '查看人物之间的关系' }}</p>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex rounded-lg border border-[var(--border)] overflow-hidden mr-2">
            <button class="px-3 py-1.5 text-sm font-medium transition-colors" :class="activeTab === 'chapter' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-light)] hover:bg-[var(--surface-alt)]'" @click="activeTab = 'chapter'">章节关系</button>
            <button class="px-3 py-1.5 text-sm font-medium transition-colors" :class="activeTab === 'character' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-light)] hover:bg-[var(--surface-alt)]'" @click="activeTab = 'character'">人物关系</button>
          </div>
          <button class="btn btn-secondary" @click="zoomOut" :disabled="scale <= MIN_SCALE">缩小</button>
          <span class="text-sm font-semibold text-[var(--text-light)] w-14 text-center">{{ Math.round(scale * 100) }}%</span>
          <button class="btn btn-secondary" @click="zoomIn" :disabled="scale >= MAX_SCALE">放大</button>
          <button class="btn btn-primary" @click="resetViewport">重置视图</button>
          <button class="btn btn-secondary" @click="showFullscreen = true" title="全屏查看">
            <Maximize2 class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Chapter Relations -->
      <template v-if="activeTab === 'chapter'">
      <div class="card pad-5 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-[var(--text)]">章节关系图</h2>
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
          @selectstart.prevent
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
      </template>

      <!-- Character Relations -->
      <template v-if="activeTab === 'character'">
      <div class="card pad-5 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-[var(--text)]">人物关系图</h2>
          <span class="text-xs text-[var(--text-muted)]">滚轮缩放 · 拖拽移动</span>
        </div>
        <div
          class="mermaid-viewport"
          :class="isPanning ? 'is-panning' : ''"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointerleave="onPointerUp"
          @wheel.prevent="onWheel"
          @selectstart.prevent
        >
          <div class="mermaid-canvas" :style="canvasStyle">
            <div v-if="characters.length === 0" class="empty-state">
              还没有角色，先创建角色再绘制关系图。
            </div>
            <div v-else ref="charMermaidRef" class="mermaid-render"></div>
          </div>
        </div>
        <p v-if="charMermaidError" class="text-xs text-[var(--error)]">{{ charMermaidError }}</p>

        <!-- Add Character Relation -->
        <div class="border-t border-[var(--border)] pt-4 mt-4">
          <h3 class="text-sm font-semibold text-[var(--text)] mb-3">管理人物关系</h3>
          <div class="flex flex-wrap items-end gap-2">
            <div class="flex-1 min-w-[120px]">
              <label class="block text-xs text-[var(--text-muted)] mb-1">角色A</label>
              <select v-model="newCharRel.from" class="input text-sm">
                <option value="">选择角色</option>
                <option v-for="c in characters" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div class="w-20">
              <label class="block text-xs text-[var(--text-muted)] mb-1">关系</label>
              <input v-model="newCharRel.label" class="input text-sm" placeholder="如：师徒" />
            </div>
            <div class="flex-1 min-w-[120px]">
              <label class="block text-xs text-[var(--text-muted)] mb-1">角色B</label>
              <select v-model="newCharRel.to" class="input text-sm">
                <option value="">选择角色</option>
                <option v-for="c in characters" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <button class="btn btn-primary !py-1.5 text-sm" @click="addCharRelation">添加关系</button>
          </div>
          <!-- Existing relations list -->
          <div v-if="characterRelations.length > 0" class="mt-3 space-y-1.5">
            <div v-for="rel in characterRelations" :key="rel.id" class="flex items-center gap-2 text-sm pad-2 rounded-lg bg-[var(--surface-alt)]">
              <span class="font-medium text-[var(--text)]">{{ getCharName(rel.fromCharacterId) }}</span>
              <span class="text-[var(--text-muted)]">—{{ rel.label || '关联' }}→</span>
              <span class="font-medium text-[var(--text)]">{{ getCharName(rel.toCharacterId) }}</span>
              <button class="ml-auto pad-1 rounded text-[var(--text-muted)] hover:text-red-500" @click="removeCharRelation(rel.id)">
                <X class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
      </template>

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
            @selectstart.prevent
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

const { chapters, chapterSeries, chapterRelations, characters, characterRelations, addCharacterRelation, deleteCharacterRelation } = useStore();

const mermaidInitialized = ref(false);
const mermaidRenderIndex = ref(0);

const MIN_SCALE = 0.4;
const MAX_SCALE = 2;

const scale = ref(1);
const offset = ref({ x: 0, y: 0 });
const isPanning = ref(false);
const panStart = ref({ x: 0, y: 0 });
const panOffset = ref({ x: 0, y: 0 });

const activeTab = ref<'chapter' | 'character'>('chapter');
const viewportRef = ref<HTMLDivElement | null>(null);
const mermaidRef = ref<HTMLDivElement | null>(null);
const fullscreenMermaidRef = ref<HTMLDivElement | null>(null);
const charMermaidRef = ref<HTMLDivElement | null>(null);
const mermaidError = ref('');
const charMermaidError = ref('');
const showFullscreen = ref(false);
const newCharRel = ref({ from: '', to: '', label: '' });

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
      return `  ${nodeId(rel.fromChapterId)} ---${label} ${nodeId(rel.toChapterId)}`;
    });

  return [
    'flowchart LR',
    ...nodes,
    ...seriesBlocks,
    ...relations,
  ].join('\n');
});

const charNodeId = (id: string) => `char_${sanitizeId(id)}`;

const charMermaidCode = computed(() => {
  const nodes = characters.value.map(c => {
    const label = escapeLabel(c.name || '未命名角色');
    return `  ${charNodeId(c.id)}["${label}"]`;
  });

  const relations = characterRelations.value
    .filter(rel => characters.value.some(c => c.id === rel.fromCharacterId) && characters.value.some(c => c.id === rel.toCharacterId))
    .map(rel => {
      const label = rel.label ? `|${escapeLabel(rel.label)}|` : '';
      return `  ${charNodeId(rel.fromCharacterId)} ---${label} ${charNodeId(rel.toCharacterId)}`;
    });

  return [
    'flowchart LR',
    ...nodes,
    ...relations,
  ].join('\n');
});

const getCharName = (id: string) => characters.value.find(c => c.id === id)?.name || '未知';

const addCharRelation = () => {
  if (!newCharRel.value.from || !newCharRel.value.to) return;
  addCharacterRelation({
    fromCharacterId: newCharRel.value.from,
    toCharacterId: newCharRel.value.to,
    label: newCharRel.value.label.trim() || undefined,
  });
  newCharRel.value = { from: '', to: '', label: '' };
};

const removeCharRelation = (id: string) => {
  deleteCharacterRelation(id);
};

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

const renderCharMermaid = async (target?: HTMLDivElement) => {
  const el = target || charMermaidRef.value;
  if (!el || characters.value.length === 0) return;
  try {
    if (!target) charMermaidError.value = '';
    const id = `char-mermaid-${mermaidRenderIndex.value++}`;
    const { svg } = await mermaid.render(id, charMermaidCode.value);
    el.innerHTML = svg;
  } catch (error) {
    if (!target) {
      charMermaidError.value = '关系图渲染失败，请检查数据后重试。';
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

watch(charMermaidCode, async () => {
  await nextTick();
  renderCharMermaid();
});

watch(activeTab, async (tab) => {
  if (tab === 'character') {
    await nextTick();
    renderCharMermaid();
  }
});

watch(showFullscreen, async (val) => {
  if (val) {
    await nextTick();
    if (activeTab.value === 'chapter') {
      renderMermaid(fullscreenMermaidRef.value || undefined);
    }
  }
});

const handleEsc = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && showFullscreen.value) {
    showFullscreen.value = false;
  }
};

onMounted(() => {
  if (!mermaidInitialized.value) {
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
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
