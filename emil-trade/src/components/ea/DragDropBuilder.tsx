'use client';

import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Clock,
  Target,
  XCircle,
  ShieldCheck,
  Activity,
  GripVertical,
  Plus,
  ArrowDown,
} from 'lucide-react';

interface Block {
  id: string;
  label: string;
  category: 'condition' | 'action';
  icon: React.ReactNode;
  color: string;
  params: { name: string; value: string }[];
}

const CONDITION_BLOCKS: Block[] = [
  {
    id: 'price-above-ma',
    label: 'Price Above MA',
    category: 'condition',
    icon: <TrendingUp size={14} />,
    color: '#C792EA',
    params: [
      { name: 'Period', value: '20' },
      { name: 'MA Type', value: 'EMA' },
    ],
  },
  {
    id: 'rsi-overbought',
    label: 'RSI Overbought',
    category: 'condition',
    icon: <Activity size={14} />,
    color: '#F78C6C',
    params: [
      { name: 'Period', value: '14' },
      { name: 'Level', value: '70' },
    ],
  },
  {
    id: 'macd-cross',
    label: 'MACD Cross',
    category: 'condition',
    icon: <ArrowRight size={14} />,
    color: '#82AAFF',
    params: [
      { name: 'Fast', value: '12' },
      { name: 'Slow', value: '26' },
      { name: 'Signal', value: '9' },
    ],
  },
  {
    id: 'time-filter',
    label: 'Time Filter',
    category: 'condition',
    icon: <Clock size={14} />,
    color: '#C3E88D',
    params: [
      { name: 'Start Hour', value: '08' },
      { name: 'End Hour', value: '16' },
    ],
  },
];

const ACTION_BLOCKS: Block[] = [
  {
    id: 'buy-market',
    label: 'Buy Market',
    category: 'action',
    icon: <TrendingUp size={14} />,
    color: '#00C853',
    params: [
      { name: 'Lot Size', value: '0.1' },
    ],
  },
  {
    id: 'sell-market',
    label: 'Sell Market',
    category: 'action',
    icon: <TrendingDown size={14} />,
    color: '#FF5252',
    params: [
      { name: 'Lot Size', value: '0.1' },
    ],
  },
  {
    id: 'close-all',
    label: 'Close All',
    category: 'action',
    icon: <XCircle size={14} />,
    color: '#FFC107',
    params: [
      { name: 'Direction', value: 'ALL' },
    ],
  },
  {
    id: 'set-sltp',
    label: 'Set SL/TP',
    category: 'action',
    icon: <ShieldCheck size={14} />,
    color: '#0091D5',
    params: [
      { name: 'Stop Loss', value: '20' },
      { name: 'Take Profit', value: '40' },
    ],
  },
];

