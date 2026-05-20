<template>
  <Layout>
    <div class="page-space">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-[var(--text)]">角色设定</h1>
          <p class="text-[var(--text-light)] mt-1 text-lg">管理你的小说角色</p>
        </div>
        <button @click="showAddModal = true" class="btn btn-primary">
          <Plus class="w-4 h-4" />
          新建角色
        </button>
      </div>

      <div class="flex flex-col sm:flex-row gap-4">
        <div class="relative flex-1">
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            v-model="searchQuery"
            type="text"
            class="input input-with-left-icon"
            placeholder="搜索角色名称、身份、描述..."
          />
        </div>
        <div class="relative search-field-wrap">
          <Tag class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            v-model="tagFilter"
            type="text"
            class="input input-with-left-icon"
            placeholder="按标签筛选..."
          />
        </div>
      </div>

      <div v-if="allTags.length > 0" class="flex flex-wrap gap-3">
        <button
          v-for="tag in allTags"
          :key="tag"
          @click="toggleTag(tag)"
          :class="[
            'px-3 py-1 rounded-lg text-xs font-medium transition-all',
            selectedTags.has(tag)
              ? 'bg-[var(--primary)] text-white'
              : 'bg-[var(--surface-alt)] text-[var(--text-light)] hover:bg-[var(--surface-hover)]'
          ]"
        >
          {{ tag }}
        </button>
        <button
          v-if="selectedTags.size > 0"
          @click="selectedTags.clear()"
          class="px-3 py-1 rounded-lg text-xs font-medium bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          清除
        </button>
      </div>

      <div v-if="filteredCharacters.length === 0 && characters.length > 0" class="card pad-12 text-center empty-state-card">
        <Search class="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
        <p class="text-[var(--text-light)]">没有匹配的角色</p>
      </div>

      <div v-else-if="characters.length === 0" class="card pad-12 text-center empty-state-card">
        <Users class="w-20 h-20 text-[var(--text-muted)] mx-auto mb-6" />
        <h3 class="text-xl font-semibold text-[var(--text)] mb-3">还没有角色</h3>
        <p class="text-[var(--text-light)] mb-6 max-w-md mx-auto">点击上方按钮创建你的第一个角色，让你的故事更生动</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div
          v-for="char in pagedCharacters"
          :key="char.id"
          :id="`character-${char.id}`"
          class="card pad-8 cursor-pointer hover:shadow-md transition-shadow"
          :class="focusedId === char.id ? 'ring-2 ring-[var(--primary)]/35' : ''"
          @click="viewCharacter(char)"
        >
          <div class="flex items-start gap-4">
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shrink-0" style="background: var(--primary-gradient);">
              {{ char.name.charAt(0) }}
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-[var(--text)] text-lg">{{ char.name }}</h3>
              <span class="inline-block tag tag-primary mt-2">
                {{ char.role }}
              </span>
              <p class="text-sm text-[var(--text-light)] mt-3">
                {{ char.gender }} · {{ char.age }}岁
              </p>
            </div>
          </div>
          <div v-if="char.tags.length > 0" class="flex flex-wrap gap-2 mt-2">
            <span
              v-for="tag in char.tags"
              :key="tag"
              @click.stop="toggleTag(tag)"
              :class="[
                'px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors',
                selectedTags.has(tag)
                  ? 'bg-[var(--primary)]/20 text-[var(--primary)]'
                  : 'bg-[var(--accent)]/15 text-[var(--accent)] hover:bg-[var(--accent)]/25'
              ]"
            >
              {{ tag }}
            </span>
          </div>
          <div class="flex items-center justify-end gap-2 mt-5 pt-5 border-t border-[var(--border-light)]">
            <button
              @click.stop="editCharacter(char)"
              class="pad-2-5 rounded-xl hover:bg-[var(--surface-hover)] text-[var(--text-light)] hover:text-[var(--text)] transition-all"
              title="编辑"
            >
              <Edit class="w-5 h-5" />
            </button>
            <button
              @click.stop="confirmDelete(char)"
              class="pad-2-5 rounded-xl hover:bg-red-500/10 text-[var(--text-light)] hover:text-[var(--error)] transition-all"
              title="删除"
            >
              <Trash2 class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div v-if="totalPages > 1" class="flex items-center justify-center gap-3 mt-8">
        <button @click="changePage(currentPage - 1)" :disabled="currentPage <= 1" class="btn btn-secondary text-sm">上一页</button>
        <span class="text-sm font-medium text-[var(--text)]">{{ currentPage }} / {{ totalPages }}</span>
        <button @click="changePage(currentPage + 1)" :disabled="currentPage >= totalPages" class="btn btn-secondary text-sm">下一页</button>
      </div>
    </div>

    <!-- 添加/编辑模态框 -->
    <Teleport to="body">
      <div v-if="showAddModal || showEditModal" class="fixed inset-0 z-50" style="background: rgba(0,0,0,0.3); backdrop-filter: blur(4px);" @click.self="closeModal">
      <div class="form-modal-window">
        <h2 class="text-2xl font-bold text-[var(--text)] mb-6">
          {{ showEditModal ? '编辑角色' : '新建角色' }}
        </h2>
        <div class="space-y-5">
          <div>
            <label class="block text-sm font-semibold text-[var(--text)] mb-2">角色名称</label>
            <input
              v-model="form.name"
              type="text"
              class="input"
              placeholder="输入角色名称"
            />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-[var(--text)] mb-2">性别</label>
              <input
                v-model="form.gender"
                type="text"
                class="input"
                placeholder="如：男、女"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-[var(--text)] mb-2">年龄</label>
              <input
                v-model.number="form.age"
                type="number"
                class="input"
                placeholder="年龄"
              />
            </div>
          </div>
          <div>
            <label class="block text-sm font-semibold text-[var(--text)] mb-2">身份/定位</label>
            <input
              v-model="form.role"
              type="text"
              class="input"
              placeholder="如：主角、反派、配角"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-[var(--text)] mb-2">性格特点（用逗号分隔）</label>
            <input
              v-model="traitsInput"
              type="text"
              class="input"
              placeholder="如：勇敢,善良,聪明"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-[var(--text)] mb-2">标签（用逗号分隔，用于分类检索）</label>
            <input
              v-model="tagsInput"
              type="text"
              class="input"
              placeholder="如：主角团,反派,重要"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-[var(--text)] mb-2">角色描述</label>
            <textarea
              v-model="form.description"
              class="input min-h-[120px]"
              placeholder="描述这个角色的背景、故事等"
            ></textarea>
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-7">
          <button @click="closeModal" class="btn btn-secondary">取消</button>
          <button @click="saveCharacter" class="btn btn-primary">保存</button>
        </div>
      </div>
      </div>
    </Teleport>

    <!-- 角色详情弹窗 -->
    <Teleport to="body">
      <div v-if="showDetailModal && detailCharacter" class="fixed inset-0 z-50" style="background: rgba(0,0,0,0.3); backdrop-filter: blur(4px);" @click.self="closeDetailModal">
      <div class="detail-window">
        <div class="detail-header">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-xs text-[var(--text-muted)]">角色信息</span>
          </div>
          <button class="detail-close-btn" @click="closeDetailModal">
            <X class="w-4 h-4" />
          </button>
        </div>
        <div class="detail-body">
          <h3 class="text-xl font-bold text-[var(--text)] mb-4">{{ detailCharacter.name }}</h3>
          <div class="text-sm text-[var(--text-light)] whitespace-pre-wrap leading-relaxed space-y-1">
            <p v-if="detailCharacter.role">定位：{{ detailCharacter.role }}</p>
            <p v-if="detailCharacter.gender">性别：{{ detailCharacter.gender }}</p>
            <p v-if="detailCharacter.age">年龄：{{ detailCharacter.age }}岁</p>
            <p v-if="detailCharacter.tags.length > 0">标签：{{ detailCharacter.tags.join('、') }}</p>
            <p v-if="detailCharacter.traits.length > 0">性格特点：{{ detailCharacter.traits.join('、') }}</p>
            <p v-if="detailCharacter.description" class="!mt-3">{{ detailCharacter.description }}</p>
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
            确定要删除角色「{{ characterToDelete?.name }}」吗？此操作无法撤销。
          </p>
          <div class="flex justify-center gap-3">
            <button @click="showDeleteModal = false" class="btn btn-secondary">取消</button>
            <button @click="deleteCharacter" class="btn" style="background: var(--error); color: white;">删除</button>
          </div>
        </div>
      </div>
      </div>
    </Teleport>
  </Layout>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { Users, Plus, Edit, Trash2, Search, Tag, X } from 'lucide-vue-next';
