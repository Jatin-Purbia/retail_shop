import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import 'react-simple-keyboard/build/css/index.css';
import { exportBillPdf } from '../utils/billPdf';

const API_URL = 'http://localhost:5000/api';

const generateEntryId = () => `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const parseRateValue = (value) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue === 0) {
        return null;
    }

    return numericValue;
};

const formatRateValue = (value) => {
    const numericValue = parseRateValue(value);
    return numericValue === null ? '' : numericValue.toFixed(2);
};

const normalizeCartItem = (item) => ({
    ...item,
    entryId: item?.entryId ?? generateEntryId(),
    grade: item?.grade ?? 'A',
    rate: parseRateValue(item?.rate),
    amount: item?.amount ?? '',
});

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
    const ROWS_PER_SIDE = 22; // 22 rows per side, 44 items per page
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
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const billIdParam = searchParams.get('billId');
    const [currentBillId, setCurrentBillId] = useState(() => {
        if (billIdParam) return Number(billIdParam);
        const stored = localStorage.getItem('currentBillId');
        return stored ? Number(stored) : null;
    });
    const [isSavingBill, setIsSavingBill] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [isLoadingBill, setIsLoadingBill] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showClearModal, setShowClearModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [selectedUnit, setSelectedUnit] = useState('कि.ग्रा.');
    const [cart, setCart] = useState(() => {
        const savedCart = localStorage.getItem('customerCart');
        if (!savedCart) return [];
        try {
            const parsedCart = JSON.parse(savedCart);
            if (!Array.isArray(parsedCart)) return [];
            return parsedCart
                .filter((item) => item && typeof item === 'object')
                .map(normalizeCartItem);
        } catch (error) {
            console.error('Failed to parse saved cart', error);
            return [];
        }
    });
    const [filteredItems, setFilteredItems] = useState([]);
    const [customerName, setCustomerName] = useState(() => localStorage.getItem('customerName') || '');
    const [customerNameHindi, setCustomerNameHindi] = useState(() => localStorage.getItem('customerNameHindi') || '');
    const [customerMobile, setCustomerMobile] = useState(() => localStorage.getItem('customerMobile') || '');
    const [alternateMobile, setAlternateMobile] = useState(() => localStorage.getItem('alternateMobile') || '');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [nameSuggestions, setNameSuggestions] = useState([]);
    const [showNameSuggestions, setShowNameSuggestions] = useState(false);
    const searchInputRef = useRef(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [selectedGrade, setSelectedGrade] = useState('A');
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
    const [editGrade, setEditGrade] = useState('A');

    const getRateByGrade = (item, grade) => {
        if (!grade) {
            return null;
        }

        const normalizedGrade = String(grade || 'A').toUpperCase();
        const key = `rate${normalizedGrade}`;
        return parseRateValue(item?.[key]);
    };

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
        localStorage.setItem('alternateMobile', alternateMobile);
    }, [alternateMobile]);

    useEffect(() => {
        localStorage.setItem('deliveryDate', deliveryDate.toISOString());
    }, [deliveryDate]);

    useEffect(() => {
        localStorage.setItem('deliveryTimeHindi', deliveryTimeHindi);
    }, [deliveryTimeHindi]);

    useEffect(() => {
        if (currentBillId) {
            localStorage.setItem('currentBillId', String(currentBillId));
        } else {
            localStorage.removeItem('currentBillId');
        }
    }, [currentBillId]);

    // Load bill from server when billId URL param is provided
    useEffect(() => {
        if (!billIdParam) return;
        const idNum = Number(billIdParam);
        if (!Number.isFinite(idNum)) return;

        let cancelled = false;
        setIsLoadingBill(true);
        (async () => {
            try {
                const response = await fetch(`${API_URL}/bills/${idNum}`);
                if (!response.ok) throw new Error('Failed to load bill');
                const bill = await response.json();
                if (cancelled) return;

                setCurrentBillId(bill.id);
                setCustomerName(bill.customer_name || '');
                setCustomerNameHindi(bill.customer_name_hindi || '');
                setCustomerMobile(bill.customer_mobile || '');
                setAlternateMobile(bill.alternate_mobile || '');
                if (bill.delivery_date) {
                    const parsedDate = new Date(bill.delivery_date);
                    if (!Number.isNaN(parsedDate.getTime())) {
                        setDeliveryDate(parsedDate);
                    }
                }
                if (bill.delivery_time_hindi) {
                    setDeliveryTimeHindi(bill.delivery_time_hindi);
                }
                const loadedItems = Array.isArray(bill.items) ? bill.items : [];
                setCart(loadedItems.map(normalizeCartItem));
                setCurrentPage(0);
            } catch (error) {
                console.error('Failed to load bill:', error);
                alert('Failed to load bill. It may have been deleted.');
            } finally {
                if (!cancelled) setIsLoadingBill(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [billIdParam]);

    const transliterateToHindi = async (text) => {
        if (!text) {
            setHindiSuggestions([]);
            setCustomerNameHindi('');
            return;
        }

        try {
            const response = await fetch(
                `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=hi-t-i0-und&num=8&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`
            );
            const data = await response.json();
            if (data && data[1] && data[1][0] && data[1][0][1] && data[1][0][1].length > 0) {
                const suggestions = data[1][0][1];
                setHindiSuggestions(suggestions);
                setCustomerNameHindi(suggestions[0]);
            } else {
                setHindiSuggestions([text]);
                setCustomerNameHindi(text);
            }
        } catch (error) {
            console.error('Transliteration error:', error);
            setCustomerNameHindi(text);
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
            
            const dataWithHindiNames = data.map(item => ({
                ...item,
                name: item.hindiName || item.name // Use hindiName if available
            }));

            setFilteredItems(dataWithHindiNames);
            setHighlightedIndex(dataWithHindiNames.length > 0 ? 0 : -1);
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

        const numericQuantity = parseFloat(quantity) || 0;
        if (numericQuantity <= 0) return;
        
        const chosenRate = getRateByGrade(selectedItem, selectedGrade);

        const cartItem = normalizeCartItem({
            ...selectedItem,
            quantity: numericQuantity,
            unit: selectedUnit,
            grade: selectedGrade,
            rate: chosenRate,
            amount: chosenRate === null ? '' : (numericQuantity * chosenRate).toFixed(2),
        });

        // Always add a fresh entry so duplicate selections stay separate
        setCart((prevCart) => [cartItem, ...prevCart]);

        setSearchTerm('');
        setFilteredItems([]);
        setQuantity(1);
        setSelectedGrade('A');
        setHighlightedIndex(-1);
        setSelectedItem(null);
        if (searchInputRef.current) searchInputRef.current.focus();
    };

    const handleDeliveryTimeChange = (event) => {
        setDeliveryTimeHindi(event.target.value);
    };

    const buildBillPayload = () => {
        const totalAmount = cart.reduce((sum, item) => {
            const amt = parseFloat(item.amount);
            return sum + (Number.isNaN(amt) ? 0 : amt);
        }, 0);

        let dateForSave = null;
        if (deliveryDate instanceof Date && !Number.isNaN(deliveryDate.getTime())) {
            const y = deliveryDate.getFullYear();
            const m = String(deliveryDate.getMonth() + 1).padStart(2, '0');
            const d = String(deliveryDate.getDate()).padStart(2, '0');
            dateForSave = `${y}-${m}-${d}`;
        }

        return {
            customer_name: customerName,
            customer_name_hindi: customerNameHindi,
            customer_mobile: customerMobile,
            alternate_mobile: alternateMobile,
            delivery_date: dateForSave,
            delivery_time_hindi: deliveryTimeHindi,
            items: cart,
            total_amount: totalAmount,
        };
    };

    const handleSaveBill = async () => {
        if (cart.length === 0) {
            alert('Cart is empty. Add items before saving.');
            return;
        }

        setIsSavingBill(true);
        setSaveMessage('');
        try {
            const payload = buildBillPayload();
            const isUpdate = Boolean(currentBillId);
            const url = isUpdate ? `${API_URL}/bills/${currentBillId}` : `${API_URL}/bills`;
            const method = isUpdate ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errBody = await response.json().catch(() => ({}));
                throw new Error(errBody.error || 'Failed to save bill');
            }
            const saved = await response.json();
            setCurrentBillId(saved.id);
            setSaveMessage(isUpdate ? `Bill #${saved.id} updated` : `Saved as Bill #${saved.id}`);
            setTimeout(() => setSaveMessage(''), 4000);
        } catch (error) {
            console.error('Save bill error:', error);
            alert(`Failed to save bill: ${error.message}`);
        } finally {
            setIsSavingBill(false);
        }
    };

