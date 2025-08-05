import React from 'react';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  label?: string;
  helperText?: string;
}

const Select: React.FC<SelectProps> = ({
  options,
  placeholder,
  error,
  size = 'md',
  fullWidth = false,
  label,
  helperText,
  className = '',
  disabled,
  id,
  ...props
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  // Base classes matching Button component design system
  const baseClasses = 'relative appearance-none bg-white border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-medium shadow-sm';

  // Size classes matching Button component
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm min-h-[36px] pr-10', // Extra padding-right for arrow
    md: 'px-4 py-2.5 text-sm min-h-[44px] pr-12', // Optimal for mobile
    lg: 'px-6 py-3 text-base min-h-[48px] pr-14', // Prominent actions
  };

  // State-based styling matching Button component
  const stateClasses = error
    ? 'border-red-400 focus:ring-red-600 focus:border-red-600'
    : 'border-gray-400 hover:border-gray-500 focus:ring-blue-600 focus:border-blue-600';

  const widthClass = fullWidth ? 'w-full' : '';

  // Custom arrow icon that matches the design system
  const ArrowIcon = () => (
    <div className={`absolute right-0 top-0 bottom-0 flex items-center pointer-events-none ${
      size === 'sm' ? 'pr-3' : size === 'md' ? 'pr-4' : 'pr-6'
    }`}>
      <svg 
        className={`${error ? 'text-red-400' : 'text-gray-400'} ${
          size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
        }`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );

  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label 
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        <select
          id={selectId}
          className={`${baseClasses} ${sizeClasses[size]} ${stateClasses} ${widthClass} ${className}`}
          disabled={disabled}
          {...props}
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <ArrowIcon />
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600" id={`${selectId}-error`}>
          {error}
        </p>
      )}

      {helperText && !error && (
        <p className="mt-2 text-sm text-gray-500" id={`${selectId}-helper`}>
          {helperText}
        </p>
      )}
    </div>
  );
};

export default Select;