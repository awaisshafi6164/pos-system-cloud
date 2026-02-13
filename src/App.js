import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";

import POS from "./pos";
import HotelPOS from "./hotelPos";
import Invoice from "./invoice";
import Employees from "./employee";
import Menu from "./menu";
import Settings from "./settings";
import Receipt from "./components/Receipt";
import Login from "./login";
import ProtectedRoute from "./protectedroute";
import { AuthProvider } from "./context/AuthContext";
import settingsManager from "./utils/SettingsManager";
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

  return layout === "1" ? <HotelPOS /> : <POS />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/pos" element={<ProtectedRoute path="/pos" element={<POSRoute />} />} />
          <Route path="/invoice" element={<ProtectedRoute path="/invoice" element={<Invoice />} />} />
          <Route path="/employees" element={<ProtectedRoute path="/employees" element={<Employees />} />} />
          <Route path="/menu-items" element={<ProtectedRoute path="/menu-items" element={<Menu />} />} />
          <Route path="/settings" element={<ProtectedRoute path="/settings" element={<Settings />} />} />
          <Route path="/receipt" element={<ProtectedRoute path="/receipt" element={<Receipt />} />} />
          {/* <Route path="/vendors" element={<ProtectedRoute path="/vendors" element={<Vendors />} />} /> */}
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
