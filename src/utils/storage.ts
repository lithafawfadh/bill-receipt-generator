import { Invoice } from '../types';
import { supabase, getCurrentUserId } from './supabaseClient';

export const getInvoices = async (): Promise<Invoice[]> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invoices:', error);
      throw new Error('Failed to fetch invoices');
    }

    return data || [];
  } catch (error) {
    console.error('Error in getInvoices:', error);
    throw error;
  }
};

export const saveInvoice = async (invoice: Invoice): Promise<void> => {
  try {
    console.log('Attempting to save invoice:', invoice.invoiceNumber);
    
    const { error } = await supabase
      .from('invoices')
      .insert([{
        id: invoice.id,
        invoice_number: invoice.invoiceNumber,
        customer: invoice.customer,
        items: invoice.items,
        subtotal: invoice.subtotal,
        discount: invoice.discount,
        shipping_fee: invoice.shippingFee,
        total: invoice.total,
        pending_amount: invoice.pendingAmount,
        date: invoice.date,
      }]);

    if (error) {
      console.error('Supabase error details:', error);
      console.error('Error saving invoice:', error);
      throw new Error('Failed to save invoice');
    }
    console.log('Invoice saved successfully');
  } catch (error) {
    console.error('Error in saveInvoice:', error);
    throw error;
  }
};

export const getNextInvoiceNumber = async (): Promise<string> => {
  try {
    console.log('Getting next invoice number...');
    
    // Get the highest existing invoice number and increment
    const { data: invoices, error: fetchError } = await supabase
      .from('invoices')
      .select('invoice_number')
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Supabase fetch error:', fetchError);
      console.error('Error fetching latest invoice:', fetchError);
      // Ultimate fallback
      return `INV-${Date.now().toString().slice(-4)}`;
    }

    if (invoices && invoices.length > 0) {
      const lastInvoiceNumber = invoices[0].invoice_number;
      console.log('Last invoice number:', lastInvoiceNumber);
      const numberPart = parseInt(lastInvoiceNumber.split('-')[1]) || 1000;
      const nextNumber = `INV-${(numberPart + 1).toString().padStart(4, '0')}`;
      console.log('Next invoice number:', nextNumber);
      return nextNumber;
    }

    console.log('No existing invoices, starting with INV-1001');
    return 'INV-1001';
  } catch (error) {
    console.error('Error in getNextInvoiceNumber:', error);
    // Fallback to timestamp-based number
    return `INV-${Date.now().toString().slice(-4)}`;
  }
};

export const getInvoiceByNumber = async (invoiceNumber: string): Promise<Invoice | undefined> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('invoice_number', invoiceNumber)
      .maybeSingle();

    if (error) {
      console.error('Error fetching invoice by number:', error);
      throw new Error('Failed to fetch invoice');
    }

    if (!data) return undefined;

    // Convert database format back to Invoice interface
    return {
      id: data.id,
      invoiceNumber: data.invoice_number,
      customer: data.customer,
      items: data.items,
      subtotal: parseFloat(data.subtotal),
      discount: parseFloat(data.discount),
      shippingFee: parseFloat(data.shipping_fee),
      total: parseFloat(data.total),
      pendingAmount: parseFloat(data.pending_amount || '0'),
      date: data.date,
      user_id: data.user_id,
    };
  } catch (error) {
    console.error('Error in getInvoiceByNumber:', error);
    throw error;
  }
};

export const updateInvoice = async (updatedInvoice: Invoice): Promise<void> => {
  try {
    const currentUserId = await getCurrentUserId();
    
    // Prepare the update payload
    const updatePayload: any = {
      customer: updatedInvoice.customer,
      items: updatedInvoice.items,
      subtotal: updatedInvoice.subtotal,
      discount: updatedInvoice.discount,
      shipping_fee: updatedInvoice.shippingFee,
      total: updatedInvoice.total,
      pending_amount: updatedInvoice.pendingAmount,
      date: updatedInvoice.date,
      updated_at: new Date().toISOString(),
    };
    
    // If the invoice has no user_id (was created anonymously) and we have a current user,
    // assign the invoice to the current user
    if (!updatedInvoice.user_id && currentUserId) {
      updatePayload.user_id = currentUserId;
    } else if (updatedInvoice.user_id) {
      // Maintain existing user_id
      updatePayload.user_id = updatedInvoice.user_id;
    }
    
    const { error } = await supabase
      .from('invoices')
      .update(updatePayload)
      .eq('id', updatedInvoice.id);

    if (error) {
      console.error('Error updating invoice:', error);
      throw new Error('Failed to update invoice');
    }
  } catch (error) {
    console.error('Error in updateInvoice:', error);
    throw error;
  }
};

// Migration function to move localStorage data to Supabase (run once)
export const migrateLocalStorageToSupabase = async (): Promise<void> => {
  try {
    const INVOICES_KEY = 'sales_invoices';
    const stored = localStorage.getItem(INVOICES_KEY);
    
    if (!stored) {
      console.log('No localStorage data to migrate');
      return;
    }

    const localInvoices: Invoice[] = JSON.parse(stored);
    
    if (localInvoices.length === 0) {
      console.log('No invoices to migrate');
      return;
    }

    console.log(`Migrating ${localInvoices.length} invoices to Supabase...`);

    // Insert all invoices
    for (const invoice of localInvoices) {
      await saveInvoice(invoice);
    }

    console.log('Migration completed successfully');
    
    // Optionally clear localStorage after successful migration
    // localStorage.removeItem(INVOICES_KEY);
    // localStorage.removeItem('invoice_counter');
    
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
};