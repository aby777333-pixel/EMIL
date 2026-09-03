import { useState } from 'react';
import { Send, Mail, MessageSquare, Bell, Smartphone, Monitor, Webhook, Check } from 'lucide-react';
import { Card, SectionTitle } from '../components/ui';
import { useStore } from '../store';

const CHANNELS = [
  { key: 'telegram', label: 'Telegram', icon: Send, on: true },
  { key: 'email', label: 'Email', icon: Mail, on: true },
  { key: 'sms', label: 'SMS', icon: MessageSquare, on: false },
  { key: 'push', label: 'Push notification', icon: Bell, on: true },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, on: false },
  { key: 'raptor', label: 'Raptor in-app', icon: Bell, on: true },
  { key: 'desktop', label: 'Desktop', icon: Monitor, on: false },
  { key: 'webhook', label: 'Webhook', icon: Webhook, on: false },
];

const EVENTS = [
  'Strategy created', 'Backtest completed', 'Strategy approved', 'Strategy rejected',
  'Deployment started', 'Deployment failed', 'Order placed', 'Order rejected',
  'Position opened', 'Position closed', 'Stop-loss triggered', 'Take-profit triggered',
  'Daily loss limit reached', 'Drawdown limit reached', 'Broker disconnected',
  'Data feed interrupted', 'Strategy behaviour changed', 'Kill switch activated',
  'Manual intervention detected',
];

export default function Alerts() {
  const pushToast = useStore((s) => s.pushToast);
  const [chan, setChan] = useState<Record<string, boolean>>(Object.fromEntries(CHANNELS.map((c) => [c.key, c.on])));
  const [events, setEvents] = useState<Record<string, boolean>>(Object.fromEntries(EVENTS.map((e) => [e, true])));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold">Alerts &amp; Notifications</h2>
        <p className="text-sm text-subtext">Choose delivery channels and which events fire an alert.</p>
      </div>

      <Card>
        <SectionTitle right={<Bell size={14} className="text-primary" />}>Channels</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CHANNELS.map((c) => {
            const on = chan[c.key];
            return (
              <button key={c.key} onClick={() => setChan((s) => ({ ...s, [c.key]: !s[c.key] }))}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${on ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-subtext hover:text-text'}`}>
                <c.icon size={15} />
                <span className="truncate">{c.label}</span>
                {on && <Check size={13} className="ml-auto" />}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-subtext mt-2">WhatsApp fires only where an approved provider is connected. Configure Telegram credentials in Settings.</p>
      </Card>

      <Card>
        <SectionTitle right={<span className="text-[10px] text-subtext">{Object.values(events).filter(Boolean).length}/{EVENTS.length} on</span>}>Alert Events</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
          {EVENTS.map((e) => (
            <label key={e} className="flex items-center gap-2 text-xs py-1 cursor-pointer">
              <input type="checkbox" checked={events[e]} onChange={() => setEvents((s) => ({ ...s, [e]: !s[e] }))} className="accent-[#00d4ff]" />
              <span className="truncate">{e}</span>
            </label>
          ))}
        </div>
        <button className="btn-primary mt-4" onClick={() => pushToast({ type: 'success', message: 'Alert routing saved.' })}>
          <Check size={14} /> Save alert settings
        </button>
      </Card>
    </div>
  );
}
