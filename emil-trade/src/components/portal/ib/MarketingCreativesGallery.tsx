'use client';

import { useState } from 'react';
import { Download, Copy, Check, FileImage, FileVideo, Globe } from 'lucide-react';
import DashboardCard from '@/components/portal/dashboard/DashboardCard';

interface Creative {
  id: string;
  kind: 'banner' | 'video' | 'landing';
  label: string;
  description: string;
  size?: string;       // for banners
  duration?: string;   // for videos
  embed_code: string;  // text snippet partners can paste
  download_url: string;
}

/**
 * Gallery of co-branded creatives partners can drop into ad campaigns.
 * Static seed list for now; the back office can extend the list later
 * via a `marketing_creatives` table without changing this component.
 */
const CREATIVES: Creative[] = [
  {
    id: 'banner-728x90',
    kind: 'banner',
    label: 'Leaderboard banner',
    description: 'Standard 728×90 leaderboard for Google Display Network and AdSense placements.',
    size: '728 × 90',
    embed_code: '<a href="{{REF_LINK}}"><img src="{{CDN}}/creatives/raptor-728x90.png" alt="EMIL Trade" /></a>',
    download_url: '/marketing/raptor-728x90.png',
  },
  {
    id: 'banner-300x250',
    kind: 'banner',
    label: 'Medium rectangle',
    description: '300×250 medium rectangle. Highest-converting size in our partner stack.',
    size: '300 × 250',
    embed_code: '<a href="{{REF_LINK}}"><img src="{{CDN}}/creatives/raptor-300x250.png" alt="EMIL Trade" /></a>',
    download_url: '/marketing/raptor-300x250.png',
  },
  {
    id: 'video-30s',
    kind: 'video',
    label: 'Brand explainer · 30s',
    description: 'Hero brand spot, broadcast-quality. MP4 + WebM included in the zip.',
    duration: '0:30',
    embed_code: '<video src="{{CDN}}/creatives/raptor-30s.mp4" controls></video>',
    download_url: '/marketing/raptor-30s.zip',
  },
  {
    id: 'landing-fx',
    kind: 'landing',
    label: 'FX landing page',
    description: 'Standalone landing optimized for the EUR/USD search terms. Auto-attaches your ref code.',
    embed_code: '{{REF_LINK}}/landing/fx',
    download_url: '/marketing/landing-fx.zip',
  },
  {
    id: 'landing-prop',
    kind: 'landing',
    label: 'Prop challenge landing',
    description: 'Lead-magnet landing for the funded-account audience. Pre-built form integration.',
    embed_code: '{{REF_LINK}}/landing/prop',
    download_url: '/marketing/landing-prop.zip',
  },
];

const ICONS: Record<Creative['kind'], React.ComponentType<{ size?: number }>> = {
  banner: FileImage,
  video: FileVideo,
  landing: Globe,
};

export default function MarketingCreativesGallery({ refCode }: { refCode: string }) {
  return (
    <DashboardCard title="Creatives" padding="none">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: 'var(--g-border-hair)' }}>
        {CREATIVES.map((c) => (
          <CreativeTile key={c.id} creative={c} refCode={refCode} />
        ))}
      </div>
      <div
        className="px-5 py-3 border-t text-[11px]"
        style={{ borderColor: 'var(--g-border-hair)', color: 'var(--g-text-muted)' }}
      >
        Embed snippets contain <code className="num">{`{{REF_LINK}}`}</code> placeholders that we replace
        with your active referral link when the snippet is copied.
      </div>
    </DashboardCard>
  );
}

function CreativeTile({ creative, refCode }: { creative: Creative; refCode: string }) {
  const Icon = ICONS[creative.kind];
  const [copied, setCopied] = useState(false);

  function copySnippet() {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://gioraptor.com';
    const snippet = creative.embed_code
      .replaceAll('{{REF_LINK}}', `${baseUrl}/r/${refCode}`)
      .replaceAll('{{CDN}}', `${baseUrl}/cdn`);
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    });
  }

  return (
    <div className="flex flex-col p-5" style={{ background: 'var(--g-bg-surface)' }}>
      <div className="flex items-center gap-2.5">
        <span
          className="flex items-center justify-center"
          style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(255,255,255,0.04)',
            color: 'var(--g-text-secondary)',
          }}
        >
          <Icon size={14} />
        </span>
        <div className="min-w-0">
          <div className="text-[13px] font-medium" style={{ color: 'var(--g-text-primary)' }}>
            {creative.label}
          </div>
          <div className="num text-[10px] uppercase tracking-wider" style={{ color: 'var(--g-text-muted)' }}>
            {creative.size ?? creative.duration ?? creative.kind}
          </div>
        </div>
      </div>
      <p className="mt-3 text-[12px] leading-snug flex-1" style={{ color: 'var(--g-text-secondary)' }}>
        {creative.description}
      </p>
      <div className="mt-4 flex items-center gap-2">
        <a
          href={creative.download_url}
          download
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] transition-colors hover:bg-white/[0.04]"
          style={{ color: 'var(--g-text-secondary)', border: '1px solid var(--g-border-soft)' }}
        >
          <Download size={12} /> Download
        </a>
        <button
          type="button"
          onClick={copySnippet}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] transition-colors hover:bg-white/[0.04]"
          style={{ color: copied ? 'var(--g-buy)' : 'var(--g-accent)', border: `1px solid ${copied ? 'rgba(16,185,129,0.4)' : 'rgba(220,38,38,0.4)'}` }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy embed'}
        </button>
      </div>
    </div>
  );
}
