<template>
  <Layout>
    <div class="h-full flex flex-col">
      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-5">
          <select
            v-if="currentChapter"
            :value="currentChapter.volumeId"
            @change="changeChapterVolume(($event.target as HTMLSelectElement).value)"
            class="input w-36"
          >
            <option v-for="v in volumes" :key="v.id" :value="v.id">{{ v.title }}</option>
          </select>
          <select
            v-model="selectedChapterId"
            @change="onChapterChange"
            class="input w-72"
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
            class="btn btn-primary"
          >
            <Plus class="w-4 h-4" />
            新建章节
          </button>
        </div>
        <div class="flex items-center gap-4">
          <span v-if="draftStatus" class="text-xs font-medium" :class="draftStatus === '已保存' ? 'text-green-500' : 'text-[var(--text-muted)]'">
            {{ draftStatus }}
          </span>
          <span class="text-[var(--text-light)] text-sm font-medium">
            {{ wordCount.toLocaleString() }} 字
          </span>
          <button
            @click="save"
            :disabled="saving"
            class="btn btn-primary disabled:opacity-50"
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
            v-if="currentChapter"
            v-model="chapterContent"
            class="input flex-1 resize-none text-base leading-relaxed"
            placeholder="在这里开始写作..."
            @input="updateWordCount"
            style="font-size: 1rem; line-height: 1.8; padding: 1.25rem;"
          ></textarea>
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
            
            <div v-if="showSidebar" class="space-y-8 overflow-y-auto" style="max-height: calc(100% - 3rem);">
              <div>
                <h4 class="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                  <Users class="w-4 h-4" />
                  相关角色
                </h4>
                <div class="space-y-2">
                  <div 
                    v-for="char in characters" 
                    :key="char.id"
                    class="pad-3-5 rounded-xl bg-[var(--surface-alt)] text-sm cursor-pointer hover:bg-[var(--surface-hover)] transition-all"
                  >
                    <div class="font-semibold text-[var(--text)]">{{ char.name }}</div>
                    <div class="text-[var(--text-muted)] text-xs mt-1">{{ char.role }}</div>
                  </div>
                  <div v-if="characters.length === 0" class="text-[var(--text-muted)] text-sm pad-3-5">
                    还没有角色
                  </div>
                </div>
              </div>

              <div>
                <h4 class="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                  <Map class="w-4 h-4" />
                  相关场景
                </h4>
                <div class="space-y-2">
                  <div 
                    v-for="scene in scenes" 
                    :key="scene.id"
                    class="pad-3-5 rounded-xl bg-[var(--surface-alt)] text-sm cursor-pointer hover:bg-[var(--surface-hover)] transition-all"
                  >
                    <div class="font-semibold text-[var(--text)]">{{ scene.name }}</div>
                    <div class="text-[var(--text-muted)] text-xs mt-1">{{ scene.location }}</div>
                  </div>
                  <div v-if="scenes.length === 0" class="text-[var(--text-muted)] text-sm pad-3-5">
                    还没有场景
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 新建章节模态框 -->
    <div v-if="showNewChapterModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pad-4" @click.self="showNewChapterModal = false">
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
  </Layout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { FileText, Plus, Save, BookOpen, Users, Map, ChevronDown } from 'lucide-vue-next';
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
  currentChapter,
  setCurrentChapter,
  updateChapter,
  addChapter,
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
const showSidebar = ref(true);
const showNewChapterModal = ref(false);
const newChapterTitle = ref('');
const newChapterVolumeId = ref('');
const draftStatus = ref('');
let draftTimer: ReturnType<typeof setTimeout> | null = null;

const sortedChapters = computed(() => {
  return [...chapters.value].sort((a, b) => a.order - b.order);
});

const getVolumeChapters = (volumeId: string) => {
  return chapters.value.filter(c => c.volumeId === volumeId).sort((a, b) => a.order - b.order);
};

const triggerAutoSave = () => {
  if (!selectedChapterId.value) return;
  if (draftTimer) clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
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
    return;
  }
  if (chapter) {
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

  saving.value = true;
  try {
    updateChapter(selectedChapterId.value, {
      title: chapterTitle.value,
      content: chapterContent.value,
      wordCount: wordCount.value,
    });
    removeDraft(selectedChapterId.value);
    saveBackup();
    draftStatus.value = '已保存';
    setTimeout(() => { draftStatus.value = ''; }, 2000);
  } finally {
    saving.value = false;
  }
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
</script>
