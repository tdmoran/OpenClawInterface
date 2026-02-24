import { SessionTable } from '@/components/sessions/session-table';

export default function SessionsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Sessions</h2>
        <p className="text-sm text-muted-foreground">Browse and inspect past and active sessions</p>
      </div>
      <SessionTable />
    </div>
  );
}
