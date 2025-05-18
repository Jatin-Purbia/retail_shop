import React, { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import 'react-simple-keyboard/build/css/index.css';

const API_URL = 'http://localhost:5000/api';

// Constants for pagination
const ROWS_PER_PAGE = 5; // Number of rows per column
// const ITEMS_PER_PAGE = ROWS_PER_PAGE * 2; // Two items per row

// Helper to split cart into pages
// function paginateCart(cart, itemsPerPage) {
//     const pages = [];
//     for (let i = 0; i < cart.length; i += itemsPerPage) {
//         const pageItems = cart.slice(i, i + itemsPerPage);
//         if (pageItems.length > 0) {
//             pages.push(pageItems);
//         }
//     }
//     return pages;
// }

// Helper to format date as DD.MM.YYYY
function formatDate(date = new Date()) {
    return date.toLocaleDateString('en-GB').replace(/\//g, '.');
}

// Helper to generate two-column table rows with pagination
function generateTwoColumnTable(cart, page = 0) {
    const ITEMS_PER_PAGE = 28; // Maximum items per page
    const startIdx = page * ITEMS_PER_PAGE;
    const pageItems = [...cart].reverse().slice(startIdx, startIdx + ITEMS_PER_PAGE);

    // Calculate number of rows needed based on content
    const rows = [];
    let currentRow = { left: {}, right: {} };
    let leftSideFilled = false;
    let rightSideIndex = 0; // Track the current row index for right side
    
    // First, fill the left side completely
    for (let i = 0; i < pageItems.length; i++) {
        const item = pageItems[i];
        const serialNumber = startIdx + i + 1;
        
        if (!leftSideFilled) {
            // Fill left side first
            currentRow = {
                left: {
                    serial: `${serialNumber}`,
                    name: item.name,
                    quantity: `${item.quantity} ${item.unit}`,
                },
                right: {}
            };
            rows.push(currentRow);
            
            // Check if we've filled the left side
            if (rows.length >= 14) {
                leftSideFilled = true;
                break; // Stop after filling left side
            }
        }
    }

    // Then, fill the right side completely
    for (let i = rows.length; i < pageItems.length; i++) {
        const item = pageItems[i];
        const serialNumber = startIdx + i + 1;
        
        if (rightSideIndex < rows.length) {
            rows[rightSideIndex].right = {
                serial: `${serialNumber}`,
                name: item.name,
                quantity: `${item.quantity} ${item.unit}`,
            };
            rightSideIndex++;
        }
    }

    // If we have empty rows on the right side, fill them with empty cells
    while (rightSideIndex < rows.length) {
        rows[rightSideIndex].right = {
            serial: '',
            name: '',
            quantity: '',
        };
        rightSideIndex++;
    }

    return rows;
}

function CustomerPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [selectedUnit, setSelectedUnit] = useState('कि.ग्रा.');
    const [cart, setCart] = useState(() => {
        const savedCart = localStorage.getItem('customerCart');
        return savedCart ? JSON.parse(savedCart) : [];
    });
    const [filteredItems, setFilteredItems] = useState([]);
    const [customerName, setCustomerName] = useState(() => localStorage.getItem('customerName') || '');
    const [customerNameHindi, setCustomerNameHindi] = useState(() => localStorage.getItem('customerNameHindi') || '');
    const [customerMobile, setCustomerMobile] = useState(() => localStorage.getItem('customerMobile') || '');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [nameSuggestions, setNameSuggestions] = useState([]);
    const [showNameSuggestions, setShowNameSuggestions] = useState(false);
    const searchInputRef = useRef(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [deliveryDate, setDeliveryDate] = useState(() => {
        const savedDate = localStorage.getItem('deliveryDate');
        return savedDate ? new Date(savedDate) : new Date();
    });
    const [deliveryTimeHindi, setDeliveryTimeHindi] = useState(() => localStorage.getItem('deliveryTimeHindi') || 'सुबह');
    const nameInputRef = useRef(null);
    const billRef = useRef();
    const [isSearching, setIsSearching] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [showHindiSuggestions, setShowHindiSuggestions] = useState(false);
    const [hindiSuggestions, setHindiSuggestions] = useState([]);
    const [highlightedHindiIndex, setHighlightedHindiIndex] = useState(-1);

    useEffect(() => {
        localStorage.setItem('customerCart', JSON.stringify(cart));
    }, [cart]);

    useEffect(() => {
        localStorage.setItem('customerName', customerName);
    }, [customerName]);

    useEffect(() => {
        localStorage.setItem('customerNameHindi', customerNameHindi);
    }, [customerNameHindi]);

    useEffect(() => {
        localStorage.setItem('customerMobile', customerMobile);
    }, [customerMobile]);

    useEffect(() => {
        localStorage.setItem('deliveryDate', deliveryDate.toISOString());
    }, [deliveryDate]);

    useEffect(() => {
        localStorage.setItem('deliveryTimeHindi', deliveryTimeHindi);
    }, [deliveryTimeHindi]);

    const transliterateToHindi = async (text) => {
        if (!text) {
            setHindiSuggestions([]);
            return;
        }

        try {
            const response = await fetch(
                `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=hi-t-i0-und&num=5&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`
            );
            const data = await response.json();
            if (data && data[1] && data[1][0] && data[1][0][1]) {
                const suggestions = data[1][0][1];
                setHindiSuggestions(suggestions);
                if (suggestions.length > 0) {
                    setCustomerNameHindi(suggestions[0]);
                }
            }
        } catch (error) {
            console.error('Transliteration error:', error);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (customerName && /[a-zA-Z]/.test(customerName)) {
                transliterateToHindi(customerName);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [customerName]);

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
            
            // Transliterate product names to Hindi
            const transliteratedData = await Promise.all(data.map(async (item) => {
                try {
                    const response = await fetch(
                        `https://inputtools.google.com/request?text=${encodeURIComponent(item.name)}&itc=hi-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`
                    );
                    const data = await response.json();
                    if (data && data[1] && data[1][0] && data[1][0][1]) {
                        return {
                            ...item,
                            name: data[1][0][1][0] // Use the first Hindi suggestion
                        };
                    }
                    return item;
                } catch (error) {
                    console.error('Transliteration error:', error);
                    return item;
                }
            }));

            setFilteredItems(transliteratedData);
            setHighlightedIndex(transliteratedData.length > 0 ? 0 : -1);
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

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            debouncedSearch(value);
        }, 300);
    };

    const searchTimeoutRef = useRef(null);

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
            setHighlightedIndex((prev) => (prev + 1) % nameSuggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev - 1 + nameSuggestions.length) % nameSuggestions.length);
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
                setSearchTerm(selected.name);
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
            // Add new item at the beginning of the cart
            setCart((prevCart) => [cartItem, ...prevCart]);
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

        // Create PDF
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4',
        });

        // Calculate total pages needed (30 items per page, but must fill both sides)
        const itemsPerPage = 28; // 15 rows * 2 columns
        const totalPages = Math.ceil(cart.length / itemsPerPage);
        const originalContent = input.innerHTML;

        // Generate each page
        for (let page = 0; page < totalPages; page++) {
            if (page > 0) {
                pdf.addPage();
            }

            // Generate table for this page
            const pageItems = generateTwoColumnTable(cart, page);
            
            // Create page HTML
            const pageHTML = `
                <div style="font-family: DejaVu Sans, Arial, sans-serif; padding-right: 20px; color: #222; width: 794px; margin: 0 auto; display: flex; flex-direction: column; align-items: center;">
                    <div style="text-align: center; font-weight: bold; font-size: 20px; margin-bottom: 8px; width: 100%;">! श्री राम जी !!</div>
                    <div style="text-align: center; font-size: 16px; margin-bottom: 8px; width: 100%;">
                        ${`दिनांक ${formattedDeliveryDateBill} को ${hindiDeliveryTimeBill} तक देना है।`}
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 16px; margin-bottom: 8px; padding: 0 20px; width: 100%;">
                        <span style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">नाम: ${customerNameHindi || ''}</span>
                        <span style="white-space: nowrap; flex-shrink: 0;">मो. नं. ${customerMobile || ''}</span>
                    </div>
                    <div style="width: 100%; display: flex; justify-content: center;">
                        <table style="width: 95%; border-collapse: collapse; font-size: 16px;">
                            <thead>
                                <tr>
                                    <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 8%;">क्रम संख्या</th>
                                    <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 25%;">उत्पाद</th>
                                    <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 8%;">मात्रा</th>
                                    <th style="border: 1px solid #000; padding: 8px; width: 9%;"></th>
                                    <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 8%;">क्रम संख्या</th>
                                    <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 25%;">उत्पाद</th>
                                    <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 8%;">मात्रा</th>
                                    <th style="border: 1px solid #000; padding: 8px; width: 9%;"></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pageItems.map((row, idx) => `
                                    <tr>
                                        <td style="border: 1px solid #000; padding: 8px; text-align: center;">${row.left.serial}</td>
                                        <td style="border: 1px solid #000; padding: 8px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 0;" title="${row.left.name}">${row.left.name}</td>
                                        <td style="border: 1px solid #000; padding: 8px; text-align: center;">${row.left.quantity}</td>
                                        <td style="border: 1px solid #000; padding: 8px;"></td>
                                        <td style="border: 1px solid #000; padding: 8px; text-align: center;">${row.right.serial}</td>
                                        <td style="border: 1px solid #000; padding: 8px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 0;" title="${row.right.name}">${row.right.name}</td>
                                        <td style="border: 1px solid #000; padding: 8px; text-align: center;">${row.right.quantity}</td>
                                        <td style="border: 1px solid #000; padding: 8px;"></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            // Replace the content
            input.innerHTML = pageHTML;

            // Generate canvas for this page
            const canvas = await html2canvas(input, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            
            // Add image to PDF
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
        }

        // Save the PDF
        pdf.save(`bill_${customerName || 'guest'}_${formatDate()}.pdf`);

        // Restore original content
        input.innerHTML = originalContent;
    };

    // const handleExportExcel = () => {
    //     if (cart.length === 0) {
    //         alert('Your cart is empty. Add items to export.');
    //         return;
    //     }
    //     const formattedDeliveryDate = formatDate(deliveryDate);
    //     const timeMapping = { सुबह: 'Morning', दोपहर: 'Afternoon', शाम: 'Evening' };
    //     const englishDeliveryTime = timeMapping[deliveryTimeHindi] || '';
    //     const wsData = [
    //         ['! श्री राम जी !!'],
    //         [`दिनांक ${formattedDeliveryDate} को ${deliveryTimeHindi} तक देना है।`],
    //         [`नाम: ${customerName || ''}`, '', '', `मो. नं. ${customerMobile || ''}`, '', '', '', ''],
    //         [`डिलीवरी: ${formattedDeliveryDate}, ${englishDeliveryTime}`, '', '', '', '', ''],
    //         ['', '', '', '', '', ''],
    //         ['उत्पाद', 'मात्रा', '', 'उत्पाद', 'मात्रा', ''],
    //         ...paginateCart(cart, ITEMS_PER_PAGE)[currentPage].reduce((acc, item, index) => {
    //             const rowIdx = Math.floor(index / 2);
    //             if (!acc[rowIdx]) {
    //                 acc[rowIdx] = ['', '', '', '', '', ''];
    //             }
    //             const serialNumber = cart.length - (currentPage * ITEMS_PER_PAGE + index);
    //             if (index % 2 === 0) {
    //                 acc[rowIdx][0] = `${serialNumber}`;
    //                 acc[rowIdx][1] = item.name;
    //                 acc[rowIdx][2] = `${item.quantity} ${item.unit}`;
    //             } else {
    //                 acc[rowIdx][3] = `${serialNumber}`;
    //                 acc[rowIdx][4] = item.name;
    //                 acc[rowIdx][5] = `${item.quantity} ${item.unit}`;
    //             }
    //             return acc;
    //         }, Array(ROWS_PER_PAGE).fill(null)).filter(row => row.some(Boolean)),
    //     ];
    //     const ws = XLSX.utils.aoa_to_sheet(wsData);
    //     ws['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 5 }, { wch: 20 }, { wch: 12 }, { wch: 5 }];
    //     const range = XLSX.utils.decode_range(ws['!ref']);
    //     for (let R = range.s.r; R <= range.e.r; ++R) {
    //         for (let C = range.s.c; C <= range.e.c; ++C) {
    //             const cell_address = XLSX.utils.encode_cell({ c: C, r: R });
    //             if (!ws[cell_address]) continue;
    //             ws[cell_address].s = { alignment: { horizontal: 'center' } };
    //         }
    //     }
    //     const wb = XLSX.utils.book_new();
    //     XLSX.utils.book_append_sheet(wb, ws, 'Bill');
    //     XLSX.writeFile(wb, `bill_${customerName || 'customer'}_${formatDate()}.xlsx`);
    // };

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

        localStorage.removeItem('customerCart');
        localStorage.removeItem('customerName');
        localStorage.removeItem('customerMobile');
        localStorage.removeItem('deliveryDate');
        localStorage.removeItem('deliveryTimeHindi');
    };

    const formattedDeliveryDateBill = formatDate(deliveryDate);
    const timeMappingBill = { सुबह: 'सुबह', दोपहर: 'दोपहर', शाम: 'शाम' };
    const hindiDeliveryTimeBill = timeMappingBill[deliveryTimeHindi] || '';

    // Calculate actual number of pages with items
    const calculateTotalPages = () => {
        const itemsPerPage = 28;
        let pages = 0;
        for (let i = 0; i < cart.length; i += itemsPerPage) {
            const pageItems = cart.slice(i, i + itemsPerPage);
            if (pageItems.length > 0) {
                pages++;
            }
        }
        return pages;
    };

    const totalPages = calculateTotalPages();

    const handlePageChange = (newPage) => {
        if (newPage >= 0 && newPage < totalPages) {
            setCurrentPage(newPage);
        }
    };

    const billItems = generateTwoColumnTable(cart, currentPage);

    const handleHindiSuggestionClick = (suggestion) => {
        setCustomerNameHindi(suggestion);
        setShowHindiSuggestions(false);
        setHighlightedHindiIndex(-1);
    };

    const handleHindiFieldKeyDown = (e) => {
        if (!hindiSuggestions.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedHindiIndex((prev) => (prev + 1) % hindiSuggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedHindiIndex((prev) => (prev - 1 + hindiSuggestions.length) % hindiSuggestions.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedHindiIndex >= 0) {
                handleHindiSuggestionClick(hindiSuggestions[highlightedHindiIndex]);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setShowHindiSuggestions(false);
            setHighlightedHindiIndex(-1);
        }
    };

    return (
        <div className="flex flex-col p-2 items-center justify-center min-h-screen bg-primary-light overflow-hidden">
            <div className="bg-white rounded-2xl shadow-2xl p-4 w-full max-w-7xl">
                <h1 className="text-2xl font-bold text-primary mb-2 text-center">Customer Billing</h1>
                <p className="text-base text-accent text-center mb-4">Create and manage customer bills</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="relative">
                        <label className="block text-base text-primary-dark font-semibold mb-1">
                            ग्राहक का नाम (अंग्रेजी में)
                        </label>
                        <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full px-3 py-2 text-base bg-gray-200 border border-accent-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Type name in English (e.g., 'Rahul')"
                        />
                    </div>
                    <div className="relative">
                        <label className="block text-base text-primary-dark font-semibold mb-1">
                            ग्राहक का नाम (हिंदी में)
                        </label>
                        <input
                            type="text"
                            value={customerNameHindi}
                            onChange={(e) => setCustomerNameHindi(e.target.value)}
                            onFocus={() => setShowHindiSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowHindiSuggestions(false), 200)}
                            onKeyDown={handleHindiFieldKeyDown}
                            className="w-full px-3 py-2 text-base bg-gray-100 border border-accent-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="हिंदी में नाम"
                        />
                        {showHindiSuggestions && hindiSuggestions.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-accent-light rounded-lg shadow-lg max-h-32 overflow-y-auto">
                                {hindiSuggestions.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        className={`px-3 py-1 text-base hover:bg-primary-light/10 cursor-pointer ${
                                            index === highlightedHindiIndex ? 'bg-primary-light/20' : ''
                                        }`}
                                        onMouseDown={() => handleHindiSuggestionClick(suggestion)}
                                    >
                                        {suggestion}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                                                setSearchTerm(item.name);
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
                                <option value="कि.ग्रा.">कि.ग्रा.</option>
                                <option value="ग्राम">ग्राम</option>
                                <option value="पीपा">पीपा</option>
                                <option value="गड्डी">गड्डी</option>
                                <option value="पैकेट">पैकेट</option>
                                <option value="">None</option>
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
                        width: '794px',
                        maxHeight: '1123px',
                        maxWidth: '794px',
                        margin: '0 auto',
                    }}
                >
                    <div className="text-center font-bold text-xl mb-2 text-gray-900">! श्री राम जी !!</div>
                    <div className="text-center text-base mb-2 text-gray-900">
                        {`दिनांक ${formattedDeliveryDateBill} को ${hindiDeliveryTimeBill} तक देना है।`}
                    </div>
                    <div className="flex justify-between text-base m-2 text-gray-900">
                        <span className="flex-1 mr-4">नाम: {customerNameHindi || ''}</span>
                        <span className="whitespace-nowrap">मो. नं. {customerMobile || ''}</span>
                    </div>

                    <div className="w-full flex justify-center">
                        <table className="w-[95%] border-collapse text-base">
                            <thead className="sticky top-0 bg-white">
                                <tr>
                                    <th className="border border-gray-800 p-2 text-center font-bold" style={{ width: '8%' }}>
                                        क्रम संख्या
                                    </th>
                                    <th className="border border-gray-800 p-2 text-center font-bold" style={{ width: '25%' }}>
                                        उत्पाद
                                    </th>
                                    <th className="border border-gray-800 p-2 text-center font-bold" style={{ width: '8%' }}>
                                        मात्रा
                                    </th>
                                    <th className="border border-gray-800 p-2" style={{ width: '9%' }}></th>
                                    <th className="border border-gray-800 p-2 text-center font-bold" style={{ width: '8%' }}>
                                        क्रम संख्या
                                    </th>
                                    <th className="border border-gray-800 p-2 text-center font-bold" style={{ width: '25%' }}>
                                        उत्पाद
                                    </th>
                                    <th className="border border-gray-800 p-2 text-center font-bold" style={{ width: '8%' }}>
                                        मात्रा
                                    </th>
                                    <th className="border border-gray-800 p-2" style={{ width: '9%' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {billItems.map((row, idx) => (
                                    <tr key={idx} style={{ height: 'auto' }}>
                                        <td className="border border-gray-800 p-2 text-center text-gray-900"           
                                            style={{ 
                                                width: '8%', 
                                                wordBreak: 'break-word', 
                                                overflowWrap: 'break-word',
                                                maxWidth: '0'
                                            }}>{row.left.serial}</td>
                                        <td className="border border-gray-800 p-2 text-center text-gray-900"
                                            style={{ 
                                                width: '25%', 
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                maxWidth: '0'
                                            }} title={row.left.name}>{row.left.name}</td>
                                        <td className="border border-gray-800 p-2 text-center text-gray-900"
                                            style={{ 
                                                width: '8%', 
                                                wordBreak: 'break-word', 
                                                overflowWrap: 'break-word',
                                                maxWidth: '0'
                                            }}>{row.left.quantity}</td>
                                        <td className="border border-gray-800 p-2" style={{ width: '9%' }}></td>
                                        <td className="border border-gray-800 p-2 text-center text-gray-900"
                                            style={{ 
                                                width: '8%', 
                                                wordBreak: 'break-word', 
                                                overflowWrap: 'break-word',
                                                maxWidth: '0'
                                            }}>{row.right.serial}</td>
                                        <td className="border border-gray-800 p-2 text-center text-gray-900"
                                            style={{ 
                                                width: '25%', 
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                maxWidth: '0'
                                            }} title={row.right.name}>{row.right.name}</td>
                                        <td className="border border-gray-800 p-2 text-center text-gray-900"
                                            style={{ 
                                                width: '8%', 
                                                wordBreak: 'break-word', 
                                                overflowWrap: 'break-word',
                                                maxWidth: '0'
                                            }}>{row.right.quantity}</td>
                                        <td className="border border-gray-800 p-2" style={{ width: '9%' }}></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {totalPages > 1 && (
                    <div className="flex justify-center mt-4">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 0}
                            className="px-4 py-2 mx-1 text-base bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span>{`Page ${currentPage + 1} of ${totalPages}`}</span>
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages - 1}
                            className="px-4 py-2 mx-1 text-base bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                )}

                <div className="flex justify-end gap-2 mt-4">
                    <button
                        onClick={handleExportPDF}
                        className="px-4 py-2 text-base bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold shadow transition"
                    >
                        Export PDF
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CustomerPage;