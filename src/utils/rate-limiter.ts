export class RateLimiter {
  private requests: number;
  private window: number; // in milliseconds
  private timestamps: number[] = [];

  constructor(requests: number, windowInSeconds: number) {
    this.requests = requests;
    this.window = windowInSeconds * 1000;
  }

  allow(): boolean {
    const now = Date.now();
    const cutoff = now - this.window;

    // Remove old timestamps
    this.timestamps = this.timestamps.filter(t => t > cutoff);

    // Check if we can allow this request
    if (this.timestamps.length < this.requests) {
      this.timestamps.push(now);
      return true;
    }

    return false;
  }

  reset(): void {
    this.timestamps = [];
  }

  getRemaining(): number {
    const now = Date.now();
    const cutoff = now - this.window;
    this.timestamps = this.timestamps.filter(t => t > cutoff);
    return Math.max(0, this.requests - this.timestamps.length);
  }

  getResetTime(): number {
    if (this.timestamps.length === 0) return 0;
    
    const oldestTimestamp = Math.min(...this.timestamps);
    return oldestTimestamp + this.window;
  }
}