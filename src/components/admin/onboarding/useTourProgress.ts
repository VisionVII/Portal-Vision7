// Estado e persistência do progresso do tutorial (localStorage + espelho opcional em Supabase).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TOUR_AREAS } from './tour-types';
import type { AdminView } from '@/components/admin/dashboard-types';

const STORAGE_KEY = 'vision7:tour:v1';

interface StoredTourState {
  enabled: boolean;
  completedSteps: string[];
  dismissed: boolean;
}

const DEFAULT_STATE: StoredTourState = {
  enabled: true,
  completedSteps: [],
  dismissed: false,
};

function readStoredState(): StoredTourState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<StoredTourState>;
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_STATE.enabled,
      completedSteps: Array.isArray(parsed.completedSteps) ? parsed.completedSteps : [],
      dismissed: typeof parsed.dismissed === 'boolean' ? parsed.dismissed : false,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function writeStoredState(state: StoredTourState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

const TOTAL_STEPS = TOUR_AREAS.reduce((sum, area) => sum + area.steps.length, 0);

export function useTourProgress() {
  const { user } = useAuth();
  const [state, setState] = useState<StoredTourState>(() => readStoredState());
  const hydratedFromDbRef = useRef(false);

  // Persist to localStorage on every change.
  useEffect(() => {
    writeStoredState(state);
  }, [state]);

  // Hydrate once from Supabase when an authenticated user is available.
  useEffect(() => {
    if (!user?.id || hydratedFromDbRef.current) return;
    hydratedFromDbRef.current = true;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('user_onboarding')
          .select('enabled, completed_steps, dismissed')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error || !data) return;

        setState({
          enabled: data.enabled,
          completedSteps: data.completed_steps ?? [],
          dismissed: data.dismissed,
        });
      } catch { /* degrade gracefully to localStorage-only */ }
    })();
  }, [user?.id]);

  const persistToSupabase = useCallback((next: StoredTourState) => {
    if (!user?.id) return;
    void (async () => {
      try {
        await supabase
          .from('user_onboarding')
          .upsert({
            user_id: user.id,
            enabled: next.enabled,
            completed_steps: next.completedSteps,
            dismissed: next.dismissed,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
      } catch { /* degrade gracefully */ }
    })();
  }, [user?.id]);

  const isStepDone = useCallback(
    (stepId: string) => state.completedSteps.includes(stepId),
    [state.completedSteps],
  );

  const markStepDone = useCallback((stepId: string) => {
    setState((prev) => {
      if (prev.completedSteps.includes(stepId)) return prev;
      const next = { ...prev, completedSteps: [...prev.completedSteps, stepId] };
      persistToSupabase(next);
      return next;
    });
  }, [persistToSupabase]);

  const markAreaDone = useCallback((view: AdminView) => {
    const area = TOUR_AREAS.find((a) => a.view === view);
    if (!area) return;
    setState((prev) => {
      const missing = area.steps.map((s) => s.id).filter((id) => !prev.completedSteps.includes(id));
      if (missing.length === 0) return prev;
      const next = { ...prev, completedSteps: [...prev.completedSteps, ...missing] };
      persistToSupabase(next);
      return next;
    });
  }, [persistToSupabase]);

  const resetTour = useCallback(() => {
    const next: StoredTourState = { enabled: true, completedSteps: [], dismissed: false };
    setState(next);
    persistToSupabase(next);
  }, [persistToSupabase]);

  const setEnabled = useCallback((enabled: boolean) => {
    setState((prev) => {
      const next = { ...prev, enabled, dismissed: enabled ? false : true };
      persistToSupabase(next);
      return next;
    });
  }, [persistToSupabase]);

  const isAreaComplete = useCallback((view: AdminView) => {
    const area = TOUR_AREAS.find((a) => a.view === view);
    if (!area) return true;
    return area.steps.every((s) => state.completedSteps.includes(s.id));
  }, [state.completedSteps]);

  const isAllComplete = useMemo(
    () => TOUR_AREAS.every((area) => area.steps.every((s) => state.completedSteps.includes(s.id))),
    [state.completedSteps],
  );

  const progressPercent = useMemo(() => {
    if (TOTAL_STEPS === 0) return 0;
    return Math.round((state.completedSteps.length / TOTAL_STEPS) * 100);
  }, [state.completedSteps.length]);

  return {
    enabled: state.enabled,
    dismissed: state.dismissed,
    completedSteps: state.completedSteps,
    isStepDone,
    markStepDone,
    markAreaDone,
    resetTour,
    setEnabled,
    isAreaComplete,
    isAllComplete,
    progressPercent,
  };
}

export type UseTourProgressReturn = ReturnType<typeof useTourProgress>;
