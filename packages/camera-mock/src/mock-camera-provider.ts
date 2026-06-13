import type {
  AudioChunk,
  CameraInfo,
  CameraProvider,
  CameraStatus,
  DispenseTreatOptions,
  LiveStreamHandle,
  Unsubscribe,
  VideoFrame,
} from '@mind-pet/core';
import { GROUND_TRUTH_METADATA_KEY, ListenerSet } from '@mind-pet/core';
import { BehaviorSimulator } from './behavior-simulator.js';

export interface MockCameraOptions {
  /** Frecuencia de emisión de frames simulados. */
  readonly frameIntervalMs?: number;
  readonly seed?: number;
}

const DEFAULT_FRAME_INTERVAL_MS = 1000;

/**
 * Proveedor de cámara simulado para desarrollo y demos. Emite frames con el
 * "ground truth" del simulador de comportamiento en los metadatos, que los
 * analizadores simulados de @mind-pet/perception saben interpretar.
 */
export class MockCameraProvider implements CameraProvider {
  readonly info: CameraInfo = {
    id: 'mock-camera-1',
    name: 'Cámara simulada',
    vendor: 'mind-pet',
    model: 'Simulator v1',
    capabilities: ['video', 'audio', 'treat-dispenser'],
  };

  private status: CameraStatus = 'disconnected';
  private readonly simulator: BehaviorSimulator;
  private readonly frameIntervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;

  private readonly frameListeners = new ListenerSet<VideoFrame>();
  private readonly audioListeners = new ListenerSet<AudioChunk>();
  private readonly statusListeners = new ListenerSet<CameraStatus>();

  constructor(options: MockCameraOptions = {}) {
    this.simulator = new BehaviorSimulator(options.seed);
    this.frameIntervalMs = options.frameIntervalMs ?? DEFAULT_FRAME_INTERVAL_MS;
  }

  async connect(): Promise<void> {
    if (this.status === 'connected') {
      return;
    }
    this.setStatus('connecting');
    this.timer = setInterval(() => this.emitTick(), this.frameIntervalMs);
    this.setStatus('connected');
  }

  async disconnect(): Promise<void> {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.setStatus('disconnected');
  }

  getStatus(): CameraStatus {
    return this.status;
  }

  onStatusChange(listener: (status: CameraStatus) => void): Unsubscribe {
    return this.statusListeners.add(listener);
  }

  async getLiveStream(): Promise<LiveStreamHandle> {
    return { protocol: 'mock', url: 'mock://simulated-dog' };
  }

  onVideoFrame(listener: (frame: VideoFrame) => void): Unsubscribe {
    return this.frameListeners.add(listener);
  }

  onAudioChunk(listener: (chunk: AudioChunk) => void): Unsubscribe {
    return this.audioListeners.add(listener);
  }

  async dispenseTreat(_options?: DispenseTreatOptions): Promise<void> {
    if (this.status !== 'connected') {
      throw new Error('La cámara simulada no está conectada');
    }
    this.simulator.rewardGiven(Date.now());
  }

  private emitTick(): void {
    const now = Date.now();
    const step = this.simulator.step(now);
    const metadata = { [GROUND_TRUTH_METADATA_KEY]: step.groundTruth };

    this.frameListeners.emit({
      timestamp: now,
      width: 1920,
      height: 1080,
      format: 'unknown',
      data: new Uint8Array(0),
      metadata,
    });

    if (step.audioEvent !== null) {
      this.audioListeners.emit({
        timestamp: now,
        sampleRate: 16_000,
        durationMs: this.frameIntervalMs,
        data: new Uint8Array(0),
        metadata,
      });
    }
  }

  private setStatus(status: CameraStatus): void {
    this.status = status;
    this.statusListeners.emit(status);
  }
}
