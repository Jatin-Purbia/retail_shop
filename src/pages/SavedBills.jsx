import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:5000/api';

function formatDateString(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB').replace(/\//g, '.');
}

function formatDateTime(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.toLocaleDateString('en-GB').replace(/\//g, '.')} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

function SavedBills() {
    const navigate = useNavigate();
    const [bills, setBills] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [deletingId, setDeletingId] = useState(null);

    const loadBills = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch(`${API_URL}/bills`);
            if (!response.ok) throw new Error('Failed to load bills');
            const data = await response.json();
            setBills(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to load bills');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadBills();
    }, []);

    const filteredBills = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return bills;
        return bills.filter((bill) => {
            const idMatch = String(bill.id).includes(term);
            const nameMatch = (bill.customer_name || '').toLowerCase().includes(term);
            const hindiNameMatch = (bill.customer_name_hindi || '').toLowerCase().includes(term);
            const mobileMatch = (bill.customer_mobile || '').includes(term)
                || (bill.alternate_mobile || '').includes(term);
            return idMatch || nameMatch || hindiNameMatch || mobileMatch;
        });
    }, [bills, search]);

    const handleEdit = (bill) => {
        navigate(`/customer?billId=${bill.id}`);
    };

    const handleDownload = (bill) => {
        navigate(`/customer?billId=${bill.id}&download=1`);
    };

    const handleDelete = async (bill) => {
        if (!window.confirm(`Delete Bill #${bill.id}? This cannot be undone.`)) return;
        setDeletingId(bill.id);
        try {
            const response = await fetch(`${API_URL}/bills/${bill.id}`, { method: 'DELETE' });
            if (!response.ok) {
                const errBody = await response.json().catch(() => ({}));
                throw new Error(errBody.error || 'Failed to delete bill');
            }
            setBills((prev) => prev.filter((b) => b.id !== bill.id));
        } catch (err) {
            console.error(err);
            alert(`Failed to delete bill: ${err.message}`);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="flex flex-col p-2 items-center min-h-screen bg-primary-light">
            <div className="bg-white rounded-2xl shadow-2xl p-4 w-full max-w-7xl">
                <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-primary text-center">Saved Bills</h1>
                        <p className="text-base text-accent">Manage previously saved bills</p>
                    </div>
                    <Link
                        to="/customer"
                        className="px-4 py-2 text-base bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold shadow transition"
                    >
                        + New Bill
                    </Link>
                </div>

                <div className="mb-4">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by bill number, customer name, or mobile..."
                        className="w-full px-3 py-2 text-base bg-gray-200 border border-accent-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>

                {isLoading && (
                    <div className="text-center py-8 text-gray-600">Loading bills...</div>
                )}

                {error && !isLoading && (
                    <div className="text-center py-8 text-red-600">{error}</div>
                )}

                {!isLoading && !error && filteredBills.length === 0 && (
                    <div className="text-center py-8 text-gray-600">
                        {bills.length === 0 ? 'No saved bills yet.' : 'No bills match your search.'}
                    </div>
                )}

                {!isLoading && !error && filteredBills.length > 0 && (
                    <div className="overflow-x-auto border border-gray-300 rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="px-3 py-2 text-left font-semibold">Bill #</th>
                                    <th className="px-3 py-2 text-left font-semibold">Customer</th>
                                    <th className="px-3 py-2 text-left font-semibold">Mobile</th>
                                    <th className="px-3 py-2 text-left font-semibold">Delivery Date</th>
                                    <th className="px-3 py-2 text-left font-semibold">Time</th>
                                    <th className="px-3 py-2 text-right font-semibold">Total</th>
                                    <th className="px-3 py-2 text-left font-semibold">Saved On</th>
                                    <th className="px-3 py-2 text-center font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBills.map((bill) => (
                                    <tr key={bill.id} className="border-b hover:bg-gray-50">
                                        <td className="px-3 py-2 font-semibold">{bill.id}</td>
                                        <td className="px-3 py-2">
                                            {bill.customer_name_hindi || bill.customer_name || '—'}
                                        </td>
                                        <td className="px-3 py-2">
                                            {[bill.customer_mobile, bill.alternate_mobile].filter(Boolean).join(' / ') || '—'}
                                        </td>
                                        <td className="px-3 py-2">{formatDateString(bill.delivery_date)}</td>
                                        <td className="px-3 py-2">{bill.delivery_time_hindi || ''}</td>
                                        <td className="px-3 py-2 text-right">
                                            {bill.total_amount !== null && bill.total_amount !== undefined
                                                ? Number(bill.total_amount).toFixed(2)
                                                : ''}
                                        </td>
                                        <td className="px-3 py-2 text-gray-600">{formatDateTime(bill.created_at)}</td>
                                        <td className="px-3 py-2">
                                            <div className="flex gap-1 justify-center">
                                                <button
                                                    onClick={() => handleEdit(bill)}
                                                    className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded font-semibold transition"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDownload(bill)}
                                                    className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition"
                                                >
                                                    Download
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(bill)}
                                                    disabled={deletingId === bill.id}
                                                    className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded font-semibold transition disabled:opacity-50"
                                                >
                                                    {deletingId === bill.id ? '...' : 'Delete'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default SavedBills;
