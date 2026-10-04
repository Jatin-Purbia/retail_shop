import React, { useState } from 'react';
import { supabase } from '../lib/api';

export default function LandingPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!username.trim()) {
      newErrors.username = 'Email is required';
    }
    if (!password.trim()) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: username.trim(),
      password,
    });
    setSubmitting(false);
    if (error) {
      setErrors({ auth: 'Invalid email or password' });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-primary-light overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-primary mb-2 text-center">Retail Shop Portal</h1>
        <p className="text-accent text-center mb-6">Welcome! Please log in to continue.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-primary-dark font-semibold mb-1">Email</label>
            <input
              type="email"
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
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className={`w-full pl-4 pr-12 py-2 bg-gray-200 border ${
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
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-primary"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
          </div>
          {errors.auth && <div className="text-red-600 text-sm text-center">{errors.auth}</div>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            {submitting ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
} 