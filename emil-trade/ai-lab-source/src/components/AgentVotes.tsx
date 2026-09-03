import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { AgentVote } from '../types';
import { agentMeta } from '../data/agents';
import { ConfidenceBar, SectionTitle } from './ui';

function voteIcon(vote: string): string {
  const v = vote.toLowerCase();
  if (v.includes('yes') || v === '👍' || v === 'approve' || v === 'buy') return '👍';
  if (v.includes('no') || v === '👎' || v === 'reject') return '👎';
  return '🤷';
}

function voteColor(vote: string): string {
  const icon = voteIcon(vote);
  return icon === '👍' ? '#00ff88' : icon === '👎' ? '#ff4444' : '#ffaa00';
}

/** Compact vote strip for strategy cards. */
export function MiniVotes({ votes }: { votes: AgentVote[] }) {
  if (!votes?.length) return null;
  const yes = votes.filter((v) => voteIcon(v.vote) === '👍').length;
  const no = votes.filter((v) => voteIcon(v.vote) === '👎').length;
  const abstain = votes.length - yes - no;
  const total = votes.length;
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-subtext mb-1">
        <span>Agent Consensus</span>
        <span>
          <span className="text-success">{yes}👍</span> · <span className="text-danger">{no}👎</span> ·{' '}
          <span className="text-warning">{abstain}🤷</span>
        </span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-bg">
        <div className="bg-success" style={{ width: `${(yes / total) * 100}%` }} />
        <div className="bg-warning" style={{ width: `${(abstain / total) * 100}%` }} />
        <div className="bg-danger" style={{ width: `${(no / total) * 100}%` }} />
      </div>
    </div>
  );
}

/** Full expandable vote panel for the detail modal. */
export function VotePanel({ votes }: { votes: AgentVote[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!votes?.length) return <div className="text-subtext text-sm">No agent votes recorded.</div>;

  const yes = votes.filter((v) => voteIcon(v.vote) === '👍').length;
  const consensus = (yes / votes.length) * 100;

  return (
    <div>
      <SectionTitle>Agent Votes</SectionTitle>
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-subtext">Overall Consensus</span>
          <span className="font-mono text-primary">{consensus.toFixed(0)}% in favor</span>
        </div>
        <ConfidenceBar value={consensus / 100} color={consensus >= 55 ? '#00ff88' : consensus >= 40 ? '#ffaa00' : '#ff4444'} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {votes.map((v) => {
          const meta = agentMeta(v.agent);
          const isOpen = open === v.agent;
          return (
            <div key={v.agent} className="glass !rounded-lg border border-border overflow-hidden">
              <button
                className="w-full flex items-center gap-2 p-2.5 text-left"
                onClick={() => setOpen(isOpen ? null : v.agent)}
              >
                <span className="text-base">{meta.icon}</span>
                <span className="text-xs font-semibold flex-1 truncate">{meta.label}</span>
                <span className="text-base" style={{ filter: `drop-shadow(0 0 4px ${voteColor(v.vote)})` }}>
                  {voteIcon(v.vote)}
                </span>
                <span className="text-[10px] font-mono text-subtext">{Math.round(v.confidence * 100)}%</span>
                <ChevronDown size={14} className={`text-subtext transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && v.reasoning && (
                <div className="px-2.5 pb-2.5 text-[11px] text-subtext leading-relaxed border-t border-border/50 pt-2">
                  {v.reasoning}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
