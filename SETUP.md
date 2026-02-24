# OpenClaw Dashboard - Setup Guide

A real-time monitoring dashboard for the OpenClaw AI agent framework. Built with Next.js 16, React 19, and shadcn/ui.

---

## Prerequisites

Install the following before getting started:

| Software | Version | Install |
|----------|---------|---------|
| **Node.js** | >= 20 | [nodejs.org](https://nodejs.org/) or `brew install node` |
| **npm** | (comes with Node.js) | |
| **Git** | any recent version | `brew install git` (macOS) or [git-scm.com](https://git-scm.com/) |

**Optional** (for remote access):

| Software | Purpose | Install |
|----------|---------|---------|
| **cloudflared** | Tunnel localhost to a public URL | `brew install cloudflare/cloudflare/cloudflared` (macOS) or [docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) |
| **Vercel CLI** | Deploy to Vercel | `npm i -g vercel` |

---

## Quick Start (Local Development)

### 1. Clone the repository

```bash
git clone https://github.com/tdmoran/OpenClawInterface.git
cd OpenClawInterface
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create environment file

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Required - OpenClaw Gateway connection
NEXT_PUBLIC_GATEWAY_URL=ws://localhost:18789
NEXT_PUBLIC_GATEWAY_TOKEN=your-token-here

# Optional - AI chat assistant (Moonshot / Kimi K2.5)
MOONSHOT_API_KEY=sk-your-key-here
```

> **Note**: The dashboard works without the gateway running. It shows mock/demo data when the gateway is offline.

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables Reference

| Variable | Required | Side | Description |
|----------|----------|------|-------------|
| `NEXT_PUBLIC_GATEWAY_URL` | Yes | Client | WebSocket URL for the OpenClaw Gateway (e.g. `ws://localhost:18789`) |
| `NEXT_PUBLIC_GATEWAY_TOKEN` | Yes | Client | Auth token for the gateway connection |
| `MOONSHOT_API_KEY` | No | Server | API key for Kimi K2.5 chat assistant ([moonshot.ai](https://www.moonshot.ai/)) |
| `DASHBOARD_SECRET` | No | Server | Shared secret for API auth. Auto-generated on startup if not set. |
| `NEXT_PUBLIC_CODE_MONITOR_URL` | No | Client | Tunnel URL for remote code monitor access (see [Remote Access](#remote-access-from-vercel)) |
| `CODE_MONITOR_CORS_ORIGIN` | No | Server | Vercel app URL, allows cross-origin code monitor requests |
| `NGROK_AUTHTOKEN` | No | Server | ngrok auth token for tunnel feature in Settings |

> Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Never put secrets in them.

---

## Features Overview

| Page | What it does |
|------|-------------|
| **Dashboard** | Health overview, token usage charts, cost breakdown, activity feed |
| **Flow** | Visual canvas of gateway channels, agents, and tools (React Flow) |
| **Monitor** | Live log stream, active sessions, queue visualization |
| **Agents** | Agent registry with detail views (config, skills, performance) |
| **Sessions** | Session history table with waterfall timelines and trace trees |
| **Code Monitor** | Track Claude Code sessions across machines, send instructions remotely |
| **Memory** | Browse `.md` files from `~/.openclaw/workspace/` |
| **Cron** | Scheduled job management and run history |
| **Alerts** | Configurable alert rules with history |
| **Settings** | Gateway config, theme, remote access QR code |
| **Chat** | AI assistant with live dashboard context |

---

## Deploy to Vercel

### 1. Install the Vercel CLI

```bash
npm i -g vercel
```

### 2. Link and deploy

```bash
vercel          # First run: link to your Vercel project
vercel --prod   # Deploy to production
```

### 3. Set environment variables

In the [Vercel dashboard](https://vercel.com/) or via CLI:

```bash
# Required for gateway
vercel env add NEXT_PUBLIC_GATEWAY_URL production
vercel env add NEXT_PUBLIC_GATEWAY_TOKEN production

# Required for chat
vercel env add MOONSHOT_API_KEY production

# Required for remote code monitor (see next section)
vercel env add NEXT_PUBLIC_CODE_MONITOR_URL production
vercel env add CODE_MONITOR_CORS_ORIGIN production
vercel env add DASHBOARD_SECRET production
```

> After adding/changing env vars, redeploy with `vercel --prod` for them to take effect.

---

## Remote Access (from Vercel)

The Code Monitor and Memory pages read from your **local machine** (filesystem, in-memory state). When accessing the dashboard from Vercel, these need a tunnel back to your local dev server.

### How it works

```
Phone/Browser
    |
    v
Vercel (dashboard UI)
    |
    v  (NEXT_PUBLIC_CODE_MONITOR_URL)
cloudflared tunnel
    |
    v
localhost:3000 (your machine - code monitor APIs, file watcher, memory files)
```

### Setup

**On your local machine:**

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Start a cloudflared tunnel:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   It will print a URL like `https://some-random-words.trycloudflare.com`.

3. Set the CORS origin in `.env.local`:
   ```env
   CODE_MONITOR_CORS_ORIGIN=https://your-app.vercel.app
   DASHBOARD_SECRET=your-shared-secret
   ```

4. Restart the dev server to pick up the new env var.

**On Vercel:**

Set these env vars (CLI or web dashboard):

```bash
vercel env add NEXT_PUBLIC_CODE_MONITOR_URL production
# Paste the cloudflared tunnel URL

vercel env add CODE_MONITOR_CORS_ORIGIN production
# Paste your Vercel app URL (e.g. https://your-app.vercel.app)

vercel env add DASHBOARD_SECRET production
# Same value as your local DASHBOARD_SECRET
```

Then redeploy:
```bash
vercel --prod
```

### Important notes

- The **cloudflared tunnel URL changes** every time you restart `cloudflared`. You'll need to update `NEXT_PUBLIC_CODE_MONITOR_URL` on Vercel and redeploy each time.
- Both your local machine and Vercel must share the **same `DASHBOARD_SECRET`** for authenticated API calls to work cross-origin.
- Your local dev server and cloudflared tunnel must be **running** for remote code monitor/memory to work.

---

## OpenClaw Gateway

The dashboard connects to an OpenClaw Gateway instance via WebSocket. The gateway manages AI agent sessions, tool calls, and event streams.

- **Default URL**: `ws://localhost:18789`
- **Protocol**: JSON frames over WebSocket (request/response/event pattern)
- **Reconnection**: Automatic retry every 3 seconds, up to 10 attempts
- **Fallback**: Dashboard shows mock data when the gateway is offline

To run the gateway, see the [OpenClaw Gateway documentation](https://github.com/tdmoran/OpenClaw).

---

## Code Monitor - Registering Machines

The Code Monitor tracks Claude Code sessions across machines. Each machine registers with the dashboard and sends events.

### Register a machine

```bash
curl -X POST http://localhost:3000/api/code-monitor/register \
  -H "Content-Type: application/json" \
  -H "X-Dashboard-Token: YOUR_DASHBOARD_TOKEN" \
  -d '{"name": "my-laptop", "hostname": "macbook.local"}'
```

Response:
```json
{
  "machineId": "uuid-here",
  "authToken": "machine-token-here"
}
```

### Send events

```bash
curl -X POST http://localhost:3000/api/code-monitor/events \
  -H "Content-Type: application/json" \
  -H "X-Monitor-Token: machine-token-here" \
  -d '{
    "machineId": "uuid-here",
    "events": [
      { "type": "tool_use", "message": "Running bash command", "projectDir": "my-project" }
    ]
  }'
```

### Heartbeat

```bash
curl -X POST http://localhost:3000/api/code-monitor/heartbeat \
  -H "Content-Type: application/json" \
  -H "X-Monitor-Token: machine-token-here" \
  -d '{"machineId": "uuid-here"}'
```

Machines are marked offline after 30 seconds without a heartbeat.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Create optimized production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |

---

## Project Structure

```
src/
  app/
    (dashboard)/          # All dashboard pages (shared sidebar layout)
      dashboard/          # Main overview
      flow/               # React Flow canvas
      monitor/            # Live logs
      agents/             # Agent registry
      sessions/           # Session history
      code-monitor/       # Machine monitoring
      memory/             # Markdown file viewer
      settings/           # Configuration
    api/                  # API routes (Next.js Route Handlers)
  components/
    ui/                   # shadcn/ui primitives
    dashboard/            # Dashboard-specific components
    code-monitor/         # Code monitor components
    memory/               # Memory viewer
    chat/                 # Chat assistant
  hooks/                  # Custom React hooks
  lib/
    gateway/              # WebSocket client & protocol
    code-monitor/         # State management & URL helpers
  providers/              # React context providers
  stores/                 # Zustand state stores
  types/                  # TypeScript type definitions
```

---

## Troubleshooting

**"Gateway disconnected" on dashboard**
- Ensure the OpenClaw Gateway is running on the URL specified in `NEXT_PUBLIC_GATEWAY_URL`
- The dashboard still works with mock data when disconnected

**"Moonshot API key not configured" in chat**
- Set `MOONSHOT_API_KEY` in `.env.local` (local) or Vercel env vars (deployed)

**Code Monitor not connecting remotely**
- Verify cloudflared tunnel is running and the URL matches `NEXT_PUBLIC_CODE_MONITOR_URL` on Vercel
- Verify `CODE_MONITOR_CORS_ORIGIN` is set on your local machine's `.env.local`
- Verify `DASHBOARD_SECRET` matches on both local and Vercel

**Recharts warning about chart dimensions**
- This is a known harmless SSR warning during build. Ignore it.

**Build fails with TypeScript errors**
- Ensure Node.js >= 20
- Run `npm install` to ensure dependencies are up to date
