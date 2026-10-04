import { requireCurrentUser } from "@/lib/auth/session";
import { CommunityFeed } from "@/components/community/community-feed";
import { listPosts } from "@/features/community/services/community.service";
import { listUpcomingEvents } from "@/features/calendar/services/calendar.service";
import { CalendarEventKind } from "@/generated/prisma";

interface CommunityPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CommunityPage({ searchParams }: CommunityPageProps) {
  const user = await requireCurrentUser();
  const sp = await searchParams;
  const compose = typeof sp.compose === "string" ? sp.compose : undefined;

  const [initialPage, events] = await Promise.all([listPosts(user), listUpcomingEvents(user, { limit: 20 })]);
  const nextCall = events.find((event) => event.kind === CalendarEventKind.CALL || event.kind === CalendarEventKind.SESSION) ?? null;

  return <CommunityFeed initialPage={initialPage} initialCompose={compose} nextCall={nextCall} />;
}
