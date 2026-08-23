import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import RefreshIcon from '@mui/icons-material/Refresh';
import settingsManager from "../utils/SettingsManager";
import "./header.css";
import employeeManager from "../utils/EmployeeManager";
import { supabase } from "../supabaseClient";

const BUSINESS_CODE_KEY = "pos_business_code";

const Header = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(employeeManager.getEmployee());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [businessCode, setBusinessCode] = useState(
    () => localStorage.getItem(BUSINESS_CODE_KEY) || ""
  );
  const [settings, setSettings] = useState({
    restaurant_name: "",
    logo_path: "",
    phone_no: "",
    ntn_number: "",
  });

  // Load settings + user on mount
  useEffect(() => {
    const loadSettings = async () => {
      const s = await settingsManager.fetchSettings();
      if (s) setSettings(s);
    };
    loadSettings();
    setUser(employeeManager.getEmployee());

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Load business code
  useEffect(() => {
    const loadBusinessCode = async () => {
      try {
        const businessId = user?.business_id;
        if (!businessId) { setBusinessCode(""); return; }

        const cached = localStorage.getItem(BUSINESS_CODE_KEY);
        if (cached) { setBusinessCode(cached); return; }

        const { data, error } = await supabase
          .from("businesses")
          .select("code")
          .eq("id", businessId)
          .single();

        if (error) { setBusinessCode(""); return; }

        const code = data?.code || "";
        setBusinessCode(code);
        if (code) localStorage.setItem(BUSINESS_CODE_KEY, code);
      } catch {
        setBusinessCode("");
      }
    };
    loadBusinessCode();
  }, [user?.business_id]);

  const logoutFunction = () => {
    employeeManager.clearEmployee();
    localStorage.removeItem(BUSINESS_CODE_KEY);
    navigate("/");
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleHardRefresh = () => {
    window.location.reload(true);
  };

  return (
    <header className="app-header">
      {settings.logo_path && (
        <div className="restaurant-logo">
          <img src={settings.logo_path} alt="Logo" />
        </div>
      )}

      <div className="restaurant-info">
        <h1 id="restaurant-name">{settings.restaurant_name}</h1>
        <p>
          {businessCode ? `Code: ${businessCode} | ` : ""}
          📞 {settings.phone_no} | NTN: {settings.ntn_number}
        </p>
      </div>

      <div className="developer-info">
        <p><strong>Software By:</strong> KAAF Devs</p>
        <p><strong>Contact:</strong> 0339-4098238</p>
      </div>

      <div className="user-info">
        <span id="current-user">
          {user?.name || "Guest"} {user?.role ? `(${user.role})` : ""}
        </span>

        <RefreshIcon
          onClick={handleHardRefresh}
          title="Hard Refresh"
          className="header-icon"
        />

        {isFullscreen ? (
          <FullscreenExitIcon
            onClick={toggleFullscreen}
            title="Exit Fullscreen"
            className="header-icon"
          />
        ) : (
          <FullscreenIcon
            onClick={toggleFullscreen}
            title="Enter Fullscreen"
            className="header-icon"
          />
        )}

        <button
          id="logout-btn"
          className="btn btn-secondary"
          onClick={logoutFunction}
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
