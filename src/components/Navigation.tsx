import React from 'react';
import { Receipt, Calculator } from 'lucide-react';

export const Navigation: React.FC = () => {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <Calculator className="h-8 w-8 text-green-600" />
            <h1 className="text-xl font-semibold text-gray-900">Receipt Generator</h1>
          </div>
          
          <div className="flex items-center space-x-2 text-gray-600">
            <Receipt className="h-5 w-5" />
            <span className="hidden sm:block text-sm font-medium">Sales Receipt</span>
          </div>
        </div>
      </div>
    </nav>
  );
};