/**
 * Lets at most `max` tasks run at the same time; the rest wait in line (first in, first out).
 *
 * Used to convert a limited number of images at once. Every conversion holds the decoded
 * image in memory (100+ MB for a big photo), so 40 at once would crash a 512 MB server.
 */
export class Semaphore {
  readonly max: number
  private active = 0
  private readonly waiting: Array<() => void> = []

  constructor(max: number) {
    if (!Number.isInteger(max) || max < 1) throw new Error('Semaphore max must be a positive integer')
    this.max = max
  }

  /** Tasks currently running */
  get running(): number {
    return this.active
  }

  /** Tasks waiting for a free slot */
  get pending(): number {
    return this.waiting.length
  }

  /** Waits for a free slot, runs the task, and always frees the slot afterwards (even on error). */
  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire()
    try {
      return await task()
    } finally {
      this.release()
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active++
      return Promise.resolve()
    }
    // No free slot: wait until release() hands one over
    return new Promise(resolve => this.waiting.push(resolve))
  }

  private release(): void {
    const next = this.waiting.shift()
    if (next) {
      // Pass the slot straight to the next task in line; `active` stays the same
      next()
    } else {
      this.active--
    }
  }
}
