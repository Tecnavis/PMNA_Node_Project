import React from 'react';
import { useLocation } from 'react-router-dom';

type State = { error: Error | null };

class Boundary extends React.Component<{ children: React.ReactNode }, State> {
    state: State = { error: null };
    static getDerivedStateFromError(error: Error): State {
        return { error };
    }
    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[page error]', error, info?.componentStack);
    }
    render() {
        if (!this.state.error) return this.props.children;
        return (
            <div className="panel max-w-xl mx-auto mt-10 text-center !p-8">
                <div className="text-4xl mb-2">⚠️</div>
                <h2 className="text-lg font-semibold mb-1">This page couldn't load</h2>
                <p className="text-sm text-white-dark mb-5">
                    Some data came back in an unexpected form, or the server didn't answer. The rest of the system is fine.
                </p>
                <div className="flex justify-center gap-2">
                    <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Try again</button>
                    <a href="#/" className="btn btn-outline-primary">Go to dashboard</a>
                </div>
                <details className="mt-5 text-left text-xs text-white-dark">
                    <summary className="cursor-pointer">Details for support</summary>
                    <pre className="whitespace-pre-wrap mt-2">{String(this.state.error?.message || this.state.error)}</pre>
                </details>
            </div>
        );
    }
}

/** Keeps the menu usable when one page fails; resets when you move to another page. */
const PageErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { pathname } = useLocation();
    return <Boundary key={pathname}>{children}</Boundary>;
};

export default PageErrorBoundary;
