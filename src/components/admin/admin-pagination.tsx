import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AdminPaginationProps {
  page: number;
  pageCount: number;
  basePath: string;
  /** Current filter values to preserve across page links (page itself is set per-link). */
  params?: Record<string, string | undefined>;
}

/** Server-rendered Link-based pagination -- no client JS required. */
export function AdminPagination({ page, pageCount, basePath, params = {} }: AdminPaginationProps) {
  if (pageCount <= 1) return null;

  function hrefFor(p: number) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    search.set("page", String(p));
    return `${basePath}?${search.toString()}`;
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
        <Button
          key={p}
          size="sm"
          variant={p === page ? "default" : "outline"}
          className={cn("!rounded-full")}
          render={<Link href={hrefFor(p)}>{p}</Link>}
        />
      ))}
    </div>
  );
}
