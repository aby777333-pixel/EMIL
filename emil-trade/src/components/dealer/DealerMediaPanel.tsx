'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Tv,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  X,
  Shield,
  MessageSquare,
  Camera,
  CameraOff,
  Send,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DealerMediaPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMsg {
  id: string;
  sender: 'me' | 'remote';
  text: string;
  ts: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomSessionId(): string {
  const seg = () =>
    Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RPT-${seg()}-${seg()}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DealerMediaPanel({
  isOpen,
  onClose,
}: DealerMediaPanelProps) {
  const [tab, setTab] = useState<'tv' | 'chat'>('tv');

  // Video chat state
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [remoteControl, setRemoteControl] = useState(false);
  const [remotePassword, setRemotePassword] = useState('');
  const [sessionId] = useState(randomSessionId);
  const [connected] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Dragging
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setDragging(true);
      dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    },
    [pos],
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) =>
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendChat = () => {
    if (!chatInput.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), sender: 'me', text: chatInput.trim(), ts: new Date().toLocaleTimeString() },
    ]);
    setChatInput('');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed z-40 flex flex-col overflow-hidden rounded-lg border border-[#252530] bg-[#111116] shadow-2xl"
      style={{
        width: 380,
        height: 500,
        right: 340 - pos.x,
        top: 100 + pos.y,
      }}
    >
      {/* Header - draggable */}
      <div
        className="flex h-9 flex-shrink-0 cursor-move items-center justify-between border-b border-[#252530] bg-[#18181f] px-3 select-none"
        onMouseDown={onMouseDown}
      >
        <span className="text-[11px] font-semibold tracking-wider text-white/70">
          DEALER MEDIA
        </span>
        <button onClick={onClose} className="text-white/40 hover:text-white">
          <X size={14} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-shrink-0 border-b border-[#252530]">
        {(['tv', 'chat'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex flex-1 items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold tracking-wider transition ${
              tab === t
                ? 'border-b-2 border-cyan-400 text-cyan-400'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            {t === 'tv' ? <Tv size={12} /> : <Video size={12} />}
            {t === 'tv' ? 'LIVE TV' : 'VIDEO CHAT'}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'tv' ? (
          <LiveTvTab />
        ) : (
          <VideoChatTab
            cameraOn={cameraOn}
            setCameraOn={setCameraOn}
            micOn={micOn}
            setMicOn={setMicOn}
            remoteControl={remoteControl}
            setRemoteControl={setRemoteControl}
            remotePassword={remotePassword}
            setRemotePassword={setRemotePassword}
            sessionId={sessionId}
            connected={connected}
            messages={messages}
            chatInput={chatInput}
            setChatInput={setChatInput}
            sendChat={sendChat}
            chatEndRef={chatEndRef}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LIVE TV Tab
// ---------------------------------------------------------------------------

function LiveTvTab() {
  return (
    <div className="flex flex-col gap-2 p-3">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
        <span className="text-[10px] font-bold tracking-wider text-red-400">
          LIVE
        </span>
        <span className="text-[10px] font-semibold tracking-wider text-white/60">
          FINANCE TV LIVE
        </span>
      </div>

      {/* 16:9 iframe */}
      <div className="relative w-full overflow-hidden rounded border border-[#252530]" style={{ paddingBottom: '56.25%' }}>
        <iframe
          className="absolute inset-0 h-full w-full"
          src="https://www.youtube.com/embed/9NyxcX3rhQs?autoplay=1&mute=1&rel=0"
          title="CNBC Live"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* Caption */}
      <p className="text-center text-[9px] text-white/30">
        CNBC International &bull; 24/7 Market Coverage
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VIDEO CHAT Tab
// ---------------------------------------------------------------------------

function VideoChatTab({
  cameraOn,
  setCameraOn,
  micOn,
  setMicOn,
  remoteControl,
  setRemoteControl,
  remotePassword,
  setRemotePassword,
  sessionId,
  connected,
  messages,
  chatInput,
  setChatInput,
  sendChat,
  chatEndRef,
}: {
  cameraOn: boolean;
  setCameraOn: (v: boolean) => void;
  micOn: boolean;
  setMicOn: (v: boolean) => void;
  remoteControl: boolean;
  setRemoteControl: (v: boolean) => void;
  remotePassword: string;
  setRemotePassword: (v: string) => void;
  sessionId: string;
  connected: boolean;
  messages: ChatMsg[];
  chatInput: string;
  setChatInput: (v: string) => void;
  sendChat: () => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex flex-col gap-2 p-3 text-[10px]">
      {/* Video placeholders */}
      <div className="flex gap-2">
        {/* Remote */}
        <div className="flex flex-1 flex-col items-center justify-center rounded border border-[#252530] bg-[#1a1a22]" style={{ height: 90 }}>
          <Camera size={18} className="text-white/20" />
          <span className="mt-1 text-[8px] text-white/20">Remote</span>
        </div>
        {/* Local */}
        <div className="flex w-[90px] flex-col items-center justify-center rounded border border-[#252530] bg-[#1a1a22]" style={{ height: 90 }}>
          {cameraOn ? (
            <>
              <Camera size={14} className="text-cyan-400/40" />
              <span className="mt-1 text-[8px] text-cyan-400/40">You</span>
            </>
          ) : (
            <>
              <CameraOff size={14} className="text-white/20" />
              <span className="mt-1 text-[8px] text-white/20">Off</span>
            </>
          )}
        </div>
      </div>

      {/* Session ID */}
      <div className="flex items-center justify-between">
        <span className="text-white/40">Session: {sessionId}</span>
        <span
          className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${
            connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}
        >
          {connected ? 'CONNECTED' : 'DISCONNECTED'}
        </span>
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-center gap-2">
        <CtrlBtn active={cameraOn} onClick={() => setCameraOn(!cameraOn)} icon={cameraOn ? <Video size={13} /> : <VideoOff size={13} />} />
        <CtrlBtn active={micOn} onClick={() => setMicOn(!micOn)} icon={micOn ? <Mic size={13} /> : <MicOff size={13} />} />
        <CtrlBtn active={false} onClick={() => {}} icon={<Monitor size={13} />} label="Share" />
        <button className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-500">
          <PhoneOff size={13} />
        </button>
      </div>

      {/* Remote Auth */}
      <div className="rounded border border-[#252530] bg-[#0d0d12] p-2">
        <div className="flex items-center gap-2">
          <Shield size={12} className="text-cyan-400/60" />
          <span className="font-bold text-white/60">Remote Auth</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-white/40">Allow Remote Control</span>
          <button
            onClick={() => setRemoteControl(!remoteControl)}
            className={`h-4 w-8 rounded-full transition ${remoteControl ? 'bg-cyan-500' : 'bg-white/10'}`}
          >
            <div
              className={`h-3 w-3 rounded-full bg-white transition-transform ${remoteControl ? 'translate-x-4' : 'translate-x-0.5'}`}
            />
          </button>
        </div>
        {remoteControl && (
          <>
            <input
              className="mt-1.5 w-full rounded border border-[#252530] bg-[#111116] px-2 py-1 text-[10px] text-white/70 outline-none focus:border-cyan-500/50"
              placeholder="Access password..."
              value={remotePassword}
              onChange={(e) => setRemotePassword(e.target.value)}
            />
            <p className="mt-1 text-[9px] text-cyan-400/60">
              Remote access granted. Session: {sessionId}
            </p>
          </>
        )}
      </div>

      {/* In-call chat */}
      <div className="rounded border border-[#252530] bg-[#0d0d12] p-2">
        <div className="flex items-center gap-1.5 text-white/50">
          <MessageSquare size={11} />
          <span className="font-bold">Chat</span>
        </div>
        <div className="mt-1 flex max-h-[72px] flex-col gap-0.5 overflow-y-auto">
          {messages.length === 0 && (
            <span className="text-[9px] text-white/20">No messages yet</span>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`text-[9px] ${m.sender === 'me' ? 'text-cyan-400/80' : 'text-white/60'}`}>
              <span className="text-white/30">[{m.ts}]</span> {m.text}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div className="mt-1 flex gap-1">
          <input
            className="flex-1 rounded border border-[#252530] bg-[#111116] px-2 py-0.5 text-[10px] text-white/70 outline-none focus:border-cyan-500/50"
            placeholder="Type message..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendChat()}
          />
          <button onClick={sendChat} className="text-cyan-400/60 hover:text-cyan-400">
            <Send size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small control button
// ---------------------------------------------------------------------------

function CtrlBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
        active ? 'bg-white/10 text-white' : 'bg-white/5 text-white/30 hover:text-white/60'
      }`}
    >
      {icon}
    </button>
  );
}
