'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TerminalRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/terminal');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p className="text-xs text-secondary">Opening trading terminal...</p>
      </div>
    </div>
  );
}
