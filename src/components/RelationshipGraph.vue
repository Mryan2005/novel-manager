<template>
  <div class="g6-graph-wrap">
    <div class="g6-toolbar">
      <span class="g6-title">{{ title }}</span>
      <div class="g6-actions">
        <button class="btn btn-secondary text-xs !px-2 !py-1" @click="fitGraph">适应</button>
        <button class="btn btn-secondary text-xs !px-2 !py-1" @click="resetLayout">重置</button>
      </div>
    </div>
    <div ref="containerRef" class="g6-container" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { Graph } from '@antv/g6';

interface GraphNode {
  id: string;
  label: string;
  group?: string;
  color?: string;
  combo?: string;
  children?: string[];
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

const props = withDefaults(defineProps<{
  nodes: GraphNode[];
  edges: GraphEdge[];
  title?: string;
}>(), {
  title: '关系图',
});

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'];
const containerRef = ref<HTMLDivElement | null>(null);
let graph: Graph | null = null;

function buildGraph() {
  if (!containerRef.value || props.nodes.length === 0) return;

  if (graph) {
    graph.destroy();
    graph = null;
  }

  const g6Nodes = props.nodes.map((n, i) => {
    const color = n.color || COLORS[i % COLORS.length]!;
    const hasChildren = n.children && n.children.length > 0;
    return {
      id: n.id,
      data: {
        label: n.label,
        color,
        hasChildren,
        children: n.children || [],
      },
      style: {
        fill: color,
        stroke: color,
        labelText: n.label,
        labelFill: '#fff',
        labelFontSize: 13,
        labelFontWeight: 'bold' as const,
        labelPlacement: 'center' as const,
        size: hasChildren ? 48 : 40,
        shadowBlur: 8,
        shadowColor: color,
        shadowOffsetX: 0,
        shadowOffsetY: 2,
        ports: [
          { key: 'top', placement: 'top' as const },
          { key: 'bottom', placement: 'bottom' as const },
          { key: 'left', placement: 'left' as const },
          { key: 'right', placement: 'right' as const },
        ],
      },
    };
  });

  const g6Edges = props.edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    data: { label: e.label || '' },
    style: {
      stroke: '#94a3b8',
      lineWidth: 2,
      endArrow: true,
      labelText: e.label || '',
      labelFill: '#64748b',
      labelFontSize: 11,
      labelBackground: true,
      labelBackgroundFill: '#fff',
      labelBackgroundOpacity: 0.85,
      labelBackgroundPadding: [2, 4] as [number, number],
    } as Record<string, unknown>,
    animation: {
      dash: { loop: true, lineDash: [4, 4], speed: 2000 },
    },
  }));

  // Build combos from groups
  const comboMap = new Map<string, string[]>();
  props.nodes.forEach(n => {
    if (n.group) {
      if (!comboMap.has(n.group)) comboMap.set(n.group, []);
      comboMap.get(n.group)!.push(n.id);
    }
  });

  const g6Combos = [...comboMap.entries()].map(([group], i) => ({
    id: `combo-${i}`,
    data: { label: group },
    style: {
      fill: '#f1f5f9',
      stroke: '#94a3b8',
      strokeDasharray: [4, 4] as [number, number],
      labelText: group,
      labelFill: '#64748b',
      labelFontSize: 12,
      labelPlacement: 'top' as const,
      radius: 12,
      padding: [20, 20, 20, 20] as [number, number, number, number],
    },
  }));

  if (g6Combos.length > 0) {
    props.nodes.forEach(n => {
      if (n.group) {
        const comboIdx = [...comboMap.keys()].indexOf(n.group);
        const node = g6Nodes.find(gn => gn.id === n.id);
        if (node) (node as Record<string, unknown>).combo = `combo-${comboIdx}`;
      }
    });
  }

  graph = new Graph({
    container: containerRef.value,
    width: containerRef.value.clientWidth,
    height: containerRef.value.clientHeight,
    data: {
      nodes: g6Nodes as any,
      edges: g6Edges as any,
      combos: g6Combos as any,
    },
    node: {
      type: 'circle',
      state: {
        active: {
          halo: true,
          haloFill: (data: any) => data.data?.color || '#6366f1',
          haloLineWidth: 3,
          haloStrokeOpacity: 0.4,
          haloOpacity: 0.3,
          shadowBlur: 20,
          shadowColor: (d: any) => d.style?.shadowColor || '#6366f1',
          lineWidth: 3,
          stroke: '#fff',
          size: (d: any) => (d.data?.hasChildren ? 56 : 48),
          zIndex: 999,
        },
      },
    },
    edge: {
      type: 'line',
      style: { endArrow: true },
      state: {
        active: {
          stroke: '#6366f1',
          lineWidth: 3,
          halo: true,
          haloLineWidth: 2,
          haloStrokeOpacity: 0.3,
        },
      },
    },
    combo: {
      type: 'rect',
      style: { radius: 12 },
    },
    behaviors: [
      'drag-canvas',
      'drag-element',
      'zoom-canvas',
      'collapse-expand',
      { type: 'hover-activate', degree: 1, direction: 'both' as const },
    ],
    layout: {
      type: 'force',
      preventOverlap: true,
      linkDistance: 250,
      nodeStrength: -300,
      edgeStrength: 0.1,
      animated: true,
    },
    animation: { duration: 500 },
    autoFit: 'view',
    padding: [40, 40, 40, 40] as [number, number, number, number],
  });

  graph.render().then(() => {
    graph?.fitView();
  });
}

function fitGraph() {
  graph?.fitView();
}

function resetLayout() {
  if (!graph) return;
  graph.layout({
    type: 'force',
    preventOverlap: true,
    linkDistance: 250,
    nodeStrength: -300,
    edgeStrength: 0.1,
    animated: true,
  } as any).then(() => {
    graph?.fitView();
  });
}

watch(() => [props.nodes, props.edges], () => {
  nextTick(() => buildGraph());
}, { deep: true });

onMounted(() => {
  nextTick(() => buildGraph());
});

onUnmounted(() => {
  if (graph) {
    graph.destroy();
    graph = null;
  }
});
</script>

<style scoped>
.g6-graph-wrap {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 520px;
  background: #f8fafc;
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.g6-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  background: #fff;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.g6-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text);
}

.g6-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.g6-container {
  flex: 1;
  min-height: 480px;
}
</style>
