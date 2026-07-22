// Partilha o estado do tutorial entre o overlay (TourController) e o cartão em Configurações.
import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { useTourProgress, type UseTourProgressReturn } from './useTourProgress';
import { TOUR_AREAS } from './tour-types';
import type { AdminView } from '@/components/admin/dashboard-types';

interface TourProgressContextValue extends UseTourProgressReturn {
  activeView: AdminView;
  goToFirstIncompleteArea: () => void;
}

const TourProgressContext = createContext<TourProgressContextValue | null>(null);

interface TourProgressProviderProps {
  activeView: AdminView;
  onNavigate: (view: AdminView) => void;
  children: React.ReactNode;
}

export function TourProgressProvider({ activeView, onNavigate, children }: TourProgressProviderProps) {
  const progress = useTourProgress();

  const goToFirstIncompleteArea = useCallback(() => {
    progress.setEnabled(true);
    const target = TOUR_AREAS.find((area) => !progress.isAreaComplete(area.view));
    onNavigate(target?.view ?? 'overview');
  }, [progress, onNavigate]);

  const value = useMemo<TourProgressContextValue>(() => ({
    ...progress,
    activeView,
    goToFirstIncompleteArea,
  }), [progress, activeView, goToFirstIncompleteArea]);

  return (
    <TourProgressContext.Provider value={value}>
      {children}
    </TourProgressContext.Provider>
  );
}

export function useTour(): TourProgressContextValue {
  const ctx = useContext(TourProgressContext);
  if (!ctx) throw new Error('useTour() deve ser usado dentro de <TourProgressProvider>');
  return ctx;
}
