import React from 'react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error | null;
  onRetry?: () => void;
  retryText?: string;
  showDetails?: boolean;
  className?: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  error,
  onRetry,
  retryText = 'Try Again',
  showDetails = false,
  className = '',
}) => {
  const getErrorMessage = () => {
    if (error) {
      if (error.message.includes('Failed to fetch')) {
        return 'Network error. Please check your connection and try again.';
      }
      if (error.message.includes('404')) {
        return 'The requested resource was not found.';
      }
      if (error.message.includes('401') || error.message.includes('403')) {
        return 'You are not authorized to access this resource.';
      }
      if (error.message.includes('500')) {
        return 'Server error. Please try again later.';
      }
      return error.message;
    }
    return message;
  };

  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {getErrorMessage()}
      </p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{retryText}</span>
        </button>
      )}
      
      {showDetails && error && process.env.NODE_ENV === 'development' && (
        <details className="mt-6 text-left max-w-md mx-auto">
          <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
            Error Details (Development)
          </summary>
          <pre className="mt-2 text-xs text-red-600 bg-red-50 p-3 rounded overflow-auto">
            {error.toString()}
            {error.stack && `\n\nStack trace:\n${error.stack}`}
          </pre>
        </details>
      )}
    </div>
  );
};

export default ErrorState;