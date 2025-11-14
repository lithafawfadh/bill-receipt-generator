import React, { useState } from 'react';
import { Customer, SaleItem } from '../types';
import { formatLKR } from '../utils/currency';
import { getNextInvoiceNumber, saveInvoice, getInvoiceByNumber, updateInvoice, migrateLocalStorageToSupabase } from '../utils/storage';
import { ReceiptPreview } from './ReceiptPreview';
import { InvoiceHistory } from './InvoiceHistory';
import { Receipt, User, Plus, Minus, Trash2, Calculator, ShoppingCart, List, X, FileText, Search, CreditCard as Edit, Database } from 'lucide-react';

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
    
    // Reset form
    setNewItem({
      name: '',
      quantity: '',
      price: '',
    });
    
    // Clear any item-related errors
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
      
      // Remove successfully added products
      setParsedProducts(products => products.filter(p => p.error));
      
      // If all products were added successfully, close bulk add section
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
        console.log('Processing invoice...');
        console.log('Editing invoice ID:', editingInvoiceId);
        
        let invoice;
        
        if (editingInvoiceId) {
          console.log('Updating existing invoice...');
          // Update existing invoice
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
              date: new Date().toISOString(), // Update the date to current time
            };
            await updateInvoice(invoice);
          }
        } else {
          console.log('Creating new invoice...');
          // Create new invoice
          const invoiceNumber = await getNextInvoiceNumber();
          console.log('Generated invoice number:', invoiceNumber);
          
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
          console.log('Saving invoice to database...');
          await saveInvoice(invoice);
        }

        console.log('Invoice processed successfully');
        setCurrentInvoice(invoice);
        setShowReceipt(true);
      } catch (error) {
        console.error('Detailed error processing invoice:', error);
        
        // More specific error messages
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

    console.log('Searching for invoice:', searchInvoiceNumber.trim());
    setIsLoading(true);
    setLoadingMessage('Searching for invoice...');

    try {
      const foundInvoice = await getInvoiceByNumber(searchInvoiceNumber.trim());
      console.log('Search result:', foundInvoice ? 'Found' : 'Not found');
      
      if (foundInvoice) {
        // Load the invoice data into the form
        setCustomer(foundInvoice.customer);
        setSaleItems(foundInvoice.items);
        setDiscountAmount(foundInvoice.discount || '');
        setShippingFeeAmount(foundInvoice.shippingFee || '');
        setPendingAmount(foundInvoice.pendingAmount || '');
        setEditingInvoiceId(foundInvoice.id);
        setSearchError('');
        
        // Clear any existing errors
        setErrors({});
      } else {
        setSearchError('Invoice not found. Please check the invoice number.');
      }
    } catch (error) {
      console.error('Detailed error searching invoice:', error);
      
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

    console.log('Starting data migration...');
    try {
      await migrateLocalStorageToSupabase();
      console.log('Migration completed successfully');
      alert('Data migration completed successfully!');
    } catch (error) {
      console.error('Detailed migration error:', error);
      
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
    // Load the invoice data into the form
    setCustomer(invoice.customer);
    setSaleItems(invoice.items);
    setDiscountAmount(invoice.discount || '');
    setShippingFeeAmount(invoice.shippingFee || '');
    setPendingAmount(invoice.pendingAmount || '');
    setEditingInvoiceId(invoice.id);
    setSearchInvoiceNumber(invoice.invoiceNumber);
    setSearchError('');
    setShowHistory(false);
    
    // Clear any existing errors
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
            <span className="text-gray-700">{loadingMessage}</span>
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Receipt className="h-8 w-8 text-green-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sales Receipt Generator</h1>
              {editingInvoiceId && (
                <p className="text-sm text-blue-600 font-medium">Editing Invoice: {searchInvoiceNumber}</p>
              )}
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FileText className="h-4 w-4" />
              <span>{showHistory ? 'Hide' : 'View'} History</span>
            </button>
            
            {(saleItems.length > 0 || customer.name) && (
              <button
                onClick={handleNewReceipt}
                className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>New Receipt</span>
              </button>
            )}
          </div>
        </div>
        <p className="text-gray-600 mt-2">Create professional receipts with automatic calculations</p>
      </div>

      {/* Search Existing Invoice */}
      <div className="mb-8 bg-blue-50 rounded-lg shadow-md p-6 border border-blue-200">
        <div className="flex items-center space-x-2 mb-4">
          <Search className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-blue-900">Search & Edit Existing Receipt</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={searchInvoiceNumber}
              onChange={(e) => {
                setSearchInvoiceNumber(e.target.value);
                setSearchError('');
              }}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                searchError ? 'border-red-500' : 'border-blue-300'
              }`}
              placeholder="Enter invoice number (e.g., INV-1001)"
            />
            {searchError && <p className="text-red-500 text-xs mt-1">{searchError}</p>}
          </div>
          <button
            onClick={handleSearchInvoice}
            disabled={!searchInvoiceNumber.trim() || isLoading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <Edit className="h-4 w-4" />
            <span>Load for Editing</span>
          </button>
        </div>
        
        <p className="text-blue-700 text-sm mt-2">
          Search for an existing invoice to make changes. All invoice data will be loaded into the form below.
        </p>
        
        {/* Migration Button */}
        <div className="mt-4 pt-4 border-t border-blue-200">
          <button
            onClick={handleMigrateData}
            disabled={isLoading}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-sm"
          >
            <Database className="h-4 w-4" />
            <span>Migrate localStorage Data</span>
          </button>
          <p className="text-purple-700 text-xs mt-1">
            One-time migration of existing data from browser storage to Supabase
          </p>
        </div>
      </div>

      {/* Invoice History */}
      {showHistory && (
        <div className="mb-8">
          <InvoiceHistory onEditInvoice={handleEditFromHistory} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Customer Details */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-2 mb-4">
            <User className="h-5 w-5 text-gray-600" />
            <h2 className="text-xl font-semibold">Customer Details</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                value={customer.name}
                onChange={(e) => setCustomer({...customer, name: e.target.value})}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.customerName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter customer name"
              />
              {errors.customerName && <p className="text-red-500 text-xs mt-1">{errors.customerName}</p>}
            </div>
          </div>
        </div>

        {/* Add Items Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Calculator className="h-5 w-5 text-gray-600" />
              <h2 className="text-xl font-semibold">Add Items</h2>
            </div>
            <button
              onClick={() => setShowBulkAdd(!showBulkAdd)}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              <List className="h-4 w-4" />
              <span>Bulk Add</span>
            </button>
          </div>

          {/* Bulk Add Section */}
          {showBulkAdd && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
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
                    placeholder="Fresh and white&#10;Ujooba cream&#10;Fogg master&#10;Fogg colour&#10;Biocos cream&#10;Home made 25g"
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
                  
                  <div className="max-h-64 overflow-y-auto space-y-3">
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Single Item</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                value={newItem.name}
                onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.itemName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter product description"
              />
              {errors.itemName && <p className="text-red-500 text-xs mt-1">{errors.itemName}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({...newItem, quantity: e.target.value === '' ? '' : parseInt(e.target.value) || ''})}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    errors.itemQuantity ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter quantity"
                />
                {errors.itemQuantity && <p className="text-red-500 text-xs mt-1">{errors.itemQuantity}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Price (LKR) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItem.price}
                  onChange={(e) => setNewItem({...newItem, price: e.target.value === '' ? '' : parseFloat(e.target.value) || ''})}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    errors.itemPrice ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter price"
                />
                {errors.itemPrice && <p className="text-red-500 text-xs mt-1">{errors.itemPrice}</p>}
              </div>
            </div>

            {/* Total Preview */}
            {typeof newItem.quantity === 'number' && newItem.quantity > 0 && typeof newItem.price === 'number' && newItem.price > 0 && (
              <div className="bg-green-50 p-3 rounded-md">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    Item Total:
                  </span>
                  <span className="text-lg font-bold text-green-700">
                    {formatLKR(newItem.quantity * newItem.price)}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={addNewItem}
              disabled={showBulkAdd}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Item</span>
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* Items List */}
      {saleItems.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-2 mb-4">
            <ShoppingCart className="h-5 w-5 text-gray-600" />
            <h2 className="text-xl font-semibold">Items Added</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Product</th>
                  <th className="text-center py-2">Quantity</th>
                  <th className="text-right py-2">Unit Price</th>
                  <th className="text-right py-2">Total</th>
                  <th className="text-center py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {saleItems.map((item) => (
                  <tr key={item.productId} className="border-b">
                    <td className="py-3 break-words max-w-0">{item.productName}</td>
                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => updateSaleItemQuantity(item.productId, item.quantity - 1)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateSaleItemQuantity(item.productId, item.quantity + 1)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 text-right">{formatLKR(item.unitPrice)}</td>
                    <td className="py-3 text-right font-semibold">{formatLKR(item.total)}</td>
                    <td className="py-3 text-center">
                      <button
                        onClick={() => removeSaleItem(item.productId)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total Section */}
          <div className="mt-6 border-t pt-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-lg">
                <span>Subtotal:</span>
                <span>{formatLKR(subtotal)}</span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Courier charge (LKR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shippingFeeAmount}
                  onChange={(e) => setShippingFeeAmount(e.target.value === '' ? '' : parseFloat(e.target.value) || '')}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    errors.shippingFee ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter courier charge"
                />
                {errors.shippingFee && <p className="text-red-500 text-xs mt-1">{errors.shippingFee}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Amount (LKR)
                </label>
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value === '' ? '' : parseFloat(e.target.value) || '')}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    errors.discount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter discount amount"
                />
                {errors.discount && <p className="text-red-500 text-xs mt-1">{errors.discount}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pending Amount (Additional Charge) (LKR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pendingAmount}
                  onChange={(e) => setPendingAmount(e.target.value === '' ? '' : parseFloat(e.target.value) || '')}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    errors.pendingAmount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter additional pending amount"
                />
                {errors.pendingAmount && <p className="text-red-500 text-xs mt-1">{errors.pendingAmount}</p>}
              </div>
              
              {shippingFee > 0 && (
                <div className="flex justify-between items-center text-base text-blue-600">
                  <span>Courier charge:</span>
                  <span>+{formatLKR(shippingFee)}</span>
                </div>
              )}
              
              {discount > 0 && (
                <div className="flex justify-between items-center text-base text-red-600">
                  <span>Discount:</span>
                  <span>-{formatLKR(discount)}</span>
                </div>
              )}
              
              {pendingAmt > 0 && (
                <div className="flex justify-between items-center text-base text-orange-600">
                  <span>Pending Amount:</span>
                  <span>+{formatLKR(pendingAmt)}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center text-xl font-bold border-t pt-2">
                <span>Total Amount:</span>
                <span className="text-green-600">{formatLKR(finalTotal)}</span>
                </div>
            </div>
          </div>

          {errors.items && <p className="text-red-500 text-sm mt-2">{errors.items}</p>}

          <button
            onClick={generateReceipt}
            disabled={isLoading}
            className={`w-full mt-6 px-6 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 text-white ${
              editingInvoiceId 
                ? 'bg-orange-600 hover:bg-orange-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Receipt className="h-5 w-5" />
            <span>{editingInvoiceId ? 'Update Receipt' : 'Generate Receipt'}</span>
          </button>
        </div>
      )}
    </div>
  );
};