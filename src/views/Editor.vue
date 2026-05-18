<template>
  <Layout>
    <div class="h-full flex flex-col">
      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-3">
          <select
            v-if="currentChapter"
            :value="currentChapter.volumeId"
            @change="changeChapterVolume(($event.target as HTMLSelectElement).value)"
            class="input w-32"
          >
            <option v-for="v in volumes" :key="v.id" :value="v.id">{{ v.title }}</option>
          </select>
          <select
            v-model="selectedChapterId"
            @change="onChapterChange"
            class="input w-64"
          >
            <option value="">选择章节...</option>
            <optgroup v-for="volume in volumes" :key="volume.id" :label="volume.title">
              <option
                v-for="chapter in getVolumeChapters(volume.id)"
                :key="chapter.id"
                :value="chapter.id"
              >
                {{ chapter.order + 1 }}. {{ chapter.title }}
              </option>
            </optgroup>
          </select>
          <button
            v-if="!selectedChapterId"
            @click="createNewChapter"
            class="btn btn-primary shrink-0"
          >
            <Plus class="w-4 h-4" />
            新建章节
          </button>
        </div>
        <div class="flex items-center gap-4">
          <span v-if="draftStatus" class="text-xs font-medium shrink-0" :class="draftStatus === '已保存' ? 'text-green-500' : 'text-[var(--text-muted)]'">
            {{ draftStatus }}
          </span>
          <span class="text-[var(--text-light)] text-sm font-medium shrink-0 tabular-nums bg-[var(--surface-alt)] px-3 py-1 rounded-lg">
            {{ wordCount.toLocaleString() }} 字
          </span>
          <button
            v-if="currentChapter"
            @click="previewMode = !previewMode"
            class="btn btn-secondary shrink-0"
            :title="previewMode ? '编辑' : '预览'"
          >
            <Eye class="w-4 h-4" />
            {{ previewMode ? '编辑' : '预览' }}
          </button>
          <button
            @click="save"
            :disabled="saving || !hasChanges"
            class="btn btn-primary disabled:opacity-50 shrink-0"
          >
            <Save class="w-4 h-4" />
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>

      <div class="flex-1 flex gap-8 min-h-0">
        <div class="flex-1 flex flex-col min-w-0">
          <input 
            v-if="currentChapter"
            v-model="chapterTitle"
            type="text"
            class="input text-2xl font-bold mb-4"
            placeholder="章节标题"
            style="font-size: 1.5rem; padding: 0.875rem 1rem;"
          />
          <textarea
            v-if="currentChapter && !previewMode"
            v-model="chapterContent"
            class="input flex-1 resize-none text-base leading-relaxed"
            placeholder="在这里开始写作..."
            @input="updateWordCount"
            style="font-size: 1rem; line-height: 1.8; padding: 1.25rem;"
          ></textarea>
          <div
            v-if="currentChapter && previewMode"
            class="input flex-1 overflow-y-auto text-base leading-relaxed preview-content"
            style="font-size: 1rem; line-height: 1.8; padding: 1.25rem;"
            v-html="renderedContent"
          ></div>
          <div v-else class="flex-1 flex items-center justify-center">
            <div class="text-center">
              <div class="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);">
                <FileText class="w-12 h-12" style="color: var(--primary);" />
              </div>
              <h3 class="text-xl font-semibold text-[var(--text)] mb-3">选择或创建章节</h3>
              <p class="text-[var(--text-light)] max-w-md mx-auto">在上方选择一个章节或创建新章节开始你的创作</p>
            </div>
          </div>
        </div>

        <div class="w-80 shrink-0">
          <div class="card pad-8 h-full">
            <button 
              @click="showSidebar = !showSidebar"
              class="flex items-center justify-between w-full text-[var(--text)] font-semibold mb-5"
            >
              <span class="flex items-center gap-2 text-lg">
                <BookOpen class="w-5 h-5" />
                写作助手
              </span>
              <ChevronDown 
                class="w-5 h-5 transition-transform"
                :class="showSidebar ? 'rotate-180' : ''"
              />
            </button>
            
            <div v-if="showSidebar" class="space-y-6 overflow-y-auto" style="max-height: calc(100% - 3rem);">
              <div class="space-y-3">
                <div class="relative">
                  <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    v-model="assistantQuery"
                    class="input input-with-left-icon text-sm"
                    placeholder="搜索角色/地点/物品..."
                  />
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="tag in assistantTags"
                    :key="tag"
                    class="px-2 py-1 text-xs rounded-lg border transition-colors"
                    :class="selectedAssistantTags.has(tag) ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'border-[var(--border)] text-[var(--text-light)] hover:bg-[var(--surface-alt)]'"
                    @click="toggleAssistantTag(tag)"
                  >
                    #{{ tag }}
                  </button>
                  <button
                    v-if="selectedAssistantTags.size > 0"
                    class="px-2 py-1 text-xs rounded-lg text-[var(--text-muted)] hover:text-[var(--text)]"
                    @click="selectedAssistantTags.clear()"
                  >
                    清除标签
                  </button>
                </div>
              </div>

              <div class="space-y-2">
                <div class="text-xs font-semibold text-[var(--text-muted)]">快捷新增</div>
                <div class="grid grid-cols-3 gap-2">
                  <button class="btn btn-secondary text-xs !px-2 !py-1.5" @click="activeQuickAdd = activeQuickAdd === 'character' ? null : 'character'">角色</button>
                  <button class="btn btn-secondary text-xs !px-2 !py-1.5" @click="activeQuickAdd = activeQuickAdd === 'scene' ? null : 'scene'">地点</button>
                  <button class="btn btn-secondary text-xs !px-2 !py-1.5" @click="activeQuickAdd = activeQuickAdd === 'item' ? null : 'item'">物品</button>
                </div>
                <div v-if="activeQuickAdd" class="pad-3 rounded-xl bg-[var(--surface-alt)] space-y-2">
                  <input v-model="quickAddForm.name" class="input text-sm" :placeholder="activeQuickAdd === 'item' ? '物品名称' : '名称'" />
                  <input v-if="activeQuickAdd === 'character'" v-model="quickAddForm.extra" class="input text-sm" placeholder="角色定位（如主角）" />
                  <input v-if="activeQuickAdd === 'scene'" v-model="quickAddForm.extra" class="input text-sm" placeholder="地点（如城主府）" />
                  <input v-if="activeQuickAdd === 'item'" v-model="quickAddForm.extra" class="input text-sm" placeholder="类型（如武器）" />
                  <input v-model="quickAddForm.tags" class="input text-sm" placeholder="标签（逗号分隔，可选）" />
                  <div class="flex justify-end gap-2">
                    <button class="btn btn-secondary text-xs !px-2.5 !py-1.5" @click="cancelQuickAdd">取消</button>
                    <button class="btn btn-primary text-xs !px-2.5 !py-1.5" @click="submitQuickAdd">添加</button>
                  </div>
                </div>
              </div>

              <div class="space-y-2">
                <h4 class="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                  <Users class="w-4 h-4" />
                  角色
                </h4>
                <div class="space-y-2">
                  <div
                    v-for="char in assistantCharacters"
                    :key="char.id"
                    class="pad-3-5 rounded-xl bg-[var(--surface-alt)] text-sm cursor-pointer hover:bg-[var(--surface-hover)] transition-all"
                    @click="openKnowledgeDetail('character', char.id)"
                  >
                    <div class="font-semibold text-[var(--text)]">{{ char.name }}</div>
                    <div class="text-[var(--text-muted)] text-xs mt-1">{{ char.role || '未设置定位' }}</div>
                  </div>
                  <div v-if="assistantCharacters.length === 0" class="text-[var(--text-muted)] text-sm pad-3-5">暂无匹配角色</div>
                </div>
              </div>

              <div class="space-y-2">
                <h4 class="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                  <Map class="w-4 h-4" />
                  地点
                </h4>
                <div class="space-y-2">
                  <div
                    v-for="scene in assistantScenes"
                    :key="scene.id"
                    class="pad-3-5 rounded-xl bg-[var(--surface-alt)] text-sm cursor-pointer hover:bg-[var(--surface-hover)] transition-all"
                    @click="openKnowledgeDetail('scene', scene.id)"
                  >
                    <div class="font-semibold text-[var(--text)]">{{ scene.name }}</div>
                    <div class="text-[var(--text-muted)] text-xs mt-1">{{ scene.location || '未设置地点' }}</div>
                  </div>
                  <div v-if="assistantScenes.length === 0" class="text-[var(--text-muted)] text-sm pad-3-5">暂无匹配地点</div>
                </div>
              </div>

              <div class="space-y-2">
                <h4 class="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                  <Package class="w-4 h-4" />
                  物品
                </h4>
                <div class="space-y-2">
                  <div
                    v-for="item in assistantItems"
                    :key="item.id"
                    class="pad-3-5 rounded-xl bg-[var(--surface-alt)] text-sm cursor-pointer hover:bg-[var(--surface-hover)] transition-all"
                    @click="openKnowledgeDetail('item', item.id)"
                  >
                    <div class="font-semibold text-[var(--text)]">{{ item.name }}</div>
                    <div class="text-[var(--text-muted)] text-xs mt-1">{{ item.type || '未设置类型' }}</div>
                  </div>
                  <div v-if="assistantItems.length === 0" class="text-[var(--text-muted)] text-sm pad-3-5">暂无匹配物品</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 新建章节模态框 -->
    <div v-if="showNewChapterModal" class="fixed inset-0 flex items-center justify-center z-50 pad-4" style="background: rgba(0,0,0,0.3); backdrop-filter: blur(4px);" @click.self="showNewChapterModal = false">
      <div class="card w-full max-w-md pad-8">
        <h2 class="text-2xl font-bold text-[var(--text)] mb-6">新建章节</h2>
        <div class="space-y-5">
          <div>
            <label class="block text-sm font-semibold text-[var(--text)] mb-2">所属卷</label>
            <select v-model="newChapterVolumeId" class="input">
              <option v-for="v in volumes" :key="v.id" :value="v.id">{{ v.title }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold text-[var(--text)] mb-2">章节标题</label>
            <input
              v-model="newChapterTitle"
              type="text"
              class="input"
              placeholder="输入章节标题"
            />
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-7">
          <button @click="showNewChapterModal = false" class="btn btn-secondary">取消</button>
          <button @click="confirmCreateChapter" class="btn btn-primary">创建</button>
        </div>
      </div>
    </div>

    <div v-if="selectedKnowledge" class="fixed inset-0 bg-black/45 flex items-center justify-center z-50 pad-4" @click.self="selectedKnowledge = null">
      <div class="card w-full max-w-lg pad-8">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-xs text-[var(--text-muted)]">{{ knowledgeTypeLabel }}</div>
            <h3 class="text-xl font-bold text-[var(--text)] mt-1">{{ knowledgeTitle }}</h3>
          </div>
          <button class="text-[var(--text-muted)] hover:text-[var(--text)]" @click="selectedKnowledge = null">
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="mt-5 text-sm text-[var(--text-light)] whitespace-pre-wrap leading-relaxed">{{ knowledgeDescription }}</div>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { FileText, Plus, Save, BookOpen, Users, Map, ChevronDown, Eye, Search, Package, X } from 'lucide-vue-next';
import Layout from '../components/Layout.vue';
import { useStore } from '../store';
import type { Chapter } from '../types';

const route = useRoute();
const router = useRouter();
const {
  volumes,
  chapters,
  characters,
  scenes,
  items,
  currentChapter,
  setCurrentChapter,
  updateChapter,
  addChapter,
  addCharacter,
  addScene,
  addItem,
  saveDraft,
  loadDraft,
  removeDraft,
  saveBackup,
} = useStore();

const selectedChapterId = ref<string>('');
const chapterTitle = ref('');
const chapterContent = ref('');
const wordCount = ref(0);
const saving = ref(false);
const previewMode = ref(false);
const showSidebar = ref(false);
const showNewChapterModal = ref(false);

const anyModalOpenEditor = computed(() => showNewChapterModal.value);
watch(anyModalOpenEditor, (open) => {
  document.body.style.overflow = open ? 'hidden' : '';
});

const newChapterTitle = ref('');
const newChapterVolumeId = ref('');
const draftStatus = ref('');
const lastSavedTitle = ref('');
const lastSavedContent = ref('');
const assistantQuery = ref('');
const selectedAssistantTags = ref(new Set<string>());
const activeQuickAdd = ref<'character' | 'scene' | 'item' | null>(null);
const quickAddForm = ref({ name: '', extra: '', tags: '' });
const selectedKnowledge = ref<{ type: 'character' | 'scene' | 'item'; id: string } | null>(null);
let draftTimer: ReturnType<typeof setTimeout> | null = null;

const hasChanges = computed(() => {
  return chapterTitle.value !== lastSavedTitle.value || chapterContent.value !== lastSavedContent.value;
});

const renderedContent = computed(() => {
  const text = chapterContent.value;
  if (!text) return '<p class="preview-empty">暂无内容</p>';
  return text
    .split(/\n\n+/)
    .map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (/^### /.test(trimmed)) return `<h3>${escapeHtml(trimmed.slice(4))}</h3>`;
      if (/^## /.test(trimmed)) return `<h2>${escapeHtml(trimmed.slice(3))}</h2>`;
      if (/^# /.test(trimmed)) return `<h1>${escapeHtml(trimmed.slice(2))}</h1>`;
      let html = escapeHtml(trimmed);
      html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
      return `<p>${html}</p>`;
    })
    .filter(Boolean)
    .join('\n');
});

const sortedChapters = computed(() => {
  return [...chapters.value].sort((a, b) => a.order - b.order);
});

const assistantTags = computed(() => {
  const tags = new Set<string>();
  characters.value.forEach((character) => character.tags.forEach((tag) => tags.add(tag)));
  scenes.value.forEach((scene) => scene.atmosphere.forEach((tag) => tags.add(tag)));
  items.value.forEach((item) => item.abilities.forEach((tag) => tags.add(tag)));
  return [...tags].filter(Boolean).sort();
});

const normalizedAssistantQuery = computed(() => assistantQuery.value.trim().toLowerCase());

const assistantCharacters = computed(() => {
  const query = normalizedAssistantQuery.value;
  return characters.value.filter((character) => {
    const byText = !query || [
      character.name,
      character.role,
      character.description,
      character.tags.join(' '),
    ].join(' ').toLowerCase().includes(query);
    const byTags = selectedAssistantTags.value.size === 0
      || character.tags.some((tag) => selectedAssistantTags.value.has(tag));
    return byText && byTags;
  });
});

const assistantScenes = computed(() => {
  const query = normalizedAssistantQuery.value;
  return scenes.value.filter((scene) => {
    const byText = !query || [
      scene.name,
      scene.location,
      scene.description,
      scene.atmosphere.join(' '),
    ].join(' ').toLowerCase().includes(query);
    const byTags = selectedAssistantTags.value.size === 0
      || scene.atmosphere.some((tag) => selectedAssistantTags.value.has(tag));
    return byText && byTags;
  });
});

const assistantItems = computed(() => {
  const query = normalizedAssistantQuery.value;
  return items.value.filter((item) => {
    const byText = !query || [
      item.name,
      item.type,
      item.description,
      item.owner,
      item.abilities.join(' '),
    ].join(' ').toLowerCase().includes(query);
    const byTags = selectedAssistantTags.value.size === 0
      || item.abilities.some((tag) => selectedAssistantTags.value.has(tag));
    return byText && byTags;
  });
});

const selectedCharacter = computed(() =>
  selectedKnowledge.value?.type === 'character'
    ? characters.value.find((item) => item.id === selectedKnowledge.value?.id)
    : null
);

const selectedScene = computed(() =>
  selectedKnowledge.value?.type === 'scene'
    ? scenes.value.find((item) => item.id === selectedKnowledge.value?.id)
    : null
);

const selectedItem = computed(() =>
  selectedKnowledge.value?.type === 'item'
    ? items.value.find((item) => item.id === selectedKnowledge.value?.id)
    : null
);

const knowledgeTypeLabel = computed(() => {
  if (selectedKnowledge.value?.type === 'character') return '角色信息';
  if (selectedKnowledge.value?.type === 'scene') return '地点信息';
  if (selectedKnowledge.value?.type === 'item') return '物品信息';
  return '';
});

const knowledgeTitle = computed(() => {
  if (selectedCharacter.value) return selectedCharacter.value.name;
  if (selectedScene.value) return selectedScene.value.name;
  if (selectedItem.value) return selectedItem.value.name;
  return '';
});

const knowledgeDescription = computed(() => {
  if (selectedCharacter.value) {
    const character = selectedCharacter.value;
    return [
      character.role ? `定位：${character.role}` : '',
      character.gender ? `性别：${character.gender}` : '',
      character.age ? `年龄：${character.age}` : '',
      character.tags.length ? `标签：${character.tags.join('、')}` : '',
      character.description || '',
    ].filter(Boolean).join('\n');
  }
  if (selectedScene.value) {
    const scene = selectedScene.value;
    return [
      scene.location ? `地点：${scene.location}` : '',
      scene.atmosphere.length ? `氛围：${scene.atmosphere.join('、')}` : '',
      scene.description || '',
    ].filter(Boolean).join('\n');
  }
  if (selectedItem.value) {
    const item = selectedItem.value;
    return [
      item.type ? `类型：${item.type}` : '',
      item.owner ? `所属：${item.owner}` : '',
      item.abilities.length ? `能力：${item.abilities.join('、')}` : '',
      item.description || '',
    ].filter(Boolean).join('\n');
  }
  return '';
});

const getVolumeChapters = (volumeId: string) => {
  return chapters.value.filter(c => c.volumeId === volumeId).sort((a, b) => a.order - b.order);
};

const triggerAutoSave = () => {
  if (!selectedChapterId.value) return;
  if (!hasChanges.value) return;
  if (draftTimer) clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    if (!hasChanges.value) return;
    saveDraft(selectedChapterId.value, chapterTitle.value, chapterContent.value, wordCount.value);
    draftStatus.value = '已保存';
    setTimeout(() => { draftStatus.value = ''; }, 2000);
  }, 2000);
  draftStatus.value = '未保存';
};

