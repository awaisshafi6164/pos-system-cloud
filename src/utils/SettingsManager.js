// src/utils/SettingsManager.js
// import { getSettings } from "../api/posApi";

class SettingsManager {
    static instance = null;
  
    constructor() {
      if (!SettingsManager.instance) {
        this.settings = null;
        SettingsManager.instance = this;
      }
      return SettingsManager.instance;
    }
  
    async fetchSettings() {
      if (this.settings) return this.settings;
  
      try {
        const res = await fetch("http://localhost/restaurant-pos/api/settings/get_settings.php");
        const data = await res.json();
        if (data.success) {
          // Prepend full URL to logo_path if it exists
          if (data.settings.logo_path) {
            data.settings.logo_path = `http://localhost/restaurant-pos/api/${data.settings.logo_path}`;
          }
          this.settings = data.settings;
          return this.settings;
        } else {
          throw new Error(data.error || "Failed to fetch settings.");
        }
      } catch (err) {
        console.error("Settings fetch error:", err);
        return null;
      }
    }
  
    getSetting(key) {
      return this.settings ? this.settings[key] : null;
    }
  
    getAll() {
      return this.settings;
    }
  
    setSettings(newSettings) {
      this.settings = newSettings;
    }
  }
  
  const settingsManager = new SettingsManager();
  export default settingsManager;
  