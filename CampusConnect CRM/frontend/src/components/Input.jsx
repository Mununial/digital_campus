import React from 'react';
import { cn } from '../utils/cn';

const Input = React.forwardRef(({ className, label, error, prefix, ...props }, ref) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="text-sm font-medium text-secondary/80 ml-1">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <div className="absolute left-3 text-secondary/50 font-medium text-sm flex items-center h-full pointer-events-none">
            {prefix}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'flex h-10 w-full rounded-lg border border-secondary/20 bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary transition-all disabled:cursor-not-allowed disabled:opacity-50',
            prefix && 'pl-11',
            error && 'border-danger focus-visible:ring-danger/50',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs text-danger font-medium ml-1">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
