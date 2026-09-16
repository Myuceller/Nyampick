function parseDateKey(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Covers the visible month plus one surrounding week on each side, avoiding a
 * full history fetch while keeping adjacent calendar cells populated.
 */
export function getHomeSummaryMealRange(today: string) {
  const current = parseDateKey(today);
  if (!current) throw new Error("today must be a YYYY-MM-DD date");

  const from = new Date(current.getFullYear(), current.getMonth(), 1);
  from.setDate(from.getDate() - 7);
  const to = new Date(current.getFullYear(), current.getMonth() + 1, 0);
  to.setDate(to.getDate() + 7);

  return { from: toDateKey(from), to: toDateKey(to) };
}
