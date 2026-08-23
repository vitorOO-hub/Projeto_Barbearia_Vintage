import { addDays, addWeeks, format, startOfWeek } from "date-fns";

export const TIME_SLOTS: string[] = Array.from({ length: 24 }, (_, i) => {
  const totalMinutes = 8 * 60 + i * 30;
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
});

export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 0 });
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function shiftWeek(weekStart: Date, deltaWeeks: number): Date {
  return addWeeks(weekStart, deltaWeeks);
}

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function slotForTime(time: string): string {
  const [hoursStr, minutesStr] = time.split(":");
  const totalMinutes = Number(hoursStr) * 60 + Number(minutesStr);
  const flooredMinutes = Math.floor(totalMinutes / 30) * 30;
  const hours = String(Math.floor(flooredMinutes / 60)).padStart(2, "0");
  const minutes = String(flooredMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}
