export let clock = () => new Date();
export const setClockForTest = (fn: () => Date) => {
  clock = fn;
};
export function localDate(d = clock()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(0);
  dt.setFullYear(y, m - 1, d);
  dt.setHours(12, 0, 0, 0);
  return dt;
}
export function validDate(s: unknown): s is string {
  return (
    typeof s === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    +s.slice(0, 4) >= 1900 &&
    localDate(parseDate(s)) === s
  );
}
export function addDays(s: string, n: number) {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return localDate(d);
}
export function week(s: string) {
  const d = parseDate(s);
  const start = addDays(s, -((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
export const dateLabel = (
  s: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  },
) => parseDate(s).toLocaleDateString(undefined, options);
export function monthCells(month: string): (string | null)[] {
  const first = month + "-01",
    d = parseDate(first),
    pad = (d.getDay() + 6) % 7;
  const n = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return [
    ...Array(pad).fill(null),
    ...Array.from({ length: n }, (_, i) => addDays(first, i)),
    ...Array((7 - ((pad + n) % 7)) % 7).fill(null),
  ];
}
export function shiftMonth(m: string, n: number) {
  const d = parseDate(m + "-01");
  d.setMonth(d.getMonth() + n);
  return localDate(d).slice(0, 7);
}
