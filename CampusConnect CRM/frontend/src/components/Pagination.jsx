import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';
import Button from './Button';

const Pagination = ({ currentPage, totalPages, onPageChange, totalResults, resultsPerPage }) => {
  const start = (currentPage - 1) * resultsPerPage + 1;
  const end = Math.min(currentPage * resultsPerPage, totalResults);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
      <p className="text-sm text-secondary/40">
        Showing <span className="font-bold text-secondary-900">{start}</span> to <span className="font-bold text-secondary-900">{end}</span> of <span className="font-bold text-secondary-900">{totalResults}</span> results
      </p>

      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 h-auto"
        >
          <ChevronLeft size={18} />
        </Button>
        
        <div className="flex items-center gap-1">
          {[...Array(totalPages)].map((_, i) => (
            <Button
              key={i + 1}
              variant={currentPage === i + 1 ? 'primary' : 'ghost'}
              size="sm"
              className="w-9 h-9 p-0"
              onClick={() => onPageChange(i + 1)}
            >
              {i + 1}
            </Button>
          ))}
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 h-auto"
        >
          <ChevronRight size={18} />
        </Button>
      </div>
    </div>
  );
};

export default Pagination;
