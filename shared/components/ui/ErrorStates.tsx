/**
 * Enhanced Error States
 * Elegant error components with recovery options
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

// Error boundary component
export const ErrorBoundary = ({ 
  children,
  fallback,
  onError 
}: { 
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}) => {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const error = new Error(event.message);
      setError(error);
      onError?.(error, { componentStack: event.filename || '' });
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [onError]);

  if (error) {
    if (fallback) {
      const FallbackComponent = fallback;
      return (
        <FallbackComponent 
          error={error} 
          reset={() => setError(null)} 
        />
      );
    }
    return <DefaultErrorFallback error={error} reset={() => setError(null)} />;
  }

  return <>{children}</>;
};

// Default error fallback
const DefaultErrorFallback = ({ 
  error, 
  reset 
}: { 
  error: Error; 
  reset: () => void;
}) => {
  return (
    <ErrorState
      title="Something went wrong"
      message={error.message}
      onRetry={reset}
      variant="error"
    />
  );
};

// Error state component
export const ErrorState = ({ 
  title,
  message,
  onRetry,
  variant = 'error',
  className,
  icon,
  actions
}: {
  title: string;
  message: string;
  onRetry?: () => void;
  variant?: 'error' | 'warning' | 'info';
  className?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'error':
        return {
          container: 'bg-error-50 border-error-200',
          icon: 'text-error-600',
          title: 'text-error-900',
          message: 'text-error-700'
        };
      case 'warning':
        return {
          container: 'bg-warning-50 border-warning-200',
          icon: 'text-warning-600',
          title: 'text-warning-900',
          message: 'text-warning-700'
        };
      case 'info':
        return {
          container: 'bg-primary-50 border-primary-200',
          icon: 'text-primary-600',
          title: 'text-primary-900',
          message: 'text-primary-700'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <motion.div
      className={cn(
        'rounded-lg border p-6 text-center',
        styles.container,
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mx-auto max-w-md">
        {icon || (
          <motion.div
            className={cn('mx-auto mb-4 w-12 h-12', styles.icon)}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {variant === 'error' && (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              )}
              {variant === 'warning' && (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              )}
              {variant === 'info' && (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
          </motion.div>
        )}
        
        <h3 className={cn('text-lg font-semibold mb-2', styles.title)}>
          {title}
        </h3>
        
        <p className={cn('text-sm mb-4', styles.message)}>
          {message}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          {actions || (
            <>
              {onRetry && (
                <motion.button
                  onClick={onRetry}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Try Again
                </motion.button>
              )}
              <motion.button
                onClick={() => window.location.reload()}
                className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Refresh Page
              </motion.button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Empty state component
export const EmptyState = ({ 
  title,
  message,
  action,
  icon,
  className 
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) => {
  return (
    <motion.div
      className={cn('text-center py-12', className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mx-auto max-w-md">
        {icon || (
          <motion.div
            className="mx-auto mb-4 w-16 h-16 text-neutral-400"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </motion.div>
        )}
        
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">
          {title}
        </h3>
        
        <p className="text-sm text-neutral-600 mb-6">
          {message}
        </p>
        
        {action && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {action}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// Network error component
export const NetworkError = ({ 
  onRetry,
  className 
}: { 
  onRetry?: () => void;
  className?: string;
}) => {
  return (
    <ErrorState
      title="Connection Error"
      message="Unable to connect to the server. Please check your internet connection and try again."
      onRetry={onRetry}
      variant="error"
      className={className}
      icon={
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      }
    />
  );
};

// Not found component
export const NotFound = ({ 
  title = "Page Not Found",
  message = "The page you're looking for doesn't exist.",
  onGoHome,
  className 
}: {
  title?: string;
  message?: string;
  onGoHome?: () => void;
  className?: string;
}) => {
  return (
    <ErrorState
      title={title}
      message={message}
      onRetry={onGoHome}
      variant="info"
      className={className}
      icon={
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      }
      actions={
        <motion.button
          onClick={onGoHome || (() => window.location.href = '/')}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Go Home
        </motion.button>
      }
    />
  );
};

// Permission denied component
export const PermissionDenied = ({ 
  message = "You don't have permission to access this resource.",
  onRequestAccess,
  className 
}: {
  message?: string;
  onRequestAccess?: () => void;
  className?: string;
}) => {
  return (
    <ErrorState
      title="Access Denied"
      message={message}
      variant="warning"
      className={className}
      icon={
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      }
      actions={
        onRequestAccess && (
          <motion.button
            onClick={onRequestAccess}
            className="px-4 py-2 bg-warning-600 text-white rounded-lg hover:bg-warning-700 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Request Access
          </motion.button>
        )
      }
    />
  );
};