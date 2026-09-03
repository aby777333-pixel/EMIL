import { Metadata } from 'next';
import BlogClient from './BlogClient';

export const metadata: Metadata = {
  title: 'Blog | EMIL Trade',
  description: 'Insights on trading technology, brokerage operations, and the future of fintech from the EMIL Trade team.',
};

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: 'product' | 'trading' | 'brokers' | 'technology';
  date: string;
  readTime: string;
  author: string;
  image?: string;
}

const posts: BlogPost[] = [
  {
    slug: 'raptor-v2-complete-brokerage-os',
    title: 'Raptor v2.0 -- The Complete Brokerage OS Is Here',
    excerpt: 'After 18 months of development and feedback from 40+ beta brokers, we are launching Raptor v2.0 with 18 integrated modules covering every aspect of modern brokerage operations. From the trading engine to compliance, CRM to copy trading, this is the platform we wished existed when we started GIO4X.',
    category: 'product',
    date: '2026-03-28',
    readTime: '8 min read',
    author: 'GIO4X Team',
  },
  {
    slug: 'prop-trading-challenge-system',
    title: "How Prop Trading Firms Are Using Raptor's Challenge System",
    excerpt: 'The prop trading industry has exploded, but most firms still rely on patchwork solutions for challenge management, evaluation, and funded account operations. We built a native challenge engine that handles everything from signup to payout, and firms are seeing 40% faster onboarding as a result.',
    category: 'trading',
    date: '2026-03-20',
    readTime: '6 min read',
    author: 'GIO4X Team',
  },
  {
    slug: 'white-label-48-hours',
    title: 'White Label in 48 Hours: How GIO4X Does It',
    excerpt: 'Traditional white-label brokerage setup takes 3 to 6 months. We have compressed that to 48 hours with pre-configured infrastructure templates, automated regulatory document generation, and instant LP bridge connections. Here is exactly how the process works from first call to live platform.',
    category: 'brokers',
    date: '2026-03-12',
    readTime: '10 min read',
    author: 'GIO4X Team',
  },
];

const categoryConfig: Record<string, { label: string; color: string }> = {
  product: { label: 'Product', color: 'var(--accent)' },
  trading: { label: 'Trading', color: 'var(--accent-green)' },
  brokers: { label: 'Brokers', color: 'var(--gold)' },
  technology: { label: 'Technology', color: 'var(--teal)' },
};

export default function BlogPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            EMIL Trade
          </a>
          <nav className="flex items-center gap-6">
            <a href="/features" className="text-sm" style={{ color: 'var(--text-secondary)' }}>Features</a>
            <a href="/pricing" className="text-sm" style={{ color: 'var(--text-secondary)' }}>Pricing</a>
            <a href="/blog" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>Blog</a>
            <a href="/auth/login" className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: 'var(--accent)' }}>
              Sign In
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        {/* Hero */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Raptor Insights
          </h1>
          <p className="mt-3 text-lg" style={{ color: 'var(--text-secondary)' }}>
            Product updates, trading technology, and brokerage industry analysis.
          </p>
        </div>

        {/* Category Filter + Grid */}
        <BlogClient posts={posts} categoryConfig={categoryConfig} />

        {/* Newsletter */}
        <section
          className="mt-20 rounded-2xl p-10 text-center"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Stay in the Loop
          </h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Get product updates, trading insights, and industry analysis delivered to your inbox.
          </p>
          <form className="mt-6 flex items-center justify-center gap-3">
            <input
              type="email"
              placeholder="you@company.com"
              className="w-72 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              type="submit"
              className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              Subscribe
            </button>
          </form>
          <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            No spam. Unsubscribe anytime.
          </p>
        </section>
      </main>
    </div>
  );
}
