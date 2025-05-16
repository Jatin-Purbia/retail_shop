import { useState, useEffect, useCallback, useRef } from 'react';

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

  // Debounced transliteration function
  const debouncedTransliterate = useCallback(
    async (text) => {
      if (!text) return;
      
      setIsTransliterating(true);
      try {
        const response = await fetch(
          `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=hi-t-i0-und&num=5&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`
        );
        const data = await response.json();
        if (data && data[1] && data[1][0] && data[1][0][1]) {
          const suggestions = data[1][0][1];
          setNameSuggestions(suggestions);
          if (suggestions.length > 0) {
            setFormData(prev => ({
              ...prev,
              hindiName: suggestions[0]
            }));
          }
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Transliteration error:', error);
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
    
    // Update the form data immediately for smooth typing
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // If it's the English name field, trigger debounced transliteration
    if (name === 'name') {
      const timeoutId = setTimeout(() => {
        debouncedTransliterate(value);
      }, 300); // 300ms delay

      return () => clearTimeout(timeoutId);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setFormData(prev => ({
      ...prev,
      hindiName: suggestion
    }));
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      if (editingItem) {
        const response = await fetch(`${API_URL}/inventory/${editingItem.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) throw new Error('Failed to update item');
        const updatedItem = await response.json();
        setItems(prev => prev.map(item => 
          item.id === editingItem.id ? updatedItem : item
        ));
      } else {
        const response = await fetch(`${API_URL}/inventory`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) throw new Error('Failed to add item');
        const newItem = await response.json();
        setItems(prev => [...prev, newItem]);
      }
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
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-primary-dark">Inventory Management</h1>
      
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
          <div>
            <label className="block text-sm font-medium text-primary-dark">Name (English)</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-primary-light shadow-sm focus:border-primary focus:ring-primary"
              required
            />
          </div>
          <div className="relative" ref={suggestionsRef}>
            <label className="block text-sm font-medium text-primary-dark">Name (Hindi)</label>
            <input
              type="text"
              name="hindiName"
              value={formData.hindiName}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-primary-light shadow-sm focus:border-primary focus:ring-primary"
              required
            />
            {isTransliterating && (
              <div className="mt-1 text-sm text-primary-light">Translating...</div>
            )}
            {showSuggestions && nameSuggestions.length > 0 && !isTransliterating && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-primary-light rounded-md shadow-lg">
                <ul className="py-1">
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
          <div>
            <label className="block text-sm font-medium text-primary-dark">Unit</label>
            <input
              type="text"
              name="unit"
              value={formData.unit}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-primary-light shadow-sm focus:border-primary focus:ring-primary"
              required
            />
          </div>
          <div className="flex space-x-4">
            <button
              type="submit"
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors duration-200"
            >
              {editingItem ? 'Update' : 'Add'} Item
            </button>
            {editingItem && (
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors duration-200"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-primary-light">
        <table className="min-w-full divide-y divide-primary-light">
          <thead className="bg-primary-light">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-primary-dark uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-primary-dark uppercase tracking-wider">Name (English)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-primary-dark uppercase tracking-wider">Name (Hindi)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-primary-dark uppercase tracking-wider">Unit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-primary-dark uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-primary-light">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-primary-light/10">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">{item.id}</td>
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
  );
};

export default Admin; 