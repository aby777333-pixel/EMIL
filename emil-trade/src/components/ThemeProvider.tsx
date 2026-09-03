'use client';

import { useEffect } from 'react';
import { useTradingStore } from '@/stores/trading';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useTradingStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return <>{children}</>;
}
