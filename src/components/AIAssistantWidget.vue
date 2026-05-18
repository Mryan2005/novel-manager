<template>
  <Teleport to="body">
    <div v-if="visible" class="ai-overlay" @click.self="$emit('close')">
      <div class="ai-chat-window" :class="{ 'history-open': showHistory }">
        <div class="ai-sidebar">
          <div class="ai-sidebar-header">
            <span class="text-sm font-semibold text-[var(--text)]">对话历史</span>
            <button class="ai-icon-btn" @click="showHistory = false">
              <X class="w-4 h-4" />
            </button>
          </div>
          <div class="ai-sidebar-list">
            <button class="ai-new-chat-btn" @click="startNewChat">
              <Plus class="w-4 h-4" />
              新对话
            </button>
            <div v-if="sessions.length === 0" class="text-xs text-[var(--text-muted)] text-center py-8">
              暂无对话记录
            </div>
            <button
              v-for="session in sessions"
              :key="session.id"
              class="ai-session-item"
              :class="{ active: session.id === activeSessionId }"
              @click="switchSession(session.id)"
            >
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-[var(--text)] truncate">{{ session.title }}</div>
                <div class="text-xs text-[var(--text-muted)]">{{ formatTime(session.updatedAt) }}</div>
              </div>
              <button class="ai-icon-btn-sm" @click.stop="handleDeleteSession(session.id)" title="删除对话">
                <Trash2 class="w-3 h-3" />
              </button>
            </button>
          </div>
        </div>

        <div class="ai-main">
          <div class="ai-header">
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <button class="ai-icon-btn" @click="showHistory = !showHistory" title="历史记录">
                <History class="w-4 h-4" />
              </button>
              <select
                v-if="settings.aiConfigs.length > 1"
                :value="settings.aiActiveConfigId"
                @change="switchConfig(($event.target as HTMLSelectElement).value)"
                class="ai-model-select"
                title="切换 AI 配置"
              >
                <option v-for="cfg in settings.aiConfigs" :key="cfg.id" :value="cfg.id">{{ cfg.name }}</option>
              </select>
              <span v-else class="text-xs text-[var(--text-muted)] truncate">{{ activeAIConfig?.name || 'AI 助手' }}</span>
            </div>
            <div class="flex items-center gap-1">
              <button class="ai-icon-btn" @click="startNewChat" title="新对话">
                <MessageSquarePlus class="w-4 h-4" />
              </button>
              <button class="ai-icon-btn" @click="$emit('close')" title="关闭">
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div class="ai-messages" ref="messagesContainer">
            <div v-if="!activeSession || activeSession.messages.length === 0" class="ai-empty">
              <MessageSquare class="w-10 h-10 text-[var(--text-muted)] mb-3 opacity-30" />
              <p class="text-sm text-[var(--text-muted)]">开始和 AI 对话，获取写作灵感与建议</p>
              <p v-if="!hasConfig" class="text-xs text-[var(--warning)] mt-2">
                请先在设置页面配置 AI 的 API URL、Token 和模型
              </p>
            </div>

            <div
              v-for="msg in activeSession?.messages ?? []"
              :key="msg.id"
              class="ai-message"
              :class="msg.role"
            >
              <div v-if="msg.thinking" class="ai-thinking">
                <button class="ai-thinking-toggle" @click="toggleThinking(msg.id)">
                  <Brain class="w-3.5 h-3.5" />
                  <span>思考过程</span>
                  <ChevronDown class="w-3 h-3 transition-transform" :class="expandedThinking.has(msg.id) ? 'rotate-180' : ''" />
                </button>
                <div v-if="expandedThinking.has(msg.id)" class="ai-thinking-content">{{ msg.thinking }}</div>
              </div>
              <div class="ai-bubble">{{ msg.content }}</div>
              <div class="ai-msg-actions" v-if="msg.role === 'assistant'">
                <button class="ai-action-btn" @click="copyText(msg.content)" title="复制">
                  <Copy class="w-3 h-3" />
                </button>
                <button
                  v-if="isEditorRoute"
                  class="ai-action-btn"
                  @click="insertToEditor(msg.content)"
                  title="插入到编辑器"
                >
                  <CornerDownLeft class="w-3 h-3" />
                </button>
              </div>
            </div>

            <div v-if="loading" class="ai-message assistant">
              <div class="ai-bubble ai-loading">
                <span class="ai-dot-pulse">思考中</span>
              </div>
            </div>

            <div v-if="errorMessage" class="ai-error">{{ errorMessage }}</div>
          </div>

          <div class="ai-input-area">
            <div v-if="activeAIConfig" class="ai-toolbar">
              <button
                class="ai-tool-btn"
                :class="{ active: activeAIConfig.enableJsonMode }"
                @click="toggleJsonMode"
                title="JSON 结构化输出"
              >
                <Braces class="w-3.5 h-3.5" />
                JSON
              </button>
              <template v-if="activeAIConfig.provider === 'gemini'">
                <button
                  class="ai-tool-btn"
                  :class="{ active: hasGeminiTool('google_search') }"
                  @click="toggleGeminiTool('google_search')"
                  title="Google 搜索接地"
                >
                  <Globe class="w-3.5 h-3.5" />
                  搜索
                </button>
                <button
                  class="ai-tool-btn"
                  :class="{ active: hasGeminiTool('code_execution') }"
                  @click="toggleGeminiTool('code_execution')"
                  title="代码执行"
                >
                  <Terminal class="w-3.5 h-3.5" />
                  代码
                </button>
              </template>
            </div>
            <div v-if="contextText" class="ai-context-area">
              <button class="ai-context-header" @click="contextExpanded = !contextExpanded">
                <Paperclip class="w-3.5 h-3.5" />
                <span class="text-xs font-medium flex-1 text-left truncate">已附加页面上下文</span>
                <ChevronDown class="w-3 h-3 transition-transform" :class="contextExpanded ? 'rotate-180' : ''" />
              </button>
              <div v-if="contextExpanded" class="ai-context-body">
                <pre class="ai-context-text">{{ contextText }}</pre>
              </div>
              <button v-if="contextExpanded" class="ai-context-remove" @click="contextText = ''">
                清除上下文
              </button>
            </div>
            <div class="ai-input-row">
              <button
                class="ai-icon-btn"
                @click="attachContext"
                :title="isEditorRoute ? '附加当前章节内容' : '附加当前页面数据'"
                :disabled="!hasConfig"
              >
                <Paperclip class="w-4 h-4" />
              </button>
              <textarea
                v-model="inputText"
                class="ai-input"
                :placeholder="hasConfig ? '输入消息...' : '请先在设置中配置 AI'"
                rows="1"
                :disabled="!hasConfig"
                @keydown.enter.exact.prevent="sendMessage"
                @input="autoResize"
                ref="inputEl"
              />
              <button
                class="ai-send-btn"
                :disabled="!inputText.trim() || loading || !hasConfig"
                @click="sendMessage"
              >
                <Send class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import {
  X, History, Plus, Trash2, Send, Copy, CornerDownLeft,
  MessageSquare, MessageSquarePlus, Paperclip, Brain, ChevronDown, Braces, Globe, Terminal,
} from 'lucide-vue-next';
import { useSettings } from '../composables/useSettings';
import { useAIChat } from '../composables/useAIChat';
import { GoogleGenAI } from '@google/genai';

