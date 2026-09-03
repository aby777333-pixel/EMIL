'use client';

import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import HeroShaderBg from '@/components/HeroShaderBg';
import AnimatedCounter from '@/components/landing/AnimatedCounter';
import ScrollReveal from '@/components/landing/ScrollReveal';
import RaptorAIOrb from '@/components/landing/NexusOrb';
import MarketTicker from '@/components/landing/MarketTicker';
import Logo from '@/components/Logo';

/* ─── Data ─── */
const features = [
  { title: 'Ultra-Low Latency Execution', description: 'Sub-millisecond order routing with institutional-grade infrastructure across global data centers.', icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>, stat: '<1ms' },
  { title: 'Multi-Asset Trading', description: 'Forex, metals, indices, crypto, equities, and commodities from a single unified terminal.', icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>, stat: '500+' },
  { title: 'RAPTOR AI Intelligence', description: 'AI-powered market analysis, sentiment detection, pattern recognition, and personalized trade copilot.', icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" /></svg>, stat: 'AI' },
  { title: 'Copy Trading & PAMM', description: 'Follow top strategies with automated mirroring, or manage investor funds with professional allocation tools.', icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>, stat: 'Social' },
  { title: 'White Label Platform', description: 'Launch your own branded brokerage with full customization, API access, and multi-tenant isolation.', icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" /></svg>, stat: 'B2B' },
  { title: 'Prop Trading Engine', description: 'Run funded account challenges with automated rule enforcement, scaling plans, and payout management.', icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-7.54 0" /></svg>, stat: 'Funded' },
];

const modules = [
  { name: 'RAPTOR Core Engine', desc: 'Indigenous matching & execution', color: '#00B4D8' },
  { name: 'RAPTOR CRM', desc: 'Full lifecycle client management', color: '#00A5A8' },
  { name: 'RAPTOR Desk', desc: 'Institutional dealing workstation', color: '#009B4D' },
  { name: 'RAPTOR Price', desc: 'Spread construction & aggregation', color: '#F0A500' },
  { name: 'RAPTOR Charts', desc: '155+ indicators, all chart types', color: '#00B4D8' },
  { name: 'RAPTOR Script', desc: 'TypeScript EA/indicator runtime', color: '#8b5cf6' },
  { name: 'RAPTOR AI', desc: 'Claude-powered intelligence layer', color: '#8b5cf6' },
  { name: 'Copy Trading', desc: 'Social & mirror trading engine', color: '#00A5A8' },
  { name: 'PAMM / MAM', desc: 'Investor fund management', color: '#009B4D' },
  { name: 'Prop Trading', desc: 'Challenge engine & funded accounts', color: '#F0A500' },
  { name: 'IB Network', desc: 'Multi-tier affiliate management', color: '#00B4D8' },
  { name: 'Compliance Suite', desc: 'KYC/AML + regulatory reporting', color: '#FF4560' },
  { name: 'Payment Hub', desc: '40+ PSP connectors, crypto', color: '#00C896' },
  { name: 'LP Bridge', desc: 'FIX 4.4/5.0, smart routing', color: '#00A5A8' },
  { name: 'White Label', desc: 'Full rebrand + custom domain', color: '#F0A500' },
  { name: 'RAPTOR Intel', desc: 'Indigenous BI & analytics', color: '#009B4D' },
  { name: 'RAPTOR Social', desc: 'Community, leaderboards, feed', color: '#00B4D8' },
  { name: 'RAPTOR Comply', desc: 'Responsible trading framework', color: '#FF4560' },
  { name: 'RAPTOR Connect', desc: 'MT5/cTrader migration bridge', color: '#7A8BA8' },
  { name: 'RAPTOR App', desc: 'iOS + Android native mobile', color: '#8b5cf6' },
];

const architectureLayers = [
  { label: 'Presentation', items: ['Next.js 16', 'React 19', 'TradingView Charts', 'Framer Motion'], color: '#00B4D8' },
  { label: 'Intelligence', items: ['RAPTOR AI (Claude)', 'Sentiment Engine', 'Pattern Recognition', 'Risk Scoring'], color: '#8b5cf6' },
  { label: 'Core Engine', items: ['Order Management', 'Position Engine', 'Matching Engine', 'Price Aggregator'], color: '#00A5A8' },
  { label: 'Data Layer', items: ['PostgreSQL + RLS', 'TimescaleDB', 'Redis Cache', 'Elasticsearch'], color: '#009B4D' },
  { label: 'Infrastructure', items: ['Kubernetes', 'Multi-Region', 'Cloudflare CDN', '99.99% SLA'], color: '#F0A500' },
];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } } };

