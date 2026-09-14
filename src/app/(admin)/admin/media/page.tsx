import { redirect } from "next/navigation";
import { MediaLibrary } from "@/components/admin/media-library";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { requireCurrentUser } from "@/lib/auth/session";
import { listAllMedia } from "@/features/media/services/media.service";
import { Role } from "@/generated/prisma";

interface AdminMediaPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const PAGE_SIZE = 24;

export default async function AdminMediaPage({ searchParams }: AdminMediaPageProps) {
  const user = await requireCurrentUser();
  // media.service's listAllMedia is hard ADMIN-only (see its requireRole call), so this page is
  // too -- an instructor hitting the service directly would otherwise 500 instead of a clean redirect.
  if (user.role !== Role.ADMIN) {
    redirect("/admin/dashboard");
  }
  const sp = await searchParams;
  const pageParam = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const page = Math.max(1, Number(pageParam) || 1);

  const { items, total, pageCount } = await listAllMedia(user, page, PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Media library</h1>
        <p className="text-muted-foreground text-sm">
          {total} file{total === 1 ? "" : "s"} uploaded across the platform.
        </p>
      </div>

      <MediaLibrary initialItems={items} />

      <AdminPagination page={page} pageCount={pageCount} basePath="/admin/media" />
    </div>
  );
}
