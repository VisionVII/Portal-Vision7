import React from 'react';
import { ROLE_BLUEPRINTS } from './roleBlueprints';
import { RoleBadge } from './AccessManagerAtoms';
import { Shield } from 'lucide-react';

const RoleBlueprintsPanel: React.FC = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 text-xs text-muted-foreground pb-1">
      <Shield className="h-4 w-4 text-primary" />
      <span>Matriz de permissões e escopos predefinidos no sistema de governança do Vision7.</span>
    </div>

    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {ROLE_BLUEPRINTS.map((b) => (
        <div
          key={b.role}
          className="flex flex-col justify-between rounded-xl border border-border/60 bg-card/60 p-3.5 shadow-sm transition-all hover:border-border"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <RoleBadge role={b.role} />
              <span className="text-[10px] font-mono text-muted-foreground uppercase">{b.role}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{b.description}</p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-border/40">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Escopos</p>
            <div className="flex flex-wrap gap-1">
              {b.scope.map((s) => (
                <span
                  key={s}
                  className="rounded-md bg-muted/80 border border-border/50 px-2 py-0.5 text-[10px] font-medium text-foreground/80"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default RoleBlueprintsPanel;
