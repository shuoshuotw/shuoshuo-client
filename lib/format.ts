// A fixed zone, so the server and the browser render the same text
const dateFormat = new Intl.DateTimeFormat("zh-Hant-TW", { dateStyle: "medium", timeZone: "Asia/Taipei" });
const timeFormat = new Intl.DateTimeFormat("zh-Hant-TW", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Taipei" });

export const formatDate = (iso: string) => dateFormat.format(new Date(iso));
export const formatTime = (iso: string) => timeFormat.format(new Date(iso));

const stampFormat = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Taipei" });

/** 2026/11/06 20:50: the back office's records, where times are compared down the column (audit log, a case's start). */
export function formatStamp(iso: string) {
  const part = Object.fromEntries(stampFormat.formatToParts(new Date(iso)).map(({ type, value }) => [type, value]));
  return `${part.year}/${part.month}/${part.day} ${part.hour}:${part.minute}`;
}

export const withinMinutes = (iso: string, minutes: number) => Date.now() - new Date(iso).getTime() < minutes * 60_000;

/** The same count Core validates with: code points, not UTF-16 units. */
export const countChars = (text: string) => Array.from(text.trim()).length;
