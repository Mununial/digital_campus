import React from 'react';

const Button = ({ 
  children, 
  onClick, 
  type = 'button', 
  variant = 'primary', 
  disabled = false, 
  isLoading = false,
  className = '' 
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`btn btn-${variant} ${isLoading ? 'btn-loading' : ''} ${className}`}
    >
      {isLoading ? (
        <span className="btn-spinner"></span>
      ) : null}
      <span className="btn-content">{children}</span>
    </button>
  );
};

export default Button;
