# OpenClaw Dashboard — Functionality Guide

A comprehensive reference for every feature in the OpenClaw Dashboard (Clawkins Homebase), the monitoring and control interface for OpenClaw AI agent framework deployments.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Dashboard](#dashboard-dashboard)
4. [Agent Flow](#agent-flow-flow)
5. [Live Monitor](#live-monitor-monitor)
6. [Agents](#agents-agents)
7. [Sessions](#sessions-sessions)
8. [Code Monitor](#code-monitor-code-monitor)
9. [Memory Browser](#memory-browser-memory)
10. [Cron Jobs](#cron-jobs-cron)
11. [Alerts](#alerts-alerts)
12. [Settings](#settings-settings)
13. [Chat Assistant](#chat-assistant)
14. [Security & Authentication](#security--authentication)
15. [API Routes](#api-routes)

---

## Overview

The OpenClaw Dashboard is a Next.js application that provides real-time visibility and control over OpenClaw AI agent deployments. It connects to an OpenClaw Gateway via WebSocket, displays live metrics, and lets you manage agents, sessions, alerts, scheduled jobs, and more — all from a single browser tab.

**Tech stack**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Zustand, TanStack Query, React Flow, Recharts, Sonner (toasts).

**Default gateway**: `ws://localhost:18789` (configurable, supports multiple gateways).

---

## Architecture

### Layout

The app uses a standard dashboard shell:

- **Sidebar** (left) — Navigation to all 10 pages, collapsible on desktop, slide-out drawer on mobile. Includes a button to open the Chat panel.
- **Header** (top) — Page title, gateway selector dropdown, connection status indicator, alert badge, theme toggle (light/dark/system), and a command palette (Cmd+K).
- **Main content** (center) — The active page.
- **Chat panel** (right, optional) — Resizable AI assistant sidebar.
- **Disconnection banner** — An amber warning bar appears across the top when the gateway is not connected.

### Data Flow

```
OpenClaw Gateway (WebSocket)
        |
  Gateway Provider  ──>  Zustand Stores  ──>  React Components
        |                     |
  Event stream          Persisted to
  Health polling        localStorage
```

When the gateway is disconnected, mock data automatically populates the UI so you can still explore the interface.

### Providers (wrapping order)

1. **ThemeProvider** — Light/dark/system theme via next-themes
2. **QueryProvider** — TanStack Query with 30-second stale time
3. **GatewayProvider** — WebSocket lifecycle, event routing to stores
4. **TooltipProvider** — Radix UI tooltips

---

## Dashboard (`/dashboard`)

The landing page showing a high-level overview of the entire system.

### Health Cards (top row)

| Card | Shows |
|------|-------|
| Gateway | Connection status (connected/disconnected/error) with status dot |
| Channels | Connected channels vs total (e.g. "3 / 5") |
| Sessions | Number of active sessions |
| Uptime | Gateway uptime in human-readable format |

### Stats Cards

Key performance indicators: active agent count, total sessions, error rate (percentage), and average response time in milliseconds.

### Token Usage Chart

A Recharts line chart plotting token consumption over time (last 30 data points). Shows prompt and completion tokens as separate series.

### Activity Feed

A scrollable list of recent events from the gateway — session starts, agent status changes, errors, tool calls — displayed with timestamps and severity indicators.

### Cost Breakdown

Daily cost aggregation shown as charts grouped by agent and by model. Tracks prompt vs completion token costs using per-model pricing tables.

### Customization

A "Customize" popover lets you toggle which widgets are visible. Your choices persist across sessions.

---

## Agent Flow (`/flow`)

A visual canvas showing the architecture of your agent deployment as a node graph.

### Node Types

| Node | Represents | Position |
|------|-----------|----------|
| Channel nodes | Input channels (Slack, API, etc.) | Left |
| Gateway node | The central gateway | Center |
| Agent nodes | Individual agents | Center-right |
| Model nodes | LLM models (GPT-4, Claude, etc.) | Right |
| Response nodes | Output destinations | Far right |

### Visual Indicators

- **Green** = healthy/connected
- **Red** = error state
- **Blue** = actively processing
- **Gray** = idle/offline
- Animated pulse on active nodes
- Edges connect the data flow: channels -> gateway -> agents -> models -> responses

### Interactions

- Pan and zoom the canvas
- Minimap for orientation
- Click nodes to select and view details
- Layout auto-arranges based on gateway health data

---

## Live Monitor (`/monitor`)

Real-time system activity dashboard for operational monitoring.

### Throughput Header

A live events-per-second counter with a 30-second spark-line graph showing throughput trends.

### Log Stream

A virtualized scrolling table (handles 10,000+ entries efficiently) of all system events.

**Filters available**:
- Severity: debug, info, warning, error, critical
- Event type dropdown
- Session ID search
- Free-text search

**Controls**:
- Pause/play log streaming
- Clear log buffer
- Auto-scroll toggle (configurable in Settings)

### Active Session Cards

Cards for each currently running session showing:
- Session ID and agent name
- Status indicator (with animated dot)
- Duration / age
- Token count so far
- Number of tool calls

### Queue Visualization

Shows the processing queue state — pending, in-progress, and completed items — giving visibility into backlog and throughput.

---

## Agents (`/agents`)

Agent lifecycle management — browse, create, configure, and monitor your agents.

### Agent Listing (`/agents`)

**Running Now section**: Highlights agents currently active (thinking, responding, or calling tools) with live status animations.

**Available Models section**: Grid of configured LLM models with primary/fallback badges.

**All Agents table**: Filterable and sortable list.

| Filter | Options |
|--------|---------|
| Status | All / Running / Idle / Offline |
| Model | Filter by assigned model |

Each agent card shows: name, status dot, model, active session count, last active time.

### Agent Detail (`/agents/[agentId]`)

**Header**: Agent name, edit button, delete button (with confirmation dialog).

**Stats row**: Sessions count, total tokens used, accumulated cost, average response time, success rate percentage.

**Tabs**:

| Tab | Content |
|-----|---------|
| Overview | Current phase timeline (intake -> reasoning -> planning -> execution -> reflection), live metrics, config snippet |
| Configuration | Editable fields: max tokens, temperature, system prompt. Edit dialog for modifications |
| Skills | Toggle list of agent capabilities (enable/disable individual skills) |
| Performance | Charts: response time trends, success rate over time, token usage patterns |
| Recent Activity | Event feed filtered to this specific agent |

### Actions

- **Create agent**: Dialog with name, model selector, and description fields
- **Edit agent**: Modify configuration parameters
- **Delete agent**: Confirmation dialog before removal
- **Reassign model**: Dropdown to change the agent's LLM model

---

## Sessions (`/sessions`)

Browse, analyze, and export chat session data.

### Session Table (`/sessions`)

A sortable, filterable table of all sessions.

**Columns**: Agent, Channel, Status, Tokens, Cost, Started At, Duration.

**Filters**:

| Filter | Options |
|--------|---------|
| Status | All / Active / Completed / Error / Timeout |
| Time range | All Time / Today / Last 7 days / Last 30 days |
| Search | By session ID |

**Sorting**: Click any column header to sort ascending/descending.

**Export**: Download session data as JSON or CSV.

**Comparison**: Select up to 2 sessions to view them side-by-side.

### Session Detail (`/sessions/[sessionId]`)

**Waterfall Timeline**: A visual sequence diagram showing each message, tool call, and response in chronological order with duration bars.

**Trace Tree**: Expandable tree structure of every operation in the session — user messages, assistant responses, tool calls, tool results, reasoning steps, and errors. Each node shows timing and metadata.

**Metrics summary**: Final token counts (prompt + completion), total cost, duration, message count.

**Raw Data**: A collapsible JSON viewer showing the full session trace for debugging.

---

## Code Monitor (`/code-monitor`)

Track AI-assisted code generation happening on local and remote machines.

### How It Works

Machines register with the dashboard via the `/api/code-monitor/register` API. A file watcher monitors project directories for Claude Code sessions and streams events (file edits, tool usage, messages) back to the dashboard in real time via Server-Sent Events.

### Setup Guide

On-page instructions for registering machines and enabling the file watcher.

### Machine Grid

Cards for each registered machine showing:
- Online/offline/busy status
- Hostname and OS
- Last heartbeat time
- CPU and memory usage (when reported)
- Active session count

### Local Projects

Lists watched project directories with:
- Project name and path
- Active session count badge
- Last activity timestamp
- Expandable recent events (file edits, tool calls, messages) per project

**Watcher toggle**: Switch to start/stop the file system watcher.

### Activity Feed

Chronological stream of code events (last 1,000):
- `file_edit` — Files created or modified
- `tool_use` — Tool invocations
- `message` — Agent messages
- `error` — Errors encountered
- `session_start` / `session_end` — Session lifecycle
- `thinking` — Agent reasoning steps

### Command Panel

Send natural-language instructions to registered machines. View command history with status tracking (pending -> dispatched -> running -> completed/error) and results.

---

## Memory Browser (`/memory`)

View and search agent memory and daily logs.

### Features

- **Daily log selector**: Dropdown to choose a specific date's log file
- **Markdown viewer**: Renders memory content with full GitHub-Flavored Markdown support (tables, code blocks, task lists)
- **Semantic search**: Search input to find related memory passages across all stored content
- **Export**: Download memory snapshots

### Data Source

Fetches markdown files from the server via `/api/markdown-files`.

---

## Cron Jobs (`/cron`)

Schedule agents to run automatically on a recurring basis.

### Jobs Table

| Column | Shows |
|--------|-------|
| Name | Job name |
| Agent | Assigned agent |
| Schedule | Cron expression or "Every X minutes" |
| Status | active / paused / error |
| Last Run | Timestamp of most recent execution |
| Next Run | Calculated next execution time |

**Inline actions**: Edit, Delete, Run Now (manual trigger), Pause/Resume.

### Create/Edit Dialog

- **Name**: Job identifier
- **Agent**: Select from available agents
- **Schedule type**: Choose between cron expression (e.g. `0 */6 * * *`) or simple interval (every N minutes)
- **Validation**: Cron syntax is validated before saving

### Run History

Table of the last 200 job executions showing:
- Status (success / error / running)
- Start time and duration
- Link to the resulting session (when applicable)
- Error message (on failure)

---

## Alerts (`/alerts`)

Define threshold-based alert rules and view alert history.

### Stats Overview

Three summary cards:
- **Active Rules**: Count of enabled rules vs total
- **Unacknowledged**: Alerts needing attention vs total
- **Critical**: Count of critical-severity unacknowledged alerts

### Alert Rules

Create rules that trigger when a metric crosses a threshold.

| Field | Options |
|-------|---------|
| Metric | error_rate, latency, active_sessions, cost, token_usage |
| Operator | >, <, >=, <=, == |
| Threshold | Numeric value |
| Severity | critical, warning, info |
| Cooldown | Minutes between re-triggers |
| Webhook | Optional URL to notify |

**Actions per rule**: Enable/disable toggle, edit, delete.

### Alert History

Chronological log of all triggered alerts showing:
- Rule name and severity badge
- Current value vs threshold at time of trigger
- Timestamp
- Acknowledge button (individual or bulk "Acknowledge All")

### Background Evaluation

The `useAlertEvaluator` hook continuously compares live metrics against rule thresholds in the background. When a threshold is crossed (respecting cooldown periods), it creates an alert event and dispatches configured webhooks.

---

## Settings (`/settings`)

Configure gateway connections, integrations, and dashboard preferences.

### Gateway Configuration

**Multi-gateway support**: Maintain a list of gateway profiles. Each profile has:
- Name (e.g. "Production Gateway")
- WebSocket URL
- Auth token (masked password input)
- Status indicator (connected/disconnected with animated dot)

**Actions per gateway**:
- Set Active — Switch which gateway is connected
- Test Connection — Ping the gateway, shows latency and server version
- Edit — Modify name, URL, or token
- Remove — Delete (with confirmation, disabled if it's the only gateway)

**Add Gateway**: Inline form to create a new profile.

### Remote Setup Wizard

A step-by-step dialog for configuring remote gateway access:
1. **URL** — Enter the gateway address with protocol selector (ws/wss)
2. **Authentication** — Enter the gateway token
3. **Test** — Auto-tests the connection with results
4. **Save** — Creates a new gateway profile

### Local Network URLs

Expandable section showing:
- Detected network interfaces with their WebSocket URLs
- QR code for quick phone access to the dashboard
- Copy-to-clipboard buttons for each URL

### Remote Access (ngrok)

Built-in ngrok tunnel management:
- **Start Tunnel** — Creates an ngrok tunnel to localhost:3000, returns a public URL
- **Active tunnel display** — Shows the public URL with QR code and copy button
- **Stop Tunnel** — Tears down the tunnel
- Requires `NGROK_AUTHTOKEN` environment variable

### Webhook Integrations

Manage notification webhooks for external services:

| Field | Options |
|-------|---------|
| Type | Slack, Discord, Generic HTTP |
| URL | Webhook endpoint |
| Events | alert.critical, alert.warning, alert.info, session.error, gateway.disconnected |

**Actions**: Add, edit, delete, enable/disable, test webhook.

### Dashboard Preferences

| Setting | Description |
|---------|-------------|
| Auto-Reconnect | Automatically reconnect when connection drops |
| Log Stream Auto-Scroll | Scroll to new entries automatically |
| Default Log Severity | Pre-selected filter when opening the log stream |
| Notifications | Enable desktop notifications for errors and alerts |
| Notification Sounds | Play audio on notification |
| Log Buffer Size | Max entries in memory (default: 10,000) |

---

## Chat Assistant

An AI-powered assistant (Clawkins) accessible from a resizable side panel.

### Features

- **Streaming responses**: Tokens appear word-by-word as they're generated
- **Live context injection**: Automatically enriches queries with current dashboard state (agents, sessions, health, costs) so the AI can answer questions about your live system
- **Markdown rendering**: Responses support bold, lists, code blocks, and tables (sanitized HTML)
- **Slash commands**: Type `/` to see quick commands:
  - `/agents` — List running agents
  - `/status` — System status summary
  - `/sessions` — Active sessions
  - `/tokens` — Token usage today
  - `/help` — Available commands
- **Conversation history**: Messages persist within the session, clearable via button
- **Connection indicator**: Shows whether the gateway is connected and if live context is available
- **Resizable panel**: Drag the left edge to resize (desktop), full-screen overlay on mobile

### Backend

Powered by Moonshot API (Kimi K2.5 model). Requires `MOONSHOT_API_KEY` environment variable. The chat route streams Server-Sent Events back to the client.

---

## Security & Authentication

### Dashboard Secret

A random UUID is generated at server startup and stored in memory (survives Next.js HMR via `globalThis`). Can be overridden with the `DASHBOARD_SECRET` environment variable. The secret is printed to the server console on first generation.

### API Protection

Sensitive API routes require the secret via `X-Dashboard-Token` header. The browser obtains the token from `/api/auth/token`, which is protected by Origin/Referer same-origin validation — cross-origin scripts cannot obtain it.

Protected routes: tunnel (GET/POST/DELETE), code-monitor/register (POST), code-monitor/commands (POST), code-monitor/watcher (POST), chat (POST), network-info (GET).

Unprotected by design: SSE event streams (EventSource doesn't support custom headers, read-only data), machine listing (read-only), markdown/config endpoints (low sensitivity).

### Client-Side Auth

The `authFetch()` function is a drop-in `fetch` replacement that:
1. Fetches the dashboard token once from `/api/auth/token`
2. Caches it in memory (not localStorage)
3. Attaches it as `X-Dashboard-Token` header on every request
4. Auto-retries on 401 (handles server restart generating a new secret)

### Machine Authentication

Registered machines receive a UUID auth token on registration. The `X-Monitor-Token` header is validated on command polling and status update endpoints. Empty tokens are rejected.

### HTTP Security Headers

Set in `next.config.ts`:
- `X-Frame-Options: DENY` — Prevents clickjacking
- `X-Content-Type-Options: nosniff` — Prevents MIME sniffing
- `Referrer-Policy: origin-when-cross-origin`

---

## API Routes

| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/auth/token` | GET | Same-origin | Bootstrap dashboard token |
| `/api/chat` | POST | Dashboard | Proxy to Moonshot AI (SSE streaming) |
| `/api/tunnel` | GET, POST, DELETE | Dashboard | ngrok tunnel management |
| `/api/network-info` | GET | Dashboard | Local network interface discovery |
| `/api/code-monitor/register` | POST | Dashboard | Machine registration/deregistration |
| `/api/code-monitor/machines` | GET | None | List registered machines |
| `/api/code-monitor/commands` | GET, POST, PATCH | POST: Dashboard; GET/PATCH: Machine token | Send and poll commands |
| `/api/code-monitor/watcher` | GET, POST | POST: Dashboard | File watcher control |
| `/api/code-monitor/events` | GET (SSE) | None | Real-time event stream |
| `/api/code-monitor/heartbeat` | POST | Machine token | Machine heartbeat/stats |
| `/api/config` | GET | None | Gateway configuration |
| `/api/markdown-files` | GET | None | Memory/log file serving |
