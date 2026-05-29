<script setup lang="ts">
import { ref } from 'vue';
import { Send } from 'lucide-vue-next';

const props = defineProps<{
  disabled: boolean;
  loading: boolean;
  placeholder?: string;
}>();

const emit = defineEmits<{
  send: [text: string];
}>();

const inputText = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);

function handleSend() {
  const text = inputText.value.trim();
  if (!text || props.disabled || props.loading) return;
  emit('send', text);
  inputText.value = '';
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto';
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
}

function autoResize() {
  const el = textareaRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 150) + 'px';
}
</script>

<template>
  <div class="ws-input-area">
    <div class="ws-input-row">
      <textarea
        ref="textareaRef"
        v-model="inputText"
        class="ws-input"
        :placeholder="placeholder || '输入你的指令或创作灵感...'"
        :disabled="disabled"
        rows="1"
        @keydown="handleKeydown"
        @input="autoResize"
      />
      <button
        class="ws-send-btn"
        :disabled="disabled || loading || !inputText.trim()"
        @click="handleSend"
      >
        <Send class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.ws-input-area {
  padding: 12px 16px;
  border-top: 1px solid #e2e8f0;
  background: #fff;
}

.ws-input-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.ws-input {
  flex: 1;
  resize: none;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s;
  max-height: 150px;
}

.ws-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.ws-input:disabled {
  background: #f8fafc;
  color: #94a3b8;
}

.ws-send-btn {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 10px;
  background: #6366f1;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.ws-send-btn:hover:not(:disabled) {
  background: #4f46e5;
}

.ws-send-btn:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}
</style>
