<script setup lang="ts">
import { ref, computed } from 'vue';
import { Settings, Brain, CircuitBoard, Bot, BookOpen } from 'lucide-vue-next';
import Layout from '../components/Layout.vue';
import WSSessionSidebar from '../components/ws/WSSessionSidebar.vue';
import WSChatMessages from '../components/ws/WSChatMessages.vue';
import WSMessageInput from '../components/ws/WSMessageInput.vue';
import WSMemoryPanel from '../components/ws/WSMemoryPanel.vue';
import WSSystemPromptPanel from '../components/ws/WSSystemPromptPanel.vue';
import { useSettings } from '../composables/useSettings';
import { useWorldSimulation } from '../composables/useWorldSimulation';
import { useMemoryCards } from '../composables/useMemoryCards';
import { useWorldTools } from '../composables/useWorldTools';
import { useWorldAI } from '../composables/useWorldAI';
import type { WSMode, WSSubMode, SuperPowerStep } from '../types-world-sim';

const { settings, activeAIConfig, setActiveAIConfig } = useSettings();
const ws = useWorldSimulation();
const mc = useMemoryCards();
const wt = useWorldTools();
const ai = useWorldAI();

const showMemoryPanel = ref(false);
const showSystemPrompt = ref(false);
const inputPlaceholder = ref('输入创作灵感或指令...');

const hasConfig = computed(() => {
  const cfg = activeAIConfig.value;
  if (!cfg) return false;
  const hasToken = cfg.provider === 'gemini' ? cfg.token.trim() !== '' : cfg.token.trim() !== '';
  const hasModel = cfg.model.trim() !== '';
  return hasToken && hasModel && (cfg.provider === 'gemini' || cfg.apiUrl.trim() !== '');
});

const currentSession = computed(() => ws.activeSession.value);
const sessionMessages = computed(() => currentSession.value?.messages ?? []);
const currentMode = computed(() => currentSession.value?.mode ?? 'normal');
const currentSubMode = computed(() => currentSession.value?.subMode ?? 'chapter-gen');
const attachedCards = computed(() => {
  return mc.getCardsByIds(currentSession.value?.memoryIds ?? []);
});

const fullSystemPromptPreview = computed(() => {
  return ws.buildFullSystemPrompt();
});

function switchModel(id: string) {
  setActiveAIConfig(id);
}

function setMode(mode: WSMode) {
  ws.setMode(mode);
  if (mode === 'normal') {
    inputPlaceholder.value = '输入创作灵感或指令...';
  } else {
    inputPlaceholder.value = '输入指令启动超能模式（AI 将制定计划并调用工具）...';
  }
}

function setSubMode(subMode: WSSubMode) {
  ws.setSubMode(subMode);
  if (subMode === 'chapter-gen') {
    inputPlaceholder.value = '描述你想生成的章节内容...';
  } else {
    inputPlaceholder.value = '描述你的创作想法，AI 将引导你逐步完善...';
  }
}

function handleCreateSession() {
  ws.createSession();
  showMemoryPanel.value = false;
  showSystemPrompt.value = false;
}

function handleSelectSession(id: string) {
  ws.selectSession(id);
}

function handleDeleteSession(id: string) {
  ws.deleteSession(id);
}

function handleSystemPromptUpdate(prompt: string) {
  ws.updateSystemPrompt(prompt);
}

function handleAttachMemory(cardId: string) {
  ws.attachMemory(cardId);
}

