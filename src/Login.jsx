import React, { useState } from "react";
import "./Login.css";

const Login = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Dummy user credentials
  const validUsers = [
    {
      email: "ankit.kanojiya@acutusai.com",
      password: "Ankit@2024",
      name: "Admin User",
    },
    {
      email: "arindam.bhattacharya@acutusai.com",
      password: "Acutus@2024",
      name: "Regular User",
    },
    {
      email: "tech@acutusai.com",
      password: "Tech@2024",
      name: "Regular User",
    },
    {
      email: "user@acutusai.com",
      password: "AcutusAi@2024",
      name: "Regular User",
    },
    {
      email: "ankesh.saxena@acutusai.com",
      password: "AcutusAi@2024",
      name: "Regular User",
    },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Simulate API call delay
    setTimeout(() => {
      const user = validUsers.find(
        (u) =>
          u.email === credentials.email && u.password === credentials.password
      );

      if (user) {
        // Store user data in localStorage
        localStorage.setItem(
          "user",
          JSON.stringify({
            email: user.email,
            name: user.name,
            isAuthenticated: true,
          })
        );
        onLogin(user);
      } else {
        setError("Invalid email or password");
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Reporting Dashboard</h1>
          {/* <p>Please sign in to continue</p> */}
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={credentials.email}
              onChange={handleInputChange}
              required
              placeholder="Enter your email"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleInputChange}
              required
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* <div className="demo-credentials">
          <h3>Demo Credentials:</h3>
          <div className="credential-item">
            <strong>Admin:</strong> admin@acutusai.com / admin123
          </div>
          <div className="credential-item">
            <strong>User:</strong> user@acutusai.com / user123
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default Login;
