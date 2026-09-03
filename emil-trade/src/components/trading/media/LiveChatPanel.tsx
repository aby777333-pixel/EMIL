'use client';

// LIVE CHAT — the traders' community floor inside the terminal.
// Real messages, real users (same login as the terminal), Supabase Realtime for
// delivery and presence. Rooms per market; $SYMBOL tokens are clickable and
// load that instrument on the chart. Floats over the chart (no backdrop).
// Server guards: RLS (read all / write own), 500-char cap, 10 msgs / 30 s.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { X, ExternalLink, Send, Users, Trash2, MessagesSquare, Maximize2, Minimize2 } from 'lucide-react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useTradingStore } from '@/stores/trading';

interface Room { id: string; name: string; description: string | null; sort_order: number }
interface Msg { id: string; room_id: string; user_id: string; display_name: string; body: string; created_at: string }

const LS_ROOM = 'emil_chat_room_v1';
const SYMBOL_RE = /\$([A-Za-z]{3,12})/g;

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 70% 65%)`;
}

export default function LiveChatPanel({ onClose, standalone = false, rightOffset = 12 }: { onClose?: () => void; standalone?: boolean; rightOffset?: number }) {
  const supabase = useMemo(() => createClient(), []);
  const setActiveSymbol = useTradingStore((s) => s.setActiveSymbol);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState<string>('general');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [online, setOnline] = useState(0);
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [tall, setTall] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  // identity: full_name from public.users, else the email prefix
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setErr('Sign in to chat.'); return; }
      const { data: row } = await supabase.from('users').select('full_name').eq('id', user.id).maybeSingle();
      const name = (row?.full_name as string | null)?.trim() || user.email?.split('@')[0] || 'trader';
      setMe({ id: user.id, name: name.slice(0, 40) });
    })();
  }, [supabase]);

  useEffect(() => {
    try { const r = localStorage.getItem(LS_ROOM); if (r) setRoomId(r); } catch { /* ignore */ }
    supabase.from('chat_rooms').select('id,name,description,sort_order').order('sort_order').then(({ data }) => { if (data?.length) setRooms(data as Room[]); });
  }, [supabase]);

  // history + realtime per room
  useEffect(() => {
    try { localStorage.setItem(LS_ROOM, roomId); } catch { /* ignore */ }
    let ch: RealtimeChannel | null = null;
    let pres: RealtimeChannel | null = null;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('chat_messages').select('id,room_id,user_id,display_name,body,created_at')
        .eq('room_id', roomId).order('created_at', { ascending: false }).limit(100);
      if (cancelled) return;
      if (error) { setErr(error.message); return; }
      setMsgs(((data ?? []) as Msg[]).reverse());
      stickRef.current = true;
      ch = supabase
        .channel(`chat-msgs:${roomId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` }, (p) => {
          const m = p.new as Msg;
          setMsgs((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur.slice(-199), m]));
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' }, (p) => {
          const id = (p.old as { id?: string }).id;
          if (id) setMsgs((cur) => cur.filter((x) => x.id !== id));
        })
        .subscribe();
    })();
    return () => { cancelled = true; if (ch) supabase.removeChannel(ch); if (pres) supabase.removeChannel(pres); };
  }, [supabase, roomId]);

  // presence (needs identity)
  useEffect(() => {
    if (!me) return;
    const pres = supabase.channel(`chat-presence:${roomId}`, { config: { presence: { key: me.id } } });
    pres.on('presence', { event: 'sync' }, () => setOnline(Object.keys(pres.presenceState()).length));
    pres.subscribe((status) => { if (status === 'SUBSCRIBED') pres.track({ name: me.name, at: Date.now() }); });
    return () => { supabase.removeChannel(pres); };
  }, [supabase, roomId, me]);

  // auto-scroll when pinned to the bottom
  useEffect(() => {
    const el = listRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [msgs]);
  const onScroll = () => {
    const el = listRef.current; if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  const send = useCallback(async () => {
    const body = draft.trim();
    if (!body || !me || sending) return;
    setSending(true); setErr(null);
    // Return the inserted row and show it immediately — never wait on the
    // realtime round-trip for the sender's own message (realtime dedupes by id).
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({ room_id: roomId, user_id: me.id, display_name: me.name, body: body.slice(0, 500) })
      .select('id,room_id,user_id,display_name,body,created_at')
      .single();
    setSending(false);
    if (error) { setErr(error.message.replace(/^.*?: /, '')); return; }
    if (data) setMsgs((cur) => (cur.some((x) => x.id === (data as Msg).id) ? cur : [...cur.slice(-199), data as Msg]));
    setDraft(''); stickRef.current = true;
  }, [draft, me, roomId, sending, supabase]);

  const del = async (id: string) => { await supabase.from('chat_messages').delete().eq('id', id); setMsgs((c) => c.filter((m) => m.id !== id)); };

  const renderBody = (text: string): ReactNode[] => {
    const out: ReactNode[] = []; let last = 0; let m: RegExpExecArray | null; let k = 0;
    SYMBOL_RE.lastIndex = 0;
    while ((m = SYMBOL_RE.exec(text))) {
      if (m.index > last) out.push(text.slice(last, m.index));
      const sym = m[1].toUpperCase();
      out.push(<button key={k++} onClick={() => setActiveSymbol(sym)} title={`Load ${sym} on the chart`} className="font-mono font-bold hover:underline" style={{ color: '#29ABE2' }}>${sym}</button>);
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  };

  const room = rooms.find((r) => r.id === roomId);

  const body = (
    <>
      <div className="flex items-center gap-2 border-b px-3 py-1.5" style={{ borderColor: 'var(--border)' }}>
        <MessagesSquare size={13} style={{ color: '#4DD0E1' }} />
        <span className="font-mono text-[10px] font-bold tracking-wider" style={{ color: '#4DD0E1' }}>LIVE CHAT</span>
        <span className="flex items-center gap-1 text-[10px] text-white/45" title="Traders in this room right now"><Users size={11} /> {online} online</span>
        <div className="ml-auto flex items-center gap-1">
          {!standalone && (
            <>
              <button onClick={() => setTall((t) => !t)} title={tall ? 'Compact' : 'Tall'} className="rounded p-1 text-white/55 hover:text-white">{tall ? <Minimize2 size={13} /> : <Maximize2 size={13} />}</button>
              <button onClick={() => window.open('/terminal/chat', '_blank')} title="Pop out into its own window" className="rounded p-1 text-white/55 hover:text-white"><ExternalLink size={13} /></button>
              {onClose && <button onClick={onClose} title="Close" className="rounded p-1 text-white/55 hover:text-white"><X size={14} /></button>}
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto px-2 py-1.5" style={{ scrollbarWidth: 'thin' }}>
        {(rooms.length ? rooms : [{ id: 'general', name: 'Trading Floor', description: null, sort_order: 0 }]).map((r) => (
          <button key={r.id} onClick={() => setRoomId(r.id)} title={r.description ?? r.name}
            className="shrink-0 rounded px-2 py-0.5 font-mono text-[9px] font-bold transition-all hover:brightness-125"
            style={r.id === roomId
              ? { color: '#4DD0E1', border: '1px solid rgba(77,208,225,0.7)', backgroundColor: 'rgba(77,208,225,0.12)' }
              : { color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)' }}>
            {r.name}
          </button>
        ))}
      </div>

      <div ref={listRef} onScroll={onScroll} className={`min-h-0 flex-1 overflow-y-auto px-3 py-2 ${standalone ? '' : tall ? 'h-[520px]' : 'h-[300px]'}`} style={{ scrollbarWidth: 'thin' }}>
        {msgs.length === 0 && <p className="py-6 text-center text-[10px] text-white/35">No messages yet in {room?.name ?? 'this room'} — say hello. Tip: type $XAUUSD to link an instrument.</p>}
        {msgs.map((m) => {
          const mine = me?.id === m.user_id;
          return (
            <div key={m.id} className="group mb-1.5 flex items-start gap-2 text-[11px] leading-snug">
              <span className="shrink-0 font-mono text-[9px] text-white/30">{fmtTime(m.created_at)}</span>
              <span className="shrink-0 font-bold" style={{ color: mine ? '#FFD54F' : colorFor(m.user_id) }}>{m.display_name}</span>
              <span className="min-w-0 break-words text-white/85">{renderBody(m.body)}</span>
              {mine && <button onClick={() => del(m.id)} title="Delete my message" className="ml-auto hidden shrink-0 text-white/30 hover:text-red-400 group-hover:block"><Trash2 size={10} /></button>}
            </div>
          );
        })}
      </div>

      <div className="border-t px-2 py-1.5" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-1">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 500))}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={me ? `Message ${room?.name ?? 'the floor'} as ${me.name}…` : 'Sign in to chat'}
            disabled={!me}
            className="min-w-0 flex-1 rounded border bg-transparent px-2 py-1 text-[11px] text-white outline-none placeholder:text-white/30"
            style={{ borderColor: 'var(--border)' }}
          />
          <button onClick={send} disabled={!me || !draft.trim() || sending} title="Send (Enter)" className="rounded px-2 py-1 text-[10px] font-bold disabled:opacity-40" style={{ color: '#4DD0E1', border: '1px solid rgba(77,208,225,0.6)' }}><Send size={12} /></button>
        </div>
        <div className="mt-1 flex items-center justify-between text-[8px] text-white/30">
          <span>{err ? <span className="text-red-400">{err}</span> : 'Be civil. No signals-for-sale, no personal data. Opinions are not advice.'}</span>
          <span>{draft.length}/500</span>
        </div>
      </div>
    </>
  );

  if (standalone) return <div className="flex h-full w-full flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>{body}</div>;
  return (
    <div className="fixed z-[9990] flex flex-col overflow-hidden rounded-lg border shadow-2xl"
      style={{ right: rightOffset, bottom: 56, width: 400, maxWidth: 'calc(100vw - 24px)', backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', boxShadow: '0 18px 60px rgba(0,0,0,0.6)' }}>
      {body}
    </div>
  );
}
