'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key, Globe, Plus, Copy, Check, Eye, EyeOff,
  ToggleLeft, ToggleRight, Trash2, RefreshCw,
  Bell, CheckCircle2, XCircle, Clock, ChevronDown,
} from 'lucide-react';
import type { ApiKey, WebhookEndpoint, WebhookDelivery } from '@/types/integrations';

interface ApiHubProps {
  apiKeys: ApiKey[];
  webhooks: WebhookEndpoint[];
  recentDeliveries: WebhookDelivery[];
  onCreateKey: (name: string, permissions: string[]) => void;
  onToggleKey: (id: string, active: boolean) => void;
  onDeleteKey: (id: string) => void;
  onCreateWebhook: (url: string, events: string[]) => void;
  onToggleWebhook: (id: string, active: boolean) => void;
}

const WEBHOOK_EVENTS = [
  'account.created', 'trade.opened', 'trade.closed', 'deposit.completed',
  'withdrawal.approved', 'kyc.approved', 'margin.call', 'stop.out',
  'challenge.passed', 'challenge.failed', 'copy.started', 'copy.stopped',
  'ea.deployed', 'signal.generated',
];

export function ApiHub({ apiKeys, webhooks, recentDeliveries, onCreateKey, onToggleKey, onDeleteKey, onCreateWebhook, onToggleWebhook }: ApiHubProps) {
  const [tab, setTab] = useState<'keys' | 'webhooks' | 'deliveries'>('keys');
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5 w-fit">
        {([
          { key: 'keys', label: 'API Keys', icon: <Key className="h-3.5 w-3.5" /> },
          { key: 'webhooks', label: 'Webhooks', icon: <Globe className="h-3.5 w-3.5" /> },
          { key: 'deliveries', label: 'Delivery Log', icon: <Bell className="h-3.5 w-3.5" /> },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t.key ? 'bg-white/10 text-white' : 'text-white/40'
            }`}>{t.icon}{t.label}</button>
        ))}
      </div>

      {/* API Keys */}
      {tab === 'keys' && (
        <div className="space-y-3">
          {apiKeys.map(key => (
            <div key={key.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-4">
              <button onClick={() => onToggleKey(key.id, !key.isActive)}>
                {key.isActive ? <ToggleRight className="h-5 w-5 text-[#00dc82]" /> : <ToggleLeft className="h-5 w-5 text-white/15" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white">{key.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <code className="text-[10px] font-mono text-white/30">{key.keyPrefix}•••••••••</code>
                  <button onClick={() => copyToClipboard(key.keyPrefix, key.id)} className="text-white/15 hover:text-white/40">
                    {copied === key.id ? <Check className="h-3 w-3 text-[#00dc82]" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-white/25">{key.totalRequests.toLocaleString()} requests</div>
                <div className="text-[9px] text-white/15">{key.rateLimit}/min</div>
              </div>
              <div className="flex gap-1">
                {key.permissions.slice(0, 3).map(p => (
                  <span key={p} className="px-1.5 py-0.5 rounded text-[8px] bg-white/5 text-white/20">{p}</span>
                ))}
              </div>
              <button onClick={() => onDeleteKey(key.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/15 hover:text-red-400">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Webhooks */}
      {tab === 'webhooks' && (
        <div className="space-y-3">
          {webhooks.map(wh => (
            <div key={wh.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
              <div className="flex items-center gap-3 mb-2">
                <button onClick={() => onToggleWebhook(wh.id, !wh.isActive)}>
                  {wh.isActive ? <ToggleRight className="h-5 w-5 text-[#00dc82]" /> : <ToggleLeft className="h-5 w-5 text-white/15" />}
                </button>
                <code className="text-xs font-mono text-[#00b4ff] truncate flex-1">{wh.url}</code>
                <span className={`text-[10px] font-mono ${wh.successRate >= 98 ? 'text-[#00dc82]' : 'text-[#f59e0b]'}`}>
                  {wh.successRate.toFixed(1)}% success
                </span>
              </div>
              <div className="flex flex-wrap gap-1 ml-8">
                {wh.events.map(e => (
                  <span key={e} className="px-1.5 py-0.5 rounded text-[8px] bg-[#00b4ff]/10 text-[#00b4ff]/60">{e}</span>
                ))}
              </div>
              <div className="flex items-center gap-3 ml-8 mt-2 text-[9px] text-white/15">
                <span>{wh.totalDeliveries} deliveries</span>
                <span>{wh.failedDeliveries} failed</span>
                <span>Last: {wh.lastDelivery ? new Date(wh.lastDelivery).toLocaleString() : 'Never'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delivery Log */}
      {tab === 'deliveries' && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="divide-y divide-white/[0.03] max-h-[500px] overflow-y-auto">
            {recentDeliveries.map(d => (
              <div key={d.id} className="px-5 py-2.5 flex items-center gap-3 text-xs">
                {d.status >= 200 && d.status < 300 ? (
                  <CheckCircle2 className="h-3 w-3 text-[#00dc82] shrink-0" />
                ) : (
                  <XCircle className="h-3 w-3 text-[#ef4444] shrink-0" />
                )}
                <span className="text-[10px] font-mono text-white/40 w-24">{d.event}</span>
                <span className={`font-mono text-[10px] w-8 ${d.status >= 200 && d.status < 300 ? 'text-[#00dc82]' : 'text-[#ef4444]'}`}>
                  {d.status}
                </span>
                <span className="text-[10px] text-white/20 w-12">{d.responseTime}ms</span>
                <span className="text-[10px] text-white/15 flex-1">attempt {d.attempt}</span>
                <span className="text-[10px] text-white/10">{new Date(d.deliveredAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
