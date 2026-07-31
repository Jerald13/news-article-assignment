import { useEffect, useState } from 'react';

/**
 * A value that only settles once it has stopped changing for `delayMs`.
 *
 * Used for search. Typing "noodles" fires seven renders; without a debounce it
 * would fire seven requests, six of them already obsolete before they return.
 * The keystrokes still update the input immediately — only the *consequence* of
 * typing is delayed, so the field never feels laggy.
 *
 * The cleanup clears the pending timer on every change, which is what makes the
 * delay a debounce rather than a throttle: the timer restarts on each keystroke
 * instead of firing on a fixed cadence.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debounced;
}
