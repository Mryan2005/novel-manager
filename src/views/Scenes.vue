<template>
  <Layout>
    <div class="page-space">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-[var(--text)]">地点设定</h1>
          <p class="text-[var(--text-light)] mt-1 text-lg">管理你的小说地点</p>
        </div>
        <button @click="showAddModal = true" class="btn btn-primary">
          <Plus class="w-4 h-4" />
          新建地点
        </button>
        <button @click="showGraph = true" class="btn btn-secondary">
          <Share2 class="w-4 h-4" />
          关系图
        </button>
      </div>

      <div class="relative search-field-wrap">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          v-model="searchQuery"
          type="text"
          class="input input-with-left-icon"
          placeholder="搜索地点名称、描述..."
        />
      </div>

      <div v-if="filteredScenes.length === 0 && scenes.length > 0" class="card pad-12 text-center empty-state-card">
        <Search class="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
        <p class="text-[var(--text-light)]">没有匹配的地点</p>
      </div>

      <div v-else-if="scenes.length === 0" class="card pad-12 text-center empty-state-card">
        <MapIcon class="w-20 h-20 text-[var(--text-muted)] mx-auto mb-6" />
        <h3 class="text-xl font-semibold text-[var(--text)] mb-3">还没有地点</h3>
        <p class="text-[var(--text-light)] mb-6 max-w-md mx-auto">点击上方按钮创建你的第一个地点，让故事发生在特定的地方</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div
          v-for="scene in pagedScenes"
          :key="scene.id"
          :id="`scene-${scene.id}`"
          class="card pad-8 cursor-pointer hover:shadow-md transition-shadow"
          :class="focusedId === scene.id ? 'ring-2 ring-[var(--primary)]/35' : ''"
          @click="viewScene(scene)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-[var(--text)] text-lg">{{ scene.name }}</h3>
              <p class="text-sm text-[var(--text-light)] flex items-center gap-1.5 mt-2">
                <MapPin class="w-4 h-4" />
                {{ scene.location || '未设置地点' }}
                <span v-if="scene.belongsTo" class="text-xs text-[var(--text-muted)] ml-1">· 隶属 {{ scene.belongsTo }}</span>
              </p>
            </div>
            <div class="flex items-center gap-1 shrink-0" @click.stop>
              <button
                @click="editScene(scene)"
                class="pad-2-5 rounded-xl hover:bg-[var(--surface-hover)] text-[var(--text-light)] hover:text-[var(--text)] transition-all"
                title="编辑"
              >
                <Edit class="w-5 h-5" />
              </button>
              <button
                @click="confirmDelete(scene)"
                class="pad-2-5 rounded-xl hover:bg-red-500/10 text-[var(--text-light)] hover:text-[var(--error)] transition-all"
                title="删除"
              >
                <Trash2 class="w-5 h-5" />
              </button>
            </div>
          </div>
          <div v-if="scene.atmosphere.length > 0" class="flex flex-wrap gap-2 mt-4">
            <span
              v-for="atm in scene.atmosphere.slice(0, 3)"
              :key="atm"
              class="px-2.5 py-1 rounded-lg text-xs"
              style="background: rgba(6, 182, 212, 0.1); color: var(--accent);"
            >
              {{ atm }}
            </span>
            <span v-if="scene.atmosphere.length > 3" class="text-xs text-[var(--text-muted)] self-center">
              +{{ scene.atmosphere.length - 3 }}
            </span>
          </div>
        </div>
      </div>
    </div>

      <div v-if="totalPages > 1" class="flex items-center justify-center gap-3 mt-8">
        <button @click="changePage(currentPage - 1)" :disabled="currentPage <= 1" class="btn btn-secondary text-sm">上一页</button>
        <span class="text-sm font-medium text-[var(--text)]">{{ currentPage }} / {{ totalPages }}</span>
        <button @click="changePage(currentPage + 1)" :disabled="currentPage >= totalPages" class="btn btn-secondary text-sm">下一页</button>
    </div>

    <!-- 添加/编辑模态框 -->
    <Teleport to="body">
      <div v-if="showAddModal || showEditModal" class="fixed inset-0 flex items-center justify-center z-50 pad-4" style="background: rgba(0,0,0,0.3); backdrop-filter: blur(4px);" @click.self="closeModal">
      <div class="card w-full pad-8 overflow-y-auto" style="width: min(90vw, 560px); max-height: 90vh;">
        <h2 class="text-2xl font-bold text-[var(--text)] mb-6">
          {{ showEditModal ? '编辑地点' : '新建地点' }}
        </h2>
        <div class="space-y-5">
          <div>
            <label class="block text-sm font-semibold text-[var(--text)] mb-2">地点名称</label>
            <input
              v-model="form.name"
              type="text"
              class="input"
              placeholder="输入地点名称"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-[var(--text)] mb-2">地点</label>
            <input
              v-model="form.location"
              type="text"
              class="input"
              placeholder="如：皇宫大殿、森林深处"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-[var(--text)] mb-2">归属哪里？</label>
            <select v-model="form.belongsTo" class="input">
              <option value="">无</option>
              <option v-for="s in otherScenes" :key="s.id" :value="s.name">
                {{ s.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold text-[var(--text)] mb-2">氛围标签（用逗号分隔）</label>
            <input
              v-model="atmosphereInput"
              type="text"
              class="input"
              placeholder="如：神秘,紧张,温馨"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-[var(--text)] mb-2">地点描述</label>
            <textarea
              v-model="form.description"
              class="input min-h-[140px]"
              placeholder="描述这个地点的环境、氛围等"
            ></textarea>
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-7">
          <button @click="closeModal" class="btn btn-secondary">取消</button>
          <button @click="saveScene" class="btn btn-primary">保存</button>
        </div>
      </div>
      </div>
    </Teleport>

    <!-- 删除确认 -->
    <Teleport to="body">
      <div v-if="showDeleteModal" class="fixed inset-0 flex items-center justify-center z-50 pad-4" style="background: rgba(0,0,0,0.3); backdrop-filter: blur(4px);" @click.self="showDeleteModal = false">
      <div class="card w-full max-w-sm pad-8">
        <div class="text-center">
          <div class="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-5">
            <Trash2 class="w-8 h-8 text-[var(--error)]" />
          </div>
          <h3 class="text-xl font-bold text-[var(--text)] mb-3">确认删除</h3>
          <p class="text-[var(--text-light)] mb-7">
            确定要删除场景「{{ sceneToDelete?.name }}」吗？此操作无法撤销。
          </p>
          <div class="flex justify-center gap-3">
            <button @click="showDeleteModal = false" class="btn btn-secondary">取消</button>
            <button @click="deleteScene" class="btn" style="background: var(--error); color: white;">删除</button>
          </div>
        </div>
      </div>
      </div>
    </Teleport>

    <!-- 场景详情弹窗 -->
    <Teleport to="body">
      <div v-if="showDetailModal && detailScene" class="fixed inset-0 z-50" style="background: rgba(0,0,0,0.3); backdrop-filter: blur(4px);" @click.self="closeDetailModal">
        <div class="detail-window">
          <div class="detail-header">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-xs text-[var(--text-muted)]">场景信息</span>
            </div>
            <button class="detail-close-btn" @click="closeDetailModal">
              <X class="w-4 h-4" />
            </button>
          </div>
          <div class="detail-body">
            <h3 class="text-xl font-bold text-[var(--text)] mb-4">{{ detailScene.name }}</h3>
            <div class="text-sm text-[var(--text-light)] whitespace-pre-wrap leading-relaxed space-y-1">
              <p v-if="detailScene.location">地点：{{ detailScene.location }}</p>
              <p v-if="detailScene.belongsTo">归属：{{ detailScene.belongsTo }}</p>
              <p v-if="detailScene.atmosphere.length > 0">氛围：{{ detailScene.atmosphere.join('、') }}</p>
              <p v-if="detailScene.description" class="!mt-3">{{ detailScene.description }}</p>
            </div>
          </div>
          <div class="detail-footer">
            <button @click="editFromDetail" class="btn btn-secondary">
              <Edit class="w-4 h-4" />
              编辑
            </button>
            <button @click="deleteFromDetail" class="btn" style="background: var(--error); color: white;">
              <Trash2 class="w-4 h-4" />
              删除
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showGraph" class="fixed inset-0 z-50 flex flex-col" style="background: rgba(0,0,0,0.85);" @click.self="showGraph = false">
        <div class="flex items-center justify-between pad-4 bg-[var(--surface)] border-b border-[var(--border)]">
          <h2 class="text-lg font-semibold text-[var(--text)]">地点关系图</h2>
          <div class="flex items-center gap-2">
            <button class="btn btn-secondary" @click="zoomOut" :disabled="gScale <= 0.4">缩小</button>
            <span class="text-sm font-semibold text-[var(--text-light)] w-14 text-center">{{ Math.round(gScale * 100) }}%</span>
            <button class="btn btn-secondary" @click="zoomIn" :disabled="gScale >= 2">放大</button>
            <button class="btn btn-primary" @click="resetView">重置视图</button>
            <button class="btn btn-secondary" @click="showGraph = false">
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>
        <div
          class="flex-1 m-4 overflow-hidden bg-[var(--surface-alt)] border border-dashed border-[var(--border)] relative"
          :class="gPanning ? 'is-panning' : ''"
          style="cursor: grab;"
          @pointerdown="onGPointerDown"
          @pointermove="onGPointerMove"
          @pointerup="onGPointerUp"
          @pointerleave="onGPointerUp"
          @wheel.prevent="onGWheel"
          @selectstart.prevent
          @click="onGraphClick"
        >
          <div class="mermaid-canvas" :style="gCanvasStyle" style="min-height: calc(100vh - 8rem);">
            <div v-if="scenes.length === 0" class="empty-state" style="min-height: calc(100vh - 8rem);">
              还没有地点，先创建地点再查看关系图。
            </div>
            <div v-else ref="gRef" class="mermaid-render"></div>
          </div>
          <div v-if="graphDetail" class="absolute bottom-4 left-4 card pad-4 shadow-lg max-w-xs text-sm space-y-1 z-10">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-[var(--text)]">{{ graphDetail.name }}</span>
              <button class="text-[var(--text-muted)] hover:text-[var(--text)]" @click.stop="graphDetail = null"><X class="w-3.5 h-3.5" /></button>
            </div>
            <p v-if="graphDetail.location" class="text-[var(--text-light)]">地点：{{ graphDetail.location }}</p>
            <p v-if="graphDetail.belongsTo" class="text-[var(--text-light)]">归属：{{ graphDetail.belongsTo }}</p>
            <p v-if="graphDetail.atmosphere.length" class="text-[var(--text-light)]">氛围：{{ graphDetail.atmosphere.join('、') }}</p>
          </div>
        </div>
      </div>
    </Teleport>
  </Layout>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { Map as MapIcon, MapPin, Plus, Edit, Trash2, Search, X, Share2 } from 'lucide-vue-next';
import mermaid from 'mermaid';
import Layout from '../components/Layout.vue';
import { useStore } from '../store';
import type { Scene } from '../types';

const { scenes, addScene, updateScene, deleteScene: deleteSceneFromStore } = useStore();
const route = useRoute();

const showAddModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const showDetailModal = ref(false);
const detailScene = ref<Scene | null>(null);
const sceneToDelete = ref<Scene | null>(null);

const anyModalOpen = computed(() => showAddModal.value || showEditModal.value || showDeleteModal.value || showDetailModal.value);
watch(anyModalOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : '';
});
const editingId = ref<string | null>(null);
const atmosphereInput = ref('');
const searchQuery = ref('');
const focusedId = ref('');
const currentPage = ref(1);
const PAGE_SIZE = 4;

const form = ref({
  name: '',
  location: '',
  description: '',
  atmosphere: [] as string[],
  belongsTo: '',
});

const filteredScenes = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return scenes.value;
  return scenes.value.filter(s => {
    return s.name.toLowerCase().includes(q)
      || s.location.toLowerCase().includes(q)
      || s.description.toLowerCase().includes(q);
  });
});

