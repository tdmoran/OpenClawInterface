export type MachineStatus = 'online' | 'busy' | 'offline';
export type CodeEventType = 'tool_use' | 'file_edit' | 'message' | 'error' | 'session_start' | 'session_end';
export type CommandStatus = 'pending' | 'dispatched' | 'running' | 'completed' | 'error';

export interface Machine {
  id: string;
  name: string;
  hostname: string;
  os: string;
  status: MachineStatus;
  lastHeartbeat: number;
  activeSessions: number;
  cpuUsage?: number;
  memUsage?: number;
  registeredAt: number;
  authToken: string;
}

export interface CodeSession {
  id: string;
  machineId: string;
  machineName: string;
  projectPath: string;
  status: 'active' | 'idle' | 'completed' | 'error';
  startedAt: number;
  lastActivityAt: number;
  toolCalls: number;
  filesModified: number;
  tokenCount: number;
}

export interface CodeEvent {
  id: string;
  machineId: string;
  sessionId?: string;
  type: CodeEventType;
  timestamp: number;
  toolName?: string;
  filePath?: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface CodeCommand {
  id: string;
  machineId: string;
  instruction: string;
  status: CommandStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: string;
  error?: string;
}
