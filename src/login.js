// src/Login.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import employeeManager from "./utils/EmployeeManager";
import { checkLicense, loginEmployee } from "./api/posApi";

const Login = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { username, password } = formData;

    if (username.trim() === "" || password.trim() === "") {
      alert("Please enter both username and password.");
      return;
    }

    setLoading(true);

    try {

      // 🔐 License Validation
      const licenseCheck = await checkLicense();

      if (!licenseCheck.valid) {
        alert("❌ License Invalid:\n" + (licenseCheck.error || "Subscription expired or unauthorized machine."));
        console.error("❌ License Invalid:\n" + (licenseCheck.error || "Subscription expired or unauthorized machine."));
        return;
      } else {
        console.error("✅ License is valid.\n");
      }

      
      // 👤 Employee Login
      const result = await loginEmployee(username, password);

      if (result.success) {
        employeeManager.setEmployee(result.user);
        navigate("/pos");
      } else {
        alert("❌ " + result.error);
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-box">
        <div className="login-header">
          <h1>🍽️ POS Login</h1>
          <p>Sign in to access your POS System</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              name="username"
              id="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              name="password"
              id="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="login-footer">
          <p>&copy; {new Date().getFullYear()} KAAF Devs. All rights reserved.</p>
          <p>+92-339-4098238 | <a href="mailto:awaisshafi.pk@gmail.com">awaisshafi.pk@gmail.com</a></p>
        </div>
        
      </div>

    </div>
  );
};

export default Login;
