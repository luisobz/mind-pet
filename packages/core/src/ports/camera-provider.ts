import type { CameraInfo, CameraStatus, LiveStreamHandle } from '../domain/camera.js';
import type { AudioChunk, VideoFrame } from '../domain/perception.js';

export type Unsubscribe = () => void;

export interface DispenseTreatOptions {
  readonly portions?: number;
}

/**
 * Capacidad de dispensar premios, separada para que el motor de
 * automatizaciones no dependa de la cámara completa.
 */
export interface TreatDispenser {
  dispenseTreat(options?: DispenseTreatOptions): Promise<void>;
}

/**
 * Puerto principal de cámara. Cualquier fabricante (Arenti, simulada,
 * futuros modelos) se integra implementando esta interfaz; el resto del
 * sistema no conoce la implementación concreta.
 */
export interface CameraProvider extends TreatDispenser {
  readonly info: CameraInfo;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): CameraStatus;
  onStatusChange(listener: (status: CameraStatus) => void): Unsubscribe;

  /** Stream para visualización en directo (RTSP/HLS/WebRTC/...). */
  getLiveStream(): Promise<LiveStreamHandle>;

  /** Frames de vídeo para el pipeline de análisis. */
  onVideoFrame(listener: (frame: VideoFrame) => void): Unsubscribe;

  /** Fragmentos de audio para el pipeline de análisis. */
  onAudioChunk(listener: (chunk: AudioChunk) => void): Unsubscribe;
}
