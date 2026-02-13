// src/utils/SettingsManager.js
// import { getSettings } from "../api/posApi";
import employeeManager from "./EmployeeManager";
import { getBusinessSettings } from "../api/settingsApi";

class SettingsManager {
    static instance = null;
  
    constructor() {
      if (!SettingsManager.instance) {
        this.settings = null;
        this.businessId = null;
        SettingsManager.instance = this;
      }
      return SettingsManager.instance;
    }
  
    async fetchSettings(businessId) {
      const resolvedBusinessId = businessId || employeeManager.getField("business_id");
      if (!resolvedBusinessId) return null;

      if (this.settings && this.businessId === resolvedBusinessId) return this.settings;

      try {
        const settings = await getBusinessSettings(resolvedBusinessId);
        this.settings = settings || {};
        this.businessId = resolvedBusinessId;
        return this.settings;
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
  
