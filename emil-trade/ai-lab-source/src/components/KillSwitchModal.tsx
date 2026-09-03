import { useState } from 'react';
import { AlertOctagon } from 'lucide-react';
import { useStore } from '../store';
import { useKillSwitch } from '../hooks/useApi';
import { Modal } from './ui';

export function KillSwitchModal() {
  const open = useStore((s) => s.killModalOpen);
  const setOpen = useStore((s) => s.setKillModal);
  const [reason, setReason] = useState('');
  const kill = useKillSwitch();

  const trigger = () => {
    kill.mutate(reason || 'manual kill switch');
    setOpen(false);
    setReason('');
  };

  return (
    <Modal open={open} onClose={() => setOpen(false)} title={<span className="text-danger">🛑 Kill Switch</span>}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-danger/10 border border-danger/40">
          <AlertOctagon className="text-danger shrink-0" />
          <div className="text-sm">
            This immediately closes <b>all open positions</b> and halts trading. This action cannot be undone.
          </div>
        </div>
        <div>
          <label className="text-xs text-subtext mb-1 block">Reason (optional)</label>
          <textarea
            className="input h-20 resize-none"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. daily loss limit reached"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button className="btn-ghost" onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button className="btn-danger" onClick={trigger}>
            🛑 Activate Kill Switch
          </button>
        </div>
      </div>
    </Modal>
  );
}
