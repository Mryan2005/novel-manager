<script setup lang="ts">
import { onMounted } from 'vue';
import { useStore } from './store';
import { initCrossDomainSync, pushToRemote } from './shared-storage';

const { getDataForSync, setDataFromSync } = useStore();

onMounted(() => {
  initCrossDomainSync(getDataForSync, setDataFromSync);
});

// Expose pushToRemote so store can trigger remote sync after saves
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__pushToRemote = pushToRemote;
}
</script>

<template>
  <router-view />
</template>

<style scoped></style>
