<template>
  <Layout>
    <div class="page-space">
      <div class="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 class="text-3xl font-bold text-[var(--text)]">名场面</h1>
          <p class="text-[var(--text-light)] mt-1 text-lg">记录那些有意思的桥段和记忆</p>
        </div>
        <button class="btn btn-primary" @click="openAddModal">
          <Plus class="w-4 h-4" />
          新建名场面
        </button>
      </div>

      <div class="relative mb-6">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          v-model="searchQuery"
          class="input input-with-left-icon"
          placeholder="搜索名场面..."
        />
      </div>

      <div v-if="allTags.length > 0" class="flex flex-wrap gap-2 mb-6">
        <button
          v-for="tag in allTags"
          :key="tag"
          class="px-3 py-1 text-xs rounded-lg border transition-colors"
          :class="selectedTags.has(tag) ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'border-[var(--border)] text-[var(--text-light)] hover:bg-[var(--surface-alt)]'"
          @click="toggleTag(tag)"
        >
          #{{ tag }}
        </button>
        <button
          v-if="selectedTags.size > 0"
          class="px-3 py-1 text-xs rounded-lg text-[var(--text-muted)] hover:text-[var(--text)]"
          @click="selectedTags.clear(); currentPage = 1"
        >
          清除标签
        </button>
      </div>

      <div v-if="filteredMoments.length === 0 && moments.length > 0" class="text-center py-20">
        <p class="text-[var(--text-muted)] text-lg">没有找到匹配的名场面</p>
      </div>

      <div v-if="moments.length === 0" class="text-center py-20">
        <div class="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4" style="background: linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%);">
          <Sparkles class="w-10 h-10" style="color: var(--primary);" />
        </div>
        <h3 class="text-xl font-semibold text-[var(--text)] mb-2">还没有名场面</h3>
        <p class="text-[var(--text-light)] mb-6">创建你的第一个名场面，记录那些有意思的桥段</p>
        <button class="btn btn-primary" @click="openAddModal">创建名场面</button>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="moment in pagedMoments"
          :key="moment.id"
          :ref="el => setCardRef(moment.id, el)"
          class="card pad-5 cursor-pointer hover:shadow-md transition-all"
          :class="{ 'ring-2 ring-[var(--primary)]': focusedMomentId === moment.id }"
          @click="viewMoment(moment)"
        >
          <div class="flex items-start justify-between mb-3">
            <h3 class="text-lg font-semibold text-[var(--text)] line-clamp-1 flex-1">{{ moment.title }}</h3>
            <div class="flex items-center gap-1 shrink-0 ml-2">
              <button
                class="pad-1 rounded hover:bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text)]"
                @click.stop="editMoment(moment)"
              >
                <Edit class="w-3.5 h-3.5" />
              </button>
              <button
                class="pad-1 rounded hover:bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-red-500"
                @click.stop="confirmDelete(moment)"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p class="text-sm text-[var(--text-light)] mb-3 line-clamp-3">{{ moment.content || '暂无内容' }}</p>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="tag in moment.tags.slice(0, 4)"
              :key="tag"
              class="px-2 py-0.5 text-xs rounded-full bg-[var(--surface-alt)] text-[var(--text-light)] cursor-pointer hover:bg-[var(--primary)] hover:text-white transition-colors"
              @click.stop="toggleTag(tag)"
            >
              #{{ tag }}
            </span>
            <span v-if="moment.tags.length > 4" class="text-xs text-[var(--text-muted)]">+{{ moment.tags.length - 4 }}</span>
          </div>
          <div v-if="moment.relatedCharacterIds.length > 0" class="mt-2 text-xs text-[var(--text-muted)]">
            关联角色: {{ moment.relatedCharacterIds.map(id => characters.find(c => c.id === id)?.name || '未知').join('、') }}
          </div>
        </div>
      </div>

      <div v-if="totalPages > 1" class="flex items-center justify-center gap-3 mt-8">
        <button class="btn btn-secondary" :disabled="currentPage <= 1" @click="changePage(currentPage - 1)">上一页</button>
        <span class="text-sm text-[var(--text-light)]">{{ currentPage }} / {{ totalPages }}</span>
        <button class="btn btn-secondary" :disabled="currentPage >= totalPages" @click="changePage(currentPage + 1)">下一页</button>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <div v-if="showAddModal || showEditModal" class="fixed inset-0 flex items-center justify-center z-50 pad-4" style="background: rgba(0,0,0,0.3); backdrop-filter: blur(4px);" @click.self="closeModal">
        <div class="form-modal-window">
          <h2 class="text-xl font-bold text-[var(--text)] mb-5">{{ showEditModal ? '编辑名场面' : '新建名场面' }}</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-semibold text-[var(--text)] mb-1.5">标题</label>
              <input v-model="form.title" type="text" class="input" placeholder="给这个名场面起个名字" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-[var(--text)] mb-1.5">内容</label>
              <textarea v-model="form.content" class="input min-h-[120px] resize-none" placeholder="描述这个有意思的桥段..."></textarea>
            </div>
            <div>
              <label class="block text-sm font-semibold text-[var(--text)] mb-1.5">标签（用逗号分隔）</label>
              <input v-model="tagsInput" type="text" class="input" placeholder="如：感人, 搞笑, 转折" />
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button @click="closeModal" class="btn btn-secondary">取消</button>
            <button @click="saveMoment" class="btn btn-primary">保存</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Detail Modal -->
    <Teleport to="body">
      <div v-if="showDetailModal && detailMoment" class="fixed inset-0 z-50" style="background: rgba(0,0,0,0.3); backdrop-filter: blur(4px);" @click.self="closeDetailModal">
        <div class="detail-window">
          <div class="detail-header">
            <span class="text-xs text-[var(--text-muted)]">名场面</span>
            <button class="detail-close-btn" @click="closeDetailModal">
              <X class="w-4 h-4" />
            </button>
          </div>
          <div class="detail-body">
            <h2 class="text-xl font-bold text-[var(--text)] mb-4">{{ detailMoment.title }}</h2>
            <div v-if="detailMoment.tags.length > 0" class="mb-4">
              <div class="flex flex-wrap gap-1.5">
                <span v-for="tag in detailMoment.tags" :key="tag" class="px-2 py-0.5 text-xs rounded-full bg-[var(--surface-alt)] text-[var(--text-light)]">#{{ tag }}</span>
              </div>
            </div>
            <div class="text-sm text-[var(--text-light)] whitespace-pre-wrap leading-relaxed">{{ detailMoment.content || '暂无内容' }}</div>
          </div>
          <div class="detail-footer">
            <button class="btn btn-secondary" @click="editFromDetail">编辑</button>
            <button class="btn text-red-500 hover:bg-red-50" @click="deleteFromDetail">删除</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showDeleteModal" class="fixed inset-0 flex items-center justify-center z-50 pad-4" style="background: rgba(0,0,0,0.3); backdrop-filter: blur(4px);" @click.self="showDeleteModal = false">
        <div class="card w-full max-w-sm pad-6 text-center">
          <div class="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Trash2 class="w-7 h-7 text-red-500" />
          </div>
          <h3 class="text-lg font-semibold text-[var(--text)] mb-2">确认删除</h3>
          <p class="text-sm text-[var(--text-light)] mb-6">确定要删除名场面「{{ momentToDelete?.title }}」吗？此操作无法撤销。</p>
          <div class="flex justify-center gap-3">
            <button class="btn btn-secondary" @click="showDeleteModal = false">取消</button>
            <button class="btn bg-red-500 text-white hover:bg-red-600" @click="deleteMomentItem">删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </Layout>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { Sparkles, Plus, Edit, Trash2, Search, X } from 'lucide-vue-next';