function handleDetachMemory(cardId: string) {
  ws.detachMemory(cardId);
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

async function handleSend(text: string) {
  if (!hasConfig.value || ai.loading.value) return;

  ws.ensureSession();
  const session = ws.activeSession.value;
  if (!session) return;

  const fullSystemPrompt = fullSystemPromptPreview.value;

  if (currentMode.value === 'super-power') {
    // Super power mode
    const toolDefs = wt.getToolDefinitions() as unknown as Record<string, unknown>[];

    ws.addMessage('user', text);

    try {
      const result = await ai.sendSuperPowerMessage(
        text,
        fullSystemPrompt,
        session.messages.slice(0, -1),
        toolDefs,
        wt.executeTool,
        (step: SuperPowerStep) => {
          // Plan step update - handled via the plan object in the result
        }
      );

      ws.addMessage('assistant', result.content, {
        thinking: result.thinking,
        plan: result.plan,
        toolResults: result.toolResults,
      });
    } catch (e) {
      ai.error.value = e instanceof Error ? e.message : '请求失败';
    }
  } else if (currentSubMode.value === 'guided-gen') {
    // Guided generation - two-phase
    const lastMsg = session.messages.slice(-1)[0];

    // Check if we're in the "ask" phase or the "generate" phase
    const isGenerating = lastMsg && lastMsg.role === 'user' &&
      session.messages.filter(m => m.role === 'user').length > 1;

    if (isGenerating) {
      ws.addMessage('user', text);

      try {
        const result = await ai.sendGuidedGeneration(
          text,
          fullSystemPrompt,
          session.messages.slice(0, -1),
        );
        ws.addMessage('assistant', result.content, { thinking: result.thinking });
      } catch (e) {
        ai.error.value = e instanceof Error ? e.message : '请求失败';
      }
    } else {
      // First phase: ask guiding questions
      ws.addMessage('user', text);

      try {
        const result = await ai.sendGuidedQuestion(
          text,
          fullSystemPrompt,
          session.messages.slice(0, -1),
        );
        ws.addMessage('assistant', result.content, { thinking: result.thinking });
      } catch (e) {
        ai.error.value = e instanceof Error ? e.message : '请求失败';
      }
    }
  } else {
    // Normal chapter generation
    ws.addMessage('user', text);

    try {
      const result = await ai.sendNormalMessage(
        text,
        fullSystemPrompt,
        session.messages.slice(0, -1),
      );
      ws.addMessage('assistant', result.content, { thinking: result.thinking });
    } catch (e) {
      ai.error.value = e instanceof Error ? e.message : '请求失败';
    }
  }
}
</script>

<template>
  <Layout>
    <div class="ws-page">
      <!-- Top bar -->
      <div class="ws-topbar">
        <div class="ws-topbar-left">
          <CircuitBoard class="w-5 h-5 text-indigo-500" />
          <span class="ws-topbar-title">世界模拟</span>
        </div>

        <div class="ws-topbar-center">
          <!-- Model selector -->
          <select
            v-if="settings.aiConfigs.length > 1"
            class="ws-model-select"
            :value="settings.aiActiveConfigId"
            @change="switchModel(($event.target as HTMLSelectElement).value)"
          >
            <option
              v-for="cfg in settings.aiConfigs"
              :key="cfg.id"
              :value="cfg.id"
            >
              {{ cfg.name }} ({{ cfg.model || '未设置' }})
            </option>
          </select>
          <span v-else class="ws-model-static">
            {{ activeAIConfig?.name || '未配置' }}
          </span>

          <!-- Mode toggle -->
          <div class="ws-mode-toggle">
            <button
              class="ws-mode-btn"
              :class="{ active: currentMode === 'normal' }"
              @click="setMode('normal')"
            >
              <BookOpen class="w-3.5 h-3.5" />
              普通模式
            </button>
            <button
              class="ws-mode-btn"
              :class="{ active: currentMode === 'super-power' }"
              @click="setMode('super-power')"
            >
              <Bot class="w-3.5 h-3.5" />
              超能模式
            </button>
          </div>

          <!-- Sub-mode (normal only) -->
          <div v-if="currentMode === 'normal'" class="ws-submode-toggle">
            <button
              class="ws-submode-btn"
              :class="{ active: currentSubMode === 'chapter-gen' }"
              @click="setSubMode('chapter-gen')"
            >
              篇章生成
            </button>
            <button
              class="ws-submode-btn"
              :class="{ active: currentSubMode === 'guided-gen' }"
              @click="setSubMode('guided-gen')"
            >
              引导式生成
            </button>
          </div>
        </div>

        <div class="ws-topbar-right">
          <button
            class="ws-toggle-btn"
            :class="{ active: showSystemPrompt }"
            @click="showSystemPrompt = !showSystemPrompt; showMemoryPanel = false"
          >
            <Settings class="w-4 h-4" />
            提示词
          </button>
          <button
            class="ws-toggle-btn"
            :class="{ active: showMemoryPanel }"
            @click="showMemoryPanel = !showMemoryPanel; showSystemPrompt = false"
          >
            <Brain class="w-4 h-4" />
            记忆
          </button>
        </div>
      </div>

      <!-- Configuration warning -->
      <div v-if="!hasConfig" class="ws-config-warning">
        请先在设置页面配置 AI 的 API Token 和模型名称。
      </div>

      <!-- Main body -->
      <div class="ws-body">
        <!-- Left sidebar: sessions -->
        <WSSessionSidebar
          :sessions="ws.sessions.value"
          :active-session-id="ws.activeSessionId.value"
          @create="handleCreateSession"
          @select="handleSelectSession"
          @delete="handleDeleteSession"
        />

        <!-- Center: chat area -->
        <div class="ws-chat-area">
          <WSChatMessages
            :messages="sessionMessages"
            :loading="ai.loading.value"
            :error-message="ai.error.value"
            @copy="copyText"
          />

          <WSMessageInput
            :disabled="!hasConfig"
            :loading="ai.loading.value"
            :placeholder="inputPlaceholder"
            @send="handleSend"
          />
        </div>

        <!-- Right panels -->
        <div v-if="showSystemPrompt" class="ws-right-panel">
          <WSSystemPromptPanel
            :system-prompt="currentSession?.systemPrompt ?? ''"
            :preview="fullSystemPromptPreview"
            @update="handleSystemPromptUpdate"
          />
        </div>

        <div v-if="showMemoryPanel" class="ws-right-panel">
          <WSMemoryPanel
            :cards="mc.cards.value"
            :attached-ids="currentSession?.memoryIds ?? []"
            @create="(type: any, title: any, content: any) => mc.addCard(type, title, content)"
            @update="(id: any, partial: any) => mc.updateCard(id, partial)"
            @delete="(id: any) => mc.deleteCard(id)"
            @attach="handleAttachMemory"
            @detach="handleDetachMemory"
          />
        </div>

        <!-- Both panels closed: show memory overview -->
        <div v-if="!showSystemPrompt && !showMemoryPanel && currentSession && attachedCards.length > 0" class="ws-memory-indicator">
          <Brain class="w-3.5 h-3.5 text-indigo-400" />
          <span>{{ attachedCards.length }} 个记忆卡片已关联</span>
        </div>
      </div>
    </div>
  </Layout>
</template>

<style scoped>
.ws-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 56px);
  background: #fff;
}

