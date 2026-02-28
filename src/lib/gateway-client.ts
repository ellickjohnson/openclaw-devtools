// OpenClaw Gateway WebSocket Client
// Connects to the OpenClaw gateway for real-time logs and events

export type GatewayEventFrame = {
  type: 'event';
  event: string;
  payload?: unknown;
  seq?: number;
  stateVersion?: { presence: number; health: number };
};

export type GatewayResponseFrame = {
  type: 'res';
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: { code: string; message: string; details?: unknown };
};

export type LogEntry = {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  subsystem?: string;
  sessionId?: string;
  data?: Record<string, unknown>;
};

export type SessionInfo = {
  key: string;
  kind: string;
  model?: string;
  tokens?: {
    used: number;
    total: number;
    percent: number;
  };
  createdAt?: string;
  lastActiveAt?: string;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars

export type ToolCall = {
  id: string;
  name: string;
  sessionId: string;
  timestamp: string;
  request?: unknown;
  response?: unknown;
  duration?: number;
  status: 'pending' | 'success' | 'error';
};

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (err: unknown) => void;
};

export type GatewayClientOptions = {
  url: string;
  token?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onLog?: (log: LogEntry) => void;
  onSessionUpdate?: (sessions: SessionInfo[]) => void;
  onToolCall?: (toolCall: ToolCall) => void;
};

export class GatewayClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, PendingRequest>();
  private closed = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private requestId = 0;

  constructor(private opts: GatewayClientOptions) {}

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.closed = false;
    
    try {
      this.ws = new WebSocket(this.opts.url);

      this.ws.onopen = () => {
        console.log('[DevTools] Connected to OpenClaw gateway');
        this.reconnectDelay = 1000;
        this.opts.onConnect?.();
        
        // Subscribe to logs
        this.request('logs.tail', { follow: true }).catch(console.error);
        
        // Subscribe to session updates
        this.request('sessions.subscribe').catch(console.error);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (e) {
          console.error('[DevTools] Failed to parse message:', e);
        }
      };

      this.ws.onclose = () => {
        this.opts.onDisconnect?.();
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        this.opts.onError?.(new Error('WebSocket error'));
      };
    } catch (error) {
      this.opts.onError?.(error as Error);
      this.scheduleReconnect();
    }
  }

  disconnect() {
    this.closed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  private scheduleReconnect() {
    if (this.closed) return;
    
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    
    this.reconnectTimer = setTimeout(() => {
      console.log(`[DevTools] Reconnecting in ${this.reconnectDelay}ms...`);
      this.connect();
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
    }, this.reconnectDelay);
  }

  private handleMessage(data: unknown) {
    const frame = data as { type?: string };
    
    if (frame.type === 'event') {
      const event = data as GatewayEventFrame;
      this.handleEvent(event);
    } else if (frame.type === 'res') {
      const response = data as GatewayResponseFrame;
      const pending = this.pending.get(response.id);
      if (pending) {
        this.pending.delete(response.id);
        if (response.ok) {
          pending.resolve(response.payload);
        } else {
          pending.reject(new Error(response.error?.message || 'Request failed'));
        }
      }
    }
  }

  private handleEvent(event: GatewayEventFrame) {
    switch (event.event) {
      case 'log':
        this.opts.onLog?.(event.payload as LogEntry);
        break;
      case 'sessions.update':
        this.opts.onSessionUpdate?.(event.payload as SessionInfo[]);
        break;
      case 'tool.call':
        this.opts.onToolCall?.(event.payload as ToolCall);
        break;
    }
  }

  request<T = unknown>(method: string, params?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Not connected'));
        return;
      }

      const id = `req-${++this.requestId}`;
      const frame = { type: 'req', id, method, params };
      
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.ws.send(JSON.stringify(frame));

      // Timeout after 30s
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Hook for React components
import { useEffect, useState, useCallback, useRef } from 'react';

export function useGateway(url: string) {
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const clientRef = useRef<GatewayClient | null>(null);

  useEffect(() => {
    const client = new GatewayClient({
      url,
      onConnect: () => setConnected(true),
      onDisconnect: () => setConnected(false),
      onError: (error) => console.error('[Gateway]', error),
      onLog: (log) => setLogs(prev => [...prev.slice(-499), log]),
      onSessionUpdate: (s) => setSessions(s),
    });

    client.connect();
    clientRef.current = client;

    return () => client.disconnect();
  }, [url]);

  const clearLogs = useCallback(() => setLogs([]), []);

  return { connected, logs, sessions, clearLogs, client: clientRef.current };
}
