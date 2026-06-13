import { describe, expect, it } from 'vitest';
import { InMemoryEventStore } from '../adapters/in-memory-event-store.js';
import { InMemoryRuleRepository } from '../adapters/in-memory-rule-repository.js';
import type { AutomationRuleDraft } from '../domain/automation.js';
import type { DogActivitySnapshot } from '../domain/dog.js';
import { createInitialSnapshot } from '../domain/dog.js';
import type { DispenseTreatOptions } from '../ports/camera-provider.js';
import { AutomationEngine } from './automation-engine.js';

class ManualClock {
  constructor(private time = 0) {}
  now(): number {
    return this.time;
  }
  advance(ms: number): void {
    this.time += ms;
  }
}

class FakeDispenser {
  calls: DispenseTreatOptions[] = [];
  async dispenseTreat(options?: DispenseTreatOptions): Promise<void> {
    this.calls.push(options ?? {});
  }
}

const silentLogger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

function buildEngine(clock: ManualClock) {
  const rules = new InMemoryRuleRepository(clock);
  const dispenser = new FakeDispenser();
  const events = new InMemoryEventStore();
  const engine = new AutomationEngine({ rules, dispenser, events, clock, logger: silentLogger });
  return { engine, rules, dispenser, events };
}

function lyingSnapshot(now: number, lyingForMs: number): DogActivitySnapshot {
  return {
    ...createInitialSnapshot(now - lyingForMs - 60_000),
    presence: 'present',
    presenceSince: now - lyingForMs - 60_000,
    posture: 'lying-down',
    postureSince: now - lyingForMs,
    mood: 'calm',
    moodSince: now - lyingForMs,
    updatedAt: now,
  };
}

const calmLyingRule: AutomationRuleDraft = {
  name: 'Premio por tumbarse',
  enabled: true,
  conditions: [{ type: 'posture-held', postures: ['lying-down'], durationSeconds: 300 }],
  actions: [{ type: 'dispense-treat', portions: 1 }],
  cooldownSeconds: 600,
};

describe('AutomationEngine', () => {
  it('dispenses a treat when the posture has been held long enough', async () => {
    const clock = new ManualClock(1_000_000);
    const { engine, rules, dispenser } = buildEngine(clock);
    await rules.create(calmLyingRule);

    const tooEarly = await engine.tick(lyingSnapshot(clock.now(), 200_000));
    expect(tooEarly).toHaveLength(0);

    const triggered = await engine.tick(lyingSnapshot(clock.now(), 400_000));
    expect(dispenser.calls).toHaveLength(1);
    expect(triggered.map((event) => event.type)).toEqual(['rule-triggered', 'treat-dispensed']);
  });

  it('respects the cooldown between triggers', async () => {
    const clock = new ManualClock(1_000_000);
    const { engine, rules, dispenser } = buildEngine(clock);
    await rules.create(calmLyingRule);

    await engine.tick(lyingSnapshot(clock.now(), 400_000));
    clock.advance(60_000);
    await engine.tick(lyingSnapshot(clock.now(), 460_000));
    expect(dispenser.calls).toHaveLength(1);

    clock.advance(600_000);
    await engine.tick(lyingSnapshot(clock.now(), 1_060_000));
    expect(dispenser.calls).toHaveLength(2);
  });

  it('enforces the daily trigger limit', async () => {
    const clock = new ManualClock(new Date('2026-06-13T10:00:00Z').getTime());
    const { engine, rules, dispenser } = buildEngine(clock);
    await rules.create({ ...calmLyingRule, cooldownSeconds: 0, maxTriggersPerDay: 2 });

    for (let i = 0; i < 4; i += 1) {
      await engine.tick(lyingSnapshot(clock.now(), 400_000));
      clock.advance(1000);
    }
    expect(dispenser.calls).toHaveLength(2);

    clock.advance(24 * 60 * 60 * 1000);
    await engine.tick(lyingSnapshot(clock.now(), 400_000));
    expect(dispenser.calls).toHaveLength(3);
  });

  it('rewards calm after barking only once per barking episode', async () => {
    const clock = new ManualClock(1_000_000);
    const { engine, rules, dispenser } = buildEngine(clock);
    await rules.create({
      name: 'Premio por dejar de ladrar',
      enabled: true,
      conditions: [{ type: 'calm-after-barking', quietSeconds: 60 }],
      actions: [{ type: 'dispense-treat', portions: 1 }],
      cooldownSeconds: 0,
    });

    const barkAt = clock.now() - 90_000;
    const snapshot: DogActivitySnapshot = {
      ...createInitialSnapshot(0),
      presence: 'present',
      lastBarkAt: barkAt,
      updatedAt: clock.now(),
    };

    await engine.tick(snapshot);
    expect(dispenser.calls).toHaveLength(1);

    // Sin un ladrido nuevo no se vuelve a premiar, aunque no haya cooldown.
    clock.advance(120_000);
    await engine.tick({ ...snapshot, updatedAt: clock.now() });
    expect(dispenser.calls).toHaveLength(1);

    // Un episodio nuevo de ladridos vuelve a habilitar la regla.
    const newBarkAt = clock.now();
    clock.advance(61_000);
    await engine.tick({ ...snapshot, lastBarkAt: newBarkAt, updatedAt: clock.now() });
    expect(dispenser.calls).toHaveLength(2);
  });

  it('supports interval-based rules (configured frequency)', async () => {
    const clock = new ManualClock(1_000_000);
    const { engine, rules, dispenser } = buildEngine(clock);
    await rules.create({
      name: 'Premio cada 30 minutos',
      enabled: true,
      conditions: [{ type: 'interval-elapsed', minutes: 30 }],
      actions: [{ type: 'dispense-treat', portions: 1 }],
      cooldownSeconds: 0,
    });
    const snapshot = createInitialSnapshot(clock.now());

    await engine.tick(snapshot);
    expect(dispenser.calls).toHaveLength(1);

    clock.advance(10 * 60_000);
    await engine.tick(snapshot);
    expect(dispenser.calls).toHaveLength(1);

    clock.advance(25 * 60_000);
    await engine.tick(snapshot);
    expect(dispenser.calls).toHaveLength(2);
  });

  it('skips disabled rules', async () => {
    const clock = new ManualClock(1_000_000);
    const { engine, rules, dispenser } = buildEngine(clock);
    await rules.create({ ...calmLyingRule, enabled: false });

    await engine.tick(lyingSnapshot(clock.now(), 400_000));
    expect(dispenser.calls).toHaveLength(0);
  });
});
