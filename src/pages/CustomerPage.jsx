import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import inventory from '../inventoryData';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

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
  const [selectedUnit, setSelectedUnit] = useState('कि.ग्रा.');
  const [cart, setCart] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const searchInputRef = useRef(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [deliveryDate, setDeliveryDate] = useState(new Date());
  const [deliveryTimeHindi, setDeliveryTimeHindi] = useState('सुबह'); // Default to morning

  // Ref for the bill area
  const billRef = useRef();

  // Function to translate text using Google Translate API
  const translateText = async (text) => {
    if (!text) {
      setNameSuggestions([]);
      return;
    }
    try {
      const response = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=${encodeURIComponent(
          text
        )}`
      );
      const data = await response.json();
      if (data && data[0]) {
        // Extracting the most probable translation
        const primaryTranslation = data[0][0][0];
        if (primaryTranslation) {
          setNameSuggestions([primaryTranslation]);
        } else {
          setNameSuggestions([]);
        }
      }
    } catch (error) {
      console.error('Translation error:', error);
    }
  };

  // Debounce translation requests
  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerName && /[a-zA-Z]/.test(customerName)) {
        translateText(customerName);
      } else {
        setNameSuggestions([]);
      }
    }, 300); // Reduced debounce time for better responsiveness

    return () => clearTimeout(timer);
  }, [customerName]);

  // Search and cart logic
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    const filtered = inventory.filter(
      (item) =>
        item.name.toLowerCase().includes(value.toLowerCase()) ||
        item.hindiName.includes(value)
    );
    setFilteredItems(filtered);
    setHighlightedIndex(filtered.length > 0 ? 0 : -1);
    setSelectedItem(null);
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;

    const existingItemIndex = cart.findIndex(
      (item) => item.id === selectedItem.id && item.unit === selectedUnit
    );

    const cartItem = {
      ...selectedItem,
      quantity,
      unit: selectedUnit,
    };

    if (existingItemIndex > -1) {
      // Update quantity if item exists with the same unit
      const updatedCart = [...cart];
      updatedCart[existingItemIndex] = {
        ...updatedCart[existingItemIndex],
        quantity: updatedCart[existingItemIndex].quantity + quantity,
      };
      setCart(updatedCart);
    } else {
      // Add new item to cart
      setCart((prevCart) => [...prevCart, cartItem]);
    }

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
        const selected = filteredItems[highlightedIndex];
        setSelectedItem(selected);
        setSearchTerm(selected.hindiName + ' (' + selected.name + ')');
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

  const handleDeliveryTimeChange = (event) => {
    setDeliveryTimeHindi(event.target.value);
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
      format: 'a4',
    });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgProps = {
      width: canvas.width,
      height: canvas.height,
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
    const formattedDeliveryDate = formatDate(deliveryDate);

    const timeMapping = {
      सुबह: 'Morning',
      दोपहर: 'Afternoon',
      शाम: 'Evening',
    };
    const englishDeliveryTime = timeMapping[deliveryTimeHindi] || '';

    const wsData = [
      ['! श्री राम जी !!'],
      [`दिनांक ${deliveryDate} को ${deliveryTimeHindi} तक देना है।`],
      [
        `नाम: ${customerName ? customerName : ''}`,
        '',
        '',
        `मो. नं. ${customerMobile ? customerMobile : ''}`,
        '',
        '',
        '',
      ],
      [`डिलीवरी: ${formattedDeliveryDate}, ${englishDeliveryTime}`, '', '', '', '', ''],
      ['', '', '', '', '', ''], // Empty row for spacing
      ['उत्पाद (हिन्दी)', 'मात्रा', '', 'उत्पाद (हिन्दी)', 'मात्रा', ''], // Headers
      ...generateTwoColumnTable(cart),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 20 },
      { wch: 12 },
      { wch: 5 },
      { wch: 20 },
      { wch: 12 },
      { wch: 5 },
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

  const formattedDeliveryDateBill = formatDate(deliveryDate);

  const timeMappingBill = {
    सुबह: 'सुबह',
    दोपहर: 'दोपहर',
    शाम: 'शाम',
  };
  const hindiDeliveryTimeBill = timeMappingBill[deliveryTimeHindi] || '';

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-2xl p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800 text-center tracking-wide">
            Customer Billing
          </h1>

          {/* Customer Details Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                ग्राहक का नाम (हिन्दी)
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  setShowNameSuggestions(true);
                }}
                onFocus={() => setShowNameSuggestions(true)}
                onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                placeholder="Enter customer name in English or Hindi"
              />
              {showNameSuggestions && nameSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {nameSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
                      onMouseDown={() => {
                        setCustomerName(suggestion);
                        setShowNameSuggestions(false);
                      }}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                मोबाइल नंबर
              </label>
              <input
                type="text"
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                placeholder="मोबाइल नंबर दर्ज करें"
                maxLength={10}
              />
            </div>
          </div>

          {/* Delivery Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                डिलीवरी की तारीख
              </label>
              <DatePicker
                selected={deliveryDate}
                onChange={(date) => setDeliveryDate(date)}
                dateFormat="dd.MM.yyyy"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                डिलीवरी का समय
              </label>
              <select
                value={deliveryTimeHindi}
                onChange={handleDeliveryTimeChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              >
                <option value="सुबह">सुबह</option>
                <option value="दोपहर">दोपहर</option>
                <option value="शाम">शाम</option>
              </select>
            </div>
          </div>

          {/* Product Search and Add Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-end relative">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                उत्पाद खोजें
              </label>
              <div className="relative">
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
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`p-2 cursor-pointer text-gray-800 ${
                          idx === highlightedIndex ? 'bg-blue-200' : 'hover:bg-blue-100'
                        }`}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        onMouseDown={() => handleRecommendationClick(item, idx)}
                      >
                        {item.hindiName} ({item.name})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                मात्रा
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                min="1"
              />
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  इकाई
                </label>
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus :ring-2 focus:ring-blue-400 bg-white"
                >
                  <option value="किग्रा">कि.ग्रा.</option>
                  <option value="ग्राम">ग्राम</option>
                  <option value="पीपा">पीपा</option>
                  <option value="गड्डी">गड्डी</option>
                  <option value="पैकेट">पैकेट</option>
                  <option value=" ">None</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleAddToCart}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold shadow hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!selectedItem}
              >
                उत्पाद जोड़ें
              </button>
            </div>
          </div>

          {/* Bill Area */}
          <div
            ref={billRef}
            className="bg-white p-6 border border-gray-300 rounded-lg shadow-sm mb-8"
            style={{
              fontFamily: 'DejaVu Sans, Arial, sans-serif',
              color: '#222',
              width: '100%',
              maxWidth: 700,
              margin: '0 auto',
            }}
          >
            <div className="text-center font-bold text-lg mb-2">! श्री राम जी !!</div>
            <div className="text-center text-sm mb-4">
              {`दिनांक ${formattedDeliveryDateBill} को ${hindiDeliveryTimeBill} तक देना है।`}
            </div>
            <div className="flex justify-between text-sm mb-4">
              <span>नाम: {customerName || ''}</span>
              <span>मो. नं. {customerMobile || ''}</span>
            </div>

            {/* <div className="text-sm mb-2">
              डिलीवरी: {formattedDeliveryDateBill}, {hindiDeliveryTimeBill}
            </div> */}
            
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-gray-300 p-2 w-1/4 text-center">
                    उत्पाद (हिन्दी)
                  </th>
                  <th className="border border-gray-300 p-2 w-1/6 text-center">
                    मात्रा
                  </th>
                  <th className="border border-gray-300 p-2 w-1/12"></th>
                  <th className="border border-gray-300 p-2 w-1/4 text-center">
                    उत्पाद (हिन्दी)
                  </th>
                  <th className="border border-gray-300 p-2 w-1/6 text-center">
                    मात्रा
                  </th>
                  <th className="border border-gray-300 p-2 w-1/12"></th>
                </tr>
              </thead>
              <tbody>
                {generateTwoColumnTable(cart).map((row, idx) => (
                  <tr key={idx}>
                    <td className="border border-gray-300 p-2 text-center">{row[0]}</td>
                    <td className="border border-gray-300 p-2 text-center">{row[1]}</td>
                    <td className="border border-gray-300 p-2"></td>
                    <td className="border border-gray-300 p-2 text-center">{row[3]}</td>
                    <td className="border border-gray-300 p-2 text-center">{row[4]}</td>
                    <td className="border border-gray-300 p-2"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Export Buttons */}
          <div className="flex flex-col mt-5 sm:flex-row gap-4 justify-end">
            <button
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold shadow hover:bg-green-700 transition flex-1 sm:flex-none"
              onClick={handleExportExcel}
            >
              Export as Excel
            </button>
            <button
              className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold shadow hover:bg-red-700 transition flex-1 sm:flex-none"
              onClick={handleExportPDF}
            >
              Export as PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerPage;