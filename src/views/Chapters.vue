<template>
  <Layout>
    <div class="space-y-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-[var(--text)]">章节管理</h1>
          <p class="text-[var(--text-light)] mt-1 text-lg">管理你的小说章节</p>
        </div>
        <div class="flex items-center gap-4">
          <button @click="openAddVolume" class="btn btn-secondary">
            <FolderPlus class="w-4 h-4" />
            新建卷
          </button>
          <button @click="openAddChapter('')" class="btn btn-primary" :disabled="volumes.length === 0">
            <Plus class="w-4 h-4" />
            新建章节
          </button>
        </div>
      </div>

      <div class="relative search-field-wrap">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          v-model="searchQuery"
          type="text"
          class="input input-with-left-icon"
          placeholder="搜索章节标题..."
        />
      </div>

      <div v-if="volumes.length === 0" class="card pad-12 text-center empty-state-card">
        <FileText class="w-20 h-20 text-[var(--text-muted)] mx-auto mb-6" />
        <h3 class="text-xl font-semibold text-[var(--text)] mb-3">还没有卷和章节</h3>
        <p class="text-[var(--text-light)] mb-6 max-w-md mx-auto">先创建一个卷，然后在卷中添加章节</p>
        <button @click="openAddVolume" class="btn btn-primary">
          <FolderPlus class="w-4 h-4" />
          新建卷
        </button>
      </div>

      <div v-else class="space-y-5">
        <div v-for="volume in filteredVolumes" :key="volume.id" class="card overflow-hidden">
          <div class="pad-5 flex items-center justify-between" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(139, 92, 246, 0.04) 100%);">
            <div class="flex items-center gap-4">
              <button @click="toggleVolume(volume.id)" class="pad-1 rounded-lg hover:bg-[var(--surface-hover)] transition-colors">
                <ChevronRight :class="['w-5 h-5 text-[var(--text-light)] transition-transform', { 'rotate-90': expandedVolumes.has(volume.id) }]" />
              </button>
              <FolderOpen class="w-5 h-5 text-[var(--primary)]" />
              <h2 class="font-bold text-[var(--text)] text-lg">{{ volume.title }}</h2>
              <span class="text-sm text-[var(--text-muted)]">
                {{ getVolumeChapterCount(volume.id) }} 章
              </span>
            </div>
            <div class="flex items-center gap-3">
              <button
                @click="openAddChapter(volume.id)"
                class="pad-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-light)] hover:text-[var(--primary)] transition-colors"
                title="添加章节"
              >
                <Plus class="w-4 h-4" />
              </button>
              <button
                v-if="volumes.length > 1"
                @click="moveVolume(volume.id, -1)"
                :disabled="volume.order === 0"
                class="pad-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-light)] hover:text-[var(--text)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="上移卷"
              >
                <ChevronUp class="w-4 h-4" />
              </button>
              <button
                v-if="volumes.length > 1"
                @click="moveVolume(volume.id, 1)"
                :disabled="volume.order === volumes.length - 1"
                class="pad-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-light)] hover:text-[var(--text)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="下移卷"
              >
                <ChevronDown class="w-4 h-4" />
              </button>
              <button
                @click="openEditVolume(volume)"
                class="pad-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-light)] hover:text-[var(--text)] transition-colors"
                title="编辑卷名"
              >
                <Edit class="w-4 h-4" />
              </button>
              <button
                v-if="volumes.length > 1"
                @click="confirmDeleteVolume(volume)"
                class="pad-2 rounded-lg hover:bg-red-500/10 text-[var(--text-light)] hover:text-[var(--error)] transition-colors"
                title="删除卷"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div v-if="expandedVolumes.has(volume.id)" class="pad-4 space-y-4">
            <div v-if="getVolumeChapters(volume.id).length === 0" class="text-center py-8 text-[var(--text-muted)]">
              <p>此卷暂无章节</p>
            </div>
            <div
              v-for="chapter in getVolumeChapters(volume.id)"
              :key="chapter.id"
              @click="goToEditor(chapter.id)"
              class="pad-4 rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors cursor-pointer"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);">
                    <span class="text-[var(--primary)] font-bold text-sm">{{ chapter.order + 1 }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-4 mb-0.5">
                      <h3 class="font-semibold text-[var(--text)] truncate">{{ chapter.title }}</h3>
                      <span class="tag" :class="statusClass(chapter.status)">{{ statusText(chapter.status) }}</span>
                    </div>
                    <p class="text-sm text-[var(--text-muted)]">
                      {{ chapter.wordCount.toLocaleString() }} 字 · 最后编辑 {{ formatDate(chapter.updatedAt) }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-1">
                  <button @click.stop="editChapter(chapter)" class="pad-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-light)] hover:text-[var(--text)] transition-all" title="编辑">
                    <Edit class="w-4 h-4" />
                  </button>
                  <button @click.stop="moveChapter(chapter, -1)" :disabled="chapter.order === 0" class="pad-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-light)] hover:text-[var(--text)] transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="上移">
                    <ChevronUp class="w-4 h-4" />
                  </button>
                  <button @click.stop="moveChapter(chapter, 1)" :disabled="chapter.order === getVolumeChapterCount(chapter.volumeId) - 1" class="pad-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-light)] hover:text-[var(--text)] transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="下移">
                    <ChevronDown class="w-4 h-4" />
                  </button>
                  <button @click.stop="confirmDeleteChapter(chapter)" class="pad-2 rounded-lg hover:bg-red-500/10 text-[var(--text-light)] hover:text-[var(--error)] transition-all" title="删除">
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 卷 添加/编辑模态框 -->
    <div v-if="showVolumeModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pad-4" @click.self="closeVolumeModal">
      <div class="card w-full max-w-sm pad-8">
        <h2 class="text-2xl font-bold text-[var(--text)] mb-6">{{ editingVolume ? '编辑卷名' : '新建卷' }}</h2>
        <div>
          <label class="block text-sm font-semibold text-[var(--text)] mb-2">卷名</label>
          <input v-model="volumeForm.title" type="text" class="input" placeholder="输入卷名" @keyup.enter="saveVolume" />
        </div>
        <div class="flex justify-end gap-3 mt-7">
          <button @click="closeVolumeModal" class="btn btn-secondary">取消</button>
          <button @click="saveVolume" class="btn btn-primary">保存</button>
        </div>
      </div>
    </div>

    <!-- 章节 添加/编辑模态框 -->
    <div v-if="showChapterModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pad-4" @click.self="closeChapterModal">
      <div class="card w-full max-w-md pad-8">
        <h2 class="text-2xl font-bold text-[var(--text)] mb-6">
          {{ editingChapter ? '编辑章节' : '新建章节' }}
        </h2>
        <div class="space-y-5">
          <div>
            <label class="block text-sm font-semibold text-[var(--text)] mb-2">所属卷</label>
            <select v-model="chapterForm.volumeId" class="input">
              <option v-for="v in volumes" :key="v.id" :value="v.id">{{ v.title }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold text-[var(--text)] mb-2">章节标题</label>
            <input v-model="chapterForm.title" type="text" class="input" placeholder="输入章节标题" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-[var(--text)] mb-2">状态</label>
            <select v-model="chapterForm.status" class="input">
              <option value="draft">草稿</option>
              <option value="in-progress">撰写中</option>
              <option value="completed">已完成</option>
            </select>
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-7">
          <button @click="closeChapterModal" class="btn btn-secondary">取消</button>
          <button @click="saveChapter" class="btn btn-primary">保存</button>
        </div>
      </div>
    </div>

    <!-- 删除卷确认 -->
    <div v-if="showDeleteVolumeModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pad-4" @click.self="showDeleteVolumeModal = false">
      <div class="card w-full max-w-sm pad-8">
        <div class="text-center">
          <div class="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-5">
            <Trash2 class="w-8 h-8 text-[var(--error)]" />
          </div>
          <h3 class="text-xl font-bold text-[var(--text)] mb-3">确认删除</h3>
          <p class="text-[var(--text-light)] mb-7">
            确定要删除卷「{{ volumeToDelete?.title }}」吗？卷内章节将移至其他卷。
          </p>
          <div class="flex justify-center gap-3">
            <button @click="showDeleteVolumeModal = false" class="btn btn-secondary">取消</button>
            <button @click="deleteVolume" class="btn" style="background: var(--error); color: white;">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 删除章节确认 -->
    <div v-if="showDeleteChapterModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pad-4" @click.self="showDeleteChapterModal = false">
      <div class="card w-full max-w-sm pad-8">
        <div class="text-center">
          <div class="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-5">
            <Trash2 class="w-8 h-8 text-[var(--error)]" />
          </div>
          <h3 class="text-xl font-bold text-[var(--text)] mb-3">确认删除</h3>
          <p class="text-[var(--text-light)] mb-7">
            确定要删除章节「{{ chapterToDelete?.title }}」吗？此操作无法撤销。
          </p>
          <div class="flex justify-center gap-3">
            <button @click="showDeleteChapterModal = false" class="btn btn-secondary">取消</button>
            <button @click="deleteChapter" class="btn" style="background: var(--error); color: white;">删除</button>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { FileText, Plus, Edit, ChevronUp, ChevronDown, ChevronRight, Trash2, FolderOpen, FolderPlus, Search } from 'lucide-vue-next';
import Layout from '../components/Layout.vue';
import { useStore } from '../store';
import type { Chapter, Volume } from '../types';

const router = useRouter();
const {
  volumes, chapters, addVolume, updateVolume, deleteVolume: deleteVolumeFromStore,
  moveVolume,
  addChapter, updateChapter, deleteChapter: deleteChapterFromStore, setCurrentChapter
} = useStore();

const searchQuery = ref('');
const expandedVolumes = ref(new Set<string>());

// Volume modals
const showVolumeModal = ref(false);
const editingVolume = ref<Volume | null>(null);
const volumeForm = ref({ title: '' });
const showDeleteVolumeModal = ref(false);
const volumeToDelete = ref<Volume | null>(null);

// Chapter modals
const showChapterModal = ref(false);
const editingChapter = ref<Chapter | null>(null);
const chapterForm = ref({ title: '', status: 'draft' as Chapter['status'], volumeId: '' });
const showDeleteChapterModal = ref(false);
const chapterToDelete = ref<Chapter | null>(null);

// Init: expand all volumes
volumes.value.forEach(v => expandedVolumes.value.add(v.id));

const filteredVolumes = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return volumes.value;
  return volumes.value.filter(v =>
    getVolumeChapters(v.id).length > 0
  ).filter(v => {
    const chs = chapters.value.filter(c => c.volumeId === v.id);
    return chs.some(c => c.title.toLowerCase().includes(q));
  });
});

const getVolumeChapters = (volumeId: string) => {
  const q = searchQuery.value.trim().toLowerCase();
  let chs = chapters.value.filter(c => c.volumeId === volumeId).sort((a, b) => a.order - b.order);
  if (q) {
    chs = chs.filter(c => c.title.toLowerCase().includes(q));
  }
  return chs;
};

const getVolumeChapterCount = (volumeId: string) =>
  chapters.value.filter(c => c.volumeId === volumeId).length;

const toggleVolume = (id: string) => {
  if (expandedVolumes.value.has(id)) {
    expandedVolumes.value.delete(id);
  } else {
    expandedVolumes.value.add(id);
  }
};

const goToEditor = (chapterId: string) => {
  router.push(`/editor/${chapterId}`);
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const statusClass = (status: string) => {
  const classes: Record<string, string> = {
    'draft': 'tag-muted',
    'in-progress': 'tag-warning',
    'completed': 'tag-success',
  };
  return classes[status] || 'tag-muted';
};

const statusText = (status: string) => {
  const texts: Record<string, string> = {
    'draft': '草稿',
    'in-progress': '撰写中',
    'completed': '已完成',
  };
  return texts[status] || '草稿';
};

// === Volume actions ===
const openAddVolume = () => {
  editingVolume.value = null;
  volumeForm.value = { title: '' };
  showVolumeModal.value = true;
};

const openEditVolume = (volume: Volume) => {
  editingVolume.value = volume;
  volumeForm.value = { title: volume.title };
  showVolumeModal.value = true;
};

const closeVolumeModal = () => {
  showVolumeModal.value = false;
  editingVolume.value = null;
};

const saveVolume = () => {
  if (!volumeForm.value.title.trim()) return;
  if (editingVolume.value) {
    updateVolume(editingVolume.value.id, { title: volumeForm.value.title });
  } else {
    const v = addVolume(volumeForm.value.title);
    expandedVolumes.value.add(v.id);
  }
  closeVolumeModal();
};

const confirmDeleteVolume = (volume: Volume) => {
  volumeToDelete.value = volume;
  showDeleteVolumeModal.value = true;
};

const deleteVolume = () => {
  if (volumeToDelete.value) {
    deleteVolumeFromStore(volumeToDelete.value.id);
    showDeleteVolumeModal.value = false;
    volumeToDelete.value = null;
  }
};

// === Chapter actions ===
const openAddChapter = (volumeId: string) => {
  editingChapter.value = null;
  chapterForm.value = { title: '', status: 'draft', volumeId };
  showChapterModal.value = true;
};

const editChapter = (chapter: Chapter) => {
  editingChapter.value = chapter;
  chapterForm.value = {
    title: chapter.title,
    status: chapter.status,
    volumeId: chapter.volumeId,
  };
  showChapterModal.value = true;
};

const closeChapterModal = () => {
  showChapterModal.value = false;
  editingChapter.value = null;
};

const saveChapter = () => {
  if (!chapterForm.value.title.trim()) return;

  if (editingChapter.value) {
    updateChapter(editingChapter.value.id, {
      title: chapterForm.value.title,
      status: chapterForm.value.status,
      volumeId: chapterForm.value.volumeId,
    });
  } else {
    const vid = chapterForm.value.volumeId || volumes.value[0]?.id;
    if (!vid) return;
    addChapter({
      title: chapterForm.value.title,
      content: '',
      wordCount: 0,
      status: chapterForm.value.status,
      volumeId: vid,
    });
  }

  closeChapterModal();
};

const moveChapter = (chapter: Chapter, direction: number) => {
  const siblings = chapters.value
    .filter(c => c.volumeId === chapter.volumeId)
    .sort((a, b) => a.order - b.order);

  const newOrder = chapter.order + direction;
  if (newOrder < 0 || newOrder >= siblings.length) return;

  const targetChapter = siblings.find(c => c.order === newOrder);
  if (targetChapter) {
    updateChapter(targetChapter.id, { order: chapter.order });
  }
  updateChapter(chapter.id, { order: newOrder });
};

const confirmDeleteChapter = (chapter: Chapter) => {
  chapterToDelete.value = chapter;
  showDeleteChapterModal.value = true;
};

const deleteChapter = () => {
  if (chapterToDelete.value) {
    deleteChapterFromStore(chapterToDelete.value.id);
    showDeleteChapterModal.value = false;
    chapterToDelete.value = null;
  }
};
</script>
