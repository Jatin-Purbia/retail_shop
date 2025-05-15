import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import inventory from '../inventoryData';

// Helper to format date as DD.MM.YYYY
function formatDate(date = new Date()) {
  return date.toLocaleDateString('en-GB').replace(/\//g, '.');
}

// Helper to generate two-column table rows with a blank third column
function generateTwoColumnTable(cart) {
  const rows = [];
  for (let i = 0; i < cart.length; i += 2) {
    const left = cart[i];
    const right = cart[i + 1];
    rows.push([
      left ? left.hindiName : '',
      left ? `${left.quantity} ${left.unit}` : '',
      '', // Blank column
      right ? right.hindiName : '',
      right ? `${right.quantity} ${right.unit}` : '',
      '', // Blank column
    ]);
  }
  return rows;
}

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

  // Ref for the bill area
  const billRef = useRef();

  // Search and cart logic (unchanged)
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

  // PDF export using html2canvas + jsPDF, capturing only the bill area
  const handleExportPDF = async () => {
    if (cart.length === 0) {
      alert('Your cart is empty. Add items to export.');
      return;
    }
    const input = billRef.current;
    if (!input) return;
    const canvas = await html2canvas(input, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgProps = {
      width: canvas.width,
      height: canvas.height
    };
    const ratio = Math.min(pdfWidth / imgProps.width, pdfHeight / imgProps.height);
    const imgWidth = imgProps.width * ratio;
    const imgHeight = imgProps.height * ratio;
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`bill_${customerName || 'guest'}_${formatDate()}.pdf`);
  };

  // Excel export
  const handleExportExcel = () => {
    if (cart.length === 0) {
      alert('Your cart is empty. Add items to export.');
      return;
    }
    const wsData = [
      ['! श्री राम जी !!'],
      [`दिनांक ${formatDate()} को शाम तक देना है।`],
      [
        `नाम: ${customerName ? customerName : ''}`,
        '',
        '',
        `मो. नं. ${customerMobile ? customerMobile : ''}`,
        '',
        ''
      ],
      ['', '', '', '', '', ''], // Empty row for spacing
      ['उत्पाद (हिन्दी)', 'मात्रा', '', 'उत्पाद (हिन्दी)', 'मात्रा', ''], // Headers
      ...generateTwoColumnTable(cart)
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 20 }, { wch: 12 }, { wch: 5 }, { wch: 20 }, { wch: 12 }, { wch: 5 }
    ];
    // Center align all cells
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = XLSX.utils.encode_cell({ c: C, r: R });
        if (!ws[cell_address]) continue;
        ws[cell_address].s = { alignment: { horizontal: 'center' } };
      }
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bill');
    XLSX.writeFile(wb, `bill_${customerName || 'customer'}_${formatDate()}.xlsx`);
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="bg-white shadow-xl rounded-2xl p-8 mb-8 border border-gray-200">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 text-center tracking-wide">Customer Billing</h1>
        {/* Inputs as in your code */}
        <div className="flex flex-col md:flex-row md:space-x-8 mb-6">
          <div className="flex-1 mb-4 md:mb-0">
            <label className="block text-sm font-semibold text-gray-700 mb-1">ग्राहक का नाम (हिन्दी)</label>
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              placeholder="ग्राहक का नाम दर्ज करें"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-1">मोबाइल नंबर</label>
            <input
              type="text"
              value={customerMobile}
              onChange={e => setCustomerMobile(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              placeholder="मोबाइल नंबर दर्ज करें"
              maxLength={10}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-end relative">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">उत्पाद खोजें</label>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearch}
              onKeyDown={handleKeyDown}
              ref={searchInputRef}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              placeholder="उत्पाद का नाम दर्ज करें..."
            />
            {searchTerm && filteredItems.length > 0 && (
              <div className="mt-2 border rounded-lg shadow bg-white max-h-48 overflow-y-auto z-20 absolute w-full left-0">
                {filteredItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`p-2 cursor-pointer text-gray-800 ${idx === highlightedIndex ? 'bg-blue-200' : 'hover:bg-blue-100'}`}
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
            <label className="block text-sm font-semibold text-gray-700 mb-1">मात्रा</label>
            <input
              type="number"
              value={quantity}
              onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              min="1"
            />
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">इकाई</label>
              <select
                value={selectedUnit}
                onChange={e => setSelectedUnit(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
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
              उत्पाद जोड़ें
            </button>
          </div>
        </div>
        {/* BILL AREA TO EXPORT */}
        <div
          ref={billRef}
          className="bg-white p-6 border border-black rounded-md"
          style={{
            fontFamily: 'DejaVu Sans, Arial, sans-serif',
            color: '#222',
            width: '100%',
            maxWidth: 700,
            margin: '0 auto'
          }}
        >
          <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 18, marginBottom: 2 }}>! श्री राम जी !!</div>
          <div style={{ textAlign: 'center', fontSize: 14, marginBottom: 12 }}>
            {`दिनांक ${formatDate()} को शाम तक देना है।`}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
            <span>नाम: {customerName ? customerName : ''}</span>
            <span>मो. नं. {customerMobile ? customerMobile : ''}</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #000', padding: 3, width: '26%', textAlign: 'center' }}>उत्पाद (हिन्दी)</th>
                <th style={{ border: '1px solid #000', padding: 3, width: '12%', textAlign: 'center' }}>मात्रा</th>
                <th style={{ border: '1px solid #000', padding: 3, width: '12%' }}></th> {/* Blank */}
                <th style={{ border: '1px solid #000', padding: 3, width: '26%', textAlign: 'center' }}>उत्पाद (हिन्दी)</th>
                <th style={{ border: '1px solid #000', padding: 3, width: '12%', textAlign: 'center' }}>मात्रा</th>
                <th style={{ border: '1px solid #000', padding: 3, width: '12%' }}></th> {/* Blank */}
              </tr>
            </thead>
            <tbody>
              {generateTwoColumnTable(cart).map((row, idx) => (
                <tr key={idx}>
                  <td style={{ border: '1px solid #000', padding: 3, textAlign: 'center' }}>{row[0]}</td>
                  <td style={{ border: '1px solid #000', padding: 3, textAlign: 'center' }}>{row[1]}</td>
                  <td style={{ border: '1px solid #000', padding: 3 }}></td> {/* Blank */}
                  <td style={{ border: '1px solid #000', padding: 3, textAlign: 'center' }}>{row[3]}</td>
                  <td style={{ border: '1px solid #000', padding: 3, textAlign: 'center' }}>{row[4]}</td>
                  <td style={{ border: '1px solid #000', padding: 3 }}></td> {/* Blank */}
                </tr>
              ))}
              {/* Fill remaining cells if cart has odd number of items */}
              {cart.length % 2 !== 0 && (
                <tr>
                  <td style={{ border: '1px solid #000', padding: 3, textAlign: 'center' }}>{cart[cart.length - 1].hindiName}</td>
                  <td style={{ border: '1px solid #000', padding: 3, textAlign: 'center' }}>{`${cart[cart.length - 1].quantity} ${cart[cart.length - 1].unit}`}</td>
                  <td style={{ border: '1px solid #000', padding: 3 }}></td>
                  <td style={{ border: '1px solid #000', padding: 3 }}></td>
                  <td style={{ border: '1px solid #000', padding: 3 }}></td>
                  <td style={{ border: '1px solid #000', padding: 3 }}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Export buttons */}
        <div className="mt-6 flex gap-4 justify-end">
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
  );
}

export default CustomerPage;