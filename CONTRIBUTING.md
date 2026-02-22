# Contributing to OpenClaw Dashboard

This document covers the architecture, conventions, and development workflow for the OpenClaw Dashboard (codename **Clawkins Homebase**), a real-time monitoring UI for the OpenClaw AI agent framework.

---

## Getting Started

### Prerequisites

- **Node.js** >= 20 (the project targets ES2017 and uses Next.js 16)
- **npm** (ships with Node.js)
- An OpenClaw Gateway instance reachable over WebSocket (default: `ws://localhost:18789`)

### Install and Run

```bash
git clone <repo-url>
cd openclaw-dashboard
npm install
```

The gateway URL and auth token are configured inside `src/stores/connection-store.ts` and can be changed at runtime from the **Settings** page. There is no `.env` file required to start the project.

### Development Commands

| Command          | Description                              |
| ---------------- | ---------------------------------------- |
| `npm run dev`    | Start the Next.js dev server             |
| `npm run build`  | Production build                         |
| `npm run start`  | Serve the production build               |
| `npm run lint`   | Run ESLint                               |

---

## Architecture Overview

### Tech Stack

| Layer            | Technology                                                     |
| ---------------- | -------------------------------------------------------------- |
| Framework        | Next.js 16 (App Router)                                        |
| UI library       | React 19                                                       |
| Styling          | Tailwind CSS v4 + tw-animate-css                               |
| Component system | shadcn/ui (New York style, Zinc base color, CSS variables)     |
| State management | Zustand 5                                                      |
| Server cache     | TanStack Query 5 (30 s stale time, no refetch on window focus) |
| Flow canvas      | @xyflow/react 12                                               |
| Charts           | Recharts 3                                                     |
| Icons            | lucide-react                                                   |
| Theming          | next-themes                                                    |
| Date utilities   | date-fns 4                                                     |
| Markdown         | react-markdown + remark-gfm                                    |

### Directory Layout

```
src/
  app/
    layout.tsx               # Root layout: fonts, <Providers>, <SwRegister>
    page.tsx                 # Redirects "/" to "/dashboard"
    (dashboard)/
      layout.tsx             # Dashboard shell: <Sidebar> + <ChatPanel> + <Header> + <main>
      dashboard/page.tsx
      flow/page.tsx
      monitor/page.tsx
      agents/page.tsx
      agents/[agentId]/page.tsx
      sessions/page.tsx
      sessions/[sessionId]/page.tsx
      code-monitor/page.tsx
      memory/page.tsx
      cron/page.tsx
      alerts/page.tsx
      settings/page.tsx
    api/                     # API route handlers (chat, code-monitor, config, markdown-files)
  components/
    ui/                      # shadcn/ui primitives (button, card, dialog, table, tabs, etc.)
    layout/                  # Sidebar, Header, ChatPanel, ThemeToggle, ConnectionStatus
    shared/                  # StatusDot and other reusable components
    dashboard/               # HealthCards, StatsCards, TokenChart, ActivityFeed, CostBreakdown
    flow/                    # FlowCanvas and custom React Flow nodes
    monitor/                 # LogStream, SessionCards, QueueViz
    agents/                  # AgentCard, RunningAgentCard, AgentDetail, AgentCreateDialog
    sessions/                # SessionTable, SessionDetail
    code-monitor/            # MachineGrid, ActivityFeed, CommandPanel, SessionOverview, SetupGuide, LocalProjects
    memory/                  # MemoryViewer
    cron/                    # CronJobTable, CronJobDialog, CronHistoryLog
    alerts/                  # AlertRulesTable, AlertRuleDialog, AlertHistoryLog, AlertNotificationIndicator
    settings/                # SettingsForm
    pwa/                     # SwRegister (service worker registration)
  hooks/                     # Custom React hooks (use-gateway, use-sessions, use-agents, etc.)
  lib/
    gateway/                 # WebSocket client + protocol helpers
    code-monitor/            # Code monitor utilities
    utils.ts                 # cn() helper (clsx + tailwind-merge)
    cost-utils.ts            # Token cost calculation and aggregation
    cron-utils.ts            # Cron expression utilities
    build-chat-context.ts    # Builds context payload for the chat panel
  providers/                 # ThemeProvider, QueryProvider, GatewayProvider
  stores/                    # Zustand stores
  types/                     # TypeScript type definitions (gateway, session, agent, alert, cron, events, code-monitor)
```

