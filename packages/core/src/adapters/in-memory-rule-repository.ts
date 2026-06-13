import type { AutomationRule, AutomationRuleDraft } from '../domain/automation.js';
import type { Clock } from '../ports/clock.js';
import type { RuleRepository } from '../ports/repositories.js';

/**
 * Repositorio de reglas en memoria. Se sustituye por persistencia real
 * implementando RuleRepository.
 */
export class InMemoryRuleRepository implements RuleRepository {
  private readonly rules = new Map<string, AutomationRule>();

  constructor(private readonly clock: Clock) {}

  async list(): Promise<AutomationRule[]> {
    return [...this.rules.values()];
  }

  async get(id: string): Promise<AutomationRule | null> {
    return this.rules.get(id) ?? null;
  }

  async create(draft: AutomationRuleDraft): Promise<AutomationRule> {
    const now = this.clock.now();
    const rule: AutomationRule = { ...draft, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    this.rules.set(rule.id, rule);
    return rule;
  }

  async update(id: string, patch: Partial<AutomationRuleDraft>): Promise<AutomationRule | null> {
    const existing = this.rules.get(id);
    if (existing === undefined) {
      return null;
    }
    const updated: AutomationRule = { ...existing, ...patch, updatedAt: this.clock.now() };
    this.rules.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.rules.delete(id);
  }
}
