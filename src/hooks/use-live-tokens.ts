'use client';

import { useState, useEffect, useRef } from 'react';

interface TokenCounts {
  prompt: number;
  completion: number;
  total: number;
}

interface LiveTokenResult {
  tokens: TokenCounts;
  cost: number;
  tokensPerSecond: number;
}

// Rough pricing per 1K tokens (blended estimate for demo)
const COST_PER_1K_PROMPT: Record<string, number> = {
  'claude-opus-4-6': 0.015,
  'claude-sonnet-4-6': 0.003,
  'claude-haiku-4-5': 0.00025,
};
const COST_PER_1K_COMPLETION: Record<string, number> = {
  'claude-opus-4-6': 0.075,
  'claude-sonnet-4-6': 0.015,
  'claude-haiku-4-5': 0.00125,
};

export function useLiveTokens(
  initialTokens: TokenCounts,
  model: string,
  active: boolean,
): LiveTokenResult {
  const [tokens, setTokens] = useState<TokenCounts>(initialTokens);
  const lastTick = useRef(Date.now());
  const accumulated = useRef(0);

  useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const dt = now - lastTick.current;
      lastTick.current = now;
      accumulated.current += dt;

      setTokens((prev) => {
        // Prompt tokens: ~100-300 per tick (every ~1.5s)
        const promptDelta = Math.floor(Math.random() * 200) + 100;
        // Completion tokens: ~40-120 per tick
        const completionDelta = Math.floor(Math.random() * 80) + 40;

        const prompt = prev.prompt + promptDelta;
        const completion = prev.completion + completionDelta;
        return { prompt, completion, total: prompt + completion };
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [active]);

  const promptRate = COST_PER_1K_PROMPT[model] ?? 0.003;
  const completionRate = COST_PER_1K_COMPLETION[model] ?? 0.015;
  const cost =
    (tokens.prompt / 1000) * promptRate +
    (tokens.completion / 1000) * completionRate;

  const elapsed = Math.max((Date.now() - (Date.now() - accumulated.current)) / 1000, 1);
  const tokensPerSecond = Math.round(tokens.total / Math.max(elapsed, 1));

  return { tokens, cost, tokensPerSecond };
}
