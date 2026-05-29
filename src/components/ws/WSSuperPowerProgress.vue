<script setup lang="ts">
import { CheckCircle, Loader2, Circle, AlertCircle } from 'lucide-vue-next';
import type { SuperPowerPlan } from '../../types-world-sim';

defineProps<{
  plan: SuperPowerPlan | null;
}>();

function toolNameLabel(name: string): string {
  const map: Record<string, string> = {
    read_chapter: '读取章节',
    read_character: '读取角色',
    read_location: '读取场景',
    read_item: '读取物品',
  };
  return map[name] || name;
}
</script>

<template>
  <div v-if="plan && plan.steps.length > 0" class="ws-plan">
    <div class="ws-plan-header">
      <span class="ws-plan-title">执行计划</span>
      <span class="ws-plan-goal">{{ plan.goal.slice(0, 40) }}{{ plan.goal.length > 40 ? '...' : '' }}</span>
    </div>

    <div class="ws-plan-steps">
      <div
        v-for="step in plan.steps"
        :key="step.stepNumber"
        class="ws-plan-step"
        :class="step.status"
      >
        <div class="ws-plan-step-icon">
          <CheckCircle v-if="step.status === 'completed'" class="w-4 h-4" />
          <Loader2 v-else-if="step.status === 'in-progress'" class="w-4 h-4 animate-spin" />
          <AlertCircle v-else-if="step.status === 'error'" class="w-4 h-4" />
          <Circle v-else class="w-4 h-4" />
        </div>

        <div class="ws-plan-step-body">
          <div class="ws-plan-step-title">
            步骤 {{ step.stepNumber }}
            <span v-if="step.toolName" class="ws-plan-step-tool">
              {{ toolNameLabel(step.toolName) }}
            </span>
          </div>
          <div v-if="step.description" class="ws-plan-step-desc">
            {{ step.description }}
          </div>
          <div v-if="step.toolResult && step.status === 'completed'" class="ws-plan-step-result">
            <pre>{{ step.toolResult.length > 300 ? step.toolResult.slice(0, 300) + '...' : step.toolResult }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ws-plan {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 8px;
}

.ws-plan-header {
  padding: 10px 14px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ws-plan-title {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.ws-plan-goal {
  font-size: 12px;
  color: #94a3b8;
}

.ws-plan-steps {
  padding: 8px 12px;
}

.ws-plan-step {
  display: flex;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f9;
}

.ws-plan-step:last-child {
  border-bottom: none;
}

.ws-plan-step-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.ws-plan-step.completed .ws-plan-step-icon {
  color: #22c55e;
}

.ws-plan-step.in-progress .ws-plan-step-icon {
  color: #6366f1;
}

.ws-plan-step.error .ws-plan-step-icon {
  color: #ef4444;
}

.ws-plan-step.pending .ws-plan-step-icon {
  color: #cbd5e1;
}

.ws-plan-step-body {
  flex: 1;
  min-width: 0;
}

.ws-plan-step-title {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
}

.ws-plan-step-tool {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 8px;
  background: #eef2ff;
  color: #6366f1;
  border-radius: 4px;
  font-size: 11px;
}

.ws-plan-step-desc {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.ws-plan-step-result {
  margin-top: 4px;
}

.ws-plan-step-result pre {
  margin: 0;
  padding: 6px 8px;
  background: #f1f5f9;
  border-radius: 6px;
  font-size: 11px;
  color: #334155;
  white-space: pre-wrap;
  font-family: monospace;
  line-height: 1.4;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
