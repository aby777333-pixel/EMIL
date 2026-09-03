'use client';

import { motion } from 'framer-motion';
import {
  ShieldAlert, Eye, Clock, AlertTriangle, CheckCircle2,
  XCircle, User, MapPin, Zap, TrendingDown,
} from 'lucide-react';
import type { ToxicFlowAlert, ToxicFlowAlertType } from '@/types/broker';

const ALERT_CONFIG: Record<ToxicFlowAlertType, { label: string; icon: React.ReactNode; color: string }> = {
  latency_arb: { label: 'Latency Arbitrage', icon: <Zap className="h-3.5 w-3.5" />, color: '#ef4444' },
  news_scalping: { label: 'News Scalping', icon: <Clock className="h-3.5 w-3.5" />, color: '#f59e0b' },
  reverse_trading: { label: 'Reverse Trading', icon: <TrendingDown className="h-3.5 w-3.5" />, color: '#ef4444' },
  vpn_detected: { label: 'VPN/Proxy Detected', icon: <MapPin className="h-3.5 w-3.5" />, color: '#8b5cf6' },
  coordinated_accounts: { label: 'Coordinated Accounts', icon: <User className="h-3.5 w-3.5" />, color: '#ff6b35' },
  behavior_deviation: { label: 'Behavior Deviation', icon: <AlertTriangle className="h-3.5 w-3.5" />, color: '#f59e0b' },
};

const SEVERITY_COLORS = {
  low: '#6b7280',
  medium: '#f59e0b',
  high: '#ff6b35',
  critical: '#ef4444',
};

interface ToxicFlowAlertsProps {
  alerts: ToxicFlowAlert[];
  onInvestigate: (id: string) => void;
  onDismiss: (id: string) => void;
  onResolve: (id: string) => void;
}

export function ToxicFlowAlerts({ alerts, onInvestigate, onDismiss, onResolve }: ToxicFlowAlertsProps) {
  const openAlerts = alerts.filter(a => a.status === 'open' || a.status === 'investigating');
  const criticalCount = alerts.filter(a => a.severity === 'critical' && a.status === 'open').length;

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${criticalCount > 0 ? 'bg-red-500/10' : 'bg-white/5'}`}>
            <ShieldAlert className={`h-5 w-5 ${criticalCount > 0 ? 'text-red-400' : 'text-white/40'}`} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Toxic Flow Detection</h3>
            <p className="text-[11px] text-white/30">
              {openAlerts.length} open alert{openAlerts.length !== 1 ? 's' : ''}
              {criticalCount > 0 && <span className="text-red-400 ml-1">· {criticalCount} critical</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="divide-y divide-white/[0.03] max-h-96 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <CheckCircle2 className="h-8 w-8 text-[#00dc82]/30 mx-auto mb-2" />
            <p className="text-xs text-white/30">No toxic flow alerts</p>
          </div>
        ) : (
          alerts.map((alert, i) => {
            const config = ALERT_CONFIG[alert.alertType];
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`px-5 py-3 hover:bg-white/[0.02] transition-colors ${
                  alert.status === 'resolved' || alert.status === 'dismissed' ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5" style={{ color: config.color }}>{config.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-white">{config.label}</span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                        style={{
                          backgroundColor: `${SEVERITY_COLORS[alert.severity]}15`,
                          color: SEVERITY_COLORS[alert.severity],
                        }}
                      >
                        {alert.severity}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                        alert.status === 'open' ? 'bg-red-500/10 text-red-400' :
                        alert.status === 'investigating' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' :
                        alert.status === 'resolved' ? 'bg-[#00dc82]/10 text-[#00dc82]' :
                        'bg-white/5 text-white/30'
                      }`}>
                        {alert.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/40 mb-1">{alert.clientName}</p>
                    <p className="text-[11px] text-white/30 line-clamp-2">{alert.description}</p>
                    <div className="text-[10px] text-white/15 mt-1">
                      {new Date(alert.createdAt).toLocaleString()}
                    </div>
                  </div>

                  {/* Actions */}
                  {(alert.status === 'open' || alert.status === 'investigating') && (
                    <div className="flex gap-1 shrink-0">
                      {alert.status === 'open' && (
                        <button
                          onClick={() => onInvestigate(alert.id)}
                          className="p-1.5 rounded-lg bg-[#f59e0b]/10 text-[#f59e0b] hover:bg-[#f59e0b]/20 transition-colors"
                          title="Investigate"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onResolve(alert.id)}
                        className="p-1.5 rounded-lg bg-[#00dc82]/10 text-[#00dc82] hover:bg-[#00dc82]/20 transition-colors"
                        title="Resolve"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onDismiss(alert.id)}
                        className="p-1.5 rounded-lg bg-white/5 text-white/30 hover:bg-white/10 transition-colors"
                        title="Dismiss"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
