"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { updateUserRoleAction } from "@/features/users/actions/admin-user.actions";
import { Role } from "@/generated/prisma";
import { formatDate } from "@/lib/utils";

const ROLE_THEME: Record<Role, string> = {
  STUDENT: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  INSTRUCTOR: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  ADMIN: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

const selectClassName =
  "h-7 rounded-lg border border-input bg-transparent px-2 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  image: string | null;
  createdAt: Date;
  _count: { enrollments: number; coursesTaught: number };
}

export interface UsersTableProps {
  initialItems: UserListItem[];
  currentUserId: string;
  /** Only admins may change roles; the server enforces it regardless of this flag. */
  canChangeRoles?: boolean;
}

function initials(name: string) {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export function UsersTable({
  initialItems,
  currentUserId,
  canChangeRoles = true,
}: UsersTableProps) {
  const [items, setItems] = useState(initialItems);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleRoleChange(userId: string, role: Role) {
    const previous = items;
    setPendingId(userId);
    setItems((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    const result = await updateUserRoleAction(userId, role);
    if (result.success) {
      toast.success("Role updated.");
    } else {
      toast.error(result.error ?? "Failed to update role.");
      setItems(previous);
    }
    setPendingId(null);
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed py-16 text-center">
        <p className="font-medium">No users match your filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Enrollments</TableHead>
            <TableHead>Courses taught</TableHead>
            {canChangeRoles && <TableHead className="text-right">Change role</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <Avatar size="sm">
                    {u.image && <AvatarImage src={u.image} alt={u.name} />}
                    <AvatarFallback>{initials(u.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">{u.name}</span>
                    <span className="text-muted-foreground text-xs">{u.email}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`border-transparent font-medium ${ROLE_THEME[u.role]}`}
                >
                  {u.role}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
              <TableCell>{u._count.enrollments}</TableCell>
              <TableCell>{u._count.coursesTaught}</TableCell>
              {canChangeRoles && (
                <TableCell className="text-right">
                  <select
                    value={u.role}
                    disabled={pendingId === u.id || u.id === currentUserId}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                    className={selectClassName}
                    title={u.id === currentUserId ? "You can't change your own role" : undefined}
                  >
                    {Object.values(Role).map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