/* Top bar */
.ws-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid #e2e8f0;
  background: #fff;
  gap: 12px;
  flex-shrink: 0;
}

.ws-topbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ws-topbar-title {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.ws-topbar-center {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ws-topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ws-model-select {
  padding: 6px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  background: #fff;
  color: #334155;
}

.ws-model-static {
  font-size: 13px;
  color: #94a3b8;
  padding: 6px 10px;
}

.ws-mode-toggle {
  display: flex;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 2px;
}

.ws-mode-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 14px;
  border: none;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  background: transparent;
  color: #64748b;
}

.ws-mode-btn.active {
  background: #fff;
  color: #6366f1;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.ws-submode-toggle {
  display: flex;
  gap: 4px;
}

.ws-submode-btn {
  padding: 5px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  background: #fff;
  color: #64748b;
}

.ws-submode-btn.active {
  background: #eef2ff;
  border-color: #6366f1;
  color: #6366f1;
}

.ws-toggle-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s;
}

.ws-toggle-btn:hover,
.ws-toggle-btn.active {
  border-color: #6366f1;
  color: #6366f1;
  background: #eef2ff;
}

/* Config warning */
.ws-config-warning {
  padding: 8px 16px;
  background: #fef2f2;
  color: #dc2626;
  font-size: 13px;
  text-align: center;
  border-bottom: 1px solid #fecaca;
  flex-shrink: 0;
}

/* Main body */
.ws-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.ws-chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ws-right-panel {
  width: 320px;
  min-width: 320px;
  border-left: 1px solid #e2e8f0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.ws-memory-indicator {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  font-size: 12px;
  color: #64748b;
}
</style>
