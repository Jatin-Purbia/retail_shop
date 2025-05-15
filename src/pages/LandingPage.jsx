import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DUMMY_USER = {
  username: 'jatin',
  password: '123',
};

export default function LandingPage({ setIsLoggedIn, setEmployeeName }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    if (!username.trim()) {
      newErrors.username = 'Username is required';
    }
    if (!password.trim()) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (username === DUMMY_USER.username && password === DUMMY_USER.password) {
      setIsLoggedIn(true);
      setEmployeeName(username);
      navigate('/admin');
    } else {
      setErrors({ auth: 'Invalid username or password' });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-primary-light overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-primary mb-2 text-center">Retail Shop Portal</h1>
        <p className="text-accent text-center mb-6">Welcome! Please log in to continue.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-primary-dark font-semibold mb-1">Username</label>
            <input
              type="text"
              className={`w-full bg-gray-200 px-4 py-2 border ${
                errors.username ? 'border-red-500' : 'border-accent-light'
              } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary`}
              value={username}
              onChange={e => {
                setUsername(e.target.value);
                if (errors.username) {
                  setErrors(prev => ({ ...prev, username: '' }));
                }
              }}
              autoFocus
            />
            {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
          </div>
          <div>
            <label className="block text-primary-dark font-semibold mb-1">Password</label>
            <input
              type="password"
              className={`w-full px-4 py-2 bg-gray-200 border ${
                errors.password ? 'border-red-500' : 'border-accent-light'
              } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary`}
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                if (errors.password) {
                  setErrors(prev => ({ ...prev, password: '' }));
                }
              }}
            />
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
          </div>
          {errors.auth && <div className="text-red-600 text-sm text-center">{errors.auth}</div>}
          <button
            type="submit"
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Log In
          </button>
        </form>
        <div className="mt-6 text-center text-primary-dark text-sm">
          <span className="font-semibold">Demo Login:</span> jatin / 123
        </div>
      </div>
    </div>
  );
} 