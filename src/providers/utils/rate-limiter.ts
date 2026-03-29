export class RateLimiter {
  private minInterval: number;
  private lastRequestTime: number = 0;
  private pendingRequest: Promise<void> | null = null;

  constructor(minInterval: number = 1000) {
    this.minInterval = minInterval;
  }

  async acquire(): Promise<void> {
    if (this.pendingRequest) {
      await this.pendingRequest;
    }

    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    const waitTime = Math.max(0, this.minInterval - elapsed);

    if (waitTime > 0) {
      this.pendingRequest = this.delay(waitTime);
      await this.pendingRequest;
      this.pendingRequest = null;
    }

    this.lastRequestTime = Date.now();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  updateInterval(minInterval: number): void {
    this.minInterval = minInterval;
  }

  getMinInterval(): number {
    return this.minInterval;
  }

  reset(): void {
    this.lastRequestTime = 0;
    this.pendingRequest = null;
  }
}

let globalRateLimiter: RateLimiter | null = null;

export function getGlobalRateLimiter(minInterval: number = 1000): RateLimiter {
  if (!globalRateLimiter) {
    globalRateLimiter = new RateLimiter(minInterval);
  } else {
    globalRateLimiter.updateInterval(minInterval);
  }
  return globalRateLimiter;
}