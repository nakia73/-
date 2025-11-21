import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#09090b] text-white p-8 text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h2>
          <div className="bg-[#18181b] p-4 rounded border border-white/10 max-w-lg overflow-auto text-left">
            <p className="font-mono text-xs text-gray-400 whitespace-pre-wrap">
              {this.state.error?.toString()}
            </p>
          </div>
          <button
            className="mt-6 px-6 py-2 bg-primary text-black font-bold rounded hover:bg-primaryHover transition-colors"
            onClick={() => window.location.reload()}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;