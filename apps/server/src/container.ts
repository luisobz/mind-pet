import { ArentiCameraProvider } from '@mind-pet/camera-arenti';
import { MockCameraProvider } from '@mind-pet/camera-mock';
import type { CameraProvider, EventStore, Logger, RuleRepository } from '@mind-pet/core';
import {
  ConsoleLogger,
  InMemoryEventStore,
  InMemoryRuleRepository,
  MonitoringService,
  SystemClock,
} from '@mind-pet/core';
import { SimulatedAudioAnalyzer, SimulatedVisionAnalyzer } from '@mind-pet/perception';
import type { AppConfig } from './config.js';

/**
 * Raíz de composición: es el ÚNICO punto del sistema que conoce las
 * implementaciones concretas (qué cámara, qué analizadores, qué
 * persistencia). Cambiar de proveedor no toca nada más.
 */
export interface AppContainer {
  readonly camera: CameraProvider;
  readonly service: MonitoringService;
  readonly rules: RuleRepository;
  readonly events: EventStore;
  readonly logger: Logger;
}

export async function createContainer(config: AppConfig): Promise<AppContainer> {
  const logger = new ConsoleLogger('server');
  const clock = new SystemClock();
  const events = new InMemoryEventStore();
  const rules = new InMemoryRuleRepository(clock);

  const camera = createCamera(config, logger);

  // TODO: sustituir por analizadores con modelos reales (@mind-pet/perception).
  const vision = new SimulatedVisionAnalyzer();
  const audio = new SimulatedAudioAnalyzer();

  const service = new MonitoringService({ camera, vision, audio, rules, events, clock, logger });

  if (config.CAMERA_PROVIDER === 'mock') {
    await seedExampleRules(rules);
  }

  return { camera, service, rules, events, logger };
}

function createCamera(config: AppConfig, logger: Logger): CameraProvider {
  if (config.CAMERA_PROVIDER === 'arenti') {
    return new ArentiCameraProvider(
      {
        rtspUrl: config.ARENTI_RTSP_URL,
        cloud:
          config.ARENTI_CLOUD_BASE_URL !== undefined &&
          config.ARENTI_CLOUD_CLIENT_ID !== undefined &&
          config.ARENTI_CLOUD_CLIENT_SECRET !== undefined &&
          config.ARENTI_DEVICE_ID !== undefined
            ? {
                baseUrl: config.ARENTI_CLOUD_BASE_URL,
                clientId: config.ARENTI_CLOUD_CLIENT_ID,
                clientSecret: config.ARENTI_CLOUD_CLIENT_SECRET,
                deviceId: config.ARENTI_DEVICE_ID,
              }
            : undefined,
      },
      { logger },
    );
  }
  return new MockCameraProvider();
}

/** Reglas de ejemplo para que la demo con cámara simulada haga algo útil. */
async function seedExampleRules(rules: RuleRepository): Promise<void> {
  await rules.create({
    name: 'Premio por calma prolongada',
    description: 'Premia al perro cuando lleva 5 minutos tumbado y tranquilo.',
    enabled: true,
    conditions: [
      { type: 'posture-held', postures: ['lying-down', 'lying-head-down'], durationSeconds: 300 },
      { type: 'mood-held', moods: ['calm'], durationSeconds: 300 },
    ],
    actions: [{ type: 'dispense-treat', portions: 1 }],
    cooldownSeconds: 1800,
    maxTriggersPerDay: 6,
  });

  await rules.create({
    name: 'Premio por dejar de ladrar',
    description: 'Premia al perro cuando lleva 2 minutos en silencio tras ladrar.',
    enabled: true,
    conditions: [{ type: 'calm-after-barking', quietSeconds: 120, withinMinutes: 10 }],
    actions: [{ type: 'dispense-treat', portions: 1 }],
    cooldownSeconds: 600,
    maxTriggersPerDay: 8,
  });
}
