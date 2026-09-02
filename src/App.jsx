import React from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import SurveyDashboard from "./dashboard";
import Login from "./Login";
import Header from "./Header";
import "./App.css";

const AppContent = () => {
  const { isAuthenticated, isLoading, login } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontFamily: "'Times New Roman', Times, serif",
        }}
      >
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  return (
    <>
      <Header />
      <SurveyDashboard />
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
