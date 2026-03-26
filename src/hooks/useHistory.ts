import { useRef, useCallback } from "react";

const MAX_HISTORY = 60;

export function useHistory<T>(initial?: T): [(value: T) => void, T[]] {
  const historyRef = useRef<T[]>(initial !== undefined ? [initial] : []);

  const push = useCallback((value: T) => {
    historyRef.current = [
      ...historyRef.current.slice(-(MAX_HISTORY - 1)),
      value,
    ];
  }, []);

  return [push, historyRef.current];
}
