// src/components/Sidebar.js
import React from "react";
import { Link, useLocation } from "react-router-dom";
import DashboardIcon from '@mui/icons-material/Dashboard';
import ReceiptIcon from '@mui/icons-material/Receipt';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';

const Sidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { path: "/pos", label: "POS System", icon: <DashboardIcon /> },
    { path: "/invoice", label: "Invoice", icon: <ReceiptIcon /> },
    { path: "/menu-items", label: "Menu Items", icon: <RestaurantMenuIcon /> },
    { path: "/employees", label: "Employees", icon: <PeopleIcon /> },
    { path: "/settings", label: "Settings", icon: <SettingsIcon /> },
    // { path: "/vendors", label: "Vendors", icon: <PeopleIcon /> },
  ];

  return (
    <aside className="sidebar" id="sidebar">
      <nav className="sidebar-nav">
        <ul>
          {navItems.map((item) => (
            <li key={item.path} className={currentPath === item.path ? "active" : ""}>
              <Link to={item.path} title={item.label}>
                {item.icon}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
