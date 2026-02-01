import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
                    <div className="bg-red-50 p-6 rounded-full mb-4">
                        <AlertTriangle className="text-red-500 w-12 h-12" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h1>
                    <p className="text-gray-500 mb-8 max-w-sm">
                        We're sorry, but the application encountered an unexpected error.
                    </p>

                    <div className="mb-6 p-4 bg-gray-100 rounded-lg max-w-md w-full overflow-auto text-left">
                        <p className="font-mono text-xs text-red-600 break-words">
                            {this.state.error?.toString()}
                        </p>
                    </div>

                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-200"
                    >
                        <RotateCcw size={18} />
                        Reload Application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
