import { SessionDetail } from '@/components/sessions/session-detail';
import { mockSessions } from '@/lib/mock-data';
import { notFound } from 'next/navigation';

interface SessionDetailPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionDetailPage({ params }: SessionDetailPageProps) {
  const { sessionId } = await params;
  const session = mockSessions.find((s) => s.id === sessionId);

  if (!session) {
    notFound();
  }

  return <SessionDetail session={session} />;
}
