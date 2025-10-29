import React, { useState } from "react";
import apiService from "../services/api";

export default function Login({ onLoginSuccess }) {
  const [accountName, setAccountName] = useState("");
  const [accountKey, setAccountKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Option 1: If your API has a login endpoint that returns a token
      await apiService.login(accountName, accountKey);
      
      // Option 2: If you just need to store credentials for subsequent requests
      // apiService.setCredentials(accountName, accountKey);
      
      onLoginSuccess?.();
    } catch (err) {
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nova-bg-gradient min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full nova-fade-in">
        {/* Nova Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)'
          }}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Nova POS</h1>
          <p className="text-gray-600">Inventory Management System</p>
        </div>

        <div className="nova-card p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Welcome Back</h2>
            <p className="text-sm text-gray-600">Sign in to access your inventory system</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="accountName" className="block text-sm font-semibold text-gray-700 mb-2">
                Account Name
              </label>
              <input
                id="accountName"
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Enter your account name"
                required
                className="nova-input"
              />
            </div>

            <div>
              <label htmlFor="accountKey" className="block text-sm font-semibold text-gray-700 mb-2">
                Account Key
              </label>
              <input
                id="accountKey"
                type="password"
                value={accountKey}
                onChange={(e) => setAccountKey(e.target.value)}
                placeholder="Enter your account key"
                required
                className="nova-input"
              />
            </div>

            {error && (
              <div className="nova-alert nova-alert-error">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="nova-btn nova-btn-primary w-full py-3 text-base font-semibold"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="nova-spinner w-5 h-5"></div>
                  Authenticating...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign In
                </span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Secure connection to MSSQL database</span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          Your credentials are encrypted and stored securely in your browser session
        </p>
      </div>
    </div>
  );
}

