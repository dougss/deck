import * as pty from 'node-pty'
import { EventEmitter } from 'node:events'

export interface PtySpawnOptions {
  cwd: string
  cols: number
  rows: number
  shell?: string
  args?: string[]
  env?: NodeJS.ProcessEnv
}

export interface PtyExitInfo {
  exitCode: number
  signal?: number
}

export interface PtyManagerEvents {
  data: (chunk: string) => void
  exit: (info: PtyExitInfo) => void
}

export class PtyManager extends EventEmitter {
  private ptyProcess: pty.IPty | null = null
  private killTimer: NodeJS.Timeout | null = null

  override on<E extends keyof PtyManagerEvents>(event: E, listener: PtyManagerEvents[E]): this {
    return super.on(event, listener)
  }

  override emit<E extends keyof PtyManagerEvents>(
    event: E,
    ...args: Parameters<PtyManagerEvents[E]>
  ): boolean {
    return super.emit(event, ...args)
  }

  spawn(options: PtySpawnOptions): void {
    if (this.ptyProcess) {
      throw new Error('PtyManager already has an active pty; call kill() before spawn()')
    }

    const shell = options.shell ?? process.env.SHELL ?? 'zsh'
    const args = options.args ?? []
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      ...options.env,
      TERM: 'xterm-256color'
    }

    this.ptyProcess = pty.spawn(shell, args, {
      name: 'xterm-256color',
      cwd: options.cwd,
      cols: options.cols,
      rows: options.rows,
      env: env as { [key: string]: string }
    })

    this.ptyProcess.onData((chunk) => this.emit('data', chunk))
    this.ptyProcess.onExit(({ exitCode, signal }) => {
      this.ptyProcess = null
      if (this.killTimer) {
        clearTimeout(this.killTimer)
        this.killTimer = null
      }
      this.emit('exit', { exitCode, signal })
    })
  }

  write(data: string): void {
    if (!this.ptyProcess) return
    this.ptyProcess.write(data)
  }

  resize(cols: number, rows: number): void {
    if (!this.ptyProcess) return
    this.ptyProcess.resize(cols, rows)
  }

  kill(signal: NodeJS.Signals = 'SIGTERM'): void {
    if (!this.ptyProcess) return
    const proc = this.ptyProcess
    proc.kill(signal)
    this.killTimer = setTimeout(() => {
      if (this.ptyProcess === proc) {
        proc.kill('SIGKILL')
      }
    }, 2000)
  }

  get isAlive(): boolean {
    return this.ptyProcess !== null
  }

  get pid(): number | null {
    return this.ptyProcess?.pid ?? null
  }
}
