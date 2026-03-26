// Tests for the useHistory hook.
//
// From ARCHITECTURE.md:
//   useHistory maintains two rolling 60-entry arrays for CPU and memory history.
//   The hook exposes snapshot arrays updated on each metrics-update event.
//   FIFO: oldest value dropped when length exceeds the window size.
//
// Acceptance criteria covered:
//   AC-HIST-1: buffer holds exactly 60 values max
//   AC-HIST-2: FIFO — oldest values are dropped on overflow
//   AC-HIST-5: works with fewer than 60 points

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useHistory } from '../../hooks/useHistory'

describe('useHistory', () => {
  it('initialises with an empty array', () => {
    // AC-HIST-5: before any values are pushed, the history is empty.
    const { result } = renderHook(() => useHistory(60))
    expect(result.current.history).toEqual([])
  })

  it('adds values to the history array', () => {
    const { result } = renderHook(() => useHistory(60))
    act(() => {
      result.current.push(42.0)
    })
    expect(result.current.history).toHaveLength(1)
    expect(result.current.history[0]).toBe(42.0)
  })

  it('length stays at the window size after overflow (rolling window)', () => {
    // AC-HIST-1: after 60 pushes the length is exactly 60.
    const { result } = renderHook(() => useHistory(60))
    act(() => {
      for (let i = 0; i < 60; i++) {
        result.current.push(i)
      }
    })
    expect(result.current.history).toHaveLength(60)

    // One more push should still keep the length at 60.
    act(() => {
      result.current.push(99)
    })
    expect(result.current.history).toHaveLength(60)
  })

  it('maintains FIFO order — oldest value is dropped first', () => {
    // AC-HIST-2: the window is FIFO; the newest value is at the end.
    const { result } = renderHook(() => useHistory(3))

    act(() => {
      result.current.push(1)
      result.current.push(2)
      result.current.push(3)
    })
    expect(result.current.history).toEqual([1, 2, 3])

    // Push a fourth value; the first (1) should be evicted.
    act(() => {
      result.current.push(4)
    })
    expect(result.current.history).toEqual([2, 3, 4])
  })

  it('newest value is always at the end of the array', () => {
    // AC-HIST-2: left = oldest, right = newest (matches sparkline convention).
    const { result } = renderHook(() => useHistory(60))
    act(() => {
      result.current.push(10)
      result.current.push(20)
      result.current.push(30)
    })
    const history = result.current.history
    expect(history[history.length - 1]).toBe(30)
  })

  it('works correctly with floating-point values', () => {
    // CPU and memory values are floats; no precision loss expected.
    const { result } = renderHook(() => useHistory(60))
    const values = [47.3, 52.1, 63.7, 38.9]
    act(() => {
      for (const v of values) result.current.push(v)
    })
    expect(result.current.history).toEqual(values)
  })

  it('respects a custom window size smaller than 60', () => {
    // The hook accepts any window size; verify with a window of 5.
    const { result } = renderHook(() => useHistory(5))
    act(() => {
      for (let i = 1; i <= 10; i++) result.current.push(i)
    })
    expect(result.current.history).toHaveLength(5)
    expect(result.current.history).toEqual([6, 7, 8, 9, 10])
  })

  it('handles exactly window-size pushes without overflow', () => {
    // Edge case: exactly 60 pushes should fill the buffer without any eviction.
    const { result } = renderHook(() => useHistory(60))
    const values = Array.from({ length: 60 }, (_, i) => i * 1.5)
    act(() => {
      for (const v of values) result.current.push(v)
    })
    expect(result.current.history).toHaveLength(60)
    expect(result.current.history[0]).toBe(0)
    expect(result.current.history[59]).toBe(59 * 1.5)
  })
})
