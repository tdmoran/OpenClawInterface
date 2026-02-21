'use client';

import { HealthCards } from '@/components/dashboard/health-cards';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { TokenChart } from '@/components/dashboard/token-chart';
import { ActivityFeed } from '@/components/dashboard/activity-feed';

export default function DashboardPage() {
  return (
    <div className="space-y-4 md:space-y-6">
      <HealthCards />
      <StatsCards />
      <div className="grid gap-6 lg:grid-cols-2">
        <TokenChart />
        <ActivityFeed />
      </div>
    </div>
  );
}
