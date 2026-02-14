import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ Import navigate
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import settingsManager from "../utils/SettingsManager";
import "./header.css";
import employeeManager from "../utils/EmployeeManager";
import { supabase } from "../supabaseClient";

const Header = () => {
  const navigate = useNavigate(); // ✅ Declare navigate
  const [user, setUser] = useState(employeeManager.getEmployee());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [businessCode, setBusinessCode] = useState("");
  const [settings, setSettings] = useState({
    restaurant_name: "",
    logo_path: "",
    phone_no: "",
    ntn_number: ""
  });

  useEffect(() => {
    const loadSettings = async () => {
      const s = await settingsManager.fetchSettings();
      if (s) setSettings(s);
    };
    loadSettings();

    // Load user from localStorage if not already
    const emp = employeeManager.getEmployee();
    setUser(emp);

    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const loadBusinessCode = async () => {
      try {
        const businessId = user?.business_id;
        if (!businessId) {
          setBusinessCode("");
          return;
        }

        const { data, error } = await supabase
          .from("businesses")
          .select("code")
          .eq("id", businessId)
          .single();

        if (error) {
          setBusinessCode("");
          return;
        }

        setBusinessCode(data?.code || "");
      } catch {
        setBusinessCode("");
      }
    };

    loadBusinessCode();
  }, [user?.business_id]);

  // ✅ Moved out of useEffect so it's accessible to JSX
  const logoutFunction = () => {
    employeeManager.clearEmployee();
    navigate("/"); // Back to login
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
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
        {isFullscreen ? (
          <FullscreenExitIcon onClick={toggleFullscreen} title="Exit Fullscreen (F11)" style={{ cursor: 'pointer', marginRight: '10px', color: '#1976d2' }} />
        ) : (
          <FullscreenIcon onClick={toggleFullscreen} title="Enter Fullscreen (F11)" style={{ cursor: 'pointer', marginRight: '10px', color: '#1976d2' }} />
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
