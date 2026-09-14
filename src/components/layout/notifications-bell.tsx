"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/me/notifications?pageSize=8");
      const json = await res.json();
      if (json.success) {
        setItems(json.data);
        setUnreadCount(json.meta?.unreadCount ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Fetching on mount + polling, not deriving state from props/state --
    // the setState calls happen inside load()'s async continuation, not
    // synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  async function markAllRead() {
    await fetch("/api/me/notifications", { method: "PATCH" });
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  async function markRead(id: string) {
    await fetch(`/api/me/notifications/${id}`, { method: "PATCH" });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (next) load(); }}>
      <PopoverTrigger className="relative flex size-9 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-medium">Notifications</p>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="h-7 gap-1 text-xs">
              <CheckCheck className="size-3.5" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {items.length === 0 && !loading && (
            <p className="p-4 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
          )}
          <div className="flex flex-col">
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.read && markRead(n.id)}
                className="flex flex-col gap-0.5 border-b px-3 py-2.5 text-left last:border-b-0 hover:bg-muted"
              >
                <div className="flex items-center gap-2">
                  {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                  <p className="text-sm font-medium">{n.title}</p>
                </div>
                <p className="text-xs text-muted-foreground">{n.message}</p>
                <p className="text-[10px] text-muted-foreground">{formatRelativeTime(n.createdAt)}</p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
