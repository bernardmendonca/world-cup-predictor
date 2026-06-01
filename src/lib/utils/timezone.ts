import type { TimeZoneDisplay } from "../types";

/**
 * Convert a UTC date to display strings in three time zones.
 */
export function formatTimeZones(utcDate: Date): TimeZoneDisplay {
  return {
    eastern: formatInTimeZone(utcDate, "America/New_York"),
    uk: formatInTimeZone(utcDate, "Europe/London"),
    ist: formatInTimeZone(utcDate, "Asia/Kolkata"),
  };
}

function formatInTimeZone(date: Date, timeZone: string): string {
  return date.toLocaleString("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