const otherScenes = computed(() => {
  if (showEditModal.value && editingId.value) {
    return scenes.value.filter(s => s.id !== editingId.value);
  }
  return scenes.value;
});

const totalPages = computed(() => Math.ceil(filteredScenes.value.length / PAGE_SIZE));
const pagedScenes = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return filteredScenes.value.slice(start, start + PAGE_SIZE);
});

function changePage(page: number) {
  currentPage.value = Math.max(1, Math.min(totalPages.value, page));
}

watch(searchQuery, () => {
  currentPage.value = 1;
});

const closeModal = () => {
  showAddModal.value = false;
  showEditModal.value = false;
  form.value = { name: '', location: '', description: '', atmosphere: [], belongsTo: '' };
  atmosphereInput.value = '';
  editingId.value = null;
};

const syncFromQuery = () => {
  searchQuery.value = typeof route.query.q === 'string' ? route.query.q : '';
  focusedId.value = typeof route.query.focus === 'string' ? route.query.focus : '';
};

const scrollToFocusedCard = async () => {
  if (!focusedId.value) return;
  await nextTick();
  document.getElementById(`scene-${focusedId.value}`)?.scrollIntoView({
    block: 'center',
    behavior: 'smooth',
  });
};

watch(
  () => route.query,
  () => {
    syncFromQuery();
    void scrollToFocusedCard();
  },
  { immediate: true, deep: true }
);

