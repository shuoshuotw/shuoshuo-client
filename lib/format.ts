// A fixed zone, so the server and the browser render the same text
const dateFormat = new Intl.DateTimeFormat("zh-Hant-TW", { dateStyle: "medium", timeZone: "Asia/Taipei" });
const timeFormat = new Intl.DateTimeFormat("zh-Hant-TW", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Taipei" });

export const formatDate = (iso: string) => dateFormat.format(new Date(iso));
export const formatTime = (iso: string) => timeFormat.format(new Date(iso));

export const withinMinutes = (iso: string, minutes: number) => Date.now() - new Date(iso).getTime() < minutes * 60_000;

/** The same count Core validates with: code points, not UTF-16 units. */
export const countChars = (text: string) => Array.from(text.trim()).length;
