import { launchSession } from './session-manager.js';

interface PollCommand {
  id: string;
  machineId: string;
  instruction: string;
  status: string;
}

interface PollResponse {
  commands: PollCommand[];
}

export function startPolling(
  dashboardUrl: string,
  machineId: string,
  token: string,
  intervalMs: number
): ReturnType<typeof setInterval> {
  const handle = setInterval(async () => {
    try {
      const res = await fetch(
        `${dashboardUrl}/api/code-monitor/commands?machineId=${encodeURIComponent(machineId)}`,
        {
          headers: {
            'X-Monitor-Token': token,
          },
        }
      );

      if (!res.ok) {
        console.error(`[commander] Poll failed: ${res.status} ${res.statusText}`);
        return;
      }

      const data = (await res.json()) as PollResponse;
      const commands = data.commands || [];

      for (const cmd of commands) {
        console.log(`[commander] Received command ${cmd.id}: "${cmd.instruction.slice(0, 60)}..."`);

        // Report running status
        await updateCommandStatus(dashboardUrl, token, cmd.id, 'running');

        try {
          const { promise } = launchSession(cmd.instruction);
          const result = await promise;

          // Report completed status
          await updateCommandStatus(dashboardUrl, token, cmd.id, 'completed', result);
          console.log(`[commander] Command ${cmd.id} completed successfully`);
        } catch (err) {
          const errorMsg = (err as Error).message;
          await updateCommandStatus(dashboardUrl, token, cmd.id, 'error', undefined, errorMsg);
          console.error(`[commander] Command ${cmd.id} failed:`, errorMsg);
        }
      }
    } catch (err) {
      console.error('[commander] Poll error:', (err as Error).message);
    }
  }, intervalMs);

  console.log(`[commander] Started polling every ${intervalMs}ms`);
  return handle;
}

export function stopPolling(handle: ReturnType<typeof setInterval>): void {
  clearInterval(handle);
  console.log('[commander] Stopped polling');
}

async function updateCommandStatus(
  dashboardUrl: string,
  token: string,
  commandId: string,
  status: string,
  result?: string,
  error?: string
): Promise<void> {
  try {
    await fetch(`${dashboardUrl}/api/code-monitor/commands`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Monitor-Token': token,
      },
      body: JSON.stringify({ commandId, status, result, error }),
    });
  } catch (err) {
    console.error(`[commander] Failed to update command ${commandId}:`, (err as Error).message);
  }
}
