import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';

// Hands-free auto-update flow for service workers.
//
//   1. sw.ts        : skipWaiting() + clients.claim() — new SW activates instantly.
//   2. nginx        : Cache-Control: no-cache on /sw.js — browser fetches a fresh
//                     copy on every check (no 1-year staleness).
//   3. controllerchange listener (below): when the new SW takes control,
//                     reload the page so the user sees the new JS/HTML.
//   4. periodic + visibilitychange checks (below): force the browser to look
//                     for a new sw.js even if the user keeps the tab open for
//                     hours without navigating.
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  navigator.serviceWorker.ready.then((registration) => {
    // Recheck every 30 minutes for a new sw.js. Light HEAD-ish request; if
    // unchanged, browser returns 304 and nothing happens.
    setInterval(() => registration.update(), 30 * 60 * 1000);

    // Also recheck whenever the user comes back to the tab — covers laptops
    // waking from sleep, tabs left open overnight, app switches on mobile.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        registration.update();
      }
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </StrictMode>
);
