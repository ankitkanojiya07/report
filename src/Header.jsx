import React from "react";
import { useAuth } from "./AuthContext";
import "./Header.css";

const Header = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      logout();
    }
  };

  return (
    <header className="dashboard-header">
      <div className="header-content">
        <div className="header-left">
          <h1 className="header-title">Survey Reporting Dashboard</h1>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="welcome-text">
              Welcome, {user?.name || user?.email}
            </span>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
