'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { haptic, haptics, isHapticSupported, triggerVisualFeedback, HapticPattern } from '@/lib/utils/haptics';

interface UseHapticOptions {
  /** Disable haptics for this hook instance */
  disabled?: boolean;
  /** Force haptic even if user prefers reduced motion */
  force?: boolean;
  /** Enable visual feedback fallback for unsupported devices (default: true) */
  visualFallback?: boolean;
}

interface UseHapticReturn {
  /** Whether haptic feedback is supported */
  isSupported: boolean;
  /** Whether haptic feedback is enabled (supported and not disabled) */
  isEnabled: boolean;
  /** Trigger haptic with specified pattern, optionally pass element for visual fallback */
  trigger: (pattern?: HapticPattern, element?: HTMLElement | null) => void;
  /** Convenience methods for common patterns */
  light: (element?: HTMLElement | null) => void;
  medium: (element?: HTMLElement | null) => void;
  heavy: (element?: HTMLElement | null) => void;
  success: (element?: HTMLElement | null) => void;
  error: (element?: HTMLElement | null) => void;
  warning: (element?: HTMLElement | null) => void;
  selection: (element?: HTMLElement | null) => void;
  menu: (element?: HTMLElement | null) => void;
  navigation: (element?: HTMLElement | null) => void;
  focus: (element?: HTMLElement | null) => void;
  submit: (element?: HTMLElement | null) => void;
  notification: (element?: HTMLElement | null) => void;
  tick: (element?: HTMLElement | null) => void;
  impact: (element?: HTMLElement | null) => void;
  /** Stop any ongoing vibration */
  stop: () => void;
}

/**
 * React hook for haptic feedback
 *
 * @example
 * ```tsx
 * const { trigger, success, error } = useHaptic();
 *
 * // On button click
 * <button onClick={() => { trigger('medium'); doSomething(); }}>
 *   Click me
 * </button>
 *
 * // On form success
 * const handleSubmit = async () => {
 *   try {
 *     await submitForm();
 *     success();
 *   } catch (e) {
 *     error();
 *   }
 * };
 * ```
 */
export function useHaptic(options: UseHapticOptions = {}): UseHapticReturn {
  const { disabled = false, force = false, visualFallback = true } = options;
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(isHapticSupported());
  }, []);

  const isEnabled = isSupported && !disabled;

  // Map haptic patterns to visual intensity
  const getVisualIntensity = (pattern: HapticPattern): 'light' | 'medium' | 'heavy' => {
    if (['light', 'selection', 'tick', 'focus'].includes(pattern)) return 'light';
    if (['heavy', 'error', 'impact', 'warning'].includes(pattern)) return 'heavy';
    return 'medium';
  };

  const trigger = useCallback(
    (pattern: HapticPattern = 'medium', element?: HTMLElement | null) => {
      if (disabled) return;

      if (isSupported) {
        haptic(pattern, { force });
      } else if (visualFallback) {
        // Use visual feedback on unsupported devices (iOS)
        triggerVisualFeedback(element, getVisualIntensity(pattern));
      }
    },
    [isSupported, disabled, force, visualFallback]
  );

  // Helper to create pattern-specific triggers
  const createPatternTrigger = useCallback(
    (pattern: HapticPattern) => (element?: HTMLElement | null) => {
      trigger(pattern, element);
    },
    [trigger]
  );

  return {
    isSupported,
    isEnabled,
    trigger,
    light: useCallback((el?: HTMLElement | null) => trigger('light', el), [trigger]),
    medium: useCallback((el?: HTMLElement | null) => trigger('medium', el), [trigger]),
    heavy: useCallback((el?: HTMLElement | null) => trigger('heavy', el), [trigger]),
    success: useCallback((el?: HTMLElement | null) => trigger('success', el), [trigger]),
    error: useCallback((el?: HTMLElement | null) => trigger('error', el), [trigger]),
    warning: useCallback((el?: HTMLElement | null) => trigger('warning', el), [trigger]),
    selection: useCallback((el?: HTMLElement | null) => trigger('selection', el), [trigger]),
    menu: useCallback((el?: HTMLElement | null) => trigger('menu', el), [trigger]),
    navigation: useCallback((el?: HTMLElement | null) => trigger('navigation', el), [trigger]),
    focus: useCallback((el?: HTMLElement | null) => trigger('focus', el), [trigger]),
    submit: useCallback((el?: HTMLElement | null) => trigger('submit', el), [trigger]),
    notification: useCallback((el?: HTMLElement | null) => trigger('notification', el), [trigger]),
    tick: useCallback((el?: HTMLElement | null) => trigger('tick', el), [trigger]),
    impact: useCallback((el?: HTMLElement | null) => trigger('impact', el), [trigger]),
    stop: haptics.stop,
  };
}

/**
 * Higher-order function to wrap event handlers with haptic feedback
 *
 * @example
 * ```tsx
 * <button onClick={withHaptic(() => doSomething(), 'medium')}>
 *   Click me
 * </button>
 * ```
 */
export function withHaptic<T extends (...args: any[]) => any>(
  handler: T,
  pattern: HapticPattern = 'medium'
): T {
  return ((...args: Parameters<T>) => {
    haptic(pattern);
    return handler(...args);
  }) as T;
}

/**
 * Create an onClick handler with haptic feedback
 *
 * @example
 * ```tsx
 * <button onClick={hapticClick(() => doSomething())}>
 *   Click me
 * </button>
 * ```
 */
export function hapticClick(
  handler?: () => void,
  pattern: HapticPattern = 'medium'
): () => void {
  return () => {
    haptic(pattern);
    handler?.();
  };
}

export default useHaptic;
