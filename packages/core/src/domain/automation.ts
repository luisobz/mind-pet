import { z } from 'zod';
import { DOG_MOODS, DOG_POSTURES } from './dog.js';

/**
 * Reglas de automatización configurables por el usuario: condiciones (AND)
 * + acciones + límites de disparo. Se validan con zod tanto en el servidor
 * como en cualquier otro punto de entrada.
 */

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const ruleConditionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('posture-held'),
    postures: z.array(z.enum(DOG_POSTURES)).min(1),
    durationSeconds: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('mood-held'),
    moods: z.array(z.enum(DOG_MOODS)).min(1),
    durationSeconds: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('calm-after-barking'),
    quietSeconds: z.number().int().positive(),
    withinMinutes: z.number().int().positive().optional(),
  }),
  z.object({
    type: z.literal('presence'),
    presence: z.enum(['present', 'absent']),
    durationSeconds: z.number().int().positive().optional(),
  }),
  z.object({
    type: z.literal('interval-elapsed'),
    minutes: z.number().positive(),
  }),
  z.object({
    type: z.literal('time-window'),
    from: z.string().regex(TIME_PATTERN),
    to: z.string().regex(TIME_PATTERN),
  }),
]);

export type RuleCondition = z.infer<typeof ruleConditionSchema>;

export const ruleActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('dispense-treat'),
    portions: z.number().int().min(1).max(5).default(1),
  }),
  z.object({
    type: z.literal('log-event'),
    message: z.string().min(1),
  }),
]);

export type RuleAction = z.infer<typeof ruleActionSchema>;

export const automationRuleDraftSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  conditions: z.array(ruleConditionSchema).min(1),
  actions: z.array(ruleActionSchema).min(1),
  /** Tiempo mínimo entre dos disparos de la misma regla. */
  cooldownSeconds: z.number().int().min(0).default(300),
  maxTriggersPerDay: z.number().int().positive().optional(),
});

export type AutomationRuleDraft = z.infer<typeof automationRuleDraftSchema>;

export interface AutomationRule extends AutomationRuleDraft {
  readonly id: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}
