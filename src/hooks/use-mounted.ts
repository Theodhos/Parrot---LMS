import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False while rendering on the server and during hydration, true afterwards.
 * Use it to hold back anything that depends on the viewer's own clock or time
 * zone ("5m ago", a local date) -- the server cannot know those, and
 * rendering its guess would not match what the browser computes.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
