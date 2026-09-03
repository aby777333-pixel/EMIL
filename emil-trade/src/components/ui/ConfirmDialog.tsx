'use client';

import { Modal } from './Modal';
import { cn } from '@/lib/utils/format';

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = 'Confirm',
  destructive = false,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="sm">
      <p className="mb-6 text-sm text-secondary">{message}</p>
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-secondary transition-colors hover:bg-surface hover:text-foreground"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className={cn(
            'rounded-lg px-4 py-2 text-xs font-medium text-white transition-colors',
            destructive
              ? 'bg-loss hover:bg-loss/80'
              : 'bg-accent hover:bg-accent/80',
          )}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
