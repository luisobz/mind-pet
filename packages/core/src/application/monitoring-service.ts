import type { DogActivitySnapshot } from '../domain/dog.js';
import type { DomainEvent } from '../domain/events.js';
import { eventId } from '../domain/events.js';
import type { AudioAnalyzer, VisionAnalyzer } from '../ports/analyzers.js';
import type { CameraProvider, Unsubscribe } from '../ports/camera-provider.js';
import type { Clock } from '../ports/clock.js';
import type { Logger } from '../ports/logger.js';
import type { EventStore, RuleRepository } from '../ports/repositories.js';
import { ListenerSet } from '../utils/listeners.js';
import { AutomationEngine } from './automation-engine.js';
import { DogStateTracker } from './dog-state-tracker.js';

export interface MonitoringServiceDeps {
  readonly camera: CameraProvider;
  readonly vision: VisionAnalyzer;
  readonly audio: AudioAnalyzer;
  readonly rules: RuleRepository;
  readonly events: EventStore;
  readonly clock: Clock;
  readonly logger: Logger;
  /** Frecuencia de evaluación de las automatizaciones. */
  readonly tickIntervalMs?: number;
}

const DEFAULT_TICK_INTERVAL_MS = 1000;

/**
 * Caso de uso principal: conecta la cámara, pasa vídeo/audio por los
 * analizadores, mantiene el estado del perro y evalúa las automatizaciones.
 * Expone listeners para que la capa de entrega (API/WebSocket) reaccione.
 */
export class MonitoringService {
  private readonly tracker: DogStateTracker;
  private readonly engine: AutomationEngine;
  private readonly eventListeners = new ListenerSet<DomainEvent>();
  private readonly snapshotListeners = new ListenerSet<DogActivitySnapshot>();

  private subscriptions: Unsubscribe[] = [];
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private analyzingFrame = false;
  private analyzingAudio = false;
  private ticking = false;

  constructor(private readonly deps: MonitoringServiceDeps) {
    this.tracker = new DogStateTracker({ clock: deps.clock });
    this.engine = new AutomationEngine({
      rules: deps.rules,
      dispenser: deps.camera,
      events: deps.events,
      clock: deps.clock,
      logger: deps.logger,
    });
  }

  async start(): Promise<void> {
    this.subscriptions.push(
      this.deps.camera.onStatusChange((status) => {
        void this.publish({ id: eventId(), at: this.deps.clock.now(), type: 'camera-status', status });
      }),
      this.deps.camera.onVideoFrame((frame) => void this.handleFrame(frame)),
      this.deps.camera.onAudioChunk((chunk) => void this.handleAudio(chunk)),
    );

    await this.deps.camera.connect();

    this.tickTimer = setInterval(
      () => void this.runTick(),
      this.deps.tickIntervalMs ?? DEFAULT_TICK_INTERVAL_MS,
    );
    this.deps.logger.info('Monitoring started', { camera: this.deps.camera.info.name });
  }

  async stop(): Promise<void> {
    if (this.tickTimer !== null) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    for (const unsubscribe of this.subscriptions) {
      unsubscribe();
    }
    this.subscriptions = [];
    await this.deps.camera.disconnect();
    this.deps.logger.info('Monitoring stopped');
  }

  getSnapshot(): DogActivitySnapshot {
    return this.tracker.getSnapshot();
  }

  onEvent(listener: (event: DomainEvent) => void): Unsubscribe {
    return this.eventListeners.add(listener);
  }

  onSnapshot(listener: (snapshot: DogActivitySnapshot) => void): Unsubscribe {
    return this.snapshotListeners.add(listener);
  }

  /** Dispensado manual desde la interfaz, registrado como evento. */
  async dispenseTreatManually(portions = 1): Promise<void> {
    await this.deps.camera.dispenseTreat({ portions });
    await this.publish({
      id: eventId(),
      at: this.deps.clock.now(),
      type: 'treat-dispensed',
      portions,
      source: 'manual',
    });
  }

  private async handleFrame(frame: Parameters<VisionAnalyzer['analyzeFrame']>[0]): Promise<void> {
    if (this.analyzingFrame) {
      return; // Descarta frames si el análisis no da abasto.
    }
    this.analyzingFrame = true;
    try {
      const observation = await this.deps.vision.analyzeFrame(frame);
      for (const event of this.tracker.ingestVision(observation)) {
        await this.publish(event);
      }
    } catch (error) {
      this.deps.logger.error('Vision analysis failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.analyzingFrame = false;
    }
  }

  private async handleAudio(chunk: Parameters<AudioAnalyzer['analyzeChunk']>[0]): Promise<void> {
    if (this.analyzingAudio) {
      return;
    }
    this.analyzingAudio = true;
    try {
      const observation = await this.deps.audio.analyzeChunk(chunk);
      for (const event of this.tracker.ingestAudio(observation)) {
        await this.publish(event);
      }
    } catch (error) {
      this.deps.logger.error('Audio analysis failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.analyzingAudio = false;
    }
  }

  private async runTick(): Promise<void> {
    if (this.ticking) {
      return;
    }
    this.ticking = true;
    try {
      const events = await this.engine.tick(this.tracker.getSnapshot());
      for (const event of events) {
        this.eventListeners.emit(event); // El motor ya los persiste.
      }
      this.snapshotListeners.emit(this.tracker.getSnapshot());
    } catch (error) {
      this.deps.logger.error('Automation tick failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.ticking = false;
    }
  }

  private async publish(event: DomainEvent): Promise<void> {
    await this.deps.events.append(event);
    this.eventListeners.emit(event);
    this.snapshotListeners.emit(this.tracker.getSnapshot());
  }
}