onMounted(() => {
  const id = route.params.id as string;
  if (id) {
    selectedChapterId.value = id;
    setCurrentChapter(id);
    loadChapterData(id);
  }
});

onUnmounted(() => {
  if (draftTimer) clearTimeout(draftTimer);
  window.removeEventListener('novel-ai-insert', handleAiInsert as EventListener);
});

watch(selectedChapterId, (newId, oldId) => {
  // save draft of previous chapter before switching
  if (oldId) {
    saveDraft(oldId, chapterTitle.value, chapterContent.value, wordCount.value);
  }
  if (newId) {
    setCurrentChapter(newId);
    loadChapterData(newId);
  } else {
    setCurrentChapter(null);
    chapterTitle.value = '';
    chapterContent.value = '';
    wordCount.value = 0;
  }
});

// watch for content changes and auto-save draft
watch([chapterTitle, chapterContent], () => {
  triggerAutoSave();
});

onMounted(() => {
  window.addEventListener('novel-ai-insert', handleAiInsert as EventListener);
});

const loadChapterData = (id: string) => {
  const draft = loadDraft(id);
  const chapter = chapters.value.find(c => c.id === id);

  if (draft && chapter) {
    const draftTime = new Date(draft.savedAt).getTime();
    const saveTime = new Date(chapter.updatedAt).getTime();
    if (draftTime > saveTime) {
      chapterTitle.value = draft.title;
      chapterContent.value = draft.content;
      wordCount.value = draft.wordCount;
      lastSavedTitle.value = chapter.title;
      lastSavedContent.value = chapter.content;
      draftStatus.value = '已恢复草稿';
      setTimeout(() => { draftStatus.value = ''; }, 3000);
      return;
    }
  }
  // also load draft if chapter is empty (newly created)
  if (draft && chapter && !chapter.content && draft.content) {
    chapterTitle.value = draft.title;
    chapterContent.value = draft.content;
    wordCount.value = draft.wordCount;
    lastSavedTitle.value = chapter.title;
    lastSavedContent.value = chapter.content;
    return;
  }
  if (chapter) {
    lastSavedTitle.value = chapter.title;
    lastSavedContent.value = chapter.content;
    chapterTitle.value = chapter.title;
    chapterContent.value = chapter.content;
    wordCount.value = chapter.wordCount;
  }
};

