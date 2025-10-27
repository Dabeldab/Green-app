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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Database Authentication</h1>
            <p className="text-gray-600 mt-2">Enter your account credentials to access the inventory system</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="accountName" className="block text-sm font-medium text-gray-700 mb-1">
                Account Name
              </label>
              <input
                id="accountName"
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Enter account name"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label htmlFor="accountKey" className="block text-sm font-medium text-gray-700 mb-1">
                Account Key
              </label>
              <input
                id="accountKey"
                type="password"
                value={accountKey}
                onChange={(e) => setAccountKey(e.target.value)}
                placeholder="Enter account key"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-2 px-4 rounded-xl font-medium hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Authenticating..." : "Login"}
            </button>
          </form>

          <div className="mt-6 text-xs text-gray-500 text-center">
            <p>Your credentials are used to authenticate with the MSSQL database.</p>
            <p className="mt-1">They are securely stored in your browser session.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