const saveScene = () => {
  if (!form.value.name.trim()) return;

  const atmosphere = atmosphereInput.value
    .split(',')
    .map(a => a.trim())
    .filter(a => a.length > 0);

  if (showEditModal.value && editingId.value) {
    updateScene(editingId.value, {
      ...form.value,
      atmosphere,
    });
  } else {
    addScene({
      ...form.value,
      atmosphere,
    });
  }

  closeModal();
};

const editScene = (scene: Scene) => {
  form.value = {
    name: scene.name,
    location: scene.location,
    description: scene.description,
    atmosphere: [...scene.atmosphere],
    belongsTo: scene.belongsTo || '',
  };
  atmosphereInput.value = scene.atmosphere.join(', ');
  editingId.value = scene.id;
  showEditModal.value = true;
};

const viewScene = (scene: Scene) => {
  detailScene.value = scene;
  showDetailModal.value = true;
};

const closeDetailModal = () => {
  showDetailModal.value = false;
  detailScene.value = null;
};

const confirmDelete = (scene: Scene) => {
  sceneToDelete.value = scene;
  showDeleteModal.value = true;
};

const editFromDetail = () => {
  if (detailScene.value) {
    showDetailModal.value = false;
    editScene(detailScene.value);
  }
};

const deleteFromDetail = () => {
  if (detailScene.value) {
    showDetailModal.value = false;
    confirmDelete(detailScene.value);
  }
};

