// Rate limiter to prevent notification spam

class RateLimiter {
  constructor(cooldownMs = 2000) {
    this.cooldownMs = cooldownMs;
    this.lastTime = 0;
  }

  allow() {
    const now = Date.now();
    if (now - this.lastTime < this.cooldownMs) {
      return false;
    }
    this.lastTime = now;
    return true;
  }

  reset() {
    this.lastTime = 0;
  }
}

module.exports = RateLimiter;
