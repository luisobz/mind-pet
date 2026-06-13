import type { AutomationRule, AutomationRuleDraft } from '../domain/automation.js';
import type { DomainEvent, DomainEventType } from '../domain/events.js';

export interface ListEventsOptions {
  readonly limit?: number;
  readonly types?: readonly DomainEventType[];
}

export interface EventStore {
  append(event: DomainEvent): Promise<void>;
  /** Devuelve los eventos más recientes primero. */
  list(options?: ListEventsOptions): Promise<DomainEvent[]>;
}

export interface RuleRepository {
  list(): Promise<AutomationRule[]>;
  get(id: string): Promise<AutomationRule | null>;
  create(draft: AutomationRuleDraft): Promise<AutomationRule>;
  update(id: string, patch: Partial<AutomationRuleDraft>): Promise<AutomationRule | null>;
  delete(id: string): Promise<boolean>;
}
