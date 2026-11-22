/** Reads a positive whole number from an env var, or returns the fallback if it's missing or invalid. */
export function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}
