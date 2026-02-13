import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!password || password.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }
    if (password !== confirm) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        setMessage({
          type: "error",
          text: "Reset session not found. Please open the reset link from your email again.",
        });
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);

      setMessage({ type: "success", text: "Password updated. You can now log in." });
      setTimeout(() => navigate("/"), 800);
    } catch (err) {
      setMessage({ type: "error", text: err?.message || "Failed to update password." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-box">
        <div className="login-header">
          <h1>Reset Password</h1>
          <p>Enter a new password for your account</p>
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
            <label htmlFor="password">New Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirm">Confirm Password</label>
            <input
              type="password"
              id="confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              required
            />
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;

