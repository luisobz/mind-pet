import type {
  AudioChunk,
  AudioObservation,
  VideoFrame,
  VisionObservation,
} from '../domain/perception.js';

/**
 * Puertos de percepción. Las implementaciones reales (modelos de visión y
 * audio) viven en @mind-pet/perception y son intercambiables.
 */

export interface VisionAnalyzer {
  analyzeFrame(frame: VideoFrame): Promise<VisionObservation>;
}

export interface AudioAnalyzer {
  analyzeChunk(chunk: AudioChunk): Promise<AudioObservation>;
}
