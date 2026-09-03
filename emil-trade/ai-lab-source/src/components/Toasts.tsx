import { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { useStore } from '../store';

const ICONS = {
  success: <CheckCircle2 size={18} className="text-success" />,
  error: <XCircle size={18} className="text-danger" />,
  warning: <AlertTriangle size={18} className="text-warning" />,
  info: <Info size={18} className="text-primary" />,
};

export function ToastHost() {
  const toasts = useStore((s) => s.toasts);
  const remove = useStore((s) => s.removeToast);

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((t) => setTimeout(() => remove(t.id), 5000));
    return () => timers.forEach(clearTimeout);
  }, [toasts, remove]);

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="glass px-4 py-3 flex items-start gap-3 shadow-neon animate-[pulseGlow_2s_ease-in-out] border-l-2"
          style={{
            borderLeftColor:
              t.type === 'error'
                ? '#ff4444'
                : t.type === 'success'
                  ? '#00ff88'
                  : t.type === 'warning'
                    ? '#ffaa00'
                    : '#00d4ff',
          }}
        >
          {ICONS[t.type]}
          <div className="text-sm flex-1">{t.message}</div>
          <button onClick={() => remove(t.id)} className="text-subtext hover:text-text">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
