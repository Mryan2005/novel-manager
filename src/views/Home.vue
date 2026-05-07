<template>
  <Layout>
    <div class="space-y-8">
      <div>
        <h1 class="text-3xl font-bold text-[var(--text)] mb-2">欢迎回来！</h1>
        <p class="text-[var(--text-light)] text-lg">继续你的创作之旅</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon="FileText" 
          :value="totalChapters" 
          label="总章节数" 
          color="primary"
        />
        <StatCard 
          icon="Type" 
          :value="formatNumber(totalWords)" 
          label="总字数" 
          color="secondary"
        />
        <StatCard 
          icon="Users" 
          :value="totalCharacters" 
          label="角色数量" 
          color="accent"
        />
        <StatCard 
          icon="Map" 
          :value="totalScenes" 
          label="场景数量" 
          color="success"
        />
      </div>

      <div class="flex flex-col sm:flex-row gap-4">
        <button @click="goToEditor" class="btn btn-primary flex-1 sm:flex-none">
          <Edit class="w-4 h-4" />
          开始写作
        </button>
        <button @click="goToChapters" class="btn btn-secondary">
          <Plus class="w-4 h-4" />
          新建章节
        </button>
        <button @click="goToCharacters" class="btn btn-secondary">
          <UserPlus class="w-4 h-4" />
          新建角色
        </button>
      </div>

      <div v-if="recentChapters.length > 0" class="card p-8">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-[var(--text)]">最近编辑</h2>
        </div>
        <div class="space-y-3">
          <div 
            v-for="chapter in recentChapters" 
            :key="chapter.id"
            class="flex items-center justify-between p-4 rounded-xl hover:bg-[var(--surface-hover)] cursor-pointer transition-all group"
            @click="editChapter(chapter.id)"
          >
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);">
                <FileText class="w-6 h-6" style="color: var(--primary);" />
              </div>
              <div>
                <h3 class="font-semibold text-[var(--text)] group-hover:text-[var(--primary)] transition-colors">{{ chapter.title }}</h3>
                <p class="text-sm text-[var(--text-muted)] mt-1">{{ formatDate(chapter.updatedAt) }} · {{ chapter.wordCount }} 字</p>
              </div>
            </div>
            <ChevronRight class="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { FileText, Type, Users, Map, Edit, Plus, UserPlus, ChevronRight } from 'lucide-vue-next';
import Layout from '../components/Layout.vue';
import StatCard from '../components/StatCard.vue';
import { useStore } from '../store';
import type { Chapter } from '../types';

const router = useRouter();
const { 
  totalChapters, 
  totalWords, 
  totalCharacters, 
  totalScenes, 
  chapters,
  setCurrentChapter 
} = useStore();

const recentChapters = computed(() => {
  return [...chapters.value]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);
});

const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const goToEditor = () => {
  if (chapters.value.length > 0) {
    const recent = recentChapters.value[0];
    if (recent) {
      setCurrentChapter(recent.id);
      router.push(`/editor/${recent.id}`);
      return;
    }
  }
  router.push('/editor');
};

const goToChapters = () => {
  router.push('/chapters');
};

const goToCharacters = () => {
  router.push('/characters');
};

const editChapter = (id: string) => {
  setCurrentChapter(id);
  router.push(`/editor/${id}`);
};
</script>
