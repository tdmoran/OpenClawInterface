import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

export async function GET() {
  try {
    const configPath = join(homedir(), '.openclaw', 'openclaw.json');
    const raw = await readFile(configPath, 'utf8');
    const cfg = JSON.parse(raw);

    const agentDefaults = cfg.agents?.defaults || {};
    const modelConfig = agentDefaults.model || {};
    const models = agentDefaults.models || {};

    const filteredModels = Object.entries(models)
      .filter(([id]) => !id.startsWith('openai-codex/'))
      .map(([id, meta]) => ({
        id,
        alias: (meta as Record<string, string>)?.alias || null,
        isFallback: (modelConfig.fallbacks || []).includes(id),
        isPrimary: modelConfig.primary === id,
      }));

    return NextResponse.json({
      primary: modelConfig.primary || null,
      fallbacks: modelConfig.fallbacks || [],
      models: filteredModels,
    });
  } catch {
    return NextResponse.json({ primary: null, fallbacks: [], models: [] }, { status: 500 });
  }
}
