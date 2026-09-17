"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  dayOfWeek: string;
  date: string;
  title: string;
  time: string;
  actionLabel: string;
  doneLabel: string;
  actionStyle: "primary" | "secondary";
}

const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: "1",
    dayOfWeek: "THU",
    date: "May 16",
    title: "Coaching Call",
    time: "3:00 PM EST",
    actionLabel: "RSVP",
    doneLabel: "You're in",
    actionStyle: "primary",
  },
  {
    id: "2",
    dayOfWeek: "SAT",
    date: "May 18",
    title: "Practice Reminder",
    time: "All day",
    actionLabel: "Add to Calendar",
    doneLabel: "Added",
    actionStyle: "secondary",
  },
];

export function ThisWeekCard() {
  const [done, setDone] = useState<Record<string, boolean>>({});

  function handleAction(event: CalendarEvent) {
    if (done[event.id]) return;
    setDone((prev) => ({ ...prev, [event.id]: true }));
    if (event.actionStyle === "primary") {
      toast.success(`You're in for ${event.title}.`, { description: `See you ${event.time.toLowerCase()}.` });
    } else {
      toast.success("Added to your calendar.", { description: `${event.title} · ${event.date}` });
    }
  }

  return (
    <div className="flex flex-col bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
      <span className="text-[11px] font-bold tracking-widest text-[#FF5757] uppercase mb-6">
        This Week
      </span>

      <div className="flex flex-col gap-4 mb-6">
        {MOCK_EVENTS.map((event) => {
          const isDone = Boolean(done[event.id]);
          return (
            <div key={event.id} className="flex items-center gap-4">
              <div className="flex flex-col items-center justify-center shrink-0 w-12 pt-1">
                <div className="flex items-center justify-center w-full h-5 bg-[#3B82F6] rounded-t-md text-white text-[10px] font-bold">
                  {event.dayOfWeek}
                </div>
                <div className="flex items-center justify-center w-full h-8 bg-white border border-t-0 border-[#E5E7EB] rounded-b-md text-[#1F2937] text-xs font-bold">
                  {event.date.split(" ")[1]}
                </div>
              </div>
              <div className="flex flex-col flex-1">
                <span className="font-heading font-semibold text-[#1F2937]">{event.title}</span>
                <span className="text-xs text-muted-foreground">{event.time}</span>
              </div>
              <button
                type="button"
                onClick={() => handleAction(event)}
                disabled={isDone}
                className={cn(
                  "flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-bold transition-colors",
                  isDone
                    ? "bg-gray-100 text-gray-500"
                    : event.actionStyle === "primary"
                      ? "bg-[#3B82F6] hover:bg-blue-600 text-white"
                      : "bg-[#E8F5E9] hover:bg-green-100 text-[#10B981]",
                )}
              >
                {isDone && <Check className="size-3.5" />}
                {isDone ? event.doneLabel : event.actionLabel}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-auto pt-4 border-t border-gray-100 flex justify-center">
        <Link href="/calendar" className="flex items-center gap-2 text-sm font-bold text-[#3B82F6] hover:text-blue-700 transition-colors">
          View Full Calendar
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
