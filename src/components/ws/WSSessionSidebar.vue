<script setup lang="ts">
import { Plus, Trash2, MessageSquare } from 'lucide-vue-next';
import type { WorldSimSession } from '../../types-world-sim';

defineProps<{
  sessions: WorldSimSession[];
  activeSessionId: string | null;
}>();

const emit = defineEmits<{
  create: [];
  select: [id: string];
  delete: [id: string];
}>();

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  const month = d.getMonth() + 1;
  const date = d.getDate();
  return `${month}/${date}`;
}
</script>

<template>
  <div class="ws-sidebar">
    <div class="ws-sidebar-header">
      <span>会话列表</span>
    </div>

    <button class="ws-new-session-btn" @click="emit('create')">
      <Plus class="w-4 h-4" />
      新建会话
    </button>

    <div class="ws-session-list">
      <div v-if="sessions.length === 0" class="ws-empty">
        <MessageSquare class="w-5 h-5 mx-auto mb-2 opacity-30" />
        <p>暂无会话记录</p>
      </div>

      <button
        v-for="session in sessions"
        :key="session.id"
        class="ws-session-item"
        :class="{ active: session.id === activeSessionId }"
        @click="emit('select', session.id)"
      >
        <div class="ws-session-info">
          <div class="ws-session-title">{{ session.title }}</div>
          <div class="ws-session-meta">
            {{ session.mode === 'super-power' ? '超能' : '普通' }}
            &middot;
            {{ formatTime(session.updatedAt) }}
          </div>
        </div>
        <button
          class="ws-session-delete"
          @click.stop="emit('delete', session.id)"
          title="删除会话"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </button>
      </button>
    </div>
  </div>
</template>

<style scoped>
.ws-sidebar {
  width: 220px;
  min-width: 220px;
  height: 100%;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
}

.ws-sidebar-header {
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  border-bottom: 1px solid #e2e8f0;
}

.ws-new-session-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 12px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px dashed #cbd5e1;
  background: transparent;
  color: #475569;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.ws-new-session-btn:hover {
  border-color: #6366f1;
  color: #6366f1;
  background: #eef2ff;
}

.ws-session-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px;
}

.ws-empty {
  text-align: center;
  padding: 24px 12px;
  color: #94a3b8;
  font-size: 13px;
}

.ws-session-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
  margin-bottom: 2px;
}

.ws-session-item:hover {
  background: #e2e8f0;
}

.ws-session-item.active {
  background: #eef2ff;
}

.ws-session-info {
  flex: 1;
  min-width: 0;
}

.ws-session-title {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ws-session-meta {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}

.ws-session-delete {
  flex-shrink: 0;
  padding: 4px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  border-radius: 4px;
  opacity: 0;
  transition: all 0.15s;
}

.ws-session-item:hover .ws-session-delete {
  opacity: 1;
}

.ws-session-delete:hover {
  color: #ef4444;
  background: #fef2f2;
}
</style>
