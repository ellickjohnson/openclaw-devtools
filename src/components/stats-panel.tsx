import React from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Cpu, 
  Zap, 
  Clock,
  TrendingUp,
  Activity
} from 'lucide-react'
import { formatBytes, formatDuration } from '@/lib/utils'

interface StatsPanelProps {
  sessions: Array<{
    key: string
    model?: string
    tokens?: {
      used: number
      total: number
      percent: number
    }
  }>
}

export function StatsPanel({ sessions }: StatsPanelProps) {
  const totalTokens = sessions.reduce((sum, s) => sum + (s.tokens?.used || 0), 0)
  // const maxTokens = sessions.reduce((sum, s) => sum + (s.tokens?.total || 0), 0)
  const avgPercent = sessions.length > 0 
    ? sessions.reduce((sum, s) => sum + (s.tokens?.percent || 0), 0) / sessions.length 
    : 0

  const modelCounts = sessions.reduce((acc, s) => {
    if (s.model) {
      acc[s.model] = (acc[s.model] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="flex flex-col h-full border-l border-border bg-muted/10">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Stats
        </h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Token Usage */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Token Usage
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Cpu className="h-4 w-4 text-primary" />
                  <span className="text-lg font-bold">{formatBytes(totalTokens)}</span>
                </div>
                <div className="text-xs text-muted-foreground">Total Used</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-cyan-400" />
                  <span className="text-lg font-bold">{avgPercent.toFixed(0)}%</span>
                </div>
                <div className="text-xs text-muted-foreground">Avg Context</div>
              </div>
            </div>
          </div>

          {/* Models */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Active Models
            </div>
            <div className="space-y-1">
              {Object.entries(modelCounts).map(([model, count]) => (
                <div key={model} className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <span className="text-sm">{model}</span>
                  <Badge variant="secondary" className="text-xs">{count}</Badge>
                </div>
              ))}
              {Object.keys(modelCounts).length === 0 && (
                <div className="text-sm text-muted-foreground">No active models</div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Quick Actions
            </div>
            <div className="space-y-1">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Zap className="h-4 w-4 mr-2" />
                Refresh Sessions
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Clock className="h-4 w-4 mr-2" />
                Clear Logs
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