const handleExportPDF = async () => {
    if (cart.length === 0) {
        alert('Your cart is empty. Add items to export.');
        return;
    }
    try {
        await exportBillPdf({
            items: cart,
            billId: currentBillId,
            customerName,
            customerNameHindi,
            customerMobile,
            alternateMobile,
            deliveryDate,
            deliveryTimeHindi,
        });
    } catch (error) {
        console.error('Export PDF error:', error);
        alert(`Failed to export PDF: ${error.message}`);
    }
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
        setCustomerNameHindi('');
        setCustomerMobile('');
        setAlternateMobile('');
        setDeliveryDate(new Date());
        setDeliveryTimeHindi('सुबह');
        setCurrentBillId(null);
        setSaveMessage('');

        localStorage.removeItem('customerCart');
        localStorage.removeItem('customerName');
        localStorage.removeItem('customerNameHindi');
        localStorage.removeItem('customerMobile');
        localStorage.removeItem('alternateMobile');
        localStorage.removeItem('deliveryDate');
        localStorage.removeItem('deliveryTimeHindi');
        localStorage.removeItem('currentBillId');

        if (billIdParam) {
            navigate('/customer', { replace: true });
        }
    };

    const formattedDeliveryDateBill = formatDate(deliveryDate);
    const mobileNumbersText = [customerMobile, alternateMobile].filter(Boolean).join(' / ');
    const timeMappingBill = { सुबह: 'सुबह', दोपहर: 'दोपहर', शाम: 'शाम' };
    const hindiDeliveryTimeBill = timeMappingBill[deliveryTimeHindi] || '';

    // Calculate actual number of pages with items (44 items per page)
    const calculateTotalPages = () => {
        const itemsPerPage = 44;
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
        setEditGrade(item.grade || 'A');
    };

    const handleSaveEdit = () => {
        if (editingItem !== null) {
            const numericQuantity = parseFloat(editQuantity) || 1;
            const updatedCart = [...cart];
            const currentItem = updatedCart[editingItem];
            const chosenRate = getRateByGrade(currentItem, editGrade);
            updatedCart[editingItem] = {
                ...currentItem,
                quantity: numericQuantity,
                unit: editUnit,
                grade: editGrade,
                rate: chosenRate,
                amount: chosenRate === null ? '' : (numericQuantity * chosenRate).toFixed(2),
            };
            setCart(updatedCart);
            setEditingItem(null);
            setEditQuantity(1);
            setEditUnit('कि.ग्रा.');
            setEditGrade('A');
        }
    };

    const handleCancelEdit = () => {
        setEditingItem(null);
        setEditQuantity(1);
        setEditUnit('कि.ग्रा.');
        setEditGrade('A');
    };

    const handleDeleteItem = (index) => {
        const updatedCart = cart.filter((_, i) => i !== index);
        // Calculate new total pages after deletion
        const ROWS_PER_SIDE = 23;
        const ITEMS_PER_PAGE = ROWS_PER_SIDE * 2;
        const newTotalPages = Math.ceil(updatedCart.length / ITEMS_PER_PAGE);
        // If current page is now out of range, shift to previous page
        setCart(updatedCart);
        setCurrentPage((prevPage) => {
            if (prevPage >= newTotalPages && newTotalPages > 0) {
                return newTotalPages - 1;
            }
            return prevPage;
        });
        if (editingItem === index) {
            setEditingItem(null);
            setEditQuantity(1);
            setEditUnit('कि.ग्रा.');
            setEditGrade('A');
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
                    <div>
                        <label className="block text-base text-primary-dark font-semibold mb-1">
                            वैकल्पिक नंबर
                        </label>
                        <input
                            type="text"
                            value={alternateMobile}
                            onChange={(e) => setAlternateMobile(e.target.value)}
                            className="w-full px-3 py-2 text-base bg-gray-200 border border-accent-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="वैकल्पिक नंबर दर्ज करें"
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
                            type="text"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="w-full px-3 py-2 text-base bg-gray-200 border border-accent-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            inputMode="decimal"
                            pattern="[0-9]*[.,]?[0-9]*"
                            placeholder="Enter quantity"
                        />
                    </div>
                    <div className="flex gap-2 items-end">
                        <div>
                            <label className="block text-base text-primary-dark font-semibold mb-1">
                                Grade
                            </label>
                            <select
                                value={selectedGrade}
                                onChange={(e) => setSelectedGrade(e.target.value)}
                                className="w-24 px-3 py-2 text-base bg-gray-200 border border-accent-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="">None</option>
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                            </select>
                        </div>
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
                                <option value="नग">नग</option>
                                <option value="कार्टून">कार्टून</option>
                                <option value="कट्टा">कट्टा</option>
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

                <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                    <h2 className="text-xl font-bold text-primary">Cart Items ({cart.length})</h2>
                    <div className="flex flex-wrap items-center gap-2">
                        {saveMessage && (
                            <span className="text-base font-semibold text-green-700">
                                {saveMessage}
                            </span>
                        )}
                        {currentBillId && (
                            <span className="text-base font-semibold text-primary-dark">
                                Editing Bill #{currentBillId}
                            </span>
                        )}
                        <button
                            onClick={() => {
                                if (cart.length === 0) {
                                    alert('Cart is empty. Add items before saving.');
                                    return;
                                }
                                setShowSaveModal(true);
                            }}
                            disabled={isSavingBill}
                            className="px-4 py-2 text-base bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSavingBill ? 'Saving...' : (currentBillId ? 'Update Bill' : 'Save Bill')}
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="px-4 py-2 text-base bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold shadow transition"
                        >
                            Export PDF
                        </button>
                        <button
                            onClick={() => setShowClearModal(true)}
                            className="px-4 py-2 text-base bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold shadow transition"
                        >
                            Clear All
                        </button>
                    </div>
            {showClearModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm text-center">
                        <div className="text-lg font-semibold mb-4">क्या आप वाकई सभी आइटम्स हटाना चाहते हैं?</div>
                        <div className="flex justify-center gap-4 mt-2">
                            <button
                                className="px-4 py-2 bg-red-500 text-white rounded font-semibold hover:bg-red-600"
                                onClick={() => {
                                    handleClearCart();
                                    setShowClearModal(false);
                                }}
                            >
                                Yes
                            </button>
                            <button
                                className="px-4 py-2 bg-gray-300 text-gray-800 rounded font-semibold hover:bg-gray-400"
                                onClick={() => setShowClearModal(false)}
                            >
                                No
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showSaveModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm text-center">
                        <div className="text-lg font-semibold mb-4">
                            {currentBillId
                                ? `क्या आप वाकई Bill #${currentBillId} अपडेट करना चाहते हैं?`
                                : 'क्या आप वाकई इस बिल को सेव करना चाहते हैं?'}
                        </div>
                        <div className="flex justify-center gap-4 mt-2">
                            <button
                                className="px-4 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700 disabled:opacity-50"
                                disabled={isSavingBill}
                                onClick={async () => {
                                    setShowSaveModal(false);
                                    await handleSaveBill();
                                }}
                            >
                                Yes
                            </button>
                            <button
                                className="px-4 py-2 bg-gray-300 text-gray-800 rounded font-semibold hover:bg-gray-400"
                                onClick={() => setShowSaveModal(false)}
                            >
                                No
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
                                    <th className="px-3 py-2 text-left font-semibold">Grade</th>
                                    <th className="px-3 py-2 text-left font-semibold">Rate</th>
                                    <th className="px-3 py-2 text-left font-semibold">Rashi</th>
                                    <th className="px-3 py-2 text-center font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cart.map((item, index) => (
                                    <tr key={item.entryId || `${item.id}-${item.unit}-${index}`} className="border-b hover:bg-gray-50">
                                        <td className="px-3 py-2">{cart.length - index}</td>
                                        <td className="px-3 py-2 font-medium">{item.name}</td>
                                        <td className="px-3 py-2">
                                            {editingItem === index ? (
                                                <input
                                                    type="text"
                                                    value={editQuantity}
                                                    onChange={(e) => setEditQuantity(e.target.value)}
                                                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                                                    inputMode="decimal"
                                                    pattern="[0-9]*[.,]?[0-9]*"
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
                                        <td className="px-3 py-2">
                                            {editingItem === index ? (
                                                <select
                                                    value={editGrade}
                                                    onChange={(e) => setEditGrade(e.target.value)}
                                                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                                                >
                                                    <option value="">None</option>
                                                    <option value="A">A</option>
                                                    <option value="B">B</option>
                                                    <option value="C">C</option>
                                                </select>
                                            ) : (
                                                item.grade || 'None'
                                            )}
                                        </td>
                                        <td className="px-3 py-2">{formatRateValue(item.rate)}</td>
                                        <td className="px-3 py-2 font-semibold">{item.amount || ''}</td>
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
                        position: 'relative',
                        fontFamily: 'DejaVu Sans, Arial, sans-serif',
                        color: '#222',
                        width: '100%',
                        height: 'auto',
                        maxWidth: '794px',
                        margin: '0 auto',
                        display: 'flex',
                        flexDirection: 'column',
                        boxSizing: 'border-box'
                    }}
                >
                    {/* Header: box (left) | title+subtitle centered | bill number (right) */}
                    <div className="w-full flex flex-row items-center mb-1">
                        <div className="border p-2 text-sm bg-white flex-shrink-0" style={{width:'210px'}}>
                            <div className="flex items-center mb-3">
                                <span className="font-semibold whitespace-nowrap mr-2">Check By:</span>
                            </div>
                            <div className="flex items-center">
                                <span className="font-semibold whitespace-nowrap mr-2">Delivered By:</span>
                            </div>
                        </div>
                        <div className="text-center flex-1 px-2">
                            <div className="font-bold text-xl text-gray-900">! श्री राम जी !!</div>
                            <div className="text-base text-gray-900 mt-1">{`दिनांक ${formattedDeliveryDateBill} को ${hindiDeliveryTimeBill} तक देना है।`}</div>
                        </div>
                        <div className="flex-shrink-0 text-right text-base text-gray-900" style={{width:'210px'}}>
                            <div className="font-bold">Bill No: {currentBillId ?? '—'}</div>
                        </div>
                    </div>
                    {/* Name / Mobile row — full width, below the header */}
                    <div className="flex justify-between text-base mb-2 text-gray-900 px-1">
                        <span className="flex-1 min-w-0 mr-2 overflow-hidden text-ellipsis whitespace-nowrap">नाम: {customerNameHindi || ''}</span>
                        <span className="whitespace-nowrap flex-shrink-0">मो. नं. {mobileNumbersText}</span>
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
                            {Array.from({ length: 22 }).map((_, idx) => (
                                <tr key={idx} style={{ 
                                    height: '32px', // Fixed height for consistent 22 rows
                                }}>
                                    <td className="border border-gray-800 text-center text-gray-900"
                                        style={{ 
                                            width: '20%',
                                            padding: '5px 4px',
                                            fontSize: '18px',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            verticalAlign: 'middle'
                                        }}>{billItems[idx]?.left?.name || ''}</td>
                                    <td className="border border-gray-800 text-center text-gray-900"
                                        style={{ 
                                            width: '14%',
                                            padding: '5px 4px',
                                            fontSize: '16px',
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
                                            fontSize: '18px',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            verticalAlign: 'middle'
                                        }}>{billItems[idx]?.right?.name || ''}</td>
                                    <td className="border border-gray-800 text-center text-gray-900"
                                        style={{ 
                                            width: '14%',
                                            padding: '5px 4px',
                                            fontSize: '16px',
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
                            {/* <tr style={{ height: '32px', background: '#f3f4f6', justifyContent: 'center' }}>
                                <td colSpan={3} className="border border-gray-800 text-right font-bold text-lg pr-4" style={{ background: '#f3f4f6', marginBottom: '12px' }}>
                                    <span style={{ display: 'inline-block', marginBottom: '8px' }}>कुल राशि:</span>
                                </td>
                                <td className="border border-gray-800" style={{ background: '#f3f4f6' }}></td>
                                <td colSpan={3} className="border border-gray-800 text-left font-bold text-lg pl-4" style={{ background: '#f3f4f6' }}>
-                                </td>
                            </tr> */}
                        </tbody>
                    </table>
                </div>
                <div style={{marginTop: '14px', borderTop: '1px solid #aaa', paddingTop: '8px', fontSize: '13px', textAlign: 'center'}}>
                    <span style={{fontWeight: 'bold', fontSize: '14px', marginRight: '6px'}}>नोट:</span>शेष बचा सामान रविवार को वापस नहीं लिया जाएगा। शेष बचा सामान लाने से पूर्व दुकान पर संपर्क करें। सामान के साथ हिसाब वाली पर्ची लाना अनिवार्य है।
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

            </div>
        </div>
    );
}

export default CustomerPage;
