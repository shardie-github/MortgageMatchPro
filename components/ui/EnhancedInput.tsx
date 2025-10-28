/**
 * Enhanced Input Component
 * With micro-interactions and validation states
 */

import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const inputVariants = cva(
  'w-full px-3 py-2 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default: 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500',
        error: 'border-error-500 focus:border-error-500 focus:ring-error-500',
        success: 'border-success-500 focus:border-success-500 focus:ring-success-500',
        warning: 'border-warning-500 focus:border-warning-500 focus:ring-warning-500'
      },
      size: {
        sm: 'h-8 px-2 text-sm',
        md: 'h-10 px-3 text-sm',
        lg: 'h-12 px-4 text-base'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'md'
    }
  }
);

export interface EnhancedInputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  label?: string;
  helperText?: string;
  error?: string;
  success?: string;
  warning?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  animatedLabel?: boolean;
}

const EnhancedInput = forwardRef<HTMLInputElement, EnhancedInputProps>(
  ({
    className,
    variant,
    size,
    label,
    helperText,
    error,
    success,
    warning,
    leftIcon,
    rightIcon,
    clearable = false,
    onClear,
    animatedLabel = true,
    value,
    onChange,
    onFocus,
    onBlur,
    ...props
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(!!value);
    const inputRef = useRef<HTMLInputElement>(null);

    // Determine variant based on state
    const currentVariant = error ? 'error' : success ? 'success' : warning ? 'warning' : variant;

    // Determine if label should float
    const shouldFloatLabel = animatedLabel && (isFocused || hasValue);

    useEffect(() => {
      setHasValue(!!value);
    }, [value]);

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(event);
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(event);
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!event.target.value);
      onChange?.(event);
    };

    const handleClear = () => {
      if (inputRef.current) {
        inputRef.current.value = '';
        setHasValue(false);
        onClear?.();
        inputRef.current.focus();
      }
    };

    const getStatusIcon = () => {
      if (error) {
        return (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-error-500"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </motion.div>
        );
      }
      
      if (success) {
        return (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-success-500"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </motion.div>
        );
      }
      
      if (warning) {
        return (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-warning-500"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </motion.div>
        );
      }
      
      return null;
    };

    const getStatusMessage = () => {
      if (error) return error;
      if (success) return success;
      if (warning) return warning;
      return helperText;
    };

    return (
      <div className="relative">
        {/* Label */}
        {label && (
          <motion.label
            className={cn(
              'absolute left-3 transition-all duration-200 pointer-events-none',
              shouldFloatLabel
                ? 'top-1 text-xs text-primary-600'
                : 'top-1/2 -translate-y-1/2 text-sm text-neutral-500',
              currentVariant === 'error' && 'text-error-500',
              currentVariant === 'success' && 'text-success-500',
              currentVariant === 'warning' && 'text-warning-500'
            )}
            animate={{
              y: shouldFloatLabel ? -8 : 0,
              scale: shouldFloatLabel ? 0.85 : 1
            }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {label}
          </motion.label>
        )}

        {/* Input container */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
              {leftIcon}
            </div>
          )}

          {/* Input field */}
          <motion.input
            ref={ref || inputRef}
            className={cn(
              inputVariants({ variant: currentVariant, size, className }),
              leftIcon && 'pl-10',
              (rightIcon || clearable || getStatusIcon()) && 'pr-10',
              animatedLabel && shouldFloatLabel && 'pt-6'
            )}
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            whileFocus={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
            {...props}
          />

          {/* Right side icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
            {/* Clear button */}
            {clearable && hasValue && !props.disabled && (
              <motion.button
                type="button"
                onClick={handleClear}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            )}

            {/* Right icon */}
            {rightIcon && !getStatusIcon() && (
              <div className="text-neutral-400">
                {rightIcon}
              </div>
            )}

            {/* Status icon */}
            {getStatusIcon()}
          </div>
        </div>

        {/* Status message */}
        <AnimatePresence>
          {getStatusMessage() && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'mt-1 text-xs',
                error && 'text-error-500',
                success && 'text-success-500',
                warning && 'text-warning-500',
                !error && !success && !warning && 'text-neutral-500'
              )}
            >
              {getStatusMessage()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

EnhancedInput.displayName = 'EnhancedInput';

export { EnhancedInput, inputVariants };