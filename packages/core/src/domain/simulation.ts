import type { AudioEventType, DogMood, DogPosture } from './dog.js';

/**
 * Convención compartida para entornos de desarrollo: las cámaras simuladas
 * adjuntan el "ground truth" en los metadatos de cada frame y los
 * analizadores simulados lo leen (añadiendo ruido) en lugar de ejecutar un
 * modelo real. Esto permite probar todo el pipeline sin hardware ni modelos.
 */

export const GROUND_TRUTH_METADATA_KEY = 'groundTruth';

export interface SimulationGroundTruth {
  readonly present: boolean;
  readonly posture: DogPosture | null;
  readonly mood: DogMood | null;
  readonly audioEvent: AudioEventType | null;
}

export function readGroundTruth(
  metadata: Record<string, unknown> | undefined,
): SimulationGroundTruth | null {
  const value = metadata?.[GROUND_TRUTH_METADATA_KEY];
  if (!value || typeof value !== 'object') {
    return null;
  }
  return value as SimulationGroundTruth;
}
