<script setup lang="ts">
const props = defineProps<{
  systemPrompt: string;
  preview: string;
}>();

const emit = defineEmits<{
  update: [prompt: string];
}>();
</script>

<template>
  <div class="ws-system-panel">
    <div class="ws-system-header">
      <span>系统提示词</span>
    </div>

    <div class="ws-system-body">
      <label class="ws-system-label">自定义系统提示词</label>
      <p class="ws-system-hint">
        此内容将放在记忆块之前发送给 AI。你可以在这里定义 AI 的角色、创作风格等。
      </p>
      <textarea
        class="ws-system-textarea"
        :value="systemPrompt"
        @input="emit('update', ($event.target as HTMLTextAreaElement).value)"
        placeholder="例如：你是一位专业的小说创作助手，擅长玄幻和仙侠题材..."
        rows="6"
      />

      <div v-if="preview" class="ws-system-preview-section">
        <label class="ws-system-label">完整提示词预览（含记忆）</label>
        <pre class="ws-system-preview">{{ preview }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ws-system-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ws-system-header {
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  border-bottom: 1px solid #e2e8f0;
}

.ws-system-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.ws-system-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  margin-bottom: 4px;
}

.ws-system-hint {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 8px;
  line-height: 1.4;
}

.ws-system-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
  outline: none;
  resize: vertical;
  font-family: monospace;
  margin-bottom: 16px;
}

.ws-system-textarea:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.ws-system-preview-section {
  margin-top: 8px;
}

.ws-system-preview {
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: #334155;
  margin: 0;
  font-family: monospace;
  max-height: 300px;
  overflow-y: auto;
}
</style>
