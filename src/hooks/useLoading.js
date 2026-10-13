import { useEffect, useState, useSyncExternalStore } from 'react';

/**
 * Splits a page's `loading` flag into two phases:
 * - isInitial: nothing has been shown yet → render a skeleton
 * - isRefreshing: data is being re-fetched after an action → keep the
 *   current content on screen and show the top progress bar instead
 */
export function useLoadPhase(loading) {
    const [hasLoaded, setHasLoaded] = useState(!loading);

    useEffect(() => {
        if (!loading) setHasLoaded(true);
    }, [loading]);

    const isInitial = loading && !hasLoaded;
    const isRefreshing = loading && hasLoaded;

    useTopProgress(isRefreshing);

    return { isInitial, isRefreshing };
}

// Tiny global store: number of active background tasks driving the top bar
let activeCount = 0;
const listeners = new Set();

function emit() {
    listeners.forEach((listener) => listener());
}

function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function getSnapshot() {
    return activeCount > 0;
}

/** Shows the top progress bar while `active` is true. */
export function useTopProgress(active) {
    useEffect(() => {
        if (!active) return;
        activeCount += 1;
        emit();
        return () => {
            activeCount -= 1;
            emit();
        };
    }, [active]);
}

/** Whether any component currently requests the top progress bar. */
export function useTopProgressActive() {
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
