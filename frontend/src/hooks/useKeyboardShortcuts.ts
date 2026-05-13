import { useEffect } from 'react';

/**
 * Hook to handle Escape key press.
 * @param onEscape Callback to run when Escape is pressed.
 * @param active Whether the listener is active.
 */
export function useEscapeKey(onEscape: () => void, active: boolean = true) {
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscape();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, active]);
}

/**
 * Hook to handle Enter key press (e.g. for forms not using <form> tag).
 * @param onEnter Callback to run when Enter is pressed.
 * @param active Whether the listener is active.
 */
export function useEnterKey(onEnter: () => void, active: boolean = true) {
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        // Prevent default only if needed, but here we just trigger the callback
        onEnter();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEnter, active]);
}
