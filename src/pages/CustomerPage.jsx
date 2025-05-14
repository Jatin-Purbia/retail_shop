import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import inventory from '../inventoryData';

function CustomerPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedUnit, setSelectedUnit] = useState('किग्रा');
  const [cart, setCart] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchInputRef = useRef(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    const filtered = inventory.filter(item =>
      item.name.toLowerCase().includes(value.toLowerCase()) ||
      item.hindiName.includes(value)
    );
    setFilteredItems(filtered);
    setHighlightedIndex(filtered.length > 0 ? 0 : -1);
    setSelectedItem(null);
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;
    const cartItem = {
      ...selectedItem,
      quantity,
      unit: selectedUnit,
      total: selectedItem.price * quantity
    };
    setCart([...cart, cartItem]);
    setSearchTerm('');
    setFilteredItems([]);
    setQuantity(1);
    setHighlightedIndex(-1);
    setSelectedItem(null);
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (!filteredItems.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = (prev + 1) % filteredItems.length;
        setSelectedItem(filteredItems[next]);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = (prev - 1 + filteredItems.length) % filteredItems.length;
        setSelectedItem(filteredItems[next]);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0) {
        setSelectedItem(filteredItems[highlightedIndex]);
        setSearchTerm(filteredItems[highlightedIndex].hindiName + ' (' + filteredItems[highlightedIndex].name + ')');
        setFilteredItems([]);
      }
    }
  };

  const handleRecommendationClick = (item, idx) => {
    setHighlightedIndex(idx);
    setSelectedItem(item);
    setSearchTerm(item.hindiName + ' (' + item.name + ')');
    setFilteredItems([]);
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  };

  const generateBillData = () => {
    const data = [['Customer Name:', customerName || 'N/A'], ['Mobile No.:', customerMobile || 'N/A'], []];
    const itemsPerRow = 2;
    const numItems = cart.length;

    for (let i = 0; i < numItems; i += itemsPerRow) {
      const row = [];
      for (let j = 0; j < itemsPerRow; j++) {
        const itemIndex = i + j;
        if (itemIndex < numItems) {
          const item = cart[itemIndex];
          row.push([`${item.hindiName} (${item.quantity} ${item.unit})`, '']);
        } else {
          row.push(['', '']); // Empty columns for uneven rows
        }
      }
      data.push(...row);
      if (i + itemsPerRow < numItems) {
        data.push([]); // Add an empty row as a separator between item rows
      }
    }
    return data;
  };

  const handleExportPDF = () => {
    if (cart.length === 0) {
      alert('Your cart is empty. Add items to export.');
      return;
    }

    const doc = new jsPDF();
    const billData = generateBillData();

    doc.autoTable({
      body: billData,
      startY: 10,
      columnStyles: { 0: { fontStyle: 'bold' } },
      didDrawPage: (data) => {
        // Add page number
        const pageNumber = doc.internal.getNumberOfPages();
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`Page ${pageNumber}`, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 10);
      }
    });

    doc.save(`bill_${customerName || 'guest'}_${new Date().toLocaleDateString()}.pdf`);
  };

  const handleExportExcel = () => {
    if (cart.length === 0) {
      alert('Your cart is empty. Add items to export.');
      return;
    }

    const billData = generateBillData();
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(billData);
    XLSX.utils.book_append_sheet(wb, ws, 'Bill');
    XLSX.writeFile(wb, `bill_${customerName || 'guest'}_${new Date().toLocaleDateString()}.xlsx`);
  };

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 shadow-xl rounded-2xl p-8 mb-8 border border-blue-200">
        <h1 className="text-3xl font-bold mb-6 text-blue-800 text-center tracking-wide">Customer Billing</h1>
        <div className="flex flex-col md:flex-row md:space-x-8 mb-6">
          <div className="flex-1 mb-4 md:mb-0">
            <label className="block text-sm font-semibold text-blue-700 mb-1">Customer Name</label>
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              placeholder="Enter customer name"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold text-blue-700 mb-1">Mobile Number</label>
            <input
              type="text"
              value={customerMobile}
              onChange={e => setCustomerMobile(e.target.value)}
              className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              placeholder="Enter mobile number"
              maxLength={10}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-end relative">
          <div>
            <label className="block text-sm font-semibold text-blue-700 mb-1">Search Item</label>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearch}
              onKeyDown={handleKeyDown}
              ref={searchInputRef}
              className="w-full px-4 py -2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              placeholder="Search items..."
            />
            {searchTerm && filteredItems.length > 0 && (
              <div className="mt-2 border rounded-lg shadow bg-white max-h-48 overflow-y-auto z-20 absolute w-full left-0">
                {filteredItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`p-2 cursor-pointer text-blue-800 ${idx === highlightedIndex ? 'bg-blue-200' : 'hover:bg-blue-100'}`}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onMouseDown={() => handleRecommendationClick(item, idx)}
                  >
                    {item.hindiName} ({item.name})
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-blue-700 mb-1">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              min="1"
            />
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-blue-700 mb-1">Unit</label>
              <select
                value={selectedUnit}
                onChange={e => setSelectedUnit(e.target.value)}
                className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              >
                <option value="किग्रा">किग्रा</option>
                <option value="ग्राम">ग्राम</option>
                <option value="पीपा">पीपा</option>
                <option value="गड्डी">गड्डी</option>
                <option value="नग">नग</option>
                <option value="पैकेट">पैकेट</option>
                <option value="1">1</option>
                <option value="3">3</option>
                <option value="5">5</option>
                <option value="16">16</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              className="ml-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold shadow hover:bg-blue-700 transition"
              disabled={!selectedItem}
            >
              Add Product
            </button>
          </div>
        </div>
        <div className="mt-10">
          <h2 className="text-2xl font-semibold mb-4 text-blue-700">Current Bill</h2>
          <div className="overflow-x-auto rounded-lg border border-blue-200 bg-white">
            <table className="min-w-full divide-y divide-blue-100">
              <thead className="bg-blue-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase">Item (Hindi)</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase">Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-blue-100">
                {cart.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-900">{item.hindiName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700">{item.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700">{item.unit}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700">₹{item.price}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700">₹{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xl font-bold text-blue-800">Total Amount: ₹{calculateTotal()}</p>
            <div className="flex gap-4">
              <button
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold shadow hover:bg-green-700 transition"
                onClick={handleExportExcel}
              >
                Export as Excel
              </button>
              <button
                className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold shadow hover:bg-red-700 transition"
                onClick={handleExportPDF}
              >
                Export as PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerPage;