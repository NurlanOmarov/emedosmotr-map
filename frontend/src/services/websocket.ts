import { useNotificationStore } from '@/features/notifications/useNotificationStore';

type EventHandler = (data: any) => void;

class WebSocketService {
  private sockets: Map<string, WebSocket> = new Map();
  private reconnectIntervals: Map<string, any> = new Map();
  private listeners: Map<string, Set<EventHandler>> = new Map();

  // Subscribe to a specific event across any WS connection
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

    const url = `${baseUrl}${cleanPath}?token=${token}`;
    const socket = new WebSocket(url);

    socket.onopen = () => {
      console.log(`Connected to WS: ${path}`);
      if (this.reconnectIntervals.has(path)) {
        clearInterval(this.reconnectIntervals.get(path));
        this.reconnectIntervals.delete(path);
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
      console.log(`Disconnected from WS: ${path}`);
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
    if (this.reconnectIntervals.has(path)) {
      clearInterval(this.reconnectIntervals.get(path));
      this.reconnectIntervals.delete(path);
    }
  }

  private scheduleReconnect(path: string) {
    if (this.reconnectIntervals.has(path)) return;

    const interval = setInterval(() => {
      console.log(`Attempting to reconnect to WS: ${path}`);
      this.connect(path);
    }, 5000);

    this.reconnectIntervals.set(path, interval);
  }

  private handleMessage(payload: any) {
    const { event, data } = payload;
    const { addNotification } = useNotificationStore.getState();

    // Dispatch to registered listeners
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
    this.reconnectIntervals.forEach(i => clearInterval(i));
    this.sockets.clear();
    this.reconnectIntervals.clear();
  }
}

export const wsService = new WebSocketService();
