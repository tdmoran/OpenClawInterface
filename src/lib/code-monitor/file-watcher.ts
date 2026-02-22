import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { CodeEvent, WatchedProject, WatcherStatus } from '@/types/code-monitor';
import { monitorState } from './state';

interface TrackedFile {
  filePath: string;
  byteOffset: number;
  sessionId: string;
  projectDir: string;
  projectPath: string;
  lastMtime: number;
  active: boolean;
}

// JSONL entry types from Claude Code transcripts
interface JSONLEntry {
  type: 'user' | 'assistant' | 'system' | 'progress' | 'result';
  message?: {
    role?: string;
    content?: unknown;
  };
  cwd?: string;
  timestamp?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking';
  text?: string;
  thinking?: string;
  name?: string;
  id?: string;
  input?: Record<string, unknown>;
}

const SCAN_INTERVAL = 3000; // 3 seconds
const SESSION_TIMEOUT = 60000; // 60 seconds
const LARGE_FILE_THRESHOLD = 100 * 1024; // 100KB
const LOCAL_MACHINE_ID = '__local__';

function encodePath(absPath: string): string {
  return absPath.replace(/\//g, '-');
}

function summarizeToolInput(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case 'Bash':
      return `Bash: $ ${String(input.command || '').slice(0, 120)}`;
    case 'Read':
      return `Read ${input.file_path || ''}`;
    case 'Write':
      return `Write ${input.file_path || ''}`;
    case 'Edit':
    case 'MultiEdit':
      return `Edit ${input.file_path || ''}`;
    case 'Glob':
      return `Glob: ${input.pattern || ''}`;
    case 'Grep':
      return `Grep: ${input.pattern || ''}`;
    case 'Task':
      return `Task: ${String(input.description || input.prompt || '').slice(0, 80)}`;
    case 'WebSearch':
      return `Search: ${input.query || ''}`;
    case 'WebFetch':
      return `Fetch: ${input.url || ''}`;
    default:
      return `${toolName}`;
  }
}

