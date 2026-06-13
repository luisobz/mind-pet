import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import Fastify, { type FastifyInstance } from 'fastify';
import type { AppContainer } from './container.js';
import { registerCameraRoutes } from './routes/camera.js';
import { registerEventRoutes } from './routes/events.js';
import { registerRuleRoutes } from './routes/rules.js';
import { registerStateRoutes } from './routes/state.js';
import { registerWebSocket } from './routes/ws.js';

export async function buildApp(container: AppContainer): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(cors, { origin: true });
  await app.register(websocket);

  app.get('/api/health', async () => ({ status: 'ok' }));

  registerStateRoutes(app, container);
  registerEventRoutes(app, container);
  registerRuleRoutes(app, container);
  registerCameraRoutes(app, container);
  registerWebSocket(app, container);

  return app;
}
