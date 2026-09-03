'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Plus, ToggleLeft, ToggleRight, Trash2,
  TrendingUp, BarChart3, Calendar, DollarSign,
  Newspaper, Cpu, Mail, Smartphone, MessageCircle,
  Send, Globe, X,
} from 'lucide-react';
import type { SmartAlert, AlertType, AlertDelivery } from '@/types/trader';

const ALERT_TYPES: { value: AlertType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'price', label: 'Price Alert', icon: <TrendingUp className="h-3.5 w-3.5" />, color: '#00b4ff' },
  { value: 'indicator', label: 'Indicator Alert', icon: <BarChart3 className="h-3.5 w-3.5" />, color: '#8b5cf6' },
  { value: 'pattern', label: 'Pattern Detection', icon: <Cpu className="h-3.5 w-3.5" />, color: '#f59e0b' },
  { value: 'calendar', label: 'Economic Calendar', icon: <Calendar className="h-3.5 w-3.5" />, color: '#00dc82' },
  { value: 'position', label: 'Position Alert', icon: <DollarSign className="h-3.5 w-3.5" />, color: '#ff6b35' },
  { value: 'news_sentiment', label: 'News Sentiment', icon: <Newspaper className="h-3.5 w-3.5" />, color: '#ef4444' },
];

const DELIVERY_OPTIONS: { value: AlertDelivery; label: string; icon: React.ReactNode }[] = [
  { value: 'in_app', label: 'In-App', icon: <Bell className="h-3 w-3" /> },
  { value: 'push', label: 'Push', icon: <Smartphone className="h-3 w-3" /> },
  { value: 'email', label: 'Email', icon: <Mail className="h-3 w-3" /> },
  { value: 'telegram', label: 'Telegram', icon: <Send className="h-3 w-3" /> },
  { value: 'discord', label: 'Discord', icon: <MessageCircle className="h-3 w-3" /> },
  { value: 'webhook', label: 'Webhook', icon: <Globe className="h-3 w-3" /> },
];

interface SmartAlertsProps {
  alerts: SmartAlert[];
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  onCreate: (alert: Omit<SmartAlert, 'id' | 'triggeredCount' | 'lastTriggered' | 'createdAt'>) => void;
}

export function SmartAlerts({ alerts, onToggle, onDelete, onCreate }: SmartAlertsProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newType, setNewType] = useState<AlertType>('price');
  const [newSymbol, setNewSymbol] = useState('EURUSD');
  const [newCondition, setNewCondition] = useState('above');
  const [newThreshold, setNewThreshold] = useState('');
  const [newDelivery, setNewDelivery] = useState<AlertDelivery[]>(['in_app', 'push']);

  const activeCount = alerts.filter(a => a.isActive).length;

  const handleCreate = () => {
    if (!newThreshold) return;
    onCreate({
      type: newType,
      symbol: newSymbol || null,
      condition: newCondition,
      threshold: newThreshold,
      delivery: newDelivery,
      isActive: true,
    });
    setShowCreate(false);
    setNewThreshold('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Smart Alerts</h3>
          <p className="text-[11px] text-white/30">{activeCount} active · {alerts.length} total</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00b4ff] hover:bg-[#00b4ff]/80 text-white text-xs font-medium transition-colors"
        >
          <Plus className="h-3 w-3" /> New Alert
        </button>
      </div>

      {/* Create Alert Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {ALERT_TYPES.map(t => (
                  <button key={t.value} onClick={() => setNewType(t.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                      newType === t.value ? 'border-[#00b4ff]/50 bg-[#00b4ff]/5 text-white' : 'border border-white/[0.06] text-white/30 bg-white/[0.02]'
                    }`}>
                    <span style={{ color: newType === t.value ? t.color : undefined }}>{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-white/30 mb-1 block">Symbol</label>
                  <input type="text" value={newSymbol} onChange={e => setNewSymbol(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-[#00b4ff] focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-white/30 mb-1 block">Condition</label>
                  <select value={newCondition} onChange={e => setNewCondition(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/60 focus:outline-none">
                    <option value="above">Price Above</option>
                    <option value="below">Price Below</option>
                    <option value="cross_up">Cross Up</option>
                    <option value="cross_down">Cross Down</option>
                    <option value="pct_move">% Move</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-white/30 mb-1 block">Threshold</label>
                  <input type="text" value={newThreshold} onChange={e => setNewThreshold(e.target.value)} placeholder="1.0850"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-[#00b4ff] focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-white/30 mb-1 block">Delivery Channels</label>
                <div className="flex gap-2">
                  {DELIVERY_OPTIONS.map(d => (
                    <button key={d.value}
                      onClick={() => setNewDelivery(prev => prev.includes(d.value) ? prev.filter(x => x !== d.value) : [...prev, d.value])}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] transition-colors ${
                        newDelivery.includes(d.value) ? 'bg-[#00b4ff]/10 text-[#00b4ff] border border-[#00b4ff]/20' : 'bg-white/5 text-white/25 border border-transparent'
                      }`}>
                      {d.icon}{d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={handleCreate} className="flex-1 py-2 rounded-lg bg-[#00b4ff] text-white text-xs font-medium">Create Alert</button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg bg-white/5 text-white/40 text-xs">Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alert List */}
      <div className="space-y-2">
        {alerts.map(alert => {
          const typeConfig = ALERT_TYPES.find(t => t.value === alert.type);
          return (
            <motion.div key={alert.id} layout className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-3">
              <button onClick={() => onToggle(alert.id, !alert.isActive)}>
                {alert.isActive ? <ToggleRight className="h-5 w-5 text-[#00dc82]" /> : <ToggleLeft className="h-5 w-5 text-white/15" />}
              </button>
              <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${typeConfig?.color ?? '#6b7280'}15` }}>
                <span style={{ color: typeConfig?.color }}>{typeConfig?.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white">
                  {alert.symbol && <span className="font-mono mr-1.5">{alert.symbol}</span>}
                  {alert.condition} {alert.threshold}
                </div>
                <div className="text-[10px] text-white/25">
                  {alert.delivery.join(', ')} · triggered {alert.triggeredCount}x
                </div>
              </div>
              <button onClick={() => onDelete(alert.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/15 hover:text-red-400 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
