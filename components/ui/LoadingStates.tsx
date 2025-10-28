/**
 * Enhanced Loading States
 * Elegant loading components with micro-interactions
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

// Skeleton loader component
export const SkeletonLoader = ({ 
  className, 
  width = '100%', 
  height = '1rem',
  rounded = 'md'
}: {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}) => {
  return (
    <motion.div
      className={cn(
        'bg-neutral-200 animate-pulse',
        {
          'rounded-none': rounded === 'none',
          'rounded-sm': rounded === 'sm',
          'rounded-md': rounded === 'md',
          'rounded-lg': rounded === 'lg',
          'rounded-full': rounded === 'full'
        },
        className
      )}
      style={{ width, height }}
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
    />
  );
};

// Card skeleton
export const CardSkeleton = ({ className }: { className?: string }) => {
  return (
    <div className={cn('p-6 border border-neutral-200 rounded-lg', className)}>
      <div className="space-y-4">
        <SkeletonLoader height="1.5rem" width="60%" />
        <SkeletonLoader height="1rem" width="100%" />
        <SkeletonLoader height="1rem" width="80%" />
        <div className="flex space-x-2">
          <SkeletonLoader height="2rem" width="4rem" rounded="lg" />
          <SkeletonLoader height="2rem" width="4rem" rounded="lg" />
        </div>
      </div>
    </div>
  );
};

// Table skeleton
export const TableSkeleton = ({ 
  rows = 5, 
  columns = 4,
  className 
}: { 
  rows?: number; 
  columns?: number;
  className?: string;
}) => {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonLoader key={i} height="1rem" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonLoader key={colIndex} height="1rem" />
          ))}
        </div>
      ))}
    </div>
  );
};

// Spinner component
export const Spinner = ({ 
  size = 'md',
  className 
}: { 
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  return (
    <motion.div
      className={cn('text-primary-600', sizeClasses[size], className)}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'linear'
      }}
    >
      <svg className="w-full h-full" fill="none" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </motion.div>
  );
};

// Pulse loader
export const PulseLoader = ({ 
  dots = 3,
  className 
}: { 
  dots?: number;
  className?: string;
}) => {
  return (
    <div className={cn('flex space-x-1', className)}>
      {Array.from({ length: dots }).map((_, i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-primary-600 rounded-full"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.2,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  );
};

// Progress bar
export const ProgressBar = ({ 
  progress = 0,
  className 
}: { 
  progress: number;
  className?: string;
}) => {
  return (
    <div className={cn('w-full bg-neutral-200 rounded-full h-2', className)}>
      <motion.div
        className="bg-primary-600 h-2 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  );
};

// Loading overlay
export const LoadingOverlay = ({ 
  isLoading,
  children,
  message = 'Loading...',
  className 
}: { 
  isLoading: boolean;
  children: React.ReactNode;
  message?: string;
  className?: string;
}) => {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <motion.div
          className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="text-center">
            <Spinner size="lg" className="mx-auto mb-4" />
            <p className="text-sm text-neutral-600">{message}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// Shimmer effect
export const ShimmerEffect = ({ 
  children,
  className 
}: { 
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {children}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={{
          x: ['-100%', '100%']
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />
    </div>
  );
};

// Loading states for different content types
export const ContentLoader = ({ 
  type = 'card',
  count = 1,
  className 
}: { 
  type?: 'card' | 'table' | 'list' | 'form';
  count?: number;
  className?: string;
}) => {
  const renderLoader = () => {
    switch (type) {
      case 'card':
        return Array.from({ length: count }).map((_, i) => (
          <CardSkeleton key={i} className={className} />
        ));
      case 'table':
        return <TableSkeleton className={className} />;
      case 'list':
        return Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-3">
            <SkeletonLoader width="2.5rem" height="2.5rem" rounded="full" />
            <div className="flex-1 space-y-2">
              <SkeletonLoader height="1rem" width="60%" />
              <SkeletonLoader height="0.75rem" width="40%" />
            </div>
          </div>
        ));
      case 'form':
        return (
          <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="space-y-2">
                <SkeletonLoader height="1rem" width="25%" />
                <SkeletonLoader height="2.5rem" width="100%" rounded="lg" />
              </div>
            ))}
          </div>
        );
      default:
        return <SkeletonLoader className={className} />;
    }
  };

  return <>{renderLoader()}</>;
};