import { spawn, type ChildProcess } from 'node:child_process';

interface ActiveSession {
  pid: number;
  process: ChildProcess;
  instruction: string;
  projectPath?: string;
  startedAt: number;
}

const activeSessions = new Map<number, ActiveSession>();

export function launchSession(
  instruction: string,
  projectPath?: string
): { pid: number; promise: Promise<string> } {
  const args = ['--print', '-p', instruction];

  const spawnOptions: { cwd?: string } = {};
  if (projectPath) {
    spawnOptions.cwd = projectPath;
  }

  const child = spawn('claude', args, {
    ...spawnOptions,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const pid = child.pid!;
  const session: ActiveSession = {
    pid,
    process: child,
    instruction,
    projectPath,
    startedAt: Date.now(),
  };
  activeSessions.set(pid, session);

  const promise = new Promise<string>((resolve, reject) => {
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout!.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });

    child.stderr!.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    child.on('close', (code) => {
      activeSessions.delete(pid);
      const stdout = Buffer.concat(stdoutChunks).toString('utf-8');
      const stderr = Buffer.concat(stderrChunks).toString('utf-8');

      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Process exited with code ${code}: ${stderr || stdout}`));
      }
    });

    child.on('error', (err) => {
      activeSessions.delete(pid);
      reject(err);
    });
  });

  console.log(`[session] Launched session PID=${pid} instruction="${instruction.slice(0, 60)}..."`);

  return { pid, promise };
}

export function listActiveSessions(): number[] {
  return Array.from(activeSessions.keys());
}

export function killSession(pid: number): boolean {
  const session = activeSessions.get(pid);
  if (!session) {
    console.warn(`[session] No active session with PID=${pid}`);
    return false;
  }

  try {
    session.process.kill('SIGTERM');
    activeSessions.delete(pid);
    console.log(`[session] Killed session PID=${pid}`);
    return true;
  } catch (err) {
    console.error(`[session] Failed to kill PID=${pid}:`, (err as Error).message);
    return false;
  }
}
