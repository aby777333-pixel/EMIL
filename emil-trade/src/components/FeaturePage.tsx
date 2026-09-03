'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Logo from '@/components/Logo';

interface Feature {
  title: string;
  desc: string;
}

interface FeaturePageProps {
  badge: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  description: string;
  features: Feature[];
  ctaText?: string;
  ctaHref?: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
}

export default function FeaturePage({
  badge,
  badgeColor,
  title,
  subtitle,
  description,
  features,
  ctaText = 'Get Started',
  ctaHref = '/auth/register',
  secondaryCtaText = 'Live Demo',
  secondaryCtaHref = '/terminal',
}: FeaturePageProps) {
  return (
    <div className="min-h-screen bg-[#060D16] text-[#EAF0FA]">
      <nav className="border-b border-white/[0.06] bg-[#060D16]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <Logo height={36} theme="dark" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-sm text-[#7A8BA8] hover:text-white transition-colors">
              <ArrowLeft size={16} /> Home
            </Link>
            <Link href="/auth/register" className="rounded-lg bg-[#00B4D8] px-5 py-2 text-sm font-semibold hover:bg-[#007AB8] transition-all">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: badgeColor }}>{badge}</span>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">{title}</h1>
          <p className="text-xl font-medium mb-2" style={{ color: badgeColor }}>{subtitle}</p>
          <p className="text-base text-[#7A8BA8] max-w-2xl mx-auto leading-relaxed">{description}</p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div key={i} className="rounded-xl border border-white/[0.06] bg-[#0B1422]/60 p-6 transition-all hover:border-white/[0.12]">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold mb-4" style={{ backgroundColor: badgeColor + '15', color: badgeColor }}>
                  {i + 1}
                </div>
                <h3 className="text-sm font-bold mb-2">{f.title}</h3>
                <p className="text-xs text-[#7A8BA8] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 border-t border-white/[0.04]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to experience {title}?</h2>
          <p className="text-sm text-[#7A8BA8] mb-8">Join thousands of traders and brokers already using EMIL Trade.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={ctaHref} className="flex h-12 items-center justify-center gap-2 rounded-xl px-8 text-sm font-bold transition-all hover:brightness-110" style={{ backgroundColor: badgeColor, color: '#000' }}>
              {ctaText} <ArrowRight size={16} />
            </Link>
            <Link href={secondaryCtaHref} className="flex h-12 items-center justify-center rounded-xl border border-white/10 px-8 text-sm text-[#7A8BA8] hover:text-white hover:border-white/20 transition-all">
              {secondaryCtaText}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
