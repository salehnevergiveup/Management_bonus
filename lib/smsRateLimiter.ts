// Simple SMS Rate Limiter Service
interface RateLimitData {
  count: number;
  lastReset: number;
}

class SmsRateLimiter {
  private static instance: SmsRateLimiter;
  private limits: Map<string, RateLimitData> = new Map();
  private concurrentRequests: number = 0;
  private readonly MAX_CONCURRENT_REQUESTS = 5;
  private readonly MAX_SMS_PER_REQUEST = 5000;
  private readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  private readonly MAX_REQUESTS_PER_MINUTE = 10;

  private constructor() {
    // Start cleanup process
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Clean up every 5 minutes
  }

  public static getInstance(): SmsRateLimiter {
    if (!SmsRateLimiter.instance) {
      SmsRateLimiter.instance = new SmsRateLimiter();
    }
    return SmsRateLimiter.instance;
  }

  /**
   * Validate request size
   */
  public validateRequestSize(smsCount: number): { valid: boolean; error?: string } {
    if (smsCount > this.MAX_SMS_PER_REQUEST) {
      return {
        valid: false,
        error: `Request too large. Maximum ${this.MAX_SMS_PER_REQUEST} SMS per request. Received: ${smsCount}`
      };
    }
    return { valid: true };
  }

  /**
   * Check concurrent request limits
   */
  public checkConcurrentLimit(): { valid: boolean; error?: string } {
    if (this.concurrentRequests >= this.MAX_CONCURRENT_REQUESTS) {
      return {
        valid: false,
        error: `Too many concurrent requests. Maximum ${this.MAX_CONCURRENT_REQUESTS} concurrent requests allowed. Current: ${this.concurrentRequests}`
      };
    }
    return { valid: true };
  }

  /**
   * Check rate limiting per API key
   */
  public checkRateLimit(apiKey: string): { valid: boolean; error?: string } {
    const now = Date.now();
    const key = `rate_limit_${apiKey}`;
    
    let data = this.limits.get(key);
    
    if (!data || (now - data.lastReset) > this.RATE_LIMIT_WINDOW) {
      data = { count: 0, lastReset: now };
    }

    if (data.count >= this.MAX_REQUESTS_PER_MINUTE) {
      return {
        valid: false,
        error: `Rate limit exceeded. Maximum ${this.MAX_REQUESTS_PER_MINUTE} requests per minute per API key.`
      };
    }

    data.count++;
    this.limits.set(key, data);
    return { valid: true };
  }

  /**
   * Start tracking a request
   */
  public startRequest(): void {
    this.concurrentRequests++;
    console.log(`[RATE LIMITER] Concurrent requests: ${this.concurrentRequests}/${this.MAX_CONCURRENT_REQUESTS}`);
  }

  /**
   * End tracking a request
   */
  public endRequest(): void {
    this.concurrentRequests = Math.max(0, this.concurrentRequests - 1);
    console.log(`[RATE LIMITER] Concurrent requests: ${this.concurrentRequests}/${this.MAX_CONCURRENT_REQUESTS}`);
  }

  /**
   * Get current status
   */
  public getStatus(): {
    concurrentRequests: number;
    maxConcurrentRequests: number;
    maxSmsPerRequest: number;
    maxRequestsPerMinute: number;
  } {
    return {
      concurrentRequests: this.concurrentRequests,
      maxConcurrentRequests: this.MAX_CONCURRENT_REQUESTS,
      maxSmsPerRequest: this.MAX_SMS_PER_REQUEST,
      maxRequestsPerMinute: this.MAX_REQUESTS_PER_MINUTE
    };
  }

  /**
   * Clean up old rate limit data
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, data] of this.limits.entries()) {
      if ((now - data.lastReset) > this.RATE_LIMIT_WINDOW) {
        this.limits.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[RATE LIMITER] Cleaned up ${cleanedCount} old entries`);
    }
  }
}

export const smsRateLimiter = SmsRateLimiter.getInstance(); 