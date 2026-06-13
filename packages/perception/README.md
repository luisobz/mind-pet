# @mind-pet/perception

Analizadores de IA que implementan los puertos `VisionAnalyzer` y
`AudioAnalyzer` de `@mind-pet/core`.

## Incluido

- `SimulatedVisionAnalyzer` / `SimulatedAudioAnalyzer`: leen el *ground truth*
  que `@mind-pet/camera-mock` adjunta a frames y audio, añadiendo ruido para
  imitar un modelo real. Permiten desarrollar el pipeline completo
  (tracker → automatizaciones → UI) sin modelos ni hardware.

## Integrar modelos reales

Crea una clase que implemente el puerto y conéctala en el contenedor del
servidor (`apps/server/src/container.ts`). El resto del sistema no cambia.

```ts
import type { VideoFrame, VisionAnalyzer, VisionObservation } from '@mind-pet/core';

export class OnnxVisionAnalyzer implements VisionAnalyzer {
  async analyzeFrame(frame: VideoFrame): Promise<VisionObservation> {
    // 1. Decodificar frame.data (JPEG) y preprocesar (resize/normalize).
    // 2. Detección de perro (p. ej. YOLO export ONNX) + clasificador de postura.
    // 3. Mapear la salida a { dogDetected, posture, mood, confidence }.
    throw new Error('TODO');
  }
}
```

Rutas recomendadas:

- **Visión**: `onnxruntime-node` con un detector (YOLOv8/11 clase "dog") y un
  clasificador de postura fine-tuneado (Stanford Dogs / dataset propio).
  El estado de ánimo puede estimarse con heurísticas sobre postura + movimiento
  entre frames + frecuencia de eventos de audio.
- **Audio**: clasificador tipo YAMNet/PANNs (clases bark/whine/howl) sobre
  ventanas de 1 s del stream de audio.