import Layout from '../components/Layout.vue';
import { useStore } from '../store';
import type { Character } from '../types';

const { characters, addCharacter, updateCharacter, deleteCharacter: deleteCharacterFromStore } = useStore();
const route = useRoute();

const showAddModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const showDetailModal = ref(false);

const anyModalOpen = computed(() => showAddModal.value || showEditModal.value || showDetailModal.value || showDeleteModal.value);
watch(anyModalOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : '';
});
const characterToDelete = ref<Character | null>(null);
const detailCharacter = ref<Character | null>(null);
const editingId = ref<string | null>(null);
const traitsInput = ref('');
const tagsInput = ref('');
const searchQuery = ref('');
const tagFilter = ref('');
const selectedTags = ref(new Set<string>());
const focusedId = ref('');
const currentPage = ref(1);
const PAGE_SIZE = 3;

const form = ref({
  name: '',
  gender: '',
  age: 0,
  role: '',
  description: '',
  traits: [] as string[],
  tags: [] as string[],
});

const allTags = computed(() => {
  const set = new Set<string>();
  characters.value.forEach(c => c.tags.forEach(t => set.add(t)));
  return [...set].sort();
});

const filteredCharacters = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  const tagQ = tagFilter.value.trim().toLowerCase();

  return characters.value.filter(c => {
    if (q) {
      const matchName = c.name.toLowerCase().includes(q);
      const matchRole = c.role.toLowerCase().includes(q);
      const matchDesc = c.description.toLowerCase().includes(q);
      if (!matchName && !matchRole && !matchDesc) return false;
    }
    if (selectedTags.value.size > 0) {
      if (!c.tags.some(t => selectedTags.value.has(t))) return false;
    }
    if (tagQ) {
      if (!c.tags.some(t => t.toLowerCase().includes(tagQ))) return false;
    }
    return true;
  });
});

