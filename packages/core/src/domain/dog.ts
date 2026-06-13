/**
 * Modelo de dominio del estado del perro. No depende de ningún proveedor
 * de cámara ni de ningún modelo de IA concreto.
 */

export const DOG_POSTURES = [
  'standing',
  'sitting',
  'lying-down',
  'lying-head-down',
  'sleeping',
] as const;

export type DogPosture = (typeof DOG_POSTURES)[number];

export const DOG_MOODS = ['calm', 'attentive', 'excited', 'nervous', 'stressed'] as const;

export type DogMood = (typeof DOG_MOODS)[number];

export const AUDIO_EVENT_TYPES = ['bark', 'whine', 'howl', 'growl', 'other'] as const;

export type AudioEventType = (typeof AUDIO_EVENT_TYPES)[number];

export type DogPresence = 'unknown' | 'present' | 'absent';

export interface AudioEventInfo {
  readonly type: AudioEventType;
  readonly at: number;
  readonly confidence: number;
}

/**
 * Foto fija del estado del perro en un instante dado, con marcas de tiempo
 * que permiten evaluar condiciones de duración ("tumbado desde hace X").
 */
export interface DogActivitySnapshot {
  readonly presence: DogPresence;
  readonly presenceSince: number;
  readonly posture: DogPosture | null;
  readonly postureSince: number | null;
  readonly mood: DogMood | null;
  readonly moodSince: number | null;
  readonly lastAudioEvent: AudioEventInfo | null;
  readonly lastBarkAt: number | null;
  readonly updatedAt: number;
}

export function createInitialSnapshot(now: number): DogActivitySnapshot {
  return {
    presence: 'unknown',
    presenceSince: now,
    posture: null,
    postureSince: null,
    mood: null,
    moodSince: null,
    lastAudioEvent: null,
    lastBarkAt: null,
    updatedAt: now,
  };
}
