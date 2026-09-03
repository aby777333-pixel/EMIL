'use client';

import Link from 'next/link';
import { ArrowLeft, Shield, Zap, Globe, Users, Award, TrendingUp } from 'lucide-react';
import Logo from '@/components/Logo';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#060D16] text-[#EAF0FA]">
      <nav className="border-b border-white/[0.06] bg-[#060D16]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3"><Logo height={36} theme="dark" /></Link>
          <Link href="/" className="flex items-center gap-2 text-sm text-[#7A8BA8] hover:text-white"><ArrowLeft size={16} /> Back</Link>
        </div>
      </nav>
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">About EMIL Trade</h1>
          <p className="text-lg text-[#7A8BA8] max-w-2xl mx-auto">Next-generation brokerage infrastructure, engineered for performance, scalability, and institutional-grade usability.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {[
            { icon: <Zap size={24} />, title: 'Precision & Speed', desc: 'Sub-millisecond execution across global data centers with 99.99% uptime SLA.' },
            { icon: <Shield size={24} />, title: 'Security First', desc: 'Bank-grade encryption, 2FA, blockchain audit trails, and multi-jurisdiction compliance.' },
            { icon: <Globe size={24} />, title: 'Global Reach', desc: 'Offices in Dubai and London. Supporting brokers across Asia, Europe, Africa, and Middle East.' },
            { icon: <Users size={24} />, title: 'For Everyone', desc: 'From retail traders to institutional desks, fund managers to broker startups.' },
            { icon: <Award size={24} />, title: 'Industry Leaders', desc: 'Built by fintech veterans with decades of experience in FX, crypto, and brokerage technology.' },
            { icon: <TrendingUp size={24} />, title: 'AI-Powered', desc: 'Machine learning for market prediction, sentiment analysis, and automated strategy building.' },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/[0.06] bg-[#0B1422]/60 p-8">
              <div className="text-[#00B4D8] mb-4">{item.icon}</div>
              <h3 className="text-lg font-bold mb-2">{item.title}</h3>
              <p className="text-sm text-[#7A8BA8]">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
          <p className="text-lg text-[#7A8BA8] max-w-2xl mx-auto mb-8">Precision, speed, and transparency should belong to everyone. We&apos;re building the operating system that democratizes institutional-grade trading infrastructure.</p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/register" className="rounded-xl bg-[#00B4D8] px-8 py-3 text-sm font-bold text-black hover:bg-[#007AB8] transition-all">Get Started</Link>
            <Link href="/contact" className="rounded-xl border border-white/10 px-8 py-3 text-sm font-medium text-[#7A8BA8] hover:text-white hover:border-white/20 transition-all">Contact Us</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
