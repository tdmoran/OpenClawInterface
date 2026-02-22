import type { Session } from '@/types/session';

/**
 * Trigger a file download in the browser by creating a temporary link element.
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data as a formatted JSON file download.
 */
export function exportToJSON(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, filename.endsWith('.json') ? filename : `${filename}.json`);
}

/**
 * Escape a value for CSV output — wraps in quotes if it contains commas,
 * quotes, or newlines.
 */
function escapeCSV(value: unknown): string {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface CSVColumn<T> {
  header: string;
  accessor: (row: T) => unknown;
}

/**
 * Export data as a CSV file download.
 */
export function exportToCSV<T>(
  data: T[],
  columns: CSVColumn<T>[],
  filename: string,
): void {
  const headerRow = columns.map((c) => escapeCSV(c.header)).join(',');
  const rows = data.map((row) =>
    columns.map((c) => escapeCSV(c.accessor(row))).join(','),
  );
  const csv = [headerRow, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

/**
 * Default CSV columns for session data.
 */
export const sessionCSVColumns: CSVColumn<Session>[] = [
  { header: 'Session ID', accessor: (s) => s.id },
  { header: 'Agent ID', accessor: (s) => s.agentId },
  { header: 'Agent Name', accessor: (s) => s.agentName },
  { header: 'Channel', accessor: (s) => s.channel },
  { header: 'Status', accessor: (s) => s.status },
  { header: 'Model', accessor: (s) => s.model },
  { header: 'Started At', accessor: (s) => new Date(s.startedAt).toISOString() },
  { header: 'Ended At', accessor: (s) => (s.endedAt ? new Date(s.endedAt).toISOString() : '') },
  { header: 'Prompt Tokens', accessor: (s) => s.tokenUsage.prompt },
  { header: 'Completion Tokens', accessor: (s) => s.tokenUsage.completion },
  { header: 'Total Tokens', accessor: (s) => s.tokenUsage.total },
  { header: 'Cost', accessor: (s) => s.cost.toFixed(4) },
  { header: 'Messages', accessor: (s) => s.messageCount },
  { header: 'Tool Calls', accessor: (s) => s.toolCallCount },
];
