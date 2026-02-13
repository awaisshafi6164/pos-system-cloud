import React, { useState, useEffect } from "react";
// import "./css/common.css";
import Header from "./components/header";
import Sidebar from "./components/sidebar";
import { ToastContainer, toast } from "react-toastify";
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
  Search
} from "@mui/icons-material";
import {
  getAllEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
} from "./api/posApi";

function Employees() {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({
    name: "", email: "", role: "", password: ""
  });

  // Fetch all employees
  const loadEmployees = async () => {
    const data = await getAllEmployees();
    setEmployees(data);
  };

  // Add employee
  const handleAdd = async () => {
    const result = await addEmployee(form);
    if (result.success) {
      toast.success("Employee added successfully!");
      loadEmployees();
      setForm({ name: "", email: "", role: "", password: "" });
    } else {
      toast.error(result.error);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleEdit = (employee) => {
    setForm({
      name: employee.name,
      email: employee.email,
      role: employee.role,
      password: "" // We don’t autofill password for security
    });
    setEditingId(employee.id);
    setIsEditing(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const result = await updateEmployee(editingId, form);
    if (result.success) {
      toast.success("Employee Updated!");
      loadEmployees();
      setForm({ name: "", email: "", role: "", password: "" });
      setIsEditing(false);
      setEditingId(null);
    } else {
      toast.error(result.error);
    }
  };


  const handleDelete = async (employeeId) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      const result = await deleteEmployee(employeeId);
      if (result.success) {
        toast.success("Employee deleted successfully!");
        setEmployees((prev) => prev.filter((e) => e.id !== employeeId));
      } else {
        toast.error(result.error || "Failed to delete employee");
      }
    }
  };

  const handleCancel = () => {
    setForm({ name: "", email: "", role: "", password: "" });
    setIsEditing(false);
    setEditingId(null);
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                        />
                        
                        <TextField
                          fullWidth
                          label="Password"
                          type="password"
                          value={form.password}
                          onChange={e => setForm({ ...form, password: e.target.value })}
                          autoComplete="new-password"
                          required
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
                              <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
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
                                  <TableCell>#{emp.id}</TableCell>
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
                                      <Tooltip title="Edit">
                                        <IconButton
                                          size="small"
                                          onClick={() => handleEdit(emp)}
                                          sx={{ color: '#666' }}
                                        >
                                          <Edit fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Delete">
                                        <IconButton
                                          size="small"
                                          onClick={() => handleDelete(emp.id)}
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