export default function DragDropBuilder() {
  const [flowBlocks, setFlowBlocks] = useState<Block[]>([
    { ...CONDITION_BLOCKS[0], id: 'flow-1' },
    { ...CONDITION_BLOCKS[3], id: 'flow-2' },
    { ...ACTION_BLOCKS[0], id: 'flow-3' },
    { ...ACTION_BLOCKS[3], id: 'flow-4' },
  ]);

  const [draggedBlock, setDraggedBlock] = useState<Block | null>(null);

  const handleDragStart = (block: Block) => {
    setDraggedBlock(block);
  };

  const handleDrop = () => {
    if (draggedBlock) {
      setFlowBlocks((prev) => [
        ...prev,
        { ...draggedBlock, id: `flow-${Date.now()}` },
      ]);
      setDraggedBlock(null);
    }
  };

  const removeBlock = (id: string) => {
    setFlowBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="flex h-full" style={{ backgroundColor: '#060D16' }}>
      {/* Block Palette - Left sidebar */}
      <div
        className="flex flex-col shrink-0 border-r overflow-y-auto"
        style={{
          width: 220,
          backgroundColor: '#0D0D14',
          borderColor: '#1E1E2E',
        }}
      >
        {/* Conditions section */}
        <div className="p-3">
          <div
            className="text-[10px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1"
            style={{ color: '#C792EA' }}
          >
            <Target size={11} />
            Conditions
          </div>
          <div className="flex flex-col gap-1.5">
            {CONDITION_BLOCKS.map((block) => (
              <PaletteBlock
                key={block.id}
                block={block}
                onDragStart={() => handleDragStart(block)}
              />
            ))}
          </div>
        </div>

        <div style={{ height: 1, backgroundColor: '#1E1E2E', margin: '0 12px' }} />

        {/* Actions section */}
        <div className="p-3">
          <div
            className="text-[10px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1"
            style={{ color: '#00C853' }}
          >
            <Activity size={11} />
            Actions
          </div>
          <div className="flex flex-col gap-1.5">
            {ACTION_BLOCKS.map((block) => (
              <PaletteBlock
                key={block.id}
                block={block}
                onDragStart={() => handleDragStart(block)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Strategy Flow Area */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={(e) => {
          e.preventDefault();
          handleDrop();
        }}
      >
        {/* Flow header */}
        <div
          className="flex items-center justify-between px-4 py-2 border-b shrink-0"
          style={{
            backgroundColor: '#0D0D14',
            borderColor: '#1E1E2E',
          }}
        >
          <span className="text-[11px] font-semibold" style={{ color: '#888' }}>
            Strategy Flow
          </span>
          <span className="text-[10px]" style={{ color: '#4A4A5A' }}>
            Drag blocks from the palette to build your strategy
          </span>
        </div>

        {/* Flow canvas */}
        <div className="flex-1 overflow-auto p-6">
          {flowBlocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center"
                style={{
                  border: '2px dashed #2A2A3A',
                  backgroundColor: '#0D0D14',
                }}
              >
                <Plus size={24} style={{ color: '#333' }} />
              </div>
              <span className="text-[12px]" style={{ color: '#555' }}>
                Drop blocks here to build your strategy
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-0">
              {/* Start node */}
              <div
                className="px-4 py-1.5 rounded-full text-[10px] font-semibold"
                style={{
                  backgroundColor: '#1A3A25',
                  color: '#00C853',
                  border: '1px solid #00C85340',
                }}
              >
                STRATEGY START
              </div>

              {flowBlocks.map((block, idx) => (
                <div key={block.id} className="flex flex-col items-center">
                  {/* Connector arrow */}
                  <div className="flex flex-col items-center py-1">
                    <div
                      style={{
                        width: 1,
                        height: 16,
                        backgroundColor: '#2A2A3A',
                      }}
                    />
                    <ArrowDown size={10} style={{ color: '#2A2A3A', marginTop: -2 }} />
                  </div>

                  {/* Flow block */}
                  <FlowBlock
                    block={block}
                    index={idx}
                    onRemove={() => removeBlock(block.id)}
                  />
                </div>
              ))}

              {/* Connector to end */}
              <div className="flex flex-col items-center py-1">
                <div
                  style={{
                    width: 1,
                    height: 16,
                    backgroundColor: '#2A2A3A',
                  }}
                />
                <ArrowDown size={10} style={{ color: '#2A2A3A', marginTop: -2 }} />
              </div>

              {/* End node */}
              <div
                className="px-4 py-1.5 rounded-full text-[10px] font-semibold"
                style={{
                  backgroundColor: '#3A1A1A',
                  color: '#FF5252',
                  border: '1px solid #FF525240',
                }}
              >
                STRATEGY END
              </div>

              {/* Drop zone */}
              <div className="mt-4">
                <div
                  className="px-8 py-3 rounded-lg text-[11px] flex items-center gap-2 transition-all"
                  style={{
                    border: '2px dashed #2A2A3A',
                    color: '#4A4A5A',
                    backgroundColor: draggedBlock ? '#111120' : 'transparent',
                  }}
                >
                  <Plus size={14} />
                  Drop block here to add
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PaletteBlock({
  block,
  onDragStart,
}: {
  block: Block;
  onDragStart: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'copy';
        onDragStart();
      }}
      className="flex items-center gap-2 px-2.5 py-2 rounded cursor-grab active:cursor-grabbing transition-all hover:brightness-125"
      style={{
        backgroundColor: `${block.color}10`,
        border: `1px solid ${block.color}30`,
      }}
    >
      <GripVertical size={11} style={{ color: '#444', flexShrink: 0 }} />
      <div style={{ color: block.color, flexShrink: 0 }}>{block.icon}</div>
      <span className="text-[11px] font-medium" style={{ color: '#CCC' }}>
        {block.label}
      </span>
    </div>
  );
}

function FlowBlock({
  block,
  index,
  onRemove,
}: {
  block: Block;
  index: number;
  onRemove: () => void;
}) {
  return (
    <div
      className="rounded-lg overflow-hidden transition-all"
      style={{
        width: 320,
        border: `1px solid ${block.color}40`,
        backgroundColor: '#111118',
      }}
    >
      {/* Block header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          backgroundColor: `${block.color}15`,
          borderBottom: `1px solid ${block.color}20`,
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold"
            style={{
              backgroundColor: `${block.color}25`,
              color: block.color,
            }}
          >
            {index + 1}
          </span>
          <div style={{ color: block.color }}>{block.icon}</div>
          <span className="text-[11px] font-semibold" style={{ color: '#DDD' }}>
            {block.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold"
            style={{
              backgroundColor: block.category === 'condition' ? '#C792EA20' : '#00C85320',
              color: block.category === 'condition' ? '#C792EA' : '#00C853',
            }}
          >
            {block.category}
          </span>
          <button
            onClick={onRemove}
            className="p-0.5 rounded hover:bg-white/5 transition-colors"
          >
            <XCircle size={12} style={{ color: '#555' }} />
          </button>
        </div>
      </div>

      {/* Block params */}
      <div className="px-3 py-2 flex flex-col gap-1.5">
        {block.params.map((p) => (
          <div key={p.name} className="flex items-center justify-between">
            <span className="text-[10px]" style={{ color: '#666' }}>
              {p.name}
            </span>
            <input
              type="text"
              defaultValue={p.value}
              className="w-16 px-1.5 py-0.5 rounded text-[10px] font-mono text-right outline-none"
              style={{
                backgroundColor: '#0D0D14',
                border: '1px solid #1E1E2E',
                color: '#AAA',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
