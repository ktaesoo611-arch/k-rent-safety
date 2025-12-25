'use client';

import { useCallback, useEffect, useState } from 'react';
import { haptic, haptics, isHapticSupported, HapticPattern } from '@/lib/utils/haptics';

interface UseHapticOptions {
  /** Disable haptics for this hook instance */
  disabled?: boolean;
  /** Force haptic even if user prefers reduced motion */
  force?: boolean;
}

interface UseHapticReturn {
  /** Whether haptic feedback is supported */
  isSupported: boolean;
  /** Whether haptic feedback is enabled (supported and not disabled) */
  isEnabled: boolean;
  /** Trigger haptic with specified pattern */
  trigger: (pattern?: HapticPattern) => void;
  /** Convenience methods for common patterns */
  light: () => void;
  medium: () => void;
  heavy: () => void;
  success: () => void;
  error: () => void;
  warning: () => void;
  selection: () => void;
  menu: () => void;
  navigation: () => void;
  focus: () => void;
  submit: () => void;
  notification: () => void;
  tick: () => void;
  impact: () => void;
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
  const { disabled = false, force = false } = options;
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(isHapticSupported());
  }, []);

  const isEnabled = isSupported && !disabled;

  const trigger = useCallback(
    (pattern: HapticPattern = 'medium') => {
      if (!isEnabled) return;
      haptic(pattern, { force });
    },
    [isEnabled, force]
  );

  const createTrigger = useCallback(
    (pattern: HapticPattern) => () => {
      if (!isEnabled) return;
      haptic(pattern, { force });
    },
    [isEnabled, force]
  );

  return {
    isSupported,
    isEnabled,
    trigger,
    light: useCallback(() => trigger('light'), [trigger]),
    medium: useCallback(() => trigger('medium'), [trigger]),
    heavy: useCallback(() => trigger('heavy'), [trigger]),
    success: useCallback(() => trigger('success'), [trigger]),
    error: useCallback(() => trigger('error'), [trigger]),
    warning: useCallback(() => trigger('warning'), [trigger]),
    selection: useCallback(() => trigger('selection'), [trigger]),
    menu: useCallback(() => trigger('menu'), [trigger]),
    navigation: useCallback(() => trigger('navigation'), [trigger]),
    focus: useCallback(() => trigger('focus'), [trigger]),
    submit: useCallback(() => trigger('submit'), [trigger]),
    notification: useCallback(() => trigger('notification'), [trigger]),
    tick: useCallback(() => trigger('tick'), [trigger]),
    impact: useCallback(() => trigger('impact'), [trigger]),
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
