import React from 'react';
import { Invoice } from '../types';
import { formatLKR } from '../utils/currency';
import { Download, ArrowLeft, Printer, Image } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ReceiptPreviewProps {
  invoice: Invoice;
  onBack: () => void;
}

export const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({ invoice, onBack }) => {
  const downloadAsPNG = async () => {
    const element = document.getElementById('receipt-content');
    if (!element) return;

    try {
      // Temporarily adjust styles for PNG generation
      const originalStyles = {
        maxWidth: element.style.maxWidth,
        width: element.style.width,
        padding: element.style.padding,
        margin: element.style.margin,
        transform: element.style.transform
      };
      
      // Set fixed dimensions for consistent output
      element.style.maxWidth = '800px';
      element.style.width = '800px';
      element.style.padding = '20px';
      element.style.margin = '0 auto';
      element.style.transform = 'none';
      
      const canvas = await html2canvas(element, {
        scale: 2, // High quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 840, // 800px + 40px padding
        height: null, // Auto height
      });
      
      // Create download link
      const link = document.createElement('a');
      link.download = `${invoice.invoiceNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      // Restore original styles
      Object.assign(element.style, originalStyles);
    } catch (error) {
      console.error('Error generating PNG:', error);
      alert('Error generating PNG. Please try again.');
    }
  };

  const generatePDF = async () => {
    const element = document.getElementById('receipt-content');
    if (!element) return;

    try {
      // Temporarily adjust styles for PDF generation
      const originalStyles = {
        maxWidth: element.style.maxWidth,
        width: element.style.width,
        padding: element.style.padding,
        margin: element.style.margin,
        transform: element.style.transform
      };
      
      // Set fixed dimensions for consistent output
      element.style.maxWidth = '800px';
      element.style.width = '800px';
      element.style.padding = '20px';
      element.style.margin = '0 auto';
      element.style.transform = 'none';
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 840, // 800px + 40px padding
        height: null, // Auto height
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4'); // Always portrait
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate dimensions to fit properly
      let imgWidth = pdfWidth - 20; // 10mm margin on each side
      let imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // If height exceeds page height, scale down
      if (imgHeight > pdfHeight - 20) {
        const scaleFactor = (pdfHeight - 20) / imgHeight;
        imgHeight = pdfHeight - 20;
        imgWidth = imgWidth * scaleFactor;
      }
      
      // Center the image horizontally
      const xOffset = (pdfWidth - imgWidth) / 2;
      
      pdf.addImage(imgData, 'PNG', xOffset, 10, imgWidth, imgHeight);
      
      pdf.save(`${invoice.invoiceNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      // Restore original styles
      if (element) Object.assign(element.style, originalStyles);
    }
  };

  const printReceipt = () => {
    const element = document.getElementById('receipt-content');
    if (!element) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 5px; }
            .receipt { width: 100%; margin: 0 auto; padding: 10px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
            .info-section { margin-bottom: 15px; }
            .info-section h3 { margin-bottom: 8px; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .total-row { font-weight: bold; font-size: 16px; }
            .text-right { text-align: right; }
            @media print {
              body { margin: 0; padding: 2px; }
              .receipt { width: 100%; max-width: none; padding: 5px; }
              table { font-size: 11px; }
              th, td { padding: 6px; }
            }
          </style>
        </head>
        <body>
          ${element.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };


  return (
    <div className="w-full px-2 py-4">
      {/* Action Buttons */}
      <div className="mb-4 flex justify-between items-center px-2">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Sales</span>
        </button>
        
        <div className="flex space-x-3">
          <button
            onClick={downloadAsPNG}
            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Image className="h-4 w-4" />
            <span>PNG</span>
          </button>
          <button
            onClick={printReceipt}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </button>
          <button
            onClick={generatePDF}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Receipt Content */}
      <div id="receipt-content" className="bg-white shadow-lg max-w-4xl mx-auto" style={{ padding: '20px', minHeight: '600px' }}>
        {/* Header */}
        <div className="text-center border-b-2 border-gray-300 pb-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            KNS COSMETICS
          </h1>
          <p className="text-gray-600 text-base">
            Tel: 078 700 3268 | 075 700 3268
          </p>
        </div>

        {/* Invoice Info */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Bill To:</h3>
            <div className="text-gray-700">
              <p className="font-medium text-base">{invoice.customer.name}</p>
            </div>
          </div>
          
          <div className="text-right">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">INVOICE</h2>
              <p className="text-lg font-semibold">#{invoice.invoiceNumber}</p>
              <p className="text-gray-600 text-base mt-1">Date: {formatDate(invoice.date)}</p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-3 text-left font-semibold" style={{ width: '45%' }}>Description</th>
                <th className="border border-gray-300 px-4 py-3 text-center font-semibold" style={{ width: '15%' }}>Qty</th>
                <th className="border border-gray-300 px-4 py-3 text-right font-semibold" style={{ width: '20%' }}>Unit Price</th>
                <th className="border border-gray-300 px-4 py-3 text-right font-semibold" style={{ width: '20%' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 px-4 py-3 text-left">{item.productName}</td>
                  <td className="border border-gray-300 px-4 py-3 text-center">{item.quantity}</td>
                  <td className="border border-gray-300 px-4 py-3 text-right">{formatLKR(item.unitPrice)}</td>
                  <td className="border border-gray-300 px-4 py-3 text-right font-medium">{formatLKR(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-80">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center text-base mb-2">
                <span>Subtotal:</span>
                <span>{formatLKR(invoice.subtotal)}</span>
              </div>
              
              {invoice.shippingFee > 0 && (
                <div className="flex justify-between items-center text-base mb-2 text-blue-600">
                  <span>Courier charge:</span>
                  <span>+{formatLKR(invoice.shippingFee)}</span>
                </div>
              )}
              
              {invoice.discount > 0 && (
                <div className="flex justify-between items-center text-base mb-2 text-red-600">
                  <span>Discount:</span>
                  <span>-{formatLKR(invoice.discount)}</span>
                </div>
              )}
              
              {invoice.pendingAmount > 0 && (
                <div className="flex justify-between items-center text-base mb-2 text-orange-600">
                  <span>Pending Amount:</span>
                  <span>+{formatLKR(invoice.pendingAmount)}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center text-xl font-bold border-t-2 border-gray-300 pt-3 mt-2">
                <span>Total:</span>
                <span>{formatLKR(invoice.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-600 text-sm border-t pt-4">
          <p className="mb-2">Thank you for your business!</p>
          <p>This is a computer-generated invoice and does not require a signature.</p>
          
          {/* Bank & Branch Details */}
          <div className="mt-4 text-gray-700 text-sm space-y-1">
            <p className="font-bold">JM KULSHAN <span className="font-normal">(Branch Kalmunai)</span></p>
            <p className="font-bold">BOC BANK – <span className="font-bold">82344969</span></p>
            <p className="font-bold">COM BANK – <span className="font-bold">8012128811</span></p>
            <p className="font-bold">PEOPLE'S BANK – <span className="font-bold">338200280013200</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};