<template>
  <Layout>
    <div class="home-page space-y-8">
      <section class="hero-banner card">
        <div class="hero-title-wrap">
          <p class="hero-kicker">小说工坊</p>
          <h1 class="text-3xl font-bold text-[var(--text)]">欢迎回来！</h1>
          <p class="text-[var(--text-light)] text-lg mt-2">继续你的创作之旅</p>
        </div>
        <div class="hero-actions">
          <button @click="goToEditor" class="btn btn-primary home-action-btn" aria-label="开始写作">
            <Edit class="w-4 h-4" />
            开始写作
          </button>
          <button @click="goToChapters" class="btn btn-secondary home-action-btn" aria-label="新建章节">
            <Plus class="w-4 h-4" />
            新建章节
          </button>
          <button @click="goToCharacters" class="btn btn-secondary home-action-btn" aria-label="新建角色">
            <UserPlus class="w-4 h-4" />
            新建角色
          </button>
        </div>
      </section>

      <div>
        <h2 class="section-title">创作概览</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
        <StatCard
          icon="Package"
          :value="totalItems"
          label="物品数量"
          color="accent"
        />
      </div>

      <div v-if="recentChapters.length > 0" class="card p-8 recent-panel">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-[var(--text)]">最近编辑</h2>
        </div>
        <div class="space-y-3">
          <div 
            v-for="chapter in recentChapters" 
            :key="chapter.id"
            class="recent-item flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all group"
            @click="editChapter(chapter.id)"
          >
            <div class="flex items-center gap-4">
              <div class="recent-icon w-12 h-12 rounded-xl flex items-center justify-center">
                <FileText class="w-6 h-6 text-[var(--primary)]" />
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
import { FileText, Type, Users, Map, Package, Edit, Plus, UserPlus, ChevronRight } from 'lucide-vue-next';
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
  totalItems,
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

<style scoped>
.home-page {
  --hero-bg: linear-gradient(125deg, rgba(99, 102, 241, 0.12), rgba(139, 92, 246, 0.06));
}

.hero-banner {
  padding: 2rem;
  border-color: rgba(99, 102, 241, 0.15);
  background-color: var(--surface);
  background-image: var(--hero-bg);
  display: flex;
  gap: 1.5rem;
  justify-content: space-between;
  align-items: center;
}

.hero-kicker {
  color: var(--primary);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.hero-title-wrap {
  max-width: 38rem;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: flex-end;
}

.home-action-btn {
  min-width: 6.75rem;
}

.section-title {
  font-size: 1.05rem;
  line-height: 1.4;
  font-weight: 700;
  color: var(--text);
}

.recent-panel {
  border-color: rgba(99, 102, 241, 0.12);
}

.recent-item {
  background: var(--surface);
  border: 1px solid transparent;
}

.recent-item:hover {
  border-color: rgba(99, 102, 241, 0.2);
  background: var(--surface-hover);
}

.recent-icon {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.14), rgba(139, 92, 246, 0.1));
}

@media (max-width: 768px) {
  .hero-banner {
    flex-direction: column;
    align-items: flex-start;
    padding: 1.5rem;
  }

  .hero-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