const onChapterChange = () => {
  if (selectedChapterId.value) {
    router.push(`/editor/${selectedChapterId.value}`);
  } else {
    router.push('/editor');
  }
};

const updateWordCount = () => {
  const text = chapterContent.value.replace(/\s/g, '');
  wordCount.value = text.length;
};

const save = async () => {
  if (!selectedChapterId.value) return;
  if (!hasChanges.value) return;

  saving.value = true;
  try {
    updateChapter(selectedChapterId.value, {
      title: chapterTitle.value,
      content: chapterContent.value,
      wordCount: wordCount.value,
    });
    removeDraft(selectedChapterId.value);
    lastSavedTitle.value = chapterTitle.value;
    lastSavedContent.value = chapterContent.value;
    saveBackup();
    draftStatus.value = '已保存';
    setTimeout(() => { draftStatus.value = ''; }, 2000);
  } finally {
    saving.value = false;
  }
};

function handleAiInsert(event: Event) {
  const customEvent = event as CustomEvent<string>;
  const text = typeof customEvent.detail === 'string' ? customEvent.detail.trim() : '';
  if (!text) return;
  chapterContent.value = chapterContent.value
    ? `${chapterContent.value}\n\n${text}`
    : text;
  updateWordCount();
}

const toggleAssistantTag = (tag: string) => {
  if (selectedAssistantTags.value.has(tag)) {
    selectedAssistantTags.value.delete(tag);
  } else {
    selectedAssistantTags.value.add(tag);
  }
};

