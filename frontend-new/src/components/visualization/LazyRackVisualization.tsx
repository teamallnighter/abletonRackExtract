import React, { Suspense, lazy } from 'react';
import { useRackStore } from '../../stores/rackStore';

// Lazy load the heavy visualization component
const RackFlowVisualization = lazy(() => import('./RackFlowVisualization'));

const LoadingFallback = () => (
  <div className="w-full h-[400px] sm:h-[500px] md:h-[600px] bg-gray-50 rounded-lg overflow-hidden border flex items-center justify-center">
    <div className="text-center space-y-4 px-4">
      <div className="animate-spin rounded-full h-8 sm:h-12 w-8 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
      <div className="space-y-2">
        <p className="text-gray-700 font-medium text-sm sm:text-base">Loading Rack Visualization</p>
        <p className="text-gray-500 text-xs sm:text-sm hidden sm:block">Preparing interactive diagram...</p>
      </div>
    </div>
  </div>
);

const ErrorFallback = ({ error, retry }: { error: Error; retry: () => void }) => (
  <div className="w-full h-[400px] sm:h-[500px] md:h-[600px] bg-gray-50 rounded-lg overflow-hidden border flex items-center justify-center">
    <div className="text-center space-y-4 max-w-sm sm:max-w-md mx-auto px-4">
      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-lg flex items-center justify-center mx-auto">
        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 13.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Visualization Error</h3>
        <p className="text-gray-600 text-xs sm:text-sm mb-4">
          Unable to load the rack visualization. This might be due to a complex rack structure or performance limitations.
        </p>
        <button
          onClick={retry}
          className="bg-blue-600 text-white px-3 py-2 sm:px-4 sm:py-2 text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
      <details className="text-left hidden sm:block">
        <summary className="text-xs text-gray-400 cursor-pointer">Error Details</summary>
        <pre className="text-xs text-gray-500 mt-2 overflow-auto max-h-32">
          {error.message}
        </pre>
      </details>
    </div>
  </div>
);

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ComponentType<{ error: Error; retry: () => void }> },
  { hasError: boolean; error: Error | null; retryCount: number }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Rack visualization error:', error, errorInfo);
  }

  retry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      retryCount: this.state.retryCount + 1 
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const Fallback = this.props.fallback;
      return <Fallback error={this.state.error} retry={this.retry} />;
    }

    return this.props.children;
  }
}

const LazyRackVisualization = () => {
  const { currentRack } = useRackStore();

  // Don't render anything if no rack is selected
  if (!currentRack) {
    return (
      <div className="w-full h-[400px] sm:h-[500px] md:h-[600px] bg-gray-50 rounded-lg overflow-hidden border flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Rack Selected</h3>
          <p className="text-gray-600">Upload a rack file to see the visualization</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={ErrorFallback}>
      <Suspense fallback={<LoadingFallback />}>
        <RackFlowVisualization />
      </Suspense>
    </ErrorBoundary>
  );
};

export default LazyRackVisualization;