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
// function generateTwoColumnTable(cart, page = 0) {
//     const ITEMS_PER_PAGE = 50; // Maximum items per page
//     const startIdx = page * ITEMS_PER_PAGE;
//     const pageItems = [...cart].reverse().slice(startIdx, startIdx + ITEMS_PER_PAGE);

//     // Calculate number of rows needed based on content
//     const rows = [];
//     let currentRow = { left: {}, right: {} };
//     let leftSideFilled = false;
//     let rightSideIndex = 0; // Track the current row index for right side
    
//     // First, fill the left side completely
//     for (let i = 0; i < pageItems.length; i++) {
//         const item = pageItems[i];
//         const serialNumber = startIdx + i + 1;
        
//         if (!leftSideFilled) {
//             // Fill left side first
//             currentRow = {
//                 left: {
//                     serial: `${serialNumber}`,
//                     name: item.name,
//                     quantity: `${item.quantity} ${item.unit}`,
//                 },
//                 right: {}
//             };
//             rows.push(currentRow);
            
//             // Check if we've filled the left side
//             if (rows.length >= 14) {
//                 leftSideFilled = true;
//                 break; // Stop after filling left side
//             }
//         }
//     }

//     // Then, fill the right side completely
//     for (let i = rows.length; i < pageItems.length; i++) {
//         const item = pageItems[i];
//         const serialNumber = startIdx + i + 1;
        
//         if (rightSideIndex < rows.length) {
//             rows[rightSideIndex].right = {
//                 serial: `${serialNumber}`,
//                 name: item.name,
//                 quantity: `${item.quantity} ${item.unit}`,
//             };
//             rightSideIndex++;
//         }
//     }

//     // If we have empty rows on the right side, fill them with empty cells
//     while (rightSideIndex < rows.length) {
//         rows[rightSideIndex].right = {
//             serial: '',
//             name: '',
//             quantity: '',
//         };
//         rightSideIndex++;
//     }

