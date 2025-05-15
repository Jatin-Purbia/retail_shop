import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import inventory from '../inventoryData';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ReactSimpleKeyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';

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

// Hindi keyboard layout for react-simple-keyboard (basic)
const hindiKeyboardLayout = {
    default: [
        'ऒ ऌ ए ऐ ऑ ओ',
        'आ इ ई उ ऊ ऋ',
        'क ख ग घ ङ च छ ज झ ञ',
        'ट ठ ड ढ ण त थ द ध न',
        'प फ ब भ म य र ल व श ष स ह',
        '् ा ि ी ु ू ृ , . -',
        'Shift Space Backspace',
    ],
    shift: [
        'ऍ ॅ ऎ ॳ ऑ ओ',
        'आ इ ई ऊ ॡ ऋ',
        'क़ ख़ ग़ ज़ ड़ ढ़ फ़ य़ ऱ ऴ ॱ',
        'ट ठ ड ढ ण त थ द ध न',
        'प फ ब भ म य र ल व श ष स ह',
        '् ा ि ी ु ू ॄ ? ! +',
        'Shift Space Backspace',
    ],
};

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
    const [deliveryTimeHindi, setDeliveryTimeHindi] = useState('सुबह');
    const nameInputRef = useRef(null);
   
    const billRef = useRef();

    // Function to transliterate English to Hindi using Google Input Tools API
    const transliterateToHindi = async (text) => {
        if (!text) {
            setNameSuggestions([]);
            return;
        }

        try {
            const response = await fetch(
                `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=hi-t-i0-und&num=5&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`
            );
            const data = await response.json();
            if (data && data[1] && data[1][0] && data[1][0][1]) {
                const suggestions = data[1][0][1];
                setNameSuggestions(suggestions);
                if (suggestions.length > 0) {
                    setCustomerName(suggestions[0]);
                }
            }
        } catch (error) {
            console.error('Transliteration error:', error);
        }
    };

    // Debounce transliteration requests
    useEffect(() => {
        const timer = setTimeout(() => {
            if (customerName && /[a-zA-Z]/.test(customerName)) {
                transliterateToHindi(customerName);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [customerName]);

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

    const handleNameKeyDown = (e) => {
        if (!nameSuggestions.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex((prev) => {
                const next = (prev + 1) % nameSuggestions.length;
                return next;
            });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex((prev) => {
                const next = (prev - 1 + nameSuggestions.length) % nameSuggestions.length;
                return next;
            });
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0) {
                const selectedName = nameSuggestions[highlightedIndex];
                setCustomerName(selectedName);
                setShowNameSuggestions(false);
                setHighlightedIndex(-1);
                if (nameInputRef.current) {
                    nameInputRef.current.blur();
                }
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setShowNameSuggestions(false);
            setHighlightedIndex(-1);
        }
    };

    const handleSearchKeyDown = (e) => {
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
                setHighlightedIndex(-1);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setFilteredItems([]);
            setHighlightedIndex(-1);
        }
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
            const updatedCart = [...cart];
            updatedCart[existingItemIndex] = {
                ...updatedCart[existingItemIndex],
                quantity: updatedCart[existingItemIndex].quantity + quantity,
            };
            setCart(updatedCart);
        } else {
            setCart((prevCart) => [...prevCart, cartItem]);
        }

        setSearchTerm('');
        setFilteredItems([]);
        setQuantity(1);
        setHighlightedIndex(-1);
        setSelectedItem(null);
        if (searchInputRef.current) searchInputRef.current.focus();
    };

    const handleDeliveryTimeChange = (event) => {
        setDeliveryTimeHindi(event.target.value);
    };

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

    const handleExportExcel = () => {
        if (cart.length === 0) {
            alert('Your cart is empty. Add items to export.');
            return;
        }
        const formattedDeliveryDate = formatDate(deliveryDate);
        const timeMapping = { सुबह: 'Morning', दोपहर: 'Afternoon', शाम: 'Evening' };
        const englishDeliveryTime = timeMapping[deliveryTimeHindi] || '';
        const wsData = [
            ['! श्री राम जी !!'],
            [`दिनांक ${formattedDeliveryDate} को ${deliveryTimeHindi} तक देना है।`],
            [`नाम: ${customerName || ''}`, '', '', `मो. नं. ${customerMobile || ''}`, '', '', '', ''],
            [`डिलीवरी: ${formattedDeliveryDate}, ${englishDeliveryTime}`, '', '', '', '', ''],
            ['', '', '', '', '', ''],
            ['उत्पाद (हिन्दी)', 'मात्रा', '', 'उत्पाद (हिन्दी)', 'मात्रा', ''],
            ...generateTwoColumnTable(cart),
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 5 }, { wch: 20 }, { wch: 12 }, { wch: 5 }];
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

    const handleClearCart = () => {
        setCart([]);
        setSearchTerm('');
        setFilteredItems([]);
        setQuantity(1);
        setHighlightedIndex(-1);
        setSelectedItem(null);
        setCustomerName('');
        setCustomerMobile('');
        setDeliveryDate(new Date());
        setDeliveryTimeHindi('सुबह');
    };

    const formattedDeliveryDateBill = formatDate(deliveryDate);
    const timeMappingBill = { सुबह: 'सुबह', दोपहर: 'दोपहर', शाम: 'शाम' };
    const hindiDeliveryTimeBill = timeMappingBill[deliveryTimeHindi] || '';

    return (
        <div className="flex flex-col p-2 items-center justify-center min-h-screen bg-primary-light overflow-hidden">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-7xl">
                <h1 className="text-4xl font-bold text-primary mb-3 text-center">Customer Billing</h1>
                <p className="text-lg text-accent text-center mb-8">Create and manage customer bills</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="relative">
                        <label className="block text-lg text-primary-dark font-semibold mb-2">
                            ग्राहक का नाम (हिन्दी)
                        </label>
                        <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            onFocus={() => setShowNameSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
                            onKeyDown={handleNameKeyDown}
                            className="w-full px-4 py-3 text-lg bg-gray-200 border border-accent-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Type name in English (e.g., 'Rahul')"
                            ref={nameInputRef}
                        />
                        {showNameSuggestions && nameSuggestions.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-accent-light rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {nameSuggestions.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        className={`px-4 py-2 text-lg hover:bg-primary-light/10 cursor-pointer ${
                                            index === highlightedIndex ? 'bg-primary-light/20' : ''
                                        }`}
                                        onMouseDown={() => {
                                            setCustomerName(suggestion);
                                            setShowNameSuggestions(false);
                                            setHighlightedIndex(-1);
                                        }}
                                    >
                                        {suggestion}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-lg text-primary-dark font-semibold mb-2">
                            मोबाइल नंबर
                        </label>
                        <input
                            type="text"
                            value={customerMobile}
                            onChange={(e) => setCustomerMobile(e.target.value)}
                            className="w-full px-4 py-3 text-lg bg-gray-200 border border-accent-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="मोबाइल नंबर दर्ज करें"
                            maxLength={10}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                        <label className="block text-lg text-primary-dark font-semibold mb-2">
                            डिलीवरी की तारीख
                        </label>
                        <DatePicker
                            selected={deliveryDate}
                            onChange={(date) => setDeliveryDate(date)}
                            dateFormat="dd.MM.yyyy"
                            className="w-full px-4 py-3 text-lg bg-gray-200 border border-accent-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-lg text-primary-dark font-semibold mb-2">
                            डिलीवरी का समय
                        </label>
                        <select
                            value={deliveryTimeHindi}
                            onChange={handleDeliveryTimeChange}
                            className="w-full px-4 py-3 text-lg bg-gray-200 border border-accent-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="सुबह">सुबह</option>
                            <option value="दोपहर">दोपहर</option>
                            <option value="शाम">शाम</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-end relative">
                    <div>
                        <label className="block text-lg text-primary-dark font-semibold mb-2">
                            उत्पाद खोजें
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={handleSearch}
                                onKeyDown={handleSearchKeyDown}
                                ref={searchInputRef}
                                className="w-full px-4 py-3 text-lg bg-gray-200 border border-accent-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Search products in English or Hindi..."
                            />
                            {searchTerm && filteredItems.length > 0 && (
                                <div className="absolute z-20 w-full mt-1 bg-white border border-accent-light rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    {filteredItems.map((item, idx) => (
                                        <div
                                            key={item.id}
                                            className={`p-2 text-lg cursor-pointer text-primary-dark ${
                                                idx === highlightedIndex ? 'bg-primary-light/20' : 'hover:bg-primary-light/10'
                                            }`}
                                            onMouseEnter={() => {
                                                setHighlightedIndex(idx);
                                                setSelectedItem(item);
                                            }}
                                            onMouseDown={() => {
                                                setSelectedItem(item);
                                                setSearchTerm(item.hindiName + ' (' + item.name + ')');
                                                setFilteredItems([]);
                                                setHighlightedIndex(-1);
                                            }}
                                        >
                                            {item.hindiName} ({item.name})
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="block text-lg text-primary-dark font-semibold mb-2">
                            मात्रा
                        </label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full px-4 py-3 text-lg bg-gray-200 border border-accent-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            min="1"
                        />
                    </div>
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <label className="block text-lg text-primary-dark font-semibold mb-2">
                                इकाई
                            </label>
                            <select
                                value={selectedUnit}
                                onChange={(e) => setSelectedUnit(e.target.value)}
                                className="w-full px-4 py-3 text-lg bg-gray-200 border border-accent-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                            className="px-6 py-3 text-lg bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!selectedItem}
                        >
                            उत्पाद जोड़ें
                        </button>
                    </div>
                </div>

                <div className="flex justify-end mb-4">
                    <button
                        onClick={handleClearCart}
                        className="px-6 py-3 text-lg bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold shadow transition"
                    >
                        Clear All
                    </button>
                </div>

                <div
                    ref={billRef}
                    className="bg-white p-6 border border-gray-800 rounded-lg shadow-sm mb-8"
                    style={{
                        fontFamily: 'DejaVu Sans, Arial, sans-serif',
                        color: '#222',
                        width: '100%',
                        maxWidth: '100%',
                        margin: '0 auto',
                    }}
                >
                    <div className="text-center font-bold text-2xl mb-4 text-gray-900">! श्री राम जी !!</div>
                    <div className="text-center text-lg mb-4 text-gray-900">
                        {`दिनांक ${formattedDeliveryDateBill} को ${hindiDeliveryTimeBill} तक देना है।`}
                    </div>
                    <div className="flex justify-between text-lg mb-4 text-gray-900">
                        <span>नाम: {customerName || ''}</span>
                        <span>मो. नं. {customerMobile || ''}</span>
                    </div>

                    <table className="w-full border-collapse text-lg">
                        <thead>
                            <tr>
                                <th className="border border-gray-800 p-3 w-1/4 text-center text-gray-900 font-bold">
                                    उत्पाद (हिन्दी)
                                </th>
                                <th className="border border-gray-800 p-3 w-1/6 text-center text-gray-900 font-bold">
                                    मात्रा
                                </th>
                                <th className="border border-gray-800 p-3 w-1/12"></th>
                                <th className="border border-gray-800 p-3 w-1/4 text-center text-gray-900 font-bold">
                                    उत्पाद (हिन्दी)
                                </th>
                                <th className="border border-gray-800 p-3 w-1/6 text-center text-gray-900 font-bold">
                                    मात्रा
                                </th>
                                <th className="border border-gray-800 p-3 w-1/12"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {generateTwoColumnTable(cart).map((row, idx) => (
                                <tr key={idx}>
                                    <td className="border border-gray-800 p-3 text-center text-gray-900">{row[0]}</td>
                                    <td className="border border-gray-800 p-3 text-center text-gray-900">{row[1]}</td>
                                    <td className="border border-gray-800 p-3"></td>
                                    <td className="border border-gray-800 p-3 text-center text-gray-900">{row[3]}</td>
                                    <td className="border border-gray-800 p-3 text-center text-gray-900">{row[4]}</td>
                                    <td className="border border-gray-800 p-3"></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col mt-5 sm:flex-row gap-4 justify-end">
                    <button
                        className="px-6 py-3 text-lg bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold shadow transition flex-1 sm:flex-none"
                        onClick={handleExportExcel}
                    >
                        Export as Excel
                    </button>
                    <button
                        className="px-6 py-3 text-lg bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold shadow transition flex-1 sm:flex-none"
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