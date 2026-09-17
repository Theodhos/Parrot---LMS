"use client";

import { useState } from "react";
import { Check, Users, Bell, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ScheduleEvent {
  id: string;
  dayOfWeek: string;
  date: string;
  title: string;
  time: string;
  description: string;
  actionLabel: string;
  doneLabel: string;
  actionStyle: "primary" | "secondary";
  icon: typeof Users;
}

interface ScheduleWeek {
  label: string;
  events: ScheduleEvent[];
}

const SCHEDULE: ScheduleWeek[] = [
  {
    label: "This week",
    events: [
      {
        id: "1",
        dayOfWeek: "THU",
        date: "May 16",
        title: "Coaching Call",
        time: "3:00 PM EST",
        description: "Live Q&A with a certified parrot trainer -- bring your questions.",
        actionLabel: "RSVP",
        doneLabel: "You're in",
        actionStyle: "primary",
        icon: Users,
      },
      {
        id: "2",
        dayOfWeek: "SAT",
        date: "May 18",
        title: "Practice Reminder",
        time: "All day",
        description: "Ten minutes with the speech board keeps the streak alive.",
        actionLabel: "Add to Calendar",
        doneLabel: "Added",
        actionStyle: "secondary",
        icon: Bell,
      },
    ],
  },
  {
    label: "Next week",
    events: [
      {
        id: "3",
        dayOfWeek: "TUE",
        date: "May 21",
        title: "Group Practice Session",
        time: "5:00 PM EST",
        description: "Join other families for a guided group practice over video.",
        actionLabel: "RSVP",
        doneLabel: "You're in",
        actionStyle: "primary",
        icon: Users,
      },
      {
        id: "4",
        dayOfWeek: "FRI",
        date: "May 24",
        title: "New Lesson Drop",
        time: "All day",
        description: "A new reading game unlocks in your library.",
        actionLabel: "Add to Calendar",
        doneLabel: "Added",
        actionStyle: "secondary",
        icon: Sparkles,
      },
    ],
  },
];

export function CalendarSchedule() {
  const [done, setDone] = useState<Record<string, boolean>>({});

  function handleAction(event: ScheduleEvent) {
    if (done[event.id]) return;
    setDone((prev) => ({ ...prev, [event.id]: true }));
    if (event.actionStyle === "primary") {
      toast.success(`You're in for ${event.title}.`, { description: `See you ${event.time.toLowerCase()}.` });
    } else {
      toast.success("Added to your calendar.", { description: `${event.title} · ${event.date}` });
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-10">
      <div className="rounded-[2.5rem] border border-[#f3ecd7] bg-[#FCF6ED] p-8 shadow-sm md:p-12">
        <h1 className="font-heading mb-2 text-3xl font-bold text-[#1f1737] md:text-4xl">Calendar</h1>
        <p className="text-base font-medium text-[#6D5D3B]">
          Coaching calls, practice reminders, and everything else on the schedule.
        </p>
      </div>

      {SCHEDULE.map((week) => (
        <div key={week.label} className="flex flex-col gap-3">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#FF5757]">{week.label}</span>
          <div className="flex flex-col gap-4">
            {week.events.map((event) => {
              const isDone = Boolean(done[event.id]);
              const Icon = event.icon;
              return (
                <div
                  key={event.id}
                  className="flex flex-col gap-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:p-8"
                >
                  <div className="flex w-14 shrink-0 flex-col items-center justify-center pt-1">
                    <div className="flex h-5 w-full items-center justify-center rounded-t-md bg-[#3B82F6] text-[10px] font-bold text-white">
                      {event.dayOfWeek}
                    </div>
                    <div className="flex h-9 w-full items-center justify-center rounded-b-md border border-t-0 border-[#E5E7EB] text-sm font-bold text-[#1F2937]">
                      {event.date.split(" ")[1]}
                    </div>
                  </div>

                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#E6F3FB] text-[#3B82F6]">
                    <Icon className="size-5" />
                  </span>

                  <div className="flex flex-1 flex-col">
                    <span className="font-heading font-semibold text-[#1F2937]">{event.title}</span>
                    <span className="text-xs text-muted-foreground">{event.time}</span>
                    <p className="mt-1 text-sm text-[#4B5563]">{event.description}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAction(event)}
                    disabled={isDone}
                    className={cn(
                      "flex shrink-0 items-center justify-center gap-1 rounded-full px-4 py-2 text-xs font-bold transition-colors",
                      isDone
                        ? "bg-gray-100 text-gray-500"
                        : event.actionStyle === "primary"
                          ? "bg-[#3B82F6] text-white hover:bg-blue-600"
                          : "bg-[#E8F5E9] text-[#10B981] hover:bg-green-100",
                    )}
                  >
                    {isDone && <Check className="size-3.5" />}
                    {isDone ? event.doneLabel : event.actionLabel}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
