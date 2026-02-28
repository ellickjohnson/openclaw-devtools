import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Flame, 
  ScrollText, 
  Users, 
  BarChart3, 
  Settings,
  Moon,
  Sun,
  RefreshCw,
  Terminal
} from 'lucide-react'
import { LogViewer } from '@/components/log-viewer'
import { SessionPanel } from '@/components/session-panel'
import { StatsPanel } from '@/components/stats-panel'
import { useGateway } from '@/lib/gateway-client'

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'ws://localhost:18789'

function App() {
  const [showSessions, setShowSessions] = useState(true)
  const [showStats, setShowStats] = useState(true)
  const { connected, logs, sessions, clearLogs } = useGateway(GATEWAY_URL)

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <Flame className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-bold">OpenClaw DevTools</h1>
          <Badge variant={connected ? 'success' : 'destructive'} className="text-xs">
            {connected ? '● Connected' : '○ Disconnected'}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {logs.length} logs
          </Badge>
          <Badge variant="outline" className="text-xs">
            {sessions.length} sessions
          </Badge>
          
          <div className="w-px h-6 bg-border mx-2" />
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowSessions(!showSessions)}
            className={showSessions ? 'text-primary' : ''}
          >
            <Users className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowStats(!showStats)}
            className={showStats ? 'text-primary' : ''}
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-border mx-2" />
          
          <Button variant="ghost" size="icon">
            <Terminal className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main panel */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <Tabs defaultValue="logs" className="flex-1 flex flex-col">
            <div className="px-4 pt-2 border-b border-border">
              <TabsList>
                <TabsTrigger value="logs" className="gap-2">
                  <ScrollText className="h-4 w-4" />
                  Logs
                </TabsTrigger>
                <TabsTrigger value="timeline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="tools" className="gap-2">
                  <Terminal className="h-4 w-4" />
                  Tools
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="logs" className="flex-1 mt-0">
              <LogViewer logs={logs} onClear={clearLogs} />
            </TabsContent>

            <TabsContent value="timeline" className="flex-1 mt-0 overflow-auto p-4">
              <div className="text-center text-muted-foreground py-8">
                <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Timeline View</h3>
                <p className="text-sm">Visual flow of prompts → thinking → tools → responses</p>
                <p className="text-xs mt-2 text-muted-foreground">Coming in Phase 2</p>
              </div>
            </TabsContent>

            <TabsContent value="tools" className="flex-1 mt-0 overflow-auto p-4">
              <div className="text-center text-muted-foreground py-8">
                <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Tool Inspector</h3>
                <p className="text-sm">View tool calls with request/response payloads</p>
                <p className="text-xs mt-2 text-muted-foreground">Coming in Phase 2</p>
              </div>
            </TabsContent>
          </Tabs>
        </main>

        {/* Side panels */}
        {showSessions && (
          <div className="w-72">
            <SessionPanel sessions={sessions} connected={connected} />
          </div>
        )}
        {showStats && (
          <div className="w-64">
            <StatsPanel sessions={sessions} />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="px-4 py-1.5 border-t border-border bg-muted/30 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>Gateway: {GATEWAY_URL}</span>
            <span>Phase 1 MVP</span>
          </div>
          <div className="flex items-center gap-4">
            <span>OpenClaw DevTools v0.1.0</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
