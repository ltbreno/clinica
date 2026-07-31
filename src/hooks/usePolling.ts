"use client";

import { useEffect, useRef } from "react";

export function usePolling(callback: () => void | Promise<void>, intervalMs: number) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!cancelled) {
        await callbackRef.current();
      }
    };

    run();
    const id = setInterval(run, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);
}
