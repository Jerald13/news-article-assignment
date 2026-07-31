import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial value immediately, with nothing to wait for', () => {
    const { result } = renderHook(() => useDebouncedValue('noodles', 300));

    expect(result.current).toBe('noodles');
  });

  it('holds the previous value until the delay has elapsed', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'n' },
    });

    rerender({ value: 'ni' });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('n');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('ni');
  });

  it('restarts the timer on each change, so only the final value settles', () => {
    // This is what makes it a debounce rather than a throttle. Typing
    // "nickel" one character at a time must produce one value, not six.
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: '' },
    });

    for (const term of ['n', 'ni', 'nic', 'nick', 'nicke', 'nickel']) {
      rerender({ value: term });
      act(() => {
        vi.advanceTimersByTime(100);
      });
    }

    // 600ms of typing, but never a 300ms gap, so nothing has settled yet.
    expect(result.current).toBe('');

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('nickel');
  });

  it('cancels a pending update when the hook unmounts', () => {
    // Without the cleanup this would set state on an unmounted component.
    const { rerender, unmount } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'b' });
    unmount();

    expect(() => {
      act(() => {
        vi.advanceTimersByTime(500);
      });
    }).not.toThrow();
  });
});
