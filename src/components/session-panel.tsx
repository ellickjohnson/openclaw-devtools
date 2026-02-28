import React from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { 
  Activity,
  Cpu,
  Clock,
  MessageSquare
} from 'lucide-react'
import { formatBytes, formatTimestamp } from '@/lib/utils'
import type { SessionInfo } from '@/lib/gateway-client'

interface SessionPanelProps {
  sessions: SessionInfo[]
  connected: boolean
}

export function SessionPanel({ sessions, connected }: SessionPanelProps) {
  return (
    <div className="flex flex-col h-full border-l border-border bg-muted/10">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Sessions</h3>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs text-muted-foreground">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Session list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {sessions.length === 0 ? (
            <div className="text-center text-muted-foreground py-4 text-sm">
              No active sessions
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.key}
                className="p-3 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium truncate max-w-[150px]">
                      {session.key.split(':').pop()}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {session.kind}
                  </Badge>
                </div>

                {session.model && (
                  <div className="text-xs text-muted-foreground mb-2">
                    {session.model}
                  </div>
                )}

                {session.tokens && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Cpu className="h-3 w-3" />
                        Tokens
                      </span>
                      <span>
                        {formatBytes(session.tokens.used)} / {formatBytes(session.tokens.total)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${Math.min(session.tokens.percent, 100)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-muted-foreground text-right">
                      {session.tokens.percent.toFixed(1)}%
                    </div>
                  </div>
                )}

                {session.lastActiveAt && (
                  <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Last active: {formatTimestamp(session.lastActiveAt)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Stats footer */}
      <div className="p-3 border-t border-border bg-muted/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            <span>Live</span>
          </div>
        </div>
      </div>
    </div>
  )
}
