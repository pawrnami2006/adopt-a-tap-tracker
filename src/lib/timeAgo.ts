import { formatDistanceToNow } from 'date-fns'

/**
 * Returns a human-readable relative time string, e.g. "15 minutes ago".
 * Pass any ISO string or Date. Returns "unknown" if the input is nullish.
 */
export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return 'unknown'
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}
