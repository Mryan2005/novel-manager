<template>
  <Layout>
    <div class="page-space">
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
          <button @click="showReorder = true" class="btn btn-secondary" :disabled="chapters.length < 2">
            <List class="w-4 h-4" />
            排序
          </button>
          <button @click="showGraph = true" class="btn btn-secondary">
            <Share2 class="w-4 h-4" />
            关系图
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
                      <h3 class="font-semibold truncate" :class="chapter.status === 'discarded' ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text)]'">{{ chapter.title.length > 15 ? chapter.title.slice(0, 15) + '...' : chapter.title }}</h3>
                      <span class="tag" :class="statusClass(chapter.status)">{{ statusText(chapter.status) }}</span>
                    </div>
                    <p class="text-sm text-[var(--text-muted)]">
                      {{ chapter.wordCount.toLocaleString() }} 字 · 最后编辑 {{ formatDate(chapter.updatedAt) }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-1">
                  <div class="relative copy-menu-wrap" @click.stop>
                    <button @click.stop="toggleCopyMenu(chapter.id)" class="pad-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-light)] hover:text-[var(--primary)] transition-all" title="复制">
                      <Copy class="w-4 h-4" />
                    </button>
                    <div v-if="copyMenuChapterId === chapter.id" class="dropdown-menu">
                      <button @click.stop="copyChapterContent(chapter, false); copyMenuChapterId = null" class="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-alt)] flex items-center gap-2">
                        <Copy class="w-3.5 h-3.5" />
                        复制内容
                      </button>
                      <button @click.stop="copyChapterContent(chapter, true); copyMenuChapterId = null" class="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-alt)] flex items-center gap-2">
                        <Copy class="w-3.5 h-3.5" />
                        复制内容 + 作者的话
                      </button>
                    </div>
                  </div>
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
    <Teleport to="body">
      <div v-if="showVolumeModal" class="fixed inset-0 flex items-center justify-center z-50 pad-4" style="background: rgba(0,0,0,0.3); backdrop-filter: blur(4px);" @click.self="closeVolumeModal">
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
    </Teleport>

    <!-- 章节 添加/编辑模态框 -->
    <Teleport to="body">
      <div v-if="showChapterModal" class="fixed inset-0 flex items-center justify-center z-50 pad-4" style="background: rgba(0,0,0,0.3); backdrop-filter: blur(4px);" @click.self="closeChapterModal">
        <div class="card w-full max-w-xl pad-8 overflow-y-auto" style="max-height: 90vh;">
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
                <option value="discarded">废稿</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-[var(--text)] mb-2">所属系列</label>
              <div class="flex gap-2">
                <select v-model="chapterForm.seriesId" class="input flex-1">
                  <option value="">无系列</option>
                  <option v-for="series in chapterSeries" :key="series.id" :value="series.id">
                    {{ series.title || '未命名系列' }}
                  </option>
                </select>
                <button class="btn btn-secondary shrink-0" @click="quickSeriesMode = !quickSeriesMode" title="快速创建系列">
                  <Plus class="w-4 h-4" />
                </button>
              </div>
              <div v-if="quickSeriesMode" class="flex gap-2 mt-2">
                <input v-model="newSeriesTitle" class="input text-sm flex-1" placeholder="新系列名称" @keyup.enter="quickCreateSeries" />
                <button class="btn btn-primary text-sm shrink-0" @click="quickCreateSeries">创建</button>
              </div>
            </div>

            <div v-if="editingChapter" class="border-t border-[var(--border)] pt-5 space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold text-[var(--text)]">章节关系</h3>
                <span class="text-xs text-[var(--text-muted)]">{{ chapterRelations.length }} 条关系</span>
              </div>

              <div class="space-y-2">
                <select v-model="relationForm.fromChapterId" class="input text-sm">
                  <option value="">选择前置章节</option>
                  <option v-for="chapter in precedingChapters" :key="chapter.id" :value="chapter.id">
                    {{ chapter.title || '未命名章节' }}
                  </option>
                </select>
                <div class="text-sm text-[var(--text-muted)] pad-3 rounded-lg bg-[var(--surface-alt)]">
                  指向 → {{ editingChapter.title || '当前章节' }}
                </div>
                <input v-model="relationForm.label" class="input text-sm" placeholder="关系说明（可选）" />
                <button class="btn btn-primary w-full" @click="createRelation">添加关系</button>
                <p v-if="relationError" class="text-xs text-[var(--error)]">{{ relationError }}</p>
              </div>

              <div v-if="chapterRelations.length === 0" class="text-sm text-[var(--text-muted)]">
                暂无关系，添加后将显示在关系图中。
              </div>
              <div v-else class="space-y-2 max-h-40 overflow-y-auto pr-1">
                <div v-for="relation in currentChapterRelations" :key="relation.id" class="flex items-center justify-between">
                  <div class="text-sm text-[var(--text)]">
                    {{ chapterName(relation.fromChapterId) }}
                    <span class="text-[var(--text-muted)]">→</span>
                    {{ chapterName(relation.toChapterId) }}
                    <span v-if="relation.label" class="text-xs text-[var(--text-muted)] ml-1">({{ relation.label }})</span>
                  </div>
                  <button class="btn btn-secondary text-xs shrink-0" @click="removeRelation(relation.id)">删除</button>
                </div>
              </div>
            </div>

          </div>
          <div class="flex justify-end gap-3 mt-7">
            <button @click="closeChapterModal" class="btn btn-secondary">取消</button>
            <button @click="saveChapter" class="btn btn-primary">保存</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 删除卷确认 -->
    <Teleport to="body">
      <div v-if="showDeleteVolumeModal" class="fixed inset-0 flex items-center justify-center z-50 pad-4" style="background: rgba(0,0,0,0.3); backdrop-filter: blur(4px);" @click.self="showDeleteVolumeModal = false">
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
    </Teleport>

    <!-- 删除章节确认 -->
    <Teleport to="body">
      <div v-if="showDeleteChapterModal" class="fixed inset-0 flex items-center justify-center z-50 pad-4" style="background: rgba(0,0,0,0.3); backdrop-filter: blur(4px);" @click.self="showDeleteChapterModal = false">
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
    </Teleport>

    <!-- 章节排序模态框 -->
    <Teleport to="body">
      <div v-if="showReorder" class="fixed inset-0 z-50 flex items-center justify-center pad-4" style="background: rgba(0,0,0,0.3); backdrop-filter: blur(4px);" @click.self="showReorder = false">
        <div class="card w-full pad-8 overflow-y-auto" style="max-width: 700px; max-height: 85vh;">
          <h2 class="text-xl font-bold text-[var(--text)] mb-1">调整章节顺序</h2>
          <p class="text-sm text-[var(--text-muted)] mb-5">使用上下箭头调整顺序，或直接修改章节所属卷</p>
          <div class="space-y-2">
            <div v-for="vol in sortedVolumes" :key="vol.id" class="mb-4">
              <h3 class="text-sm font-semibold text-[var(--text)] mb-2 px-1 flex items-center gap-2">
                <FolderOpen class="w-4 h-4 text-[var(--primary)]" />
                {{ vol.title }}
                <span class="text-xs text-[var(--text-muted)] font-normal">({{ getVolumeChapterCount(vol.id) }} 章)</span>
              </h3>
              <div v-for="(chapter, idx) in getVolumeChaptersForReorder(vol.id)" :key="chapter.id"
                class="flex items-center gap-3 pad-3 rounded-lg bg-[var(--surface-alt)] mb-1.5">
                <span class="text-xs text-[var(--text-muted)] w-6 text-center tabular-nums font-mono">{{ idx + 1 }}</span>
                <span class="flex-1 text-sm font-medium text-[var(--text)] truncate">{{ chapter.title }}</span>
                <div class="flex items-center gap-1">
                  <button @click="moveChapterInVolume(chapter, -1)" :disabled="idx === 0"
                    class="pad-1 rounded hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-30 disabled:cursor-not-allowed" title="上移">
                    <ChevronUp class="w-3.5 h-3.5" />
                  </button>
                  <button @click="moveChapterInVolume(chapter, 1)" :disabled="idx === getVolumeChapterCount(vol.id) - 1"
                    class="pad-1 rounded hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-30 disabled:cursor-not-allowed" title="下移">
                    <ChevronDown class="w-3.5 h-3.5" />
                  </button>
                  <button @click="moveChapterToTop(chapter, vol.id)" :disabled="idx === 0"
                    class="pad-1 rounded hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-30 disabled:cursor-not-allowed" title="移至最前">
                    <ChevronsUp class="w-3.5 h-3.5" />
                  </button>
                  <button @click="moveChapterToBottom(chapter, vol.id)" :disabled="idx === getVolumeChapterCount(vol.id) - 1"
                    class="pad-1 rounded hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-30 disabled:cursor-not-allowed" title="移至最后">
                    <ChevronsDown class="w-3.5 h-3.5" />
                  </button>
                  <select :value="chapter.volumeId" @change="changeChapterVolumeInReorder(chapter, ($event.target as HTMLSelectElement).value)"
                    class="text-xs pad-1 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] ml-2" style="max-width: 120px;">
                    <option v-for="v in volumes" :key="v.id" :value="v.id">{{ v.title }}</option>
                  </select>
                </div>
              </div>
              <div v-if="getVolumeChapterCount(vol.id) === 0" class="text-xs text-[var(--text-muted)] pad-3">此卷暂无章节</div>
            </div>
          </div>
          <div class="flex justify-end mt-5">
            <button @click="showReorder = false" class="btn btn-primary">完成</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showGraph" class="fixed inset-0 z-50 flex flex-col" style="background: rgba(0,0,0,0.85);" @click.self="showGraph = false">
        <div class="flex items-center justify-between pad-4 bg-[var(--surface)] border-b border-[var(--border)]">
          <h2 class="text-lg font-semibold text-[var(--text)]">关系图</h2>
          <div class="flex items-center gap-2">
            <button class="btn btn-secondary" @click="zoomOut" :disabled="graphScale <= 0.4">缩小</button>
            <span class="text-sm font-semibold text-[var(--text-light)] w-14 text-center">{{ Math.round(graphScale * 100) }}%</span>
            <button class="btn btn-secondary" @click="zoomIn" :disabled="graphScale >= 2">放大</button>
            <button class="btn btn-primary" @click="resetViewport">重置视图</button>
            <button class="btn btn-secondary" @click="showGraph = false">
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>
        <div
          class="flex-1 m-4 overflow-hidden bg-[var(--surface-alt)] border border-dashed border-[var(--border)]"
          :class="graphPanning ? 'is-panning' : ''"
          style="cursor: grab;"
          @pointerdown="onGraphPointerDown"
          @pointermove="onGraphPointerMove"
          @pointerup="onGraphPointerUp"
          @pointerleave="onGraphPointerUp"
          @wheel.prevent="onGraphWheel"
          @selectstart.prevent
        >
          <div class="mermaid-canvas" :style="graphCanvasStyle" style="min-height: calc(100vh - 8rem);">
            <div v-if="chapters.length === 0" class="empty-state" style="min-height: calc(100vh - 8rem);">
              还没有章节，先创建章节再绘制关系图。
            </div>
            <div v-else ref="graphRef" class="mermaid-render"></div>
          </div>
        </div>
      </div>
    </Teleport>
  </Layout>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { FileText, Plus, Edit, ChevronUp, ChevronDown, ChevronRight, Trash2, FolderOpen, FolderPlus, Search, Copy, Share2, X, List, ChevronsUp, ChevronsDown } from 'lucide-vue-next';
import mermaid from 'mermaid';
import Layout from '../components/Layout.vue';
import { useStore } from '../store';
import type { Chapter, Volume } from '../types';

const router = useRouter();
const {
  volumes, chapters, chapterSeries, chapterRelations,
  addVolume, updateVolume, deleteVolume: deleteVolumeFromStore,
  moveVolume,
  addChapter, updateChapter, deleteChapter: deleteChapterFromStore, setCurrentChapter,
  addChapterSeries, updateChapterSeries, deleteChapterSeries,
  addChapterRelation, deleteChapterRelation
} = useStore();

const searchQuery = ref('');
const expandedVolumes = ref(new Set<string>());
const copyMenuChapterId = ref<string | null>(null);

// Volume modals
const showVolumeModal = ref(false);
const editingVolume = ref<Volume | null>(null);
const volumeForm = ref({ title: '' });
const showDeleteVolumeModal = ref(false);
const volumeToDelete = ref<Volume | null>(null);

// Chapter modals
const showChapterModal = ref(false);
const editingChapter = ref<Chapter | null>(null);
const chapterForm = ref({ title: '', status: 'draft' as Chapter['status'], volumeId: '', seriesId: '' });
const showDeleteChapterModal = ref(false);
const chapterToDelete = ref<Chapter | null>(null);

const newSeriesTitle = ref('');
const seriesError = ref('');
const quickSeriesMode = ref(false);
const relationForm = ref({ fromChapterId: '', toChapterId: '', label: '' });
const relationError = ref('');

watch(newSeriesTitle, () => { seriesError.value = ''; });
watch(relationForm, () => { relationError.value = ''; }, { deep: true });

const anyModalOpen = computed(() => showVolumeModal.value || showChapterModal.value || showDeleteVolumeModal.value || showDeleteChapterModal.value || showReorder.value);
watch(anyModalOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : '';
});

