// Ponto único de controlo do tutorial guiado — ativar/desativar, progresso e reinício.
import { Check, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useTour } from './TourProgressContext';
import { TOUR_AREAS } from './tour-types';

export function TutorialSettingsCard() {
  const { enabled, isAllComplete, progressPercent, isAreaComplete, setEnabled, resetTour, goToFirstIncompleteArea } = useTour();

  const statusLabel = isAllComplete ? 'Concluído' : enabled ? 'Ativo' : 'Desativado';
  const statusClassName = isAllComplete
    ? 'border-primary/30 bg-primary/10 text-primary'
    : enabled
      ? 'border-success/30 bg-success/10 text-success'
      : 'border-border bg-muted text-muted-foreground';

  return (
    <Card data-tour="settings-tutorial">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Tutorial de uso</CardTitle>
          <CardDescription>Guia passo-a-passo pelas áreas do dashboard.</CardDescription>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline" className={statusClassName}>{statusLabel}</Badge>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            aria-label="Ativar ou desativar o tutorial de uso"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Progresso geral</span>
            <span>{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <ul className="space-y-1.5">
          {TOUR_AREAS.map((area) => {
            const done = isAreaComplete(area.view);
            return (
              <li key={area.view} className="flex items-center gap-2 text-sm">
                {done ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                ) : (
                  <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{area.label}</span>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={resetTour}>
            Reiniciar tutorial
          </Button>
          <Button variant="secondary" size="sm" onClick={goToFirstIncompleteArea} disabled={isAllComplete}>
            Ver agora
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
