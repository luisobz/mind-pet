import type { AudioEventType, DogMood, DogPosture } from './dog.js';

/**
 * Datos crudos que emite una cámara y observaciones que producen los
 * analizadores de IA. Son el contrato entre proveedor, percepción y dominio.
 */

export interface VideoFrame {
  readonly timestamp: number;
  readonly width: number;
  readonly height: number;
  readonly format: 'jpeg' | 'raw-rgb' | 'unknown';
  readonly data: Uint8Array;
  /** Metadatos opcionales del proveedor (p. ej. ground truth en simulación). */
  readonly metadata?: Record<string, unknown>;
}

export interface AudioChunk {
  readonly timestamp: number;
  readonly sampleRate: number;
  readonly durationMs: number;
  readonly data: Uint8Array;
  readonly metadata?: Record<string, unknown>;
}

export interface VisionObservation {
  readonly timestamp: number;
  readonly dogDetected: boolean;
  readonly posture: DogPosture | null;
  readonly mood: DogMood | null;
  readonly confidence: number;
}

export interface AudioObservation {
  readonly timestamp: number;
  readonly event: AudioEventType | null;
  readonly confidence: number;
}
