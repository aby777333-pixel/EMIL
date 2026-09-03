'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Video, VideoOff, Mic, MicOff, MonitorUp, Phone, PhoneOff,
  Lock, Copy, Users, MessageSquare, Send, X, Tv, Settings,
} from 'lucide-react';
import OrderTicket from '@/components/trading/order-ticket/OrderTicket';
import TradingTools from '@/components/trading/tools/TradingTools';
import { useTradingStore } from '@/stores/trading';
import { formatCurrency } from '@/lib/utils/format';

type RightTab = 'order' | 'account' | 'tools';

export default function RightPanel() {
  const [activeTab, setActiveTab] = useState<RightTab>('order');

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
      {/* Tab bar — each tab has its own hue: dull at rest, glowing when active */}
      <div className="flex shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        {([
          { id: 'order' as RightTab, label: 'Order', hex: '#0091D5', rgb: '0,145,213' },
          { id: 'account' as RightTab, label: 'Account', hex: '#00C27A', rgb: '0,194,122' },
          { id: 'tools' as RightTab, label: 'Tools', hex: '#AB47BC', rgb: '171,71,188' },
        ]).map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-2 text-xs font-semibold uppercase tracking-wider transition-all"
              style={{
                background: active
                  ? `linear-gradient(180deg, rgba(${tab.rgb},0.22) 0%, rgba(${tab.rgb},0.05) 100%)`
                  : `rgba(${tab.rgb},0.04)`,
                color: active ? tab.hex : `rgba(${tab.rgb},0.55)`,
                borderBottom: active ? `2px solid ${tab.hex}` : '2px solid transparent',
                textShadow: active ? `0 0 8px rgba(${tab.rgb},0.8)` : 'none',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
        {activeTab === 'order' && <OrderTicket />}
        {activeTab === 'account' && <AccountSummaryPanel />}
        {activeTab === 'tools' && (
          <div className="flex flex-col h-full">
            <TradingTools />
            <ToolsMediaSection />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tools Media Section: TV + Video Chat ─────────────────────────

type MediaTab = 'tv' | 'videochat';

function ToolsMediaSection() {
  const [mediaTab, setMediaTab] = useState<MediaTab>('tv');

  return (
    <div className="flex flex-col">
      {/* Tab switcher */}
      <div className="flex mx-3 mt-2 rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={() => setMediaTab('tv')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-all"
          style={{
            backgroundColor: mediaTab === 'tv' ? '#0091D5' : 'transparent',
            color: mediaTab === 'tv' ? '#fff' : 'rgba(255,255,255,0.45)',
          }}
        >
          <Tv size={12} /> Live TV
        </button>
        <button
          onClick={() => setMediaTab('videochat')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-all"
          style={{
            backgroundColor: mediaTab === 'videochat' ? '#0091D5' : 'transparent',
            color: mediaTab === 'videochat' ? '#fff' : 'rgba(255,255,255,0.45)',
          }}
        >
          <Video size={12} /> Video Chat
        </button>
      </div>

      {mediaTab === 'tv' ? <BloombergTVPanel /> : <VideoChatPanel />}
    </div>
  );
}

// ─── Bloomberg TV Panel (single working stream) ───────────────────

function BloombergTVPanel() {
  const newsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!newsRef.current) return;
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js';
    script.async = true;
    script.type = 'text/javascript';
    script.textContent = JSON.stringify({
      feedMode: 'all_symbols',
      isTransparent: true,
      displayMode: 'compact',
      width: '100%',
      height: 250,
      colorTheme: 'dark',
      locale: 'en',
    });
    newsRef.current.innerHTML = '';
    newsRef.current.appendChild(script);
  }, []);

  return (
    <div className="p-3 flex flex-col gap-2">
      {/* Live TV - CNBC International via YouTube */}
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold px-1" style={{ color: 'var(--text-muted)' }}>
        <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#FF0000' }} />
        Finance TV Live
      </div>
      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
        <iframe
          src="https://www.youtube.com/embed/9NyxcX3rhQs?autoplay=1&mute=1&rel=0"
          title="CNBC Live"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          style={{ width: '100%', height: 170, border: 'none', backgroundColor: '#000' }}
        />
      </div>

      {/* Market News Feed — scaled down */}
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold px-1 mt-1" style={{ color: 'var(--text-muted)' }}>
        Market Headlines
      </div>
      <div
        ref={newsRef}
        className="rounded-lg overflow-hidden"
        style={{
          border: '1px solid rgba(255,255,255,0.06)',
          height: 250,
          transform: 'scale(0.85)',
          transformOrigin: 'top left',
          width: '117.6%',
        }}
      />
    </div>
  );
}

// ─── Video Chat Panel — Mic, Cam, Remote Control ──────────────────

function VideoChatPanel() {
  const [inCall, setInCall] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [remoteActive, setRemoteActive] = useState(false);
  const [remotePassword, setRemotePassword] = useState('');
  const [showRemoteAuth, setShowRemoteAuth] = useState(false);
  const [remoteAuthed, setRemoteAuthed] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ from: string; text: string; time: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Generate session ID for sharing
  const [sessionId] = useState(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return `RPT-${id.slice(0,4)}-${id.slice(4)}`;
  });

  // Start camera/mic
  const startMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: camOn, audio: micOn });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setInCall(true);
    } catch {
      // Fallback — user may deny permissions
      setInCall(true);
    }
  }, [camOn, micOn]);

  // Stop media
  const stopMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setInCall(false);
    setRemoteActive(false);
    setRemoteAuthed(false);
  }, []);

  // Toggle mic
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((t) => { t.enabled = micOn; });
    }
  }, [micOn]);

  // Toggle cam
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((t) => { t.enabled = camOn; });
    }
  }, [camOn]);

  // Handle remote control auth
  const handleRemoteAuth = () => {
    // Simple password check (in production this would be server-side)
    if (remotePassword.length >= 4) {
      setRemoteAuthed(true);
      setShowRemoteAuth(false);
      setRemoteActive(true);
      setRemotePassword('');
    }
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    const now = new Date();
    setChatMessages((prev) => [...prev, {
      from: 'You',
      text: chatInput.trim(),
      time: `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`,
    }]);
    setChatInput('');
  };

  return (
    <div className="p-3 flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>
          <Video size={12} />
          Support Video Chat
        </div>
        {inCall && (
          <div className="flex items-center gap-1 text-[9px]" style={{ color: '#00C27A' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#00C27A' }} />
            Connected
          </div>
        )}
      </div>

      {/* Video area */}
      <div
        className="relative rounded-lg overflow-hidden flex items-center justify-center"
        style={{
          height: 160,
          backgroundColor: '#0a0a14',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {inCall ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            {!camOn && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: '#0a0a14' }}>
                <div className="text-center">
                  <VideoOff size={32} style={{ color: 'rgba(255,255,255,0.2)' }} className="mx-auto mb-2" />
                  <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Camera Off</div>
                </div>
              </div>
            )}
            {/* Remote control badge */}
            {remoteActive && (
              <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold" style={{ backgroundColor: 'rgba(255,152,0,0.9)', color: '#000' }}>
                <MonitorUp size={10} /> Remote Control Active
              </div>
            )}
          </>
        ) : (
          <div className="text-center">
            <Users size={36} style={{ color: 'rgba(255,255,255,0.12)' }} className="mx-auto mb-2" />
            <div className="text-[11px] font-medium mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Connect with your Broker
            </div>
            <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Start a video call for live support
            </div>
          </div>
        )}
      </div>

      {/* Session ID */}
      <div className="flex items-center justify-between px-2 py-1.5 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
        <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Session ID</div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono font-bold" style={{ color: '#0091D5' }}>{sessionId}</span>
          <button
            onClick={() => navigator.clipboard?.writeText(sessionId)}
            className="p-0.5 rounded hover:bg-white/10 transition-colors"
            title="Copy Session ID"
          >
            <Copy size={10} style={{ color: 'rgba(255,255,255,0.4)' }} />
          </button>
        </div>
      </div>

      {/* Call controls */}
      <div className="flex items-center justify-center gap-2">
        {/* Mic toggle */}
        <button
          onClick={() => setMicOn(!micOn)}
          className="p-2 rounded-full transition-all"
          style={{
            backgroundColor: micOn ? 'rgba(255,255,255,0.08)' : 'rgba(239,68,68,0.2)',
            color: micOn ? 'rgba(255,255,255,0.7)' : '#ef4444',
          }}
          title={micOn ? 'Mute Mic' : 'Unmute Mic'}
        >
          {micOn ? <Mic size={16} /> : <MicOff size={16} />}
        </button>

        {/* Cam toggle */}
        <button
          onClick={() => setCamOn(!camOn)}
          className="p-2 rounded-full transition-all"
          style={{
            backgroundColor: camOn ? 'rgba(255,255,255,0.08)' : 'rgba(239,68,68,0.2)',
            color: camOn ? 'rgba(255,255,255,0.7)' : '#ef4444',
          }}
          title={camOn ? 'Turn Off Camera' : 'Turn On Camera'}
        >
          {camOn ? <Video size={16} /> : <VideoOff size={16} />}
        </button>

        {/* Start / End Call */}
        {!inCall ? (
          <button
            onClick={startMedia}
            className="px-4 py-2 rounded-full flex items-center gap-1.5 text-[11px] font-bold transition-all"
            style={{ backgroundColor: '#00C27A', color: '#fff' }}
          >
            <Phone size={14} /> Start Call
          </button>
        ) : (
          <button
            onClick={stopMedia}
            className="px-4 py-2 rounded-full flex items-center gap-1.5 text-[11px] font-bold transition-all"
            style={{ backgroundColor: '#ef4444', color: '#fff' }}
          >
            <PhoneOff size={14} /> End Call
          </button>
        )}

        {/* Remote Control */}
        <button
          onClick={() => {
            if (remoteAuthed) {
              setRemoteActive(!remoteActive);
            } else {
              setShowRemoteAuth(true);
            }
          }}
          className="p-2 rounded-full transition-all"
          style={{
            backgroundColor: remoteActive ? 'rgba(255,152,0,0.2)' : 'rgba(255,255,255,0.08)',
            color: remoteActive ? '#FF9800' : 'rgba(255,255,255,0.7)',
          }}
          title="Remote Control — let broker rep control your screen"
        >
          <MonitorUp size={16} />
        </button>
      </div>

      {/* Remote Control Auth Modal */}
      {showRemoteAuth && (
        <div className="mx-1 p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,152,0,0.05)', border: '1px solid rgba(255,152,0,0.2)' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Lock size={12} style={{ color: '#FF9800' }} />
            <span className="text-[11px] font-semibold" style={{ color: '#FF9800' }}>Remote Control Authorization</span>
          </div>
          <div className="text-[9px] mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Enter the password provided by your broker representative to allow them to view and control your screen for troubleshooting.
          </div>
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={remotePassword}
              onChange={(e) => setRemotePassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRemoteAuth()}
              placeholder="Enter password..."
              className="flex-1 px-2 py-1.5 rounded text-[11px] outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
            <button onClick={handleRemoteAuth} className="px-3 py-1.5 rounded text-[10px] font-bold" style={{ backgroundColor: '#FF9800', color: '#000' }}>
              Authorize
            </button>
            <button onClick={() => { setShowRemoteAuth(false); setRemotePassword(''); }} className="p-1 rounded hover:bg-white/10">
              <X size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </button>
          </div>
        </div>
      )}

      {/* In-call chat */}
      {inCall && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 px-1 text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>
            <MessageSquare size={10} /> Chat
          </div>
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)', maxHeight: 80, overflowY: 'auto' }}>
            {chatMessages.length === 0 ? (
              <div className="p-2 text-[9px] text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>No messages yet</div>
            ) : (
              <div className="p-1.5 space-y-1">
                {chatMessages.map((msg, i) => (
                  <div key={i} className="text-[10px]">
                    <span className="font-bold" style={{ color: '#0091D5' }}>{msg.from}</span>
                    <span className="mx-1" style={{ color: 'rgba(255,255,255,0.15)' }}>{msg.time}</span>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>{msg.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              placeholder="Type a message..."
              className="flex-1 px-2 py-1.5 rounded text-[10px] outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
            />
            <button onClick={sendChat} className="p-1.5 rounded hover:bg-white/10 transition-colors" style={{ color: '#0091D5' }}>
              <Send size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Account Summary ──────────────────────────────────────────────

function AccountSummaryPanel() {
  const { accountSummary, positions, pendingOrders } = useTradingStore();
  const { balance, equity, margin_used, free_margin, margin_level_pct, floating_pnl } = accountSummary;
  const pnlColor = floating_pnl >= 0 ? '#00C853' : '#FF5252';

  const items: { label: string; value: string; color?: string }[] = [
    { label: 'Balance', value: formatCurrency(balance) },
    { label: 'Equity', value: formatCurrency(equity) },
    { label: 'Floating P&L', value: `${floating_pnl >= 0 ? '+' : ''}${formatCurrency(floating_pnl)}`, color: pnlColor },
    { label: 'Margin Used', value: formatCurrency(margin_used) },
    { label: 'Free Margin', value: formatCurrency(free_margin) },
    { label: 'Margin Level', value: margin_level_pct > 0 ? `${margin_level_pct.toFixed(2)}%` : '--' },
    { label: 'Open Positions', value: String(accountSummary.open_positions_count || positions.length) },
    { label: 'Pending Orders', value: String(pendingOrders.length) },
  ];

  const marginColor = margin_level_pct > 500 ? '#00C853' : margin_level_pct > 200 ? '#FFC107' : '#FF5252';

  return (
    <div className="flex flex-col p-3 gap-3">
      <div className="stat-card">
        <div className="text-[10px] uppercase tracking-wider opacity-40 mb-2">Margin Health</div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, margin_level_pct / 10)}%`, backgroundColor: marginColor }} />
          </div>
          <span className="font-mono text-sm font-bold" style={{ color: marginColor }}>
            {margin_level_pct > 0 ? `${margin_level_pct.toFixed(0)}%` : '--'}
          </span>
        </div>
      </div>
      {items.map((item) => (
        <div key={item.label} className="stat-card flex items-center justify-between">
          <span className="text-xs opacity-50">{item.label}</span>
          <span className="font-mono text-sm font-medium" style={{ color: item.color ?? 'var(--text-primary)' }}>{item.value}</span>
        </div>
      ))}
      {positions.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider opacity-40 mb-2 px-1">Open Exposure</div>
          {positions.filter(p => p.status === 'open').map((pos) => (
            <div key={pos.id} className="flex items-center justify-between px-3 py-1.5 text-xs">
              <span className="font-mono">{pos.symbol}</span>
              <span className="font-mono" style={{ color: pos.direction === 'BUY' ? '#00C853' : '#FF5252' }}>
                {pos.direction} {pos.size.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
