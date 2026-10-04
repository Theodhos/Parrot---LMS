"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { CalendarDays, Pencil, Plus, Trash2, Users } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { eventDateParts } from "@/components/calendar/event-row";
import { useMounted } from "@/hooks/use-mounted";
import {
  createEventAction,
  deleteEventAction,
  listAttendeesAction,
  updateEventAction,
} from "@/features/calendar/actions/calendar.actions";
import type { CalendarEventDTO } from "@/features/calendar/types/calendar.types";
import { CalendarEventKind } from "@/generated/prisma";

const KIND_OPTIONS: { value: CalendarEventKind; label: string; hint: string }[] = [
  { value: CalendarEventKind.CALL, label: "Live call", hint: "Members RSVP and get the join link" },
  { value: CalendarEventKind.SESSION, label: "Group session", hint: "Members RSVP and get the join link" },
  { value: CalendarEventKind.REMINDER, label: "Reminder", hint: "No RSVP -- members can add it to their calendar" },
  { value: CalendarEventKind.RELEASE, label: "New content", hint: "No RSVP -- announces a release date" },
];
const KIND_LABEL = Object.fromEntries(KIND_OPTIONS.map((o) => [o.value, o.label])) as Record<CalendarEventKind, string>;

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

interface FormState {
  title: string;
  description: string;
  kind: CalendarEventKind;
  allDay: boolean;
  /** yyyy-mm-dd, used when the event is all day. */
  date: string;
  /** yyyy-mm-ddThh:mm in the admin's own time zone, as <input type="datetime-local"> gives it. */
  start: string;
  end: string;
  joinUrl: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
/** An ISO timestamp as the local value a datetime-local input expects. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const emptyForm: FormState = {
  title: "",
  description: "",
  kind: CalendarEventKind.CALL,
  allDay: false,
  date: "",
  start: "",
  end: "",
  joinUrl: "",
};

function formFrom(event: CalendarEventDTO): FormState {
  return {
    title: event.title,
    description: event.description ?? "",
    kind: event.kind,
    allDay: event.allDay,
    // An all-day event is stored at 12:00 UTC of its date.
    date: event.allDay ? event.startsAt.slice(0, 10) : "",
    start: event.allDay ? "" : toLocalInput(event.startsAt),
    end: !event.allDay && event.endsAt ? toLocalInput(event.endsAt) : "",
    joinUrl: event.joinUrl ?? "",
  };
}

export function CalendarManager({ initialEvents }: { initialEvents: CalendarEventDTO[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [editing, setEditing] = useState<CalendarEventDTO | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<CalendarEventDTO | null>(null);
  const [attendees, setAttendees] = useState<{ event: CalendarEventDTO; people: { id: string; name: string; email: string }[] } | null>(null);
  const [pending, startTransition] = useTransition();
  const mounted = useMounted();
  // Read the clock once, when the page opens, rather than on every render.
  const [openedAt] = useState(() => Date.now());

  const sorted = [...events].sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  function openNew() {
    setForm(emptyForm);
    setFormError(null);
    setEditing("new");
  }

  function openEdit(event: CalendarEventDTO) {
    setForm(formFrom(event));
    setFormError(null);
    setEditing(event);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (form.allDay ? !form.date : !form.start) {
      setFormError("Choose when the event takes place.");
      return;
    }
    const startsAt = form.allDay ? `${form.date}T12:00:00.000Z` : new Date(form.start).toISOString();
    const endsAt = !form.allDay && form.end ? new Date(form.end).toISOString() : null;
    const base = {
      title: form.title,
      kind: form.kind,
      allDay: form.allDay,
      startsAt,
    };

    startTransition(async () => {
      const result =
        editing === "new"
          ? await createEventAction({
              ...base,
              description: form.description.trim() || undefined,
              endsAt: endsAt ?? undefined,
              joinUrl: form.joinUrl.trim() || undefined,
            })
          : await updateEventAction((editing as CalendarEventDTO).id, {
              ...base,
              description: form.description.trim() || null,
              endsAt,
              joinUrl: form.joinUrl.trim() || null,
            });

      if (!result.success) {
        setFormError(result.error);
        return;
      }
      setEvents((prev) =>
        editing === "new" ? [...prev, result.data] : prev.map((ev) => (ev.id === result.data.id ? result.data : ev)),
      );
      toast.success(editing === "new" ? "Event created." : "Event updated.");
      setEditing(null);
    });
  }

  function handleDelete() {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const result = await deleteEventAction(target.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setEvents((prev) => prev.filter((ev) => ev.id !== target.id));
      toast.success(`"${target.title}" deleted.`);
      setDeleting(null);
    });
  }

  function showAttendees(event: CalendarEventDTO) {
    startTransition(async () => {
      const result = await listAttendeesAction(event.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setAttendees({ event, people: result.data });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={openNew}>
          <Plus />
          New event
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed py-16 text-center">
          <CalendarDays className="text-muted-foreground size-7" />
          <p className="font-medium">No events yet</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            Create a live call, a group session or a reminder. Members see it on their calendar right away.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>RSVPs</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((event) => {
                const parts = mounted ? eventDateParts(event) : null;
                const past = mounted && new Date(event.endsAt ?? event.startsAt).getTime() < openedAt - 2 * 60 * 60 * 1000;
                return (
                  <TableRow key={event.id} className={past ? "opacity-60" : undefined}>
                    <TableCell className="whitespace-nowrap">
                      {parts ? (
                        <>
                          <span className="font-medium">
                            {parts.weekday} {parts.day} {parts.month}
                          </span>
                          <p className="text-muted-foreground text-xs">{parts.time}</p>
                        </>
                      ) : (
                        " "
                      )}
                    </TableCell>
                    <TableCell className="max-w-72 whitespace-normal">
                      <span className="font-medium">{event.title}</span>
                      {past && (
                        <Badge variant="outline" className="ml-2">
                          Past
                        </Badge>
                      )}
                      {event.hasJoinLink && <p className="text-muted-foreground text-xs">Has a join link</p>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{KIND_LABEL[event.kind]}</Badge>
                    </TableCell>
                    <TableCell>
                      {event.takesRsvp ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending || !event.canManage}
                          onClick={() => showAttendees(event)}
                          aria-label={`Show who is going to ${event.title}`}
                        >
                          <Users className="size-3.5" />
                          {event.rsvpCount}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">Not needed</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {event.canManage ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(event)}>
                            <Pencil />
                            <span className="sr-only">Edit event</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleting(event)}
                          >
                            <Trash2 />
                            <span className="sr-only">Delete event</span>
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Created by someone else</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && !pending && setEditing(null)}>
        <DialogContent className="w-full max-w-lg sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "New event" : "Edit event"}</DialogTitle>
            <DialogDescription>Times are entered in your own time zone and shown to each member in theirs.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-title">Title</Label>
              <Input
                id="event-title"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                required
                minLength={2}
                maxLength={120}
                placeholder="Coaching Call"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-kind">Type</Label>
              <select
                id="event-kind"
                value={form.kind}
                onChange={(e) => set("kind", e.target.value as CalendarEventKind)}
                className={selectClassName}
              >
                {KIND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-muted-foreground text-xs">{KIND_OPTIONS.find((o) => o.value === form.kind)?.hint}</p>
            </div>

            <label className="flex items-center gap-2.5 text-sm font-medium">
              <Switch checked={form.allDay} onCheckedChange={(checked) => set("allDay", checked)} />
              All day
            </label>

            {form.allDay ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="event-date">Date</Label>
                <Input id="event-date" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="event-start">Starts</Label>
                  <Input
                    id="event-start"
                    type="datetime-local"
                    value={form.start}
                    onChange={(e) => set("start", e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="event-end">Ends (optional)</Label>
                  <Input id="event-end" type="datetime-local" value={form.end} onChange={(e) => set("end", e.target.value)} />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                maxLength={2000}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-join-url">Join link</Label>
              <Input
                id="event-join-url"
                type="url"
                value={form.joinUrl}
                onChange={(e) => set("joinUrl", e.target.value)}
                placeholder="https://zoom.us/j/..."
              />
              <p className="text-muted-foreground text-xs">
                For a live call or group session, members see this link only after they RSVP.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" disabled={pending} onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : editing === "new" ? "Create event" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleting?.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              The event disappears from every member&apos;s calendar and its RSVPs are removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={pending} onClick={handleDelete}>
              {pending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={attendees !== null} onOpenChange={(open) => !open && setAttendees(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Who is going</DialogTitle>
            <DialogDescription>{attendees?.event.title}</DialogDescription>
          </DialogHeader>
          {attendees && attendees.people.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nobody has signed up yet.</p>
          ) : (
            <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto text-sm">
              {attendees?.people.map((person) => (
                <li key={person.id} className="flex flex-col rounded-lg border px-3 py-2">
                  <span className="font-medium">{person.name}</span>
                  <span className="text-muted-foreground text-xs">{person.email}</span>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
