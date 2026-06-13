import type { RuleCondition } from '../domain/automation.js';
import type { DogActivitySnapshot } from '../domain/dog.js';

export interface RuleEvaluationContext {
  readonly now: number;
  /** Último disparo de la regla que se está evaluando, si lo hubo. */
  readonly lastTriggeredAt: number | null;
}

/**
 * Evalúa una condición de regla contra el estado actual del perro.
 * Función pura: facilita el testeo y mantiene el motor simple.
 */
export function evaluateCondition(
  condition: RuleCondition,
  snapshot: DogActivitySnapshot,
  context: RuleEvaluationContext,
): boolean {
  const { now } = context;

  switch (condition.type) {
    case 'posture-held':
      return (
        snapshot.presence === 'present' &&
        snapshot.posture !== null &&
        snapshot.postureSince !== null &&
        condition.postures.includes(snapshot.posture) &&
        now - snapshot.postureSince >= condition.durationSeconds * 1000
      );

    case 'mood-held':
      return (
        snapshot.presence === 'present' &&
        snapshot.mood !== null &&
        snapshot.moodSince !== null &&
        condition.moods.includes(snapshot.mood) &&
        now - snapshot.moodSince >= condition.durationSeconds * 1000
      );

    case 'calm-after-barking': {
      if (snapshot.lastBarkAt === null) {
        return false;
      }
      const quietFor = now - snapshot.lastBarkAt;
      const quietEnough = quietFor >= condition.quietSeconds * 1000;
      const recentEnough =
        condition.withinMinutes === undefined ||
        quietFor <= condition.withinMinutes * 60_000;
      // Cada episodio de ladridos se premia una sola vez: el último ladrido
      // debe ser posterior al último disparo de la regla.
      const newEpisode =
        context.lastTriggeredAt === null || snapshot.lastBarkAt > context.lastTriggeredAt;
      return quietEnough && recentEnough && newEpisode;
    }

    case 'presence': {
      if (snapshot.presence !== condition.presence) {
        return false;
      }
      if (condition.durationSeconds === undefined) {
        return true;
      }
      return now - snapshot.presenceSince >= condition.durationSeconds * 1000;
    }

    case 'interval-elapsed':
      return (
        context.lastTriggeredAt === null ||
        now - context.lastTriggeredAt >= condition.minutes * 60_000
      );

    case 'time-window': {
      const minuteOfDay = toMinuteOfDay(now);
      const from = parseTime(condition.from);
      const to = parseTime(condition.to);
      // Soporta ventanas que cruzan medianoche (p. ej. 22:00 → 07:00).
      return from <= to
        ? minuteOfDay >= from && minuteOfDay < to
        : minuteOfDay >= from || minuteOfDay < to;
    }
  }
}

function toMinuteOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  return date.getHours() * 60 + date.getMinutes();
}

function parseTime(value: string): number {
  const [hours = 0, minutes = 0] = value.split(':').map(Number);
  return hours * 60 + minutes;
}
