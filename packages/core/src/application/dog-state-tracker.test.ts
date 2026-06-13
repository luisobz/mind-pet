import { describe, expect, it } from 'vitest';
import type { DogPosture } from '../domain/dog.js';
import type { VisionObservation } from '../domain/perception.js';
import { DogStateTracker } from './dog-state-tracker.js';

class ManualClock {
  constructor(private time = 0) {}
  now(): number {
    return this.time;
  }
  advance(ms: number): void {
    this.time += ms;
  }
}

function visionObs(
  timestamp: number,
  posture: DogPosture | null,
  overrides: Partial<VisionObservation> = {},
): VisionObservation {
  return {
    timestamp,
    dogDetected: posture !== null,
    posture,
    mood: 'calm',
    confidence: 0.9,
    ...overrides,
  };
}

describe('DogStateTracker', () => {
  it('requires stable observations before accepting a posture change', () => {
    const tracker = new DogStateTracker({ clock: new ManualClock(), stabilityThreshold: 3 });

    tracker.ingestVision(visionObs(1000, 'sitting'));
    tracker.ingestVision(visionObs(2000, 'sitting'));
    expect(tracker.getSnapshot().posture).toBeNull();

    const events = tracker.ingestVision(visionObs(3000, 'sitting'));
    const snapshot = tracker.getSnapshot();

    expect(snapshot.presence).toBe('present');
    expect(snapshot.posture).toBe('sitting');
    // La postura empieza a contar desde la primera observación del candidato.
    expect(snapshot.postureSince).toBe(1000);
    expect(events.some((event) => event.type === 'posture-changed')).toBe(true);
  });

  it('ignores noisy single-frame posture flips', () => {
    const tracker = new DogStateTracker({ clock: new ManualClock(), stabilityThreshold: 3 });
    for (const t of [1000, 2000, 3000]) {
      tracker.ingestVision(visionObs(t, 'lying-down'));
    }

    tracker.ingestVision(visionObs(4000, 'standing'));
    tracker.ingestVision(visionObs(5000, 'lying-down'));

    expect(tracker.getSnapshot().posture).toBe('lying-down');
  });

  it('marks the dog as absent and clears posture after stable non-detections', () => {
    const tracker = new DogStateTracker({ clock: new ManualClock(), stabilityThreshold: 3 });
    for (const t of [1000, 2000, 3000]) {
      tracker.ingestVision(visionObs(t, 'sitting'));
    }

    let events = tracker.ingestVision(visionObs(4000, null));
    events = [...events, ...tracker.ingestVision(visionObs(5000, null))];
    events = [...events, ...tracker.ingestVision(visionObs(6000, null))];

    const snapshot = tracker.getSnapshot();
    expect(snapshot.presence).toBe('absent');
    expect(snapshot.posture).toBeNull();
    expect(
      events.some((event) => event.type === 'presence-changed' && event.presence === 'absent'),
    ).toBe(true);
  });

  it('tracks barks and debounces repeated audio events', () => {
    const tracker = new DogStateTracker({ clock: new ManualClock(), audioDebounceMs: 10_000 });

    const first = tracker.ingestAudio({ timestamp: 1000, event: 'bark', confidence: 0.9 });
    const repeated = tracker.ingestAudio({ timestamp: 4000, event: 'bark', confidence: 0.9 });
    const later = tracker.ingestAudio({ timestamp: 12_000, event: 'bark', confidence: 0.9 });

    expect(first).toHaveLength(1);
    expect(repeated).toHaveLength(0);
    expect(later).toHaveLength(1);
    expect(tracker.getSnapshot().lastBarkAt).toBe(12_000);
  });

  it('ignores low-confidence audio', () => {
    const tracker = new DogStateTracker({ clock: new ManualClock(), minAudioConfidence: 0.5 });
    const events = tracker.ingestAudio({ timestamp: 1000, event: 'bark', confidence: 0.2 });

    expect(events).toHaveLength(0);
    expect(tracker.getSnapshot().lastBarkAt).toBeNull();
  });
});
