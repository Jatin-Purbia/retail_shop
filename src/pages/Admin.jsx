import React, { useState, useEffect, useCallback, useRef } from 'react';

const API_URL = 'http://localhost:5000/api';

const UNIT_OPTIONS = [
  { value: '', label: 'Select Unit' },
  { value: '\u0915\u093f.\u0917\u094d\u0930\u093e.', label: '\u0915\u093f.\u0917\u094d\u0930\u093e.' },
  { value: '\u0917\u094d\u0930\u093e\u092e', label: '\u0917\u094d\u0930\u093e\u092e' },
  { value: '\u092a\u0940\u092a\u093e', label: '\u092a\u0940\u092a\u093e' },
  { value: '\u0917\u0921\u094d\u0921\u0940', label: '\u0917\u0921\u094d\u0921\u0940' },
  { value: '\u092a\u0948\u0915\u0947\u091f', label: '\u092a\u0948\u0915\u0947\u091f' },
  { value: '\u0928\u0917', label: '\u0928\u0917' },
  { value: '\u0932\u0940\u091f\u0930', label: '\u0932\u0940\u091f\u0930' },
  { value: '\u092c\u094b\u0924\u0932', label: '\u092c\u094b\u0924\u0932' },
  { value: '\u0915\u093e\u0930\u094d\u091f\u0942\u0928', label: '\u0915\u093e\u0930\u094d\u091f\u0942\u0928' },
  { value: '\u0915\u091f\u094d\u091f\u093e', label: '\u0915\u091f\u094d\u091f\u093e' },
];

const EMPTY_ITEM_FORM = {
  name: '',
  hindiName: '',
  unit: '',
  rateA: '',
  rateB: '',
  rateC: ''
};

const parseRateForSubmit = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const formatRateForDisplay = (value) => {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue === 0) {
    return '';
  }

  return numericValue;
};

const toEditableItem = (item) => ({
  name: item.name,
  hindiName: item.hindiName,
  unit: item.unit,
  rateA: formatRateForDisplay(item.rateA),
  rateB: formatRateForDisplay(item.rateB),
  rateC: formatRateForDisplay(item.rateC),
});

