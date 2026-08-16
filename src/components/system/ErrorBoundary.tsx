import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Sempre regista, incluindo em produção — sem isto não há forma de
    // diagnosticar crashes que só reproduzem fora do ambiente de dev
    // (ex: só em mobile), mesmo com o inspector remoto ligado.
    console.error('ErrorBoundary caught an error', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // ?debug=1 mostra a mensagem/stack diretamente no ecrã — único jeito
      // prático de ler o erro num telemóvel sem acesso a um inspector remoto.
      const debugMode = typeof window !== 'undefined' && window.location.search.includes('debug=1');

      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-8">
          <div className="max-w-lg w-full text-center border rounded-lg border-border bg-card p-8 shadow-lg">
            <h1 className="text-2xl font-bold mb-4">Ocorreu um erro inesperado</h1>
            <p className="mb-4 text-muted-foreground">Tente recarregar a página ou volte mais tarde.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            >
              Recarregar
            </button>
            {debugMode && this.state.error && (
              <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-left text-xs">
                <p className="font-semibold text-destructive">{this.state.error.name}: {this.state.error.message}</p>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-muted-foreground">
                  {this.state.error.stack}
                </pre>
                {this.state.errorInfo && (
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-muted-foreground/70">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
