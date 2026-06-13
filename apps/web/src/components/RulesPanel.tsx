import { useCallback, useEffect, useState } from 'react';
import type { AutomationRule, AutomationRuleDraft, RuleCondition } from '@mind-pet/core';
import { api } from '../api/client';
import { MOOD_LABELS, POSTURE_LABELS } from '../labels';
import { RuleForm } from './RuleForm';

export function RulesPanel() {
  const [rules, setRules] = useState<AutomationRule[]>([]);

  const load = useCallback(async () => {
    try {
      const response = await api.getRules();
      setRules(response.rules);
    } catch {
      // Reintento en la siguiente acción del usuario.
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createRule = async (draft: AutomationRuleDraft): Promise<void> => {
    await api.createRule(draft);
    await load();
  };

  const toggleRule = async (rule: AutomationRule): Promise<void> => {
    await api.updateRule(rule.id, { enabled: !rule.enabled });
    await load();
  };

  const deleteRule = async (rule: AutomationRule): Promise<void> => {
    await api.deleteRule(rule.id);
    await load();
  };

  return (
    <section className="card">
      <h2>Automatizaciones</h2>
      {rules.length === 0 ? (
        <p className="muted">No hay reglas configuradas.</p>
      ) : (
        <ul className="rule-list">
          {rules.map((rule) => (
            <li key={rule.id} className={rule.enabled ? '' : 'disabled'}>
              <div className="rule-info">
                <strong>{rule.name}</strong>
                <span className="muted">{summarizeConditions(rule.conditions)}</span>
              </div>
              <div className="rule-actions">
                <button className="link-button" onClick={() => void toggleRule(rule)}>
                  {rule.enabled ? 'Desactivar' : 'Activar'}
                </button>
                <button className="link-button danger" onClick={() => void deleteRule(rule)}>
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <RuleForm onSubmit={createRule} />
    </section>
  );
}

function summarizeConditions(conditions: readonly RuleCondition[]): string {
  return conditions.map(summarizeCondition).join(' y ');
}

function summarizeCondition(condition: RuleCondition): string {
  switch (condition.type) {
    case 'posture-held':
      return `${condition.postures.map((posture) => POSTURE_LABELS[posture]).join('/')} durante ${Math.round(condition.durationSeconds / 60)} min`;
    case 'mood-held':
      return `${condition.moods.map((mood) => MOOD_LABELS[mood]).join('/')} durante ${Math.round(condition.durationSeconds / 60)} min`;
    case 'calm-after-barking':
      return `${Math.round(condition.quietSeconds / 60)} min de silencio tras ladrar`;
    case 'presence':
      return condition.presence === 'present' ? 'perro presente' : 'perro ausente';
    case 'interval-elapsed':
      return `cada ${condition.minutes} min`;
    case 'time-window':
      return `entre ${condition.from} y ${condition.to}`;
  }
}