function isFileEditTool(toolName: string): boolean {
  return ['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(toolName);
}

export class FileWatcher {
  private watchedFolder: string;
  private claudeProjectsDir: string;
  private trackedFiles = new Map<string, TrackedFile>();
  private scanTimer: ReturnType<typeof setInterval> | null = null;
  private _running = false;
  private localMachineId: string = LOCAL_MACHINE_ID;

  constructor(watchedFolder?: string) {
    this.watchedFolder = watchedFolder || path.join(os.homedir(), 'Desktop');
    this.claudeProjectsDir = path.join(os.homedir(), '.claude', 'projects');
  }

  get running(): boolean {
    return this._running;
  }

  start(): void {
    if (this._running) return;
    this._running = true;

    // Register local machine in monitorState
    this.registerLocalMachine();

    // Run first scan immediately
    this.scan();

    // Then scan on interval
    this.scanTimer = setInterval(() => this.scan(), SCAN_INTERVAL);
  }

  stop(): void {
    if (!this._running) return;
    this._running = false;

    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }

    // Mark all active sessions as ended
    for (const tracked of this.trackedFiles.values()) {
      if (tracked.active) {
        tracked.active = false;
        this.emitEvent(tracked, 'session_end', 'Session ended (watcher stopped)');
      }
    }
  }

  setWatchedFolder(folder: string): void {
    this.watchedFolder = folder;
    // Reset tracking when folder changes
    this.trackedFiles.clear();
  }

  getStatus(): WatcherStatus {
    const projectMap = new Map<string, WatchedProject>();

    for (const tracked of this.trackedFiles.values()) {
      const existing = projectMap.get(tracked.projectDir);
      if (existing) {
        existing.totalSessions++;
        if (tracked.active) existing.activeSessions++;
        if (tracked.lastMtime > existing.lastActivity) {
          existing.lastActivity = tracked.lastMtime;
        }
      } else {
        const { name, resolvedPath } = this.resolveProject(tracked);
        projectMap.set(tracked.projectDir, {
          name,
          path: resolvedPath,
          encodedDir: tracked.projectDir,
          activeSessions: tracked.active ? 1 : 0,
          totalSessions: 1,
          lastActivity: tracked.lastMtime,
        });
      }
    }

    return {
      running: this._running,
      watchedFolder: this.watchedFolder,
      projects: Array.from(projectMap.values()),
      activeSessions: Array.from(this.trackedFiles.values()).filter((f) => f.active).length,
      totalFilesTracked: this.trackedFiles.size,
    };
  }

  private registerLocalMachine(): void {
    // Check if local machine already registered
    const existing = monitorState.getMachines().find((m) => m.id === LOCAL_MACHINE_ID);
    if (existing) {
      monitorState.heartbeat(LOCAL_MACHINE_ID);
      return;
    }

    // Register with a known ID by directly adding to state
    monitorState.registerLocalMachine(this.localMachineId, os.hostname());
  }

  private resolveProject(tracked: TrackedFile): { name: string; resolvedPath: string } {
    // If we extracted a real path from JSONL cwd field, use it
    if (tracked.projectPath !== tracked.projectDir && tracked.projectPath.startsWith('/')) {
      return { name: path.basename(tracked.projectPath), resolvedPath: tracked.projectPath };
    }
    // Decode from encoded dir by stripping watched folder prefix
    const prefix = encodePath(this.watchedFolder);
    if (tracked.projectDir.startsWith(prefix) && tracked.projectDir.length > prefix.length) {
      const relative = tracked.projectDir.slice(prefix.length + 1); // +1 for the '-' separator
      return { name: relative, resolvedPath: this.watchedFolder + '/' + relative };
    }
    return { name: tracked.projectDir, resolvedPath: tracked.projectDir };
  }

  private scan(): void {
    if (!this._running) return;

    try {
      // Check if projects directory exists
      if (!fs.existsSync(this.claudeProjectsDir)) return;

      const prefix = encodePath(this.watchedFolder);
      const dirs = fs.readdirSync(this.claudeProjectsDir);

      const matchingDirs = dirs.filter((d) => d.startsWith(prefix));

      for (const dir of matchingDirs) {
        this.scanProjectDir(dir);
      }

      // Check for timed-out sessions
      this.checkSessionTimeouts();

      // Update local machine heartbeat
      const activeSessions = Array.from(this.trackedFiles.values()).filter((f) => f.active).length;
      monitorState.heartbeat(this.localMachineId, { activeSessions });

      // Broadcast watcher status
      monitorState.broadcastWatcherStatus(this.getStatus());
    } catch (err) {
      // Don't crash on scan errors, just log
      console.error('[FileWatcher] scan error:', err);
    }
  }

  private scanProjectDir(dir: string): void {
    const dirPath = path.join(this.claudeProjectsDir, dir);

    try {
      const stat = fs.statSync(dirPath);
      if (!stat.isDirectory()) return;
    } catch {
      return;
    }

    let files: string[];
    try {
      files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.jsonl'));
    } catch {
      return;
    }

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      this.processFile(filePath, dir, file);
    }
  }

  private processFile(filePath: string, projectDir: string, fileName: string): void {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch {
      return;
    }

    const sessionId = fileName.replace('.jsonl', '');
    const now = Date.now();
    const mtime = stat.mtimeMs;
    const isRecent = now - mtime < SESSION_TIMEOUT;

    const tracked = this.trackedFiles.get(filePath);

    if (!tracked) {
      // New file discovered
      const isLargeFile = stat.size > LARGE_FILE_THRESHOLD;
      const newTracked: TrackedFile = {
        filePath,
        byteOffset: isLargeFile ? stat.size : 0,
        sessionId,
        projectDir,
        projectPath: this.extractProjectPath(filePath, projectDir) || projectDir,
        lastMtime: mtime,
        active: isRecent,
      };
      this.trackedFiles.set(filePath, newTracked);

      if (isRecent) {
        if (isLargeFile) {
          this.emitEvent(newTracked, 'session_start', `Session resumed (${Math.round(stat.size / 1024)}KB history)`);
        } else {
          // Read from beginning for small files
          this.tailFile(newTracked, stat.size);
          if (newTracked.active) {
            this.emitEvent(newTracked, 'session_start', `Session discovered`);
          }
        }
      }
      return;
    }

    // Existing tracked file
    tracked.lastMtime = mtime;

    if (isRecent && !tracked.active) {
      // Session reactivated
      tracked.active = true;
      this.emitEvent(tracked, 'session_start', 'Session reactivated');
    }

    // Tail new bytes
    if (stat.size > tracked.byteOffset) {
      this.tailFile(tracked, stat.size);
    }
  }

  private tailFile(tracked: TrackedFile, fileSize: number): void {
    const bytesToRead = fileSize - tracked.byteOffset;
    if (bytesToRead <= 0) return;

    let fd: number | null = null;
    try {
      fd = fs.openSync(tracked.filePath, 'r');
      const buffer = Buffer.alloc(bytesToRead);
      fs.readSync(fd, buffer, 0, bytesToRead, tracked.byteOffset);

      const text = buffer.toString('utf-8');
      const lines = text.split('\n');

      // If the last line is incomplete (no trailing newline), roll back
      let consumed = 0;
      const completeLines = text.endsWith('\n') ? lines.filter((l) => l.length > 0) : lines.slice(0, -1).filter((l) => l.length > 0);

      for (const line of completeLines) {
        consumed += Buffer.byteLength(line, 'utf-8') + 1; // +1 for \n
        this.processLine(line, tracked);
      }

      tracked.byteOffset += consumed;
    } catch (err) {
      console.error(`[FileWatcher] tail error for ${tracked.filePath}:`, err);
    } finally {
      if (fd !== null) {
        try {
          fs.closeSync(fd);
        } catch { /* ignore */ }
      }
    }
  }

  private processLine(line: string, tracked: TrackedFile): void {
    let entry: JSONLEntry;
    try {
      entry = JSON.parse(line);
    } catch {
      return; // Skip unparseable lines
    }

    // Extract cwd for project path if available
    if (entry.cwd && !tracked.projectPath.startsWith('/')) {
      tracked.projectPath = entry.cwd;
    }

    if (entry.type === 'assistant' && entry.message?.content) {
      const content = entry.message.content;
      if (Array.isArray(content)) {
        for (const block of content as ContentBlock[]) {
          this.processContentBlock(block, tracked);
        }
      }
    }
  }

  private processContentBlock(block: ContentBlock, tracked: TrackedFile): void {
    switch (block.type) {
      case 'tool_use': {
        const toolName = block.name || 'unknown';
        const input = block.input || {};
        const isEdit = isFileEditTool(toolName);
        const filePath = (input.file_path || input.notebook_path || input.path) as string | undefined;
        const message = summarizeToolInput(toolName, input);

        this.emitEvent(tracked, isEdit ? 'file_edit' : 'tool_use', message, {
          toolName,
          filePath: filePath || undefined,
          data: { toolId: block.id },
        });
        break;
      }
      case 'text': {
        if (block.text && block.text.length > 0) {
          const preview = block.text.slice(0, 200);
          this.emitEvent(tracked, 'message', preview);
        }
        break;
      }
      case 'thinking': {
        const thinking = block.thinking || block.text || '';
        if (thinking.length > 0) {
          this.emitEvent(tracked, 'thinking', `Thinking... (${thinking.length} chars)`);
        }
        break;
      }
    }
  }

  private emitEvent(
    tracked: TrackedFile,
    type: CodeEvent['type'],
    message: string,
    extra?: { toolName?: string; filePath?: string; data?: Record<string, unknown> }
  ): void {
    const event: CodeEvent = {
      id: crypto.randomUUID(),
      machineId: this.localMachineId,
      sessionId: tracked.sessionId,
      type,
      timestamp: Date.now(),
      message,
      source: 'local',
      ...(extra?.toolName && { toolName: extra.toolName }),
      ...(extra?.filePath && { filePath: extra.filePath }),
      ...(extra?.data && { data: extra.data }),
    };

    monitorState.addEvent(event);
  }

  private checkSessionTimeouts(): void {
    const now = Date.now();
    for (const tracked of this.trackedFiles.values()) {
      if (tracked.active && now - tracked.lastMtime > SESSION_TIMEOUT) {
        tracked.active = false;
        this.emitEvent(tracked, 'session_end', 'Session idle (no activity for 60s)');
      }
    }
  }

  private extractProjectPath(filePath: string, projectDir: string): string {
    // Try to read the first few lines to find cwd
    try {
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(4096);
      const bytesRead = fs.readSync(fd, buffer, 0, 4096, 0);
      fs.closeSync(fd);

      const text = buffer.toString('utf-8', 0, bytesRead);
      const firstLine = text.split('\n')[0];
      if (firstLine) {
        const entry = JSON.parse(firstLine);
        if (entry.cwd) return entry.cwd;
      }
    } catch {
      // Fall through
    }
    return projectDir;
  }
}

// Singleton on globalThis to survive HMR
const WATCHER_KEY = '__fileWatcher__';

export function getFileWatcher(): FileWatcher {
  const existing = (globalThis as Record<string, unknown>)[WATCHER_KEY] as FileWatcher | undefined;
  if (existing) return existing;

  const watcher = new FileWatcher();
  (globalThis as Record<string, unknown>)[WATCHER_KEY] = watcher;
  return watcher;
}
