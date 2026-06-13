import type { VideoFrame, VisionAnalyzer, VisionObservation } from '@mind-pet/core';
import { DOG_POSTURES, readGroundTruth } from '@mind-pet/core';

export interface SimulatedVisionAnalyzerOptions {
  /** Probabilidad de clasificar mal la postura (simula el error del modelo). */
  readonly noise?: number;
}

const DEFAULT_NOISE = 0.05;

/**
 * Analizador de visión simulado: lee el ground truth que la cámara simulada
 * adjunta a cada frame y le añade ruido, imitando un modelo real. Sirve para
 * desarrollar y probar el pipeline completo sin GPU ni modelos.
 *
 * Para producción, implementa VisionAnalyzer con un modelo real
 * (ver README del paquete).
 */
export class SimulatedVisionAnalyzer implements VisionAnalyzer {
  private readonly noise: number;

  constructor(options: SimulatedVisionAnalyzerOptions = {}) {
    this.noise = options.noise ?? DEFAULT_NOISE;
  }

  async analyzeFrame(frame: VideoFrame): Promise<VisionObservation> {
    const groundTruth = readGroundTruth(frame.metadata);

    if (groundTruth === null || !groundTruth.present) {
      return {
        timestamp: frame.timestamp,
        dogDetected: false,
        posture: null,
        mood: null,
        confidence: groundTruth === null ? 0 : 0.9,
      };
    }

    const misread = Math.random() < this.noise;
    const posture = misread ? randomPosture() : groundTruth.posture;

    return {
      timestamp: frame.timestamp,
      dogDetected: true,
      posture,
      mood: groundTruth.mood,
      confidence: misread ? 0.5 : 0.75 + Math.random() * 0.24,
    };
  }
}

function randomPosture() {
  return DOG_POSTURES[Math.floor(Math.random() * DOG_POSTURES.length)] ?? 'standing';
}
