import type { FastifyInstance } from 'fastify';
import type { AppContainer } from '../container.js';

export function registerStateRoutes(app: FastifyInstance, container: AppContainer): void {
  app.get('/api/state', async () => ({
    snapshot: container.service.getSnapshot(),
    camera: {
      info: container.camera.info,
      status: container.camera.getStatus(),
    },
  }));
}
