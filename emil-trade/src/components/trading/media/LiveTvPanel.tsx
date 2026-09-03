'use client';

// LIVE TV — financial news channels inside the terminal.
// Third-party YouTube live embeds (Bloomberg, Yahoo Finance, Sky, DW, CNA…),
// channel-based so the embed always resolves to the broadcaster's CURRENT live
// stream. Traders can add any YouTube channel/video URL; choices persist per
// browser. Floats over the chart (no backdrop) so trading never stops; "Pop
// out" opens the same player in its own window (/terminal/tv).

import { useEffect, useMemo, useState } from 'react';
import { X, Volume2, VolumeX, ExternalLink, Maximize2, Minimize2, Plus, Trash2, Tv } from 'lucide-react';

type Feed = { id: string; label: string; kind: 'channel' | 'video'; ref: string; custom?: boolean };

const DEFAULT_FEEDS: Feed[] = [
  { id: 'bloomberg', label: 'Bloomberg TV', kind: 'channel', ref: 'UCIALMKvObZNtJ6AmdCLP7Lg' },
  { id: 'yahoo', label: 'Yahoo Finance', kind: 'channel', ref: 'UCEAZeUIeJs0IjQiqTCdVSIg' },
  { id: 'cnbc', label: 'CNBC', kind: 'video', ref: '9NyxcX3rhQs' },
  { id: 'sky', label: 'Sky News', kind: 'channel', ref: 'UCoMdktPbSTixAyNGwb-UYkQ' },
  { id: 'dw', label: 'DW News', kind: 'channel', ref: 'UCknLrEdhRCp1aegoMqRaCZg' },
  { id: 'cna', label: 'CNA (Asia)', kind: 'channel', ref: 'UC83jt4dlz1Gjl58fzQrrKZg' },
  { id: 'aljazeera', label: 'Al Jazeera', kind: 'channel', ref: 'UCNye-wNBqNL5ZzHSJj3l8Bg' },
  { id: 'france24', label: 'France 24', kind: 'channel', ref: 'UCQfwfsi5VrQ8yKZ-UWmAEFg' },
];

const LS_KEY = 'emil_tv_v1';

interface Saved { feedId: string; muted: boolean; custom: Feed[] }

function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const j = JSON.parse(raw) as Partial<Saved>;
      return { feedId: j.feedId || 'bloomberg', muted: j.muted ?? true, custom: Array.isArray(j.custom) ? j.custom : [] };
    }
  } catch { /* ignore */ }
  return { feedId: 'bloomberg', muted: true, custom: [] };
}

/** Accepts a YouTube watch/live/short URL, a channel URL, a bare channel id (UC…) or a bare video id. */
export function parseYouTubeRef(input: string): { kind: 'channel' | 'video'; ref: string } | null {
  const s = input.trim();
  if (!s) return null;
  const chan = s.match(/(?:channel\/)?(UC[\w-]{22})/);
  if (chan) return { kind: 'channel', ref: chan[1] };
  const vid = s.match(/(?:v=|youtu\.be\/|\/live\/|\/embed\/|\/shorts\/)([\w-]{11})/) || s.match(/^([\w-]{11})$/);
  if (vid) return { kind: 'video', ref: vid[1] };
  return null;
}

export function embedUrl(feed: Feed, muted: boolean) {
  const q = `autoplay=1&mute=${muted ? 1 : 0}&rel=0&playsinline=1`;
  return feed.kind === 'channel'
    ? `https://www.youtube.com/embed/live_stream?channel=${feed.ref}&${q}`
    : `https://www.youtube.com/embed/${feed.ref}?${q}`;
}

