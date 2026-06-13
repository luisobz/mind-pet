import type {
  AudioChunk,
  CameraInfo,
  CameraProvider,
  CameraStatus,
  DispenseTreatOptions,
  LiveStreamHandle,
  Logger,
  Unsubscribe,
  VideoFrame,
} from '@mind-pet/core';
import { ConsoleLogger, ListenerSet } from '@mind-pet/core';
import type { ArentiCloudClient } from './cloud-client.js';
import { TuyaArentiCloudClient } from './cloud-client.js';
import type { ArentiConfig, ArentiConfigInput } from './config.js';
import { arentiConfigSchema } from './config.js';
import type { FrameSource } from './ffmpeg-frame-source.js';
import { FfmpegRtspFrameSource } from './ffmpeg-frame-source.js';

export interface ArentiCameraDeps {
  readonly cloudClient?: ArentiCloudClient;
  readonly frameSource?: FrameSource;
  readonly logger?: Logger;
}

/**
 * Proveedor para la Arenti Pet Camera 2K con dispensador de premios.
 *
 * - Vídeo: vía RTSP local (frames extraídos con ffmpeg para el análisis).
 * - Acciones remotas (premios): vía la API cloud de Arenti/Tuya.
 *
 * Implementa el puerto CameraProvider de @mind-pet/core, de modo que el
 * resto del sistema no depende de Arenti en absoluto.
 */
export class ArentiCameraProvider implements CameraProvider {
  readonly info: CameraInfo;

  private readonly config: ArentiConfig;
  private readonly logger: Logger;
  private readonly cloudClient: ArentiCloudClient | null;
  private readonly frameSource: FrameSource | null;

  private status: CameraStatus = 'disconnected';
  private frameSubscription: Unsubscribe | null = null;

  private readonly frameListeners = new ListenerSet<VideoFrame>();
  private readonly audioListeners = new ListenerSet<AudioChunk>();
  private readonly statusListeners = new ListenerSet<CameraStatus>();

  constructor(config: ArentiConfigInput, deps: ArentiCameraDeps = {}) {
    this.config = arentiConfigSchema.parse(config);
    this.logger = deps.logger ?? new ConsoleLogger('camera-arenti');

    this.info = {
      id: this.config.cloud?.deviceId ?? 'arenti-local',
      name: this.config.name,
      vendor: 'Arenti',
      model: 'Pet Camera 2K',
      capabilities: ['video', 'audio', 'two-way-audio', 'treat-dispenser', 'night-vision'],
    };

    this.cloudClient =
      deps.cloudClient ??
      (this.config.cloud !== undefined ? new TuyaArentiCloudClient(this.config.cloud) : null);

    this.frameSource =
      deps.frameSource ??
      (this.config.rtspUrl !== undefined
        ? new FfmpegRtspFrameSource({
            rtspUrl: this.config.rtspUrl,
            fps: this.config.analysisFps,
            logger: this.logger,
          })
        : null);
  }

  async connect(): Promise<void> {
    if (this.status === 'connected') {
      return;
    }
    if (this.frameSource === null && this.cloudClient === null) {
      throw new Error(
        'Configura al menos rtspUrl (vídeo) o cloud (acciones remotas) para la cámara Arenti',
      );
    }

    this.setStatus('connecting');
    try {
      if (this.frameSource !== null) {
        this.frameSubscription = this.frameSource.onVideoFrame((frame) =>
          this.frameListeners.emit(frame),
        );
        await this.frameSource.start();
      }
      this.setStatus('connected');
    } catch (error) {
      this.setStatus('error');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.frameSubscription?.();
    this.frameSubscription = null;
    if (this.frameSource !== null) {
      await this.frameSource.stop();
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
    if (this.config.rtspUrl === undefined) {
      throw new Error('La cámara Arenti no tiene rtspUrl configurada');
    }
    return { protocol: 'rtsp', url: this.config.rtspUrl };
  }

  onVideoFrame(listener: (frame: VideoFrame) => void): Unsubscribe {
    return this.frameListeners.add(listener);
  }

  onAudioChunk(listener: (chunk: AudioChunk) => void): Unsubscribe {
    // TODO: extraer audio del stream RTSP (segunda salida de ffmpeg).
    return this.audioListeners.add(listener);
  }

  async dispenseTreat(options?: DispenseTreatOptions): Promise<void> {
    if (this.cloudClient === null) {
      throw new Error(
        'Dispensar premios requiere configurar las credenciales cloud de Arenti/Tuya',
      );
    }
    await this.cloudClient.dispenseTreat(options?.portions ?? 1);
  }

  private setStatus(status: CameraStatus): void {
    this.status = status;
    this.statusListeners.emit(status);
  }
}
