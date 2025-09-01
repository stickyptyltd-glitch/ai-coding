
// Performance monitoring utilities
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
  }
  
  startTimer(name) {
    this.metrics.set(name, { start: Date.now() });
  }
  
  endTimer(name) {
    const metric = this.metrics.get(name);
    if (metric) {
      metric.end = Date.now();
      metric.duration = metric.end - metric.start;
    }
    return metric;
  }
  
  getMetrics() {
    return Object.fromEntries(this.metrics);
  }
}
