/**
 * Objetos de valor que describen una cámara de forma agnóstica al fabricante.
 */

export type CameraCapability =
  | 'video'
  | 'audio'
  | 'two-way-audio'
  | 'treat-dispenser'
  | 'pan-tilt'
  | 'night-vision';

export interface CameraInfo {
  readonly id: string;
  readonly name: string;
  readonly vendor: string;
  readonly model: string;
  readonly capabilities: readonly CameraCapability[];
}

export type CameraStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type StreamProtocol = 'rtsp' | 'hls' | 'webrtc' | 'mjpeg' | 'mock';

export interface LiveStreamHandle {
  readonly protocol: StreamProtocol;
  readonly url: string;
}
