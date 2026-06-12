import { forwardRef, useId, type SelectHTMLAttributes } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  children?: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, children, className = '', id: externalId, ...props }, ref) => {
    const autoId = useId();
    const selectId = externalId || autoId;
    const errorId = error ? `${selectId}-error` : undefined;
    const helperId = helperText && !error ? `${selectId}-helper` : undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-white mb-1">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error}
          aria-describedby={errorId || helperId || undefined}
          className={`
            w-full px-4 py-2.5 rounded-xl
            bg-white/5 text-white
            border ${error ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-accent-green/50'}
            focus:outline-none focus:ring-2 ${error ? 'focus:ring-red-500/20' : 'focus:ring-accent-green/20'}
            disabled:opacity-50 disabled:cursor-not-allowed
            placeholder-gray-400
            transition-all duration-200
            [&>option]:bg-primary-dark [&>option]:text-white
            ${className}
          `}
          {...props}
        >
          {options ? (
            options.map((option) => (
              <option key={option.value} value={option.value} className="bg-primary-dark text-white">
                {option.label}
              </option>
            ))
          ) : (
            children
          )}
        </select>
        {error && (
          <p id={errorId} className="mt-1 text-sm text-red-500">{error}</p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-1 text-sm text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