defineProps<{ visible: boolean }>();
const emit = defineEmits<{ close: [] }>();

const route = useRoute();
const { settings, activeAIConfig, setActiveAIConfig } = useSettings();
const {
  sessions, activeSession, activeSessionId,
  createSession, ensureSession, selectSession, deleteSession, addMessage, getContextForRoute,
} = useAIChat();

const showHistory = ref(false);
const inputText = ref('');
const contextText = ref('');
const contextExpanded = ref(false);
const loading = ref(false);
const errorMessage = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const inputEl = ref<HTMLTextAreaElement | null>(null);
const expandedThinking = ref(new Set<string>());

const hasConfig = computed(() => {
  const cfg = activeAIConfig.value;
  if (!cfg) return false;
  const hasToken = cfg.token.trim() !== '';
  const hasModel = cfg.model.trim() !== '';
  if (cfg.provider === 'gemini') {
    return hasToken && hasModel;
  }
  return cfg.apiUrl.trim() !== '' && hasToken && hasModel;
});

const isEditorRoute = computed(() => route.path.startsWith('/editor'));

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function scrollToBottom() {
  nextTick(() => {
    const el = messagesContainer.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
}

function autoResize() {
  nextTick(() => {
    const el = inputEl.value;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  });
}

function switchConfig(id: string) {
  setActiveAIConfig(id);
}

function toggleJsonMode() {
  const cfg = activeAIConfig.value;
  if (!cfg) return;
  cfg.enableJsonMode = !cfg.enableJsonMode;
}

function parseTools(): Record<string, unknown>[] {
  const cfg = activeAIConfig.value;
  if (!cfg || !cfg.tools.trim()) return [];
  try {
    const parsed = JSON.parse(cfg.tools);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function hasGeminiTool(name: string): boolean {
  return parseTools().some(t => t[name] !== undefined);
}

function toggleGeminiTool(name: string) {
  const cfg = activeAIConfig.value;
  if (!cfg) return;
  const tools = parseTools();
  const idx = tools.findIndex(t => t[name] !== undefined);
  if (idx >= 0) {
    tools.splice(idx, 1);
  } else {
    tools.push({ [name]: {} });
  }
  cfg.tools = tools.length > 0 ? JSON.stringify(tools, null, 2) : '';
}

function startNewChat() {
  createSession();
  showHistory.value = false;
  errorMessage.value = '';
  contextText.value = '';
  scrollToBottom();
}

function switchSession(id: string) {
  selectSession(id);
  showHistory.value = false;
  errorMessage.value = '';
  contextText.value = '';
  scrollToBottom();
}

function handleDeleteSession(id: string) {
  deleteSession(id);
  errorMessage.value = '';
}

function attachContext() {
  const ctx = getContextForRoute(route.path);
  if (ctx) {
    contextText.value = ctx;
    contextExpanded.value = true;
  }
}

function normalizeUrl(base: string, suffix: string) {
  const clean = base.trim().replace(/\/+$/, '');
  return clean.endsWith(suffix) ? clean : `${clean}${suffix}`;
}

async function sendMessage() {
  const text = inputText.value.trim();
  if (!text || loading.value || !hasConfig.value) return;

  const session = ensureSession();

  const fullMessage = contextText.value
    ? `[上下文信息]\n${contextText.value}\n\n[用户消息]\n${text}`
    : text;

  addMessage(session.id, 'user', text);
  inputText.value = '';
  contextText.value = '';
  contextExpanded.value = false;
  errorMessage.value = '';
  loading.value = true;
  scrollToBottom();

  try {
    const { content, thinking } = await callAI(fullMessage, session.messages.slice(0, -1));
    addMessage(session.id, 'assistant', content, thinking);
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '请求失败，请检查配置。';
  } finally {
    loading.value = false;
    scrollToBottom();
  }
}

async function callAI(userContent: string, previousMessages: { role: string; content: string }[]): Promise<{ content: string; thinking?: string }> {
  const cfg = activeAIConfig.value;
  if (!cfg) throw new Error('未选择 AI 配置。');

  if (cfg.provider === 'gemini') {
    return callGemini(userContent, previousMessages, cfg.token, cfg.model, cfg.systemPrompt, cfg.tools, cfg.enableJsonMode);
  }
  return callOpenAiLike(userContent, previousMessages, cfg.apiUrl, cfg.token, cfg.model, cfg.systemPrompt, cfg.tools, cfg.enableJsonMode);
}

async function callOpenAiLike(
  userContent: string,
  previousMessages: { role: string; content: string }[],
  apiUrl: string,
  token: string,
  model: string,
  systemPrompt: string,
  toolsJson: string,
  enableJsonMode: boolean,
): Promise<{ content: string; thinking?: string }> {
  const sp = systemPrompt.trim();
  const messages: Record<string, unknown>[] = [
    ...(sp ? [{ role: 'system', content: sp }] : []),
    ...previousMessages.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userContent },
  ];

  let tools: unknown[] | undefined;
  if (toolsJson.trim()) {
    try {
      const parsed = JSON.parse(toolsJson);
      if (Array.isArray(parsed) && parsed.length > 0) tools = parsed;
    } catch { /* ignore invalid JSON */ }
  }

  const endpoint = normalizeUrl(apiUrl, '/chat/completions');
  const body: Record<string, unknown> = { model: model.trim(), messages, temperature: 0.7 };
  if (tools && tools.length > 0) body.tools = tools;
  if (enableJsonMode) body.response_format = { type: 'json_object' };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token.trim()}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `请求失败：${res.status}`);
  }
  const msg = data?.choices?.[0]?.message as Record<string, unknown> | undefined;
  const toolCalls = msg?.tool_calls as Array<{ id: string; function: { name: string; arguments: string } }> | undefined;

  // Handle tool calls
  if (toolCalls && toolCalls.length > 0 && !msg?.content) {
    messages.push({ role: 'assistant', tool_calls: toolCalls });
    for (const tc of toolCalls) {
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: `工具 "${tc.function.name}" 未在当前环境实现。参数: ${tc.function.arguments}`,
      });
    }
    const followUp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.trim()}`,
      },
      body: JSON.stringify({ model: model.trim(), messages, temperature: 0.7 }),
    });
    const followData = await followUp.json();
    if (!followUp.ok) {
      throw new Error(followData?.error?.message || `请求失败：${followUp.status}`);
    }
    const followMsg = followData?.choices?.[0]?.message as Record<string, unknown> | undefined;
    const text = followMsg?.content;
    if (!text) throw new Error('模型未返回可用内容。');
    const thinking = (followMsg as { reasoning_content?: string })?.reasoning_content || (followMsg as { reasoning?: string })?.reasoning || undefined;
    return { content: String(text).trim(), thinking: thinking ? String(thinking).trim() : undefined };
  }

  const text = msg?.content;
  if (!text) throw new Error('模型未返回可用内容。');
  const thinking = msg?.reasoning_content || msg?.reasoning || undefined;
  return { content: String(text).trim(), thinking: thinking ? String(thinking).trim() : undefined };
}

async function callGemini(
  userContent: string,
  previousMessages: { role: string; content: string }[],
  token: string,
  model: string,
  systemPrompt: string,
  toolsJson: string,
  enableJsonMode: boolean,
): Promise<{ content: string; thinking?: string }> {
  const sp = systemPrompt.trim();
  const ai = new GoogleGenAI({ apiKey: token.trim() });

  const config: Record<string, unknown> = {};
  if (sp) {
    config.systemInstruction = { parts: [{ text: sp }] };
  }
  if (toolsJson.trim()) {
    try {
      const parsed = JSON.parse(toolsJson);
      if (Array.isArray(parsed) && parsed.length > 0) config.tools = parsed;
    } catch { /* ignore */ }
  }

  const contents = [
    ...previousMessages.map(m => ({
      role: m.role as 'user' | 'model',
      parts: [{ text: m.content }],
    })),
    { role: 'user' as const, parts: [{ text: userContent }] },
  ];

  const response = await ai.models.generateContent({
    model: model.trim(),
    contents,
    config,
  });

  if (!response.candidates || response.candidates.length === 0) {
    throw new Error('模型未返回可用内容。');
  }

  const parts = response.candidates[0]?.content?.parts ?? [];
  const thoughtParts = parts.filter(p => (p as { thought?: boolean }).thought === true);
  const textParts = parts.filter(p => !(p as { thought?: boolean }).thought);
  const thinking = thoughtParts.length > 0
    ? thoughtParts.map(p => p.text || '').join('\n').trim()
    : undefined;
  const text = textParts.map(p => p.text || '').join('\n').trim();
  if (!text) throw new Error('模型未返回可用内容。');
  return { content: text, thinking };
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

function insertToEditor(text: string) {
  window.dispatchEvent(new CustomEvent('novel-ai-insert', { detail: text }));
}

function toggleThinking(msgId: string) {
  if (expandedThinking.value.has(msgId)) {
    expandedThinking.value.delete(msgId);
  } else {
    expandedThinking.value.add(msgId);
  }
}

watch(() => activeSession.value?.messages.length, () => {
  scrollToBottom();
});
</script>

<style scoped>
.ai-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
}

.ai-chat-window {
  display: flex;
  width: min(90vw, 800px);
  height: min(85vh, 650px);
  background: var(--surface);
  border-radius: var(--radius-2xl);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.ai-sidebar {
  width: 240px;
  border-right: 1px solid var(--border);
  background: var(--surface-alt);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.history-open .ai-sidebar {
  display: flex;
}

.ai-chat-window:not(.history-open) .ai-sidebar {
  display: none;
}

.ai-sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
}

.ai-sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.ai-new-chat-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius);
  border: 1px dashed var(--border);
  background: transparent;
  color: var(--primary);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 0.25rem;
}

.ai-new-chat-btn:hover {
  background: rgba(99, 102, 241, 0.06);
}

.ai-session-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius);
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.ai-session-item:hover {
  background: var(--surface-hover);
}

.ai-session-item.active {
  background: rgba(99, 102, 241, 0.08);
}

.ai-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 1rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  gap: 0.5rem;
}

.ai-model-select {
  flex: 1;
  min-width: 0;
  padding: 0.25rem 0.375rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--surface-alt);
  color: var(--text);
  font-size: 0.75rem;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  max-width: 200px;
}

.ai-model-select:focus {
  border-color: var(--primary);
}

.ai-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.ai-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
}

.ai-message {
  display: flex;
  flex-direction: column;
  max-width: 85%;
}

.ai-message.user {
  align-self: flex-end;
}

.ai-message.assistant {
  align-self: flex-start;
}

.ai-bubble {
  padding: 0.625rem 0.875rem;
  border-radius: var(--radius-lg);
  font-size: 0.875rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.ai-message.user .ai-bubble {
  background: var(--primary-gradient);
  color: white;
  border-bottom-right-radius: 0.25rem;
}

.ai-message.assistant .ai-bubble {
  background: var(--surface-alt);
  color: var(--text);
  border: 1px solid var(--border);
  border-bottom-left-radius: 0.25rem;
}

.ai-loading {
  color: var(--text-muted) !important;
  background: var(--surface-alt) !important;
  border: 1px solid var(--border) !important;
}

.ai-dot-pulse::after {
  content: '';
  animation: dots 1.5s steps(4, end) infinite;
}

@keyframes dots {
  0% { content: ''; }
  25% { content: '.'; }
  50% { content: '..'; }
  75% { content: '...'; }
}

.ai-msg-actions {
  display: flex;
  gap: 0.25rem;
  margin-top: 0.25rem;
  padding-left: 0.25rem;
}

.ai-action-btn {
  padding: 0.125rem 0.25rem;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.ai-action-btn:hover {
  color: var(--primary);
  background: rgba(99, 102, 241, 0.08);
}

.ai-thinking {
  margin-bottom: 0.375rem;
}

.ai-thinking-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius);
  border: none;
  background: rgba(139, 92, 246, 0.08);
  color: var(--primary-light);
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.15s;
}

.ai-thinking-toggle:hover {
  background: rgba(139, 92, 246, 0.15);
}

.ai-thinking-content {
  margin-top: 0.375rem;
  padding: 0.5rem 0.625rem;
  border-radius: var(--radius);
  background: rgba(139, 92, 246, 0.04);
  border-left: 2px solid rgba(139, 92, 246, 0.3);
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--text-muted);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
}

.ai-error {
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius);
  background: rgba(239, 68, 68, 0.08);
  color: var(--error);
  font-size: 0.8125rem;
}

.ai-input-area {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border);
  background: var(--surface);
}

.ai-toolbar {
  display: flex;
  gap: 0.375rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.ai-tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.1875rem 0.5rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--surface-alt);
  color: var(--text-muted);
  font-size: 0.6875rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}

.ai-tool-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.ai-tool-btn.active {
  background: rgba(99, 102, 241, 0.1);
  border-color: var(--primary);
  color: var(--primary);
}

.ai-context-tag {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: rgba(99, 102, 241, 0.06);
  border-radius: var(--radius-sm);
  margin-bottom: 0.5rem;
}

.ai-context-area {
  margin-bottom: 0.5rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  overflow: hidden;
}

.ai-context-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.375rem 0.625rem;
  border: none;
  background: rgba(99, 102, 241, 0.05);
  color: var(--text-muted);
  cursor: pointer;
  font-family: inherit;
}

.ai-context-header:hover {
  background: rgba(99, 102, 241, 0.1);
}

.ai-context-body {
  padding: 0.5rem 0.625rem;
  border-top: 1px solid var(--border-light);
}

.ai-context-text {
  margin: 0;
  font-size: 0.6875rem;
  line-height: 1.5;
  color: var(--text-muted);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 160px;
  overflow-y: auto;
  font-family: inherit;
}

.ai-context-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0.25rem;
  border: none;
  border-top: 1px solid var(--border-light);
  background: transparent;
  color: var(--text-muted);
  font-size: 0.6875rem;
  cursor: pointer;
  font-family: inherit;
}

.ai-context-remove:hover {
  background: rgba(239, 68, 68, 0.06);
  color: var(--error);
}

.ai-input-row {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
}

.ai-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--surface-alt);
  color: var(--text);
  font-size: 0.875rem;
  font-family: inherit;
  resize: none;
  outline: none;
  line-height: 1.5;
  max-height: 120px;
}

.ai-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.ai-input::placeholder {
  color: var(--text-muted);
}

.ai-send-btn {
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  border: none;
  background: var(--primary-gradient);
  color: white;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 0.15s;
}

.ai-send-btn:hover:not(:disabled) {
  opacity: 0.85;
}

.ai-send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ai-icon-btn {
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

.ai-icon-btn:hover:not(:disabled) {
  background: var(--surface-alt);
  color: var(--text);
}

.ai-icon-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.ai-icon-btn-sm {
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
}

.ai-icon-btn-sm:hover {
  background: var(--surface-alt);
  color: var(--error);
}
</style>
