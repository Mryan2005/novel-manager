<template>
  <Layout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-[var(--text)]">章节管理</h1>
          <p class="text-[var(--text-light)] mt-1 text-lg">管理你的小说章节</p>
        </div>
        <button @click="showAddModal = true" class="btn btn-primary">
          <Plus class="w-4 h-4" />
          新建章节
        </button>
      </div>

      <div v-if="chapters.length === 0" class="card p-12 text-center">
        <FileText class="w-20 h-20 text-[var(--text-muted)] mx-auto mb-6" />
        <h3 class="text-xl font-semibold text-[var(--text)] mb-3">还没有章节</h3>
        <p class="text-[var(--text-light)] mb-6 max-w-md mx-auto">点击上方按钮创建你的第一个章节，开始你的创作之旅</p>
      </div>

      <div v-else class="space-y-4">
        <div 
          v-for="chapter in sortedChapters" 
          :key="chapter.id"
          class="card p-8"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-5">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);">
                <span class="text-[var(--primary)] font-bold text-lg">{{ chapter.order + 1 }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-3 mb-1">
                  <h3 class="font-semibold text-[var(--text)] text-lg truncate">{{ chapter.title }}</h3>
                  <span 
                    class="tag"
                    :class="statusClass(chapter.status)"
                  >
                    {{ statusText(chapter.status) }}
                  </span>
                </div>
                <p class="text-sm text-[var(--text-muted)]">
                  {{ chapter.wordCount.toLocaleString() }} 字 · 最后编辑 {{ formatDate(chapter.updatedAt) }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button 
                @click="editChapter(chapter.id)"
                class="p-2.5 rounded-xl hover:bg-[var(--surface-hover)] text-[var(--text-light)] hover:text-[var(--text)] transition-all"
                title="编辑"
              >
                <Edit class="w-5 h-5" />
              </button>
              <button 
                @click="moveChapter(chapter.id, -1)"
                :disabled="chapter.order === 0"
                class="p-2.5 rounded-xl hover:bg-[var(--surface-hover)] text-[var(--text-light)] hover:text-[var(--text)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="上移"
              >
                <ChevronUp class="w-5 h-5" />
              </button>
              <button 
                @click="moveChapter(chapter.id, 1)"
                :disabled="chapter.order === chapters.length - 1"
                class="p-2.5 rounded-xl hover:bg-[var(--surface-hover)] text-[var(--text-light)] hover:text-[var(--text)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="下移"
              >
                <ChevronDown class="w-5 h-5" />
              </button>
              <button 
                @click="confirmDelete(chapter)"
                class="p-2.5 rounded-xl hover:bg-red-500/10 text-[var(--text-light)] hover:text-[var(--error)] transition-all"
                title="删除"
              >
                <Trash2 class="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑模态框 -->
    <div v-if="showAddModal || showEditModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="closeModal">
      <div class="card w-full max-w-md p-8">
        <h2 class="text-2xl font-bold text-[var(--text)] mb-6">
          {{ showEditModal ? '编辑章节' : '新建章节' }}
        </h2>
        <div class="space-y-5">
          <div>
            <label class="block text-sm font-semibold text-[var(--text)] mb-2">章节标题</label>
            <input 
              v-model="form.title" 
              type="text" 
              class="input"
              placeholder="输入章节标题"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-[var(--text)] mb-2">状态</label>
            <select v-model="form.status" class="input">
              <option value="draft">草稿</option>
              <option value="in-progress">撰写中</option>
              <option value="completed">已完成</option>
            </select>
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-7">
          <button @click="closeModal" class="btn btn-secondary">取消</button>
          <button @click="saveChapter" class="btn btn-primary">保存</button>
        </div>
      </div>
    </div>

    <!-- 删除确认 -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="showDeleteModal = false">
      <div class="card w-full max-w-sm p-8">
        <div class="text-center">
          <div class="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-5">
            <Trash2 class="w-8 h-8 text-[var(--error)]" />
          </div>
          <h3 class="text-xl font-bold text-[var(--text)] mb-3">确认删除</h3>
          <p class="text-[var(--text-light)] mb-7">
            确定要删除章节「{{ chapterToDelete?.title }}」吗？此操作无法撤销。
          </p>
          <div class="flex justify-center gap-3">
            <button @click="showDeleteModal = false" class="btn btn-secondary">取消</button>
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
import { FileText, Plus, Edit, ChevronUp, ChevronDown, Trash2 } from 'lucide-vue-next';
import Layout from '../components/Layout.vue';
import { useStore } from '../store';
import type { Chapter } from '../types';

const router = useRouter();
const { chapters, addChapter, updateChapter, deleteChapter: deleteChapterFromStore, setCurrentChapter } = useStore();

const showAddModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const chapterToDelete = ref<Chapter | null>(null);
const editingId = ref<string | null>(null);

const form = ref({
  title: '',
  status: 'draft' as const,
});

const sortedChapters = computed(() => {
  return [...chapters.value].sort((a, b) => a.order - b.order);
});

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const statusClass = (status: string) => {
  const classes = {
    'draft': 'tag-muted',
    'in-progress': 'tag-warning',
    'completed': 'tag-success',
  };
  return classes[status as keyof typeof classes] || 'tag-muted';
};

const statusText = (status: string) => {
  const texts = {
    'draft': '草稿',
    'in-progress': '撰写中',
    'completed': '已完成',
  };
  return texts[status as keyof typeof texts] || '草稿';
};

const closeModal = () => {
  showAddModal.value = false;
  showEditModal.value = false;
  form.value = { title: '', status: 'draft' };
  editingId.value = null;
};

const saveChapter = () => {
  if (!form.value.title.trim()) return;

  if (showEditModal.value && editingId.value) {
    updateChapter(editingId.value, {
      title: form.value.title,
      status: form.value.status,
    });
  } else {
    addChapter({
      title: form.value.title,
      content: '',
      wordCount: 0,
      status: form.value.status,
    });
  }

  closeModal();
};

const editChapter = (id: string) => {
  const chapter = chapters.value.find(c => c.id === id);
  if (chapter) {
    form.value = {
      title: chapter.title,
      status: chapter.status,
    };
    editingId.value = id;
    showEditModal.value = true;
  }
};

const moveChapter = (id: string, direction: number) => {
  const chapter = chapters.value.find(c => c.id === id);
  if (!chapter) return;

  const newOrder = chapter.order + direction;
  if (newOrder < 0 || newOrder >= chapters.value.length) return;

  const targetChapter = chapters.value.find(c => c.order === newOrder);
  if (targetChapter) {
    updateChapter(targetChapter.id, { order: chapter.order });
  }
  updateChapter(id, { order: newOrder });
};

const confirmDelete = (chapter: Chapter) => {
  chapterToDelete.value = chapter;
  showDeleteModal.value = true;
};

const deleteChapter = () => {
  if (chapterToDelete.value) {
    deleteChapterFromStore(chapterToDelete.value.id);
    showDeleteModal.value = false;
    chapterToDelete.value = null;
  }
};
</script>
