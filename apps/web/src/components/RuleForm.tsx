import { useState } from 'react';
import type { AutomationRuleDraft, RuleCondition } from '@mind-pet/core';
import { DOG_MOODS, DOG_POSTURES } from '@mind-pet/core';
import { MOOD_LABELS, POSTURE_LABELS } from '../labels';

interface Props {
  onSubmit: (draft: AutomationRuleDraft) => Promise<void>;
}

const CONDITION_LABELS: Record<RuleCondition['type'], string> = {
  'posture-held': 'Mantiene una postura durante un tiempo',
  'mood-held': 'Mantiene un estado de ánimo durante un tiempo',
  'calm-after-barking': 'Lleva un rato en silencio tras ladrar',
  presence: 'Está presente / ausente',
  'interval-elapsed': 'Cada cierto tiempo (frecuencia)',
  'time-window': 'Dentro de una franja horaria',
};

function defaultCondition(type: RuleCondition['type']): RuleCondition {
  switch (type) {
    case 'posture-held':
      return { type, postures: ['lying-down'], durationSeconds: 300 };
    case 'mood-held':
      return { type, moods: ['calm'], durationSeconds: 300 };
    case 'calm-after-barking':
      return { type, quietSeconds: 120 };
    case 'presence':
      return { type, presence: 'present' };
    case 'interval-elapsed':
      return { type, minutes: 60 };
    case 'time-window':
      return { type, from: '09:00', to: '21:00' };
  }
}

export function RuleForm({ onSubmit }: Props) {
  const [name, setName] = useState('');
  const [conditions, setConditions] = useState<RuleCondition[]>([
    defaultCondition('posture-held'),
  ]);
  const [portions, setPortions] = useState(1);
  const [cooldownMinutes, setCooldownMinutes] = useState(10);
  const [maxPerDay, setMaxPerDay] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const updateCondition = (index: number, condition: RuleCondition): void => {
    setConditions((current) => current.map((item, i) => (i === index ? condition : item)));
  };

  const submit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (name.trim() === '') {
      setError('Ponle un nombre a la regla');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        enabled: true,
        conditions,
        actions: [{ type: 'dispense-treat', portions }],
        cooldownSeconds: cooldownMinutes * 60,
        maxTriggersPerDay: maxPerDay === '' ? undefined : maxPerDay,
      });
      setName('');
      setConditions([defaultCondition('posture-held')]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo crear la regla');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="rule-form" onSubmit={(event) => void submit(event)}>
      <h3>Nueva automatización</h3>

      <label>
        Nombre
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Premio por estar tranquilo"
        />
      </label>

      <fieldset>
        <legend>Condiciones (deben cumplirse todas)</legend>
        {conditions.map((condition, index) => (
          <div className="condition-row" key={index}>
            <select
              value={condition.type}
              onChange={(event) =>
                updateCondition(index, defaultCondition(event.target.value as RuleCondition['type']))
              }
            >
              {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <ConditionFields
              condition={condition}
              onChange={(updated) => updateCondition(index, updated)}
            />

            {conditions.length > 1 && (
              <button
                type="button"
                className="link-button"
                onClick={() => setConditions((current) => current.filter((_, i) => i !== index))}
              >
                Quitar
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="link-button"
          onClick={() => setConditions((current) => [...current, defaultCondition('time-window')])}
        >
          + Añadir condición
        </button>
      </fieldset>

      <div className="form-row">
        <label>
          Premios a dispensar
          <input
            type="number"
            min={1}
            max={5}
            value={portions}
            onChange={(event) => setPortions(Number(event.target.value))}
          />
        </label>
        <label>
          Espera entre disparos (min)
          <input
            type="number"
            min={0}
            value={cooldownMinutes}
            onChange={(event) => setCooldownMinutes(Number(event.target.value))}
          />
        </label>
        <label>
          Máximo al día (opcional)
          <input
            type="number"
            min={1}
            value={maxPerDay}
            onChange={(event) =>
              setMaxPerDay(event.target.value === '' ? '' : Number(event.target.value))
            }
          />
        </label>
      </div>

      {error !== null && <p className="error">{error}</p>}
      <button type="submit" disabled={saving}>
        {saving ? 'Guardando…' : 'Crear regla'}
      </button>
    </form>
  );
}

function ConditionFields({
  condition,
  onChange,
}: {
  condition: RuleCondition;
  onChange: (condition: RuleCondition) => void;
}) {
  switch (condition.type) {
    case 'posture-held':
      return (
        <>
          <select
            value={condition.postures[0]}
            onChange={(event) =>
              onChange({ ...condition, postures: [event.target.value as (typeof DOG_POSTURES)[number]] })
            }
          >
            {DOG_POSTURES.map((posture) => (
              <option key={posture} value={posture}>
                {POSTURE_LABELS[posture]}
              </option>
            ))}
          </select>
          <DurationInput
            label="durante (min)"
            seconds={condition.durationSeconds}
            onChange={(durationSeconds) => onChange({ ...condition, durationSeconds })}
          />
        </>
      );
    case 'mood-held':
      return (
        <>
          <select
            value={condition.moods[0]}
            onChange={(event) =>
              onChange({ ...condition, moods: [event.target.value as (typeof DOG_MOODS)[number]] })
            }
          >
            {DOG_MOODS.map((mood) => (
              <option key={mood} value={mood}>
                {MOOD_LABELS[mood]}
              </option>
            ))}
          </select>
          <DurationInput
            label="durante (min)"
            seconds={condition.durationSeconds}
            onChange={(durationSeconds) => onChange({ ...condition, durationSeconds })}
          />
        </>
      );
    case 'calm-after-barking':
      return (
        <DurationInput
          label="silencio (min)"
          seconds={condition.quietSeconds}
          onChange={(quietSeconds) => onChange({ ...condition, quietSeconds })}
        />
      );
    case 'presence':
      return (
        <select
          value={condition.presence}
          onChange={(event) =>
            onChange({ ...condition, presence: event.target.value as 'present' | 'absent' })
          }
        >
          <option value="present">Presente</option>
          <option value="absent">Ausente</option>
        </select>
      );
    case 'interval-elapsed':
      return (
        <label className="inline">
          cada (min)
          <input
            type="number"
            min={1}
            value={condition.minutes}
            onChange={(event) => onChange({ ...condition, minutes: Number(event.target.value) })}
          />
        </label>
      );
    case 'time-window':
      return (
        <>
          <label className="inline">
            de
            <input
              type="time"
              value={condition.from}
              onChange={(event) => onChange({ ...condition, from: event.target.value })}
            />
          </label>
          <label className="inline">
            a
            <input
              type="time"
              value={condition.to}
              onChange={(event) => onChange({ ...condition, to: event.target.value })}
            />
          </label>
        </>
      );
  }
}

function DurationInput({
  label,
  seconds,
  onChange,
}: {
  label: string;
  seconds: number;
  onChange: (seconds: number) => void;
}) {
  return (
    <label className="inline">
      {label}
      <input
        type="number"
        min={1}
        value={Math.round(seconds / 60)}
        onChange={(event) => onChange(Math.max(1, Number(event.target.value)) * 60)}
      />
    </label>
  );
}
