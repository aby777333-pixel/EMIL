'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * Method-specific payment instructions panel. Bank wire shows
 * beneficiary details, UPI shows a QR placeholder + ID, crypto shows
 * a network selector + deposit address. Each row has a one-tap copy
 * button per the spec ("[Copy] on each line").
 */
export default function DepositInstructions({
  method,
  reference,
  network,
  onNetworkChange,
}: {
  method: string;
  reference: string;
  network: string;
  onNetworkChange: (n: string) => void;
}) {
  if (method === 'bank_wire') return <BankWire reference={reference} />;
  if (method === 'upi')       return <Upi reference={reference} />;
  if (method === 'crypto')    return <Crypto reference={reference} network={network} onNetworkChange={onNetworkChange} />;

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--g-bg-surface)', border: '1px solid var(--g-border-hair)' }}
    >
      <div className="text-[11px] uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--g-text-secondary)' }}>
        Payment instructions
      </div>
      <p className="text-[13px]" style={{ color: 'var(--g-text-secondary)' }}>
        Once you confirm, we&apos;ll show the next step here based on the method you choose.
      </p>
    </div>
  );
}

function BankWire({ reference }: { reference: string }) {
  return (
    <Panel title="Bank wire details">
      <DetailRow label="Beneficiary"       value="EMIL Trade Holdings Ltd" />
      <DetailRow label="Bank"              value="HDFC Bank · Mumbai · IN" />
      <DetailRow label="Account number"    value="50100456789012" mono />
      <DetailRow label="IFSC / SWIFT"      value="HDFCINBBXXX" mono />
      <DetailRow label="Beneficiary IBAN"  value="IN36HDFC0001456789012" mono />
      <DetailRow label="Reference (must include)" value={reference} mono emphasis />
      <Note>
        Wires usually settle in 1–3 business days. <strong>Always include the reference</strong>
        — without it, reconciliation requires manual intervention and can delay credit by 24h.
      </Note>
    </Panel>
  );
}

function Upi({ reference }: { reference: string }) {
  return (
    <Panel title="UPI details">
      <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4 mb-4">
        <div
          className="rounded-lg flex items-center justify-center"
          style={{
            aspectRatio: '1 / 1',
            background: 'rgba(255,255,255,0.04)',
            border: '1px dashed var(--g-border-soft)',
          }}
        >
          <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--g-text-muted)' }}>
            QR placeholder
          </span>
        </div>
        <div>
          <DetailRow label="UPI ID" value="gioraptor@hdfcbank" mono />
          <DetailRow label="Reference" value={reference} mono emphasis />
        </div>
      </div>
      <Note>
        Scan the QR or paste the UPI ID into your bank app. Include the reference in the note
        field so we can match the transfer to your account automatically.
      </Note>
    </Panel>
  );
}

const NETWORKS = [
  { id: 'TRC20', label: 'USDT · Tron (TRC20)', confirmations: 19 },
  { id: 'ERC20', label: 'USDT · Ethereum (ERC20)', confirmations: 12 },
  { id: 'BTC',   label: 'Bitcoin (native)', confirmations: 3 },
];

function Crypto({
  reference,
  network,
  onNetworkChange,
}: {
  reference: string;
  network: string;
  onNetworkChange: (n: string) => void;
}) {
  const selected = NETWORKS.find((n) => n.id === network) ?? NETWORKS[0];

  return (
    <Panel title="Crypto deposit">
      <div className="mb-4">
        <div className="text-[11px] uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--g-text-secondary)' }}>
          Network
        </div>
        <div className="flex flex-wrap gap-2">
          {NETWORKS.map((n) => {
            const active = n.id === selected.id;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => onNetworkChange(n.id)}
                className="text-[12px] px-3 py-1.5 rounded-md transition-colors"
                style={{
                  background: active ? 'rgba(220,38,38,0.08)' : 'transparent',
                  color: active ? 'var(--g-text-primary)' : 'var(--g-text-secondary)',
                  border: `1px solid ${active ? 'var(--g-accent)' : 'var(--g-border-soft)'}`,
                }}
              >
                {n.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="rounded-lg flex items-center justify-center mb-3"
        style={{
          aspectRatio: '5 / 1',
          background: 'rgba(255,255,255,0.04)',
          border: '1px dashed var(--g-border-soft)',
        }}
      >
        <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--g-text-muted)' }}>
          QR for deposit address
        </span>
      </div>

      <DetailRow
        label={`${selected.id} address`}
        value="TKaSkMq2k9LKf3kTd3zZjL8B8nA8rAqe5R"
        mono
      />
      <DetailRow label="Reference" value={reference} mono emphasis />

      <Note>
        Sends on the wrong network are typically <strong>unrecoverable</strong>. Double-check the
        network before broadcasting. Funds credit after {selected.confirmations} network confirmations.
      </Note>
    </Panel>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-xl p-5"
      style={{ background: 'var(--g-bg-surface)', border: '1px solid var(--g-border-hair)' }}
    >
      <div className="text-[11px] uppercase tracking-[0.14em] mb-3" style={{ color: 'var(--g-text-secondary)' }}>
        {title}
      </div>
      {children}
    </section>
  );
}

function DetailRow({
  label,
  value,
  mono,
  emphasis,
}: {
  label: string;
  value: string;
  mono?: boolean;
  emphasis?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    });
  }
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0" style={{ borderColor: 'var(--g-border-hair)' }}>
      <span className="text-[11px] uppercase tracking-[0.14em] shrink-0" style={{ color: 'var(--g-text-muted)' }}>
        {label}
      </span>
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={mono ? 'num truncate' : 'truncate'}
          style={{
            color: emphasis ? 'var(--g-accent)' : 'var(--g-text-primary)',
            fontSize: 13,
          }}
          title={value}
        >
          {value}
        </span>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 inline-flex items-center justify-center rounded transition-colors hover:bg-white/[0.04]"
          style={{
            width: 26, height: 26,
            color: copied ? 'var(--g-buy)' : 'var(--g-text-muted)',
          }}
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-4 rounded-lg p-3 text-[12px] leading-relaxed"
      style={{
        background: 'rgba(245,158,11,0.05)',
        border: '1px solid rgba(245,158,11,0.18)',
        color: 'var(--g-text-secondary)',
      }}
    >
      {children}
    </div>
  );
}
