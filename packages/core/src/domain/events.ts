import type { AudioEventType, DogMood, DogPosture } from './dog.js';
import type { CameraStatus } from './camera.js';

/**
 * Eventos de dominio: todo lo relevante que ocurre en el sistema se registra
 * como un evento, consultable después como histórico.
 */

interface BaseEvent {
  readonly id: string;
  readonly at: number;
}

export interface PresenceChangedEvent extends BaseEvent {
  readonly type: 'presence-changed';
  readonly presence: 'present' | 'absent';
}

export interface PostureChangedEvent extends BaseEvent {
  readonly type: 'posture-changed';
  readonly posture: DogPosture;
  readonly previous: DogPosture | null;
}

export interface MoodChangedEvent extends BaseEvent {
  readonly type: 'mood-changed';
  readonly mood: DogMood;
  readonly previous: DogMood | null;
}

export interface AudioDetectedEvent extends BaseEvent {
  readonly type: 'audio-detected';
  readonly event: AudioEventType;
  readonly confidence: number;
}

export interface RuleTriggeredEvent extends BaseEvent {
  readonly type: 'rule-triggered';
  readonly ruleId: string;
  readonly ruleName: string;
}

export interface TreatDispensedEvent extends BaseEvent {
  readonly type: 'treat-dispensed';
  readonly portions: number;
  readonly source: 'automation' | 'manual';
  readonly ruleId?: string;
}

export interface CameraStatusEvent extends BaseEvent {
  readonly type: 'camera-status';
  readonly status: CameraStatus;
}

export interface NoteEvent extends BaseEvent {
  readonly type: 'note';
  readonly message: string;
}

export type DomainEvent =
  | PresenceChangedEvent
  | PostureChangedEvent
  | MoodChangedEvent
  | AudioDetectedEvent
  | RuleTriggeredEvent
  | TreatDispensedEvent
  | CameraStatusEvent
  | NoteEvent;

export type DomainEventType = DomainEvent['type'];

export function eventId(): string {
  return crypto.randomUUID();
}
