import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppContainer } from '../container.js';

const treatSchema = z.object({
  portions: z.number().int().min(1).max(5).default(1),
});

export function registerCameraRoutes(app: FastifyInstance, container: AppContainer): void {
  app.get('/api/camera', async () => {
    let stream = null;
    try {
      stream = await container.camera.getLiveStream();
    } catch {
      // Sin stream configurado: la UI lo muestra como no disponible.
    }
    return {
      info: container.camera.info,
      status: container.camera.getStatus(),
      stream,
    };
  });

  app.post('/api/camera/treat', async (request, reply) => {
    const parsed = treatSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Petición inválida' });
    }
    try {
      await container.service.dispenseTreatManually(parsed.data.portions);
      return { dispensed: parsed.data.portions };
    } catch (error) {
      return reply.status(502).send({
        error: error instanceof Error ? error.message : 'No se pudo dispensar el premio',
      });
    }
  });
}
