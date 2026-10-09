'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
const subscribe = () => () => {};
const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const serverZone = () => 'UTC';
export function useCouponClock(initialNow: number) {
  const [now, setNow] = useState(initialNow);
  const timeZone = useSyncExternalStore(subscribe, zone, serverZone);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return { now, timeZone };
}