export default function Home() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <div className="min-h-screen bg-[#060D16] text-[#EAF0FA] overflow-y-auto overflow-x-hidden">
      {/* ─── Navigation ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#060D16]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Logo height={36} theme="dark" />
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-[#7A8BA8]">
            <a href="#features" className="transition-colors hover:text-white">Platform</a>
            <a href="#nexus" className="transition-colors hover:text-white">RAPTOR AI</a>
            <Link href="/marketplace/hub" className="transition-colors hover:text-white">Marketplace</Link>
            <Link href="/pricing" className="transition-colors hover:text-white">Pricing</Link>
            <Link href="/developer" className="transition-colors hover:text-white">Developers</Link>
            <Link href="/contact" className="transition-colors hover:text-white">Contact</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/broker-login" className="text-sm text-[#F0A500] transition-colors hover:text-[#D49000]">Broker Login</Link>
            <Link href="/auth/login" className="text-sm text-[#7A8BA8] transition-colors hover:text-white">Trader Login</Link>
            <Link href="/auth/register" className="rounded-lg bg-[#00B4D8] px-5 py-2 text-sm font-semibold transition-all hover:bg-[#007AB8] hover:shadow-lg hover:shadow-[#00B4D8]/20">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section (Animated) ─── */}
      <section ref={heroRef} className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-16">
        <HeroShaderBg />
        <div className="absolute inset-0 bg-gradient-to-b from-[#060D16]/70 via-[#060D16]/30 to-[#060D16]/95" style={{ zIndex: 1 }} />

        <motion.div
          className="relative mx-auto max-w-5xl text-center"
          style={{ zIndex: 2, y: heroY, opacity: heroOpacity }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#00B4D8]/20 bg-[#00B4D8]/[0.06] px-5 py-2 text-sm text-[#00B4D8]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#00B4D8] animate-pulse" />
            EMIL TRADE v3.0 TITAN — Broker-in-a-Box
          </motion.div>

          <motion.h1
            className="mb-6 text-4xl font-bold tracking-tight leading-[1.1] sm:text-6xl lg:text-7xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="block"
            >
              The AI-Native
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.65 }}
              className="block"
            >
              Operating System
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="block bg-gradient-to-r from-[#00D4AA] via-[#00B4D8] to-[#0091B3] bg-clip-text text-transparent"
            >
              for Modern Brokerages
            </motion.span>
          </motion.h1>

          <motion.p
            className="mx-auto mb-12 max-w-3xl text-lg text-[#7A8BA8] sm:text-xl leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.95 }}
          >
            Indigenous matching engine, 20+ integrated modules, RAPTOR AI copilot, multi-asset execution, and complete white-label infrastructure — built from the ground up by GIO4X.
          </motion.p>

          <motion.div
            className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.1 }}
          >
            <Link href="/auth/register" className="group flex h-14 w-full items-center justify-center gap-2.5 rounded-xl bg-[#00B4D8] px-10 text-base font-semibold transition-all hover:bg-[#007AB8] hover:shadow-xl hover:shadow-[#00B4D8]/25 sm:w-auto">
              Launch Your Brokerage
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </Link>
            <Link href="/terminal" className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-10 text-base font-medium text-[#7A8BA8] transition-all hover:border-white/20 hover:bg-white/[0.03] hover:text-white sm:w-auto">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" /></svg>
              Live Demo
            </Link>
          </motion.div>
        </motion.div>

        {/* Animated Stats bar */}
        <motion.div
          className="relative mt-20 w-full max-w-4xl"
          style={{ zIndex: 2 }}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.3 }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            {[
              { end: 500, suffix: '+', label: 'Instruments' },
              { end: 1, suffix: 'ms', prefix: '<', label: 'Execution' },
              { end: 20, suffix: '+', label: 'Modules' },
              { end: 99.99, suffix: '%', label: 'Uptime', decimals: 2 },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1 py-6 px-4">
                <span className="text-2xl sm:text-3xl font-bold text-white">
                  <AnimatedCounter end={s.end} suffix={s.suffix} prefix={s.prefix || ''} decimals={s.decimals || 0} />
                </span>
                <span className="text-xs text-[#7A8BA8] uppercase tracking-wider">{s.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg className="w-5 h-5 text-[#4A5568]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
          </svg>
        </motion.div>
      </section>

      {/* ─── Live Market Ticker ─── */}
      <MarketTicker />

      {/* ─── Broker-in-a-Box Value Prop ─── */}
      <section className="relative px-6 py-28 border-b border-white/[0.06]">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <div className="mb-16 text-center">
              <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[#F0A500]">Broker-in-a-Box</span>
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-5xl">Two Tiers. One Platform. Zero Compromise.</h2>
              <p className="mx-auto max-w-2xl text-[#7A8BA8] text-lg">EMIL TRADE serves both B2B broker clients and B2C retail traders from a single unified platform with complete data isolation.</p>
            </div>
          </ScrollReveal>

          <div className="grid lg:grid-cols-2 gap-6">
            <ScrollReveal delay={0.1} direction="left">
              <div className="rounded-2xl border border-[#F0A500]/20 bg-gradient-to-br from-[#F0A500]/[0.04] to-transparent p-8 h-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0A500]/10 text-[#F0A500]">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008V7.5z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#F0A500]">TIER 1 — For Brokers (B2B)</h3>
                    <p className="text-xs text-[#7A8BA8]">Complete brokerage infrastructure</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {['Risk Engine & A/B Book', 'Dealing Desk', 'Client CRM', 'LP Bridge Manager', 'Compliance Suite', 'IB Network', 'Revenue Analytics', 'White Label'].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-[#7A8BA8]">
                      <span className="h-1 w-1 rounded-full bg-[#F0A500] shrink-0" />{f}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2} direction="right">
              <div className="rounded-2xl border border-[#00B4D8]/20 bg-gradient-to-br from-[#00B4D8]/[0.04] to-transparent p-8 h-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00B4D8]/10 text-[#00B4D8]">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#00B4D8]">TIER 2 — For Traders (B2C)</h3>
                    <p className="text-xs text-[#7A8BA8]">Professional trading experience</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {['Advanced Terminal', 'RAPTOR AI Copilot', 'Copy Trading', 'Prop Challenges', 'Smart Alerts', 'Trade Journal', 'Education Hub', 'Social Feed'].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-[#7A8BA8]">
                      <span className="h-1 w-1 rounded-full bg-[#00B4D8] shrink-0" />{f}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="relative px-6 py-28 border-b border-white/[0.06]">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <div className="mb-12 text-center">
              <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[#00A5A8]">Get Started in Minutes</span>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Launch in 3 Steps</h2>
            </div>
          </ScrollReveal>
          <motion.div className="grid gap-8 sm:grid-cols-3" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {[
              { step: '01', title: 'Register & Verify', desc: 'Create your account in 30 seconds. Fast KYC verification — or start with a demo account instantly.', icon: '01' },
              { step: '02', title: 'Configure & Fund', desc: '15+ payment methods including wire, card, crypto, and e-wallets. Full platform customization for brokers.', icon: '02' },
              { step: '03', title: 'Go Live', desc: 'Access 500+ instruments with institutional execution. Full brokerage infrastructure operational in 48 hours.', icon: '03' },
            ].map((s) => (
              <motion.div key={s.step} variants={fadeUp} className="relative rounded-2xl border border-white/[0.06] bg-[#0B1422] p-8 text-center group hover:border-[#00A5A8]/20 transition-all">
                <div className="mb-4 text-5xl font-bold bg-gradient-to-b from-[#00A5A8]/30 to-transparent bg-clip-text text-transparent">{s.icon}</div>
                <h3 className="mb-2 text-lg font-bold">{s.title}</h3>
                <p className="text-sm text-[#7A8BA8] leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Core Features ─── */}
      <section id="features" className="relative px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <div className="mb-16 text-center">
              <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[#00B4D8]">Core Capabilities</span>
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-5xl">Built for Institutional Performance</h2>
              <p className="mx-auto max-w-2xl text-[#7A8BA8] text-lg">Every component engineered for speed, reliability, and regulatory compliance at scale.</p>
            </div>
          </ScrollReveal>
          <motion.div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                className="group relative rounded-2xl border border-white/[0.06] bg-[#0B1422]/60 p-8 transition-all duration-300 hover:border-[#00B4D8]/20 hover:bg-[#0B1422]/80 backdrop-blur-sm"
              >
                <div className="absolute top-8 right-8 text-xs font-bold text-[#F0A500]/60 mono">{feature.stat}</div>
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#00B4D8]/10 text-[#00B4D8] transition-colors group-hover:bg-[#00B4D8]/15">{feature.icon}</div>
                <h3 className="mb-2.5 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-[#7A8BA8]">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── RAPTOR AI Section ─── */}
      <section id="nexus" className="relative px-6 py-20 border-t border-white/[0.04]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(139,92,246,0.06)_0%,_transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <ScrollReveal direction="left">
              <div>
                <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[#8b5cf6]">Powered by Claude</span>
                <h2 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl">
                  Meet <span className="text-[#8b5cf6]">RAPTOR AI</span> — The AI Soul of RAPTOR
                </h2>
                <p className="mb-8 text-[#7A8BA8] text-lg leading-relaxed">
                  RAPTOR AI is not a chatbot. It is a unified AI consciousness embedded into every chart, every dashboard, every trade entry, and every risk decision. Powered by Claude API at its core.
                </p>
                <div className="space-y-4">
                  {[
                    { title: 'Trade Copilot', desc: 'Pre-trade analysis, SL/TP suggestions, risk assessment on every order entry', color: '#00B4D8' },
                    { title: 'Emotional Coach', desc: 'Detects overtrading, revenge trading, FOMO — intervenes compassionately', color: '#00C896' },
                    { title: 'Market Sentinel', desc: 'Real-time sentiment analysis, 55+ pattern detection, regime classification', color: '#F0A500' },
                    { title: 'Risk Guardian', desc: 'Predictive margin calls, toxic flow detection, fraud analysis for brokers', color: '#FF4560' },
                    { title: 'Growth Engine', desc: 'Churn prediction, LTV scoring, AI-drafted communications for broker CRM', color: '#8b5cf6' },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3">
                      <span className="mt-1.5 h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <div>
                        <div className="text-sm font-semibold">{item.title}</div>
                        <div className="text-xs text-[#7A8BA8]">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal direction="right" delay={0.2}>
              <div className="flex flex-col items-center gap-8">
                <RaptorAIOrb />
                <div className="rounded-2xl border border-[#8b5cf6]/20 bg-[#8b5cf6]/[0.04] p-6 max-w-sm w-full backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="h-2 w-2 rounded-full bg-[#8b5cf6] animate-pulse" />
                    <span className="text-xs font-semibold text-[#8b5cf6]">RAPTOR AI INSIGHT</span>
                  </div>
                  <p className="text-sm text-[#7A8BA8] leading-relaxed italic">
                    &ldquo;EUR/USD approaching major resistance at 1.0880. RSI divergence detected on H4. Your historical win rate on counter-trend setups at this level is 38%. Consider waiting for confirmation.&rdquo;
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] text-[#4A5568]">Confidence: 82%</span>
                    <span className="text-[10px] text-[#4A5568]">|</span>
                    <span className="text-[10px] text-[#4A5568]">Powered by RAPTOR AI</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ─── 20 Modules Grid ─── */}
      <section id="modules" className="relative px-6 py-20 border-t border-white/[0.04]">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <div className="mb-16 text-center">
              <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[#009B4D]">Complete Ecosystem</span>
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-5xl">
                <AnimatedCounter end={20} /> Indigenous Modules
              </h2>
              <p className="mx-auto max-w-2xl text-[#7A8BA8] text-lg">Every module is 100% RAPTOR-native. MT5 and cTrader are migration bridges only — not dependencies.</p>
            </div>
          </ScrollReveal>
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {modules.map((m) => (
              <motion.div
                key={m.name}
                variants={fadeUp}
                className="rounded-xl border border-white/[0.06] bg-[#0B1422]/40 px-4 py-4 transition-all hover:bg-[#0B1422]/60 group"
                whileHover={{ borderColor: m.color + '40', scale: 1.02 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                  <span className="text-xs font-semibold text-white truncate">{m.name}</span>
                </div>
                <p className="text-[10px] text-[#7A8BA8] leading-relaxed">{m.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Architecture Visualization ─── */}
      <section className="relative px-6 py-20 border-t border-white/[0.04]">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <div className="mb-16 text-center">
              <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[#00A5A8]">Technology Stack</span>
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">Enterprise Architecture</h2>
              <p className="mx-auto max-w-2xl text-[#7A8BA8] text-lg">Five-layer architecture built for institutional reliability and performance.</p>
            </div>
          </ScrollReveal>
          <div className="space-y-3">
            {architectureLayers.map((layer, i) => (
              <ScrollReveal key={layer.label} delay={i * 0.1}>
                <div className="rounded-xl border border-white/[0.06] bg-[#0B1422]/40 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-32 shrink-0">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: layer.color }}>{layer.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 flex-1">
                    {layer.items.map((item) => (
                      <span key={item} className="rounded-lg border border-white/[0.06] bg-[#060D16] px-3 py-1.5 text-xs mono text-[#7A8BA8]">{item}</span>
                    ))}
                  </div>
                  <div className="hidden sm:block w-8 text-right">
                    <motion.div
                      className="h-2 w-2 rounded-full mx-auto"
                      style={{ backgroundColor: layer.color }}
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                    />
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── EA Converter Highlight ─── */}
      <section className="relative px-6 py-20 border-t border-white/[0.04]">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <ScrollReveal direction="left">
              <div>
                <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[#8b5cf6]">Flagship Feature</span>
                <h2 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl">MT5 EA &rarr; RAPTOR Script Converter</h2>
                <p className="mb-6 text-[#7A8BA8] text-lg leading-relaxed">Upload your MQL5 Expert Advisors and Indicators — our AI-powered pipeline parses, converts, tests, and deploys them natively on RAPTOR in minutes.</p>
                <div className="space-y-3">
                  {['Parse MQL5 AST + detect trading patterns', 'Generate TypeScript + Pine Script output', 'Auto-backtest with signal parity validation', 'One-click deploy to live / demo / paper', 'Marketplace listing with performance badges'].map((s, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-[#7A8BA8]">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-[#8b5cf6]/10 text-[#8b5cf6] text-[10px] font-bold mono">{i + 1}</span>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal direction="right" delay={0.2}>
              <div className="rounded-2xl border border-white/[0.06] bg-[#0B1422]/60 p-6 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="h-3 w-3 rounded-full bg-[#FF4560]" />
                  <span className="h-3 w-3 rounded-full bg-[#F0A500]" />
                  <span className="h-3 w-3 rounded-full bg-[#00C896]" />
                  <span className="ml-auto text-[10px] text-[#4A5568] mono">converter.raptor</span>
                </div>
                <pre className="mono text-[11px] leading-6 text-[#7A8BA8] overflow-x-auto">
{`// RAPTOR SCRIPT — Converted from MT5 EA
@ea({ name: 'TrendFollower Pro', version: '1.0' })
class TrendFollowerPro extends RaptorEA {
  @input({ min: 5, max: 200 })
  maPeriod = 50;

  @input({ min: 10, max: 100 })
  rsiPeriod = 14;

  async onTick(tick: Tick) {
    const ma = await indicators.ema(tick.symbol,
      this.maPeriod, 'H1');
    const rsi = await indicators.rsi(tick.symbol,
      this.rsiPeriod, 'H1');

    if (tick.bid > ma.value && rsi.value < 30) {
      await this.place({
        type: 'BUY', lots: this.riskLots(1.5),
        sl: ma.value - tick.atr * 1.5,
        tp: tick.bid + tick.atr * 3,
      });
    }
  }
}`}
                </pre>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ─── Trader Features Mega Section ─── */}
      <section className="relative px-6 py-20 border-t border-white/[0.04]">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <div className="text-center mb-14">
              <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[#00B4D8]">For Traders</span>
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-5xl">Everything a Trader Needs.<br /><span className="text-[#00B4D8]">Nothing They Don&apos;t.</span></h2>
            </div>
          </ScrollReveal>
          <motion.div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {[
              { title: 'RAPTOR Charts', desc: '15 chart types, 155+ indicators, 50+ drawing tools, 30+ timeframes', stat: '155+', color: '#00B4D8', href: '/dashboard/raptor-charts' },
              { title: 'NEXUS AI Copilot', desc: 'Pre-trade analysis, psychology coaching, weekly reports, voice mode', stat: 'AI', color: '#8b5cf6', href: '/dashboard/nexus' },
              { title: 'Script IDE', desc: 'TypeScript-native scripting with backtest engine and parameter optimization', stat: 'IDE', color: '#00A5A8', href: '/dashboard/script-ide' },
              { title: 'Copy Trading', desc: 'Follow verified providers with risk-adjusted allocation and auto-copy', stat: 'Social', color: '#009B4D', href: 'https://zippy-piroshki-21aa30.netlify.app/copy' },
              { title: 'Prop Challenges', desc: '1-phase, 2-phase, instant funding with live progress gauges and scaling', stat: 'Funded', color: '#F0A500', href: '/dashboard/prop-challenge' },
              { title: 'Social Trading', desc: 'Share trades, leaderboards, forums, live rooms, trading competitions', stat: 'Feed', color: '#00C896', href: '/dashboard/social' },
              { title: 'Smart Alerts', desc: 'Price, indicator, pattern, calendar, position, and news sentiment alerts', stat: '7ch', color: '#FF4560', href: '/dashboard/smart-alerts' },
              { title: 'Finance Portal', desc: 'Card, wire, crypto deposits. Tax summaries. Internal transfers. Statements', stat: 'Pay', color: '#F0A500', href: '/dashboard/finance' },
              { title: 'Performance Analytics', desc: 'Equity curve, Sharpe, Sortino, Calmar, monthly heatmap, trade distribution', stat: '20+', color: '#00B4D8', href: '/dashboard/analytics' },
              { title: 'RAPTOR Academy', desc: 'Courses, XP levels, badges, streaks, quizzes, AI tutor, paper trading', stat: 'XP', color: '#8b5cf6', href: '/dashboard/academy' },
              { title: 'Marketplace', desc: 'EAs, indicators, signal providers, plugins — free and paid', stat: 'Store', color: '#009B4D', href: '/marketplace/hub' },
              { title: 'EA Converter', desc: 'Upload MQL5 files — AI converts to RAPTOR Script in minutes', stat: 'MT5→', color: '#00A5A8', href: '/converter' },
            ].map((f) => (
              <motion.div key={f.title} variants={fadeUp}>
                <Link href={f.href} target={f.href.startsWith('http') ? '_blank' : undefined} rel={f.href.startsWith('http') ? 'noopener noreferrer' : undefined} className="block rounded-xl border border-white/[0.06] bg-[#0B1422]/40 p-4 transition-all hover:bg-[#0B1422]/70 hover:border-[#00B4D8]/20 group h-full">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: f.color }}>{f.title}</span>
                    <span className="text-[10px] font-bold mono" style={{ color: f.color + '80' }}>{f.stat}</span>
                  </div>
                  <p className="text-[11px] text-[#7A8BA8] leading-relaxed">{f.desc}</p>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── RAPTOR Charts + Indicators Showcase ─── */}
      <section className="relative px-6 py-16 border-t border-white/[0.04]">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <ScrollReveal direction="left">
              <div>
                <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[#00B4D8]">RAPTOR Charts</span>
                <h2 className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl">155+ Indigenous Indicators.<br/>15 Chart Types. 50+ Drawing Tools.</h2>
                <p className="mb-5 text-sm text-[#7A8BA8] leading-relaxed">Every indicator is 100% RAPTOR-native TypeScript — no dependency on TradingView calculations. Plus 8 exclusive RAPTOR indicators and 5 NEXUS AI overlays.</p>
                <div className="grid grid-cols-2 gap-2">
                  {['SMA/EMA/DEMA/TEMA/HMA', 'RSI/Stochastic/CCI/MACD', 'Bollinger/ATR/Keltner', 'VWAP/OBV/Volume Profile', 'Ichimoku Cloud (full)', 'Supertrend/ADX/SAR', 'Fibonacci (7 types)', 'Elliott Wave + Harmonic'].map((g) => (
                    <div key={g} className="flex items-center gap-1.5 text-[10px] text-[#7A8BA8]"><span className="h-1 w-1 rounded-full bg-[#00B4D8] shrink-0"/>{g}</div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal direction="right" delay={0.1}>
              <div className="grid grid-cols-4 gap-1.5">
                {['PULSE','MWAVE','LIQMAP','SMART','FLOW','REGIME','SENT','SIGNAL','ZONES','PATTERNS','DIV','ENTRY'].map((ind) => (
                  <div key={ind} className="rounded-lg border border-white/[0.06] bg-[#0B1422]/40 px-2 py-2 text-center">
                    <span className="text-[9px] font-bold mono" style={{ color: ind.length <= 5 ? '#ff6b35' : '#8b5cf6' }}>{ind}</span>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ─── NEXUS Psychology + Responsible Trading ─── */}
      <section className="relative px-6 py-16 border-t border-white/[0.04]">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-3 gap-4">
            <ScrollReveal delay={0}>
              <div className="rounded-xl border border-[#8b5cf6]/15 bg-[#8b5cf6]/[0.03] p-5 h-full">
                <div className="text-xs font-bold text-[#8b5cf6] uppercase tracking-wider mb-3">NEXUS Psychology Coach</div>
                <div className="space-y-2">
                  {['Overtrading detection', 'Revenge trading alerts', 'FOMO pattern recognition', 'Loss aversion coaching', 'Early profit-taking analysis', 'Weekly performance reports', 'Crisis support + resources'].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-[10px] text-[#7A8BA8]"><span className="h-1 w-1 rounded-full bg-[#8b5cf6] shrink-0"/>{f}</div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <div className="rounded-xl border border-[#00C896]/15 bg-[#00C896]/[0.03] p-5 h-full">
                <div className="text-xs font-bold text-[#00C896] uppercase tracking-wider mb-3">Responsible Trading</div>
                <div className="space-y-2">
                  {['Self-set deposit limits', 'Daily/weekly loss limits', 'Session time limits', 'Reality check popups', 'Cooling-off periods', 'Self-exclusion (immediate)', 'GamCare + BeGambleAware links'].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-[10px] text-[#7A8BA8]"><span className="h-1 w-1 rounded-full bg-[#00C896] shrink-0"/>{f}</div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <div className="rounded-xl border border-[#F0A500]/15 bg-[#F0A500]/[0.03] p-5 h-full">
                <div className="text-xs font-bold text-[#F0A500] uppercase tracking-wider mb-3">Loyalty & Gamification</div>
                <div className="space-y-2">
                  {['XP system: trades + education', '6 tiers: Rookie → Legend', '100+ achievement badges', 'Weekly trading challenges', 'Tier spread discounts', 'Referral rewards program', 'Community competitions'].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-[10px] text-[#7A8BA8]"><span className="h-1 w-1 rounded-full bg-[#F0A500] shrink-0"/>{f}</div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ─── Platform Numbers ─── */}
      <section className="relative px-6 py-14 border-t border-white/[0.06]">
        <div className="mx-auto max-w-6xl">
          <motion.div className="grid grid-cols-3 sm:grid-cols-6 gap-3" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {[
              { n: '23', label: 'Order Types' },
              { n: '155+', label: 'Indicators' },
              { n: '50+', label: 'Drawing Tools' },
              { n: '15', label: 'Chart Types' },
              { n: '22+', label: 'Integrations' },
              { n: '90+', label: 'DB Tables' },
            ].map((s) => (
              <motion.div key={s.label} variants={fadeUp} className="text-center py-3">
                <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#00D4AA] to-[#0091B3] bg-clip-text text-transparent mono">{s.n}</div>
                <div className="text-[9px] text-[#7A8BA8] uppercase tracking-wider mt-0.5">{s.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── For Brokers Section ─── */}
      <section className="relative px-6 py-20 border-t border-white/[0.04] bg-gradient-to-b from-[#060D16] to-[#0B1422]/50">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <div className="text-center mb-16">
              <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[#F0A500]">For Brokers</span>
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-5xl">Launch Your Brokerage<br /><span className="text-[#F0A500]">In Days, Not Months</span></h2>
              <p className="mx-auto max-w-2xl text-[#7A8BA8] text-lg">Full white-label infrastructure with dealing desk, risk engine, CRM, IB network, compliance, and RAPTOR AI — operational in under 48 hours.</p>
            </div>
          </ScrollReveal>
          <motion.div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {[
              { title: 'White Label', desc: 'Your brand, your domain, your RAPTOR AI persona — full rebrand in minutes', color: '#F0A500' },
              { title: 'Risk Engine', desc: 'A/B-book routing, exposure monitoring, hedge desk, margin controls', color: '#FF4560' },
              { title: 'Dealing Desk', desc: 'Position monitor, order flow, price engine, spread constructor', color: '#00B4D8' },
              { title: 'Compliance', desc: 'KYC/AML, transaction monitoring, SAR filing, regulatory reports', color: '#00C896' },
              { title: 'CRM System', desc: '360° client profiles, pipeline management, communication hub', color: '#00A5A8' },
              { title: 'IB Network', desc: 'Multi-tier commissions, unlimited depth, IB portal, tracking links', color: '#009B4D' },
              { title: 'LP Bridge', desc: 'FIX protocol, smart routing, aggregation, LP performance monitoring', color: '#8b5cf6' },
              { title: 'Revenue Intel', desc: 'Revenue waterfall, client LTV, cohort analysis, custom reports', color: '#F0A500' },
            ].map((f) => (
              <motion.div key={f.title} variants={fadeUp} className="rounded-xl border border-white/[0.06] bg-[#0B1422]/60 p-5 transition-all hover:bg-[#0B1422]/80" whileHover={{ borderColor: f.color + '30' }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: f.color }}>{f.title}</div>
                <p className="text-xs text-[#7A8BA8] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
          <div className="mt-12 text-center">
            <Link href="/contact?type=broker" className="inline-flex rounded-xl bg-[#F0A500] px-8 py-3.5 text-sm font-bold text-[#060D16] transition-all hover:bg-[#D49000] hover:shadow-lg hover:shadow-[#F0A500]/20">
              Book a Demo
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Trust & Security ─── */}
      <section className="relative px-6 py-20 border-t border-white/[0.06]">
        <div className="mx-auto max-w-5xl">
          <motion.div className="grid gap-4 sm:grid-cols-4" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {[
              { icon: '🔒', title: 'AES-256 + TLS 1.3', desc: 'Bank-grade encryption at rest and in transit' },
              { icon: '🛡️', title: 'Row-Level Security', desc: 'Data isolation enforced at database layer' },
              { icon: '📋', title: 'Immutable Audit Log', desc: '7-year retention, append-only, SOC 2 ready' },
              { icon: '🌐', title: '99.99% Uptime SLA', desc: 'Multi-region Kubernetes, global CDN' },
            ].map((t) => (
              <motion.div key={t.title} variants={fadeUp} className="rounded-xl border border-white/[0.06] bg-[#111D2E] p-5 text-center">
                <div className="mb-2 text-2xl">{t.icon}</div>
                <div className="text-sm font-bold mb-1">{t.title}</div>
                <p className="text-xs text-[#7A8BA8]">{t.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Innovation Section ─── */}
      <section className="relative px-6 py-20 border-t border-white/[0.04]">
        <div className="mx-auto max-w-7xl text-center">
          <ScrollReveal>
            <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[#00A5A8]">Innovation</span>
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-5xl">Indigenous Technology. Zero Dependencies.</h2>
            <p className="mx-auto mb-16 max-w-2xl text-[#7A8BA8] text-lg">Every capability that MT5 or cTrader offers — rebuilt natively inside RAPTOR.</p>
          </ScrollReveal>
          <motion.div className="grid sm:grid-cols-3 gap-6" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {[
              { title: 'RAPTOR Core Engine', desc: 'Indigenous matching engine with 23 order types, netting and hedging modes, sub-millisecond atomic execution.', tag: 'LIVE', tagColor: '#00C896' },
              { title: 'RAPTOR Script Runtime', desc: 'TypeScript-native EA/Indicator runtime with sandboxed V8 isolates, WASM acceleration, and zero-copy price feeds.', tag: 'LIVE', tagColor: '#00C896' },
              { title: 'RAPTOR AI Voice Trading', desc: 'Speak to RAPTOR AI — place orders, request analysis, and get real-time coaching hands-free via natural language.', tag: 'BETA', tagColor: '#F0A500' },
            ].map((item) => (
              <motion.div key={item.title} variants={fadeUp} className="rounded-2xl border border-white/[0.06] bg-[#0B1422]/60 p-8 text-left transition-all hover:border-[#00A5A8]/20">
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded mb-4" style={{ backgroundColor: item.tagColor + '20', color: item.tagColor }}>{item.tag}</span>
                <h3 className="text-lg font-bold mb-3">{item.title}</h3>
                <p className="text-sm text-[#7A8BA8] leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Pricing Section ─── */}
      <section className="relative px-6 py-20 border-t border-white/[0.04]">
        <div className="mx-auto max-w-5xl text-center">
          <ScrollReveal>
            <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-[#009B4D]">Pricing</span>
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-5xl">Transparent Pricing</h2>
            <p className="mx-auto mb-16 max-w-2xl text-[#7A8BA8] text-lg">Start free. Scale as you grow. Enterprise for institutions.</p>
          </ScrollReveal>
          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { tier: 'Trader', price: 'Free', period: 'Forever for traders', features: ['Full trading terminal', 'RAPTOR AI copilot', 'Copy trading access', 'Mobile app', 'Standard support'], cta: 'Start Trading', ctaStyle: 'border border-white/10 hover:bg-white/[0.03]', highlight: false },
              { tier: 'Broker', price: 'Custom', period: 'Per month, scaled', features: ['Full brokerage platform', 'White label + custom domain', 'Risk engine + dealing desk', 'CRM + compliance suite', 'LP bridge manager', 'RAPTOR AI for brokers', 'Priority support'], cta: 'Book Demo', ctaStyle: 'bg-[#00B4D8] text-black hover:bg-[#007AB8]', highlight: true },
              { tier: 'Enterprise', price: 'Contact', period: 'Custom agreement', features: ['Multi-entity management', 'Dedicated infrastructure', 'Custom integrations', 'SLA guarantees', 'Dedicated account team'], cta: 'Contact Sales', ctaStyle: 'border border-white/10 hover:bg-white/[0.03]', highlight: false },
            ].map((plan) => (
              <ScrollReveal key={plan.tier} delay={plan.highlight ? 0 : 0.1}>
                <div className={`rounded-2xl ${plan.highlight ? 'border-[#00B4D8]/30' : 'border-white/[0.06]'} border bg-[#0B1422]/60 p-8 text-left relative h-full flex flex-col`} style={plan.highlight ? { boxShadow: '0 0 40px rgba(0,145,213,0.08)' } : {}}>
                  {plan.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-1 rounded-full bg-[#00B4D8] text-black">MOST POPULAR</div>}
                  <div className="text-xs font-bold text-[#00B4D8] uppercase tracking-wider mb-2">{plan.tier}</div>
                  <div className="text-3xl font-bold mb-1">{plan.price}</div>
                  <div className="text-xs text-[#7A8BA8] mb-6">{plan.period}</div>
                  <div className="space-y-3 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-sm text-[#7A8BA8]"><span className="h-1.5 w-1.5 rounded-full bg-[#009B4D]" />{f}</div>
                    ))}
                  </div>
                  <Link href={plan.tier === 'Enterprise' ? '/contact' : '/auth/register'} className={`flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold transition-all ${plan.ctaStyle}`}>{plan.cta}</Link>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CEO Letter ─── */}
      <section className="relative px-6 py-20 border-t border-white/[0.04]">
        <div className="mx-auto max-w-3xl">
          <ScrollReveal>
            <div className="rounded-2xl border border-white/[0.06] bg-[#0B1422]/60 p-10 backdrop-blur-sm">
              <div className="text-xs font-bold text-[#00B4D8] uppercase tracking-wider mb-6">From the Desk of the CEO</div>
              <h2 className="text-2xl font-bold mb-6">The Future of Trading Is Here</h2>
              <div className="space-y-4 text-sm text-[#7A8BA8] leading-relaxed">
                <p>Dear Future Partner,</p>
                <p>EMIL TRADE is not just another trading platform. It is an entirely indigenous, AI-native operating system for the modern brokerage industry — built from the ground up with zero dependency on legacy infrastructure.</p>
                <p>Every matching engine tick, every chart pixel, every AI insight, every compliance check runs on RAPTOR-native code. We don&apos;t bridge to MT5 — we migrate clients away from it.</p>
                <p>Our philosophy is simple: precision, speed, transparency, and intelligence should belong to everyone — from the retail trader placing their first order to the institutional dealing desk managing billions in exposure.</p>
                <p className="italic">Let&apos;s build the future of trading — together.</p>
              </div>
              <div className="mt-8 pt-6 border-t border-white/[0.06]">
                <div className="text-sm font-semibold">Yours sincerely,</div>
                <div className="text-sm text-[#00B4D8] font-bold mt-1">Founder & CEO</div>
                <div className="text-xs text-[#7A8BA8]">EMIL TRADE Trading Platform</div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="relative px-6 py-20 border-t border-white/[0.04]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(0,155,77,0.06)_0%,_transparent_60%)]" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <ScrollReveal>
            <h2 className="mb-6 text-3xl font-bold tracking-tight sm:text-5xl">
              Ready to Own
              <br />
              <span className="bg-gradient-to-r from-[#00D4AA] via-[#00B4D8] to-[#0091B3] bg-clip-text text-transparent">The Future of Brokerage?</span>
            </h2>
            <p className="mb-10 text-[#7A8BA8] text-lg">Whether you&apos;re a trader, fund manager, prop firm, or broker — RAPTOR scales with you.</p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/auth/register" className="flex h-14 w-full items-center justify-center rounded-xl bg-[#00B4D8] px-10 text-base font-semibold transition-all hover:bg-[#007AB8] hover:shadow-xl hover:shadow-[#00B4D8]/25 sm:w-auto">Create Free Account</Link>
              <Link href="/terminal" className="flex h-14 w-full items-center justify-center rounded-xl border border-white/10 px-10 text-base font-medium text-[#7A8BA8] transition-all hover:border-white/20 hover:bg-white/[0.03] hover:text-white sm:w-auto">Explore Terminal</Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/[0.06] px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <Logo height={28} theme="dark" />
              </div>
              <p className="text-xs text-[#7A8BA8] leading-relaxed mb-4 max-w-sm">The AI-native operating system for modern brokerages. Indigenous technology. 20+ integrated modules. RAPTOR AI intelligence. Zero legacy dependencies.</p>
              <div className="flex gap-3">
                {['LinkedIn', 'Twitter', 'Telegram'].map((s) => (
                  <span key={s} className="text-[10px] text-[#4A5568] border border-white/[0.06] rounded px-2 py-1 hover:text-white hover:border-white/20 transition-all cursor-pointer">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#7A8BA8] mb-4">Platform</div>
              <div className="space-y-2.5 text-xs text-[#4A5568]">
                {[
                  { label: 'Trading Terminal', href: '/features/trading-terminal' },
                  { label: 'RAPTOR Charts', href: '/dashboard/raptor-charts' },
                  { label: 'NEXUS AI Copilot', href: '/dashboard/nexus' },
                  { label: 'Script IDE', href: '/dashboard/script-ide' },
                  { label: 'Copy Trading', href: 'https://zippy-piroshki-21aa30.netlify.app/copy' },
                  { label: 'Prop Challenges', href: '/dashboard/prop-challenge' },
                  { label: 'Social Trading', href: '/dashboard/social' },
                  { label: 'Marketplace', href: '/marketplace/hub' },
                  { label: 'EA Converter', href: '/converter' },
                ].map((l) => (
                  <Link key={l.label} href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined} className="block hover:text-white transition-colors">{l.label}</Link>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#7A8BA8] mb-4">For Brokers</div>
              <div className="space-y-2.5 text-xs text-[#4A5568]">
                {[
                  { label: 'White Label', href: '/features/white-label' },
                  { label: 'Risk Management', href: '/features/risk-management' },
                  { label: 'Dealing Desk', href: '/broker/dealing-desk' },
                  { label: 'Core Engine', href: '/broker/core-engine' },
                  { label: 'Integrations', href: '/broker/integrations' },
                  { label: 'Security Center', href: '/broker/security' },
                  { label: 'Partners', href: '/partners' },
                  { label: 'Contact Sales', href: '/contact?type=broker' },
                ].map((l) => (
                  <Link key={l.label} href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined} className="block hover:text-white transition-colors">{l.label}</Link>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#7A8BA8] mb-4">Resources</div>
              <div className="space-y-2.5 text-xs text-[#4A5568]">
                {[
                  { label: 'Pricing', href: '/pricing' },
                  { label: 'Developer Portal', href: '/developer' },
                  { label: 'Blog', href: '/blog' },
                  { label: 'Changelog', href: '/changelog' },
                  { label: 'System Status', href: '/status' },
                  { label: 'About Us', href: '/about' },
                ].map((l) => (
                  <Link key={l.label} href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined} className="block hover:text-white transition-colors">{l.label}</Link>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-white/[0.06] pt-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-[#4A5568]">&copy; {new Date().getFullYear()} EMIL TRADE. All rights reserved.</p>
              <div className="flex gap-6 text-xs text-[#4A5568]">
                <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                <Link href="/risk-disclosure" className="hover:text-white transition-colors">Risk Disclosure</Link>
              </div>
            </div>
            <p className="mt-4 text-[10px] text-[#4A5568]/60 leading-relaxed max-w-4xl">
              Risk Warning: There is a significant degree of risk involved in trading leveraged financial products, such as futures, CFDs, and forex. This type of trading may not be appropriate for all investors. Losses from trading in these financial products may surpass your initial investment. Past performance is not indicative of future results.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
