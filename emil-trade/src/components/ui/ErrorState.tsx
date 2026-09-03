'use client';

import { AlertTriangle, RefreshCw, WifiOff, ServerCrash, ShieldAlert, FileX } from 'lucide-react';

type ErrorVariant = 'general' | 'network' | 'server' | 'permission' | 'not_found';

const ERROR_CONFIG: Record<ErrorVariant, { icon: React.ReactNode; title: string; defaultMessage: string; color: string }> = {
  general: {
    icon: <AlertTriangle className="h-10 w-10" />,
    title: 'Something went wrong',
    defaultMessage: 'An unexpected error occurred. Please try again.',
    color: '#f59e0b',
  },
  network: {
    icon: <WifiOff className="h-10 w-10" />,
    title: 'Connection lost',
    defaultMessage: 'Unable to reach the server. Check your internet connection.',
    color: '#ef4444',
  },
  server: {
    icon: <ServerCrash className="h-10 w-10" />,
    title: 'Server error',
    defaultMessage: 'Our servers are having trouble. We\'re working on it.',
    color: '#ef4444',
  },
  permission: {
    icon: <ShieldAlert className="h-10 w-10" />,
    title: 'Access denied',
    defaultMessage: 'You don\'t have permission to view this resource.',
    color: '#8b5cf6',
  },
  not_found: {
    icon: <FileX className="h-10 w-10" />,
    title: 'Not found',
    defaultMessage: 'The resource you\'re looking for doesn\'t exist.',
    color: '#6b7280',
  },
};

interface ErrorStateProps {
  variant?: ErrorVariant;
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  variant = 'general',
  title,
  message,
  onRetry,
  retryLabel = 'Try again',
  className = '',
}: ErrorStateProps) {
  const config = ERROR_CONFIG[variant];

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-8 text-center ${className}`}>
      <div className="mb-4" style={{ color: config.color, opacity: 0.4 }}>
        {config.icon}
      </div>
      <h3 className="text-sm font-semibold text-white/70 mb-1">
        {title ?? config.title}
      </h3>
      <p className="text-xs text-white/30 max-w-sm mb-5">
        {message ?? config.defaultMessage}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-xs font-medium border border-white/10 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {retryLabel}
        </button>
      )}
    </div>
  );
}
