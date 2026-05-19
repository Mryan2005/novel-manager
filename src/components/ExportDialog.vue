<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="$emit('close')"></div>
    <div class="relative bg-white rounded-2xl shadow-2xl w-[420px] max-w-[90vw] max-h-[90vh] overflow-y-auto p-6 z-10">
      <h2 class="text-lg font-bold mb-1">导出 JSON</h2>
      <p class="text-sm text-[var(--text-muted)] mb-5">选择要导出的内容</p>

      <label class="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-[var(--border)] mb-2">
        <input
          type="checkbox"
          :checked="allChecked"
          :indeterminate="allIndeterminate"
          @change="toggleAll"
          class="w-4 h-4 rounded accent-[var(--primary)]"
        />
        <span class="font-medium">全部</span>
      </label>

      <div class="ml-2 space-y-1">
        <label
          v-for="item in items"
          :key="item.key"
          class="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer"
        >
          <input
            type="checkbox"
            :checked="selected.has(item.key)"
            @change="toggle(item.key)"
            class="w-4 h-4 rounded accent-[var(--primary)]"
          />
          <div class="flex-1">
            <span class="text-sm">{{ item.label }}</span>
            <span class="text-xs text-[var(--text-muted)] ml-1.5">{{ item.hint }}</span>
          </div>
          <span class="text-xs text-[var(--text-muted)]">{{ item.summary }}</span>
        </label>
      </div>

      <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border)]">
        <button @click="$emit('close')" class="btn btn-secondary text-sm px-4 py-2">取消</button>
        <button @click="confirm" class="btn btn-primary text-sm px-4 py-2" :disabled="selected.size === 0">
          导出 ({{ selected.size }} 项)
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';

const props = defineProps<{
  visible: boolean;
  summaries: Record<string, string>;
}>();

watch(() => props.visible, (v) => {
  document.body.style.overflow = v ? 'hidden' : '';
});

onUnmounted(() => {
  document.body.style.overflow = '';
});

const emit = defineEmits<{
  close: [];
  export: [selected: string[]];
}>();

const ALL_KEYS = ['articles', 'dayCount', 'lore', 'settings', 'aiChats'];

const items = [
  { key: 'articles', label: '文章', hint: '(卷 + 章节)' },
  { key: 'dayCount', label: '码字记录', hint: '' },
  { key: 'lore', label: '设定集', hint: '(角色 + 场景 + 物品)' },
  { key: 'settings', label: '设置', hint: '' },
  { key: 'aiChats', label: 'AI 对话', hint: '' },
].map(item => ({
  ...item,
  summary: props.summaries[item.key] || '',
}));

const selected = ref(new Set<string>(ALL_KEYS));

const allChecked = computed(() => selected.value.size === ALL_KEYS.length);
const allIndeterminate = computed(() => selected.value.size > 0 && selected.value.size < ALL_KEYS.length);

function toggle(key: string) {
  if (selected.value.has(key)) {
    selected.value.delete(key);
  } else {
    selected.value.add(key);
  }
}

function toggleAll() {
  if (allChecked.value) {
    selected.value.clear();
  } else {
    selected.value = new Set(ALL_KEYS);
  }
}

function confirm() {
  if (selected.value.size === 0) return;
  emit('export', [...selected.value]);
}
</script>
