// ═══════════════════════════════════════════════════════════
// EMIL TRADE — SEO Metadata & Structured Data Helpers
// ═══════════════════════════════════════════════════════════

import type { Metadata } from 'next';

const SITE_NAME = 'EMIL TRADE';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gioraptor.com';
const DEFAULT_DESCRIPTION = 'EMIL TRADE — Institutional-grade, AI-native brokerage platform. Complete Broker-in-a-Box solution for forex, CFD, crypto, and prop trading.';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

interface PageMeta {
  title: string;
  description?: string;
  path?: string;
  ogImage?: string;
  noIndex?: boolean;
  keywords?: string[];
}

/**
 * Generate standardized Next.js metadata for any page
 */
export function generatePageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '',
  ogImage = DEFAULT_OG_IMAGE,
  noIndex = false,
  keywords = [],
}: PageMeta): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const url = `${SITE_URL}${path}`;

  return {
    title: fullTitle,
    description,
    keywords: ['trading platform', 'forex broker', 'prop trading', 'copy trading', 'MT5', 'AI trading', ...keywords],
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage],
    },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
    alternates: { canonical: url },
  };
}

/**
 * Generate JSON-LD structured data for organization
 */
export function organizationJsonLd(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.svg`,
    description: DEFAULT_DESCRIPTION,
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['English'],
    },
  });
}

/**
 * Generate JSON-LD for a software application
 */
export function softwareAppJsonLd(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web, iOS, Android',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: DEFAULT_DESCRIPTION,
  });
}

/**
 * Generate JSON-LD for a product/marketplace listing
 */
export function productJsonLd(product: {
  name: string;
  description: string;
  price: number | null;
  rating: number;
  reviewCount: number;
  category: string;
}): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    category: product.category,
    ...(product.price !== null ? {
      offers: {
        '@type': 'Offer',
        price: product.price,
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
    } : {}),
    ...(product.reviewCount > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.reviewCount,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
  });
}

/**
 * Generate JSON-LD for FAQ page
 */
export function faqJsonLd(faqs: { question: string; answer: string }[]): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  });
}
