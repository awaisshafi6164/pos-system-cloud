import React, { useState, useEffect } from "react";
import "./css/employee.css";
import Header from "./components/header";
import Sidebar from "./components/sidebar";
import { ToastContainer, toast } from "react-toastify";
import { useAuth } from "./context/AuthContext";
import { supabase } from "./supabaseClient";
import { createEmployee, deleteEmployee, listEmployees, updateEmployee } from "./api/employeesApi";

// Icons as inline SVG components
const PersonAddIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>
);

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const KeyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>
  </svg>
);

const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

function Employees() {
  const { employee, loading: authLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "",
  });
  const [busy, setBusy] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  // Fetch all employees
  const loadEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const data = await listEmployees();
      setEmployees(Array.isArray(data) ? data : []);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Add employee
  const handleAdd = async (e) => {
    e?.preventDefault?.();
    setBusy(true);
    try {
      const result = await createEmployee(form);
      toast.success(result.message || "Employee created. Invite email sent.");
      await loadEmployees();
      setForm({ name: "", email: "", role: "" });
    } catch (err) {
      toast.error(err?.message || "Failed to create employee");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!employee?.business_id) return;
    loadEmployees().catch((err) => toast.error(err?.message || "Failed to load employees"));
  }, [authLoading, employee?.business_id]);

  const handleEdit = (emp) => {
    setForm({
      name: emp.name,
      email: emp.email,
      role: emp.role,
    });
    setEditingId(emp.id);
    setIsEditing(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await updateEmployee({ id: editingId, name: form.name, role: form.role });
      toast.success("Employee Updated!");
      await loadEmployees();
      setForm({ name: "", email: "", role: "" });
      setIsEditing(false);
      setEditingId(null);
    } catch (err) {
      toast.error(err?.message || "Failed to update employee");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (employeeId) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      setBusy(true);
      try {
        const result = await deleteEmployee(employeeId);
        toast.success(result.message || "Employee deleted successfully!");
        setEmployees((prev) => prev.filter((e) => e.id !== employeeId));
      } catch (err) {
        toast.error(err?.message || "Failed to delete employee");
      } finally {
        setBusy(false);
      }
    }
  };

  const handleCancel = () => {
    setForm({ name: "", email: "", role: "" });
    setIsEditing(false);
    setEditingId(null);
  };

  const handleSendResetPassword = async (email) => {
    setBusy(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw new Error(error.message);
      toast.success("Password reset email sent.");
    } catch (err) {
      toast.error(err?.message || "Failed to send reset email");
    } finally {
      setBusy(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const name = String(emp?.name || "").toLowerCase();
    const email = String(emp?.email || "").toLowerCase();
    const role = String(emp?.role || "").toLowerCase();
    const term = String(searchTerm || "").toLowerCase();
    return name.includes(term) || email.includes(term) || role.includes(term);
  });

  // Get initials from name
  const getInitials = (name) => {
    if (!name) return "??";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Get role class for styling
  const getRoleClass = (role) => {
    const r = (role || "").toLowerCase();
    if (r === "admin" || r === "administrator") return "admin";
    if (r === "manager" || r === "software manager") return "manager";
    if (r === "cashier") return "cashier";
    if (r === "receptionist") return "receptionist";
    if (r === "waiter") return "waiter";
    return "default";
  };

  // Get display role name
  const getDisplayRole = (role) => {
    const r = (role || "").toLowerCase();
    if (r === "admin" || r === "administrator") return "Admin";
    if (r === "manager" || r === "software manager") return "Manager";
    if (r === "cashier") return "Cashier";
    if (r === "receptionist") return "Receptionist";
    if (r === "waiter") return "Waiter";
    return role || "Staff";
  };

  return (
    <>
      <Header />
      <div className="main-container">
        <Sidebar />
        <ToastContainer position="top-right" autoClose={3000} />

        <main className="staff-content">
          {/* Page Header */}
          <div className="staff-header">
            <h1>Staff Management</h1>
          </div>

          {/* Main Layout */}
          <div className="staff-layout">
            {/* Left Panel - Add Employee Form */}
            <div className="add-employee-card">
              <h2 className="card-title">
                <PersonAddIcon />
                {isEditing ? "Edit Employee" : "Add Employee"}
              </h2>

              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="email@larosh.pk"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={isEditing}
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="">Select Role</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="cashier">Cashier</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="waiter">Waiter</option>
                </select>
              </div>

              {isEditing ? (
                <div className="form-actions-row">
                  <button
                    className="btn-create"
                    onClick={handleUpdate}
                    disabled={busy}
                  >
                    {busy ? "Updating…" : "Update Employee"}
                  </button>
                  <button
                    className="btn-cancel"
                    onClick={handleCancel}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className="btn-create"
                  onClick={handleAdd}
                  disabled={busy}
                >
                  {busy ? "Creating…" : "Create Employee"}
                </button>
              )}

              {!isEditing && (
                <p className="form-note">
                  New emails get an invite to set a password. If the email already exists, it will be linked to this business.
                </p>
              )}
            </div>

            {/* Right Panel - Staff List */}
            <div className="staff-list-panel">
              {/* Search Row */}
              <div className="search-row">
                <div className="search-input-wrapper">
                  <SearchIcon />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search staff..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <span className="member-count">
                  {loadingEmployees ? "Loading…" : `${filteredEmployees.length} Members`}
                </span>
              </div>

              {/* Employee Cards Grid */}
              <div className="staff-grid">
                {loadingEmployees ? (
                  // Loading skeletons
                  [...Array(4)].map((_, i) => (
                    <div className="skeleton-card" key={i}>
                      <div className="skeleton-avatar" />
                      <div className="skeleton-info">
                        <div className="skeleton-line short" />
                        <div className="skeleton-line medium" />
                        <div className="skeleton-badge" />
                      </div>
                    </div>
                  ))
                ) : filteredEmployees.length === 0 ? (
                  <div className="empty-state">
                    <UsersIcon />
                    <p>No employees found</p>
                  </div>
                ) : (
                  filteredEmployees.map((emp) => (
                    <div className="employee-card" key={emp.id}>
                      <div className={`employee-avatar ${getRoleClass(emp.role)}`}>
                        {getInitials(emp.name)}
                      </div>
                      <div className="employee-info">
                        <h3 className="employee-name">{emp.name}</h3>
                        <p className="employee-email">{emp.email}</p>
                        <span className={`role-badge ${getRoleClass(emp.role)}`}>
                          {getDisplayRole(emp.role)}
                        </span>
                      </div>
                      <div className="employee-actions">
                        <button
                          className="action-btn edit"
                          onClick={() => handleEdit(emp)}
                          disabled={busy}
                          title="Edit"
                        >
                          <EditIcon />
                        </button>
                        <button
                          className="action-btn key"
                          onClick={() => handleSendResetPassword(emp.email)}
                          disabled={busy}
                          title="Send password reset"
                        >
                          <KeyIcon />
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => handleDelete(emp.id)}
                          disabled={busy}
                          title="Delete"
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

export default Employees;
