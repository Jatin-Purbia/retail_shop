import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import 'react-simple-keyboard/build/css/index.css';

const API_URL = 'http://localhost:5000/api';

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
            left ? left.name : '', // Changed to English name
            left ? `${left.quantity} ${left.unit}` : '',
            '', // Blank column
            right ? right.name : '', // Changed to English name
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
    const [deliveryTimeHindi, setDeliveryTimeHindi] = useState('सुबह');
    const nameInputRef = useRef(null);
    const billRef = useRef();
    const [isSearching, setIsSearching] = useState(false);

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
                // transliterateToHindi(customerName); // Commented out
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [customerName]);

    // Debounced search function
    const debouncedSearch = async (value) => {
        if (!value) {
            setFilteredItems([]);
            return;
        }

        setIsSearching(true);
        try {
            const response = await fetch(`${API_URL}/inventory/search?q=${encodeURIComponent(value)}`);
            if (!response.ok) throw new Error('Failed to search items');
            const data = await response.json();
            setFilteredItems(data);
            setHighlightedIndex(data.length > 0 ? 0 : -1);
        } catch (error) {
            console.error('Search error:', error);
            setFilteredItems([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearch = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        
        // Clear the timeout if it exists
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Set a new timeout
        searchTimeoutRef.current = setTimeout(() => {
            debouncedSearch(value);
        }, 300);
    };

    const searchTimeoutRef = useRef(null);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

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
                setSearchTerm(selected.name); // Changed to English name
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
            ['उत्पाद', 'मात्रा', '', 'उत्पाद', 'मात्रा', ''], // Changed to English
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
            <div className="bg-white rounded-2xl shadow-2xl p-4 w-full max-w-7xl">
                <h1 className="text-2xl font-bold text-primary mb-2 text-center">Customer Billing</h1>
                <p className="text-base text-accent text-center mb-4">Create and manage customer bills</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="relative">
                        <label className="block text-base text-primary-dark font-semibold mb-1">
                            ग्राहक का नाम
                        </label>
                        <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            onFocus={() => setShowNameSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
                            onKeyDown={handleNameKeyDown}
                            className="w-full px-3 py-2 text-base bg-gray-200 border border-accent-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Type name in English (e.g., 'Rahul')"
                            ref={nameInputRef}
                        />
                        {showNameSuggestions && nameSuggestions.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-accent-light rounded-lg shadow-lg max-h-32 overflow-y-auto">
                                {nameSuggestions.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        className={`px-3 py-1 text-base hover:bg-primary-light/10 cursor-pointer ${
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
                        <label className="block text-base text-primary-dark font-semibold mb-1">
                            मोबाइल नंबर
                        </label>
                        <input
                            type="text"
                            value={customerMobile}
                            onChange={(e) => setCustomerMobile(e.target.value)}
                            className="w-full px-3 py-2 text-base bg-gray-200 border border-accent-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="मोबाइल नंबर दर्ज करें"
                            maxLength={10}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-base text-primary-dark font-semibold mb-1">
                            डिलीवरी की तारीख
                        </label>
                        <DatePicker
                            selected={deliveryDate}
                            onChange={(date) => setDeliveryDate(date)}
                            dateFormat="dd.MM.yyyy"
                            className="w-full px-3 py-2 text-base bg-gray-200 border border-accent-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-base text-primary-dark font-semibold mb-1">
                            डिलीवरी का समय
                        </label>
                        <select
                            value={deliveryTimeHindi}
                            onChange={handleDeliveryTimeChange}
                            className="w-full px-3 py-2 text-base bg-gray-200 border border-accent-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="सुबह">सुबह</option>
                            <option value="दोपहर">दोपहर</option>
                            <option value="शाम">शाम</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-end relative">
                    <div>
                        <label className="block text-base text-primary-dark font-semibold mb-1">
                            उत्पाद खोजें
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={handleSearch}
                                onKeyDown={handleSearchKeyDown}
                                ref={searchInputRef}
                                className="w-full px-3 py-2 text-base bg-gray-200 border border-accent-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Search products in English or Hindi..."
                            />
                            {isSearching && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                                </div>
                            )}
                            {searchTerm && filteredItems.length > 0 && !isSearching && (
                                <div className="absolute z-20 w-full mt-1 bg-white border border-accent-light rounded-lg shadow-lg max-h-32 overflow-y-auto">
                                    {filteredItems.map((item, idx) => (
                                        <div
                                            key={item.id}
                                            className={`p-2 text-base cursor-pointer text-primary-dark ${
                                                idx === highlightedIndex ? 'bg-primary-light/20' : 'hover:bg-primary-light/10'
                                            }`}
                                            onMouseEnter={() => {
                                                setHighlightedIndex(idx);
                                                setSelectedItem(item);
                                            }}
                                            onMouseDown={() => {
                                                setSelectedItem(item);
                                                setSearchTerm(item.name); // Changed to English name
                                                setFilteredItems([]);
                                                setHighlightedIndex(-1);
                                            }}
                                        >
                                            {item.name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="block text-base text-primary-dark font-semibold mb-1">
                            मात्रा
                        </label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full px-3 py-2 text-base bg-gray-200 border border-accent-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            min="1"
                        />
                    </div>
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <label className="block text-base text-primary-dark font-semibold mb-1">
                                इकाई
                            </label>
                            <select
                                value={selectedUnit}
                                onChange={(e) => setSelectedUnit(e.target.value)}
                                className="w-full px-3 py-2 text-base bg-gray-200 border border-accent-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                            className="px-4 py-2 text-base bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!selectedItem}
                        >
                            उत्पाद जोड़ें
                        </button>
                    </div>
                </div>

                <div className="flex justify-end mb-2">
                    <button
                        onClick={handleClearCart}
                        className="px-4 py-2 text-base bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold shadow transition"
                    >
                        Clear All
                    </button>
                </div>

                <div
                    ref={billRef}
                    className="bg-white p-4 border border-gray-800 rounded-lg shadow-sm mb-4"
                    style={{
                        fontFamily: 'DejaVu Sans, Arial, sans-serif',
                        color: '#222',
                        width: '100%',
                        maxWidth: '100%',
                        margin: '0 auto',
                    }}
                >
                    <div className="text-center font-bold text-xl mb-2 text-gray-900">! श्री राम जी !!</div>
                    <div className="text-center text-base mb-2 text-gray-900">
                        {`दिनांक ${formattedDeliveryDateBill} को ${hindiDeliveryTimeBill} तक देना है।`}
                    </div>
                    <div className="flex justify-between text-base mb-2 text-gray-900">
                        <span>नाम: {customerName || ''}</span>
                        <span>मो. नं. {customerMobile || ''}</span>
                    </div>

                    <div className="overflow-y-auto" style={{ maxHeight: '50vh' }}>
                        <table className="w-full border-collapse text-base">
                            <thead className="sticky top-0 bg-white">
                                <tr>
                                    <th className="border border-gray-800 p-2 w-1/4 text-center text-gray-900 font-bold">
                                        उत्पाद
                                    </th>
                                    <th className="border border-gray-800 p-2 w-1/6 text-center text-gray-900 font-bold">
                                        मात्रा
                                    </th>
                                    <th className="border border-gray-800 p-2 w-1/12"></th>
                                    <th className="border border-gray-800 p-2 w-1/4 text-center text-gray-900 font-bold">
                                        उत्पाद
                                    </th>
                                    <th className="border border-gray-800 p-2 w-1/6 text-center text-gray-900 font-bold">
                                        मात्रा
                                    </th>
                                    <th className="border border-gray-800 p-2 w-1/12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {generateTwoColumnTable(cart).map((row, idx) => (
                                    <tr key={idx}>
                                        <td className="border border-gray-800 p-2 text-center text-gray-900">{row[0]}</td>
                                        <td className="border border-gray-800 p-2 text-center text-gray-900">{row[1]}</td>
                                        <td className="border border-gray-800 p-2"></td>
                                        <td className="border border-gray-800 p-2 text-center text-gray-900">{row[3]}</td>
                                        <td className="border border-gray-800 p-2 text-center text-gray-900">{row[4]}</td>
                                        <td className="border border-gray-800 p-2"></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex flex-col mt-2 sm:flex-row gap-2 justify-end">
                    <button
                        className="px-4 py-2 text-base bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold shadow transition flex-1 sm:flex-none"
                        onClick={handleExportExcel}
                    >
                        Export as Excel
                    </button>
                    <button
                        className="px-4 py-2 text-base bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold shadow transition flex-1 sm:flex-none"
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

