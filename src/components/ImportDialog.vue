<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="$emit('close')"></div>
      <div class="relative bg-white rounded-2xl shadow-2xl w-[420px] max-w-[90vw] max-h-[90vh] overflow-y-auto p-6">
      <h2 class="text-lg font-bold mb-1">导入 JSON</h2>
      <p class="text-sm text-[var(--text-muted)] mb-5">检测到以下内容，选择要导入的项目</p>

      <div class="space-y-1">
        <label
          v-for="section in sections"
          :key="section.key"
          class="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 cursor-pointer"
        >
          <input
            type="checkbox"
            v-model="section.checked"
            class="w-4 h-4 rounded accent-[var(--primary)]"
          />
          <span class="text-sm flex-1">{{ section.label }}</span>
          <span class="text-xs text-[var(--text-muted)]">{{ section.summary }}</span>
        </label>
      </div>

      <div v-if="sections.length === 0" class="py-8 text-center text-sm text-[var(--text-muted)]">
        未检测到可导入的内容
      </div>

      <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border)]">
        <button @click="$emit('close')" class="btn btn-secondary text-sm px-4 py-2">取消</button>
        <button
          @click="confirm"
          class="btn btn-primary text-sm px-4 py-2"
          :disabled="selectedCount === 0"
        >
          导入 ({{ selectedCount }} 项)
        </button>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue';

interface Section {
  key: string;
  label: string;
  summary: string;
  checked: boolean;
}

const props = defineProps<{
  visible: boolean;
  sections: Section[];
}>();

watch(() => props.visible, (v) => {
  document.body.style.overflow = v ? 'hidden' : '';
});

onUnmounted(() => {
  document.body.style.overflow = '';
});

const emit = defineEmits<{
  close: [];
  import: [selected: string[]];
}>();

const selectedCount = computed(() => props.sections.filter(s => s.checked).length);

function confirm() {
  const selected = props.sections.filter(s => s.checked).map(s => s.key);
  if (selected.length === 0) return;
  emit('import', selected);
}
</script>
