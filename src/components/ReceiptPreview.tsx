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
  const generatePNG = async () => {
    const element = document.getElementById('receipt-content');
    if (!element) return;

    try {
      // Temporarily adjust styles for PNG generation
      const originalMaxWidth = element.style.maxWidth;
      const originalWidth = element.style.width;
      const originalPadding = element.style.padding;
      
      element.style.maxWidth = 'none';
      element.style.width = '100%';
      element.style.padding = '10px';
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      
      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${invoice.invoiceNumber}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');

      // Restore original styles
      element.style.maxWidth = originalMaxWidth;
      element.style.width = originalWidth;
      element.style.padding = originalPadding;
    } catch (error) {
      console.error('Error generating PNG:', error);
      alert('Error generating PNG. Please try again.');
    }
  };

  const generatePDF = async () => {
    const element = document.getElementById('receipt-content');
    if (!element) return;

    try {
      // Determine orientation based on screen width
      const isMobile = window.innerWidth <= 768;
      const orientation = isMobile ? 'l' : 'p'; // landscape for mobile, portrait for desktop
      
      // Temporarily adjust styles for PDF generation
      const originalMaxWidth = element.style.maxWidth;
      const originalWidth = element.style.width;
      const originalPadding = element.style.padding;
      
      element.style.maxWidth = 'none';
      element.style.width = '100%';
      element.style.padding = '10px';
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF(orientation, 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate dimensions to fit on single page with minimal margins
      let imgWidth = pdfWidth - 10; // 5mm margin on each side
      let imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // If height exceeds page height, scale down to fit
      if (imgHeight > pdfHeight - 10) {
        const scaleFactor = (pdfHeight - 10) / imgHeight;
        imgHeight = pdfHeight - 10;
        imgWidth = imgWidth * scaleFactor;
      }
      
      // Center the image horizontally
      const xOffset = (pdfWidth - imgWidth) / 2;
      
      pdf.addImage(imgData, 'PNG', xOffset, 5, imgWidth, imgHeight);
      
      pdf.save(`${invoice.invoiceNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      // Restore original styles
      if (element) {
        element.style.maxWidth = originalMaxWidth;
        element.style.width = originalWidth;
        element.style.padding = originalPadding;
      }
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
            onClick={printReceipt}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </button>
          <button
            onClick={generatePNG}
            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Image className="h-4 w-4" />
            <span>PNG</span>
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
      <div id="receipt-content" className="bg-white p-2 shadow-lg receipt w-screen -mx-1">
        {/* Header */}
        <div className="text-center mb-4 pb-3 border-b-2 border-gray-900">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">KNS COSMETICS</h1>
          <div className="text-gray-800 text-sm">
            <p className="text-sm">Tel: 078 700 3268 | 075 700 3268</p>
          </div>
        </div>

        {/* Invoice Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">Bill To:</h3>
            <div className="text-gray-900">
              <p className="font-medium">{invoice.customer.name}</p>
            </div>
          </div>
          
          <div className="text-left md:text-right">
            <div className="mb-2">
              <h2 className="text-xl font-bold text-gray-900 mb-1">INVOICE</h2>
              <p className="text-base"><strong>#{invoice.invoiceNumber}</strong></p>
              <p className="text-gray-800 text-sm">Date: {formatDate(invoice.date)}</p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-4">
          <table className="w-full border-collapse table-fixed text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-2 py-2 text-left font-semibold w-2/5">Description</th>
                <th className="border border-gray-200 px-2 py-2 text-center font-semibold w-1/12">Qty</th>
                <th className="border border-gray-200 px-2 py-2 text-right font-semibold w-1/4">Unit Price</th>
                <th className="border border-gray-200 px-2 py-2 text-right font-semibold w-1/4">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="border border-gray-200 px-2 py-2 break-words overflow-hidden font-medium">{item.productName}</td>
                  <td className="border border-gray-200 px-2 py-2 text-center font-medium">{item.quantity}</td>
                  <td className="border border-gray-200 px-2 py-2 text-right break-all font-medium">{formatLKR(item.unitPrice)}</td>
                  <td className="border border-gray-200 px-2 py-2 text-right font-semibold break-all">{formatLKR(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-full sm:w-3/4 md:w-1/2">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between items-center text-sm mb-1 text-gray-900">
                <span>Subtotal:</span>
                <span>{formatLKR(invoice.subtotal)}</span>
              </div>
              
              {invoice.shippingFee > 0 && (
                <div className="flex justify-between items-center text-sm mb-1 text-blue-700 font-medium">
                  <span>Courier charge:</span>
                  <span>+{formatLKR(invoice.shippingFee)}</span>
                </div>
              )}
              
              {invoice.discount > 0 && (
                <div className="flex justify-between items-center text-sm mb-1 text-red-700 font-medium">
                  <span>Discount:</span>
                  <span>-{formatLKR(invoice.discount)}</span>
                </div>
              )}
              
              {invoice.pendingAmount > 0 && (
                <div className="flex justify-between items-center text-sm mb-1 text-orange-700 font-medium">
                  <span>Pending Amount:</span>
                  <span>+{formatLKR(invoice.pendingAmount)}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center text-lg font-bold border-t-2 border-gray-900 pt-2 text-gray-900">
                <span>Total:</span>
                <span>{formatLKR(invoice.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-800 text-xs border-t border-gray-900 pt-2">
          <p className="mb-1 font-medium">Thank you for your business!</p>
          <p className="font-medium">This is a computer-generated invoice and does not require a signature.</p>
          
          {/* Bank & Branch Details */}
          <div className="mt-2 text-gray-900 text-xs space-y-0.5">
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