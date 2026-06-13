import { useCallback, useEffect, useRef, useState } from 'react';
import type { DogActivitySnapshot, DomainEvent } from '@mind-pet/core';
import { api, type CameraResponse } from '../api/client';

const MAX_EVENTS = 100;
const POLL_INTERVAL_MS = 5000;
const RECONNECT_DELAY_MS = 2000;

type WsMessage =
  | { kind: 'snapshot'; snapshot: DogActivitySnapshot }
  | { kind: 'event'; event: DomainEvent };

/**
 * Estado en tiempo real del dashboard: WebSocket con reconexión y un
 * polling de respaldo por si el socket no está disponible.
 */
export function useDashboard() {
  const [snapshot, setSnapshot] = useState<DogActivitySnapshot | null>(null);
  const [events, setEvents] = useState<DomainEvent[]>([]);
  const [camera, setCamera] = useState<CameraResponse | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [state, cameraInfo, eventList] = await Promise.all([
        api.getState(),
        api.getCamera(),
        api.getEvents(MAX_EVENTS),
      ]);
      setSnapshot(state.snapshot);
      setCamera(cameraInfo);
      setEvents(eventList.events);
    } catch {
      // El backend puede no estar levantado todavía; se reintenta en el poll.
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = (): void => {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const socket = new WebSocket(`${protocol}://${window.location.host}/ws`);
      socketRef.current = socket;

      socket.onopen = () => setConnected(true);
      socket.onmessage = (message: MessageEvent<string>) => {
        const payload = JSON.parse(message.data) as WsMessage;
        if (payload.kind === 'snapshot') {
          setSnapshot(payload.snapshot);
        } else {
          setEvents((current) => [payload.event, ...current].slice(0, MAX_EVENTS));
        }
      };
      socket.onclose = () => {
        setConnected(false);
        if (!disposed) {
          reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };
    };

    connect();
    return () => {
      disposed = true;
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
      }
      socketRef.current?.close();
    };
  }, []);

  return { snapshot, events, camera, connected, refresh };
}
