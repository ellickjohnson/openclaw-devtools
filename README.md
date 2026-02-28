# OpenClaw DevTools

A modern DevOps-style UI for watching OpenClaw logs, sessions, and tool calls.

## Features (Phase 1 MVP)

- **Live Logs** - Real-time log stream with filtering, search, expand/collapse
- **Session Viewer** - Active sessions with model, tokens, context size
- **Timeline View** - Visual flow: prompt → thinking → tools → response (coming soon)
- **Tool Inspector** - Tool calls with request/response payloads (coming soon)
- **Dark Mode** - Dark theme by default

## Quick Start

### Option 1: Add to existing Docker Compose stack

Add this to your `docker-compose.yml`:

```yaml
  openclaw-devtools:
    build:
      context: ./devtools
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    depends_on:
      - openclaw-gateway
    restart: unless-stopped
```

Then run:
```bash
docker-compose up -d openclaw-devtools
```

### Option 2: Run locally (development)

```bash
cd devtools
npm install
npm run dev
```

Access at: http://localhost:3000

## Configuration

The DevTools connects to the OpenClaw gateway via WebSocket. By default, it connects to `ws://localhost:18789`.

To change the, set the environment variable:
```bash
VITE_GATEWAY_URL=ws://your-gateway:18789
```

## Future Plans (Phase 2+)

- Timeline view with visual flow of messages
- Tool call inspector with request/response details
- Metrics dashboard with token usage graphs
- Export logs as JSON/CSV
- Session replay functionality
- Custom filter presets
- Webhook inspector
- Alert rules for errors/latency/cost thresholds

## Tech Stack

- React 18 + TypeScript
- Vite 5
- Tailwind CSS
- shadcn/ui components
- Radix UI primitives
- Lucide icons
- TanStack Query for data fetching
- TanStack Virtual for virtualized lists


## Auto-trigger

Build triggered at 2026-02-28T10:23:58.068Z
