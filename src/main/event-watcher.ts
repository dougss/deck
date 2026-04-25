import { EventEmitter } from 'node:events'
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { watch } from 'chokidar'

export const DECK_DIR = join(homedir(), '.deck')
export const EVENTS_LOG = join(DECK_DIR, 'events.log')

const MAX_LOG_LINES = 1000

export type HookEventType = 'stop' | 'notification' | 'error'

export interface HookEvent {
  cwd: string
  event: HookEventType
  timestamp: number
}

type EventMap = {
  hookEvent: [HookEvent]
}

export class EventWatcher extends EventEmitter<EventMap> {
  private cursor = 0
  private watcher: ReturnType<typeof watch> | null = null
  private ignoreNextChange = false

  start(): void {
    mkdirSync(DECK_DIR, { recursive: true, mode: 0o755 })

    // Truncate stale log from previous session
    try {
      writeFileSync(EVENTS_LOG, '', 'utf8')
    } catch {
      // First run — file may not exist yet
    }
    this.cursor = 0

    this.watcher = watch(EVENTS_LOG, {
      persistent: true,
      awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
      ignoreInitial: false
    })

    this.watcher.on('add', () => this.processNewLines())
    this.watcher.on('change', () => {
      if (this.ignoreNextChange) {
        this.ignoreNextChange = false
        return
      }
      this.processNewLines()
    })
  }

  stop(): void {
    this.watcher?.close().catch(() => {})
    this.watcher = null
  }

  private processNewLines(): void {
    if (!existsSync(EVENTS_LOG)) {
      this.cursor = 0
      return
    }

    let fileSize: number
    try {
      fileSize = statSync(EVENTS_LOG).size
    } catch {
      return
    }

    // Detect truncation — reset cursor to re-read from beginning
    if (fileSize < this.cursor) {
      this.cursor = 0
    }

    if (fileSize === this.cursor) return

    let buffer: Buffer
    try {
      buffer = readFileSync(EVENTS_LOG)
    } catch {
      return
    }

    const newContent = buffer.toString('utf8', this.cursor, buffer.length)
    this.cursor = buffer.length

    const lines = newContent.split('\n').filter(Boolean)
    for (const line of lines) {
      this.parseLine(line)
    }

    // Cap log at MAX_LOG_LINES to prevent unbounded growth
    this.maybeCapLog(buffer)
  }

  private parseLine(line: string): void {
    const parts = line.split('|')
    if (parts.length < 3) return
    const [cwd, event, tsStr] = parts
    if (!cwd || !event) return
    const timestamp = parseInt(tsStr, 10)
    if (isNaN(timestamp)) return

    const validEvents = new Set<string>(['stop', 'notification', 'error'])
    if (!validEvents.has(event)) return

    this.emit('hookEvent', { cwd, event: event as HookEventType, timestamp })
  }

  private maybeCapLog(currentBuffer: Buffer): void {
    const content = currentBuffer.toString('utf8')
    const lines = content.split('\n').filter(Boolean)
    if (lines.length <= MAX_LOG_LINES) return

    const trimmed = lines.slice(-MAX_LOG_LINES).join('\n') + '\n'
    try {
      this.ignoreNextChange = true
      writeFileSync(EVENTS_LOG, trimmed, 'utf8')
      this.cursor = Buffer.byteLength(trimmed, 'utf8')
    } catch {
      this.ignoreNextChange = false
    }
  }
}
