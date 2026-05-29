<script setup lang="ts">
import { ref } from 'vue';
import { Plus, Trash2, Link, Unlink, Save } from 'lucide-vue-next';
import type { MemoryCard, MemoryCardType } from '../../types-world-sim';
import { MEMORY_CARD_TYPE_LABELS } from '../../types-world-sim';

const props = defineProps<{
  cards: MemoryCard[];
  attachedIds: string[];
}>();

const emit = defineEmits<{
  create: [type: MemoryCardType, title: string, content: string];
  update: [id: string, partial: Partial<Pick<MemoryCard, 'type' | 'title' | 'content'>>];
  delete: [id: string];
  attach: [id: string];
  detach: [id: string];
}>();

const showCreateForm = ref(false);
const newType = ref<MemoryCardType>('world_setting');
const newTitle = ref('');
const newContent = ref('');

const editingId = ref<string | null>(null);
const editTitle = ref('');
const editContent = ref('');

const typeOptions: MemoryCardType[] = ['user_profile', 'conversation_memory', 'world_setting', 'plot_point'];

function handleCreate() {
  const title = newTitle.value.trim();
  const content = newContent.value.trim();
  if (!title && !content) return;
  emit('create', newType.value, title, content);
  newTitle.value = '';
  newContent.value = '';
  showCreateForm.value = false;
}

function startEdit(card: MemoryCard) {
  editingId.value = card.id;
  editTitle.value = card.title;
  editContent.value = card.content;
}

function saveEdit() {
  if (!editingId.value) return;
  emit('update', editingId.value, {
    title: editTitle.value.trim(),
    content: editContent.value.trim(),
  });
  editingId.value = null;
}

function cancelEdit() {
  editingId.value = null;
}

function isAttached(cardId: string): boolean {
  return props.attachedIds.includes(cardId);
}

function toggleAttach(cardId: string) {
  if (isAttached(cardId)) {
    emit('detach', cardId);
  } else {
    emit('attach', cardId);
  }
}

function typeColor(type: MemoryCardType): string {
  const map: Record<MemoryCardType, string> = {
    user_profile: '#6366f1',
    conversation_memory: '#8b5cf6',
    world_setting: '#059669',
    plot_point: '#d97706',
  };
  return map[type];
}
</script>

<template>
  <div class="ws-memory-panel">
    <div class="ws-memory-header">
      <span>记忆卡片</span>
      <button class="ws-memory-add-btn" @click="showCreateForm = !showCreateForm">
        <Plus class="w-4 h-4" />
      </button>
    </div>

    <!-- Create form -->
    <div v-if="showCreateForm" class="ws-memory-form">
      <select v-model="newType" class="ws-memory-type-select">
        <option v-for="t in typeOptions" :key="t" :value="t">
          {{ MEMORY_CARD_TYPE_LABELS[t] }}
        </option>
      </select>
      <input
        v-model="newTitle"
        class="ws-memory-input"
        placeholder="记忆标题"
      />
      <textarea
        v-model="newContent"
        class="ws-memory-textarea"
        placeholder="记忆内容&#10;可使用 - 开头的列表格式，例如：&#10;- 姓名：李明&#10;- 职业：前端开发工程师"
        rows="4"
      />
      <div class="ws-memory-form-actions">
        <button class="ws-btn-cancel" @click="showCreateForm = false">取消</button>
        <button class="ws-btn-save" @click="handleCreate">
          <Save class="w-3.5 h-3.5" />
          保存
        </button>
      </div>
    </div>

    <!-- Card list -->
    <div class="ws-memory-list">
      <div v-if="cards.length === 0" class="ws-memory-empty">
        暂无记忆卡片，点击 + 创建
      </div>

      <div v-for="card in cards" :key="card.id" class="ws-memory-card">
        <div class="ws-memory-card-header">
          <span
            class="ws-memory-type-badge"
            :style="{ background: typeColor(card.type) }"
          >
            {{ MEMORY_CARD_TYPE_LABELS[card.type] }}
          </span>
          <div class="ws-memory-card-actions">
            <button
              class="ws-memory-link-btn"
              :class="{ attached: isAttached(card.id) }"
              @click="toggleAttach(card.id)"
              :title="isAttached(card.id) ? '取消关联' : '关联到当前会话'"
            >
              <Link v-if="isAttached(card.id)" class="w-3.5 h-3.5" />
              <Unlink v-else class="w-3.5 h-3.5" />
            </button>
            <button
              class="ws-memory-edit-btn"
              @click="startEdit(card)"
              v-if="editingId !== card.id"
            >
              编辑
            </button>
            <button
              class="ws-memory-delete-btn"
              @click="emit('delete', card.id)"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- Edit mode -->
        <div v-if="editingId === card.id" class="ws-memory-edit-form">
          <input v-model="editTitle" class="ws-memory-input" />
          <textarea v-model="editContent" class="ws-memory-textarea" rows="3" />
          <div class="ws-memory-form-actions">
            <button class="ws-btn-cancel" @click="cancelEdit">取消</button>
            <button class="ws-btn-save" @click="saveEdit">
              <Save class="w-3.5 h-3.5" />
              保存
            </button>
          </div>
        </div>

        <!-- Display mode -->
        <div v-else class="ws-memory-card-body">
          <div class="ws-memory-card-title">{{ card.title }}</div>
          <pre class="ws-memory-card-content">{{ card.content }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ws-memory-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ws-memory-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  border-bottom: 1px solid #e2e8f0;
}

.ws-memory-add-btn {
  padding: 4px;
  border: none;
  background: transparent;
  color: #6366f1;
  cursor: pointer;
  border-radius: 4px;
}

.ws-memory-add-btn:hover {
  background: #eef2ff;
}

.ws-memory-form {
  padding: 12px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ws-memory-type-select {
  padding: 6px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
}

.ws-memory-input {
  padding: 6px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  font-family: inherit;
}

.ws-memory-input:focus {
  border-color: #6366f1;
}

.ws-memory-textarea {
  padding: 6px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  resize: vertical;
  font-family: inherit;
}

.ws-memory-textarea:focus {
  border-color: #6366f1;
}

.ws-memory-form-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.ws-btn-cancel {
  padding: 4px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  cursor: pointer;
}

.ws-btn-save {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border: none;
  border-radius: 6px;
  background: #6366f1;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

.ws-memory-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.ws-memory-empty {
  text-align: center;
  padding: 24px 12px;
  color: #94a3b8;
  font-size: 13px;
}

.ws-memory-card {
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 8px;
  background: #fff;
}

.ws-memory-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.ws-memory-type-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  color: #fff;
}

.ws-memory-card-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ws-memory-link-btn {
  padding: 3px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  border-radius: 4px;
}

.ws-memory-link-btn:hover,
.ws-memory-link-btn.attached {
  color: #6366f1;
}

.ws-memory-edit-btn {
  padding: 2px 8px;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
}

.ws-memory-edit-btn:hover {
  color: #6366f1;
}

.ws-memory-delete-btn {
  padding: 3px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  border-radius: 4px;
}

.ws-memory-delete-btn:hover {
  color: #ef4444;
}

.ws-memory-edit-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ws-memory-card-body {
  min-width: 0;
}

.ws-memory-card-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.ws-memory-card-content {
  font-size: 12px;
  color: #475569;
  white-space: pre-wrap;
  line-height: 1.5;
  margin: 0;
  font-family: inherit;
}
</style>