const totalPages = computed(() => Math.ceil(filteredCharacters.value.length / PAGE_SIZE));
const pagedCharacters = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return filteredCharacters.value.slice(start, start + PAGE_SIZE);
});

const toggleTag = (tag: string) => {
  if (selectedTags.value.has(tag)) {
    selectedTags.value.delete(tag);
  } else {
    selectedTags.value.add(tag);
  }
  currentPage.value = 1;
};

function changePage(page: number) {
  currentPage.value = Math.max(1, Math.min(totalPages.value, page));
}

watch([searchQuery, tagFilter], () => {
  currentPage.value = 1;
});

const syncFromQuery = () => {
  searchQuery.value = typeof route.query.q === 'string' ? route.query.q : '';
  focusedId.value = typeof route.query.focus === 'string' ? route.query.focus : '';
  const tagValue = typeof route.query.tag === 'string' ? route.query.tag.trim() : '';
  selectedTags.value.clear();
  if (tagValue) {
    tagValue
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .forEach((tag) => selectedTags.value.add(tag));
  }
};

const scrollToFocusedCard = async () => {
  if (!focusedId.value) return;
  await nextTick();
  document.getElementById(`character-${focusedId.value}`)?.scrollIntoView({
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

const closeModal = () => {
  showAddModal.value = false;
  showEditModal.value = false;
  form.value = { name: '', gender: '', age: 0, role: '', description: '', traits: [], tags: [] };
  traitsInput.value = '';
  tagsInput.value = '';
  editingId.value = null;
};

const saveCharacter = () => {
  if (!form.value.name.trim()) return;

  const traits = traitsInput.value
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0);

  const tags = tagsInput.value
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0);

  if (showEditModal.value && editingId.value) {
    updateCharacter(editingId.value, {
      ...form.value,
      traits,
      tags,
    });
  } else {
    addCharacter({
      ...form.value,
      traits,
      tags,
    });
  }

  closeModal();
};

const editCharacter = (char: Character) => {
  form.value = {
    name: char.name,
    gender: char.gender,
    age: char.age,
    role: char.role,
    description: char.description,
    traits: [...char.traits],
    tags: [...char.tags],
  };
  traitsInput.value = char.traits.join(', ');
  tagsInput.value = char.tags.join(', ');
  editingId.value = char.id;
  showEditModal.value = true;
};

const confirmDelete = (char: Character) => {
  characterToDelete.value = char;
  showDeleteModal.value = true;
};

const deleteCharacter = () => {
  if (characterToDelete.value) {
    deleteCharacterFromStore(characterToDelete.value.id);
    showDeleteModal.value = false;
    showDetailModal.value = false;
    characterToDelete.value = null;
    detailCharacter.value = null;
  }
};

const viewCharacter = (char: Character) => {
  detailCharacter.value = char;
  showDetailModal.value = true;
};

const closeDetailModal = () => {
  showDetailModal.value = false;
  detailCharacter.value = null;
};

const editFromDetail = () => {
  if (detailCharacter.value) {
    editCharacter(detailCharacter.value);
    showDetailModal.value = false;
  }
};

const deleteFromDetail = () => {
  if (detailCharacter.value) {
    confirmDelete(detailCharacter.value);
    showDetailModal.value = false;
  }
};
</script>

<style scoped>
.detail-window {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 51;
  display: flex;
  flex-direction: column;
  width: min(560px, calc(100vw - 2rem));
  max-height: 90vh;
  background: var(--surface);
  border-radius: var(--radius-2xl);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 1.25rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.detail-close-btn {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius);
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
}

.detail-close-btn:hover {
  background: var(--surface-alt);
  color: var(--text);
}

.detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
}

.detail-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--border);
  background: var(--surface);
}

.form-modal-window {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 51;
  width: min(560px, calc(100vw - 2rem));
  max-height: 90vh;
  padding: 1.5rem;
  overflow-y: auto;
  background: var(--surface);
  border-radius: var(--radius-2xl);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
}
</style>