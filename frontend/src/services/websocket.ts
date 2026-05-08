import { useNotificationStore } from '@/features/notifications/useNotificationStore';

class WebSocketService {
  private sockets: Map<string, WebSocket> = new Map();
  private reconnectIntervals: Map<string, any> = new Map();

  connect(path: string) {
    if (this.sockets.has(path)) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    let host = import.meta.env.VITE_WS_URL;
    
    if (!host) {
      const apiUrl = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.host}/api`;
      host = apiUrl.replace(/^http/, 'ws').replace(/\/api$/, '');
    }
    
    // Ensure path doesn't result in double slashes or missing slashes
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
      
      // Send ping every 30s to keep connection alive
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
      case 'task_created':
        // These can stay as fallback or for specific real-time UI updates
        // but new_notification is now the primary persistent channel
        break;
      case 'task_updated':
        break;
      case 'location_status_changed':
        addNotification({
          title: 'Статус объекта изменен',
          message: `Объект "${data.name}" теперь имеет статус "${data.status}"`,
          type: 'warning',
        });
        break;
      default:
        console.log('Unhandled WS event:', event, data);
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
