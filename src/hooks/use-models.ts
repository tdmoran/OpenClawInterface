import { useState, useEffect } from 'react';

export interface ModelInfo {
  id: string;
  alias: string | null;
  isFallback: boolean;
  isPrimary: boolean;
}

export interface ModelsConfig {
  primary: string | null;
  fallbacks: string[];
  models: ModelInfo[];
}

const defaultConfig: ModelsConfig = { primary: null, fallbacks: [], models: [] };

let cached: ModelsConfig | null = null;

export function useModels(): ModelsConfig {
  const [config, setConfig] = useState<ModelsConfig>(cached || defaultConfig);

  useEffect(() => {
    if (cached) return;
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => {
        cached = data;
        setConfig(data);
      })
      .catch(() => {});
  }, []);

  return config;
}
