import { MemoryViewer } from '@/components/memory/memory-viewer';

export default function MemoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Memory Browser</h2>
        <p className="text-sm text-muted-foreground">View agent memory, daily logs, and search past context</p>
      </div>
      <MemoryViewer />
    </div>
  );
}
