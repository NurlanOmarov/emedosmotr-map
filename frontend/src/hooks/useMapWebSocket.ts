import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000];
const PING_INTERVAL_MS = 25000;

export function useMapWebSocket() {
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (pingTimerRef.current) clearInterval(pingTimerRef.current);
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    pingTimerRef.current = null;
    reconnectTimerRef.current = null;
  }, []);

  const connect = useCallback(() => {
    if (unmountedRef.current) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    const base = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
    const wsBase = base.replace(/^http/, 'ws') || `ws://${window.location.host}`;
    const url = `${wsBase}/ws/map?token=${token}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      attemptRef.current = 0;

      pingTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, PING_INTERVAL_MS);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'pong') return;

        if (msg.event === 'location_status_changed') {
          const { id, region_id } = msg.data as { id: string; status: string; region_id: number; settlement_id: number | null };
          qc.invalidateQueries({ queryKey: ['map-features'] });
          qc.invalidateQueries({ queryKey: ['location', id] });
          if (region_id) {
            qc.invalidateQueries({ queryKey: ['analytics', region_id] });
          }
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = (e) => {
      clearTimers();
      wsRef.current = null;
      if (unmountedRef.current) return;
      // 4001 = invalid token — don't reconnect
      if (e.code === 4001) return;

      const delay = RECONNECT_DELAYS[Math.min(attemptRef.current, RECONNECT_DELAYS.length - 1)];
      attemptRef.current += 1;
      reconnectTimerRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [qc, clearTimers]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();
    return () => {
      unmountedRef.current = true;
      clearTimers();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, clearTimers]);
}
