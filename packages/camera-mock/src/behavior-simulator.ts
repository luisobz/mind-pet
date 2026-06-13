import type { AudioEventType, DogMood, DogPosture, SimulationGroundTruth } from '@mind-pet/core';

/**
 * Simula el comportamiento de un perro mediante fases con duración aleatoria
 * y transiciones ponderadas. Determinista para una misma semilla.
 */

type PhaseName =
  | 'napping'
  | 'resting'
  | 'lying'
  | 'sitting'
  | 'standing'
  | 'barking'
  | 'whining'
  | 'away';

interface PhaseDefinition {
  posture: DogPosture | null;
  mood: DogMood | null;
  present: boolean;
  /** Probabilidad por paso de emitir un evento de audio. */
  audioChance: number;
  audioEvent: AudioEventType | null;
  minDurationMs: number;
  maxDurationMs: number;
  transitions: readonly { to: PhaseName; weight: number }[];
}

const PHASES: Record<PhaseName, PhaseDefinition> = {
  napping: {
    posture: 'sleeping',
    mood: 'calm',
    present: true,
    audioChance: 0,
    audioEvent: null,
    minDurationMs: 60_000,
    maxDurationMs: 240_000,
    transitions: [
      { to: 'resting', weight: 5 },
      { to: 'lying', weight: 3 },
    ],
  },
  resting: {
    posture: 'lying-head-down',
    mood: 'calm',
    present: true,
    audioChance: 0,
    audioEvent: null,
    minDurationMs: 40_000,
    maxDurationMs: 180_000,
    transitions: [
      { to: 'napping', weight: 4 },
      { to: 'lying', weight: 4 },
      { to: 'sitting', weight: 2 },
    ],
  },
  lying: {
    posture: 'lying-down',
    mood: 'calm',
    present: true,
    audioChance: 0.01,
    audioEvent: 'other',
    minDurationMs: 30_000,
    maxDurationMs: 150_000,
    transitions: [
      { to: 'resting', weight: 4 },
      { to: 'sitting', weight: 3 },
      { to: 'standing', weight: 2 },
      { to: 'whining', weight: 1 },
    ],
  },
  sitting: {
    posture: 'sitting',
    mood: 'attentive',
    present: true,
    audioChance: 0.02,
    audioEvent: 'other',
    minDurationMs: 15_000,
    maxDurationMs: 90_000,
    transitions: [
      { to: 'lying', weight: 4 },
      { to: 'standing', weight: 3 },
      { to: 'barking', weight: 1 },
    ],
  },
  standing: {
    posture: 'standing',
    mood: 'excited',
    present: true,
    audioChance: 0.05,
    audioEvent: 'bark',
    minDurationMs: 10_000,
    maxDurationMs: 60_000,
    transitions: [
      { to: 'sitting', weight: 3 },
      { to: 'barking', weight: 2 },
      { to: 'away', weight: 2 },
      { to: 'lying', weight: 2 },
    ],
  },
  barking: {
    posture: 'standing',
    mood: 'nervous',
    present: true,
    audioChance: 0.6,
    audioEvent: 'bark',
    minDurationMs: 10_000,
    maxDurationMs: 45_000,
    transitions: [
      { to: 'standing', weight: 3 },
      { to: 'sitting', weight: 2 },
      { to: 'whining', weight: 1 },
    ],
  },
  whining: {
    posture: 'sitting',
    mood: 'stressed',
    present: true,
    audioChance: 0.4,
    audioEvent: 'whine',
    minDurationMs: 10_000,
    maxDurationMs: 40_000,
    transitions: [
      { to: 'lying', weight: 3 },
      { to: 'sitting', weight: 2 },
    ],
  },
  away: {
    posture: null,
    mood: null,
    present: false,
    audioChance: 0,
    audioEvent: null,
    minDurationMs: 20_000,
    maxDurationMs: 120_000,
    transitions: [
      { to: 'standing', weight: 4 },
      { to: 'sitting', weight: 3 },
    ],
  },
};

export interface SimulatorStep {
  readonly groundTruth: SimulationGroundTruth;
  readonly audioEvent: AudioEventType | null;
}

export class BehaviorSimulator {
  private readonly random: () => number;
  private phase: PhaseName = 'lying';
  private phaseEndsAt = 0;

  constructor(seed = 42) {
    this.random = mulberry32(seed);
  }

  /** Avanza la simulación hasta `now` y devuelve el estado observado. */
  step(now: number): SimulatorStep {
    if (this.phaseEndsAt === 0) {
      this.phaseEndsAt = now + this.randomDuration(PHASES[this.phase]);
    }
    if (now >= this.phaseEndsAt) {
      this.phase = this.pickNextPhase();
      this.phaseEndsAt = now + this.randomDuration(PHASES[this.phase]);
    }

    const definition = PHASES[this.phase];
    const audioEvent =
      definition.audioEvent !== null && this.random() < definition.audioChance
        ? definition.audioEvent
        : null;

    return {
      groundTruth: {
        present: definition.present,
        posture: definition.posture,
        mood: definition.mood,
        audioEvent,
      },
      audioEvent,
    };
  }

  /** Un premio capta la atención del perro: pasa a una fase de excitación corta. */
  rewardGiven(now: number): void {
    if (PHASES[this.phase].present) {
      this.phase = 'standing';
      this.phaseEndsAt = now + 20_000;
    }
  }

  private pickNextPhase(): PhaseName {
    const transitions = PHASES[this.phase].transitions;
    const total = transitions.reduce((sum, transition) => sum + transition.weight, 0);
    let roll = this.random() * total;
    for (const transition of transitions) {
      roll -= transition.weight;
      if (roll <= 0) {
        return transition.to;
      }
    }
    return transitions[transitions.length - 1]?.to ?? 'lying';
  }

  private randomDuration(definition: PhaseDefinition): number {
    return (
      definition.minDurationMs +
      this.random() * (definition.maxDurationMs - definition.minDurationMs)
    );
  }
}

/** PRNG determinista y barato (mulberry32). */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
