import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { checkLicense } from "./api/posApi";
import { loginEmployee } from "./auth";
import { useAuth } from "./context/AuthContext";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const navigate = useNavigate();
  const { setEmployee } = useAuth();

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage(null);

    const { email, password } = formData;

    if (email.trim() === "" || password.trim() === "") {
      setMessage({ type: "error", text: "Please enter both email and password." });
      return;
    }

    setLoading(true);

    try {
      // 🔐 License Validation
      // Note: current implementation calls a localhost endpoint; keep it non-blocking for deployments.
      const licenseCheck = await checkLicense();
      if (!licenseCheck?.valid) {
        console.warn("License invalid/unreachable:", licenseCheck?.error);
      }

      // 👤 Employee Login
      const result = await loginEmployee(email, password);

      if (result.success) {
        setEmployee(result.user);
        navigate("/pos");
      } else {
        setMessage({ type: "error", text: result.error || "Login failed." });
      }
    } catch (err) {
      console.error("Login error:", err);
      setMessage({ type: "error", text: "Something went wrong. Please try again." });
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
          {message?.text ? (
            <div
              style={{
                marginBottom: "1rem",
                padding: "0.75rem",
                borderRadius: "8px",
                background: message.type === "error" ? "#ffe8e8" : "#e8fff0",
                color: message.type === "error" ? "#b00020" : "#0f6f3d",
              }}
            >
              {message.text}
            </div>
          ) : null}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
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
