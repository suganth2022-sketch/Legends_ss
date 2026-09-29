import React from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onRetry: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry }) => (
  <div className="card p-6 flex items-center justify-between gap-4 border-state-crimson/30 bg-state-crimson-soft">
    <div className="flex items-center gap-3 text-state-crimson">
      <AlertCircle className="w-5 h-5 shrink-0" />
      <span className="text-sm font-semibold">{message}</span>
    </div>
    <button
      onClick={onRetry}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-state-crimson/30 text-state-crimson text-xs font-bold shrink-0"
    >
      <RotateCw className="w-3.5 h-3.5" />
      Retry
    </button>
  </div>
);