### Provider Hierarchy

The root layout wraps all pages in a provider chain defined in `src/providers/index.tsx`:

```
ThemeProvider          (next-themes: light/dark/system)
  QueryProvider        (TanStack Query client)
    GatewayProvider    (WebSocket client lifecycle + event dispatch)
      TooltipProvider  (Radix tooltip context)
```

The `GatewayProvider` auto-connects on mount, subscribes to status changes and gateway events, and dispatches those events into the appropriate Zustand stores.

### Dashboard Layout Shell

The dashboard layout (`src/app/(dashboard)/layout.tsx`) renders:

```
+--[ Sidebar ]--+---------[ ChatPanel (conditional) ]---------+
|               |                                              |
|  Navigation   |  +---[ Header ]----------------------------+ |
|  links        |  | Page title | ConnectionStatus | Theme   | |
|               |  +------------------------------------------+ |
|               |  |                                          | |
|               |  |   <main> (page content)                  | |
|               |  |                                          | |
+---------------+--+------------------------------------------+
```

- **Sidebar**: Collapsible on desktop, slide-in drawer on mobile. Defined in `src/components/layout/sidebar.tsx`.
- **Header**: Shows the current page title, gateway connection indicator, alert notification badge, and theme toggle.
- **ChatPanel**: Toggled from the sidebar; provides an inline chat interface.

---

## WebSocket Gateway Protocol

The dashboard communicates with the OpenClaw Gateway over WebSocket using **Protocol v3**.

### Connection Lifecycle

```
1. Client opens WebSocket to the configured URL (default ws://localhost:18789)
2. On `onopen`, client sends a "connect" request frame with auth token, scopes, and client metadata
3. Gateway responds with a "res" frame:
   - ok: true  -> status becomes "connected"; client starts ping interval (15 s)
   - ok: false -> status becomes "error"; client disconnects
4. The connect response payload contains a snapshot (health, presence, uptime, sessions) and server info
5. Subsequent events arrive as "event" frames; requests use "req"/"res" pairs
```

### Frame Types

All frames are JSON objects with a `type` discriminator:

| Type    | Direction         | Fields                                                    |
| ------- | ----------------- | --------------------------------------------------------- |
| `req`   | Client -> Gateway | `id`, `method`, `params?`                                 |
| `res`   | Gateway -> Client | `id`, `ok`, `payload?`, `error?`                          |
| `event` | Gateway -> Client | `event` (event name), `payload?`, `seq?`                  |

Frame IDs are generated with the format `ui_{counter}_{timestamp}`.

### Event Types

The gateway emits events including:

- `session.started`, `session.ended`, `session.error`
- `agent.thinking`, `agent.responding`, `agent.tool_call`, `agent.tool_result`, `agent.phase_change`, `agent.error`
- `tool.started`, `tool.completed`, `tool.error`
- `queue.enqueued`, `queue.dequeued`, `queue.completed`
- `memory.read`, `memory.write`
- `system.health`, `system.error`
- `health`, `presence`

### Reconnection Strategy

- When the WebSocket closes unexpectedly, the client transitions to `reconnecting` and schedules a retry after the configured interval (default 3000 ms).
- Retries continue up to `maxReconnectAttempts` (default 10).
- After exhausting retries, the status becomes `error`.
- Setting `status` to `disconnected` (via explicit disconnect) prevents reconnection attempts.

### Authentication

The connect frame includes an `auth.token` field and requests `operator.read` + `operator.write` scopes with the `operator` role. The token is stored in the connection store and editable from the Settings page.

### Implementation Files

- `src/lib/gateway/websocket-client.ts` -- `GatewayClient` singleton class
- `src/lib/gateway/protocol.ts` -- Frame constructors and parsers
- `src/types/gateway.ts` -- TypeScript types for frames, events, connection status
- `src/providers/gateway-provider.tsx` -- React provider that bridges the client to Zustand stores

---

## State Management

All client state is managed with **Zustand** stores in `src/stores/`. Each store is a standalone module exporting a `use*Store` hook.

### Store Inventory

