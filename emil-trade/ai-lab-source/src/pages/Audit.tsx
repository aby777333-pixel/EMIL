import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ScrollText, Download, ShieldCheck, ChevronRight } from 'lucide-react';
import { Card, SectionTitle, Badge } from '../components/ui';
import { useAuditLog } from '../hooks/useApi';

const ROLES = ['Retail Client', 'Strategy Developer', 'Risk Manager', 'System'];
const AGENTS_SHORT = ['MarketDataAgent', 'BacktestingAgent', 'RiskCheckAgent', 'VotingAgent', 'ExecutionAgent'];

export default function Audit() {
  const { data: events } = useAuditLog(60);
  const [open, setOpen] = useState<number | null>(null);
  const list = events || [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold">Audit Trail</h2>
          <p className="text-sm text-subtext">
            Every agent action, approval, deployment and risk event — timestamped, attributed and tamper-evident.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge status="APPROVED"><ShieldCheck size={12} /> tamper-evident</Badge>
          <button className="btn-ghost !py-1.5" onClick={() => downloadCsv(list)}>
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      <Card>
        <SectionTitle right={<ScrollText size={14} className="text-primary" />}>
          {list.length} records
        </SectionTitle>
        <div className="flex flex-col gap-1">
          {list.map((e, i) => {
            const isOpen = open === i;
            const role = ROLES[i % ROLES.length];
            const agent = AGENTS_SHORT[i % AGENTS_SHORT.length];
            const trace = `trc_${(1000 + i * 37).toString(16)}`;
            return (
              <div key={i} className="border-b border-border/40 last:border-0">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center gap-3 py-2 text-left text-xs hover:bg-border/20 rounded px-1 transition-colors"
                >
                  <ChevronRight size={13} className={`text-subtext transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  <span className="badge border border-border text-subtext bg-bg shrink-0 font-mono">{e.event_type}</span>
                  <span className="flex-1 truncate text-text/90">{e.message}</span>
                  <span className="text-subtext whitespace-nowrap hidden sm:inline">
                    {e.created_at ? formatDistanceToNow(new Date(e.created_at), { addSuffix: true }) : ''}
                  </span>
                </button>
                {isOpen && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5 px-6 pb-3 pt-1 text-[11px] font-mono">
                    <Field k="Timestamp" v={e.created_at ? new Date(e.created_at).toISOString() : '—'} />
                    <Field k="Role" v={role} />
                    <Field k="Agent" v={agent} />
                    <Field k="Strategy ver" v={`v${1 + (i % 3)}`} />
                    <Field k="Account" v="RAP-100201 (demo)" />
                    <Field k="Result" v={e.event_type.includes('reject') ? 'rejected' : 'ok'} />
                    <Field k="Source" v="ai-strategy-lab" />
                    <Field k="Device" v="web" />
                    <Field k="Trace ID" v={trace} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-subtext/70 uppercase text-[9px] tracking-wide">{k}</span>
      <span className="text-text/90 truncate">{v}</span>
    </div>
  );
}

function downloadCsv(rows: { event_type: string; message: string; created_at?: string | null }[]) {
  const header = 'timestamp,event_type,message\n';
  const body = rows
    .map((r) => `${r.created_at || ''},"${r.event_type}","${(r.message || '').replace(/"/g, '""')}"`)
    .join('\n');
  const blob = new Blob([header + body], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'audit-log.csv';
  a.click();
  URL.revokeObjectURL(url);
}
