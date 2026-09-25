import React from 'react';
import { cn } from '../utils/cn';

const Table = ({ headers, children, className }) => {
  return (
    <div className={cn('w-full overflow-hidden rounded-2xl border border-secondary/10 bg-white shadow-sm', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-secondary/5 border-b border-secondary/10">
            <tr>
              {headers.map((header, index) => (
                <th key={index} className="px-6 py-4 text-xs font-bold text-secondary/60 uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary/5">
            {children}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const TableRow = ({ children, className, onClick }) => (
  <tr 
    onClick={onClick}
    className={cn(
      'transition-colors hover:bg-secondary/2',
      onClick && 'cursor-pointer',
      className
    )}
  >
    {children}
  </tr>
);

export const TableCell = ({ children, className }) => (
  <td className={cn('px-6 py-4 text-sm text-secondary/80 whitespace-nowrap', className)}>
    {children}
  </td>
);

export default Table;
