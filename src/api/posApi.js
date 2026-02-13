const BASE_URL = "http://localhost/restaurant-pos/api";

export const getNextUSIN = async () => {
  try {
    const res = await fetch(`${BASE_URL}/customer/get_next_usin.php`);
    return await res.json();
  } catch (error) {
    console.error("❌ getNextUSIN error:", error);
    return { success: false };
  }
};

export const saveInvoiceToPOS = async (payload) => {
  try {
    const res = await fetch(`${BASE_URL}/customer/add_invoice.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (error) {
    console.error("❌ saveInvoiceToPOS error:", error);
    return { success: false, error: error.message };
  }
};

export const sendInvoiceToPRA = async (payload, praURL, praToken) => {
  try {
    const res = await fetch(praURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${praToken}`,
      },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (error) {
    console.error("❌ sendInvoiceToPRA error:", error);
    return { Code: "500", Response: error.message };
  }
};

export const getTotalSales = async (fromDate, toDate) => {
  try {
    const res = await fetch("http://localhost/restaurant-pos/api/customer/get_total_sales.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromDate, to: toDate }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ getTotalSales error:", error);
    return { success: false, error: error.message };
  }
};

export const getAllCustomers = async () => {
  try {
    const res = await fetch("http://localhost/restaurant-pos/api/customer/get_all_customers.php");

    if (!res.ok) {
      throw new Error(`Server responded with status ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ getAllCustomers error:", error);
    return { error: error.message };
  }
};

export const deleteInvoice = async (id) => {
  try {
    const res = await fetch(`${BASE_URL}/customer/delete_invoice.php`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    return await res.json();
  } catch (error) {
    console.error("❌ deleteInvoice error:", error);
    return { success: false, error: error.message };
  }
};

export const getBookedRooms = async (checkInDate, timeIn) => {
  try {
    const res = await fetch(`${BASE_URL}/customer/get_booked_rooms.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkInDate, timeIn }),
    });
    
    if (!res.ok) {
      return { success: true, bookedRooms: [] };
    }
    
    const text = await res.text();
    if (!text) {
      return { success: true, bookedRooms: [] };
    }
    
    try {
      return JSON.parse(text);
    } catch {
      return { success: true, bookedRooms: [] };
    }
  } catch (error) {
    console.error("❌ getBookedRooms error:", error);
    return { success: true, bookedRooms: [] };
  }
};

// ─── Menu Management ──────────────────────────────────────────────

export const getMenuItems = async () => {
  try {
    const res = await fetch(`${BASE_URL}/menu/get_all_menu.php`);
    return await res.json();
  } catch (error) {
    console.error("❌ getMenuItems error:", error);
    return [];
  }
};

export const getCategories = async () => {
  try {
    const res = await fetch(`${BASE_URL}/menu/get_categories.php`);
    return await res.json();
  } catch (error) {
    console.error("❌ getCategories error:", error);
    return [];
  }
};

export const addMenuItem = async (menuItem) => {
  try {
    const res = await fetch("http://localhost/restaurant-pos/api/menu/add_menu.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(menuItem),
    });
    return await res.json();
  } catch (error) {
    console.error("❌ addMenuItem error:", error);
    return { success: false, error: error.message };
  }
};

export const updateMenuItem = async (id, menuItem) => {
  try {
    const res = await fetch(`http://localhost/restaurant-pos/api/menu/edit_menu.php?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(menuItem),
    });
    return await res.json();
  } catch (error) {
    console.error("❌ updateMenuItem error:", error);
    return { success: false, error: error.message };
  }
};

export const deleteMenuItem = async (id) => {
  try {
    const res = await fetch(`http://localhost/restaurant-pos/api/menu/delete_menu.php?id=${id}`, {
      method: "DELETE",
    });
    return await res.json();
  } catch (error) {
    console.error("❌ deleteMenuItem error:", error);
    return { success: false, error: error.message };
  }
};

export const updateStockQuantities = async (items) => {
  try {
    const res = await fetch(`${BASE_URL}/menu/update_stock.php`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    return await res.json();
  } catch (error) {
    console.error("❌ updateStockQuantities error:", error);
    return { success: false, error: error.message };
  }
};

// ─── Employee Management ─────────────────────────────────────────────

export const getAllEmployees = async () => {
  try {
    const res = await fetch("http://localhost/restaurant-pos/api/employees/get_all.php");
    return await res.json();
  } catch (error) {
    console.error("❌ getAllEmployees error:", error);
    return [];
  }
};

export const addEmployee = async (employeeData) => {
  try {
    const res = await fetch("http://localhost/restaurant-pos/api/employees/add.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(employeeData),
    });
    return await res.json();
  } catch (error) {
    console.error("❌ addEmployee error:", error);
    return { success: false, error: error.message };
  }
};

export const updateEmployee = async (id, employeeData) => {
  try {
    const res = await fetch(`http://localhost/restaurant-pos/api/employees/edit_employee.php?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(employeeData),
    });
    return await res.json();
  } catch (error) {
    console.error("❌ updateEmployee error:", error);
    return { success: false, error: error.message };
  }
};

export const deleteEmployee = async (id) => {
  try {
    const res = await fetch(`http://localhost/restaurant-pos/api/employees/delete_employee.php?id=${id}`, {
      method: "DELETE",
    });
    return await res.json();
  } catch (error) {
    console.error("❌ deleteEmployee error:", error);
    return { success: false, error: error.message };
  }
};

// ─── Settings Management ─────────────────────────────────────────────

export const getSettings = async () => {
  try {
    const res = await fetch("http://localhost/restaurant-pos/api/settings/get_settings.php");
    const data = await res.json();
    if (data.success) {
      return data.settings;
    } else {
      throw new Error(data.error || "Unknown error");
    }
  } catch (error) {
    console.error("❌ getSettings error:", error);
    return null;
  }
};

export const updateSettings = async (settings) => {
  try {
    const res = await fetch("http://localhost/restaurant-pos/api/settings/update_settings.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    return await res.json();
  } catch (error) {
    console.error("❌ updateSettings error:", error);
    return { success: false, error: error.message };
  }
};

export const updateLogo = async (logoFile) => {
  try {
    const formData = new FormData();
    formData.append('logo', logoFile);
    
    const res = await fetch("http://localhost/restaurant-pos/api/settings/update_logo.php", {
      method: "POST",
      body: formData,
    });
    return await res.json();
  } catch (error) {
    console.error("❌ updateLogo error:", error);
    return { success: false, error: error.message };
  }
};

// ─── License Validation ──────────────────────────────────────────────

export const checkLicense = async () => {
  try {
    const res = await fetch("http://localhost/restaurant-pos/api/license/check.php");
    return await res.json();
  } catch (error) {
    console.error("❌ License check failed:", error);
    return { valid: false, error: error.message };
  }
};

// ─── Employee Login ──────────────────────────────────────────────────

export const loginEmployee = async (email, password) => {
  try {
    const res = await fetch("http://localhost/restaurant-pos/api/employees/login.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return await res.json();
  } catch (error) {
    console.error("❌ Login error:", error);
    return { success: false, error: error.message };
  }
};
