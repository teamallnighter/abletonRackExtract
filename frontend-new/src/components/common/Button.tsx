import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 touch-manipulation';

  const variantClasses = {
    primary: 'bg-primary-700 text-white hover:bg-primary-800 focus:ring-border-focus shadow-sm hover:shadow-md border border-primary-700',
    secondary: 'bg-white text-text-primary hover:bg-gray-50 focus:ring-border-focus border border-border-primary shadow-sm',
    danger: 'bg-red-700 text-white hover:bg-red-800 focus:ring-red-700 shadow-sm hover:shadow-md border border-red-700',
    ghost: 'text-text-primary hover:bg-gray-100 focus:ring-border-focus border border-transparent hover:border-border-primary',
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm min-h-[36px]', // 36px meets mobile touch target guidelines
    md: 'px-4 py-2.5 text-sm min-h-[44px]', // 44px is optimal for mobile
    lg: 'px-6 py-3 text-base min-h-[48px]', // 48px for prominent actions
  };

  const widthClass = fullWidth ? 'w-full' : '';

  const isDisabled = disabled || loading;

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <LoadingSpinner 
          size="sm" 
          color={variant === 'primary' || variant === 'danger' ? 'white' : 'gray'} 
          className="mr-2" 
        />
      )}
      {!loading && icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;