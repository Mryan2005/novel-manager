<template>
  <div class="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
    <div v-if="open" class="card ai-panel pad-5 space-y-4">
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-sm font-semibold text-[var(--text)]">AI 写作浮窗</h3>
        <button class="text-xs text-[var(--text-muted)] hover:text-[var(--text)]" @click="open = false">收起</button>
      </div>

      <p class="text-xs text-[var(--text-muted)] leading-relaxed">
        API URL、Token、模型等配置只保存在本地浏览器，不会上传到本项目服务器。
      </p>

      <div class="grid grid-cols-2 gap-3">
        <select v-model="config.provider" class="input text-sm">
          <option value="openai">OpenAI</option>
          <option value="openai-like">类 OpenAI</option>
          <option value="gemini">Gemini</option>
        </select>
        <input v-model="config.model" class="input text-sm" placeholder="模型名，如 gpt-4o-mini" />
      </div>

      <input v-model="config.apiUrl" class="input text-sm" placeholder="API URL / Base URL" />
      <input v-model="config.token" class="input text-sm" placeholder="Token / API Key" type="password" />

      <textarea v-model="prompt" class="input text-sm min-h-[92px]" placeholder="输入你的提示词..." />

      <div class="flex items-center gap-2">
        <button class="btn btn-primary flex-1" :disabled="loading" @click="askAi">
          {{ loading ? '生成中...' : '生成建议' }}
        </button>
        <button class="btn btn-secondary" :disabled="!responseText" @click="copyResult">复制</button>
      </div>

      <button
        v-if="isEditorRoute && responseText"
        class="btn btn-secondary w-full"
        @click="insertToEditor"
      >
        插入到当前编辑内容
      </button>

      <p v-if="errorMessage" class="text-xs text-[var(--error)] leading-relaxed">{{ errorMessage }}</p>
      <textarea v-if="responseText" v-model="responseText" class="input text-sm min-h-[140px]" />
    </div>

    <button class="btn btn-primary ai-fab" @click="open = !open">
      {{ open ? '关闭 AI' : 'AI 助手' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

type ProviderType = 'openai' | 'openai-like' | 'gemini';

interface AIConfig {
  provider: ProviderType;
  apiUrl: string;
  token: string;
  model: string;
}

const STORAGE_KEY = 'novel-workshop-ai-config';
const route = useRoute();
const open = ref(false);
const loading = ref(false);
const prompt = ref('');
const responseText = ref('');
const errorMessage = ref('');

const config = reactive<AIConfig>(loadConfig());
const isEditorRoute = computed(() => route.path.startsWith('/editor'));

watch(
  () => ({ ...config }),
  (value) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  },
  { deep: true }
);

function loadConfig(): AIConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        provider: parsed.provider === 'gemini' || parsed.provider === 'openai-like' ? parsed.provider : 'openai',
        apiUrl: typeof parsed.apiUrl === 'string' ? parsed.apiUrl : '',
        token: typeof parsed.token === 'string' ? parsed.token : '',
        model: typeof parsed.model === 'string' ? parsed.model : '',
      };
    }
  } catch {
    // ignore
  }
  return {
    provider: 'openai',
    apiUrl: '',
    token: '',
    model: '',
  };
}

function normalizeUrl(base: string, suffix: string) {
  const clean = base.trim().replace(/\/+$/, '');
  return clean.endsWith(suffix) ? clean : `${clean}${suffix}`;
}

function ensureGeminiEndpoint(base: string, model: string, token: string) {
  const trimmed = base.trim();
  if (!trimmed) return '';
  const withPath = trimmed.includes(':generateContent')
    ? trimmed
    : normalizeUrl(trimmed, `/models/${model}:generateContent`);
  if (!token) return withPath;
  const sep = withPath.includes('?') ? '&' : '?';
  return `${withPath}${sep}key=${encodeURIComponent(token)}`;
}

async function askAi() {
  errorMessage.value = '';
  responseText.value = '';

  const content = prompt.value.trim();
  if (!content) {
    errorMessage.value = '请输入提示词。';
    return;
  }
  if (!config.apiUrl.trim() || !config.model.trim()) {
    errorMessage.value = '请先填写 API URL 与模型名。';
    return;
  }
  if (!config.token.trim()) {
    errorMessage.value = '请先填写 Token / API Key。';
    return;
  }

  loading.value = true;
  try {
    if (config.provider === 'gemini') {
      await askGemini(content);
    } else {
      await askOpenAiLike(content);
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '请求失败，请检查配置。';
  } finally {
    loading.value = false;
  }
}

async function askOpenAiLike(content: string) {
  const endpoint = normalizeUrl(config.apiUrl, '/chat/completions');
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.token.trim()}`,
    },
    body: JSON.stringify({
      model: config.model.trim(),
      messages: [
        { role: 'system', content: '你是小说写作助手，请给出可直接用于创作的建议。' },
        { role: 'user', content },
      ],
      temperature: 0.7,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `请求失败：${res.status}`);
  }

  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('模型未返回可用内容。');
  responseText.value = String(text).trim();
}

async function askGemini(content: string) {
  const endpoint = ensureGeminiEndpoint(config.apiUrl, config.model.trim(), config.token.trim());
  if (!endpoint) throw new Error('Gemini API URL 无效。');

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: content }],
        },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `请求失败：${res.status}`);
  }

  const parts = data?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts)
    ? parts.map((part: { text?: string }) => part?.text || '').join('\n').trim()
    : '';
  if (!text) throw new Error('模型未返回可用内容。');
  responseText.value = text;
}

async function copyResult() {
  if (!responseText.value) return;
  await navigator.clipboard.writeText(responseText.value);
}

function insertToEditor() {
  if (!responseText.value) return;
  window.dispatchEvent(new CustomEvent('novel-ai-insert', { detail: responseText.value }));
}
</script>

<style scoped>
.ai-panel {
  width: min(26rem, calc(100vw - 3rem));
  max-height: min(78vh, 42rem);
  overflow: auto;
}

.ai-fab {
  box-shadow: var(--shadow-lg);
}
</style>