export default function LiveTvPanel({ onClose, standalone = false, rightOffset = 12 }: { onClose?: () => void; standalone?: boolean; rightOffset?: number }) {
  const [saved, setSaved] = useState<Saved>({ feedId: 'bloomberg', muted: true, custom: [] });
  const [wide, setWide] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftLabel, setDraftLabel] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { setSaved(loadSaved()); }, []);
  useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(saved)); } catch { /* ignore */ } }, [saved]);

  const feeds = useMemo(() => [...DEFAULT_FEEDS, ...saved.custom], [saved.custom]);
  const feed = feeds.find((f) => f.id === saved.feedId) || DEFAULT_FEEDS[0];

  const addCustom = () => {
    const parsed = parseYouTubeRef(draft);
    if (!parsed) { setErr('Paste a YouTube channel or video link (or a UC… channel id).'); return; }
    const label = draftLabel.trim() || (parsed.kind === 'channel' ? 'Custom channel' : 'Custom stream');
    const f: Feed = { id: `custom-${Date.now()}`, label: label.slice(0, 24), kind: parsed.kind, ref: parsed.ref, custom: true };
    setSaved((s) => ({ ...s, custom: [...s.custom, f], feedId: f.id }));
    setDraft(''); setDraftLabel(''); setErr(null); setAdding(false);
  };

  const removeCustom = (id: string) => setSaved((s) => ({ ...s, custom: s.custom.filter((f) => f.id !== id), feedId: s.feedId === id ? 'bloomberg' : s.feedId }));

  const body = (
    <>
      {/* header */}
      <div className="flex items-center gap-2 border-b px-3 py-1.5" style={{ borderColor: 'var(--border)' }}>
        <Tv size={13} style={{ color: '#FF7043' }} />
        <span className="font-mono text-[10px] font-bold tracking-wider" style={{ color: '#FF7043' }}>LIVE TV</span>
        <span className="truncate text-[10px] text-white/45">{feed.label}</span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setSaved((s) => ({ ...s, muted: !s.muted }))} title={saved.muted ? 'Unmute' : 'Mute'} className="rounded p-1 text-white/55 hover:text-white">
            {saved.muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>
          {!standalone && (
            <>
              <button onClick={() => setWide((w) => !w)} title={wide ? 'Compact' : 'Wide'} className="rounded p-1 text-white/55 hover:text-white">
                {wide ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
              <button onClick={() => window.open('/terminal/tv', '_blank')} title="Pop out into its own window" className="rounded p-1 text-white/55 hover:text-white">
                <ExternalLink size={13} />
              </button>
              {onClose && <button onClick={onClose} title="Close" className="rounded p-1 text-white/55 hover:text-white"><X size={14} /></button>}
            </>
          )}
        </div>
      </div>

      {/* channels */}
      <div className="flex items-center gap-1 overflow-x-auto px-2 py-1.5" style={{ scrollbarWidth: 'thin' }}>
        {feeds.map((f) => (
          <span key={f.id} className="group relative shrink-0">
            <button
              onClick={() => setSaved((s) => ({ ...s, feedId: f.id }))}
              className="rounded px-2 py-0.5 font-mono text-[9px] font-bold transition-all hover:brightness-125"
              style={f.id === feed.id
                ? { color: '#FF7043', border: '1px solid rgba(255,112,67,0.7)', backgroundColor: 'rgba(255,112,67,0.12)' }
                : { color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              {f.label}
            </button>
            {f.custom && (
              <button onClick={() => removeCustom(f.id)} title="Remove" className="absolute -right-1 -top-1 hidden rounded-full bg-black/80 p-0.5 text-white/70 group-hover:block"><Trash2 size={8} /></button>
            )}
          </span>
        ))}
        <button onClick={() => setAdding((a) => !a)} title="Add a YouTube channel or stream" className="shrink-0 rounded p-0.5 text-white/50 hover:text-white"><Plus size={12} /></button>
      </div>
      {adding && (
        <div className="flex flex-wrap items-center gap-1 border-t px-2 py-1.5" style={{ borderColor: 'var(--border)' }}>
          <input value={draftLabel} onChange={(e) => setDraftLabel(e.target.value)} placeholder="Label" className="w-24 rounded border bg-transparent px-1.5 py-0.5 text-[10px] text-white outline-none" style={{ borderColor: 'var(--border)' }} />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustom()} placeholder="YouTube channel / video URL" className="min-w-0 flex-1 rounded border bg-transparent px-1.5 py-0.5 text-[10px] text-white outline-none" style={{ borderColor: 'var(--border)' }} />
          <button onClick={addCustom} className="rounded px-2 py-0.5 text-[10px] font-bold" style={{ color: '#FF7043', border: '1px solid rgba(255,112,67,0.6)' }}>Add</button>
          {err && <span className="w-full text-[9px] text-red-400">{err}</span>}
        </div>
      )}

      {/* player */}
      <div className={standalone ? 'min-h-0 flex-1 bg-black' : 'aspect-video w-full bg-black'}>
        <iframe
          key={`${feed.id}-${saved.muted}`}
          src={embedUrl(feed, saved.muted)}
          title={feed.label}
          className="h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <div className="px-3 py-1 text-[8px] text-white/30">Third-party live streams via YouTube — availability and content are the broadcaster&apos;s. Not investment advice.</div>
    </>
  );

  if (standalone) {
    return <div className="flex h-full w-full flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>{body}</div>;
  }
  return (
    <div
      className="fixed z-[9990] flex flex-col overflow-hidden rounded-lg border shadow-2xl"
      style={{ right: rightOffset, bottom: 56, width: wide ? 820 : 480, maxWidth: 'calc(100vw - 24px)', backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', boxShadow: '0 18px 60px rgba(0,0,0,0.6)' }}
    >
      {body}
    </div>
  );
}
