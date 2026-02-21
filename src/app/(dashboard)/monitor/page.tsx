import { LogStream } from '@/components/monitor/log-stream';
import { SessionCards } from '@/components/monitor/session-cards';
import { QueueViz } from '@/components/monitor/queue-viz';

export default function MonitorPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LogStream />
        </div>
        <div className="space-y-6">
          <SessionCards />
          <QueueViz />
        </div>
      </div>
    </div>
  );
}
