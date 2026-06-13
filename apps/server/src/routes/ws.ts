import type { FastifyInstance } from 'fastify';
import type { AppContainer } from '../container.js';

/**
 * WebSocket de tiempo real: empuja el estado del perro y los eventos de
 * dominio a la interfaz según se producen.
 */
export function registerWebSocket(app: FastifyInstance, container: AppContainer): void {
  app.get('/ws', { websocket: true }, (socket) => {
    const send = (payload: unknown): void => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(payload));
      }
    };

    send({ kind: 'snapshot', snapshot: container.service.getSnapshot() });

    const unsubscribeSnapshot = container.service.onSnapshot((snapshot) =>
      send({ kind: 'snapshot', snapshot }),
    );
    const unsubscribeEvents = container.service.onEvent((event) =>
      send({ kind: 'event', event }),
    );

    socket.on('close', () => {
      unsubscribeSnapshot();
      unsubscribeEvents();
    });
  });
}
