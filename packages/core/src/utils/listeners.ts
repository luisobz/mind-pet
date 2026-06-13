import type { Unsubscribe } from '../ports/camera-provider.js';

/**
 * Conjunto de listeners minimalista y tipado, sin depender de node:events
 * para que el código de dominio funcione también en el navegador.
 */
export class ListenerSet<T> {
  private readonly listeners = new Set<(value: T) => void>();

  add(listener: (value: T) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(value: T): void {
    for (const listener of this.listeners) {
      listener(value);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
