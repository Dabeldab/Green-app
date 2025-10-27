import React, { useState, useEffect } from "react";
import Login from "./Login";
import Home from "./Home";
import apiService from "../services/api";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if user already has credentials stored
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const credentials = apiService.getCredentials();
      if (credentials.accountName && credentials.accountKey) {
        // Optionally verify with backend
        // await apiService.verifyAuth();
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      apiService.clearCredentials();
    } finally {
      setIsChecking(false);
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    apiService.clearCredentials();
    setIsAuthenticated(false);
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-black"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {!isAuthenticated ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Home onLogout={handleLogout} />
      )}
    </>
  );
}

