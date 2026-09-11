/**
 * Coarse "how long ago" label for the studio's project list.
 *
 * The studio stores a real date so old work can be backdated accurately and shows
 * the rough distance: days under a month, months under a year, years beyond that.
 * The public grid does not show it.
 */
export function relativeAge(value: Date | string | null | undefined, now: Date = new Date()): string {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const days = Math.floor((now.getTime() - date.getTime()) / 86_400_000);

  if (days < 0) return "scheduled";
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;

  const months = Math.floor(days / 30.44);

  if (months < 12) return months <= 1 ? "1 month ago" : `${months} months ago`;

  const years = Math.floor(days / 365.25);

  return years <= 1 ? "1 year ago" : `${years} years ago`;
}

/** `YYYY-MM-DD` for `<input type="date">`, in local time so the picker round-trips. */
export function toDateInputValue(value: Date | string | null | undefined): string {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}
