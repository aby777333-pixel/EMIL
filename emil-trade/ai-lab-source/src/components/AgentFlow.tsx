import { useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { AGENTS, agentMeta } from '../data/agents';
import { useStore } from '../store';
import type { AgentStatus } from '../types';

function AgentNode({ data }: NodeProps) {
  const meta = agentMeta(data.name);
  const status: AgentStatus = data.status || 'idle';
  const border =
    status === 'running'
      ? 'border-primary shadow-neon animate-pulseGlow'
      : status === 'complete'
        ? 'border-success/60'
        : status === 'error'
          ? 'border-danger/60'
          : 'border-border';
  return (
    <div className={`glass !rounded-xl px-3 py-2 w-[168px] border-2 ${border} transition-all`}>
      <Handle type="target" position={Position.Left} className="!bg-primary !w-2 !h-2" />
      <div className="flex items-center gap-2">
        <span className="text-lg" style={{ filter: status === 'running' ? 'none' : 'grayscale(0.2)' }}>
          {meta.icon}
        </span>
        <div className="min-w-0">
          <div className="text-xs font-bold truncate">{meta.label}</div>
          <div
            className={`text-[10px] font-semibold uppercase ${
              status === 'running'
                ? 'text-primary'
                : status === 'complete'
                  ? 'text-success'
                  : status === 'error'
                    ? 'text-danger'
                    : 'text-subtext'
            }`}
          >
            {status}
          </div>
        </div>
      </div>
      {data.message && (
        <div className="text-[9px] text-subtext mt-1 line-clamp-2 leading-tight">{data.message}</div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-primary !w-2 !h-2" />
    </div>
  );
}

const nodeTypes = { agent: AgentNode };

export function AgentFlow({ height = 420 }: { height?: number }) {
  const agentStatus = useStore((s) => s.agentStatus);

  const { nodes, edges } = useMemo(() => {
    const perRow = 5;
    const nodes: Node[] = AGENTS.map((a, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const st = agentStatus[a.name];
      return {
        id: a.name,
        type: 'agent',
        position: { x: col * 210, y: row * 150 },
        data: { name: a.name, status: st?.status || 'idle', message: st?.message },
      };
    });

    const edges: Edge[] = [];
    for (let i = 0; i < AGENTS.length - 1; i++) {
      const from = AGENTS[i];
      const to = AGENTS[i + 1];
      const fromRow = Math.floor(i / perRow);
      const toRow = Math.floor((i + 1) / perRow);
      const active =
        agentStatus[from.name]?.status === 'complete' &&
        (agentStatus[to.name]?.status === 'running' || agentStatus[to.name]?.status === 'complete');
      edges.push({
        id: `${from.name}-${to.name}`,
        source: from.name,
        target: to.name,
        animated: active,
        style: { stroke: active ? '#00d4ff' : '#1e2d4a', strokeWidth: active ? 2.5 : 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: active ? '#00d4ff' : '#1e2d4a' },
        // route across rows nicely
        sourceHandle: undefined,
        type: fromRow !== toRow ? 'default' : 'default',
      });
    }
    return { nodes, edges };
  }, [agentStatus]);

  return (
    <div style={{ height }} className="rounded-xl overflow-hidden border border-border">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        panOnScroll={false}
        preventScrolling={false}
      >
        <Background color="#1e2d4a" gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
