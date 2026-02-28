import React, { useState, useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Trash2, 
  Filter,
  User,
  Bot,
  Wrench,
  AlertTriangle,
  Info,
  Bug,
  XCircle
} from 'lucide-react'
import { cn, formatTimestamp, truncate } from '@/lib/utils'
import type { LogEntry } from '@/lib/gateway-client'

type LogFilter = 'all' | 'user' | 'thinking' | 'tool' | 'response' | 'error'

const LOG_LEVEL_ICONS = {
  debug: Bug,
  info: Info,
  warn: AlertTriangle,
  error: XCircle,
}

const LOG_LEVEL_COLORS = {
  debug: 'text-muted-foreground',
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
}

interface LogViewerProps {
  logs: LogEntry[]
  onClear: () => void
}

export function LogViewer({ logs, onClear }: LogViewerProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<LogFilter>('all')
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set())

  const detectLogType = (log: LogEntry): LogFilter => {
    const msg = log.message.toLowerCase()
    if (msg.includes('user prompt') || msg.includes('user message')) return 'user'
    if (msg.includes('thinking') || msg.includes('reasoning')) return 'thinking'
    if (msg.includes('tool call') || msg.includes('tool:')) return 'tool'
    if (msg.includes('response') || msg.includes('assistant')) return 'response'
    if (log.level === 'error') return 'error'
    return 'all'
  }

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const type = detectLogType(log)
      if (filter !== 'all' && type !== filter) return false
      if (search) {
        const searchLower = search.toLowerCase()
        return (
          log.message.toLowerCase().includes(searchLower) ||
          log.subsystem?.toLowerCase().includes(searchLower) ||
          JSON.stringify(log.data).toLowerCase().includes(searchLower)
        )
      }
      return true
    })
  }, [logs, filter, search])

  const toggleExpand = (index: number) => {
    setExpandedLogs(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const getLogBlockClass = (log: LogEntry): string => {
    const type = detectLogType(log)
    switch (type) {
      case 'user': return 'user-prompt-block'
      case 'thinking': return 'thinking-block'
      case 'tool': return 'tool-call-block'
      case 'response': return 'response-block'
      default: return ''
    }
  }

  const getLogIcon = (log: LogEntry) => {
    const type = detectLogType(log)
    switch (type) {
      case 'user': return User
      case 'thinking': return Bot
      case 'tool': return Wrench
      case 'response': return Bot
      default: return LOG_LEVEL_ICONS[log.level]
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b border-border bg-muted/30">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-background"
          />
        </div>
        
        <div className="flex items-center gap-1">
          {(['all', 'user', 'thinking', 'tool', 'response', 'error'] as LogFilter[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter(f)}
              className="h-8 px-2 text-xs capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
        
        <Button variant="ghost" size="icon" onClick={onClear} className="h-9 w-9">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Log list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredLogs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {logs.length === 0 ? 'Waiting for logs...' : 'No logs match your filter'}
            </div>
          ) : (
            filteredLogs.map((log, index) => {
              const Icon = getLogIcon(log)
              const isExpanded = expandedLogs.has(index)
              const hasData = log.data && Object.keys(log.data).length > 0
              
              return (
                <div
                  key={index}
                  className={cn(
                    'log-line rounded hover:bg-muted/50 transition-colors',
                    getLogBlockClass(log)
                  )}
                >
                  <div className="flex items-start gap-2 py-1">
                    <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', LOG_LEVEL_COLORS[log.level])} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="log-timestamp text-xs">
                          {formatTimestamp(log.timestamp)}
                        </span>
                        {log.subsystem && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {truncate(log.subsystem, 20)}
                          </Badge>
                        )}
                        {log.sessionId && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">
                            {truncate(log.sessionId, 12)}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="mt-1 text-sm whitespace-pre-wrap break-words">
                        {hasData ? (
                          <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(index)}>
                            <CollapsibleTrigger className="flex items-center gap-1 cursor-pointer w-full text-left">
                              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              <span>{truncate(log.message, 200)}</span>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                                {JSON.stringify(log.data, null, 2)}
                              </pre>
                            </CollapsibleContent>
                          </Collapsible>
                        ) : (
                          <span>{log.message}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
        <span>{filteredLogs.length} of {logs.length} logs</span>
        <span>Auto-scroll: ON</span>
      </div>
    </div>
  )
}
