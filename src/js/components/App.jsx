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
      <div className="nova-bg-gradient min-h-screen flex items-center justify-center">
        <div className="text-center nova-fade-in">
          <div className="nova-spinner w-12 h-12 inline-block mb-4"></div>
          <p className="text-gray-600 font-medium">Loading Nova POS...</p>
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

