import { useState, useCallback, useRef } from "react";

/**
 * useHistory — a rolling fixed-size window of values.
 *
 * Returns { history, push }:
 *   - history: the current array of values (oldest at index 0, newest at end)
 *   - push: append a new value; oldest is evicted when the window is full
 *
 * Uses useState so React re-renders whenever the history changes.
 */
export function useHistory(windowSize: number = 60) {
  const [history, setHistory] = useState<number[]>([]);
  // Keep a stable ref so push() never needs to be recreated
  const historyRef = useRef<number[]>([]);

  const push = useCallback(
    (value: number) => {
      const next =
        historyRef.current.length >= windowSize
          ? [...historyRef.current.slice(1), value]
          : [...historyRef.current, value];
      historyRef.current = next;
      setHistory(next);
    },
    [windowSize]
  );

  return { history, push };
}
