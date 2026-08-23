export const PX_PER_MINUTE = 2;
export const GRID_START_MINUTES = 8 * 60;
export const GRID_END_MINUTES = 20 * 60;

export function minutesSinceMidnight(time: string): number {
  const [hoursStr, minutesStr] = time.split(":");
  return Number(hoursStr) * 60 + Number(minutesStr);
}

export function blockTop(appointmentTime: string): number {
  return (minutesSinceMidnight(appointmentTime) - GRID_START_MINUTES) * PX_PER_MINUTE;
}

export function blockHeight(durationMinutes: number): number {
  return durationMinutes * PX_PER_MINUTE;
}

function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatTimeRange(startTime: string, durationMinutes: number): string {
  const startMinutes = minutesSinceMidnight(startTime);
  const endMinutes = startMinutes + durationMinutes;
  return `${formatMinutes(startMinutes)} – ${formatMinutes(endMinutes)}`;
}

interface OverlappableAppointment {
  id: string;
  appointment_time: string;
  service_duration_minutes: number;
}

function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function clusterOverlaps<T extends OverlappableAppointment>(appointments: T[]): T[][] {
  const groups: T[][] = [];
  const groupRanges: { start: number; end: number }[] = [];

  for (const appt of appointments) {
    const start = minutesSinceMidnight(appt.appointment_time);
    const end = start + appt.service_duration_minutes;

    const matchingGroupIndex = groups.findIndex((_, i) =>
      intervalsOverlap(start, end, groupRanges[i].start, groupRanges[i].end)
    );

    if (matchingGroupIndex === -1) {
      groups.push([appt]);
      groupRanges.push({ start, end });
    } else {
      groups[matchingGroupIndex].push(appt);
      groupRanges[matchingGroupIndex] = {
        start: Math.min(groupRanges[matchingGroupIndex].start, start),
        end: Math.max(groupRanges[matchingGroupIndex].end, end),
      };
    }
  }

  return groups;
}