function Admin() {
  const [items, setItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState(EMPTY_ITEM_FORM);
  const [formData, setFormData] = useState(EMPTY_ITEM_FORM);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [isTransliterating, setIsTransliterating] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionTarget, setActiveSuggestionTarget] = useState('add');
  const suggestionsRef = useRef(null);
  const addTransliterationTimeoutRef = useRef(null);
  const editTransliterationTimeoutRef = useRef(null);

  const transliterateName = useCallback(async (text) => {
    if (!text) {
      return [];
    }

    const response = await fetch(
      `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=hi-t-i0-und&num=5&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`
    );
    const data = await response.json();

    if (data && data[1] && data[1][0] && data[1][0][1]) {
      return data[1][0][1];
    }

    return [];
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (addTransliterationTimeoutRef.current) {
        clearTimeout(addTransliterationTimeoutRef.current);
      }
      if (editTransliterationTimeoutRef.current) {
        clearTimeout(editTransliterationTimeoutRef.current);
      }
    };
  }, []);

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

  const debouncedTransliterate = useCallback(
    async (text) => {
      if (!text) {
        setNameSuggestions([]);
        setShowSuggestions(false);
        setActiveSuggestionTarget('add');
        setFormData((prev) => ({ ...prev, hindiName: '' }));
        return;
      }

      setIsTransliterating(true);
      try {
        const suggestions = await transliterateName(text);
        if (suggestions.length > 0) {
          setActiveSuggestionTarget('add');
          setNameSuggestions(suggestions);
          setShowSuggestions(true);
          setFormData((prev) => ({
            ...prev,
            hindiName: suggestions[0]
          }));
        } else {
          setNameSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (err) {
        console.error('Transliteration error:', err);
        setNameSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsTransliterating(false);
      }
    },
    [transliterateName]
  );

  const buildRatePayload = (data) => ({
    ...data,
    rateA: parseRateForSubmit(data.rateA),
    rateB: parseRateForSubmit(data.rateB),
    rateC: parseRateForSubmit(data.rateC),
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (name === 'name') {
      if (addTransliterationTimeoutRef.current) {
        clearTimeout(addTransliterationTimeoutRef.current);
      }
      addTransliterationTimeoutRef.current = setTimeout(() => {
        debouncedTransliterate(value);
      }, 300);
    } else if (name === 'hindiName' && !isTransliterating && !showSuggestions) {
      setNameSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    if (activeSuggestionTarget === 'edit') {
      setEditFormData((prev) => ({
        ...prev,
        hindiName: suggestion
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        hindiName: suggestion
      }));
    }
    setShowSuggestions(false);
    setNameSuggestions([]);
  };

  const showSuggestionsForTarget = useCallback(
    async (target, englishName) => {
      if (!englishName) {
        setNameSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsTransliterating(true);
      try {
        const suggestions = await transliterateName(englishName);
        setActiveSuggestionTarget(target);
        setNameSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      } catch (err) {
        console.error('Suggestion lookup error:', err);
        setNameSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsTransliterating(false);
      }
    },
    [transliterateName]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const payload = buildRatePayload(formData);

    try {
      const response = await fetch(`${API_URL}/inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to add item');
      const newItem = await response.json();
      setItems((prev) => [...prev, newItem]);
      resetForm();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setEditFormData(toEditableItem(item));
    setNameSuggestions([]);
    setShowSuggestions(false);
    setActiveSuggestionTarget('edit');
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;

    setEditFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (name === 'name') {
      if (editTransliterationTimeoutRef.current) {
        clearTimeout(editTransliterationTimeoutRef.current);
      }

      editTransliterationTimeoutRef.current = setTimeout(async () => {
        if (!value) {
          setActiveSuggestionTarget('edit');
          setNameSuggestions([]);
          setShowSuggestions(false);
          setEditFormData((prev) => ({
            ...prev,
            hindiName: ''
          }));
          return;
        }

        try {
          const suggestions = await transliterateName(value);
          if (suggestions.length > 0) {
            setActiveSuggestionTarget('edit');
            setNameSuggestions(suggestions);
            setShowSuggestions(true);
            setEditFormData((prev) => ({
              ...prev,
              hindiName: suggestions[0]
            }));
          } else {
            setNameSuggestions([]);
            setShowSuggestions(false);
          }
        } catch (err) {
          console.error('Edit transliteration error:', err);
        }
      }, 300);
    } else if (name === 'hindiName') {
      setActiveSuggestionTarget('edit');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    setError(null);
    const payload = buildRatePayload(editFormData);

    try {
      const response = await fetch(`${API_URL}/inventory/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to update item');
      const updatedItem = await response.json();
      setItems((prev) =>
        prev.map((item) => (item.id === editingItem.id ? updatedItem : item))
      );
      resetForm();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      const response = await fetch(`${API_URL}/inventory/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete item');
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setEditFormData(EMPTY_ITEM_FORM);
    setFormData(EMPTY_ITEM_FORM);
    setNameSuggestions([]);
    setShowSuggestions(false);
    setActiveSuggestionTarget('add');
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

        <div className="bg-white p-6 rounded-lg shadow-md mb-8 border border-primary-light">
          <h2 className="text-xl font-semibold mb-4 text-primary">Add New Item</h2>
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
                  {UNIT_OPTIONS.map((option) => (
                    <option key={`${option.value}-${option.label}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <div className="mt-4">
                  <label className="block text-base text-primary-dark font-semibold mb-1">
                    Rate A
                  </label>
                  <input
                    type="number"
                    name="rateA"
                    value={formData.rateA}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 text-base bg-gray-200 border border-accent-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-3"
                  />

                  <label className="block text-base text-primary-dark font-semibold mb-1">
                    Rate B
                  </label>
                  <input
                    type="number"
                    name="rateB"
                    value={formData.rateB}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 text-base bg-gray-200 border border-accent-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-3"
                  />

                  <label className="block text-base text-primary-dark font-semibold mb-1">
                    Rate C
                  </label>
                  <input
                    type="number"
                    name="rateC"
                    value={formData.rateC}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 text-base bg-gray-200 border border-accent-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="mt-4">
                  <button
                    type="submit"
                    className="px-4 py-2 text-base bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold shadow transition mr-2"
                  >
                    Add Item
                  </button>
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
                  onFocus={() => showSuggestionsForTarget('add', formData.name)}
                  className="w-full px-3 py-2 text-base bg-gray-200 border border-accent-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />

                {isTransliterating && (
                  <div className="mt-1 text-sm text-primary-light">Transliterating...</div>
                )}

                {showSuggestions && nameSuggestions.length > 0 && !isTransliterating && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-accent-light rounded-lg shadow-lg">
                    <ul className="py-1 max-h-32 overflow-y-auto">
                      {nameSuggestions.map((suggestion, index) => (
                        <li
                          key={`${suggestion}-${index}`}
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

        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-primary-light">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-primary-light">
              <thead className="bg-primary-light sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-primary-dark uppercase tracking-wider">Sr. No.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-primary-dark uppercase tracking-wider">Name (English)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-primary-dark uppercase tracking-wider">Name (Hindi)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-primary-dark uppercase tracking-wider">Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-primary-dark uppercase tracking-wider">Rate A</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-primary-dark uppercase tracking-wider">Rate B</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-primary-dark uppercase tracking-wider">Rate C</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-primary-dark uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-primary-light max-h-[400px] overflow-y-auto">
                {items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-primary-light/10">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-dark">
                      {editingItem?.id === item.id ? (
                        <input
                          type="text"
                          name="name"
                          value={editFormData.name}
                          onChange={handleEditInputChange}
                          className="w-full min-w-[140px] px-2 py-1 text-sm bg-gray-100 border border-accent-light rounded focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      ) : (
                        item.name
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-dark">
                      {editingItem?.id === item.id ? (
                        <div className="relative">
                          <input
                            type="text"
                            name="hindiName"
                            value={editFormData.hindiName}
                            onChange={handleEditInputChange}
                            onFocus={() => showSuggestionsForTarget('edit', editFormData.name)}
                            className="w-full min-w-[140px] px-2 py-1 text-sm bg-gray-100 border border-accent-light rounded focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          {showSuggestions && activeSuggestionTarget === 'edit' && nameSuggestions.length > 0 && (
                            <div className="absolute left-0 top-full z-10 w-full mt-1 bg-white border border-accent-light rounded-lg shadow-lg">
                              <ul className="py-1 max-h-32 overflow-y-auto">
                                {nameSuggestions.map((suggestion, suggestionIndex) => (
                                  <li
                                    key={`${suggestion}-${suggestionIndex}`}
                                    onClick={() => handleSuggestionClick(suggestion)}
                                    className="px-3 py-2 hover:bg-primary-light/20 cursor-pointer text-primary-dark"
                                  >
                                    {suggestion}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        item.hindiName
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                      {editingItem?.id === item.id ? (
                        <select
                          name="unit"
                          value={editFormData.unit}
                          onChange={handleEditInputChange}
                          className="w-full min-w-[110px] px-2 py-1 text-sm bg-gray-100 border border-accent-light rounded focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          {UNIT_OPTIONS.map((option) => (
                            <option key={`${option.value}-${option.label}`} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        item.unit
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                      {editingItem?.id === item.id ? (
                        <input
                          type="number"
                          name="rateA"
                          value={editFormData.rateA}
                          onChange={handleEditInputChange}
                          min="0"
                          step="0.01"
                          className="w-24 px-2 py-1 text-sm bg-gray-100 border border-accent-light rounded focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      ) : (
                        formatRateForDisplay(item.rateA)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                      {editingItem?.id === item.id ? (
                        <input
                          type="number"
                          name="rateB"
                          value={editFormData.rateB}
                          onChange={handleEditInputChange}
                          min="0"
                          step="0.01"
                          className="w-24 px-2 py-1 text-sm bg-gray-100 border border-accent-light rounded focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      ) : (
                        formatRateForDisplay(item.rateB)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                      {editingItem?.id === item.id ? (
                        <input
                          type="number"
                          name="rateC"
                          value={editFormData.rateC}
                          onChange={handleEditInputChange}
                          min="0"
                          step="0.01"
                          className="w-24 px-2 py-1 text-sm bg-gray-100 border border-accent-light rounded focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      ) : (
                        formatRateForDisplay(item.rateC)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {editingItem?.id === item.id ? (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            className="text-green-600 hover:text-green-800 mr-4 transition-colors duration-200"
                          >
                            Save
                          </button>
                          <button
                            onClick={resetForm}
                            className="text-gray-600 hover:text-gray-800 mr-4 transition-colors duration-200"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-primary hover:text-primary-dark mr-4 transition-colors duration-200"
                        >
                          Edit
                        </button>
                      )}
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
}

export default Admin;