import Layout from '../components/Layout.vue';
import { useStore } from '../store';
import type { Moment } from '../types';

const route = useRoute();
const { moments, characters, addMoment, updateMoment, deleteMoment } = useStore();

const PAGE_SIZE = 6;

const searchQuery = ref('');
const selectedTags = ref(new Set<string>());
const currentPage = ref(1);
const focusedMomentId = ref<string | null>(null);
const showAddModal = ref(false);
const showEditModal = ref(false);
const showDetailModal = ref(false);
const showDeleteModal = ref(false);
const editingId = ref<string | null>(null);
const detailMoment = ref<Moment | null>(null);
const momentToDelete = ref<Moment | null>(null);
const tagsInput = ref('');
const cardRefs = ref<Record<string, HTMLElement | null>>({});

const form = ref({
  title: '',
  content: '',
  tags: [] as string[],
  relatedCharacterIds: [] as string[],
});

const allTags = computed(() => {
  const tags = new Set<string>();
  moments.value.forEach(m => m.tags.forEach(t => tags.add(t)));
  return [...tags].filter(Boolean).sort();
});

const filteredMoments = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return moments.value.filter(m => {
    const byText = !query || [
      m.title,
      m.content,
      m.tags.join(' '),
    ].join(' ').toLowerCase().includes(query);
    const byTags = selectedTags.value.size === 0
      || m.tags.some(t => selectedTags.value.has(t));
    return byText && byTags;
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredMoments.value.length / PAGE_SIZE)));

