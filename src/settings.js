import React, { useEffect, useState } from "react";
import Header from "./components/header";
import Sidebar from "./components/sidebar";
import "./css/settings.css";
import settingsManager from "./utils/SettingsManager";
import { ToastContainer, toast } from "react-toastify";
import { useAuth } from "./context/AuthContext";
import { upsertBusinessSettings } from "./api/settingsApi";
import { supabase } from "./supabaseClient";

const Settings = () => {
  const { employee, loading: authLoading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("business");
  const [form, setForm] = useState({
    restaurant_name: "",
    restaurant_address: "",
    logo_path: "",
    phone_no: "",
    ntn_number: "",
    gst_percentage: "",
    gst_included: "0",
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
    empty_checkout_default: "0",
  });

  // Fetch settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!employee?.business_id) return;
      const settings = await settingsManager.fetchSettings(employee.business_id);
      if (settings) {
        if (settings.service_charges_type) {
          settings.service_charge_type = settings.service_charges_type === "1" ? "percent" : "rs";
        }
        setForm((prev) => ({ ...prev, ...settings }));
        settingsManager.setSettings(settings);
      }
    };

    if (authLoading) return;
    loadSettings();
  }, [authLoading, employee?.business_id]);

  // Save settings
  const handleSave = async () => {
    let updatedForm = { ...form };
    
    if (!employee?.business_id) {
      toast.error("Missing business id. Please log in again.");
      return;
    }

    setSaving(true);
    setSaved(false);
    try {
      await upsertBusinessSettings(employee.business_id, updatedForm);
      toast.success("Settings updated successfully!");
      settingsManager.setSettings(updatedForm);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      toast.error("Error: " + (err?.message || "Failed to save settings"));
    } finally {
      setSaving(false);
    }
  };

  // Upload logo to Supabase Storage
  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Only PNG, JPG, WebP or GIF allowed.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 2 MB.");
      return;
    }

    try {
      const filePath = `${employee.business_id}/logo.${file.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("logos").getPublicUrl(filePath);
      const publicUrl = urlData?.publicUrl;

      if (!publicUrl) throw new Error("Failed to get public URL after upload.");

      setForm({ ...form, logo_path: publicUrl });
      toast.success("Logo uploaded successfully!");
    } catch (err) {
      toast.error("Logo upload failed: " + (err?.message || "Unknown error"));
    }
  };

  const tabs = [
    { id: "business", label: "Business Profile" },
    { id: "tax", label: "Tax & Charges" },
    { id: "pra", label: "PRA Integration" },
    { id: "layout", label: "Layout & Display" },
  ];

  return (
    <>
      <Header />
      <div className="main-container">
        <Sidebar />
        <ToastContainer position="top-right" autoClose={3000} />

        <main className="settings-content">
          {/* Page Header */}
          <div className="settings-header">
            <h1>Settings</h1>
          </div>

          {/* Tab Navigation */}
          <div className="settings-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab-btn${activeTab === tab.id ? " active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="settings-panel">
            {/* Business Profile Tab */}
            {activeTab === "business" && (
              <div className="tab-content">
                <div className="form-section">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Business Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Al-Madina Restaurant"
                        value={form.restaurant_name}
                        onChange={(e) => setForm({ ...form, restaurant_name: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Phone Number</label>
                      <input
                        type="text"
                        placeholder="e.g. +92 300 1234567"
                        value={form.phone_no}
                        onChange={(e) => setForm({ ...form, phone_no: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>NTN Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 1234567-8"
                        value={form.ntn_number}
                        onChange={(e) => setForm({ ...form, ntn_number: e.target.value })}
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
                  </div>

                  <div className="form-row">
                    <div className="form-group full-width">
                      <label>Business Address</label>
                      <textarea
                        rows="3"
                        placeholder="Street address, city, province"
                        value={form.restaurant_address}
                        onChange={(e) => setForm({ ...form, restaurant_address: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Logo</label>
                      <div className="logo-upload">
                        <div className="logo-preview">
                          {form.logo_path ? <img src={form.logo_path} alt="Logo" /> : <span>Logo</span>}
                        </div>
                        <div className="upload-controls">
                          <button className="btn-upload" onClick={() => document.getElementById('logo-input').click()}>
                            Upload Logo
                          </button>
                          <input
                            id="logo-input"
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleLogoChange}
                          />
                          <span className="helper-text">PNG or JPG, max 2 MB</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Tax & Charges Tab */}
            {activeTab === "tax" && (
              <div className="tab-content">
                <div className="form-section">
                  <div className="form-row">
                    <div className="form-group">
                      <label>GST Calculation</label>
                      <div className="radio-group">
                        <label className="radio-option">
                          <input
                            type="radio"
                            name="gst-calculation"
                            value="included"
                            checked={form.gst_included === "1"}
                            onChange={() => setForm({ ...form, gst_included: "1" })}
                          />
                          <span>Included in prices</span>
                        </label>
                        <label className="radio-option">
                          <input
                            type="radio"
                            name="gst-calculation"
                            value="add_on_top"
                            checked={form.gst_included === "0"}
                            onChange={() => setForm({ ...form, gst_included: "0" })}
                          />
                          <span>Add on top of prices</span>
                        </label>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>GST Rate (%)</label>
                      <input
                        type="number"
                        placeholder="e.g. 18"
                        value={form.gst_percentage}
                        onChange={(e) => setForm({ ...form, gst_percentage: e.target.value })}
                        disabled={form.gst_included === "2"}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Service Charges</label>
                      <div className="input-with-select">
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
                        >
                          <option value="rs">Rs</option>
                          <option value="percent">%</option>
                        </select>
                        <input
                          type="number"
                          placeholder="0"
                          value={form.service_charges}
                          onChange={(e) => setForm({ ...form, service_charges: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>POS Fee per Order (Rs)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={form.pos_charges}
                        onChange={(e) => setForm({ ...form, pos_charges: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* PRA Integration Tab */}
            {activeTab === "pra" && (
              <div className="tab-content">
                <div className="form-section">
                  <div className="toggle-row">
                    <div className="toggle-info">
                      <h3>Link with PRA</h3>
                      <p>Invoices will be synced with Punjab Revenue Authority.</p>
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

                  <div className="form-row">
                    <div className="form-group">
                      <label>PRA POS ID</label>
                      <input
                        type="text"
                        placeholder="814529"
                        value={form.pra_posid}
                        onChange={(e) => setForm({ ...form, pra_posid: e.target.value })}
                        disabled={form.pra_linked === "0"}
                      />
                    </div>
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

                  <div className="form-row">
                    <div className="form-group full-width">
                      <label>Token / API Key</label>
                      <input
                        type="password"
                        placeholder="••••••••••••••••••••••••••••••"
                        value={form.pra_token}
                        onChange={(e) => setForm({ ...form, pra_token: e.target.value })}
                        disabled={form.pra_linked === "0"}
                      />
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Layout & Display Tab */}
            {activeTab === "layout" && (
              <div className="tab-content">
                <div className="form-section">
                  <div className="form-row">
                    <div className="form-group">
                      <label>POS Layout Type</label>
                      <div className="radio-group horizontal">
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

                  <div className="form-row">
                    <div className="form-group full-width">
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
                          <span>Lock Booked Room</span>
                        </label>
                        <label className="checkbox-option">
                          <input
                            type="checkbox"
                            checked={form.search_using_name === "1"}
                            onChange={(e) => setForm({ ...form, search_using_name: e.target.checked ? "1" : "0" })}
                          />
                          <span>Search Using Name</span>
                        </label>
                        <label className="checkbox-option">
                          <input
                            type="checkbox"
                            checked={form.empty_checkout_default === "1"}
                            onChange={(e) => setForm({ ...form, empty_checkout_default: e.target.checked ? "1" : "0" })}
                          />
                          <span>Empty Checkout by Default</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Save Button - Below Tab Card */}
          <div className="settings-actions">
            <button
              className={`btn-save${saved ? " btn-saved" : ""}`}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Changes"}
            </button>
          </div>
        </main>
      </div>
    </>
  );
};

export default Settings;
