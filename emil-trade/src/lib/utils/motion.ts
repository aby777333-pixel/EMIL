// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Motion Utilities
// Always respect prefers-reduced-motion
// ═══════════════════════════════════════════════════════════

import type { Variants, Transition } from 'framer-motion';

/**
 * Check if user prefers reduced motion (SSR-safe)
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Motion-safe transition — returns instant transition if reduced motion preferred
 */
export function safeTransition(transition: Transition): Transition {
  if (prefersReducedMotion()) {
    return { duration: 0 };
  }
  return transition;
}

/**
 * Standard fade-in animation (respects reduced motion)
 */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

/**
 * Slide up fade animation
 */
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

/**
 * Staggered children animation
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

/**
 * Staggered child item
 */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Scale on hover (for interactive cards)
 */
export const hoverScale = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: { type: 'spring', stiffness: 300 } as Transition,
};
