import { useState } from 'react';
import { Search, Plus, BookOpen, Sparkles } from 'lucide-react';
import { Card, Skeleton, ConfidenceBar, EmptyState } from '../components/ui';
import { useResearch } from '../hooks/useApi';
import { useStore } from '../store';

export default function Research() {
  const { data: papers, isLoading } = useResearch();
  const [q, setQ] = useState('');
  const [url, setUrl] = useState('');
  const pushToast = useStore((s) => s.pushToast);

  const filtered = (papers || []).filter(
    (p) =>
      !q ||
      p.title.toLowerCase().includes(q.toLowerCase()) ||
      (p.abstract || '').toLowerCase().includes(q.toLowerCase()),
  );

  const addPaper = () => {
    if (!url.trim()) return;
    pushToast({ type: 'info', message: 'Paper submitted to ResearchAgent for analysis.' });
    setUrl('');
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold">Research Map</h2>
        <p className="text-sm text-subtext">Quant papers mined by the ResearchAgent for alpha signals.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtext" />
          <input
            className="input pl-9"
            placeholder="Search papers, insights, strategy types…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <input
            className="input sm:w-72"
            placeholder="Add paper URL to analyze…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button className="btn-primary whitespace-nowrap" onClick={addPaper}>
            <Plus size={15} /> Analyze
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState icon="📚" title="No papers found" sub="Try a different search or add a paper URL to analyze." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((p) => (
            <Card key={p.id} className="flex flex-col gap-2 glass-hover">
              <div className="flex items-start gap-2">
                <BookOpen size={18} className="text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h3 className="font-bold leading-tight">{p.title}</h3>
                  {p.authors && <div className="text-[11px] text-subtext">{p.authors}</div>}
                </div>
              </div>
              <p className="text-xs text-subtext line-clamp-3 leading-relaxed">{p.abstract}</p>

              {p.insights?.length > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="text-[10px] text-primary uppercase font-semibold flex items-center gap-1">
                    <Sparkles size={11} /> Alpha Signals
                  </div>
                  {p.insights.slice(0, 3).map((ins, i) => (
                    <div key={i} className="text-[11px] text-text/80 flex gap-1.5">
                      <span className="text-success">▸</span>
                      {ins}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-auto pt-1">
                <div className="flex items-center justify-between text-[10px] text-subtext mb-1">
                  <span>Relevance</span>
                  <span className="text-primary font-mono">{Math.round((p.relevance_score || 0) * 100)}%</span>
                </div>
                <ConfidenceBar value={p.relevance_score || 0} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
