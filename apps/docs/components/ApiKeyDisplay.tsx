'use client';

import { useState } from 'react';

interface ApiKeyDisplayProps {
  apiKey: string;
  label?: string;
}

export function ApiKeyDisplay({ apiKey, label = 'Staging Key' }: ApiKeyDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="not-prose my-6 rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-4">
        <code className="flex-1 overflow-x-auto rounded bg-muted px-3 py-2 text-sm font-mono">
          {apiKey}
        </code>
        <button
          onClick={handleCopy}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="mt-3">
        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}
