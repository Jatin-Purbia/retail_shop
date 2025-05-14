import React, { useState, useRef } from 'react';
// import * as XLSX from 'xlsx';
// import jsPDF from 'jspdf';
// import 'jspdf-autotable';

// Import the same inventory from AdminPage
const inventory = [
  { id: 1, name: 'Chini', hindiName: 'चीनी', price: 50, unit: 'किग्रा', stock: 100 },
  { id: 2, name: 'Boora', hindiName: 'बूरा', price: 50, unit: 'किग्रा', stock: 100 },
  { id: 3, name: 'Besan Motia', hindiName: 'बेसन मोटिया', price: 50, unit: 'किग्रा', stock: 100 },
  { id: 4, name: 'Aata Barik', hindiName: 'आटा बारीक', price: 50, unit: 'किग्रा', stock: 100 },
  { id: 5, name: 'Maida', hindiName: 'मैदा', price: 50, unit: 'किग्रा', stock: 100 },
  { id: 6, name: 'Suji', hindiName: 'सूजी', price: 50, unit: 'किग्रा', stock: 100 },
  { id: 7, name: 'Ghee Desi', hindiName: 'घी देसी', price: 50, unit: 'पीपा', stock: 100 },
  { id: 8, name: 'Tel Moongfali', hindiName: 'तेल मूंगफली', price: 50, unit: 'पीपा', stock: 100 },
  { id: 9, name: 'Tel', hindiName: 'तेल', price: 50, unit: 'पीपा', stock: 100 },
  { id: 10, name: 'Kaju', hindiName: 'काजू', price: 50, unit: 'किग्रा', stock: 100 },
  { id: 11, name: 'Badam', hindiName: 'बादाम', price: 50, unit: 'किग्रा', stock: 100 },
  { id: 12, name: 'Pista Saabut', hindiName: 'पिस्ता साबुत', price: 50, unit: 'किग्रा', stock: 100 },
  { id: 13, name: '4 Piece Kaju', hindiName: '4 पीस काजू', price: 50, unit: 'किग्रा', stock: 100 },
  { id: 14, name: 'Kishmish', hindiName: 'किशमिश', price: 50, unit: 'ग्राम', stock: 100 },
  { id: 15, name: 'Cutting Badam', hindiName: 'कटिंग बादाम', price: 50, unit: 'ग्राम', stock: 100 },
  { id: 16, name: 'Cutting Pista', hindiName: 'कटिंग पिस्ता', price: 50, unit: 'ग्राम', stock: 100 },
  { id: 17, name: 'Elaichi', hindiName: 'इलायची', price: 50, unit: 'ग्राम', stock: 100 },
  { id: 18, name: 'Kesar', hindiName: 'केसर', price: 50, unit: 'ग्राम', stock: 100 },
  { id: 19, name: 'Peela Color', hindiName: 'पीला कलर', price: 50, unit: 'ग्राम', stock: 100 },
  { id: 20, name: 'Orange Color', hindiName: 'ऑरेंज कलर', price: 50, unit: 'ग्राम', stock: 100 },
  { id: 21, name: 'Hara Color', hindiName: 'हरा कलर', price: 50, unit: 'ग्राम', stock: 100 },
  { id: 22, name: 'Coffee Color', hindiName: 'कॉफी कलर', price: 50, unit: 'ग्राम', stock: 100 },
  { id: 23, name: 'Chandi Vark', hindiName: 'चांदी वर्क', price: 50, unit: 'गड्डी', stock: 100 },
  { id: 24, name: 'Heeng', hindiName: 'हींग', price: 50, unit: 'ग्राम', stock: 100 },
  { id: 25, name: 'Cutter', hindiName: 'कटर', price: 50, unit: '1', stock: 100 },
  { id: 26, name: 'Butter Paper', hindiName: 'बटर पेपर', price: 50, unit: '1', stock: 100 },
  { id: 27, name: 'Phool Makhana', hindiName: 'फूल मखाना', price: 50, unit: 'ग्राम', stock: 100 },
  { id: 28, name: 'Wafers', hindiName: 'वेफर्स', price: 50, unit: 'किग्रा', stock: 100 },
  { id: 29, name: 'Double Chawal', hindiName: 'डबल चावल', price: 50, unit: 'किग्रा', stock: 100 },
  { id: 30, name: 'Ararot', hindiName: 'अरारोट', price: 50, unit: 'किग्रा', stock: 100 },
  { id: 31, name: 'Moth', hindiName: 'मोट', price: 50, unit: 'ग्राम', stock: 100 },
  { id: 32, name: 'Meetha Soda', hindiName: 'मीठा सोडा', price: 50, unit: 'ग्राम', stock: 100 },
  { id: 33, name: 'Kala Chana', hindiName: 'काला चना', price: 50, unit: 'ग्राम', stock: 100 },
  { id: 34, name: 'Moongfali Dana', hindiName: 'मूंगफली दाना', price: 50, unit: 'किग्रा', stock: 100 },
  { id: 35, name: 'Sooji Saabut', hindiName: 'सूजी साबुत', price: 50, unit: 'ग्राम', stock: 100 },
  { id: 36, name: 'Poha', hindiName: 'पोहा', price: 50, unit: 'किग्रा', stock: 100 },
  { id: 37, name: 'Chhola', hindiName: 'छोला', price: 50, unit: 'किग्रा', stock: 100 },
  { id: 38, name: 'Moong Mogar', hindiName: 'मूंग मोगर', price: 50, unit: 'किग्रा', stock: 100 },
  { id: 39, name: 'Udad Mogar', hindiName: 'उड़द मोगर', price: 50, unit: 'किग्रा', stock: 100 },
  { id: 40, name: 'Chana Dal', hindiName: 'चना दाल', price: 50, unit: 'किग्रा', stock: 100 },
  { id: 41, name: 'Arhar Dal', hindiName: 'अरहर दाल', price: 50, unit: 'किग्रा', stock: 100 },
  { id: 42, name: 'Papad', hindiName: 'पापड़', price: 50, unit: 'नग', stock: 100 },
  { id: 43, name: 'Cutting Papad', hindiName: 'कटिंग पापड़', price: 50, unit: 'ग्राम', stock: 100 },
  { id: 44, name: '0 No. Sev', hindiName: '0 नं. सेव', price: 50, unit: 'ग्राम', stock: 100 },
  { id: 45, name: 'Bikaneri Sev', hindiName: 'बीकानेरी सेव', price: 50, unit: 'किग्रा', stock: 100 },
  { id: 46, name: 'Noodles', hindiName: 'नूडल्स', price: 50, unit: 'पैकेट', stock: 100 },
  { id: 47, name: 'Pasta 2 Prakar', hindiName: 'पास्ता 2 प्रकार', price: 50, unit: 'किग्रा', stock: 100 },
  { id: 48, name: 'Tomato Puree', hindiName: 'टमाटर प्यूरी', price: 50, unit: '3', stock: 100 },
  { id: 49, name: 'Tomato Sauce', hindiName: 'टमाटर सॉस', price: 50, unit: '16', stock: 100 },
  { id: 50, name: 'Sirka', hindiName: 'सिरका', price: 50, unit: '1', stock: 100 },
  { id: 51, name: 'Red Chilli', hindiName: 'रेड चिली', price: 50, unit: '5', stock: 100 },
  { id: 52, name: 'Coffee', hindiName: 'कॉफी', price: 50, unit: 'ग्राम', stock: 100 },
];

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

  // Placeholder export handlers
  const handleExportPDF = () => {
    alert('Export to PDF will be implemented after installing jspdf and jspdf-autotable.');
  };
  const handleExportExcel = () => {
    alert('Export to Excel will be implemented after installing xlsx.');
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-end">
          <div>
            <label className="block text-sm font-semibold text-blue-700 mb-1">Search Item</label>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearch}
              onKeyDown={handleKeyDown}
              ref={searchInputRef}
              className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              placeholder="Search items..."
            />
            {searchTerm && filteredItems.length > 0 && (
              <div className="mt-2 border rounded-lg shadow bg-white max-h-48 overflow-y-auto z-10 relative">
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