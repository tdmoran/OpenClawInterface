/**
 * Cron utility functions for parsing and displaying cron expressions.
 * Handles common cron patterns without external dependencies.
 */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Convert a cron expression to a human-readable string.
 * Supports standard 5-field cron: minute hour day-of-month month day-of-week
 */
export function cronToHuman(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return expr;

  const [minute, hour, dom, month, dow] = parts;

  // Every minute: * * * * *
  if (minute === '*' && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    return 'Every minute';
  }

  // Every N minutes: */N * * * *
  const everyMinMatch = minute.match(/^\*\/(\d+)$/);
  if (everyMinMatch && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    const n = parseInt(everyMinMatch[1], 10);
    if (n === 1) return 'Every minute';
    return `Every ${n} minutes`;
  }

  // Every N hours: 0 */N * * *
  const everyHourMatch = hour.match(/^\*\/(\d+)$/);
  if (minute === '0' && everyHourMatch && dom === '*' && month === '*' && dow === '*') {
    const n = parseInt(everyHourMatch[1], 10);
    if (n === 1) return 'Every hour';
    return `Every ${n} hours`;
  }

  // Hourly at specific minute: N * * * *
  if (/^\d+$/.test(minute) && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    const m = parseInt(minute, 10);
    if (m === 0) return 'Every hour';
    return `Every hour at :${m.toString().padStart(2, '0')}`;
  }

  // Daily at specific time: M H * * *
  if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && dom === '*' && month === '*' && dow === '*') {
    return `Daily at ${formatTime(parseInt(hour, 10), parseInt(minute, 10))}`;
  }

  // Weekly on specific day: M H * * D
  if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && dom === '*' && month === '*' && /^\d+$/.test(dow)) {
    const dayIdx = parseInt(dow, 10);
    const dayName = WEEKDAYS[dayIdx] || `day ${dayIdx}`;
    return `Weekly on ${dayName} at ${formatTime(parseInt(hour, 10), parseInt(minute, 10))}`;
  }

  // Monthly on specific day: M H D * *
  if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && /^\d+$/.test(dom) && month === '*' && dow === '*') {
    const dayNum = parseInt(dom, 10);
    return `Monthly on the ${ordinal(dayNum)} at ${formatTime(parseInt(hour, 10), parseInt(minute, 10))}`;
  }

  return expr;
}

/**
 * Calculate the next N run times for a cron expression.
 * Simple implementation for common patterns.
 */
export function getNextRuns(expr: string, count: number = 3): Date[] {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return [];

  const [minuteExpr, hourExpr, domExpr, , dowExpr] = parts;
  const runs: Date[] = [];
  const now = new Date();
  const cursor = new Date(now);
  // Start from next minute
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  const maxIterations = 525600; // one year of minutes as safety bound
  let iterations = 0;

  while (runs.length < count && iterations < maxIterations) {
    iterations++;

    if (matchesCronField(cursor.getMinutes(), minuteExpr) &&
        matchesCronField(cursor.getHours(), hourExpr) &&
        matchesCronField(cursor.getDate(), domExpr) &&
        matchesCronField(cursor.getDay(), dowExpr)) {
      runs.push(new Date(cursor));
    }

    cursor.setMinutes(cursor.getMinutes() + 1);
  }

  return runs;
}

/**
 * Convert an interval value and unit to total minutes.
 */
export function intervalToMinutes(value: number, unit: 'minutes' | 'hours' | 'days'): number {
  switch (unit) {
    case 'minutes':
      return value;
    case 'hours':
      return value * 60;
    case 'days':
      return value * 60 * 24;
  }
}

/**
 * Convert an interval in minutes to a cron expression.
 */
export function intervalToCron(minutes: number): string {
  if (minutes < 60) {
    return `*/${minutes} * * * *`;
  }
  const hours = minutes / 60;
  if (Number.isInteger(hours) && hours < 24) {
    return `0 */${hours} * * *`;
  }
  // Fallback to minute-based
  return `*/${minutes} * * * *`;
}

// -- Internal helpers --

function matchesCronField(value: number, expr: string): boolean {
  if (expr === '*') return true;

  // */N step
  const stepMatch = expr.match(/^\*\/(\d+)$/);
  if (stepMatch) {
    return value % parseInt(stepMatch[1], 10) === 0;
  }

  // Exact value
  if (/^\d+$/.test(expr)) {
    return value === parseInt(expr, 10);
  }

  // Comma-separated list
  if (expr.includes(',')) {
    return expr.split(',').some((v) => value === parseInt(v.trim(), 10));
  }

  // Range: N-M
  const rangeMatch = expr.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    return value >= start && value <= end;
  }

  return false;
}

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
