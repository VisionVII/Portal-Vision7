import React from 'react';
import { ROLE_BLUEPRINTS } from './roleBlueprints';
import { RoleBadge } from './AccessManagerAtoms';

const RoleBlueprintsPanel: React.FC = () => (
  <div className="space-y-2">
    {ROLE_BLUEPRINTS.map((b, i) => (
      <div key={b.role} className="flex items-start gap-3 rounded-lg border border-border/60 p-2.5">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
          {i + 1}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <RoleBadge role={b.role} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{b.description}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {b.scope.map((s) => (
              <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{s}</span>
            ))}
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default RoleBlueprintsPanel;
