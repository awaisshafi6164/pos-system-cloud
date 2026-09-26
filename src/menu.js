import React, { useCallback, useEffect, useState, useRef } from "react";
import "./css/menu.css";
import Header from "./components/header";
import Sidebar from "./components/sidebar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "./context/AuthContext";
import {
  createMenuItem,
  deleteMenuItem,
  deleteMenuItems,
  getCategoriesFromMenuItems,
  getNextItemCode,
  listMenuItems,
  updateMenuItem,
} from "./api/menuItemsApi";
import { getMenuCache, setMenuCache } from "./utils/menuCache";

// Icons
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>
);

const FilterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="4" rx="1"/>
    <rect x="5" y="10" width="14" height="4" rx="1"/>
    <rect x="7" y="16" width="10" height="4" rx="1"/>
  </svg>
);

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17,8 12,3 7,8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const SyncIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 2v6h-6"/>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
    <path d="M3 22v-6h6"/>
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
  </svg>
);

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 12h18M3 6h18M3 18h18"/>
  </svg>
);

function Menu() {
  const { employee, loading: authLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [menu, setMenu] = useState([]);
  const [form, setForm] = useState({
    itemCode: "", itemName: "", itemCategory: "", itemPrice: ""
  });
  const [busy, setBusy] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortField, setSortField] = useState("itemCode");
  const [sortDir, setSortDir] = useState("asc");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const filterRef = useRef(null);

  // Close filter menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilterMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load menu from cache or API
  const loadMenu = useCallback(async (forceSync = false) => {
    if (!employee?.business_id) return;

    if (!forceSync) {
      const cached = getMenuCache(employee.business_id);
      if (cached) {
        setMenu(cached.items);
        setCategories(getCategoriesFromMenuItems(cached.items));
        setLastSynced(cached.lastSynced);
        setSelectedIds([]);
        return;
      }
    }

    const data = await listMenuItems(employee.business_id);
    setMenu(data);
    setCategories(getCategoriesFromMenuItems(data));
    setMenuCache(employee.business_id, data);
    setLastSynced(new Date().toISOString());
    setSelectedIds([]);
  }, [employee?.business_id]);

  // Manual sync handler
  const handleSync = async () => {
    setSyncing(true);
    try {
      await loadMenu(true); // force sync from server
      toast.success("Menu synced!");
    } catch (err) {
      toast.error(err?.message || "Failed to sync menu");
    } finally {
      setSyncing(false);
    }
  };

  // Add menu item
  const handleAdd = async (e) => {
    e?.preventDefault?.();
    setBusy(true);
    try {
      const newItem = await createMenuItem(form, employee.business_id);
      toast.success("Menu item added!");
      const updatedMenu = [...menu, newItem].sort((a, b) => a.itemName.localeCompare(b.itemName));
      setMenu(updatedMenu);
      setCategories(getCategoriesFromMenuItems(updatedMenu));
      setMenuCache(employee.business_id, updatedMenu);
      const nextCode = getNextItemCode(updatedMenu);
      setForm(prev => ({
        itemCode: nextCode,
        itemName: "",
        itemCategory: prev.itemCategory,
        itemPrice: ""
      }));
    } catch (err) {
      toast.error(err?.message || "Failed to add menu item");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!employee?.business_id) return;
    loadMenu().catch((err) => toast.error(err?.message || "Failed to load menu"));
  }, [authLoading, employee?.business_id, loadMenu]);

  // Seed item code when menu loads
  useEffect(() => {
    if (!isEditing && menu.length >= 0) {
      const nextCode = getNextItemCode(menu);
      setForm(prev => {
        if (prev.itemCode === "" || /^\d+$/.test(prev.itemCode)) {
          return { ...prev, itemCode: nextCode };
        }
        return prev;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu.length, isEditing]);

  const handleEdit = (item) => {
    setForm({
      itemCode: item.itemCode,
      itemName: item.itemName,
      itemCategory: item.itemCategory,
      itemPrice: item.itemPrice
    });
    setEditingId(item.id);
    setIsEditing(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const updatedItem = await updateMenuItem(editingId, form, employee.business_id);
      toast.success("Menu item updated!");
      const updatedMenu = menu.map((m) => m.id === editingId ? updatedItem : m);
      setMenu(updatedMenu);
      setCategories(getCategoriesFromMenuItems(updatedMenu));
      setMenuCache(employee.business_id, updatedMenu);
      setForm({ itemCode: "", itemName: "", itemCategory: "", itemPrice: "" });
      setIsEditing(false);
      setEditingId(null);
    } catch (err) {
      toast.error(err?.message || "Failed to update menu item");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (menuId) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      setBusy(true);
      try {
        await deleteMenuItem(menuId, employee.business_id);
        toast.success("Menu item deleted!");
        const updatedMenu = menu.filter((e) => e.id !== menuId);
        setMenu(updatedMenu);
        setCategories(getCategoriesFromMenuItems(updatedMenu));
        setMenuCache(employee.business_id, updatedMenu);
      } catch (err) {
        toast.error(err?.message || "Failed to delete menu item");
      } finally {
        setBusy(false);
      }
    }
  };

  const handleCancel = () => {
    setForm({ itemCode: "", itemName: "", itemCategory: "", itemPrice: "" });
    setIsEditing(false);
    setEditingId(null);
  };

  // Multi-select handlers
  const handleSelectRow = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredMenu.length && filteredMenu.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMenu.map(m => m.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected item(s)?`)) return;
    setBusy(true);
    try {
      await deleteMenuItems(selectedIds, employee.business_id);
      toast.success(`${selectedIds.length} item(s) deleted!`);
      const updatedMenu = menu.filter(m => !selectedIds.includes(m.id));
      setMenu(updatedMenu);
      setCategories(getCategoriesFromMenuItems(updatedMenu));
      setMenuCache(employee.business_id, updatedMenu);
      setSelectedIds([]);
    } catch (err) {
      toast.error(err?.message || "Failed to delete selected items");
    } finally {
      setBusy(false);
    }
  };

  const filteredMenu = (() => {
    const filtered = menu.filter((mu) => {
      const matchesCategory = categoryFilter === "" || mu.itemCategory === categoryFilter;
      const itemName = String(mu?.itemName || "").toLowerCase();
      const itemCategory = String(mu?.itemCategory || "").toLowerCase();
      const itemCode = String(mu?.itemCode || "").toLowerCase();
      const term = searchText.toLowerCase();
      const matchesSearch = itemName.includes(term) || itemCategory.includes(term) || itemCode.includes(term);
      return matchesCategory && matchesSearch;
    });
    return [...filtered].sort((a, b) => {
      const aVal = String(a[sortField] || "").toLowerCase();
      const bVal = String(b[sortField] || "").toLowerCase();
      if (sortField === "itemCode") {
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortDir === "asc" ? aNum - bNum : bNum - aNum;
        }
      }
      const cmp = aVal.localeCompare(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });
  })();

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // Get category badge class
  const getCategoryClass = (category) => {
    const cat = (category || "").toLowerCase();
    if (cat.includes("soup")) return "soup";
    if (cat.includes("chinese")) return "chinese";
    if (cat.includes("mutton")) return "mutton";
    if (cat.includes("chicken")) return "chicken";
    if (cat.includes("snack")) return "snacks";
    if (cat.includes("handi")) return "handi";
    if (cat.includes("vegetable") || cat.includes("veg")) return "vegetable";
    if (cat.includes("rice") || cat.includes("biryani")) return "rice";
    if (cat.includes("roti") || cat.includes("nan") || cat.includes("naan")) return "roti";
    if (cat.includes("special")) return "special";
    if (cat.includes("beverage") || cat.includes("drink")) return "beverage";
    if (cat.includes("dessert") || cat.includes("sweet")) return "dessert";
    return "default";
  };

  // Format time ago
  const getTimeAgo = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const isAllSelected = filteredMenu.length > 0 && selectedIds.length === filteredMenu.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < filteredMenu.length;

  return (
    <>
      <Header />
      <div className="main-container">
        <Sidebar />
        <ToastContainer position="top-right" autoClose={3000} />

        <main className="menu-content">
          {/* Page Header */}
          <div className="menu-header">
            <h1>Menu Management</h1>
            <div className="header-actions">
              <button className="btn-import">
                <UploadIcon />
                Bulk Import
              </button>
              <button className="btn-add-item">
                <PlusIcon />
                Add Item
              </button>
            </div>
          </div>

          {/* Main Layout */}
          <div className="menu-layout">
            {/* Left Panel - Add/Edit Form */}
            <div className="add-item-card">
              <h2 className="card-title">
                {isEditing ? "Edit Item" : "Add / Edit Item"}
              </h2>

              <div className="form-group">
                <label>Item Code</label>
                <input
                  type="text"
                  placeholder="e.g. 87"
                  value={form.itemCode}
                  onChange={(e) => setForm({ ...form, itemCode: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Item Name</label>
                <input
                  type="text"
                  placeholder="e.g. Chicken Karahi"
                  value={form.itemName}
                  onChange={(e) => setForm({ ...form, itemName: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={form.itemCategory}
                    onChange={(e) => setForm({ ...form, itemCategory: e.target.value })}
                  >
                    <option value="">Select</option>
                    {categories.map((cat, i) => (
                      <option key={i} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Price (Rs)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.itemPrice}
                    onChange={(e) => setForm({ ...form, itemPrice: e.target.value })}
                  />
                </div>
              </div>

              {isEditing ? (
                <div className="form-actions-row">
                  <button
                    className="btn-save"
                    onClick={handleUpdate}
                    disabled={busy}
                  >
                    {busy ? "Updating…" : "Update Item"}
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
                  className="btn-save"
                  onClick={handleAdd}
                  disabled={busy}
                >
                  {busy ? "Saving…" : "Save Item"}
                </button>
              )}
            </div>

            {/* Right Panel - Menu List */}
            <div className="menu-list-panel">
              {/* List Header */}
              <div className="list-header">
                <div className="list-info">
                  <span className="item-count">{filteredMenu.length} Items</span>
                  {lastSynced && (
                    <span className="sync-status">
                      <span className="dot"></span>
                      Synced {getTimeAgo(lastSynced)}
                    </span>
                  )}
                  <button 
                    className="btn-sync" 
                    onClick={handleSync} 
                    disabled={syncing}
                    title="Refresh menu from server"
                  >
                    <SyncIcon />
                    {syncing ? "Syncing..." : "Sync"}
                  </button>
                </div>
                {selectedIds.length > 0 && (
                  <button className="btn-bulk-delete" onClick={handleBulkDelete} disabled={busy}>
                    <DeleteIcon />
                    Delete ({selectedIds.length})
                  </button>
                )}
              </div>

              {/* Search & Filter Row */}
              <div className="search-filter-row">
                <div className="search-input-wrapper">
                  <SearchIcon />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </div>
                <div className="filter-dropdown" ref={filterRef}>
                  <button 
                    className={`btn-filter${categoryFilter ? " active" : ""}`}
                    onClick={() => setShowFilterMenu(!showFilterMenu)}
                  >
                    <FilterIcon />
                    Filter
                  </button>
                  {showFilterMenu && (
                    <div className="filter-menu">
                      <button
                        className={`filter-menu-item${categoryFilter === "" ? " active" : ""}`}
                        onClick={() => { setCategoryFilter(""); setShowFilterMenu(false); }}
                      >
                        All Categories
                      </button>
                      {categories.map((cat, i) => (
                        <button
                          key={i}
                          className={`filter-menu-item${categoryFilter === cat ? " active" : ""}`}
                          onClick={() => { setCategoryFilter(cat); setShowFilterMenu(false); }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Menu Table */}
              <div className="menu-table-wrapper">
                <table className="menu-table">
                  <thead>
                    <tr>
                      <th className="checkbox-col">
                        <input
                          type="checkbox"
                          className="custom-checkbox"
                          checked={isAllSelected}
                          ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th className="code-col sortable" onClick={() => handleSort("itemCode")}>
                        Code {sortField === "itemCode" && (sortDir === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="name-col sortable" onClick={() => handleSort("itemName")}>
                        Name {sortField === "itemName" && (sortDir === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="category-col sortable" onClick={() => handleSort("itemCategory")}>
                        Category {sortField === "itemCategory" && (sortDir === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="price-col">Price</th>
                      <th className="action-col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMenu.length === 0 ? (
                      <tr>
                        <td colSpan="6">
                          <div className="empty-state">
                            <MenuIcon />
                            <p>No menu items found</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredMenu.map((item) => (
                        <tr 
                          key={item.id}
                          className={selectedIds.includes(item.id) ? "selected" : ""}
                        >
                          <td>
                            <input
                              type="checkbox"
                              className="custom-checkbox"
                              checked={selectedIds.includes(item.id)}
                              onChange={() => handleSelectRow(item.id)}
                            />
                          </td>
                          <td>
                            <span className="item-code">#{item.itemCode}</span>
                          </td>
                          <td>
                            <span className="item-name">{item.itemName}</span>
                          </td>
                          <td>
                            <span className={`category-badge ${getCategoryClass(item.itemCategory)}`}>
                              {item.itemCategory}
                            </span>
                          </td>
                          <td>
                            <span className="item-price">Rs. {item.itemPrice}</span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="action-btn edit"
                                onClick={() => handleEdit(item)}
                                disabled={busy}
                                title="Edit"
                              >
                                <EditIcon />
                              </button>
                              <button
                                className="action-btn delete"
                                onClick={() => handleDelete(item.id)}
                                disabled={busy}
                                title="Delete"
                              >
                                <DeleteIcon />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

export default Menu;
