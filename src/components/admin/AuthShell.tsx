import React from 'react';
import BrandLogo from '@/components/system/BrandLogo';
import ThemeToggle from '@/components/system/ThemeToggle';

interface AuthShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  note?: React.ReactNode;
}

const AuthShell = ({ title, description, children, footer, note }: AuthShellProps) => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.18),_transparent_34%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)))] dark:bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_28%),linear-gradient(180deg,_hsl(var(--neutral-950)),_hsl(var(--background)))]">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.35)_50%,transparent_100%)] opacity-40 dark:opacity-10" />

      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <ThemeToggle compact />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg">
          <div className="rounded-[2rem] border border-border/70 bg-card/95 p-7 shadow-[0_30px_80px_rgba(2,8,23,0.12)] backdrop-blur-xl sm:p-10 dark:shadow-[0_40px_90px_rgba(2,8,23,0.55)]">
            <div className="mb-8 text-center">
              <div className="mb-6 flex justify-center">
                <BrandLogo showTagline={false} className="items-center" />
              </div>
              <h1 className="mt-3 text-2xl font-headline font-bold tracking-tight text-foreground sm:text-3xl">
                {title}
              </h1>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground sm:text-base">
                {description}
              </p>
            </div>

            {children}
          </div>

          {(footer || note) && (
            <div className="mt-5 space-y-2 text-center">
              {footer ? <div className="text-sm text-muted-foreground">{footer}</div> : null}
              {note ? <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/80">{note}</p> : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthShell;