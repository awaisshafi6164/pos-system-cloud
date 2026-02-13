class EmployeeManager {
    static instance = null;
  
    constructor() {
      if (!EmployeeManager.instance) {
        this.employee = null;
        EmployeeManager.instance = this;
      }
      return EmployeeManager.instance;
    }
  
    // Set employee and persist to localStorage
    setEmployee(employee) {
      this.employee = employee;
      localStorage.setItem("loggedInEmployee", JSON.stringify(employee));
    }
  
    // Get employee from memory or localStorage
    getEmployee() {
      if (this.employee) return this.employee;
  
      const stored = localStorage.getItem("loggedInEmployee");
      if (stored && stored !== "undefined") {
        try {
          this.employee = JSON.parse(stored);
        } catch (err) {
          console.error("Failed to parse loggedInEmployee:", err);
          localStorage.removeItem("loggedInEmployee");
        }
      }
  
      return this.employee;
    }
  
    // Get specific field (e.g. name, email)
    getField(key) {
      const emp = this.getEmployee();
      return emp ? emp[key] : null;
    }
  
    // Clear employee session
    clearEmployee() {
      this.employee = null;
      localStorage.removeItem("loggedInEmployee");
    }
  
    // Check if logged in
    isLoggedIn() {
      return !!this.getEmployee();
    }
  }
  
  // Singleton instance
  const employeeManager = new EmployeeManager();
  export default employeeManager;
  