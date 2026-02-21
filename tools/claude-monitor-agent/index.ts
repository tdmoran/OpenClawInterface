import { hostname } from 'node:os';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { register, sendHeartbeat, deregister } from './reporter.js';
import { setupHooks } from './hooks-setup.js';
import { startPolling, stopPolling } from './commander.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse CLI arguments
function parseArgs(argv: string[]): { dashboardUrl: string; name: string; token?: string } {
  let dashboardUrl = '';
  let name = hostname();
  let token: string | undefined;

  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--dashboard':
        dashboardUrl = argv[++i];
        break;
      case '--name':
        name = argv[++i];
        break;
      case '--token':
        token = argv[++i];
        break;
    }
  }

  if (!dashboardUrl) {
    console.error('Usage: claude-monitor-agent --dashboard <url> [--name <name>] [--token <token>]');
    console.error('');
    console.error('Options:');
    console.error('  --dashboard <url>  Dashboard base URL (required)');
    console.error('  --name <name>      Machine display name (default: hostname)');
    console.error('  --token <token>    Re-registration token');
    process.exit(1);
  }

  return { dashboardUrl, name, token };
}

async function main() {
  const args = parseArgs(process.argv);
  console.log(`[agent] Starting claude-monitor-agent`);
  console.log(`[agent] Dashboard: ${args.dashboardUrl}`);
  console.log(`[agent] Machine name: ${args.name}`);

  // Step 1: Register with the dashboard
  console.log('[agent] Registering with dashboard...');
  const registration = await register(args.dashboardUrl, args.name);
  if (!registration) {
    console.error('[agent] Failed to register with dashboard. Exiting.');
    process.exit(1);
  }

  const { machineId, authToken } = registration;
  console.log(`[agent] Registered as ${machineId}`);

  // Step 2: Setup Claude Code hooks
  console.log('[agent] Setting up Claude Code hooks...');
  setupHooks(args.dashboardUrl, machineId, authToken, __dirname);

  // Step 3: Start heartbeat interval (10s)
  console.log('[agent] Starting heartbeat (every 10s)...');
  const heartbeatInterval = setInterval(async () => {
    await sendHeartbeat(args.dashboardUrl, machineId, authToken);
  }, 10000);

  // Send initial heartbeat
  await sendHeartbeat(args.dashboardUrl, machineId, authToken);

  // Step 4: Start command polling (2s)
  console.log('[agent] Starting command polling (every 2s)...');
  const pollHandle = startPolling(args.dashboardUrl, machineId, authToken, 2000);

  // Step 5: Graceful shutdown handler
  async function shutdown(signal: string) {
    console.log(`\n[agent] Received ${signal}, shutting down...`);

    // Stop polling and heartbeat
    clearInterval(heartbeatInterval);
    stopPolling(pollHandle);

    // Deregister from dashboard
    console.log('[agent] Deregistering from dashboard...');
    await deregister(args.dashboardUrl, machineId, authToken);

    console.log('[agent] Shutdown complete.');
    process.exit(0);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  console.log('[agent] Ready. Monitoring Claude Code activity.');
  console.log('[agent] Press Ctrl+C to stop.');
}

main().catch((err) => {
  console.error('[agent] Fatal error:', err);
  process.exit(1);
});
