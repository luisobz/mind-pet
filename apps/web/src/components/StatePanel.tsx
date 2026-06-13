import { useEffect, useState } from 'react';
import type { DogActivitySnapshot } from '@mind-pet/core';
import { AUDIO_LABELS, formatDuration, MOOD_LABELS, POSTURE_LABELS } from '../labels';

interface Props {
  snapshot: DogActivitySnapshot | null;
}

export function StatePanel({ snapshot }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (snapshot === null) {
    return (
      <section className="card">
        <h2>Estado actual</h2>
        <p className="muted">Esperando datos del servidor…</p>
      </section>
    );
  }

  const presenceLabel =
    snapshot.presence === 'present'
      ? '🐶 Presente'
      : snapshot.presence === 'absent'
        ? '🚪 Ausente'
        : '❔ Desconocido';

  return (
    <section className="card">
      <h2>Estado actual</h2>
      <dl className="state-grid">
        <div>
          <dt>Presencia</dt>
          <dd>
            {presenceLabel}
            <span className="muted"> · {formatDuration(snapshot.presenceSince, now)}</span>
          </dd>
        </div>
        <div>
          <dt>Postura</dt>
          <dd>
            {snapshot.posture !== null ? POSTURE_LABELS[snapshot.posture] : '—'}
            {snapshot.postureSince !== null && (
              <span className="muted"> · {formatDuration(snapshot.postureSince, now)}</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Estado de ánimo</dt>
          <dd>
            {snapshot.mood !== null ? MOOD_LABELS[snapshot.mood] : '—'}
            {snapshot.moodSince !== null && (
              <span className="muted"> · {formatDuration(snapshot.moodSince, now)}</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Último sonido</dt>
          <dd>
            {snapshot.lastAudioEvent !== null
              ? `${AUDIO_LABELS[snapshot.lastAudioEvent.type]} hace ${formatDuration(snapshot.lastAudioEvent.at, now)}`
              : '—'}
          </dd>
        </div>
      </dl>
    </section>
  );
}
