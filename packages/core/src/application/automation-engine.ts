import type { AutomationRule, RuleAction } from '../domain/automation.js';
import type { DogActivitySnapshot } from '../domain/dog.js';
import type { DomainEvent } from '../domain/events.js';
import { eventId } from '../domain/events.js';
import type { TreatDispenser } from '../ports/camera-provider.js';
import type { Clock } from '../ports/clock.js';
import type { Logger } from '../ports/logger.js';
import type { EventStore, RuleRepository } from '../ports/repositories.js';
import { evaluateCondition } from './condition-evaluator.js';

export interface AutomationEngineDeps {
  readonly rules: RuleRepository;
  readonly dispenser: TreatDispenser;
  readonly events: EventStore;
  readonly clock: Clock;
  readonly logger: Logger;
}

interface RuleRuntime {
  lastTriggeredAt: number | null;
  dayKey: string;
  triggersToday: number;
}

/**
 * Evalúa periódicamente las reglas de automatización contra el estado del
 * perro y ejecuta sus acciones (dispensar premio, registrar evento)
 * respetando cooldown y límite diario.
 */
export class AutomationEngine {
  private readonly runtime = new Map<string, RuleRuntime>();

  constructor(private readonly deps: AutomationEngineDeps) {}

  async tick(snapshot: DogActivitySnapshot): Promise<DomainEvent[]> {
    const now = this.deps.clock.now();
    const rules = await this.deps.rules.list();
    const emitted: DomainEvent[] = [];

    for (const rule of rules) {
      if (!this.canTrigger(rule, now)) {
        continue;
      }

      const runtime = this.runtimeFor(rule.id, now);
      const context = { now, lastTriggeredAt: runtime.lastTriggeredAt };
      const satisfied = rule.conditions.every((condition) =>
        evaluateCondition(condition, snapshot, context),
      );
      if (!satisfied) {
        continue;
      }

      runtime.lastTriggeredAt = now;
      runtime.triggersToday += 1;
      this.deps.logger.info('Automation rule triggered', { ruleId: rule.id, name: rule.name });

      emitted.push({
        id: eventId(),
        at: now,
        type: 'rule-triggered',
        ruleId: rule.id,
        ruleName: rule.name,
      });

      for (const action of rule.actions) {
        emitted.push(...(await this.executeAction(rule, action, now)));
      }
    }

    for (const event of emitted) {
      await this.deps.events.append(event);
    }
    return emitted;
  }

  private canTrigger(rule: AutomationRule, now: number): boolean {
    if (!rule.enabled) {
      return false;
    }

    const runtime = this.runtimeFor(rule.id, now);

    const inCooldown =
      runtime.lastTriggeredAt !== null &&
      now - runtime.lastTriggeredAt < rule.cooldownSeconds * 1000;
    if (inCooldown) {
      return false;
    }

    const dayKey = toDayKey(now);
    if (runtime.dayKey !== dayKey) {
      runtime.dayKey = dayKey;
      runtime.triggersToday = 0;
    }

    return (
      rule.maxTriggersPerDay === undefined || runtime.triggersToday < rule.maxTriggersPerDay
    );
  }

  private async executeAction(
    rule: AutomationRule,
    action: RuleAction,
    now: number,
  ): Promise<DomainEvent[]> {
    switch (action.type) {
      case 'dispense-treat': {
        try {
          await this.deps.dispenser.dispenseTreat({ portions: action.portions });
          return [
            {
              id: eventId(),
              at: now,
              type: 'treat-dispensed',
              portions: action.portions,
              source: 'automation',
              ruleId: rule.id,
            },
          ];
        } catch (error) {
          this.deps.logger.error('Treat dispensing failed', {
            ruleId: rule.id,
            error: error instanceof Error ? error.message : String(error),
          });
          return [
            {
              id: eventId(),
              at: now,
              type: 'note',
              message: `No se pudo dispensar el premio de la regla "${rule.name}"`,
            },
          ];
        }
      }
      case 'log-event':
        return [{ id: eventId(), at: now, type: 'note', message: action.message }];
    }
  }

  private runtimeFor(ruleId: string, now: number): RuleRuntime {
    let runtime = this.runtime.get(ruleId);
    if (runtime === undefined) {
      runtime = { lastTriggeredAt: null, dayKey: toDayKey(now), triggersToday: 0 };
      this.runtime.set(ruleId, runtime);
    }
    return runtime;
  }
}

function toDayKey(timestamp: number): string {
  return new Date(timestamp).toDateString();
}
