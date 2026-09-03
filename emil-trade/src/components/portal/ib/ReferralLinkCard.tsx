'use client';

import { useState } from 'react';
import { Copy, Check, QrCode, Tag } from 'lucide-react';
import DashboardCard from '@/components/portal/dashboard/DashboardCard';

/**
 * Personal referral link + campaign tag generator. The QR code is a
 * server-side data URL until we add a proper QR library — for now we
 * open a print-friendly route in a new tab on click.
 */
export default function ReferralLinkCard({
  refCode,
  tier,
}: {
  refCode: string;
  tier: number;
}) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://gioraptor.com';
  const [tag, setTag] = useState('');
  const [copied, setCopied] = useState<'main' | 'tagged' | null>(null);

  const mainLink  = `${baseUrl}/r/${refCode}`;
  const taggedLink = tag ? `${mainLink}?c=${encodeURIComponent(tag.trim())}` : null;

  function copy(val: string, which: 'main' | 'tagged') {
    navigator.clipboard.writeText(val).then(() => {
      setCopied(which);
      window.setTimeout(() => setCopied(null), 1400);
    });
  }

  return (
    <DashboardCard
      title="Your referral link"
      trailing={
        <span
          className="text-[10px] font-medium uppercase tracking-[0.16em] px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(220,38,38,0.12)', color: 'var(--g-accent)' }}
        >
          Tier {tier}
        </span>
      }
    >
      <LinkRow
        label="Personal link"
        value={mainLink}
        onCopy={() => copy(mainLink, 'main')}
        copied={copied === 'main'}
      />

      <div className="mt-5 pt-5 border-t" style={{ borderColor: 'var(--g-border-hair)' }}>
        <div className="text-[11px] uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--g-text-secondary)' }}>
          Campaign tag (optional)
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-2.5 rounded-md flex-1 min-w-[200px]"
            style={{ background: 'var(--g-bg-elevated)', border: '1px solid var(--g-border-soft)', height: 36 }}
          >
            <Tag size={12} style={{ color: 'var(--g-text-muted)' }} />
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value.replace(/[^a-z0-9-]/gi, '').slice(0, 32))}
              placeholder="e.g. youtube-q3"
              className="num flex-1 bg-transparent outline-none text-[12px]"
              style={{ color: 'var(--g-text-primary)' }}
            />
          </div>
          {taggedLink && (
            <button
              type="button"
              onClick={() => copy(taggedLink, 'tagged')}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[12px] transition-colors hover:bg-white/[0.04]"
              style={{
                color: 'var(--g-accent)',
                border: '1px solid rgba(220,38,38,0.4)',
              }}
            >
              {copied === 'tagged' ? <Check size={12} /> : <Copy size={12} />}
              {copied === 'tagged' ? 'Copied' : 'Copy tagged link'}
            </button>
          )}
          <a
            href={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(taggedLink ?? mainLink)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[12px] transition-colors hover:bg-white/[0.04]"
            style={{
              color: 'var(--g-text-secondary)',
              border: '1px solid var(--g-border-soft)',
            }}
            title="Open QR code in new tab"
          >
            <QrCode size={12} /> QR
          </a>
        </div>
        <p className="mt-2 text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
          Tags let you track which campaign a signup came from. Letters, numbers, and dashes only.
        </p>
      </div>
    </DashboardCard>
  );
}

function LinkRow({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--g-text-secondary)' }}>
        {label}
      </div>
      <div
        className="flex items-stretch rounded-md overflow-hidden"
        style={{ background: 'var(--g-bg-elevated)', border: '1px solid var(--g-border-soft)' }}
      >
        <input
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className="num flex-1 bg-transparent outline-none px-3 text-[12px]"
          style={{ color: 'var(--g-text-primary)' }}
        />
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 px-3 transition-colors hover:bg-white/[0.04] border-l text-[12px]"
          style={{
            borderColor: 'var(--g-border-hair)',
            color: copied ? 'var(--g-buy)' : 'var(--g-text-secondary)',
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