const cancelQuickAdd = () => {
  activeQuickAdd.value = null;
  quickAddForm.value = { name: '', extra: '', tags: '' };
};

const submitQuickAdd = () => {
  const name = quickAddForm.value.name.trim();
  if (!name || !activeQuickAdd.value) return;
  const tags = quickAddForm.value.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (activeQuickAdd.value === 'character') {
    addCharacter({
      name,
      gender: '',
      age: 0,
      role: quickAddForm.value.extra.trim(),
      description: '',
      traits: [],
      tags,
    });
  } else if (activeQuickAdd.value === 'scene') {
    addScene({
      name,
      location: quickAddForm.value.extra.trim(),
      description: '',
      atmosphere: tags,
    });
  } else {
    addItem({
      name,
      type: quickAddForm.value.extra.trim() || '其他',
      description: '',
      owner: '',
      abilities: tags,
    });
  }
  cancelQuickAdd();
};

const openKnowledgeDetail = (type: 'character' | 'scene' | 'item', id: string) => {
  selectedKnowledge.value = { type, id };
};

const createNewChapter = () => {
  newChapterTitle.value = '';
  newChapterVolumeId.value = volumes.value[0]?.id || '';
  showNewChapterModal.value = true;
};

const confirmCreateChapter = () => {
  if (!newChapterTitle.value.trim()) return;

  const newChapter = addChapter({
    title: newChapterTitle.value,
    content: '',
    wordCount: 0,
    status: 'draft',
    volumeId: newChapterVolumeId.value || volumes.value[0]?.id || '',
  });

  showNewChapterModal.value = false;
  selectedChapterId.value = newChapter.id;
  router.push(`/editor/${newChapter.id}`);
};

const changeChapterVolume = (volumeId: string) => {
  if (!selectedChapterId.value) return;
  updateChapter(selectedChapterId.value, { volumeId });
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
</script>

<style scoped>
.preview-content {
  background: var(--surface);
  border-color: var(--border);
  white-space: pre-wrap;
  word-break: break-word;
}

.preview-content :deep(h1) {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 1.5rem 0 0.75rem;
  color: var(--text);
}

.preview-content :deep(h2) {
  font-size: 1.4rem;
  font-weight: 600;
  margin: 1.25rem 0 0.5rem;
  color: var(--text);
}

.preview-content :deep(h3) {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
  color: var(--text);
}

.preview-content :deep(p) {
  margin: 0 0 0.75rem;
  text-indent: 2em;
  color: var(--text);
}

.preview-content :deep(strong) {
  font-weight: 600;
  color: var(--text);
}

.preview-content :deep(em) {
  font-style: italic;
  color: var(--text-light);
}

.preview-content :deep(.preview-empty) {
  color: var(--text-muted);
  font-style: italic;
  text-indent: 0;
}
</style>
