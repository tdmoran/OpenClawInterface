'use client';

import { use } from 'react';
import { SessionDetail } from '@/components/sessions/session-detail';
import { useSessionsStore } from '@/stores/sessions-store';
import { notFound } from 'next/navigation';

interface SessionDetailPageProps {
  params: Promise<{ sessionId: string }>;
}

export default function SessionDetailPage({ params }: SessionDetailPageProps) {
  const { sessionId } = use(params);
  const sessions = useSessionsStore((s) => s.sessions);
  const session = sessions.get(sessionId);

  if (!session) {
    notFound();
  }

  return <SessionDetail session={session} />;
}
