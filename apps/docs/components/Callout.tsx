import { AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react';

interface CalloutProps {
  type?: 'info' | 'warning' | 'error' | 'success';
  children: React.ReactNode;
}

export function Callout({ type = 'info', children }: CalloutProps) {
  const icons = {
    info: <Info className="h-5 w-5" />,
    warning: <AlertTriangle className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    success: <CheckCircle className="h-5 w-5" />
  };

  const styles = {
    info: 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/30',
    warning: 'border-yellow-500 dark:border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30',
    error: 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-950/30',
    success: 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-950/30'
  };

  return (
    <div className={`not-prose my-6 rounded-lg border-l-4 p-4 ${styles[type]}`}>
      <div className="flex gap-3">
        <div className="mt-0.5">{icons[type]}</div>
        <div className="flex-1 text-sm">{children}</div>
      </div>
    </div>
  );
}
