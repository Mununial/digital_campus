import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const Error = ({ message = 'Something went wrong.', onRetry }) => {
  return (
    <div className="error-container">
      <div className="error-icon" style={{ display: 'flex', justifyContent: 'center' }}>
        <AlertTriangle size={32} color="#ef4444" />
      </div>
      <p className="error-message">{message}</p>
      {onRetry && (
        <button className="error-retry-btn" onClick={onRetry} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={14} />
          Try Again
        </button>
      )}
    </div>
  );
};

export default Error;
