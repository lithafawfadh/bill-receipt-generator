import React, { useState } from 'react';
import { Customer, SaleItem } from '../types';
import { formatLKR } from '../utils/currency';
import { getNextInvoiceNumber, saveInvoice, getInvoiceByNumber, updateInvoice, migrateLocalStorageToSupabase } from '../utils/storage';
import { ReceiptPreview } from './ReceiptPreview';
import { InvoiceHistory } from './InvoiceHistory';
import { Receipt, User, Plus, Minus, Trash2, ShoppingCart, List, X, FileText, Search, CreditCard as Edit, Database } from 'lucide-react';

interface BulkProduct {
  tempId: string;
  name: string;
  quantity: number;
  price: number;
  error?: string;
}

export const SalesReceipt: React.FC = () => {
  const [customer, setCustomer] = useState<Customer>({
    name: '',
  });
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [newItem, setNewItem] = useState({
    name: '',
    quantity: '' as number | '',
    price: '' as number | '',
  });
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkInputText, setBulkInputText] = useState('');
  const [parsedProducts, setParsedProducts] = useState<BulkProduct[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number | ''>('');
  const [shippingFeeAmount, setShippingFeeAmount] = useState<number | ''>('');
  const [searchInvoiceNumber, setSearchInvoiceNumber] = useState('');
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [searchError, setSearchError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [pendingAmount, setPendingAmount] = useState<number | ''>('');
  const [showHistory, setShowHistory] = useState(false);

  const addNewItem = () => {
    if (!validateNewItem()) return;

    const quantity = typeof newItem.quantity === 'string' ? parseInt(newItem.quantity) : newItem.quantity;
    const price = typeof newItem.price === 'string' ? parseFloat(newItem.price) : newItem.price;

    const newSaleItem: SaleItem = {
      productId: crypto.randomUUID(),
      productName: newItem.name,
      quantity: quantity,
      unitPrice: price,
      total: quantity * price,
    };

    setSaleItems([...saleItems, newSaleItem]);
    
    setNewItem({
      name: '',
      quantity: '',
      price: '',
    });
    
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.itemName;
      delete newErrors.itemQuantity;
      delete newErrors.itemPrice;
      return newErrors;
    });
  };

  const handleParseBulkProducts = () => {
    if (!bulkInputText.trim()) return;

    const productNames = bulkInputText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const parsed = productNames.map(name => ({
      tempId: crypto.randomUUID(),
      name,
      quantity: '' as number | '',
      price: '' as number | '',
    }));

    setParsedProducts(parsed);
    setBulkInputText('');
  };

  const updateParsedProduct = (tempId: string, field: 'quantity' | 'price', value: number) => {
    setParsedProducts(products =>
      products.map(product =>
        product.tempId === tempId
          ? { ...product, [field]: value === 0 ? '' : value, error: undefined }
          : product
      )
    );
  };

  const removeParsedProduct = (tempId: string) => {
    setParsedProducts(products => products.filter(p => p.tempId !== tempId));
  };

  const addParsedProductsToReceipt = () => {
    const validProducts: SaleItem[] = [];
    const updatedParsedProducts = parsedProducts.map(product => {
      let error = '';
      
      if (!product.name.trim()) {
        error = 'Product name is required';
      } else if (typeof product.quantity !== 'number' || product.quantity <= 0) {
        error = 'Quantity must be greater than zero';
      } else if (typeof product.price !== 'number' || product.price <= 0) {
        error = 'Price must be greater than zero';
      }

      if (!error) {
        validProducts.push({
          productId: crypto.randomUUID(),
          productName: product.name,
          quantity: product.quantity,
          unitPrice: product.price,
          total: product.quantity * product.price,
        });
      }

      return { ...product, error };
    });

    setParsedProducts(updatedParsedProducts);

    if (validProducts.length > 0) {
      setSaleItems(prev => [...prev, ...validProducts]);
      
      setParsedProducts(products => products.filter(p => p.error));
      
      if (updatedParsedProducts.every(p => !p.error)) {
        setShowBulkAdd(false);
        setParsedProducts([]);
      }
    }
  };

  const closeBulkAdd = () => {
    setShowBulkAdd(false);
    setBulkInputText('');
    setParsedProducts([]);
  };

  const validateNewItem = () => {
    const newErrors: Record<string, string> = {};

    if (!newItem.name.trim()) {
      newErrors.itemName = 'Product name is required';
    }

    const quantity = typeof newItem.quantity === 'string' ? parseInt(newItem.quantity) : newItem.quantity;
    const price = typeof newItem.price === 'string' ? parseFloat(newItem.price) : newItem.price;

    if (!quantity || quantity <= 0) {
      newErrors.itemQuantity = 'Quantity must be greater than zero';
    }

    if (!price || price <= 0) {
      newErrors.itemPrice = 'Price must be greater than zero';
    }

    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const updateSaleItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeSaleItem(productId);
      return;
    }

    setSaleItems(items =>
      items.map(item =>
        item.productId === productId
          ? { ...item, quantity, total: quantity * item.unitPrice }
          : item
      )
    );
  };

  const removeSaleItem = (productId: string) => {
    setSaleItems(items => items.filter(item => item.productId !== productId));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!customer.name.trim()) {
      newErrors.customerName = 'Customer name is required';
    }
    if (saleItems.length === 0) {
      newErrors.items = 'Please add at least one item to the sale';
    }
    
    const discount = typeof discountAmount === 'string' ? 0 : discountAmount;
    const shippingFee = typeof shippingFeeAmount === 'string' ? 0 : shippingFeeAmount;
    if (discount < 0) {
      newErrors.discount = 'Discount cannot be negative';
    }
    if (discount > subtotal) {
      newErrors.discount = 'Discount cannot exceed subtotal amount';
    }
    
    if (shippingFee < 0) {
      newErrors.shippingFee = 'Courier charge cannot be negative';
    }
    
    const pendingAmt = typeof pendingAmount === 'string' ? 0 : pendingAmount;
    if (pendingAmt < 0) {
      newErrors.pendingAmount = 'Pending amount cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateReceipt = () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setLoadingMessage(editingInvoiceId ? 'Updating invoice...' : 'Generating invoice...');

    const subtotal = saleItems.reduce((sum, item) => sum + item.total, 0);
    const discount = typeof discountAmount === 'string' ? 0 : discountAmount;
    const shippingFee = typeof shippingFeeAmount === 'string' ? 0 : shippingFeeAmount;
    const pendingAmt = typeof pendingAmount === 'string' ? 0 : pendingAmount;
    const totalAmount = subtotal - discount + shippingFee + pendingAmt;
    
    const processInvoice = async () => {
      try {
        let invoice;
        
        if (editingInvoiceId) {
          const existingInvoice = await getInvoiceByNumber(searchInvoiceNumber);
          if (existingInvoice) {
            invoice = {
              ...existingInvoice,
              customer,
              items: saleItems,
              subtotal,
              discount,
              shippingFee,
              total: totalAmount,
              pendingAmount: pendingAmt,
              date: new Date().toISOString(),
            };
            await updateInvoice(invoice);
          }
        } else {
          const invoiceNumber = await getNextInvoiceNumber();
          
          invoice = {
            id: crypto.randomUUID(),
            invoiceNumber,
            customer,
            items: saleItems,
            subtotal,
            discount,
            shippingFee,
            total: totalAmount,
            pendingAmount: pendingAmt,
            date: new Date().toISOString(),
          };
          await saveInvoice(invoice);
        }

        setCurrentInvoice(invoice);
        setShowReceipt(true);
      } catch (error) {
        console.error('Error processing invoice:', error);
        
        let errorMessage = 'Error processing invoice. ';
        if (error instanceof Error) {
          if (error.message.includes('Missing Supabase environment variables')) {
            errorMessage += 'Supabase is not configured. Please connect to Supabase first.';
          } else if (error.message.includes('Failed to save invoice')) {
            errorMessage += 'Database connection failed. Please check your Supabase connection.';
          } else {
            errorMessage += error.message;
          }
        } else {
          errorMessage += 'Please try again.';
        }
        
        alert(errorMessage);
      } finally {
        setIsLoading(false);
        setLoadingMessage('');
      }
    };

    processInvoice();
  };

  const handleNewReceipt = () => {
    setCustomer({ name: '' });
    setSaleItems([]);
    setNewItem({ name: '', quantity: '', price: '' });
    setDiscountAmount('');
    setShippingFeeAmount('');
    setPendingAmount('');
    setErrors({});
    setCurrentInvoice(null);
    setShowReceipt(false);
    setEditingInvoiceId(null);
    setSearchInvoiceNumber('');
    setSearchError('');
  };

  const handleSearchInvoice = async () => {
    if (!searchInvoiceNumber.trim()) {
      setSearchError('Please enter an invoice number');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Searching for invoice...');

    try {
      const foundInvoice = await getInvoiceByNumber(searchInvoiceNumber.trim());
      
      if (foundInvoice) {
        setCustomer(foundInvoice.customer);
        setSaleItems(foundInvoice.items);
        setDiscountAmount(foundInvoice.discount || '');
        setShippingFeeAmount(foundInvoice.shippingFee || '');
        setPendingAmount(foundInvoice.pendingAmount || '');
        setEditingInvoiceId(foundInvoice.id);
        setSearchError('');
        setErrors({});
      } else {
        setSearchError('Invoice not found. Please check the invoice number.');
      }
    } catch (error) {
      console.error('Error searching invoice:', error);
      
      let errorMessage = 'Error searching for invoice. ';
      if (error instanceof Error) {
        if (error.message.includes('Missing Supabase environment variables')) {
          errorMessage = 'Supabase is not configured. Please connect to Supabase first.';
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += 'Please try again.';
      }
      
      setSearchError(errorMessage);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleMigrateData = async () => {
    setIsLoading(true);
    setLoadingMessage('Migrating data from localStorage to Supabase...');

    try {
      await migrateLocalStorageToSupabase();
      alert('Data migration completed successfully!');
    } catch (error) {
      console.error('Migration error:', error);
      
      let errorMessage = 'Error during migration. ';
      if (error instanceof Error) {
        if (error.message.includes('Missing Supabase environment variables')) {
          errorMessage = 'Supabase is not configured. Please connect to Supabase first.';
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += 'Please check the console for details.';
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleEditFromHistory = (invoice: any) => {
    setCustomer(invoice.customer);
    setSaleItems(invoice.items);
    setDiscountAmount(invoice.discount || '');
    setShippingFeeAmount(invoice.shippingFee || '');
    setPendingAmount(invoice.pendingAmount || '');
    setEditingInvoiceId(invoice.id);
    setSearchInvoiceNumber(invoice.invoiceNumber);
    setSearchError('');
    setShowHistory(false);
    setErrors({});
  };

  const subtotal = saleItems.reduce((sum, item) => sum + item.total, 0);
  const discount = typeof discountAmount === 'string' ? 0 : discountAmount;
  const shippingFee = typeof shippingFeeAmount === 'string' ? 0 : shippingFeeAmount;
  const pendingAmt = typeof pendingAmount === 'string' ? 0 : pendingAmount;
  const finalTotal = subtotal - discount + shippingFee + pendingAmt;

  if (showReceipt && currentInvoice) {
    return (
      <ReceiptPreview 
        invoice={currentInvoice} 
        onBack={() => setShowReceipt(false)} 
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
            <span className="text-gray-700">{loadingMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Receipt className="h-7 w-7 text-emerald-600" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Sales Receipt</h1>
              {editingInvoiceId && (
                <p className="text-xs sm:text-sm text-blue-600 font-medium mt-0.5">
                  Editing: {searchInvoiceNumber}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <FileText className="h-4 w-4" />
              <span>{showHistory ? 'Hide' : 'History'}</span>
            </button>
            
            {(saleItems.length > 0 || customer.name) && (
              <button
                onClick={handleNewReceipt}
                className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-gray-600 text-white px-4 py-2.5 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                <span>New</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search Existing Invoice */}
      <div className="mb-6 bg-white rounded-xl shadow-sm p-4 sm:p-5 border border-gray-200">
        <div className="flex items-center space-x-2 mb-3">
          <Search className="h-5 w-5 text-blue-600" />
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Edit Existing Receipt</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={searchInvoiceNumber}
              onChange={(e) => {
                setSearchInvoiceNumber(e.target.value);
                setSearchError('');
              }}
              className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                searchError ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter invoice number (e.g., INV-1001)"
            />
            {searchError && <p className="text-red-500 text-xs mt-1">{searchError}</p>}
          </div>
          <button
            onClick={handleSearchInvoice}
            disabled={!searchInvoiceNumber.trim() || isLoading}
            className="w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm font-medium"
          >
            <Edit className="h-4 w-4" />
            <span>Load</span>
          </button>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={handleMigrateData}
            disabled={isLoading}
            className="w-full sm:w-auto bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-xs sm:text-sm"
          >
            <Database className="h-4 w-4" />
            <span>Migrate Data</span>
          </button>
        </div>
      </div>

      {/* Invoice History */}
      {showHistory && (
        <div className="mb-6">
          <InvoiceHistory onEditInvoice={handleEditFromHistory} />
        </div>
      )}

      <div className="space-y-4 sm:space-y-5">
        {/* Customer Details */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 border border-gray-200">
          <div className="flex items-center space-x-2 mb-4">
            <User className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Customer</h2>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={customer.name}
              onChange={(e) => setCustomer({...customer, name: e.target.value})}
              className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm ${
                errors.customerName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter customer name"
            />
            {errors.customerName && <p className="text-red-500 text-xs mt-1">{errors.customerName}</p>}
          </div>
        </div>

        {/* Add Items Section */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Plus className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Add Items</h2>
            </div>
            <button
              onClick={() => setShowBulkAdd(!showBulkAdd)}
              className="flex items-center space-x-1.5 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              <List className="h-4 w-4" />
              <span>Bulk</span>
            </button>
          </div>

          {/* Bulk Add Section */}
          {showBulkAdd && (
            <div className="mb-5 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-blue-900">Bulk Add Products</h3>
                <button
                  onClick={closeBulkAdd}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              {parsedProducts.length === 0 ? (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-blue-800">
                    Paste product list (one per line):
                  </label>
                  <textarea
                    value={bulkInputText}
                    onChange={(e) => setBulkInputText(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Fresh and white&#10;Ujooba cream&#10;Fogg master"
                    rows={6}
                  />
                  <button
                    onClick={handleParseBulkProducts}
                    disabled={!bulkInputText.trim()}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Parse Products</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-blue-900">Set Quantities & Prices</h4>
                    <span className="text-sm text-blue-700">{parsedProducts.length} products</span>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto space-y-3 custom-scrollbar">
                    {parsedProducts.map((product) => (
                      <div key={product.tempId} className="bg-white p-3 rounded border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{product.name}</span>
                          <button
                            onClick={() => removeParsedProduct(product.tempId)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Qty</label>
                            <input
                              type="number"
                              min="1"
                              value={product.quantity}
                              onChange={(e) => updateParsedProduct(product.tempId, 'quantity', e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Price (LKR)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={product.price}
                              onChange={(e) => updateParsedProduct(product.tempId, 'price', e.target.value === '' ? '' : parseFloat(e.target.value) || '')}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        
                        {product.error && (
                          <p className="text-red-500 text-xs mt-1">{product.error}</p>
                        )}
                        
                        {typeof product.quantity === 'number' && product.quantity > 0 && typeof product.price === 'number' && product.price > 0 && (
                          <div className="mt-2 text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                            Total: {formatLKR(product.quantity * product.price)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={addParsedProductsToReceipt}
                      disabled={parsedProducts.length === 0}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add All to Receipt</span>
                    </button>
                    <button
                      onClick={closeBulkAdd}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Single Item Add Section */}
          <div className={showBulkAdd ? 'opacity-50' : ''}>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm ${
                    errors.itemName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter product name"
                />
                {errors.itemName && <p className="text-red-500 text-xs mt-1">{errors.itemName}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({...newItem, quantity: e.target.value === '' ? '' : parseInt(e.target.value) || ''})}
                    className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm ${
                      errors.itemQuantity ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Qty"
                  />
                  {errors.itemQuantity && <p className="text-re