const deleteScene = () => {
  if (sceneToDelete.value) {
    deleteSceneFromStore(sceneToDelete.value.id);
    showDeleteModal.value = false;
    sceneToDelete.value = null;
  }
};

// === 关系图 ===
const showGraph = ref(false);
const gRef = ref<HTMLDivElement | null>(null);
const graphDetail = ref<Scene | null>(null);
const gScale = ref(1);
const gOffset = ref({ x: 0, y: 0 });
const gPanning = ref(false);
const gPanStart = ref({ x: 0, y: 0 });
const gPanOffset = ref({ x: 0, y: 0 });
const mInit = ref(false);
const mIdx = ref(0);

const gCanvasStyle = computed(() => ({
  transform: `translate(${gOffset.value.x}px, ${gOffset.value.y}px) scale(${gScale.value})`,
}));

const sid = (v: string) => v.replace(/[^a-zA-Z0-9_]/g, '_');
const elbl = (v: string) => v.replace(/[\[\]<>]/g, '').replace(/[(){}]/g, '').replace(/["']/g, '').replace(/\|/g, '/').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
const snId = (id: string) => `sc_${sid(id)}`;

const graphCode = computed(() => {
  const parentNames = new Set(scenes.value.filter(s => s.belongsTo).map(s => s.belongsTo!));
  const parents = scenes.value.filter(s => parentNames.has(s.name));
  const childrenByParent = new Map<string, Scene[]>();
  const standalone: Scene[] = [];
  for (const p of parents) {
    childrenByParent.set(p.id, []);
  }
  for (const s of scenes.value) {
    if (s.belongsTo && parentNames.has(s.belongsTo)) {
      const parent = parents.find(p => p.name === s.belongsTo);
      if (parent && parent.id !== s.id) {
        childrenByParent.get(parent.id)!.push(s);
        continue;
      }
    }
    if (!parentNames.has(s.name)) {
      standalone.push(s);
    }
  }
  const parts: string[] = ['flowchart LR'];
  for (const p of parents) {
    const children = childrenByParent.get(p.id) || [];
    parts.push(`  subgraph ${snId(p.id)}[${elbl(p.name)}]`, '    direction LR');
    for (const c of children) parts.push(`    ${snId(c.id)}[${elbl(c.name)}]`);
    parts.push('  end', `  style ${snId(p.id)} fill:#06b6d414,stroke:#06b6d44d,stroke-width:2px`);
    parts.push(`  ${snId(p.id)}[${elbl(p.name)}]`);
  }
  for (const s of standalone) parts.push(`  ${snId(s.id)}[${elbl(s.name)}]`);
  for (const s of scenes.value) {
    if (s.belongsTo) {
      const parent = scenes.value.find(p => p.name === s.belongsTo && p.id !== s.id);
      if (parent) parts.push(`  ${snId(s.id)} --- ${snId(parent.id)}`);
    }
  }
  return parts.join('\n');
});

const renderGraph = async () => {
  const el = gRef.value;
  if (!el || scenes.value.length === 0) return;
  try {
    const id = `sg-${mIdx.value++}`;
    const { svg } = await mermaid.render(id, graphCode.value);
    el.innerHTML = svg;
  } catch (e) { console.error(e); }
};

watch(graphCode, async () => { await nextTick(); renderGraph(); });
watch(showGraph, async (v) => {
  if (v) {
    if (!mInit.value) { mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' }); mInit.value = true; }
    await nextTick(); renderGraph();
  }
});

const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && showGraph.value) showGraph.value = false; };
onMounted(() => document.addEventListener('keydown', handleEsc));
onUnmounted(() => document.removeEventListener('keydown', handleEsc));

const zoomIn = () => { gScale.value = Math.min(2, gScale.value + 0.1); };
const zoomOut = () => { gScale.value = Math.max(0.4, gScale.value - 0.1); };
const resetView = () => { gScale.value = 1; gOffset.value = { x: 0, y: 0 }; };
const onGWheel = (e: WheelEvent) => {
  gScale.value = Math.min(2, Math.max(0.4, gScale.value + (e.deltaY > 0 ? -0.1 : 0.1)));
};
const onGPointerDown = (e: PointerEvent) => {
  if (e.button !== 0) return;
  gPanning.value = true;
  gPanStart.value = { x: e.clientX, y: e.clientY };
  gPanOffset.value = { x: gOffset.value.x, y: gOffset.value.y };
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
};
const onGPointerMove = (e: PointerEvent) => {
  if (!gPanning.value) return;
  gOffset.value = { x: gPanOffset.value.x + e.clientX - gPanStart.value.x, y: gPanOffset.value.y + e.clientY - gPanStart.value.y };
};
const onGPointerUp = (e: PointerEvent) => {
  if (!gPanning.value) return;
  gPanning.value = false;
  (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
};

const onGraphClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  const node = target.closest('[id*="sc_"]');
  if (!node) { graphDetail.value = null; return; }
  const idAttr = node.getAttribute('id') || '';
  const m = idAttr.match(/sc_(\d+)/);
  if (m) {
    const scene = scenes.value.find(s => s.id === m[1]);
    if (scene) { graphDetail.value = scene; e.stopPropagation(); return; }
  }
  graphDetail.value = null;
};
</script>

<style scoped>
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

.is-panning {
  cursor: grabbing;
}
</style>
