<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
        <Flame class="w-4 h-4" style="color: var(--warning);" />
        写作热力图
      </h3>
      <span class="text-xs text-[var(--text-muted)]">{{ monthLabel }}</span>
    </div>

    <div class="overflow-x-auto">
      <div class="flex" style="min-width: fit-content;">
        <div class="flex flex-col gap-0.5 mr-1 shrink-0">
          <span v-for="d in dayLabels" :key="d" class="text-xs text-[var(--text-muted)] h-3 w-5 flex items-center justify-end">{{ d }}</span>
        </div>

        <div>
          <div class="flex mb-0.5 h-4">
            <template v-for="(seg, si) in monthSegments" :key="seg.label">
              <div v-if="seg.visible" class="text-xs text-[var(--text-muted)] whitespace-nowrap"
                :style="{ marginLeft: si === 0 ? '0' : Math.max(0, seg.col * 14 + 1 - (monthSegments[si - 1] ? (monthSegments[si - 1]!.col + 1) * 14 + 1 + 40 : 0)) + 'px' }"
              >{{ seg.label }}</div>
            </template>
          </div>

          <div class="flex gap-0.5">
            <div v-for="col in totalCols" :key="col" class="flex flex-col gap-0.5">
              <div v-for="row in 7" :key="row" class="w-3 h-3 rounded-sm"
                :style="{ background: getCellColor(cellData[(col - 1) * 7 + (row - 1)]) }"
                :title="cellTooltip((col - 1) * 7 + (row - 1))"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1">
        <span class="text-xs text-[var(--text-muted)]">少</span>
        <div v-for="level in 5" :key="level" class="w-3 h-3 rounded-sm" :style="{ background: cellColors[level - 1]! }" />
        <span class="text-xs text-[var(--text-muted)]">多</span>
      </div>
      <button @click="$emit('export')" class="text-xs text-[var(--primary)] hover:underline flex items-center gap-1">
        <Download class="w-3 h-3" />
        导出 JSON
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Flame, Download } from 'lucide-vue-next';
import type { DailyWordRecord } from '../types';

const props = defineProps<{ records: DailyWordRecord[]; days?: number }>();
defineEmits<{ export: [] }>();

const days = computed(() => props.days ?? 91);
const dayLabels = ['一', '', '三', '', '五', '', '日'];
const cellColors = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];

function getColor(count: number): string {
  if (count === 0) return cellColors[0]!;
  if (count < 500) return cellColors[1]!;
  if (count < 2000) return cellColors[2]!;
  if (count < 5000) return cellColors[3]!;
  return cellColors[4]!;
}

const dateMap = computed(() => {
  const map = new Map<string, number>();
  for (const r of props.records) map.set(r.date, r.wordCount);
  return map;
});

const cellData = computed(() => {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const todayDow = today.getDay();
  const todayRow = todayDow === 0 ? 6 : todayDow - 1;

  const totalCells = days.value + ((days.value + todayRow) % 7);
  const totalColsCalc = Math.ceil(totalCells / 7);
  const fullGrid = totalColsCalc * 7;

  const result: { date: string; value: number }[] = [];
  const gridStart = new Date(today);
  gridStart.setDate(today.getDate() - (fullGrid - 1 - todayRow));

  for (let i = 0; i < fullGrid; i++) {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    if (dateStr <= todayStr) {
      result.push({ date: dateStr, value: dateMap.value.get(dateStr) ?? 0 });
    } else {
      result.push({ date: '', value: -1 });
    }
  }
  return result;
});

const totalCols = computed(() => Math.ceil(cellData.value.length / 7));

const monthSegments = computed(() => {
  const segments: { label: string; col: number; visible: boolean }[] = [];
  let lastMonth = '';
  for (let col = 0; col < totalCols.value; col++) {
    const cell = cellData.value[col * 7 + 3];
    if (!cell || !cell.date) continue;
    const month = new Date(cell.date).toLocaleDateString('zh-CN', { month: 'short' });
    if (month !== lastMonth) {
      segments.push({ label: month, col, visible: true });
      lastMonth = month;
    }
  }
  return segments;
});

const monthLabel = computed(() => {
  const segs = monthSegments.value;
  if (segs.length === 0) return '';
  return segs[0]!.label + ' — ' + segs[segs.length - 1]!.label;
});

function getCellColor(cell: { date: string; value: number } | undefined): string {
  if (!cell || cell.value < 0) return 'transparent';
  return getColor(cell.value);
}

function cellTooltip(idx: number): string {
  const cell = cellData.value[idx];
  if (!cell || !cell.date) return '';
  return `${cell.date}: ${cell.value.toLocaleString()} 字`;
}
</script>