//     return rows;
// }
function generateTwoColumnTable(cart, page = 0) {
    const ROWS_PER_SIDE = 23; // 23 rows per side, 46 items per page
    const ITEMS_PER_PAGE = ROWS_PER_SIDE * 2;
    const cartItems = [...cart].reverse(); // Newest first
    const startIdx = page * ITEMS_PER_PAGE;
    const pageItems = cartItems.slice(startIdx, startIdx + ITEMS_PER_PAGE);
    const rows = [];
    for (let i = 0; i < ROWS_PER_SIDE; i++) {
        rows.push({
            left: {
                name: i < pageItems.length ? pageItems[i].name : '',
                amount: i < pageItems.length ? pageItems[i].amount || '' : '',
                quantity: i < pageItems.length ? `${pageItems[i].quantity} ${pageItems[i].unit}` : ''
            },
            right: {
                name: i + ROWS_PER_SIDE < pageItems.length ? pageItems[i + ROWS_PER_SIDE].name : '',
                amount: i + ROWS_PER_SIDE < pageItems.length ? pageItems[i + ROWS_PER_SIDE].amount || '' : '',
                quantity: i + ROWS_PER_SIDE < pageItems.length ? 
                    `${pageItems[i + ROWS_PER_SIDE].quantity} ${pageItems[i + ROWS_PER_SIDE].unit}` : ''
            }
        });
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
    const [editingItem, setEditingItem] = useState(null);
    const [editQuantity, setEditQuantity] = useState(1);
    const [editUnit, setEditUnit] = useState('कि.ग्रा.');

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

    const ROWS_PER_SIDE = 23;
    const ITEMS_PER_PAGE = ROWS_PER_SIDE * 2;
    const totalPages = Math.ceil(cart.length / ITEMS_PER_PAGE);

    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    // Helper to render a bill page in a hidden div
    const renderBillPage = (pageIdx) => {
        // Create a container
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = '794px';
        container.style.height = '1123px';
        container.style.background = '#fff';
        container.style.zIndex = '-1';
        document.body.appendChild(container);

        // Generate billItems for this page
        const billItems = generateTwoColumnTable(cart, pageIdx);

        // Build the HTML for the bill (copy from your JSX, but as HTML string)
        // For brevity, only the table and key info are rendered
        const formattedDeliveryDateBill = formatDate(deliveryDate);
        const timeMappingBill = { सुबह: 'सुबह', दोपहर: 'दोपहर', शाम: 'शाम' };
        const hindiDeliveryTimeBill = timeMappingBill[deliveryTimeHindi] || '';
        let tableRows = '';
        for (let idx = 0; idx < 23; idx++) {
            tableRows += `
                <tr style="height:32px;">
                    <td style="border:1px solid #222;text-align:center;width:20%;font-size:14px;">${billItems[idx]?.left?.name || ''}</td>
                    <td style="border:1px solid #222;text-align:center;width:14%;font-size:14px;">${billItems[idx]?.left?.quantity || ''}</td>
                    <td style="border:1px solid #222;text-align:center;width:14%;font-size:14px;">${billItems[idx]?.left?.amount || ''}</td>
                    <td style="border:1px solid #222;width:4%;"></td>
                    <td style="border:1px solid #222;text-align:center;width:20%;font-size:14px;">${billItems[idx]?.right?.name || ''}</td>
                    <td style="border:1px solid #222;text-align:center;width:14%;font-size:14px;">${billItems[idx]?.right?.quantity || ''}</td>
                    <td style="border:1px solid #222;text-align:center;width:14%;font-size:14px;">${billItems[idx]?.right?.amount || ''}</td>
                </tr>
            `;
        }
        // Gap row and total row
        tableRows += `
            <tr style="height:18px;background:#fff;"><td colspan="7" style="border:none;background:#fff;"></td></tr>
            <tr style="height:32px;background:#f3f4f6;">
                <td colspan="3" style="border:1px solid #222;text-align:right;font-weight:bold;font-size:18px;background:#f3f4f6;padding-right:24px;padding-bottom:10px;">कुल राशि:</td>
                <td style="border:1px solid #222;background:#f3f4f6;"></td>
                <td colspan="3" style="border:1px solid #222;text-align:left;font-weight:bold;font-size:18px;background:#f3f4f6;"></td>
            </tr>
        `;

        container.innerHTML = `
            <div style="font-family:DejaVu Sans,Arial,sans-serif;color:#222;width:758px;height:1087px;max-width:758px;margin:0 auto;display:flex;flex-direction:column;padding:18px 18px 18px 18px;box-sizing:border-box;">
                <div style="text-align:center;font-weight:bold;font-size:24px;margin-bottom:8px;">! श्री राम जी !!</div>
                <div style="text-align:center;font-size:16px;margin-bottom:8px;">दिनांक ${formattedDeliveryDateBill} को ${hindiDeliveryTimeBill} तक देना है।</div>
                <div style="display:flex;justify-content:space-between;font-size:16px;margin:8px 0 8px 0;">
                    <span style="flex:1;margin-right:16px;">नाम: ${customerNameHindi || ''}</span>
                    <span>मो. नं. ${customerMobile || ''}</span>
                </div>
                <div style="width:100%;flex:1;display:flex;justify-content:center;">
                    <table style="width:95%;border-collapse:collapse;font-size:16px;height:100%;">
                        <thead>
                            <tr>
                                <th style="border:1px solid #222;padding:8px;text-align:center;font-weight:bold;width:20%;">उत्पाद</th>
                                <th style="border:1px solid #222;padding:8px;text-align:center;font-weight:bold;width:14%;">मात्रा</th>
                                <th style="border:1px solid #222;padding:8px;text-align:center;font-weight:bold;width:14%;">राशि</th>
                                <th style="border:1px solid #222;padding:8px;width:4%;"></th>
                                <th style="border:1px solid #222;padding:8px;text-align:center;font-weight:bold;width:20%;">उत्पाद</th>
                                <th style="border:1px solid #222;padding:8px;text-align:center;font-weight:bold;width:14%;">मात्रा</th>
                                <th style="border:1px solid #222;padding:8px;text-align:center;font-weight:bold;width:14%;">राशि</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        return container;
    };

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
        const container = renderBillPage(pageIdx);
        // Wait for DOM to render
        // eslint-disable-next-line no-await-in-loop
        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            logging: false,
            windowWidth: 794,
            windowHeight: 1123
        });
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        if (pageIdx > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
        document.body.removeChild(container);
    }

    pdf.save(`bill_${customerName || 'guest'}_${formatDate()}.pdf`);
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

    // Calculate actual number of pages with items (46 items per page)
    const calculateTotalPages = () => {
        const itemsPerPage = 46;
        return Math.ceil(cart.length / itemsPerPage);
    };

    const totalPages = calculateTotalPages();

    const handlePageChange = (newPage) => {
        if (newPage >= 0 && newPage < totalPages) {
            setCurrentPage(newPage);
        }
    };


    const billItems = generateTwoColumnTable(cart, currentPage);

    // Calculate total price (sum of all 'amount' fields, if present and numeric)
    const totalPrice = cart.reduce((sum, item) => {
        const amt = parseFloat(item.amount);
        return sum + (isNaN(amt) ? 0 : amt);
    }, 0);

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

    const handleEditItem = (index) => {
        const item = cart[index];
        setEditingItem(index);
        setEditQuantity(item.quantity);
        setEditUnit(item.unit);
    };

    const handleSaveEdit = () => {
        if (editingItem !== null) {
            const updatedCart = [...cart];
            updatedCart[editingItem] = {
                ...updatedCart[editingItem],
                quantity: editQuantity,
                unit: editUnit,
            };
            setCart(updatedCart);
            setEditingItem(null);
            setEditQuantity(1);
            setEditUnit('कि.ग्रा.');
        }
    };

    const handleCancelEdit = () => {
        setEditingItem(null);
        setEditQuantity(1);
        setEditUnit('कि.ग्रा.');
    };

    const handleDeleteItem = (index) => {
        const updatedCart = cart.filter((_, i) => i !== index);
        setCart(updatedCart);
        if (editingItem === index) {
            setEditingItem(null);
            setEditQuantity(1);
            setEditUnit('कि.ग्रा.');
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
                                <option value="लीटर">लीटर</option> 
                                <option value="बोतल">बोतल</option>
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

                <div className="flex justify-between mb-4">
                    <h2 className="text-xl font-bold text-primary">Cart Items ({cart.length})</h2>
                    <button
                        onClick={handleClearCart}
                        className="px-4 py-2 text-base bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold shadow transition"
                    >
                        Clear All
                    </button>
                </div>

                {cart.length > 0 && (
                    <div className="mb-4 max-h-64 overflow-y-auto border border-gray-300 rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="px-3 py-2 text-left font-semibold">S.No.</th>
                                    <th className="px-3 py-2 text-left font-semibold">Product Name</th>
                                    <th className="px-3 py-2 text-left font-semibold">Quantity</th>
                                    <th className="px-3 py-2 text-left font-semibold">Unit</th>
                                    <th className="px-3 py-2 text-center font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cart.map((item, index) => (
                                    <tr key={`${item.id}-${item.unit}-${index}`} className="border-b hover:bg-gray-50">
                                        <td className="px-3 py-2">{cart.length - index}</td>
                                        <td className="px-3 py-2 font-medium">{item.name}</td>
                                        <td className="px-3 py-2">
                                            {editingItem === index ? (
                                                <input
                                                    type="number"
                                                    value={editQuantity}
                                                    onChange={(e) => setEditQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                                                    min="1"
                                                />
                                            ) : (
                                                item.quantity
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            {editingItem === index ? (
                                                <select
                                                    value={editUnit}
                                                    onChange={(e) => setEditUnit(e.target.value)}
                                                    className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                                                >
                                                    <option value="कि.ग्रा.">कि.ग्रा.</option>
                                                    <option value="ग्राम">ग्राम</option>
                                                    <option value="पीपा">पीपा</option>
                                                    <option value="गड्डी">गड्डी</option>
                                                    <option value="पैकेट">पैकेट</option>
                                                    <option value="">None</option>
                                                </select>
                                            ) : (
                                                item.unit
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            {editingItem === index ? (
                                                <div className="flex gap-1 justify-center">
                                                    <button
                                                        onClick={handleSaveEdit}
                                                        className="px-2 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded font-semibold transition"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        className="px-2 py-1 text-xs bg-gray-500 hover:bg-gray-600 text-white rounded font-semibold transition"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-1 justify-center">
                                                    <button
                                                        onClick={() => handleEditItem(index)}
                                                        className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded font-semibold transition"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteItem(index)}
                                                        className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded font-semibold transition"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div
                    ref={billRef}
                    className="bg-white p-4 border border-gray-800 rounded-lg shadow-sm mb-4"
                    style={{
                        fontFamily: 'DejaVu Sans, Arial, sans-serif',
                        color: '#222',
                        width: '794px', // A4 width
                        height: '1123px', // A4 height
                        maxWidth: '794px',
                        margin: '0 auto',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    <div className="text-center font-bold text-xl mb-2 text-gray-900">! श्री राम जी !!</div>
                    <div className="text-center text-base mb-2 text-gray-900">
                        {`दिनांक ${formattedDeliveryDateBill} को ${hindiDeliveryTimeBill} तक देना है।`}
                    </div>
                    <div className="flex justify-between text-base m-2 mb-2 text-gray-900">
                        <span className="flex-1 mr-4">नाम: {customerNameHindi || ''}</span>
                        <span className="whitespace-nowrap">मो. नं. {customerMobile || ''}</span>
                    </div>

                   <div className="w-full flex-1 flex justify-center">
                    <table className="w-[95%] border-collapse text-base h-full">
                        <thead>
                            <tr>
                                <th className="border border-gray-800 p-2 text-center font-bold" style={{ width: '20%' }}>
                                    उत्पाद
                                </th>
                                <th className="border border-gray-800 p-2 text-center font-bold" style={{ width: '14%' }}>
                                    मात्रा
                                </th>
                                <th className="border border-gray-800 p-2 text-center font-bold" style={{ width: '14%' }}>
                                    राशि
                                </th>
                                <th className="border border-gray-800 p-2" style={{ width: '4%' }}></th>
                                <th className="border border-gray-800 p-2 text-center font-bold" style={{ width: '20%' }}>
                                    उत्पाद
                                </th>
                                <th className="border border-gray-800 p-2 text-center font-bold" style={{ width: '14%' }}>
                                    मात्रा
                                </th>
                                <th className="border border-gray-800 p-2 text-center font-bold" style={{ width: '14%' }}>
                                    राशि
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 23 }).map((_, idx) => (
                                <tr key={idx} style={{ 
                                    height: '32px', // Fixed height for consistent 23 rows
                                }}>
                                    <td className="border border-gray-800 text-center text-gray-900"
                                        style={{ 
                                            width: '20%',
                                            padding: '5px 4px',
                                            fontSize: '14px',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            verticalAlign: 'middle'
                                        }}>{billItems[idx]?.left?.name || ''}</td>
                                    <td className="border border-gray-800 text-center text-gray-900"
                                        style={{ 
                                            width: '14%',
                                            padding: '5px 4px',
                                            fontSize: '14px',
                                            verticalAlign: 'middle'
                                        }}>{billItems[idx]?.left?.quantity || ''}</td>
                                    <td className="border border-gray-800 text-center text-gray-900"
                                        style={{ 
                                            width: '14%',
                                            padding: '5px 4px',
                                            fontSize: '14px',
                                            verticalAlign: 'middle'
                                        }}>{billItems[idx]?.left?.amount || ''}</td>
                                    <td className="border border-gray-800"
                                        style={{ 
                                            width: '4%',
                                            padding: '5px 4px'
                                        }}></td>
                                    {/* Right side columns with same widths */}
                                    <td className="border border-gray-800 text-center text-gray-900"
                                        style={{ 
                                            width: '20%',
                                            padding: '5px 4px',
                                            fontSize: '14px',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            verticalAlign: 'middle'
                                        }}>{billItems[idx]?.right?.name || ''}</td>
                                    <td className="border border-gray-800 text-center text-gray-900"
                                        style={{ 
                                            width: '14%',
                                            padding: '5px 4px',
                                            fontSize: '14px',
                                            verticalAlign: 'middle'
                                        }}>{billItems[idx]?.right?.quantity || ''}</td>
                                    <td className="border border-gray-800 text-center text-gray-900"
                                        style={{ 
                                            width: '14%',
                                            padding: '5px 4px',
                                            fontSize: '14px',
                                            verticalAlign: 'middle'
                                        }}>{billItems[idx]?.right?.amount || ''}</td>
                                </tr>
                            ))}
                            {/* Gap row before total price */}
                            <tr style={{ height: '18px', background: '#fff' }}>
                                <td colSpan={7} style={{ border: 'none', background: '#fff' }}></td>
                            </tr>
                            {/* Total price row at the bottom */}
                            <tr style={{ height: '32px', background: '#f3f4f6', justifyContent: 'center' }}>
                                <td colSpan={3} className="border border-gray-800 text-right font-bold text-lg pr-4" style={{ background: '#f3f4f6', marginBottom: '12px' }}>
                                    <span style={{ display: 'inline-block', marginBottom: '8px' }}>कुल राशि:</span>
                                </td>
                                <td className="border border-gray-800" style={{ background: '#f3f4f6' }}></td>
                                <td colSpan={3} className="border border-gray-800 text-left font-bold text-lg pl-4" style={{ background: '#f3f4f6' }}>
                                    {/* ₹ {totalPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })} */}
                                </td>
                            </tr>
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
