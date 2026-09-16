function toLocalDate(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isSameLocalDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

export function formatMealDate(dateKey: string) {
  const date = toLocalDate(dateKey);
  if (!date) return "선택한 날";
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export function getMealDayHeading(dateKey: string, referenceDate = new Date()) {
  const date = toLocalDate(dateKey);
  if (date && isSameLocalDay(date, referenceDate)) return "오늘의 식단";
  return `${formatMealDate(dateKey)} 식단`;
}

export function getMealShareTitle(dateKey: string) {
  return `냠픽 ${formatMealDate(dateKey)} 식단표`;
}

export function getMealShareButtonLabel(dateKey: string, referenceDate = new Date()) {
  const date = toLocalDate(dateKey);
  return date && isSameLocalDay(date, referenceDate)
    ? "오늘 식단표 공유"
    : `${formatMealDate(dateKey)} 식단표 공유`;
}
