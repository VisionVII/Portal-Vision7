// Controla qual passo do tutorial mostrar para a área ativa do dashboard.
import { useEffect, useState } from 'react';
import { useTour } from './TourProgressContext';
import { TOUR_AREAS } from './tour-types';
import { TourSpotlight } from './TourSpotlight';

export function TourController() {
  const { activeView, enabled, isAreaComplete, isStepDone, markStepDone, markAreaDone, setEnabled } = useTour();
  const area = TOUR_AREAS.find((a) => a.view === activeView);
  const steps = area ? [...area.steps].sort((a, b) => a.order - b.order) : [];

  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!area) return;
    const firstIncomplete = steps.findIndex((s) => !isStepDone(s.id));
    setStepIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  if (!area || !enabled || isAreaComplete(activeView) || steps.length === 0) {
    return null;
  }

  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  return (
    <TourSpotlight
      step={currentStep}
      stepIndex={stepIndex}
      stepCount={steps.length}
      isLastStep={isLastStep}
      onNext={() => {
        markStepDone(currentStep.id);
        setStepIndex((i) => Math.min(i + 1, steps.length - 1));
      }}
      onPrev={() => setStepIndex((i) => Math.max(i - 1, 0))}
      onSkip={() => setEnabled(false)}
      onFinish={() => markAreaDone(activeView)}
    />
  );
}
