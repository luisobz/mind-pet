import type { DomainEvent } from '@mind-pet/core';
import { describeEvent, eventIcon } from '../labels';

interface Props {
  events: DomainEvent[];
}

export function EventLog({ events }: Props) {
  return (
    <section className="card">
      <h2>Eventos recientes</h2>
      {events.length === 0 ? (
        <p className="muted">Todavía no hay eventos registrados.</p>
      ) : (
        <ul className="event-list">
          {events.map((event) => (
            <li key={event.id}>
              <span className="event-icon">{eventIcon(event)}</span>
              <span className="event-text">{describeEvent(event)}</span>
              <time className="muted">{new Date(event.at).toLocaleTimeString()}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
