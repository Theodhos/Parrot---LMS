import { requireCurrentUser } from "@/lib/auth/session";
import { CommunityFeed } from "@/components/community/community-feed";

interface CommunityPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CommunityPage({ searchParams }: CommunityPageProps) {
  const user = await requireCurrentUser();
  const sp = await searchParams;
  const compose = typeof sp.compose === "string" ? sp.compose : undefined;

  return <CommunityFeed userName={user.name.split(" ")[0] ?? user.name} initialCompose={compose} />;
}
