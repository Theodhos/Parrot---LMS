import { requireCurrentUser } from "@/lib/auth/session";
import { CalendarSchedule } from "@/components/calendar/calendar-schedule";

export default async function CalendarPage() {
  await requireCurrentUser();
  return <CalendarSchedule />;
}
