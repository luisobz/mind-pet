import type { DogActivitySnapshot, DogMood, DogPosture } from '../domain/dog.js';
import { createInitialSnapshot } from '../domain/dog.js';
import type { DomainEvent } from '../domain/events.js';
import { eventId } from '../domain/events.js';
import type { AudioObservation, VisionObservation } from '../domain/perception.js';
import type { Clock } from '../ports/clock.js';

export interface DogStateTrackerOptions {
  readonly clock: Clock;
  /**
   * Número de observaciones consecutivas necesarias para aceptar un cambio
   * de presencia/postura/ánimo. Suaviza el ruido de los modelos.
   */
  readonly stabilityThreshold?: number;
  /** Confianza mínima para aceptar una observación de audio. */
  readonly minAudioConfidence?: number;
  /** Tiempo mínimo entre dos eventos de audio del mismo tipo. */
  readonly audioDebounceMs?: number;
}

interface Candidate<T> {
  value: T;
  count: number;
  firstSeenAt: number;
}

const DEFAULT_STABILITY = 3;
const DEFAULT_MIN_AUDIO_CONFIDENCE = 0.5;
const DEFAULT_AUDIO_DEBOUNCE_MS = 10_000;

/**
 * Mantiene el estado actual del perro a partir de las observaciones de los
 * analizadores, aplicando suavizado temporal, y emite eventos de dominio
 * cuando el estado cambia de forma estable.
 */
export class DogStateTracker {
  private snapshot: DogActivitySnapshot;
  private readonly stability: number;
  private readonly minAudioConfidence: number;
  private readonly audioDebounceMs: number;

  private presentStreak = 0;
  private absentStreak = 0;
  private postureCandidate: Candidate<DogPosture> | null = null;
  private moodCandidate: Candidate<DogMood> | null = null;
  private lastEmittedAudio: { type: string; at: number } | null = null;

  constructor(options: DogStateTrackerOptions) {
    this.snapshot = createInitialSnapshot(options.clock.now());
    this.stability = options.stabilityThreshold ?? DEFAULT_STABILITY;
    this.minAudioConfidence = options.minAudioConfidence ?? DEFAULT_MIN_AUDIO_CONFIDENCE;
    this.audioDebounceMs = options.audioDebounceMs ?? DEFAULT_AUDIO_DEBOUNCE_MS;
  }

  getSnapshot(): DogActivitySnapshot {
    return this.snapshot;
  }

  ingestVision(observation: VisionObservation): DomainEvent[] {
    const events: DomainEvent[] = [];
    const now = observation.timestamp;

    this.trackPresence(observation, now, events);

    // Los candidatos de postura/ánimo acumulan desde la primera detección,
    // sin esperar a que la presencia quede confirmada: ambos comparten el
    // mismo umbral de estabilidad.
    if (observation.dogDetected) {
      this.trackPosture(observation, now, events);
      this.trackMood(observation, now, events);
    }

    this.snapshot = { ...this.snapshot, updatedAt: now };
    return events;
  }

  ingestAudio(observation: AudioObservation): DomainEvent[] {
    if (observation.event === null || observation.confidence < this.minAudioConfidence) {
      return [];
    }

    const now = observation.timestamp;
    this.snapshot = {
      ...this.snapshot,
      lastAudioEvent: { type: observation.event, at: now, confidence: observation.confidence },
      lastBarkAt: observation.event === 'bark' ? now : this.snapshot.lastBarkAt,
      updatedAt: now,
    };

    const isDuplicate =
      this.lastEmittedAudio !== null &&
      this.lastEmittedAudio.type === observation.event &&
      now - this.lastEmittedAudio.at < this.audioDebounceMs;

    if (isDuplicate) {
      return [];
    }

    this.lastEmittedAudio = { type: observation.event, at: now };
    return [
      {
        id: eventId(),
        at: now,
        type: 'audio-detected',
        event: observation.event,
        confidence: observation.confidence,
      },
    ];
  }

  private trackPresence(
    observation: VisionObservation,
    now: number,
    events: DomainEvent[],
  ): void {
    if (observation.dogDetected) {
      this.presentStreak += 1;
      this.absentStreak = 0;
    } else {
      this.absentStreak += 1;
      this.presentStreak = 0;
    }

    if (this.presentStreak >= this.stability && this.snapshot.presence !== 'present') {
      this.snapshot = { ...this.snapshot, presence: 'present', presenceSince: now };
      events.push({ id: eventId(), at: now, type: 'presence-changed', presence: 'present' });
    }

    if (this.absentStreak >= this.stability && this.snapshot.presence !== 'absent') {
      this.snapshot = {
        ...this.snapshot,
        presence: 'absent',
        presenceSince: now,
        posture: null,
        postureSince: null,
        mood: null,
        moodSince: null,
      };
      this.postureCandidate = null;
      this.moodCandidate = null;
      events.push({ id: eventId(), at: now, type: 'presence-changed', presence: 'absent' });
    }
  }

  private trackPosture(
    observation: VisionObservation,
    now: number,
    events: DomainEvent[],
  ): void {
    const observed = observation.posture;
    if (observed === null) {
      return;
    }
    if (observed === this.snapshot.posture) {
      this.postureCandidate = null;
      return;
    }

    this.postureCandidate = advanceCandidate(this.postureCandidate, observed, now);

    if (this.postureCandidate.count >= this.stability) {
      const previous = this.snapshot.posture;
      this.snapshot = {
        ...this.snapshot,
        posture: observed,
        postureSince: this.postureCandidate.firstSeenAt,
      };
      this.postureCandidate = null;
      events.push({ id: eventId(), at: now, type: 'posture-changed', posture: observed, previous });
    }
  }

  private trackMood(observation: VisionObservation, now: number, events: DomainEvent[]): void {
    const observed = observation.mood;
    if (observed === null) {
      return;
    }
    if (observed === this.snapshot.mood) {
      this.moodCandidate = null;
      return;
    }

    this.moodCandidate = advanceCandidate(this.moodCandidate, observed, now);

    if (this.moodCandidate.count >= this.stability) {
      const previous = this.snapshot.mood;
      this.snapshot = {
        ...this.snapshot,
        mood: observed,
        moodSince: this.moodCandidate.firstSeenAt,
      };
      this.moodCandidate = null;
      events.push({ id: eventId(), at: now, type: 'mood-changed', mood: observed, previous });
    }
  }
}

function advanceCandidate<T>(candidate: Candidate<T> | null, value: T, now: number): Candidate<T> {
  if (candidate !== null && candidate.value === value) {
    return { ...candidate, count: candidate.count + 1 };
  }
  return { value, count: 1, firstSeenAt: now };
}
