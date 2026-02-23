export function getCodeMonitorBaseUrl(): string {
  return process.env.NEXT_PUBLIC_CODE_MONITOR_URL?.replace(/\/+$/, '') || '';
}
