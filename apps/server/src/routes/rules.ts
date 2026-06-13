import { automationRuleDraftSchema } from '@mind-pet/core';
import type { FastifyInstance } from 'fastify';
import type { AppContainer } from '../container.js';

export function registerRuleRoutes(app: FastifyInstance, container: AppContainer): void {
  app.get('/api/rules', async () => ({ rules: await container.rules.list() }));

  app.post('/api/rules', async (request, reply) => {
    const parsed = automationRuleDraftSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Regla inválida', details: parsed.error.flatten() });
    }
    const rule = await container.rules.create(parsed.data);
    return reply.status(201).send({ rule });
  });

  app.put('/api/rules/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = automationRuleDraftSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Regla inválida', details: parsed.error.flatten() });
    }
    const rule = await container.rules.update(id, parsed.data);
    if (rule === null) {
      return reply.status(404).send({ error: 'Regla no encontrada' });
    }
    return { rule };
  });

  app.delete('/api/rules/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await container.rules.delete(id);
    if (!deleted) {
      return reply.status(404).send({ error: 'Regla no encontrada' });
    }
    return reply.status(204).send();
  });
}
