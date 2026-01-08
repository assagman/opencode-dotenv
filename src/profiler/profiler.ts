/**
 * High-resolution performance profiler for opencode-dotenv
 * Uses Bun's high-resolution timers for accurate measurements
 */

export interface PerformanceStats {
  count: number
  min: number
  max: number
  avg: number
  p50: number
  p95: number
  p99: number
  total: number
}

export interface FileLoadMetrics {
  path: string
  duration: number
  varCount: number
  success: boolean
  error?: string
}

export interface PerformanceReport {
  timestamp: string
  uptime: number
  initialization: {
    startTime: number
    endTime: number | null
    duration: number | null
    state: "idle" | "loading" | "ready" | "error"
  }
  config: {
    loadTime: number | null
    path: string | null
  }
  files: {
    loadTimes: PerformanceStats | null
    details: FileLoadMetrics[]
    totalVars: number
  }
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const index = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]!
}

/**
 * Calculate statistics from measurements
 */
function calculateStats(measurements: number[]): PerformanceStats | null {
  if (measurements.length === 0) return null

  const sorted = [...measurements].sort((a, b) => a - b)
  const total = sorted.reduce((sum, v) => sum + v, 0)

  return {
    count: sorted.length,
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    avg: total / sorted.length,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    total,
  }
}

/**
 * Profiler for collecting and analyzing performance metrics
 * Thread-safe and designed for high-frequency measurements
 */
export class Profiler {
  private marks: Map<string, number> = new Map()
  private measures: Map<string, number[]> = new Map()
  private fileMetrics: FileLoadMetrics[] = []

  // Initialization tracking
  private initStartTime: number | null = null
  private initEndTime: number | null = null
  private initState: "idle" | "loading" | "ready" | "error" = "idle"

  // Config tracking
  private configLoadTime: number | null = null
  private configPath: string | null = null

  // Variable tracking
  private totalVars: number = 0

  // Start time for uptime calculation
  private readonly startTime: number = performance.now()

  /**
   * Mark a point in time with a name
   */
  mark(name: string): void {
    this.marks.set(name, performance.now())
  }

  /**
   * Measure duration from a mark to now
   * Returns duration in milliseconds
   */
  measure(name: string, startMark: string): number {
    const start = this.marks.get(startMark)
    if (start === undefined) {
      return -1 // Mark not found
    }

    const duration = performance.now() - start

    // Store measurement
    const existing = this.measures.get(name) || []
    existing.push(duration)
    this.measures.set(name, existing)

    return duration
  }

  /**
   * Record a duration directly (for pre-calculated values)
   */
  record(name: string, duration: number): void {
    const existing = this.measures.get(name) || []
    existing.push(duration)
    this.measures.set(name, existing)
  }

  /**
   * Get statistics for a measurement
   */
  getStats(name: string): PerformanceStats | null {
    const measurements = this.measures.get(name)
    if (!measurements) return null
    return calculateStats(measurements)
  }

  /**
   * Track initialization start
   */
  initStart(): void {
    this.initStartTime = performance.now()
    this.initState = "loading"
  }

  /**
   * Track initialization complete
   */
  initComplete(state: "ready" | "error"): void {
    this.initEndTime = performance.now()
    this.initState = state
  }

  /**
   * Record config load metrics
   */
  recordConfigLoad(duration: number, path: string): void {
    this.configLoadTime = duration
    this.configPath = path
  }

  /**
   * Record file load metrics
   */
  recordFileLoad(
    path: string,
    duration: number,
    varCount: number,
    success: boolean,
    error?: string
  ): void {
    this.fileMetrics.push({
      path,
      duration,
      varCount,
      success,
      error,
    })

    if (success) {
      this.totalVars += varCount
      this.record("file.load", duration)
    }
  }

  /**
   * Get the current initialization state
   */
  getInitState(): "idle" | "loading" | "ready" | "error" {
    return this.initState
  }

  /**
   * Get initialization duration (or time since start if still loading)
   */
  getInitDuration(): number | null {
    if (this.initStartTime === null) return null
    if (this.initEndTime !== null) {
      return this.initEndTime - this.initStartTime
    }
    return performance.now() - this.initStartTime
  }

  /**
   * Get total variables loaded
   */
  getTotalVars(): number {
    return this.totalVars
  }

  /**
   * Get file load metrics
   */
  getFileMetrics(): FileLoadMetrics[] {
    return [...this.fileMetrics]
  }

  /**
   * Export full performance report
   */
  export(): PerformanceReport {
    return {
      timestamp: new Date().toISOString(),
      uptime: performance.now() - this.startTime,
      initialization: {
        startTime: this.initStartTime || 0,
        endTime: this.initEndTime,
        duration: this.getInitDuration(),
        state: this.initState,
      },
      config: {
        loadTime: this.configLoadTime,
        path: this.configPath,
      },
      files: {
        loadTimes: this.getStats("file.load"),
        details: this.fileMetrics,
        totalVars: this.totalVars,
      },
    }
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.marks.clear()
    this.measures.clear()
    this.fileMetrics = []
    this.initStartTime = null
    this.initEndTime = null
    this.initState = "idle"
    this.configLoadTime = null
    this.configPath = null
    this.totalVars = 0
  }

  /**
   * Create a scoped timer that automatically records duration
   * Usage: const done = profiler.startTimer("file.load"); ... done();
   */
  startTimer(name: string): () => number {
    const start = performance.now()
    return () => {
      const duration = performance.now() - start
      this.record(name, duration)
      return duration
    }
  }
}

// Global profiler instance for the plugin
export const globalProfiler = new Profiler()
