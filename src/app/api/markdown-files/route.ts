import { NextResponse } from 'next/server';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

export interface MdFile {
  name: string;
  path: string;
  content: string;
  category: 'workspace' | 'memory';
}

export async function GET() {
  const workspaceDir = join(homedir(), '.openclaw', 'workspace');
  const memoryDir = join(workspaceDir, 'memory');
  const files: MdFile[] = [];

  // Read workspace .md files
  try {
    const entries = await readdir(workspaceDir);
    const mdFiles = entries.filter((f) => f.endsWith('.md')).sort();
    for (const name of mdFiles) {
      try {
        const content = await readFile(join(workspaceDir, name), 'utf8');
        files.push({ name, path: join(workspaceDir, name), content, category: 'workspace' });
      } catch {
        // skip unreadable files
      }
    }
  } catch {
    // workspace dir doesn't exist
  }

  // Read daily memory logs
  try {
    const entries = await readdir(memoryDir);
    const mdFiles = entries.filter((f) => f.endsWith('.md')).sort().reverse();
    for (const name of mdFiles) {
      try {
        const content = await readFile(join(memoryDir, name), 'utf8');
        files.push({ name, path: join(memoryDir, name), content, category: 'memory' });
      } catch {
        // skip unreadable files
      }
    }
  } catch {
    // memory dir doesn't exist
  }

  return NextResponse.json({ files });
}
