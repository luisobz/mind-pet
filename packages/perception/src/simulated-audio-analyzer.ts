import type { AudioAnalyzer, AudioChunk, AudioObservation } from '@mind-pet/core';
import { readGroundTruth } from '@mind-pet/core';

/**
 * Analizador de audio simulado: interpreta el ground truth adjunto por la
 * cámara simulada. Para producción, implementa AudioAnalyzer con un
 * clasificador de audio real (ver README del paquete).
 */
export class SimulatedAudioAnalyzer implements AudioAnalyzer {
  async analyzeChunk(chunk: AudioChunk): Promise<AudioObservation> {
    const groundTruth = readGroundTruth(chunk.metadata);

    return {
      timestamp: chunk.timestamp,
      event: groundTruth?.audioEvent ?? null,
      confidence: groundTruth?.audioEvent != null ? 0.8 + Math.random() * 0.19 : 0,
    };
  }
}
