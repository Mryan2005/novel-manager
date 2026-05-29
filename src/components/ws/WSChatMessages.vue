<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { Brain, ChevronDown, ChevronRight, Copy, Wrench, CheckCircle, XCircle, Loader2 } from 'lucide-vue-next';
import type { WSMessage } from '../../types-world-sim';
import WSSuperPowerProgress from './WSSuperPowerProgress.vue';
import MarkdownRenderer from '../MarkdownRenderer.vue';

const props = defineProps<{
  messages: WSMessage[];
  loading: boolean;
  errorMessage: string | null;
}>();

const emit = defineEmits<{
  copy: [text: string];
}>();

const messagesContainer = ref<HTMLElement | null>(null);
const expandedThinking = ref<Set<string>>(new Set());

function toggleThinking(id: string) {
  if (expandedThinking.value.has(id)) {
    expandedThinking.value.delete(id);
  } else {
    expandedThinking.value.add(id);
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

watch(() => props.messages.length, scrollToBottom);
watch(() => props.loading, (val) => { if (val) scrollToBottom(); });

function toolNameLabel(name: string): string {
  const map: Record<string, string> = {
    read_chapter: '读取章节',
    read_character: '读取角色',
    read_location: '读取场景',
    read_item: '读取物品',
  };
  return map[name] || name;
}

function formatToolResult(result: string): string {
  try {
    const obj = JSON.parse(result);
    if (obj.error) return obj.error;
    // Format key fields in Chinese
    const fieldLabels: Record<string, string> = {
      id: 'ID', title: '标题', name: '名称', content: '内容', description: '描述',
      outline: '大纲', status: '状态', wordCount: '字数', volumeName: '所在卷',
      gender: '性别', age: '年龄', role: '身份', traits: '性格', location: '地点',
      atmosphere: '氛围', type: '类型', owner: '所属者', abilities: '能力',
    };
    const lines: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      const label = fieldLabels[key] || key;
      const display = Array.isArray(value) ? value.join('、') : String(value);
      if (display.length > 200) {
        lines.push(`${label}: ${display.slice(0, 200)}...`);
      } else {
        lines.push(`${label}: ${display}`);
      }
    }
    return lines.join('\n');
  } catch {
    return result.length > 500 ? result.slice(0, 500) + '...' : result;
  }
}
</script>

<template>
  <div ref="messagesContainer" class="ws-messages">
    <div v-if="messages.length === 0 && !loading" class="ws-messages-empty">
      <p>开始世界模拟，输入你的创作灵感或指令</p>
    </div>

    <template v-for="msg in messages" :key="msg.id">
      <!-- Super power plan progress -->
      <WSSuperPowerProgress v-if="msg.plan" :plan="msg.plan" />

      <div class="ws-message" :class="msg.role">
        <!-- Thinking -->
        <div v-if="msg.thinking" class="ws-thinking">
          <button class="ws-thinking-toggle" @click="toggleThinking(msg.id)">
            <Brain class="w-4 h-4" />
            <span>思考过程</span>
            <ChevronDown v-if="!expandedThinking.has(msg.id)" class="w-3 h-3" />
            <ChevronRight v-else class="w-3 h-3" />
          </button>
          <div v-if="expandedThinking.has(msg.id)" class="ws-thinking-content">
            {{ msg.thinking }}
          </div>
        </div>

        <!-- Tool calls -->
        <div v-if="msg.toolCalls && msg.toolCalls.length > 0" class="ws-tool-calls">
          <div v-for="tc in msg.toolCalls" :key="tc.id" class="ws-tool-call">
            <Wrench class="w-3.5 h-3.5" />
            <span class="ws-tool-name">{{ toolNameLabel(tc.name) }}</span>
            <span class="ws-tool-args">{{ JSON.stringify(tc.args) }}</span>
          </div>
        </div>

        <!-- Tool results -->
        <div v-if="msg.toolResults && msg.toolResults.length > 0" class="ws-tool-results">
          <div v-for="tr in msg.toolResults" :key="tr.toolCallId" class="ws-tool-result">
            <CheckCircle class="w-3.5 h-3.5" />
            <pre class="ws-tool-result-text">{{ formatToolResult(tr.result) }}</pre>
          </div>
        </div>

        <!-- Message bubble -->
        <div v-if="msg.content" class="ws-bubble">
          <MarkdownRenderer :text="msg.content" />
        </div>

        <!-- Actions for assistant -->
        <div v-if="msg.role === 'assistant' && msg.content" class="ws-msg-actions">
          <button class="ws-action-btn" @click="emit('copy', msg.content)" title="复制">
            <Copy class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </template>

    <!-- Loading -->
    <div v-if="loading" class="ws-loading">
      <Loader2 class="w-4 h-4 animate-spin" />
      <span>AI 正在思考...</span>
    </div>

    <!-- Error -->
    <div v-if="errorMessage" class="ws-error">
      <XCircle class="w-4 h-4" />
      <span>{{ errorMessage }}</span>
    </div>
  </div>
</template>

<style scoped>
.ws-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ws-messages-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #94a3b8;
  font-size: 14px;
}

.ws-message {
  display: flex;
  flex-direction: column;
  max-width: 85%;
}

.ws-message.user {
  align-self: flex-end;
}

.ws-message.assistant {
  align-self: flex-start;
}

.ws-message.system {
  align-self: center;
  max-width: 95%;
}

.ws-bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.ws-message.user .ws-bubble {
  background: #6366f1;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.ws-message.assistant .ws-bubble {
  background: #f1f5f9;
  color: #1e293b;
  border-bottom-left-radius: 4px;
}

.ws-thinking {
  margin-bottom: 6px;
}

.ws-thinking-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: none;
  background: transparent;
  color: #6366f1;
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
}

.ws-thinking-toggle:hover {
  background: #eef2ff;
}

.ws-thinking-content {
  margin-top: 4px;
  padding: 8px 12px;
  background: #fefce8;
  border: 1px solid #fde68a;
  border-radius: 8px;
  font-size: 13px;
  color: #92400e;
  white-space: pre-wrap;
  line-height: 1.5;
}

.ws-tool-calls,
.ws-tool-results {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 6px;
}

.ws-tool-call {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  font-size: 12px;
  color: #1e40af;
}

.ws-tool-name {
  font-weight: 600;
}

.ws-tool-args {
  color: #64748b;
  font-family: monospace;
}

.ws-tool-result {
  padding: 6px 10px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  font-size: 12px;
}

.ws-tool-result-text {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: #166534;
  white-space: pre-wrap;
  font-family: inherit;
}

.ws-msg-actions {
  display: flex;
  gap: 4px;
  margin-top: 4px;
  padding: 0 4px;
}

.ws-action-btn {
  padding: 4px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  border-radius: 4px;
  transition: color 0.15s;
}

.ws-action-btn:hover {
  color: #6366f1;
}

.ws-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  color: #6366f1;
  font-size: 13px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

.ws-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 13px;
}
</style>