const seriesByChapter = computed(() => {
  const map = new Map<string, string>();
  chapterSeries.value.forEach(series => {
    series.chapterIds.forEach(chapterId => {
      if (!map.has(chapterId)) {
        map.set(chapterId, series.id);
      }
    });
  });
  return map;
});

const precedingChapters = computed(() => {
  if (!editingChapter.value) return [];
  const volId = editingChapter.value.volumeId;
  return chapters.value
    .filter(c => c.volumeId === volId && c.id !== editingChapter.value!.id)
    .sort((a, b) => a.order - b.order);
});

const currentChapterRelations = computed(() => {
  if (!editingChapter.value) return [];
  const id = editingChapter.value.id;
  return chapterRelations.value.filter(r => r.fromChapterId === id || r.toChapterId === id);
});

const closeCopyMenu = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest('.copy-menu-wrap')) {
    copyMenuChapterId.value = null;
  }
};
const handleGraphEsc = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && showGraph.value) showGraph.value = false;
};
onMounted(() => {
  document.addEventListener('click', closeCopyMenu);
  document.addEventListener('keydown', handleGraphEsc);
});
onUnmounted(() => {
  document.removeEventListener('click', closeCopyMenu);
  document.removeEventListener('keydown', handleGraphEsc);
});

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
    'discarded': 'tag-error',
  };
  return classes[status] || 'tag-muted';
};

