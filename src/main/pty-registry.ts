import { randomUUID } from 'node:crypto'
import { PtyManager, type PtySpawnOptions } from './pty-manager'
import type { PtyId } from '../shared/ipc'

export interface RegistryEntry {
  id: PtyId
  manager: PtyManager
}

export class PtyRegistry {
  private readonly entries = new Map<PtyId, PtyManager>()

  create(options: PtySpawnOptions): RegistryEntry {
    const id = randomUUID()
    const manager = new PtyManager()
    manager.spawn(options)
    manager.on('exit', () => {
      this.entries.delete(id)
    })
    this.entries.set(id, manager)
    return { id, manager }
  }

  get(id: PtyId): PtyManager | undefined {
    return this.entries.get(id)
  }

  killAll(): void {
    for (const manager of this.entries.values()) {
      manager.kill()
    }
  }
}
