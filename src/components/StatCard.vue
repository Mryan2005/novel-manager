<template>
  <div class="card pad-8">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-3xl font-bold" :style="{ color: textColor }">{{ value }}</p>
        <p class="text-[var(--text-light)] mt-1 font-medium">{{ label }}</p>
      </div>
      <div 
        class="w-14 h-14 rounded-2xl flex items-center justify-center"
        :style="{ background: bgColor }"
      >
        <component :is="iconComponent" class="w-7 h-7" :style="{ color: textColor }" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue';
import * as Icons from 'lucide-vue-next';

interface Props {
  icon: string;
  value: number | string;
  label: string;
  color: 'primary' | 'secondary' | 'accent' | 'success';
}

const props = defineProps<Props>();

const iconComponent = computed((): Component => {
  return (Icons as any)[props.icon] || Icons.FileText;
});

const bgColor = computed(() => {
  const colors = {
    primary: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
    secondary: 'rgba(6, 182, 212, 0.1)',
    accent: 'rgba(245, 158, 11, 0.1)',
    success: 'rgba(16, 185, 129, 0.1)',
  };
  return colors[props.color];
});

const textColor = computed(() => {
  const colors = {
    primary: '#6366f1',
    secondary: '#06b6d4',
    accent: '#f59e0b',
    success: '#10b981',
  };
  return colors[props.color];
});
</script>
