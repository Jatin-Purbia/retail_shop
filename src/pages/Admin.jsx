import React, { useState, useEffect, useCallback, useRef } from 'react';

const API_URL = 'http://localhost:5000/api';

const Admin = () => {
  const [items, setItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    hindiName: '',
    unit: ''
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [isTransliterating, setIsTransliterating] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef(null);
  const transliterationTimeoutRef = useRef(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (transliterationTimeoutRef.current) {
        clearTimeout(transliterationTimeoutRef.current);
      }
    };
  }, []);

  // Debounced transliteration function
  const debouncedTransliterate = useCallback(
    async (text) => {
      if (!text) {
        setNameSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsTransliterating(true);
      try {
        const response = await fetch(
          `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=hi-t-i0-und&num=5&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`
        );
        const data = await response.json();
        if (data && data[1] && data[1][0] && data[1][0][1]) {
          const suggestions = data[1][0][1];
          setNameSuggestions(suggestions);
          setShowSuggestions(true);
        } else {
          setNameSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (error) {
        console.error('Transliteration error:', error);
        setNameSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsTransliterating(false);
      }
    },
    []
  );

  // Fetch all items
  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch(`${API_URL}/inventory`);
      if (!response.ok) throw new Error('Failed to fetch items');
      const data = await response.json();
      setItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'name') {
      if (transliterationTimeoutRef.current) {
        clearTimeout(transliterationTimeoutRef.current);
      }
      transliterationTimeoutRef.current = setTimeout(() => {
        debouncedTransliterate(value);
      }, 300);
    } else if (name === 'hindiName' && !isTransliterating && !showSuggestions) {
      setNameSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setFormData(prev => ({
      ...prev,
      hindiName: suggestion
    }));
    setShowSuggestions(false);
    setNameSuggestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch(`${API_URL}/inventory${editingItem ? `/${editingItem.id}` : ''}`, {
        method: editingItem ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error(editingItem ? 'Failed to update item' : 'Failed to add item');
      const newItem = await response.json();
      setItems(prev =>
        editingItem
          ? prev.map(item => (item.id === editingItem.id ? newItem : item))
          : [...prev, newItem]
      );
      resetForm();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      hindiName: item.hindiName,
      unit: item.unit
    });
    setNameSuggestions([]);
    setShowSuggestions(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      const response = await fetch(`${API_URL}/inventory/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete item');
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      hindiName: '',
      unit: ''
    });
    setNameSuggestions([]);
    setShowSuggestions(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-primary-light">
        <div className="bg-white rounded-2xl shadow-2xl p-4 w-full max-w-7xl">
          <div className="text-center text-primary">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-primary-light">
      <div className="bg-white rounded-2xl shadow-2xl p-4 w-full max-w-7xl">
        <h1 className="text-2xl font-bold text-primary mb-2 text-center">Inventory Management</h1>
        <p className="text-base text-accent text-center mb-4">Manage your shop&apos;s inventory</p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8 border border-primary-light">
          <h2 className="text-xl font-semibold mb-4 text-primary">
            {editingItem ? 'Edit Item' : 'Add New Item'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-base text-primary-dark font-semibold mb-1">
                  Name (English)
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-base bg-gray-200 border border-accent-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
                <label className="block text-base text-primary-dark font-semibold mt-4 mb-1">
                  Unit
                </label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-base bg-gray-200 border border-accent-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">Select Unit</option>
                  <option value="कि.ग्रा.">कि.ग्रा.</option>
                  <option value="ग्राम">ग्राम</option>
                  <option value="पीपा">पीपा</option>
                  <option value="गड्डी">गड्डी</option>
                  <option value="पैकेट">पैकेट</option>
                  <option value="नग">नग</option>
                  <option value="पैकेट">लीटर</option> 
                </select>
                <div className="mt-4">
                  <button
                    type="submit"
                    className="px-4 py-2 text-base bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold shadow transition mr-2"
                  >
                    {editingItem ? 'Update' : 'Add'} Item
                  </button>
                  {editingItem && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 text-base bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold shadow transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
              <div className="relative" ref={suggestionsRef}>
                <label className="block text-base text-primary-dark font-semibold mb-1">
                  Name (Hindi)
                </label>
                <input
                  type="text"
                  name="hindiName"
                  value={formData.hindiName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-base bg-gray-200 border border-accent-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
                {isTransliterating && (
                  <div className="mt-1 text-sm text-primary-light">Translating...</div>
                )}
                {showSuggestions && nameSuggestions.length > 0 && !isTransliterating && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-accent-light rounded-lg shadow-lg">
                    <ul className="py-1 max-h-32 overflow-y-auto">
                      {nameSuggestions.map((suggestion, index) => (
                        <li
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="px-4 py-2 hover:bg-primary-light/20 cursor-pointer text-primary-dark"
                        >
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-primary-light">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-primary-light">
              <thead className="bg-primary-light sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-primary-dark uppercase tracking-wider">Sr. No.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-primary-dark uppercase tracking-wider">Name (English)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-primary-dark uppercase tracking-wider">Name (Hindi)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-primary-dark uppercase tracking-wider">Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-primary-dark uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-primary-light max-h-[400px] overflow-y-auto">
                {items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-primary-light/10">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-dark">{item.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-dark">{item.hindiName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">{item.unit}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-primary hover:text-primary-dark mr-4 transition-colors duration-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-900 transition-colors duration-200"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;