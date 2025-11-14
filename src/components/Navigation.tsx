import React from 'react';
import { Receipt } from 'lucide-react';

export const Navigation: React.FC = () => {
  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-center h-14 sm:h-16">
          <div className="flex items-center space-x-2">
            <Receipt className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-600" />
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Bill Generator</h1>
          </div>
        </div>
      </div>
    </nav>
  );
};