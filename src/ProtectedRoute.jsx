import React from "react";

const ProtectedRoute = ({ children, isAuthenticated, onLogin }) => {
  if (!isAuthenticated) {
    return onLogin();
  }

  return children;
};

export default ProtectedRoute;
