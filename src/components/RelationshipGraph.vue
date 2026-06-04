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
import { ref, watch, onMounted, onUnmounted } from 'vue';
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
const LABEL_ZOOM_THRESHOLD = 0.6;

function buildGraph() {
  if (!containerRef.value || props.nodes.length === 0) return;

  requestAnimationFrame(() => {
    if (!containerRef.value || props.nodes.length === 0) return;

    if (graph) {
      graph.destroy();
      graph = null;
    }

    const cw = containerRef.value.clientWidth || 800;
    const ch = containerRef.value.clientHeight || 560;

    const isLargeGraph = props.nodes.length > 100;

    const g6Nodes = props.nodes.map((n, i) => {
      const color = n.color || COLORS[i % COLORS.length]!;
      const hasChildren = n.children && n.children.length > 0;
      const nodeSize = hasChildren ? 36 : 28;
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
          // Hide labels by default for performance — shown on hover or zoom
          labelText: isLargeGraph ? '' : n.label.slice(0, 6),
          labelFill: '#fff',
          labelFontSize: 10,
          labelFontWeight: 'bold' as const,
          labelPlacement: 'center' as const,
          size: nodeSize,
          opacity: 0.9,
        },
      };
    });

    const g6Edges = props.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      data: { label: e.label || '' },
      style: {
        stroke: '#cbd5e1',
        lineWidth: 1.5,
        endArrow: true,
        opacity: 0.7,
      } as Record<string, unknown>,
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
        fill: '#f8fafc',
        stroke: '#cbd5e1',
        opacity: 0.6,
        labelText: group,
        labelFill: '#94a3b8',
        labelFontSize: 11,
        labelPlacement: 'top' as const,
        radius: 10,
        padding: [16, 16, 16, 16] as [number, number, number, number],
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
      width: cw,
      height: ch,
      renderer: 'webgl' as any,
      data: {
        nodes: g6Nodes as any,
        edges: g6Edges as any,
        combos: g6Combos as any,
      },
      node: {
        type: 'circle',
        state: {
          hover: {
            stroke: '#fff',
            lineWidth: 3,
            size: (d: any) => (d.data?.hasChildren ? 44 : 36),
            labelText: (d: any) => d.data?.label || '',
            labelFill: '#fff',
            labelFontSize: 12,
            labelFontWeight: 'bold' as const,
            zIndex: 999,
          },
        },
      },
      edge: {
        type: 'line',
        style: { endArrow: true },
        state: {
          hover: {
            stroke: '#6366f1',
            lineWidth: 2.5,
            opacity: 1,
          },
        },
      },
      combo: {
        type: 'rect',
        style: { radius: 10 },
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
        nodeSize: 40,
        linkDistance: 150,
        manyBodyStrength: -400,
        edgeStrength: 0.1,
        gravity: 2,
        iterations: 300,
        animated: !isLargeGraph,
      },
      animation: { duration: isLargeGraph ? 0 : 300 },
      autoFit: 'center' as any,
      padding: [60, 60, 60, 60] as [number, number, number, number],
    });

    graph.render().then(() => {
      graph?.fitCenter();

      // LOD: show labels when zoomed in, hide when zoomed out
      if (isLargeGraph) {
        graph?.on('viewportchange', () => {
          const zoom = graph?.getZoom() ?? 1;
          const showLabels = zoom >= LABEL_ZOOM_THRESHOLD;
          props.nodes.forEach(n => {
            try {
              graph?.updateNodeData([{
                id: n.id,
                style: {
                  labelText: showLabels ? n.label.slice(0, 6) : '',
                },
              }]);
            } catch { /* ignore */ }
          });
          if (showLabels) graph?.draw();
        });
      }
    });

    // Hover: show full label and highlight edge
    graph.on('node:pointerenter', (evt: any) => {
      const nodeId = evt.target?.id;
      if (!nodeId) return;
      try {
        graph?.setElementState({ [nodeId]: 'hover' });
      } catch { /* ignore */ }
    });

    graph.on('node:pointerleave', (evt: any) => {
      const nodeId = evt.target?.id;
      if (!nodeId) return;
      try {
        graph?.setElementState({ [nodeId]: '' });
      } catch { /* ignore */ }
    });
  });
}

function fitGraph() {
  graph?.fitCenter();
}

function resetLayout() {
  if (!graph) return;
  const isLargeGraph = props.nodes.length > 100;
  graph.layout({
    type: 'force',
    preventOverlap: true,
    nodeSize: 40,
    linkDistance: 150,
    manyBodyStrength: -400,
    edgeStrength: 0.1,
    gravity: 2,
    iterations: 300,
    animated: !isLargeGraph,
  } as any).then(() => {
    graph?.fitCenter();
  });
}

watch(() => [props.nodes, props.edges], () => {
  buildGraph();
}, { deep: true });

onMounted(() => {
  buildGraph();
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
