import React, { useCallback, useEffect, useState } from "react";
// import "./css/common.css";
import Header from "./components/header";
import Sidebar from "./components/sidebar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  MenuItem,
  Typography,
  IconButton,
  Chip,
  InputAdornment,
  Grid,
  Autocomplete,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Checkbox
} from "@mui/material";
import {
  Edit,
  Delete,
  Search,
  FilterList,
  Sync,
  DeleteSweep
} from "@mui/icons-material";
import settingsManager from "./utils/SettingsManager";
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

function Menu() {
  const { employee, loading: authLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showStockQty, setShowStockQty] = useState(true);
  const [showModifiedDate, setShowModifiedDate] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [menu, setmenu] = useState([]);
  const [form, setForm] = useState({
    itemCode: "", itemName: "", itemCategory: "", itemPrice: "", stockQty: ""
  });
  const [busy, setBusy] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState([]);
  // Sorting state
  const [sortField, setSortField] = useState("itemName");
  const [sortDir, setSortDir] = useState("asc");
  
  // Load menu from cache or API
  const loadmenu = useCallback(async (forceSync = false) => {
    if (!employee?.business_id) return;

    // Try cache first (unless forced sync)
    if (!forceSync) {
      const cached = getMenuCache(employee.business_id);
      if (cached) {
        setmenu(cached.items);
        setCategories(getCategoriesFromMenuItems(cached.items));
        setLastSynced(cached.lastSynced);
        setSelectedIds([]);
        return;
      }
    }

    // Fetch from API
    const data = await listMenuItems(employee.business_id);
    setmenu(data);
    setCategories(getCategoriesFromMenuItems(data));
    setMenuCache(employee.business_id, data);
    setLastSynced(new Date().toISOString());
    setSelectedIds([]);
  }, [employee?.business_id]);

  // Sync button handler
  const handleSync = async () => {
    setBusy(true);
    try {
      await loadmenu(true);
      toast.success("Menu synced!");
    } catch (err) {
      toast.error(err?.message || "Failed to sync menu");
    } finally {
      setBusy(false);
    }
  };

  // Add menu
  const handleAdd = async (e) => {
    e?.preventDefault?.();
    setBusy(true);
    try {
      const newItem = await createMenuItem(form, employee.business_id);
      toast.success("Menu Added!");
      const updatedMenu = [...menu, newItem].sort((a, b) => a.itemName.localeCompare(b.itemName));
      setmenu(updatedMenu);
      setCategories(getCategoriesFromMenuItems(updatedMenu));
      setMenuCache(employee.business_id, updatedMenu);
      // Keep category, auto-increment item code for fast additions
      const nextCode = getNextItemCode(updatedMenu);
      setForm(prev => ({
        itemCode: nextCode,
        itemName: "",
        itemCategory: prev.itemCategory, // preserve last used category
        itemPrice: "",
        stockQty: ""
      }));
    } catch (err) {
      toast.error(err?.message || "Failed to add menu item");
    } finally {
      setBusy(false);
    }
  };
  
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await settingsManager.fetchSettings();
        if (settings) {
          setShowStockQty(settings.show_menu_stock_qty === "1");
          setShowModifiedDate(settings.show_menu_modified_date === "1");
        }
      } catch (error) {
        console.error("Failed to load settings", error);
      }
    };

    loadSettings();
    if (authLoading) return;
    if (!employee?.business_id) return;
    loadmenu().catch((err) => toast.error(err?.message || "Failed to load menu"));
  }, [authLoading, employee?.business_id, loadmenu]);

  // Once menu is loaded (and not editing), seed item code with next auto-increment value
  useEffect(() => {
    if (!isEditing && menu.length >= 0) {
      const nextCode = getNextItemCode(menu);
      setForm(prev => {
        // Only update if itemCode hasn't been manually typed
        if (prev.itemCode === "" || /^\d+$/.test(prev.itemCode)) {
          return { ...prev, itemCode: nextCode };
        }
        return prev;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu.length, isEditing]);
  
  const handleEdit = (menu) => {
    setForm({
      itemCode: menu.itemCode,
      itemName: menu.itemName,
      itemCategory: menu.itemCategory,
      itemPrice: menu.itemPrice,
      stockQty: menu.stockQty || ""
    });
    setEditingId(menu.id);
    setIsEditing(true);
  };
  
  const handleUpdate = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const updatedItem = await updateMenuItem(editingId, form, employee.business_id);
      toast.success("Menu Updated!");
      const updatedMenu = menu.map((m) => m.id === editingId ? updatedItem : m);
      setmenu(updatedMenu);
      setCategories(getCategoriesFromMenuItems(updatedMenu));
      setMenuCache(employee.business_id, updatedMenu);
      setForm({ itemCode: "", itemName: "", itemCategory: "", itemPrice: "", stockQty: "" });
      setIsEditing(false);
      setEditingId(null);
    } catch (err) {
      toast.error(err?.message || "Failed to update menu item");
    } finally {
      setBusy(false);
    }
  };
    
  const handleDelete = async (menuId) => {
    if (window.confirm("Are you sure you want to delete this menu?")) {
      setBusy(true);
      try {
        await deleteMenuItem(menuId, employee.business_id);
        toast.success("Menu item deleted successfully!");
        const updatedMenu = menu.filter((e) => e.id !== menuId);
        setmenu(updatedMenu);
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
    setForm({ itemCode: "", itemName: "", itemCategory: "", itemPrice: "", stockQty: "" });
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
    if (!window.confirm(`Delete ${selectedIds.length} selected item(s)? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteMenuItems(selectedIds, employee.business_id);
      toast.success(`${selectedIds.length} item(s) deleted!`);
      const updatedMenu = menu.filter(m => !selectedIds.includes(m.id));
      setmenu(updatedMenu);
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
	      const matchesSearch = itemName.includes(searchText) || itemCategory.includes(searchText) || itemCode.includes(searchText);
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

  const getCategoryColor = (category) => {
    const colors = ['primary', 'secondary', 'success', 'error', 'warning', 'info'];
    const index = categories.indexOf(category) % colors.length;
    return colors[index];
  };

  return (
    <>
      <Header />
      <div className="main-container">
        <Sidebar />
        <ToastContainer position="top-right" autoClose={3000} />

        <main className="content">
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>

              {/* Left Side - Add/Edit Menu Form */}
              <Grid item xs={12} lg={3}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card sx={{ boxShadow: 3, borderRadius: 2, height: '100%' }}>
                    <CardContent>
                      <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
                        {isEditing ? 'Edit Menu Item' : 'Add Menu Item'}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                          fullWidth
                          label="Item Code"
                          value={form.itemCode}
                          onChange={e => setForm({ ...form, itemCode: e.target.value })}
                          required
                        />
                        
                        <TextField
                          fullWidth
                          label="Item Name"
                          value={form.itemName}
                          onChange={e => setForm({ ...form, itemName: e.target.value })}
                          required
                        />
                        
                        <TextField
                          fullWidth
                          label="Price"
                          type="number"
                          value={form.itemPrice}
                          onChange={e => setForm({ ...form, itemPrice: e.target.value })}
                          required
                        />
                        
                        {showStockQty && (
                          <TextField
                            fullWidth
                            label="Stock Qty"
                            type="number"
                            value={form.stockQty}
                            onChange={e => setForm({ ...form, stockQty: e.target.value })}
                          />
                        )}
                        
                        <Autocomplete
                          freeSolo
                          options={categories}
                          value={form.itemCategory}
                          onChange={(e, newValue) => setForm({ ...form, itemCategory: newValue || "" })}
                          onInputChange={(e, newValue) => setForm({ ...form, itemCategory: newValue })}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Category"
                              required
                            />
                          )}
                        />
                        
                        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
	                          <Button
	                            fullWidth
	                            variant="contained"
	                            onClick={isEditing ? handleUpdate : handleAdd}
	                            sx={{ py: 1.5 }}
	                            disabled={busy}
	                          >
	                            {isEditing ? 'UPDATE' : 'SAVE'}
	                          </Button>
	                          {isEditing && (
                            <Button
                              fullWidth
                              variant="outlined"
	                              color="error"
	                              onClick={handleCancel}
	                              sx={{ py: 1.5 }}
	                              disabled={busy}
	                            >
	                              CANCEL
	                            </Button>
	                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              {/* Right Side - Menu Items List */}
              <Grid item xs={12} lg={9}>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box>
                          <Typography variant="h5" sx={{ fontWeight: 700 }}>
                            Menu Items List
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {filteredMenu.length} Items
                            {lastSynced && ` • Last synced: ${new Date(lastSynced).toLocaleString()}`}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          {selectedIds.length > 0 && (
                            <Button
                              variant="contained"
                              color="error"
                              startIcon={<DeleteSweep />}
                              onClick={handleBulkDelete}
                              disabled={busy}
                              size="small"
                            >
                              Delete Selected ({selectedIds.length})
                            </Button>
                          )}
                          <Tooltip title="Sync menu from server">
                            <Button
                              variant="outlined"
                              startIcon={<Sync />}
                              onClick={handleSync}
                              disabled={busy}
                              size="small"
                            >
                              Sync
                            </Button>
                          </Tooltip>
                        </Box>
                      </Box>
                      
                      <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            select
                            label="Filter by Category"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <FilterList color="action" />
                                </InputAdornment>
                              ),
                            }}
                          >
                            <MenuItem value="">All Categories</MenuItem>
                            {categories.map((cat, index) => (
                              <MenuItem key={index} value={cat}>{cat}</MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid item xs={12} md={8}>
                          <TextField
                            fullWidth
                            placeholder="Search menu items..."
                            value={searchText}
                            onChange={e => setSearchText(e.target.value.toLowerCase())}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Search color="action" />
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Grid>
                      </Grid>
                      
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                              <TableCell padding="checkbox">
                                <Tooltip title={selectedIds.length === filteredMenu.length && filteredMenu.length > 0 ? "Deselect all" : "Select all"}>
                                  <Checkbox
                                    indeterminate={selectedIds.length > 0 && selectedIds.length < filteredMenu.length}
                                    checked={filteredMenu.length > 0 && selectedIds.length === filteredMenu.length}
                                    onChange={handleSelectAll}
                                    size="small"
                                  />
                                </Tooltip>
                              </TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>
                                <TableSortLabel
                                  active={sortField === "itemCode"}
                                  direction={sortField === "itemCode" ? sortDir : "asc"}
                                  onClick={() => handleSort("itemCode")}
                                >
                                  Code
                                </TableSortLabel>
                              </TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>
                                <TableSortLabel
                                  active={sortField === "itemName"}
                                  direction={sortField === "itemName" ? sortDir : "asc"}
                                  onClick={() => handleSort("itemName")}
                                >
                                  Item Name
                                </TableSortLabel>
                              </TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>
                                <TableSortLabel
                                  active={sortField === "itemCategory"}
                                  direction={sortField === "itemCategory" ? sortDir : "asc"}
                                  onClick={() => handleSort("itemCategory")}
                                >
                                  Category
                                </TableSortLabel>
                              </TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>Price</TableCell>
                              {showStockQty && <TableCell sx={{ fontWeight: 'bold' }}>Stock</TableCell>}
                              {showModifiedDate && <TableCell sx={{ fontWeight: 'bold' }}>Modified</TableCell>}
                              <TableCell sx={{ fontWeight: 'bold' }} align="center">Action</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            <AnimatePresence>
                              {filteredMenu.map((mu, index) => (
                                <TableRow
                                  component={motion.tr}
                                  key={mu.id}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ delay: index * 0.05 }}
                                  selected={selectedIds.includes(mu.id)}
                                  sx={{
                                    '&:hover': { bgcolor: 'action.hover' },
                                    ...(selectedIds.includes(mu.id) && { bgcolor: 'action.selected' })
                                  }}
                                >
                                  <TableCell padding="checkbox">
                                    <Checkbox
                                      size="small"
                                      checked={selectedIds.includes(mu.id)}
                                      onChange={() => handleSelectRow(mu.id)}
                                    />
                                  </TableCell>
                                  <TableCell>{mu.itemCode}</TableCell>
                                  <TableCell>
                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                      {mu.itemName}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={mu.itemCategory}
                                      color={getCategoryColor(mu.itemCategory)}
                                      size="small"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body1" color="primary" sx={{ fontWeight: 600 }}>
                                      ${mu.itemPrice}
                                    </Typography>
                                  </TableCell>
                                  {showStockQty && (
                                    <TableCell>
                                      <Chip label={mu.stockQty || 0} size="small" variant="outlined" />
                                    </TableCell>
                                  )}
                                  {showModifiedDate && (
                                    <TableCell>
                                      <Typography variant="caption">
                                        {mu.date_modified ? new Date(mu.date_modified).toLocaleDateString() : 'N/A'}
                                      </Typography>
                                    </TableCell>
                                  )}
                                  <TableCell align="center">
                                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                      <Tooltip title="Edit">
                                        <IconButton
                                          size="small"
                                          onClick={() => handleEdit(mu)}
                                          sx={{ color: '#666' }}
                                        >
                                          <Edit fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Delete">
                                        <IconButton
                                          size="small"
                                          onClick={() => handleDelete(mu.id)}
                                          sx={{ color: '#666' }}
                                        >
                                          <Delete fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </AnimatePresence>
                          </TableBody>
                        </Table>
                        {filteredMenu.length === 0 && (
                          <Box sx={{ p: 4, textAlign: 'center' }}>
                            <Typography variant="body1" color="text.secondary">
                              No menu items found
                            </Typography>
                          </Box>
                        )}
                      </TableContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            </Grid>
          </Box>
        </main>
      </div>
    </>
  );
}

export default Menu;
