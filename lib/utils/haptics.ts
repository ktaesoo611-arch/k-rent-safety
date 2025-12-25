/**
 * Haptic Feedback System
 *
 * Provides various vibration patterns for different interactions.
 * Uses the Web Vibration API (supported on Android Chrome, iOS Safari 16.4+)
 */

/**
 * Check if haptic feedback is supported
 */
export const isHapticSupported = (): boolean => {
  return typeof window !== 'undefined' && 'vibrate' in navigator;
};

/**
 * Haptic feedback patterns (in milliseconds)
 *
 * Pattern format: [vibrate, pause, vibrate, pause, ...]
 * Single number = single vibration of that duration
 */
export const HapticPatterns: Record<string, number | number[]> = {
  // Light feedback - subtle, quick tap
  light: 10,

  // Medium feedback - standard button press
  medium: 25,

  // Heavy feedback - emphasis, important action
  heavy: 50,

  // Success - celebratory double tap
  success: [20, 50, 20],

  // Error - strong warning pattern
  error: [50, 30, 50, 30, 50],

  // Warning - attention-getting pattern
  warning: [30, 50, 30],

  // Selection - very subtle for toggles/selections
  selection: 5,

  // Impact - single strong tap
  impact: 40,

  // Notification - gentle attention pattern
  notification: [15, 100, 15],

  // Menu open/close - soft feedback
  menu: 15,

  // Navigation - page transition
  navigation: 12,

  // Input focus
  focus: 8,

  // Form submit
  submit: [20, 30, 40],

  // Refresh/pull-to-refresh
  refresh: [10, 20, 10, 20, 10],

  // Long press recognition
  longPress: [5, 50, 30],

  // Slider/scrub feedback
  tick: 3,
};

export type HapticPattern = keyof typeof HapticPatterns;

/**
 * Trigger haptic feedback
 *
 * @param pattern - The pattern name or custom pattern array
 * @param options - Additional options
 */
export const haptic = (
  pattern: HapticPattern | number | number[] = 'medium',
  options?: {
    /** Force haptic even if user prefers reduced motion */
    force?: boolean;
  }
): boolean => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') return false;

  // Check if vibration is supported
  if (!isHapticSupported()) return false;

  // Respect user's reduced motion preference (unless forced)
  if (!options?.force) {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return false;
  }

  // Get the vibration pattern
  let vibrationPattern: number | number[];

  if (typeof pattern === 'string') {
    vibrationPattern = HapticPatterns[pattern];
  } else {
    vibrationPattern = pattern;
  }

  try {
    return navigator.vibrate(vibrationPattern);
  } catch (e) {
    console.warn('Haptic feedback failed:', e);
    return false;
  }
};

/**
 * Stop any ongoing vibration
 */
export const stopHaptic = (): boolean => {
  if (!isHapticSupported()) return false;

  try {
    return navigator.vibrate(0);
  } catch (e) {
    return false;
  }
};

/**
 * Convenience functions for common haptic patterns
 */
export const haptics = {
  /** Light tap - toggles, minor selections */
  light: () => haptic('light'),

  /** Medium tap - button presses */
  medium: () => haptic('medium'),

  /** Heavy tap - important actions */
  heavy: () => haptic('heavy'),

  /** Success pattern - form submission success, completion */
  success: () => haptic('success'),

  /** Error pattern - validation errors, failures */
  error: () => haptic('error'),

  /** Warning pattern - caution, attention needed */
  warning: () => haptic('warning'),

  /** Selection - checkbox, radio, toggle */
  selection: () => haptic('selection'),

  /** Impact - drag end, snap to position */
  impact: () => haptic('impact'),

  /** Notification - new message, alert */
  notification: () => haptic('notification'),

  /** Menu - open/close navigation */
  menu: () => haptic('menu'),

  /** Navigation - page change */
  navigation: () => haptic('navigation'),

  /** Focus - input field focus */
  focus: () => haptic('focus'),

  /** Submit - form submission */
  submit: () => haptic('submit'),

  /** Tick - slider movement, scrubbing */
  tick: () => haptic('tick'),

  /** Stop any vibration */
  stop: stopHaptic,

  /** Check if supported */
  isSupported: isHapticSupported,
};

export default haptics;
