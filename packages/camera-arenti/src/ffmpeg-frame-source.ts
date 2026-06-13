import { spawn, type ChildProcessByStdio } from 'node:child_process';
import type { Readable } from 'node:stream';
import type { Logger, Unsubscribe, VideoFrame } from '@mind-pet/core';
import { ListenerSet } from '@mind-pet/core';

export interface FrameSource {
  start(): Promise<void>;
  stop(): Promise<void>;
  onVideoFrame(listener: (frame: VideoFrame) => void): Unsubscribe;
}

export interface FfmpegRtspFrameSourceOptions {
  readonly rtspUrl: string;
  readonly fps: number;
  readonly logger: Logger;
  /** Ruta del binario de ffmpeg; por defecto se asume disponible en PATH. */
  readonly ffmpegPath?: string;
  readonly width?: number;
}

const JPEG_START = Buffer.from([0xff, 0xd8]);
const JPEG_END = Buffer.from([0xff, 0xd9]);

/**
 * Extrae frames JPEG de un stream RTSP usando ffmpeg (image2pipe + mjpeg).
 * Experimental: requiere ffmpeg instalado en el sistema.
 */
export class FfmpegRtspFrameSource implements FrameSource {
  private readonly listeners = new ListenerSet<VideoFrame>();
  private process: ChildProcessByStdio<null, Readable, null> | null = null;
  private buffer = Buffer.alloc(0);

  constructor(private readonly options: FfmpegRtspFrameSourceOptions) {}

  async start(): Promise<void> {
    if (this.process !== null) {
      return;
    }

    const width = this.options.width ?? 640;
    const args = [
      '-rtsp_transport', 'tcp',
      '-i', this.options.rtspUrl,
      '-vf', `fps=${this.options.fps},scale=${width}:-1`,
      '-f', 'image2pipe',
      '-c:v', 'mjpeg',
      '-q:v', '7',
      '-an',
      'pipe:1',
    ];

    this.process = spawn(this.options.ffmpegPath ?? 'ffmpeg', args, {
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    this.process.stdout.on('data', (chunk: Buffer) => this.handleData(chunk));
    this.process.on('error', (error) => {
      this.options.logger.error('ffmpeg failed to start', { error: error.message });
    });
    this.process.on('exit', (code) => {
      this.options.logger.warn('ffmpeg exited', { code });
      this.process = null;
    });
  }

  async stop(): Promise<void> {
    if (this.process !== null) {
      this.process.kill('SIGTERM');
      this.process = null;
    }
    this.buffer = Buffer.alloc(0);
  }

  onVideoFrame(listener: (frame: VideoFrame) => void): Unsubscribe {
    return this.listeners.add(listener);
  }

  /** Acumula stdout y separa frames buscando los marcadores SOI/EOI de JPEG. */
  private handleData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    for (;;) {
      const start = this.buffer.indexOf(JPEG_START);
      if (start === -1) {
        this.buffer = Buffer.alloc(0);
        return;
      }
      const end = this.buffer.indexOf(JPEG_END, start + JPEG_START.length);
      if (end === -1) {
        this.buffer = this.buffer.subarray(start);
        return;
      }

      const frameData = this.buffer.subarray(start, end + JPEG_END.length);
      this.buffer = this.buffer.subarray(end + JPEG_END.length);

      this.listeners.emit({
        timestamp: Date.now(),
        width: 0, // Desconocido sin decodificar el JPEG.
        height: 0,
        format: 'jpeg',
        data: new Uint8Array(frameData),
      });
    }
  }
}
