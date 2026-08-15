import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";

import POS from "./pos";
import Invoice from "./invoice";
import Employees from "./employee";
import Menu from "./menu";
import Settings from "./settings";
import Receipt from "./components/Receipt";
import Login from "./login";
import ResetPassword from "./resetPassword";
import ProtectedRoute from "./protectedroute";
import { AuthProvider } from "./context/AuthContext";
import settingsManager from "./utils/SettingsManager";

// ✅ #9 — Error Boundary: catches render errors so the app never goes fully blank
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", height: "100vh", padding: "40px",
          fontFamily: "sans-serif", textAlign: "center", background: "#f8f9fa"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <h2 style={{ marginBottom: "8px", color: "#333" }}>Something went wrong</h2>
          <p style={{ color: "#666", marginBottom: "24px", maxWidth: "400px" }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 24px", backgroundColor: "#1976d2", color: "white",
              border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px"
            }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
// import Vendors from "./vendors";

const POSRoute = () => {
  const [layout, setLayout] = useState("0");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLayout = async () => {
      const settings = await settingsManager.fetchSettings();
      if (settings && settings.pos_layout) {
        setLayout(settings.pos_layout);
      }
      setLoading(false);
    };
    loadLayout();
  }, []);

  if (loading) return null;

  return <POS isHotelLayout={layout === "1"} />;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pos" element={<ProtectedRoute path="/pos" element={<POSRoute />} />} />
            <Route path="/invoice" element={<ProtectedRoute path="/invoice" element={<Invoice />} />} />
            <Route path="/employees" element={<ProtectedRoute path="/employees" element={<Employees />} />} />
            <Route path="/menu-items" element={<ProtectedRoute path="/menu-items" element={<Menu />} />} />
            <Route path="/settings" element={<ProtectedRoute path="/settings" element={<Settings />} />} />
            <Route path="/receipt" element={<ProtectedRoute path="/receipt" element={<Receipt />} />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
