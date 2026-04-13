'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ProgramRule } from './rule-editor-modal';
import { RULE_TEMPLATES, type RuleTemplate } from '@/lib/training/rule-templates';

// ─── Helper functions ───────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
  before_session: 'Avant chaque séance',
  every_nth_week: 'Toutes les N semaines',
  tsb_threshold: 'Seuil de fatigue',
  cycle_phase: 'Phase du cycle',
  after_race: 'Après compétition',
  always: 'Toujours',
};

const SESSION_TYPE_LABELS: Record<string, string> = {
  strength: 'de force',
  cardio: 'cardio',
  all: '',
};

const CYCLE_PHASE_LABELS: Record<string, string> = {
  menstruation: 'Règles',
  follicular: 'Folliculaire',
  ovulation: 'Ovulation',
  luteal: 'Lutéale',
};

export function describeTrigger(trigger: string, condition: Record<string, unknown>): string {
  switch (trigger) {
    case 'before_session': {
      const st = (condition.session_type as string) ?? 'all';
      const suffix = SESSION_TYPE_LABELS[st] ?? '';
      return suffix ? `Avant chaque séance ${suffix}` : 'Avant chaque séance';
    }
    case 'every_nth_week':
      return `Toutes les ${(condition.every_n as number) ?? 4} semaines`;
    case 'tsb_threshold':
      return `TSB < ${(condition.threshold as number) ?? -20}`;
    case 'cycle_phase':
      return `Phase ${CYCLE_PHASE_LABELS[(condition.phase as string) ?? ''] ?? condition.phase}`;
    case 'after_race':
      return 'Après compétition';
    case 'always':
      return 'Toujours';
    default:
      return TRIGGER_LABELS[trigger] ?? trigger;
  }
}

export function describeAction(action: Record<string, unknown>): string {
  switch (action.type) {
    case 'insert_routine':
      return `Insérer ${(action.routine_title as string) || 'routine'}`;
    case 'reduce_intensity':
      return `Réduire de ${(action.percent as number) ?? 15}%`;
    case 'swap_session':
      return `Remplacer par ${(action.replacement as string) || '...'}`;
    case 'alert':
      return `Alerte: ${(action.message as string) || '...'}`;
    default:
      return String(action.type ?? 'Action');
  }
}

function actionBadgeColor(type: string): string {
  switch (type) {
    case 'insert_routine':
      return 'bg-green-100 text-green-700';
    case 'reduce_intensity':
      return 'bg-orange-100 text-orange-700';
    case 'swap_session':
      return 'bg-blue-100 text-blue-700';
    case 'alert':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface RulesPanelProps {
  rules: ProgramRule[];
  onAddRule: () => void;
  onEditRule: (rule: ProgramRule) => void;
  onDeleteRule: (ruleId: string) => void;
  onToggleRule: (ruleId: string, active: boolean) => void;
  onAddTemplate: (template: RuleTemplate) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RulesPanel({
  rules,
  onAddRule,
  onEditRule,
  onDeleteRule,
  onToggleRule,
  onAddTemplate,
}: RulesPanelProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-text">Règles automatiques</h3>
          {rules.length > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-medium px-2 py-0.5">
              {rules.length}
            </span>
          )}
        </div>
        <Button size="sm" onClick={onAddRule}>
          +
        </Button>
      </div>

      {/* Rule list */}
      {rules.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-6 text-center">
          <p className="text-sm text-gray-400">
            Aucune règle — Les règles automatisent votre programme
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 flex items-center justify-between gap-3 transition-opacity ${
                !rule.is_active ? 'opacity-50' : ''
              }`}
            >
              {/* Left */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-text truncate">{rule.title}</p>
                <p className="text-xs text-gray-500 truncate">
                  {describeTrigger(rule.trigger, rule.condition)}
                </p>
                <span
                  className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${actionBadgeColor(
                    (rule.action?.type as string) ?? ''
                  )}`}
                >
                  {describeAction(rule.action)}
                </span>
              </div>

              {/* Right */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Toggle */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rule.is_active}
                    onChange={() => onToggleRule(rule.id, !rule.is_active)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500" />
                </label>

                {/* Edit */}
                <button
                  onClick={() => onEditRule(rule)}
                  aria-label="Modifier"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    <path d="m15 5 4 4" />
                  </svg>
                </button>

                {/* Delete */}
                {confirmDeleteId === rule.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        onDeleteRule(rule.id);
                        setConfirmDeleteId(null);
                      }}
                      className="text-[10px] font-medium text-red-600 hover:text-red-700 px-1.5 py-0.5 rounded bg-red-50"
                    >
                      Supprimer
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-[10px] font-medium text-gray-500 hover:text-gray-700 px-1.5 py-0.5"
                    >
                      Non
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(rule.id)}
                    aria-label="Supprimer"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Suggested templates */}
      {rules.length < 3 && (
        <div className="mt-5">
          <p className="text-xs font-medium text-gray-400 mb-3">Règles suggérées</p>
          <div className="space-y-2">
            {RULE_TEMPLATES.map((tpl, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2"
              >
                <span className="text-sm text-gray-600 truncate">{tpl.title}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAddTemplate(tpl)}
                >
                  Ajouter
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
