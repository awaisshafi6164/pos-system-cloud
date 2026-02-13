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
  TableRow
} from "@mui/material";
import {
  Edit,
  Delete,
  Search,
  FilterList
} from "@mui/icons-material";
import settingsManager from "./utils/SettingsManager";
import { useAuth } from "./context/AuthContext";
import {
  createMenuItem,
  deleteMenuItem,
  getCategoriesFromMenuItems,
  listMenuItems,
  updateMenuItem,
} from "./api/menuItemsApi";

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
  
  // Fetch all menu
  const loadmenu = useCallback(async () => {
    if (!employee?.business_id) return;
    const data = await listMenuItems(employee.business_id);
    setmenu(data);
    setCategories(getCategoriesFromMenuItems(data));
  }, [employee?.business_id]);

  // Add menu
  const handleAdd = async (e) => {
    e?.preventDefault?.();
    setBusy(true);
    try {
      await createMenuItem(form, employee.business_id);
      toast.success("Menu Added!");
      await loadmenu();
      setForm({ itemCode: "", itemName: "", itemCategory: "", itemPrice: "", stockQty: "" });
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
      await updateMenuItem(editingId, form, employee.business_id);
      toast.success("Menu Updated!");
      await loadmenu();
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
        setmenu((prev) => prev.filter((e) => e.id !== menuId));
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

	  const filteredMenu = menu.filter((mu) => {
	    const matchesCategory = categoryFilter === "" || mu.itemCategory === categoryFilter;
	    const itemName = String(mu?.itemName || "").toLowerCase();
	    const itemCategory = String(mu?.itemCategory || "").toLowerCase();
	    const itemCode = String(mu?.itemCode || "").toLowerCase();
	    const matchesSearch = itemName.includes(searchText) || itemCategory.includes(searchText) || itemCode.includes(searchText);
	    return matchesCategory && matchesSearch;
	  });

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
                          </Typography>
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
                              <TableCell sx={{ fontWeight: 'bold' }}>Code</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>Item Name</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
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
                                  sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                                >
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
