import React, { useState, useEffect } from 'react';
import { Invoice } from '../types';
import { getInvoices } from '../utils/storage';
import { formatLKR } from '../utils/currency';
import { FileText, Calendar, User, DollarSign, Search, RefreshCw } from 'lucide-react';

interface InvoiceHistoryProps {
  onEditInvoice: (invoice: Invoice) => void;
}

export const InvoiceHistory: React.FC<InvoiceHistoryProps> = ({ onEditInvoice }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadInvoices = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('Loading invoices from database...');
      const data = await getInvoices();
      console.log('Loaded invoices:', data.length);
      setInvoices(data);
    } catch (err) {
      console.error('Error loading invoices:', err);
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-700">Loading past records...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <FileText className="h-12 w-12 mx-auto mb-2" />
            <h3 className="text-lg font-semibold">Error Loading Records</h3>
            <p className="text-sm mt-2">{error}</p>
          </div>
          <button
            onClick={loadInvoices}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-gray-600" />
          <h2 className="text-xl font-semibold">Past Records</h2>
          <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
            {invoices.length} invoices
          </span>
        </div>
        
        <button
          onClick={loadInvoices}
          className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Records Found</h3>
          <p className="text-gray-500">
            No past invoices found in the database. Create your first invoice to see it here.
          </p>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search by invoice number or customer name..."
              />
            </div>
          </div>

          {/* Invoice List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onEditInvoice(invoice)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-blue-600">
                      {invoice.invoiceNumber}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDate(invoice.date)}
                    </span>
                  </div>
                  <span className="font-bold text-green-600">
                    {formatLKR(invoice.total)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <User className="h-3 w-3" />
                    <span>{invoice.customer.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <FileText className="h-3 w-3" />
                    <span>{invoice.items.length} items</span>
                  </div>
                  {invoice.discount > 0 && (
                    <div className="flex items-center space-x-1 text-red-600">
                      <DollarSign className="h-3 w-3" />
                      <span>-{formatLKR(invoice.discount)} discount</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredInvoices.length === 0 && searchTerm && (
            <div className="text-center py-4">
              <p className="text-gray-500">
                No invoices found matching "{searchTerm}"
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};