import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppContainer } from '../container.js';

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(500).default(50),
});

export function registerEventRoutes(app: FastifyInstance, container: AppContainer): void {
  app.get('/api/events', async (request) => {
    const { limit } = querySchema.parse(request.query);
    return { events: await container.events.list({ limit }) };
  });
}
