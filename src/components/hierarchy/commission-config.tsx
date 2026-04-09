'use client';

import { useState } from 'react';
import { useSocialStore } from '@/stores/social';

interface CommissionConfigProps {
  hierarchyId: string;
  currentSplit: number;
  currentApproval: boolean;
  currentMode: string;
}

export function CommissionConfig({
  hierarchyId,
  currentSplit,
  currentApproval,
  currentMode,
}: CommissionConfigProps) {
  const { updateHierarchy } = useSocialStore();
  const [split, setSplit] = useState(currentSplit);
  const [approval, setApproval] = useState(currentApproval);
  const [mode, setMode] = useState(currentMode);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasChanges =
    split !== currentSplit || approval !== currentApproval || mode !== currentMode;

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateHierarchy(hierarchyId, {
        commissionSplit: split,
        seniorApprovalRequired: approval,
        mode,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <h4 className="text-sm font-semibold text-gray-700">Configuration</h4>

      <div>
        <label className="text-xs text-gray-500">Mode</label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="team">Équipe</option>
          <option value="cabinet">Cabinet</option>
          <option value="mentorship">Mentorat</option>
          <option value="mixed">Mixte</option>
        </select>
      </div>

      <div>
        <label className="text-xs text-gray-500">Commission : {split}%</label>
        <input
          type="range"
          min={0}
          max={50}
          step={1}
          value={split}
          onChange={(e) => setSplit(Number(e.target.value))}
          className="mt-1 w-full"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={approval}
          onChange={(e) => setApproval(e.target.checked)}
          className="rounded"
        />
        Approbation requise
      </label>

      {hasChanges && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-lg bg-brand-600 py-1.5 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? 'Sauvegarde...' : saved ? 'Sauvegardé !' : 'Enregistrer'}
        </button>
      )}
    </div>
  );
}
