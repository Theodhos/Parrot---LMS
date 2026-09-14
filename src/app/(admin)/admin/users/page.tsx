import { redirect } from "next/navigation";
import { UserFiltersBar } from "@/components/admin/user-filters-bar";
import { UsersTable } from "@/components/admin/users-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { requireCurrentUser } from "@/lib/auth/session";
import { listUsers } from "@/features/users/services/user.service";
import { listUsersQuerySchema } from "@/features/users/schemas/user.schema";
import { Role } from "@/generated/prisma";

interface AdminUsersPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function firstString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const user = await requireCurrentUser();
  if (user.role !== Role.ADMIN) {
    redirect("/admin/dashboard");
  }

  const sp = await searchParams;
  const search = firstString(sp.search);
  const role = firstString(sp.role);
  const pageParam = firstString(sp.page);

  const query = listUsersQuerySchema.parse({
    search: search || undefined,
    role: role || undefined,
    page: pageParam || undefined,
  });

  const { items, total, page, pageCount } = await listUsers(user, query);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm">
          {total} user{total === 1 ? "" : "s"} across the platform.
        </p>
      </div>

      <UserFiltersBar defaultValues={{ search, role }} />

      <UsersTable initialItems={items} currentUserId={user.id} />

      <AdminPagination page={page} pageCount={pageCount} basePath="/admin/users" params={{ search, role }} />
    </div>
  );
}
