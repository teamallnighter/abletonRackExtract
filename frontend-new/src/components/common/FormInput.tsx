import React from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  textColor?: string;
}

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  textColor?: string;
}

// Shared input styles - change text color here once!
const getInputClasses = (textColor = 'text-black') => {
  return `w-full px-3 py-2 border border-border-primary rounded-md shadow-sm placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-border-focus disabled:bg-gray-100 disabled:text-text-disabled ${textColor} transition-colors`;
};

export const FormInput: React.FC<FormInputProps> = ({ 
  label, 
  error, 
  textColor,
  className = '',
  ...props 
}) => {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-2">
          {label}
        </label>
      )}
      <input
        className={`${getInputClasses(textColor)} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export const FormTextarea: React.FC<FormTextareaProps> = ({ 
  label, 
  error, 
  textColor,
  className = '',
  ...props 
}) => {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-2">
          {label}
        </label>
      )}
      <textarea
        className={`${getInputClasses(textColor)} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};