| Store                   | File                      | Persisted | Purpose                                                      |
| ----------------------- | ------------------------- | --------- | ------------------------------------------------------------ |
| `useConnectionStore`    | `connection-store.ts`     | No        | WebSocket status, config (URL, token), last connected time   |
| `useEventsStore`        | `events-store.ts`         | No        | Log entries ring buffer (max 10,000), severity/type filters  |
| `useSessionsStore`      | `sessions-store.ts`       | No        | Active and completed sessions (Map), queue items             |
| `useAgentsStore`        | `agents-store.ts`         | No        | Registered agents (Map), selected agent ID                   |
| `useFlowStore`          | `flow-store.ts`           | No        | React Flow nodes and edges, selected node                    |
| `useSettingsStore`      | `settings-store.ts`       | Yes       | Theme, log buffer size, auto-reconnect, sidebar state, chat  |
| `useAlertsStore`        | `alerts-store.ts`         | Yes       | Alert rules and alert event history (max 500)                |
| `useCostStore`          | `cost-store.ts`           | No        | Daily cost/token aggregations by agent and model             |
| `useChatStore`          | `chat-store.ts`           | No        | Chat messages, streaming state                               |
| `useGatewayDataStore`   | `gateway-data-store.ts`   | No        | Parsed gateway snapshot: health, server info, presence       |
| `useCronStore`          | `cron-store.ts`           | No        | Cron jobs (Map) and run history (max 200)                    |
| `useCodeMonitorStore`   | `code-monitor-store.ts`   | No        | Machines, code events (max 1,000), commands, sessions        |

### Persistence

Stores that use `zustand/middleware/persist` save to `localStorage` under a namespaced key:

- `openclaw-settings` -- `useSettingsStore` (partializes to exclude transient UI state like `mobileMenuOpen`)
- `openclaw-alerts` -- `useAlertsStore` (persists rules and alert history)

### Ring Buffer Pattern

The `useEventsStore` uses a ring buffer to cap memory usage. When `entries.length >= MAX_ENTRIES` (10,000), the oldest entries are sliced off before appending new ones. The same capping pattern appears in:

- `useAlertsStore` -- alerts capped at 500
- `useCostStore` -- cost history capped at 100
- `useCronStore` -- run history capped at 200
- `useCodeMonitorStore` -- events capped at 1,000

### Map-Based Stores

`useSessionsStore`, `useAgentsStore`, and `useCronStore` use `Map<string, T>` for O(1) lookups by ID. Each provides a `get*()` helper that converts the Map to an array for rendering. When updating, a new Map is created (immutable pattern required by Zustand).

---

## Routes and Pages

All dashboard routes live under `src/app/(dashboard)/` and share the sidebar + header shell.

| Route                       | Page Component      | Description                                                        |
| --------------------------- | ------------------- | ------------------------------------------------------------------ |
| `/`                         | `Home`              | Redirects to `/dashboard`                                          |
| `/dashboard`                | `DashboardPage`     | Health cards, stats cards, token usage chart, activity feed, cost breakdown |
| `/flow`                     | `FlowPage`          | Interactive React Flow canvas visualizing the agent pipeline       |
| `/monitor`                  | `MonitorPage`       | Live throughput sparkline, log stream, active session cards, queue visualization |
| `/agents`                   | `AgentsPage`        | Running agents, available models grid, agent cards with filtering  |
| `/agents/[agentId]`         | `AgentDetailPage`   | Single agent detail view                                           |
| `/sessions`                 | `SessionsPage`      | Searchable session table                                           |
| `/sessions/[sessionId]`     | `SessionDetailPage` | Single session detail with trace/timeline view                     |
| `/code-monitor`             | `CodeMonitorPage`   | Machine grid, activity feed, command panel, session overview for monitored code projects |
| `/memory`                   | `MemoryPage`        | Memory browser: view agent memory, daily logs, search past context |
| `/cron`                     | `CronPage`          | Cron job scheduler: create, edit, view jobs and run history        |
| `/alerts`                   | `AlertsPage`        | Alert rule management, alert history with acknowledge/clear        |
| `/settings`                 | `SettingsPage`      | Gateway connection config, theme, notification preferences         |

Dynamic routes use the Next.js 16 pattern where `params` is a `Promise`:

```tsx
interface PageProps {
  params: Promise<{ agentId: string }>;
}

export default function Page({ params }: PageProps) {
  const { agentId } = use(params);
  // ...
}
```

---

## Component Patterns

### `'use client'` Directive

