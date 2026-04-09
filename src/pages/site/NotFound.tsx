const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-background to-secondary-50 px-4 dark:from-neutral-950 dark:via-background dark:to-neutral-900">
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
        <h1 className="mb-4 text-4xl font-bold text-foreground">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Página não encontrada</p>
        <a href="/" className="font-semibold text-primary hover:text-primary-700 underline underline-offset-4 dark:hover:text-primary-300">
          Voltar ao início
        </a>
      </div>
    </div>
  );
};

export default NotFound;
