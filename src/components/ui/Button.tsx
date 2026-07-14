import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { LoaderCircle } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingLabel?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingLabel,
      disabled,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles = 'font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary-darker disabled:opacity-50 disabled:cursor-not-allowed active:scale-95';
    
    const variantStyles = {
      primary: 'bg-accent-green text-primary-dark hover:bg-accent-light hover:shadow-[0_0_15px_rgba(0,255,136,0.3)] focus:ring-accent-green border border-transparent',
      secondary: 'bg-transparent text-white border border-gray-600 hover:border-accent-green hover:text-accent-green focus:ring-accent-green',
      danger: 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/50 focus:ring-red-500',
      ghost: 'bg-transparent text-gray-400 hover:text-white hover:bg-white/5 focus:ring-gray-500',
    };
    
    const sizeStyles = {
      sm: 'px-3 py-2 text-sm min-h-10',
      md: 'px-4 py-2.5 text-base min-h-11',
      lg: 'px-6 py-3 text-lg min-h-12',
    };

    const spinnerSizes = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <LoaderCircle className={`animate-spin ${spinnerSizes[size]}`} aria-hidden="true" />
            <span>{loadingLabel ?? children}</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
