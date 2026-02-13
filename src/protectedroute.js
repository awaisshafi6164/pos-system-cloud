import React from "react";
import { Navigate } from "react-router-dom";
import employeeManager from "./utils/EmployeeManager";

const rolePermissions = {
  "/employees": ["admin"],     // receptionist NOT allowed
  "/settings": ["admin"],      // receptionist NOT allowed
  "/invoice": ["admin", "manager", "receptionist"],
  "/pos": ["admin", "manager", "receptionist"],
  "/menu-items": ["admin", "manager"],    // receptionist NOT allowed
  "/receipt": ["admin", "manager", "receptionist"],
  "/vendors": ["admin", "manager"]
};

const ProtectedRoute = ({ path, element }) => {
  const user = employeeManager.getEmployee();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const allowedRoles = rolePermissions[path] || [];
  if (!allowedRoles.includes(user.role)) {
    return <div style={{ padding: "2rem", color: "red" }}>❌ Access Denied</div>;
  }

  return element;
};

export default ProtectedRoute;
