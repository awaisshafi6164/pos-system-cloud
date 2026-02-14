import React, { useState, useEffect } from "react";
// import "./css/common.css";
import Header from "./components/header";
import Sidebar from "./components/sidebar";
import { ToastContainer, toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "./context/AuthContext";
import { supabase } from "./supabaseClient";
import { createEmployee, deleteEmployee, listEmployees, updateEmployee } from "./api/employeesApi";
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
  LockReset,
} from "@mui/icons-material";

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

  // Fetch all employees
  const loadEmployees = async () => {
    const data = await listEmployees();
    setEmployees(Array.isArray(data) ? data : []);
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

  const handleEdit = (employee) => {
    setForm({
      name: employee.name,
      email: employee.email,
      role: employee.role,
    });
    setEditingId(employee.id);
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

  const getRoleColor = (role) => {
    switch(role) {
      case 'admin': return 'error';
      case 'manager': return 'primary';
      case 'receptionist': return 'success';
      default: return 'default';
    }
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
              {/* Left Side - Add Employee Form */}
              <Grid item xs={12} lg={3}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card sx={{ boxShadow: 3, borderRadius: 2, height: '100%' }}>
                    <CardContent>
                      <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
                        {isEditing ? 'Edit Employee' : 'Add Employee'}
                      </Typography>
                      
	                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
	                        <TextField
	                          fullWidth
	                          label="Name"
	                          value={form.name}
	                          onChange={e => setForm({ ...form, name: e.target.value })}
	                          required
	                        />
	                        
	                        <TextField
	                          fullWidth
	                          label="Email"
	                          type="email"
	                          value={form.email}
	                          onChange={e => setForm({ ...form, email: e.target.value })}
	                          autoComplete="off"
	                          required
	                          disabled={isEditing}
	                        />
	                        
	                        <TextField
	                          fullWidth
	                          select
                          label="Employee Role"
                          value={form.role}
                          onChange={e => setForm({ ...form, role: e.target.value })}
                          required
                        >
                          <MenuItem value="">Select Role</MenuItem>
                          <MenuItem value="admin">Administrator</MenuItem>
                          <MenuItem value="manager">Software Manager</MenuItem>
                          <MenuItem value="receptionist">Receptionist</MenuItem>
                        </TextField>
                        
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
	                        {!isEditing ? (
	                          <Typography variant="caption" color="text.secondary">
	                            New emails get an invite to set a password. If the email already exists, it will be linked to this business.
	                          </Typography>
	                        ) : null}
	                      </Box>
	                    </CardContent>
	                  </Card>
	                </motion.div>
	              </Grid>

              {/* Right Side - Employees List */}
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
                            Employees List
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {filteredEmployees.length} Members
                          </Typography>
                        </Box>
                      </Box>
                      
                      <TextField
                        fullWidth
                        placeholder="Search employees..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        sx={{ mb: 3 }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Search color="action" />
                            </InputAdornment>
                          ),
                        }}
                      />
                      
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                              {/* <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell> */}
                              <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }} align="center">Action</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            <AnimatePresence>
                              {filteredEmployees.map((emp, index) => (
                                <TableRow
                                  component={motion.tr}
                                  key={emp.id}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ delay: index * 0.05 }}
                                  sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                                >
                                  {/* <TableCell>#{emp.id}</TableCell> */}
                                  <TableCell>
                                    <Box>
                                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                        {emp.name}
                                      </Typography>
                                      <Typography variant="caption" color="primary">
                                        {emp.email}
                                      </Typography>
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={emp.role}
                                      color={getRoleColor(emp.role)}
                                      size="small"
                                    />
                                  </TableCell>
	                                  <TableCell align="center">
	                                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
	                                      <Tooltip title="Send password reset">
	                                        <IconButton
	                                          size="small"
	                                          onClick={() => handleSendResetPassword(emp.email)}
	                                          sx={{ color: '#666' }}
	                                          disabled={busy}
	                                        >
	                                          <LockReset fontSize="small" />
	                                        </IconButton>
	                                      </Tooltip>
	                                      <Tooltip title="Edit">
	                                        <IconButton
	                                          size="small"
	                                          onClick={() => handleEdit(emp)}
	                                          sx={{ color: '#666' }}
	                                          disabled={busy}
	                                        >
	                                          <Edit fontSize="small" />
	                                        </IconButton>
	                                      </Tooltip>
	                                      <Tooltip title="Delete">
	                                        <IconButton
	                                          size="small"
	                                          onClick={() => handleDelete(emp.id)}
	                                          sx={{ color: '#666' }}
	                                          disabled={busy}
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
                        {filteredEmployees.length === 0 && (
                          <Box sx={{ p: 4, textAlign: 'center' }}>
                            <Typography variant="body1" color="text.secondary">
                              No employees found
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

export default Employees;
