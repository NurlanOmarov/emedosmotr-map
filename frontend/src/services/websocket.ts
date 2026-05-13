import { useNotificationStore } from '@/features/notifications/useNotificationStore';

type EventHandler = (data: any) => void;

const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 60_000;

class WebSocketService {
  private sockets: Map<string, WebSocket> = new Map();
  private reconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private listeners: Map<string, Set<EventHandler>> = new Map();

  on(event: string, handler: EventHandler): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }

  connect(path: string) {
    if (this.sockets.has(path)) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    let host = import.meta.env.VITE_WS_URL;
    if (!host) {
      const apiUrl = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.host}/api`;
      host = apiUrl.replace(/^http/, 'ws').replace(/\/api$/, '');
    }

    const baseUrl = host.endsWith('/') ? host.slice(0, -1) : host;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    // Token is NOT in URL — sent as first message after open
    const socket = new WebSocket(`${baseUrl}${cleanPath}`);

    socket.onopen = () => {
      // Auth handshake: send token as first message so it never appears in logs/history
      socket.send(JSON.stringify({ type: 'auth', token }));

      this.reconnectAttempts.set(path, 0);
      if (this.reconnectTimers.has(path)) {
        clearTimeout(this.reconnectTimers.get(path));
        this.reconnectTimers.delete(path);
      }

      const pingInterval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping' }));
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'pong') return;
        this.handleMessage(data);
      } catch (err) {
        console.error('WS Message error:', err);
      }
    };

    socket.onclose = () => {
      this.sockets.delete(path);
      this.scheduleReconnect(path);
    };

    socket.onerror = (err) => {
      console.error(`WS Error: ${path}`, err);
    };

    this.sockets.set(path, socket);
  }

  disconnect(path: string) {
    const socket = this.sockets.get(path);
    if (socket) {
      socket.close();
      this.sockets.delete(path);
    }
    if (this.reconnectTimers.has(path)) {
      clearTimeout(this.reconnectTimers.get(path));
      this.reconnectTimers.delete(path);
    }
    this.reconnectAttempts.delete(path);
  }

  private scheduleReconnect(path: string) {
    if (this.reconnectTimers.has(path)) return;

    const attempts = this.reconnectAttempts.get(path) ?? 0;
    const delay = Math.min(BACKOFF_BASE_MS * 2 ** attempts, BACKOFF_MAX_MS);
    this.reconnectAttempts.set(path, attempts + 1);

    const timer = setTimeout(() => {
      this.reconnectTimers.delete(path);
      this.connect(path);
    }, delay);

    this.reconnectTimers.set(path, timer);
  }

  private handleMessage(payload: any) {
    const { event, data } = payload;
    const { addNotification } = useNotificationStore.getState();

    this.listeners.get(event)?.forEach((handler) => {
      try { handler(data); } catch (e) { console.error('WS listener error', e); }
    });

    switch (event) {
      case 'new_notification':
        addNotification({
          id: data.id,
          title: data.title,
          message: data.message,
          type: data.type,
          timestamp: data.timestamp,
        });
        break;
      case 'location_status_changed':
        addNotification({
          title: 'Статус объекта изменен',
          message: `Объект "${data.name}" теперь имеет статус "${data.status}"`,
          type: 'warning',
        });
        break;
      default:
        break;
    }
  }

  disconnectAll() {
    this.sockets.forEach(s => s.close());
    this.reconnectTimers.forEach(t => clearTimeout(t));
    this.sockets.clear();
    this.reconnectTimers.clear();
    this.reconnectAttempts.clear();
  }
}

export const wsService = new WebSocketService();