Almost all components are client components (they use hooks, browser APIs, or event handlers). Server components are limited to simple page shells that delegate to client components (e.g., `FlowPage`, `SessionsPage`, `MemoryPage`, `SettingsPage`).

### shadcn/ui

The project uses shadcn/ui with the **New York** style variant and **Zinc** base color. Components live in `src/components/ui/` and include: Avatar, Badge, Button, Calendar, Card, Command, Dialog, DropdownMenu, Input, Label, Popover, ScrollArea, Select, Separator, Sheet, Switch, Table, Tabs, Tooltip.

To add a new shadcn component:

```bash
npx shadcn@latest add <component-name>
```

### StatusDot

`src/components/shared/status-dot.tsx` is a reusable status indicator that maps a `StatusVariant` string to a colored dot. It supports 19 status variants grouped into four visual categories:

- **Green** (emerald): `healthy`, `connected`, `active`, `completed`
- **Blue/Violet**: `thinking`, `responding`, `processing` (blue), `tool_calling` (violet)
- **Amber**: `degraded`, `warning`, `reconnecting`, `connecting`, `timeout`
- **Red**: `down`, `error`, `failed`
- **Grey** (slate): `idle`, `disconnected`, `offline`, `pending`

Active statuses (`active`, `thinking`, `responding`, `tool_calling`, `connecting`, `reconnecting`, `processing`) show a pulsing ping animation. Three sizes are available: `sm`, `md` (default), `lg`.

### PWA Support

The app includes basic PWA support via `src/components/pwa/sw-register.tsx` and a web manifest at `/manifest.json`. The root layout sets Apple Web App metadata.

---

## API Routes

The project includes several API route handlers under `src/app/api/`:

| Route                              | Purpose                            |
| ---------------------------------- | ---------------------------------- |
| `/api/chat`                        | Chat completion endpoint           |
| `/api/config`                      | Gateway configuration              |
| `/api/markdown-files`              | Serve markdown files for the Memory page |
| `/api/code-monitor/register`       | Machine registration               |
| `/api/code-monitor/heartbeat`      | Machine heartbeat                  |
| `/api/code-monitor/events`         | Code monitor event ingestion       |
| `/api/code-monitor/commands`       | Remote command execution           |
| `/api/code-monitor/machines`       | List registered machines           |
| `/api/code-monitor/watcher`        | File watcher status                |

---

## Testing

The project does not currently include a test framework or test files. When adding tests, the recommended setup would be:

1. Install Vitest: `npm install -D vitest @testing-library/react @testing-library/jest-dom`
2. Create a `vitest.config.ts` at the project root
3. Place test files alongside source files with a `.test.ts` or `.test.tsx` suffix
4. Add a `"test"` script to `package.json`: `"test": "vitest"`

---

## Key Design Decisions

### Zustand over Redux / Context

Zustand was chosen for its minimal boilerplate and ability to create isolated, independently subscribable stores. Each domain (sessions, agents, events, settings, etc.) has its own store, avoiding the single-tree bottleneck of Redux. Zustand's `persist` middleware provides opt-in localStorage persistence with `partialize` to exclude transient state.

### Ring Buffers for Memory Management

High-throughput event streams (gateway events, alert history, code monitor events) are capped with a maximum size. When the cap is reached, the oldest entries are dropped. This prevents unbounded memory growth during long-running dashboard sessions without requiring manual cleanup.

### Singleton WebSocket Client

`GatewayClient` uses a singleton pattern (`getInstance()` / `resetInstance()`) to ensure only one WebSocket connection exists regardless of React re-renders or provider remounts. The `GatewayProvider` bridges this singleton into React's lifecycle.

### Map-Based Entity Stores

Sessions, agents, and cron jobs are stored in `Map<string, T>` rather than arrays. This provides O(1) lookups by ID (common in event handlers that update a specific entity) while still supporting array conversion for list rendering via `getAgents()`, `getSessions()`, and `getJobs()` helpers.

### Graceful Degradation When Gateway Is Offline

When the WebSocket connection is not established, the UI renders empty states with informational messages rather than crashing. Health data, agent lists, and session tables simply show "no data" prompts. The connection status is always visible in the header via the `ConnectionStatus` component.

### Next.js 16 Async Params

Dynamic route pages accept `params` as a `Promise` and unwrap it with React 19's `use()` hook, following the Next.js 16 convention.
