class EmployeeManager {
    static instance = null;
  
    constructor() {
      if (!EmployeeManager.instance) {
        this.employee = null;
        EmployeeManager.instance = this;
      }
      return EmployeeManager.instance;
    }
  
    // Set employee and persist to sessionStorage
    // ✅ sessionStorage clears on tab/browser close — reduces window for stale/tampered data
    setEmployee(employee) {
      this.employee = employee;
      sessionStorage.setItem("loggedInEmployee", JSON.stringify(employee));
      // Also keep a lightweight copy in localStorage for page refresh survival,
      // but strip the role so it can't be used for privilege decisions directly
      if (employee) {
        localStorage.setItem("pos_session_hint", JSON.stringify({
          business_id: employee.business_id,
          name: employee.name,
          email: employee.email,
          // ⚠️ role intentionally excluded — always re-confirmed from DB on load
        }));
      } else {
        localStorage.removeItem("pos_session_hint");
      }
    }
  
    // Get employee — sessionStorage first (in-session, trusted after DB confirm),
    // then fall back to sessionStorage parse only (not localStorage role)
    getEmployee() {
      if (this.employee) return this.employee;
  
      const stored = sessionStorage.getItem("loggedInEmployee");
      if (stored && stored !== "undefined") {
        try {
          this.employee = JSON.parse(stored);
        } catch (err) {
          console.error("Failed to parse loggedInEmployee:", err);
          sessionStorage.removeItem("loggedInEmployee");
        }
      }
  
      return this.employee;
    }
  
    // Get specific field (e.g. name, email, business_id)
    getField(key) {
      const emp = this.getEmployee();
      return emp ? emp[key] : null;
    }
  
    // Clear employee session completely
    clearEmployee() {
      this.employee = null;
      sessionStorage.removeItem("loggedInEmployee");
      localStorage.removeItem("pos_session_hint");
    }
  
    // Check if logged in
    isLoggedIn() {
      return !!this.getEmployee();
    }
  }
  
  // Singleton instance
  const employeeManager = new EmployeeManager();
  export default employeeManager;
  