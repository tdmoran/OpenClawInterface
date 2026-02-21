import type { Machine, CodeEvent, CodeCommand, CommandStatus } from '@/types/code-monitor';

interface SSEClient {
  controller: ReadableStreamDefaultController;
  machineId?: string; // optional filter
}

class MonitorState {
  machines = new Map<string, Machine>();
  events: CodeEvent[] = [];
  commandQueues = new Map<string, CodeCommand[]>();
  sseClients = new Set<SSEClient>();
  private maxEvents = 5000;
  private heartbeatTimeout = 30000; // 30s
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startHeartbeatChecker();
  }

  registerMachine(name: string, hostname: string, os: string): { machineId: string; authToken: string } {
    const machineId = crypto.randomUUID();
    const authToken = crypto.randomUUID();
    const machine: Machine = {
      id: machineId,
      name,
      hostname,
      os,
      status: 'online',
      lastHeartbeat: Date.now(),
      activeSessions: 0,
      registeredAt: Date.now(),
      authToken,
    };
    this.machines.set(machineId, machine);
    this.commandQueues.set(machineId, []);
    this.broadcastSSE({ type: 'machine_registered', data: { ...machine, authToken: undefined } });
    return { machineId, authToken };
  }

  removeMachine(machineId: string): boolean {
    const removed = this.machines.delete(machineId);
    this.commandQueues.delete(machineId);
    if (removed) this.broadcastSSE({ type: 'machine_removed', data: { machineId } });
    return removed;
  }

  heartbeat(machineId: string, stats?: { activeSessions?: number; cpuUsage?: number; memUsage?: number }): boolean {
    const machine = this.machines.get(machineId);
    if (!machine) return false;
    machine.lastHeartbeat = Date.now();
    machine.status = stats?.activeSessions ? 'busy' : 'online';
    if (stats?.activeSessions !== undefined) machine.activeSessions = stats.activeSessions;
    if (stats?.cpuUsage !== undefined) machine.cpuUsage = stats.cpuUsage;
    if (stats?.memUsage !== undefined) machine.memUsage = stats.memUsage;
    return true;
  }

  addEvent(event: CodeEvent): void {
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
    this.broadcastSSE({ type: 'event', data: event });
  }

  enqueueCommand(machineId: string, instruction: string): CodeCommand | null {
    if (!this.machines.has(machineId)) return null;
    const command: CodeCommand = {
      id: crypto.randomUUID(),
      machineId,
      instruction,
      status: 'pending',
      createdAt: Date.now(),
    };
    const queue = this.commandQueues.get(machineId) || [];
    queue.push(command);
    this.commandQueues.set(machineId, queue);
    this.broadcastSSE({ type: 'command_created', data: command });
    return command;
  }

  pollCommands(machineId: string): CodeCommand[] {
    const queue = this.commandQueues.get(machineId) || [];
    const pending = queue.filter(c => c.status === 'pending');
    pending.forEach(c => {
      c.status = 'dispatched';
      c.startedAt = Date.now();
    });
    return pending;
  }

  updateCommand(commandId: string, update: { status?: CommandStatus; result?: string; error?: string }): boolean {
    for (const queue of this.commandQueues.values()) {
      const cmd = queue.find(c => c.id === commandId);
      if (cmd) {
        if (update.status) cmd.status = update.status;
        if (update.result !== undefined) cmd.result = update.result;
        if (update.error !== undefined) cmd.error = update.error;
        if (update.status === 'completed' || update.status === 'error') cmd.completedAt = Date.now();
        this.broadcastSSE({ type: 'command_updated', data: cmd });
        return true;
      }
    }
    return false;
  }

  getMachines(): Machine[] {
    return Array.from(this.machines.values()).map(m => ({ ...m, authToken: '' }));
  }

  getEvents(limit = 100, machineId?: string): CodeEvent[] {
    const filtered = machineId ? this.events.filter(e => e.machineId === machineId) : this.events;
    return filtered.slice(-limit);
  }

  getCommands(machineId?: string): CodeCommand[] {
    if (machineId) return this.commandQueues.get(machineId) || [];
    return Array.from(this.commandQueues.values()).flat();
  }

  validateToken(machineId: string, token: string): boolean {
    const machine = this.machines.get(machineId);
    return machine?.authToken === token;
  }

  addSSEClient(client: SSEClient): void {
    this.sseClients.add(client);
  }

  removeSSEClient(client: SSEClient): void {
    this.sseClients.delete(client);
  }

  private broadcastSSE(message: { type: string; data: unknown }): void {
    const payload = `data: ${JSON.stringify(message)}\n\n`;
    const encoder = new TextEncoder();
    for (const client of this.sseClients) {
      try {
        client.controller.enqueue(encoder.encode(payload));
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  private startHeartbeatChecker(): void {
    if (this.checkInterval) return;
    this.checkInterval = setInterval(() => {
      const now = Date.now();
      for (const machine of this.machines.values()) {
        if (machine.status !== 'offline' && now - machine.lastHeartbeat > this.heartbeatTimeout) {
          machine.status = 'offline';
          machine.activeSessions = 0;
          this.broadcastSSE({ type: 'machine_status', data: { machineId: machine.id, status: 'offline' } });
        }
      }
    }, 10000);
  }

  getState() {
    return {
      machines: this.getMachines(),
      events: this.getEvents(100),
      commands: this.getCommands(),
    };
  }
}

// Use globalThis to survive Next.js HMR
const globalKey = '__monitorState__';
export const monitorState: MonitorState =
  ((globalThis as Record<string, unknown>)[globalKey] as MonitorState) ??
  ((globalThis as Record<string, unknown>)[globalKey] = new MonitorState());
