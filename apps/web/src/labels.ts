import type { AudioEventType, DogMood, DogPosture, DomainEvent } from '@mind-pet/core';

export const POSTURE_LABELS: Record<DogPosture, string> = {
  standing: 'De pie',
  sitting: 'Sentado',
  'lying-down': 'Tumbado',
  'lying-head-down': 'Tumbado con la cabeza apoyada',
  sleeping: 'Dormido',
};

export const MOOD_LABELS: Record<DogMood, string> = {
  calm: 'Tranquilo',
  attentive: 'Atento',
  excited: 'Excitado',
  nervous: 'Nervioso',
  stressed: 'Estresado',
};

export const AUDIO_LABELS: Record<AudioEventType, string> = {
  bark: 'Ladrido',
  whine: 'Gemido',
  howl: 'Aullido',
  growl: 'Gruñido',
  other: 'Otro sonido',
};

export function describeEvent(event: DomainEvent): string {
  switch (event.type) {
    case 'presence-changed':
      return event.presence === 'present' ? 'El perro ha aparecido' : 'El perro se ha ido';
    case 'posture-changed':
      return `Postura: ${POSTURE_LABELS[event.posture]}`;
    case 'mood-changed':
      return `Estado: ${MOOD_LABELS[event.mood]}`;
    case 'audio-detected':
      return `${AUDIO_LABELS[event.event]} detectado`;
    case 'rule-triggered':
      return `Regla activada: ${event.ruleName}`;
    case 'treat-dispensed':
      return event.source === 'manual'
        ? `Premio dispensado manualmente (x${event.portions})`
        : `Premio dispensado por automatización (x${event.portions})`;
    case 'camera-status':
      return `Cámara: ${event.status}`;
    case 'note':
      return event.message;
  }
}

export function eventIcon(event: DomainEvent): string {
  switch (event.type) {
    case 'presence-changed':
      return event.presence === 'present' ? '🐶' : '🚪';
    case 'posture-changed':
      return '🧘';
    case 'mood-changed':
      return '💭';
    case 'audio-detected':
      return '🔊';
    case 'rule-triggered':
      return '⚙️';
    case 'treat-dispensed':
      return '🦴';
    case 'camera-status':
      return '📷';
    case 'note':
      return '📝';
  }
}

export function formatDuration(sinceMs: number, nowMs: number): string {
  const totalSeconds = Math.max(0, Math.floor((nowMs - sinceMs) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours} h ${minutes % 60} min`;
  }
  if (minutes > 0) {
    return `${minutes} min ${seconds} s`;
  }
  return `${seconds} s`;
}
