import React, { useEffect, useState } from "react";
import Header from "./components/header";
import Sidebar from "./components/sidebar";
// import "./css/common.css";
import "./css/settings.css";
import settingsManager from "./utils/SettingsManager"; // ✅ import SettingsManager
import { ToastContainer, toast } from "react-toastify";
import { useAuth } from "./context/AuthContext";
import { upsertBusinessSettings } from "./api/settingsApi";

const Settings = () => {
  const { employee, loading: authLoading } = useAuth();
  const [form, setForm] = useState({
    restaurant_name: "",
    restaurant_address: "",
    logo_path: "",
    phone_no: "",
    ntn_number: "",
    gst_percentage: "",
    gst_included: "0", // or "1"
    service_charges: "",
    service_charge_type: "rs",
    pos_charges: "",
    show_invoice_no: "1",
    show_cnic: "1",
    show_emerg_contact: "1",
    show_buyerPNTN: "1",
    show_date: "1",
    show_address: "1",
    show_customer_name: "1",
    show_menu_stock_qty: "1",
    show_menu_modified_date: "1",
    show_paid: "1",
    show_balance: "1",
    make_invoice_editable: "1",
    room_food_both: "1",
    lock_booked_room: "0",
    search_using_name: "0",
    service_charges_type: "0",
    show_vendor_screen: "1",
    pra_linked: "0",
    pra_posid: "",
    pra_token: "",
    pra_api_type: "sandbox",
    pos_layout: "0",
  });

  // ✅ Fetch settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!employee?.business_id) return;
      const settings = await settingsManager.fetchSettings(employee.business_id);
      if (settings) {
        // Set service_charge_type based on service_charges_type
        if (settings.service_charges_type) {
          settings.service_charge_type = settings.service_charges_type === "1" ? "percent" : "rs";
        }
        setForm((prev) => ({ ...prev, ...settings }));
        settingsManager.setSettings(settings); // ✅ update cache
      }
    };

    if (authLoading) return;
    loadSettings();
  }, [authLoading, employee?.business_id]);

  // ✅ Save settings
  const handleSave = async () => {
    let updatedForm = { ...form };
    
    if (!employee?.business_id) {
      toast.error("Missing business id. Please log in again.");
      return;
    }

    try {
      await upsertBusinessSettings(employee.business_id, updatedForm);
      toast.success("Settings updated successfully!");
      settingsManager.setSettings(updatedForm);
    } catch (err) {
      toast.error("Error: " + (err?.message || "Failed to save settings"));
    }
  };

  // ✅ Handle file upload (optional logo logic)
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, logo_path: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <Header />
      <div className="main-container">
        <Sidebar />
        <ToastContainer position="top-right" autoClose={3000} />

        <main className="settings-content">
          {/* Page Header */}
          <div className="settings-header">
            <div className="header-left">
              <h1>POS Configuration & Settings</h1>
              <p>Manage business profile, tax rules, invoice layout, PRA integration, and POS behavior.</p>
            </div>
            <div className="header-actions">
              <button className="btn-ghost" onClick={() => window.location.reload()}>Discard Changes</button>
              <button className="btn-primary" onClick={handleSave}>Save Settings</button>
            </div>
          </div>

          {/* Card 1: Business Profile */}
          <div className="settings-card">
            <div className="card-header">
              <h2>Business Profile</h2>
              <p>This information appears on invoices and reports.</p>
            </div>
            <div className="card-content">
              <div className="form-grid">
                <div className="form-column">
                  <div className="form-group">
                    <label>Business Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Al-Madina Restaurant"
                      value={form.restaurant_name}
                      onChange={(e) => setForm({ ...form, restaurant_name: e.target.value })}
                    />
                    <span className="helper-text">Shown on receipts and reports.</span>
                  </div>
                  <div className="form-group">
                    <label>NTN Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 1234567-8"
                      value={form.ntn_number}
                      onChange={(e) => setForm({ ...form, ntn_number: e.target.value })}
                    />
                    <span className="helper-text">National Tax Number.</span>
                  </div>
                  <div className="form-group">
                    <label>Business Address</label>
                    <textarea
                      rows="3"
                      placeholder="Street address, city, province"
                      value={form.restaurant_address}
                      onChange={(e) => setForm({ ...form, restaurant_address: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-column">
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +92 300 1234567"
                      value={form.phone_no}
                      onChange={(e) => setForm({ ...form, phone_no: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>STRN Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 3277876543211"
                      value={form.strn_number}
                      onChange={(e) => setForm({ ...form, strn_number: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Logo Upload</label>
                    <div className="logo-upload">
                      <div className="logo-preview">
                        {form.logo_path ? <img src={form.logo_path} alt="Logo" /> : <span>Logo</span>}
                      </div>
                      <div className="upload-controls">
                        <button className="btn-secondary" onClick={() => document.getElementById('logo-input').click()}>
                          Upload Logo
                        </button>
                        <input
                          id="logo-input"
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleLogoChange}
                        />
                        <span className="helper-text">PNG or JPG, max 2 MB. Minimum 256 × 256 px.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Tax & Service Charges */}
          <div className="settings-card">
            <div className="card-header">
              <h2>Tax & Service Charges</h2>
              <p>Control GST behavior, service charges, and rounding on bills.</p>
            </div>
            <div className="card-content">
              <div className="form-grid">
                <div className="form-column">
                  <div className="form-group">
                    <label>GST Calculation</label>
                    <div className="radio-group">
                      {/* <label className="radio-option">
                        <input
                          type="radio"
                          name="gst-calculation"
                          value="no_gst"
                          checked={form.gst_included === "2" || !form.gst_included}
                          onChange={(e) => setForm({ ...form, gst_included: "2" })}
                        />
                        <span>No GST</span>
                      </label> */}
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="gst-calculation"
                          value="included"
                          checked={form.gst_included === "1"}
                          onChange={(e) => setForm({ ...form, gst_included: "1" })}
                        />
                        <span>Included in prices</span>
                      </label>
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="gst-calculation"
                          value="add_on_top"
                          checked={form.gst_included === "0"}
                          onChange={(e) => setForm({ ...form, gst_included: "0" })}
                        />
                        <span>Add on top of prices</span>
                      </label>
                    </div>
                    {/* <span className="helper-text">Choose how GST is applied to item prices.</span> */}
                  </div>
                  <div className="form-group">
                    <label>GST Rate</label>
                    <div className="input-with-suffix">
                      <input
                        type="number"
                        placeholder="e.g. 18"
                        value={form.gst_percentage}
                        onChange={(e) => setForm({ ...form, gst_percentage: e.target.value })}
                        disabled={form.gst_included === "2"}
                      />
                      <span className="suffix">%</span>
                    </div>
                  </div>
                </div>
                <div className="form-column">
                  
                  <div className="form-group">
                    <label>Service Charges</label>
                    <div className="input-with-prefix" style={{ display: 'flex', alignItems: 'center' }}>
                      <select
                        value={form.service_charge_type || "rs"}
                        onChange={(e) => {
                          const type = e.target.value;
                          setForm({ 
                            ...form, 
                            service_charge_type: type,
                            service_charges_type: type === "rs" ? "0" : "1"
                          });
                        }}
                        style={{ width: '70px', marginRight: '8px', fontSize: '16px', fontWeight: 'bold' }}
                      >
                        <option value="rs">Rs</option>
                        <option value="percent">%</option>
                      </select>
                      <input
                        type="number"
                        placeholder="0"
                        value={form.service_charges}
                        onChange={(e) => setForm({ ...form, service_charges: e.target.value })}
                        step="1"
                        style={{ paddingLeft: '12px' }}
                      />
                    </div>
                    <span className="helper-text">Optional service fee applied to eligible orders.</span>
                  </div>
                  <div className="form-group">
                    <label>POS Fee per Order</label>
                    <div className="input-with-prefix">
                      <span className="prefix">Rs</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={form.pos_charges}
                        onChange={(e) => setForm({ ...form, pos_charges: e.target.value })}
                      />
                    </div>
                    <span className="helper-text">Optional fixed fee added to each invoice.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: PRA Integration */}
          <div className="settings-card">
            <div className="card-header">
              <h2>PRA Integration</h2>
              <p>Connect your POS with Punjab Revenue Authority for e-invoicing.</p>
            </div>
            <div className="card-content">
              {/* Toggle Switch */}
              <div className="toggle-section">
                <div className="toggle-header">
                  <div>
                    <h3>Link with PRA</h3>
                    <p>Invoices will be synced with PRA according to your configuration.</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={form.pra_linked === "1"}
                      onChange={(e) => setForm({ ...form, pra_linked: e.target.checked ? "1" : "0" })}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
              
              {/* Form Grid */}
              <div className="form-grid">
                <div className="form-column">
                  <div className="form-group">
                    <label>PRA POS ID</label>
                    <input
                      type="text"
                      placeholder="814529"
                      value={form.pra_posid}
                      onChange={(e) => setForm({ ...form, pra_posid: e.target.value })}
                      disabled={form.pra_linked === "0"}
                    />
                    <span className="helper-text">Provided by PRA.</span>
                  </div>
                  <div className="form-group">
                    <label>Token / API Key</label>
                    <input
                      type="password"
                      placeholder="••••••••••••••••••••••••••••••"
                      value={form.pra_token}
                      onChange={(e) => setForm({ ...form, pra_token: e.target.value })}
                      disabled={form.pra_linked === "0"}
                    />
                    <span className="helper-text">Keep this key secure.</span>
                  </div>
                </div>
                <div className="form-column">
                  <div className="form-group">
                    <label>PRA API Environment</label>
                    <select
                      value={form.pra_api_type}
                      onChange={(e) => setForm({ ...form, pra_api_type: e.target.value })}
                      disabled={form.pra_linked === "0"}
                    >
                      <option value="sandbox">Sandbox (Test)</option>
                      <option value="production">Production</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: POS Layout & Invoice Display */}
          <div className="settings-card">
            <div className="card-header">
              <h2>POS Layout & Invoice Display</h2>
              <p>Configure POS interface layout and invoice field visibility.</p>
            </div>
            <div className="card-content">
              <div className="form-grid">
                <div className="form-column">
                  <div className="form-group">
                    <label>POS Layout Type</label>
                    <div className="radio-group">
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="pos-layout"
                          value="0"
                          checked={form.pos_layout === "0" || !form.pos_layout}
                          onChange={(e) => setForm({ ...form, pos_layout: e.target.value })}
                        />
                        <span>Restaurant</span>
                      </label>
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="pos-layout"
                          value="1"
                          checked={form.pos_layout === "1"}
                          onChange={(e) => setForm({ ...form, pos_layout: e.target.value })}
                        />
                        <span>Hotel</span>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="form-column">
                  <div className="form-group">
                    <label>Invoice Display Options</label>
                    <div className="checkbox-grid">
                      <label className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={form.show_date === "1"}
                          onChange={(e) => setForm({ ...form, show_date: e.target.checked ? "1" : "0" })}
                        />
                        <span>Show Date</span>
                      </label>
                      <label className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={form.show_address === "1"}
                          onChange={(e) => setForm({ ...form, show_address: e.target.checked ? "1" : "0" })}
                        />
                        <span>Show Address</span>
                      </label>
                      <label className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={form.show_customer_name === "1"}
                          onChange={(e) => setForm({ ...form, show_customer_name: e.target.checked ? "1" : "0" })}
                        />
                        <span>Show Customer Name</span>
                      </label>
                      <label className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={form.show_menu_stock_qty === "1"}
                          onChange={(e) => setForm({ ...form, show_menu_stock_qty: e.target.checked ? "1" : "0" })}
                        />
                        <span>Show Stock Quantity</span>
                      </label>
                      <label className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={form.show_invoice_no === "1"}
                          onChange={(e) => setForm({ ...form, show_invoice_no: e.target.checked ? "1" : "0" })}
                        />
                        <span>Show Invoice No</span>
                      </label>
                      <label className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={form.show_cnic === "1"}
                          onChange={(e) => setForm({ ...form, show_cnic: e.target.checked ? "1" : "0" })}
                        />
                        <span>Show CNIC</span>
                      </label>
                      <label className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={form.show_emerg_contact === "1"}
                          onChange={(e) => setForm({ ...form, show_emerg_contact: e.target.checked ? "1" : "0" })}
                        />
                        <span>Show Emergency Contact</span>
                      </label>
                      <label className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={form.show_buyerPNTN === "1"}
                          onChange={(e) => setForm({ ...form, show_buyerPNTN: e.target.checked ? "1" : "0" })}
                        />
                        <span>Show Buyer PNTN</span>
                      </label>
                      <label className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={form.show_menu_modified_date === "1"}
                          onChange={(e) => setForm({ ...form, show_menu_modified_date: e.target.checked ? "1" : "0" })}
                        />
                        <span>Show Menu Modified Date</span>
                      </label>
                      <label className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={form.show_paid === "1"}
                          onChange={(e) => setForm({ ...form, show_paid: e.target.checked ? "1" : "0" })}
                        />
                        <span>Show Paid Amount</span>
                      </label>

                      <label className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={form.show_vendor_screen === "1"}
                          onChange={(e) => setForm({ ...form, show_vendor_screen: e.target.checked ? "1" : "0" })}
                        />
                        <span>Show Vendor Screen</span>
                      </label>
                      <label className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={form.show_balance === "1"}
                          onChange={(e) => setForm({ ...form, show_balance: e.target.checked ? "1" : "0" })}
                        />
                        <span>Show Balance</span>
                      </label>
                      <label className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={form.make_invoice_editable === "1"}
                          onChange={(e) => setForm({ ...form, make_invoice_editable: e.target.checked ? "1" : "0" })}
                        />
                        <span>Invoice Field Editable</span>
                      </label>
                      <label className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={form.room_food_both === "1"}
                          onChange={(e) => setForm({ ...form, room_food_both: e.target.checked ? "1" : "0" })}
                        />
                        <span>Room + Food</span>
                      </label>
                      <label className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={form.lock_booked_room === "1"}
                          onChange={(e) => setForm({ ...form, lock_booked_room: e.target.checked ? "1" : "0" })}
                        />
                        <span>Look Booked Room</span>
                      </label>
                      <label className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={form.search_using_name === "1"}
                          onChange={(e) => setForm({ ...form, search_using_name: e.target.checked ? "1" : "0" })}
                        />
                        <span>Search Using Name</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default Settings;
