/** Counts consecutive calendar days (UTC) of activity, walking back from today or yesterday. */
export function computeStreakDays(occurredAtDates: Date[]): number {
  if (occurredAtDates.length === 0) return 0;

  const dayKeys = new Set(occurredAtDates.map((d) => d.toISOString().slice(0, 10)));

  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  const todayKey = cursor.toISOString().slice(0, 10);

  if (!dayKeys.has(todayKey)) {
    // No activity today yet — the streak can still be "alive" if yesterday had activity.
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!dayKeys.has(cursor.toISOString().slice(0, 10))) return 0;
  }

  let streak = 0;
   
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!dayKeys.has(key)) break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