const statusText = (status: string) => {
  const texts: Record<string, string> = {
    'draft': '草稿',
    'in-progress': '撰写中',
    'completed': '已完成',
    'discarded': '废稿',
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
  chapterForm.value = { title: '', status: 'draft', volumeId, seriesId: '' };
  showChapterModal.value = true;
};

const editChapter = (chapter: Chapter) => {
  editingChapter.value = chapter;
  chapterForm.value = {
    title: chapter.title,
    status: chapter.status,
    volumeId: chapter.volumeId,
    seriesId: seriesByChapter.value.get(chapter.id) ?? '',
  };
  relationForm.value = { fromChapterId: '', toChapterId: chapter.id, label: '' };
  showChapterModal.value = true;
};

const closeChapterModal = () => {
  showChapterModal.value = false;
  editingChapter.value = null;
};

const saveChapter = () => {
  if (!chapterForm.value.title.trim()) return;

  let chapterId = editingChapter.value?.id;

  if (editingChapter.value) {
    updateChapter(editingChapter.value.id, {
      title: chapterForm.value.title,
      status: chapterForm.value.status,
      volumeId: chapterForm.value.volumeId,
    });
  } else {
    const vid = chapterForm.value.volumeId || volumes.value[0]?.id;
    if (!vid) return;
    const newChapter = addChapter({
      title: chapterForm.value.title,
      content: '',
      outline: '',
      authorNote: '',
      wordCount: 0,
      status: chapterForm.value.status,
      volumeId: vid,
    });
    chapterId = newChapter.id;
  }

  if (chapterId) {
    assignChapterSeries(chapterId, chapterForm.value.seriesId);
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

const copyChapterContent = async (chapter: Chapter, includeAuthorNote: boolean) => {
  let text = chapter.content || '';
  if (includeAuthorNote && chapter.authorNote) {
    text += '\n\n——作者的话——\n\n' + chapter.authorNote;
  }
  if (!text.trim()) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
};

const toggleCopyMenu = (chapterId: string) => {
  copyMenuChapterId.value = copyMenuChapterId.value === chapterId ? null : chapterId;
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

const createSeries = () => {
  const title = newSeriesTitle.value.trim();
  if (!title) return;
  const exists = chapterSeries.value.some(series => series.title.trim() === title);
  if (exists) {
    seriesError.value = '该系列名称已存在，请更换名称。';
    return;
  }
  seriesError.value = '';
  addChapterSeries(title);
  newSeriesTitle.value = '';
};

const quickCreateSeries = () => {
  const title = newSeriesTitle.value.trim();
  if (!title) return;
  const exists = chapterSeries.value.some(series => series.title.trim() === title);
  if (exists) {
    const found = chapterSeries.value.find(series => series.title.trim() === title)!;
    chapterForm.value.seriesId = found.id;
    newSeriesTitle.value = '';
    quickSeriesMode.value = false;
    return;
  }
  const created = addChapterSeries(title);
  chapterForm.value.seriesId = created.id;
  newSeriesTitle.value = '';
  quickSeriesMode.value = false;
};

const removeSeries = (id: string) => {
  deleteChapterSeries(id);
};

const assignChapterSeries = (chapterId: string, seriesIdValue: string) => {
  chapterSeries.value.forEach(series => {
    const hasChapter = series.chapterIds.includes(chapterId);
    if (series.id === seriesIdValue) {
      if (!hasChapter) {
        updateChapterSeries(series.id, { chapterIds: [...series.chapterIds, chapterId] });
      }
    } else if (hasChapter) {
      updateChapterSeries(series.id, { chapterIds: series.chapterIds.filter(id => id !== chapterId) });
    }
  });
};

const createRelation = () => {
  const toChapterId = editingChapter.value?.id;
  const { fromChapterId, label } = relationForm.value;
  if (!fromChapterId || !toChapterId) {
    relationError.value = '请选择前置章节。';
    return;
  }
  const exists = chapterRelations.value.some(rel =>
    rel.fromChapterId === fromChapterId && rel.toChapterId === toChapterId
  );
  if (exists) {
    relationError.value = '该章节关系已存在。';
    return;
  }
  const created = addChapterRelation({ fromChapterId, toChapterId, label: label.trim() || undefined });
  if (!created) {
    relationError.value = '关系创建失败，请检查章节数据。';
    return;
  }
  relationForm.value = { fromChapterId: '', toChapterId: toChapterId, label: '' };
};

const removeRelation = (id: string) => {
  deleteChapterRelation(id);
};

const chapterName = (id: string) => chapters.value.find(chapter => chapter.id === id)?.title || '未知章节';

// === 排序 ===
const showReorder = ref(false);

const sortedVolumes = computed(() => [...volumes.value].sort((a, b) => a.order - b.order));

const getVolumeChaptersForReorder = (volumeId: string) =>
  chapters.value.filter(c => c.volumeId === volumeId).sort((a, b) => a.order - b.order);

const moveChapterInVolume = (chapter: Chapter, direction: number) => {
  const siblings = getVolumeChaptersForReorder(chapter.volumeId);
  const newOrder = chapter.order + direction;
  if (newOrder < 0 || newOrder >= siblings.length) return;
  const targetChapter = siblings.find(c => c.order === newOrder);
  if (targetChapter) updateChapter(targetChapter.id, { order: chapter.order });
  updateChapter(chapter.id, { order: newOrder });
};

const moveChapterToTop = (chapter: Chapter, volumeId: string) => {
  const siblings = getVolumeChaptersForReorder(volumeId);
  siblings.forEach((c, i) => {
    if (c.id === chapter.id) updateChapter(c.id, { order: 0 });
    else if (c.order < chapter.order) updateChapter(c.id, { order: c.order + 1 });
  });
};

const moveChapterToBottom = (chapter: Chapter, volumeId: string) => {
  const siblings = getVolumeChaptersForReorder(volumeId);
  const maxOrder = siblings.length - 1;
  siblings.forEach((c, i) => {
    if (c.id === chapter.id) updateChapter(c.id, { order: maxOrder });
    else if (c.order > chapter.order) updateChapter(c.id, { order: c.order - 1 });
  });
};

const changeChapterVolumeInReorder = (chapter: Chapter, newVolumeId: string) => {
  if (chapter.volumeId === newVolumeId) return;
  const newVolumeCount = chapters.value.filter(c => c.volumeId === newVolumeId).length;
  updateChapter(chapter.id, { volumeId: newVolumeId, order: newVolumeCount });
};

// === 关系图 ===
const showGraph = ref(false);
const graphRef = ref<HTMLDivElement | null>(null);
const graphScale = ref(1);
const graphPanning = ref(false);
const graphPanStart = ref({ x: 0, y: 0 });
const graphPanOffset = ref({ x: 0, y: 0 });
const graphError = ref('');
const mermaidInit = ref(false);
const mermaidIdx = ref(0);

const graphOffset = ref({ x: 0, y: 0 });
const graphCanvasStyle = computed(() => ({
  transform: `translate(${graphOffset.value.x}px, ${graphOffset.value.y}px) scale(${graphScale.value})`,
}));

const sanitizeId = (v: string) => v.replace(/[^a-zA-Z0-9_]/g, '_');
const escLabel = (v: string) => v.replace(/[\[\]<>]/g, '').replace(/[(){}]/g, '').replace(/["']/g, '').replace(/\|/g, '/').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
const gNodeId = (id: string) => `ch_${sanitizeId(id)}`;
const gSeriesId = (id: string) => `series_${sanitizeId(id)}`;

const graphCode = computed(() => {
  const nodes = chapters.value.map(ch => `  ${gNodeId(ch.id)}["${escLabel(ch.title || '未命名章节')}"]`);
  const assigned = new Set<string>();
  const blocks = chapterSeries.value.map(series => {
    const ids = series.chapterIds.filter(id => chapters.value.some(c => c.id === id) && !assigned.has(id));
    ids.forEach(id => assigned.add(id));
    if (ids.length === 0) return '';
    const sid = gSeriesId(series.id);
    return [
      `  subgraph ${sid}["${escLabel(series.title || '未命名系列')}"]`,
      '    direction LR',
      ...ids.map(id => `    ${gNodeId(id)}`),
      '  end',
      `  style ${sid} fill:#10b98114,stroke:#10b9814d,stroke-width:1px,rx:12,ry:12`,
    ].join('\n');
  }).filter(Boolean);
  const rels = chapterRelations.value
    .filter(r => chapters.value.some(c => c.id === r.fromChapterId) && chapters.value.some(c => c.id === r.toChapterId))
    .map(r => {
      const lbl = r.label ? `|${escLabel(r.label)}|` : '';
      return `  ${gNodeId(r.fromChapterId)} ---${lbl} ${gNodeId(r.toChapterId)}`;
    });
  return ['flowchart LR', ...nodes, ...blocks, ...rels].join('\n');
});

const renderGraph = async () => {
  const el = graphRef.value;
  if (!el || chapters.value.length === 0) return;
  try {
    graphError.value = '';
    const id = `mg-${mermaidIdx.value++}`;
    const { svg } = await mermaid.render(id, graphCode.value);
    el.innerHTML = svg;
  } catch (e) {
    graphError.value = '渲染失败';
    console.error(e);
  }
};

watch(graphCode, async () => { await nextTick(); renderGraph(); });
watch(showGraph, async (v) => {
  if (v) {
    if (!mermaidInit.value) { mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' }); mermaidInit.value = true; }
    await nextTick(); renderGraph();
  }
});

const zoomIn = () => { graphScale.value = Math.min(2, graphScale.value + 0.1); };
const zoomOut = () => { graphScale.value = Math.max(0.4, graphScale.value - 0.1); };
const resetViewport = () => { graphScale.value = 1; graphOffset.value = { x: 0, y: 0 }; };
const onGraphWheel = (e: WheelEvent) => {
  graphScale.value = Math.min(2, Math.max(0.4, graphScale.value + (e.deltaY > 0 ? -0.1 : 0.1)));
};
const onGraphPointerDown = (e: PointerEvent) => {
  if (e.button !== 0) return;
  graphPanning.value = true;
  graphPanStart.value = { x: e.clientX, y: e.clientY };
  graphPanOffset.value = { x: graphOffset.value.x, y: graphOffset.value.y };
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
};
const onGraphPointerMove = (e: PointerEvent) => {
  if (!graphPanning.value) return;
  graphOffset.value = { x: graphPanOffset.value.x + e.clientX - graphPanStart.value.x, y: graphPanOffset.value.y + e.clientY - graphPanStart.value.y };
};
const onGraphPointerUp = (e: PointerEvent) => {
  if (!graphPanning.value) return;
  graphPanning.value = false;
  (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
};
</script>

<style scoped>
.series-row,
.chapter-row,
.relation-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.chapter-row span {
  flex: 1;
}

.relation-row {
  justify-content: space-between;
}

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
