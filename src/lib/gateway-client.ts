// OpenClaw Gateway WebSocket Client
// Connects to the OpenClaw gateway for real-time logs and events

export type GatewayEventFrame = {
  type: 'event';
  event: string;
  payload?: unknown;
  seq?: number;
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
  raw: string;
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
  onLogs?: (logs: LogEntry[]) => void;
  onSessionUpdate?: (sessions: SessionInfo[]) => void;
  onToolCall?: (toolCall: ToolCall) => void;
};

const LOG_LEVELS = new Set(['trace', 'debug', 'info', 'warn', 'error', 'fatal']);

function parseLogLevel(level: string | undefined): 'debug' | 'info' | 'warn' | 'error' {
  if (!level) return 'info';
  const l = level.toLowerCase();
  if (LOG_LEVELS.has(l)) {
    if (l === 'trace') return 'debug';
    return l as 'debug' | 'info' | 'warn' | 'error';
  }
  return 'info';
}

function parseLogLine(line: string): LogEntry {
  if (!line.trim()) {
    return { timestamp: new Date().toISOString(), level: 'info', message: '', raw: line };
  }
  
  try {
    const parsed = JSON.parse(line);
    const meta = parsed?._meta ?? {};
    
    // Extract timestamp
    const timestamp = parsed.time ?? meta.date ?? new Date().toISOString();
    
    // Extract level
    const level = parseLogLevel(meta.logLevelName ?? meta.level);
    
    // Extract subsystem
    let subsystem: string | undefined;
    if (typeof parsed[0] === 'string') {
      try {
        const parsed0 = JSON.parse(parsed[0]);
        subsystem = parsed0.subsystem ?? parsed0.module;
      } catch {}
    }
    if (!subsystem && meta.name && meta.name.length < 120) {
      subsystem = meta.name;
    }
    
    // Extract message
    let message: string;
    if (typeof parsed[1] === 'string') {
      message = parsed[1];
    } else if (typeof parsed[0] === 'string' && !subsystem) {
      message = parsed[0];
    } else if (typeof parsed.message === 'string') {
      message = parsed.message;
    } else {
      message = line;
    }
    
    return { timestamp, level, message, subsystem, raw: line };
  } catch {
    return { timestamp: new Date().toISOString(), level: 'info', message: line, raw: line };
  }
}

export class GatewayClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, PendingRequest>();
  private closed = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private requestId = 0;
  private connectPending = false;
  private logsCursor: number | undefined;
  private logsPollInterval: ReturnType<typeof setInterval> | null = null;
  private sessionsPollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private opts: GatewayClientOptions) {}

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.closed = false;
    this.connectPending = false;
    
    try {
      this.ws = new WebSocket(this.opts.url);

      this.ws.onopen = () => {
        console.log('[DevTools] WebSocket connected, sending handshake...');
        this.reconnectDelay = 1000;
        
        const connectParams = {
          minProtocol: 3,
          maxProtocol: 3,
          client: {
            id: 'openclaw-control-ui',
            version: '1.0.0',
            platform: 'web',
            mode: 'ui'
          },
          role: 'operator',
          scopes: ['operator.admin', 'operator.approvals', 'operator.pairing'],
          ...(this.opts.token ? { auth: { token: this.opts.token } } : {})
        };
        
        this.connectPending = true;
        this.pending.set('connect-1', {
          resolve: () => {
            this.connectPending = false;
            console.log('[DevTools] Gateway handshake complete');
            this.opts.onConnect?.();
            
            // Start polling for logs and sessions
            this.startPolling();
          },
          reject: (err) => {
            this.connectPending = false;
            console.error('[DevTools] Gateway handshake failed:', err);
            this.opts.onError?.(err as Error);
          }
        });
        
        this.ws?.send(JSON.stringify({
          type: 'req',
          id: 'connect-1',
          method: 'connect',
          params: connectParams
        }));
        
        setTimeout(() => {
          if (this.connectPending) {
            this.connectPending = false;
            this.pending.delete('connect-1');
            console.error('[DevTools] Connect timeout');
            this.ws?.close();
          }
        }, 10000);
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
        this.stopPolling();
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.opts.onError?.(new Error('WebSocket error'));
      };
    } catch (error) {
      this.opts.onError?.(error as Error);
      this.scheduleReconnect();
    }
  }

  private startPolling() {
    // Initial fetch
    this.fetchLogs(true);
    this.fetchSessions();
    
    // Poll every 2 seconds
    this.logsPollInterval = setInterval(() => {
      this.fetchLogs(false);
    }, 2000);
    
    this.sessionsPollInterval = setInterval(() => {
      this.fetchSessions();
    }, 5000);
  }

  private stopPolling() {
    if (this.logsPollInterval) {
      clearInterval(this.logsPollInterval);
      this.logsPollInterval = null;
    }
    if (this.sessionsPollInterval) {
      clearInterval(this.sessionsPollInterval);
      this.sessionsPollInterval = null;
    }
  }

  private async fetchLogs(reset: boolean) {
    try {
      const params: { cursor?: number; limit: number; maxBytes?: number } = {
        limit: 100
      };
      
      if (!reset && this.logsCursor !== undefined) {
        params.cursor = this.logsCursor;
      }
      
      const result = await this.request<{ lines?: string[]; cursor?: number; reset?: boolean }>('logs.tail', params);
      
      if (result) {
        const lines = Array.isArray(result.lines) ? result.lines.filter(l => typeof l === 'string') : [];
        const logs = lines.map(parseLogLine);
        
        if (logs.length > 0) {
          this.opts.onLogs?.(logs);
          logs.forEach(log => this.opts.onLog?.(log));
        }
        
        if (typeof result.cursor === 'number') {
          this.logsCursor = result.cursor;
        }
        
        if (result.reset) {
          this.logsCursor = undefined;
        }
      }
    } catch (err) {
      console.error('[DevTools] Failed to fetch logs:', err);
    }
  }

  private async fetchSessions() {
    try {
      const result = await this.request<{ sessions?: SessionInfo[] }>('sessions.list', {
        activeMinutes: 60,
        limit: 50
      });
      
      if (result && Array.isArray(result.sessions)) {
        this.opts.onSessionUpdate?.(result.sessions);
      }
    } catch (err) {
      console.error('[DevTools] Failed to fetch sessions:', err);
    }
  }

  disconnect() {
    this.closed = true;
    this.stopPolling();
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
    // Handle any real-time events if needed
    console.log('[DevTools] Event:', event.event);
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

export function useGateway(url: string, token?: string) {
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const clientRef = useRef<GatewayClient | null>(null);

  useEffect(() => {
    const client = new GatewayClient({
      url,
      token,
      onConnect: () => setConnected(true),
      onDisconnect: () => setConnected(false),
      onError: (error) => console.error('[Gateway]', error),
      onLogs: (newLogs) => {
        setLogs(prev => [...prev.slice(-499), ...newLogs]);
      },
      onSessionUpdate: (s) => setSessions(s),
    });

    client.connect();
    clientRef.current = client;

    return () => client.disconnect();
  }, [url, token]);

  const clearLogs = useCallback(() => setLogs([]), []);

  return { connected, logs, sessions, clearLogs, client: clientRef.current };
}
