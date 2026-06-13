import type { DomainEvent } from '../domain/events.js';
import type { EventStore, ListEventsOptions } from '../ports/repositories.js';

const DEFAULT_MAX_EVENTS = 1000;

/**
 * Almacén de eventos en memoria con tamaño acotado. Suficiente para
 * desarrollo; se sustituye por una base de datos implementando EventStore.
 */
export class InMemoryEventStore implements EventStore {
  private events: DomainEvent[] = [];

  constructor(private readonly maxEvents = DEFAULT_MAX_EVENTS) {}

  async append(event: DomainEvent): Promise<void> {
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  async list(options?: ListEventsOptions): Promise<DomainEvent[]> {
    const limit = options?.limit ?? 100;
    const types = options?.types;
    const filtered =
      types === undefined ? this.events : this.events.filter((event) => types.includes(event.type));
    return filtered.slice(-limit).reverse();
  }
}
