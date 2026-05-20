<template>
  <Layout>
    <div class="page-space">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-[var(--text)]">场景设定</h1>
          <p class="text-[var(--text-light)] mt-1 text-lg">管理你的小说场景</p>
        </div>
        <button @click="showAddModal = true" class="btn btn-primary">
          <Plus class="w-4 h-4" />
          新建场景
        </button>
      </div>

      <div class="relative search-field-wrap">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          v-model="searchQuery"
          type="text"
          class="input input-with-left-icon"
          placeholder="搜索场景名称、地点、描述..."
        />
      </div>

      <div v-if="filteredScenes.length === 0 && scenes.length > 0" class="card pad-12 text-center empty-state-card">
        <Search class="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
        <p class="text-[var(--text-light)]">没有匹配的场景</p>
      </div>

      <div v-else-if="scenes.length === 0" class="card pad-12 text-center empty-state-card">
        <Map class="w-20 h-20 text-[var(--text-muted)] mx-auto mb-6" />
        <h3 class="text-xl font-semibold text-[var(--text)] mb-3">还没有场景</h3>
        <p class="text-[var(--text-light)] mb-6 max-w-md mx-auto">点击上方按钮创建你的第一个场景，让故事发生在特定的地方</p>
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
          {{ showEditModal ? '编辑场景' : '新建场景' }}
        </h2>
        <div class="space-y-5">
          <div>
            <label class="block text-sm font-semibold text-[var(--text)] mb-2">场景名称</label>
            <input
              v-model="form.name"
              type="text"
              class="input"
              placeholder="输入场景名称"
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
            <label class="block text-sm font-semibold text-[var(--text)] mb-2">氛围标签（用逗号分隔）</label>
            <input
              v-model="atmosphereInput"
              type="text"
              class="input"
              placeholder="如：神秘,紧张,温馨"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-[var(--text)] mb-2">场景描述</label>
            <textarea
              v-model="form.description"
              class="input min-h-[140px]"
              placeholder="描述这个场景的环境、氛围等"
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
  </Layout>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { Map, MapPin, Plus, Edit, Trash2, Search, X } from 'lucide-vue-next';
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
const PAGE_SIZE = 3;

const form = ref({
  name: '',
  location: '',
  description: '',
  atmosphere: [] as string[],
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
  form.value = { name: '', location: '', description: '', atmosphere: [] };
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
</script>