const pagedMoments = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return filteredMoments.value.slice(start, start + PAGE_SIZE);
});

const anyModalOpen = computed(() => showAddModal.value || showEditModal.value || showDetailModal.value || showDeleteModal.value);
watch(anyModalOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : '';
});

watch([searchQuery, selectedTags], () => {
  currentPage.value = 1;
});

function setCardRef(id: string, el: unknown) {
  if (el) {
    cardRefs.value[id] = el as HTMLElement;
  }
}

function scrollToFocusedCard() {
  const id = focusedMomentId.value;
  if (!id) return;
  nextTick(() => {
    const el = cardRefs.value[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

function toggleTag(tag: string) {
  if (selectedTags.value.has(tag)) {
    selectedTags.value.delete(tag);
  } else {
    selectedTags.value.add(tag);
  }
}

function changePage(page: number) {
  currentPage.value = Math.max(1, Math.min(page, totalPages.value));
}

function openAddModal() {
  form.value = { title: '', content: '', tags: [], relatedCharacterIds: [] };
  tagsInput.value = '';
  editingId.value = null;
  showAddModal.value = true;
}

function editMoment(moment: Moment) {
  form.value = {
    title: moment.title,
    content: moment.content,
    tags: [...moment.tags],
    relatedCharacterIds: [...moment.relatedCharacterIds],
  };
  tagsInput.value = moment.tags.join(', ');
  editingId.value = moment.id;
  showEditModal.value = true;
}

function closeModal() {
  showAddModal.value = false;
  showEditModal.value = false;
  form.value = { title: '', content: '', tags: [], relatedCharacterIds: [] };
  tagsInput.value = '';
  editingId.value = null;
}

function saveMoment() {
  if (!form.value.title.trim()) return;
  const tags = tagsInput.value.split(',').map(t => t.trim()).filter(Boolean);

  if (showEditModal.value && editingId.value) {
    updateMoment(editingId.value, {
      ...form.value,
      tags,
    });
  } else {
    addMoment({
      ...form.value,
      tags,
    });
  }
  closeModal();
}

function viewMoment(moment: Moment) {
  detailMoment.value = moment;
  showDetailModal.value = true;
}

function closeDetailModal() {
  showDetailModal.value = false;
  detailMoment.value = null;
}

function editFromDetail() {
  if (!detailMoment.value) return;
  editMoment(detailMoment.value);
  closeDetailModal();
}

function deleteFromDetail() {
  if (!detailMoment.value) return;
  confirmDelete(detailMoment.value);
  closeDetailModal();
}

function confirmDelete(moment: Moment) {
  momentToDelete.value = moment;
  showDeleteModal.value = true;
}

function deleteMomentItem() {
  if (!momentToDelete.value) return;
  deleteMoment(momentToDelete.value.id);
  showDeleteModal.value = false;
  momentToDelete.value = null;
}

// URL query sync
watch(() => route.query, (query) => {
  if (query.q !== undefined) searchQuery.value = String(query.q || '');
  if (query.tag !== undefined) {
    const tag = String(query.tag || '');
    if (tag) selectedTags.value.add(tag);
  }
  if (query.focus !== undefined) {
    focusedMomentId.value = String(query.focus || '');
    scrollToFocusedCard();
  }
}, { immediate: true });
</script>
