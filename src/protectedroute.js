import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

const rolePermissions = {
  "/employees": ["admin"],     // receptionist NOT allowed
  "/settings": ["admin"],      // receptionist NOT allowed
  "/invoice": ["admin", "manager", "receptionist"],
  "/pos": ["admin", "manager", "receptionist"],
  "/menu-items": ["admin", "manager"],    // receptionist NOT allowed
  "/receipt": ["admin", "manager", "receptionist"],
};

const ProtectedRoute = ({ path, element }) => {
  const { employee, loading } = useAuth();

  if (loading) return null;

  if (!employee) {
    return <Navigate to="/" replace />;
  }

  const allowedRoles = rolePermissions[path] || [];
  if (!allowedRoles.includes(employee.role)) {
    return <div style={{ padding: "2rem", color: "red" }}>❌ Access Denied</div>;
  }

  return element;
};

export default ProtectedRoute;
