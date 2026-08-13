import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/common.css";
import "./css/invoice.css";
import Header from "./components/header";
import Sidebar from "./components/sidebar";
import SalesReportSection from "./components/SalesReportSection";
import { useAuth } from "./context/AuthContext";
import { deleteInvoicesByIds, listInvoicesLegacy } from "./api/invoicesApi";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Tooltip,
  TableSortLabel,
} from "@mui/material";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import dayjs from 'dayjs';
import { ToastContainer, toast } from "react-toastify";
import settingsManager from "./utils/SettingsManager";

const INVOICE_COLUMNS_TO_DISPLAY = [
  { key: "InvoiceNumber", header: "PRA No" },
  { key: "USIN", header: "Invoice No" },
  { key: "DateTime", header: "Date & Time" },
  { key: "BuyerName", header: "Customer Name" },
  { key: "BuyerPhoneNumber", header: "Contact" },
  { key: "address", header: "Address" },
  { key: "TotalQuantity", header: "Quantity" },
  { key: "TotalSaleValue", header: "Total Cost" },
  { key: "TotalTaxCharged", header: "Tax" },
  { key: "FurtherTax", header: "Further Tax" },
  { key: "Discount", header: "Discount" },
  { key: "TotalBillAmount", header: "Payable" },
  { key: "Paid", header: "Paid", formatter: (obj) => (parseFloat(obj.TotalBillAmount || 0) - parseFloat(obj.Balance || 0)).toFixed(2) },
  { key: "Balance", header: "Balance" },
  // { key: "PaymentMode", header: "Pay Mode" },
  // { key: "InvoiceType", header: "Inv Type" },
];

const INVOICE_ITEM_COLUMNS_TO_DISPLAY = [
  { key: "ItemCode", header: "Code" },
  { key: "ItemName", header: "Item Name" },
  { key: "Quantity", header: "Qty" },
  { 
    key: "TotalAmount", 
    header: "Total",
    formatter: (item, gstIncluded) => {
      // If TotalAmount exists and is valid, use it
      if (item.TotalAmount !== undefined && item.TotalAmount !== null) {
        return parseFloat(item.TotalAmount).toFixed(2);
      }
      // Fallback: calculate from SaleValue
      return parseFloat(item.SaleValue || 0).toFixed(2);
    }
  }
];

function Invoice() {
  const { employee, loading: authLoading } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoiceItems, setSelectedInvoiceItems] = useState([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [fetchError, setFetchError] = useState("");
  const [itemError, setItemError] = useState("");
  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [toDate, setToDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [layout, setLayout] = useState("0");
  const [showPaid, setShowPaid] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [showSalesReport, setShowSalesReport] = useState(false);
  const [salesReportData, setSalesReportData] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [gstIncluded, setGstIncluded] = useState(false);
  const [praLinked, setPraLinked] = useState(false);
  // Multi-select for bulk delete
  const [selectedIds, setSelectedIds] = useState([]);
  // Column sort for the invoices table (default: USIN/Invoice No desc)
  const [invoiceSort, setInvoiceSort] = useState({ key: "USIN", dir: "desc" });

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        if (authLoading) return;
        if (!employee?.business_id) return;
        if (!fromDate || !toDate) return;
        const data = await listInvoicesLegacy({
          businessId: employee.business_id,
          fromDate,
          toDate,
        });

        if (!Array.isArray(data) || data.length === 0) {
          setFetchError("❌ No invoices found in the selected date range.");
          setInvoices([]);
          setFilteredInvoices([]);
          return;
        }

        setInvoices(data);
        setFilteredInvoices(data);
        setFetchError("");
        // Clear selection when date range changes
        setSelectedIds([]);
        setSelectedInvoiceId(null);
        setSelectedInvoiceItems([]);
      } catch (err) {
        setFetchError("❌ Failed to fetch invoices: " + err.message);
      }
    };

    fetchInvoices();

    const loadSettings = async () => {
      const settings = await settingsManager.fetchSettings();
      if (settings) {
        if (settings.pos_layout) setLayout(settings.pos_layout);
        if (settings.show_paid !== undefined) setShowPaid(settings.show_paid === "1");
        if (settings.show_balance !== undefined) setShowBalance(settings.show_balance === "1");
        if (settings.gst_included !== undefined) setGstIncluded(settings.gst_included === "1");
        if (settings.pra_linked !== undefined) {
          const v = settings.pra_linked;
          setPraLinked(v === "1" || v === 1 || v === true);
        }
      }
    };
    loadSettings();
  }, [authLoading, employee?.business_id, fromDate, toDate]);

  const handleRowClick = (invoice) => {
    setSelectedInvoiceId(invoice.id);
    if (Array.isArray(invoice.Items) && invoice.Items.length > 0) {
      setSelectedInvoiceItems(invoice.Items);
      setItemError("");
    } else {
      setSelectedInvoiceItems([]);
      setItemError("❌ No items found for this invoice.");
    }
  };



  const getColumns = () => {
    let cols = [...INVOICE_COLUMNS_TO_DISPLAY];
    // Insert Hotel columns after Address (index 5)
    if (layout === "1") {
      cols.splice(6, 0,
        { key: "BuyerCNIC", header: "CNIC" },
        { key: "BuyerPNTN", header: "PNTN" },
        { key: "check_in_date", header: "Check In" },
        { key: "check_out_date", header: "Check Out" }
      );
    }
    // Filter out Paid and Balance columns if both settings are false
    if (!showPaid && !showBalance) {
      cols = cols.filter(col => col.key !== "Paid" && col.key !== "Balance");
    }
    return cols;
  };

  const handleInvoiceSort = (key) => {
    setInvoiceSort(prev =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  };

  const renderTableHeader = () => {
    return getColumns().map((col) => (
      <TableCell
        key={col.key}
        sx={{
          border: "1px solid #ccc",
          fontWeight: "bold",
          backgroundColor: "#f5f5f5",
          fontSize: "12px",
          padding: "4px 8px",
          whiteSpace: "nowrap",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <TableSortLabel
          active={invoiceSort.key === col.key}
          direction={invoiceSort.key === col.key ? invoiceSort.dir : "asc"}
          onClick={() => handleInvoiceSort(col.key)}
          sx={{ fontSize: "12px", fontWeight: "bold" }}
        >
          {col.header}
        </TableSortLabel>
      </TableCell>
    ));
  };

  const renderTableRow = (obj) => {
    return getColumns().map((col) => {
      let value = col.formatter ? col.formatter(obj) : obj[col.key];

      // Combine date and time for hotel fields
      if (col.key === 'check_in_date' && obj.time_in) {
        const datePart = value ? value.split(' ')[0] : '';
        value = `${datePart} ${obj.time_in}`;
      }
      if (col.key === 'check_out_date' && obj.time_out) {
        const datePart = value ? value.split(' ')[0] : '';
        value = `${datePart} ${obj.time_out}`;
      }

      // Clean up address for all layouts
      if (col.key === 'address' && value) {
        const parts = value.split('|');
        const addressPart = parts.find(part => {
          const trimmed = part.trim();
          return !trimmed.startsWith("Room:") &&
            !trimmed.startsWith("In:") &&
            !trimmed.startsWith("Out:") &&
            !trimmed.startsWith("TimeIn:") &&
            !trimmed.startsWith("TimeOut:") &&
            !trimmed.startsWith("Emergency:") &&
            !trimmed.startsWith("Nationality:");
        });
        value = addressPart ? addressPart.trim() : "";
      }

      return (
        <TableCell
          key={col.key}
          sx={{
            border: "1px solid #ddd",
            fontSize: "12px",
            padding: "4px 8px",
          }}
        >
          {typeof value === "string" && value.length > 30
            ? `${value.slice(0, 30)}...`
            : value ?? ""}
        </TableCell>
      );
    });
  };
  // Inside the Invoice component:
  const navigate = useNavigate();

  // The list actually rendered in the table (date-filtered + search-filtered)
  const visibleInvoices = filteredInvoices
    .filter((inv) => {
      if (!searchText) return true;
      return INVOICE_COLUMNS_TO_DISPLAY.some(col =>
        String(inv[col.key] || '').toLowerCase().includes(searchText)
      ) || String(inv.BuyerCNIC || '').toLowerCase().includes(searchText);
    })
    .sort((a, b) => {
      const { key, dir } = invoiceSort;
      const aVal = a[key];
      const bVal = b[key];

      // Numeric columns
      const numericKeys = ["TotalBillAmount", "TotalQuantity", "TotalSaleValue", "TotalTaxCharged", "Discount", "FurtherTax", "Balance", "Paid"];
      if (numericKeys.includes(key)) {
        const diff = Number(aVal || 0) - Number(bVal || 0);
        return dir === "asc" ? diff : -diff;
      }
      // Invoice No (USIN) — sort by trailing numeric part so 1134 > 999
      if (key === "USIN") {
        const getNum = (v) => { const m = String(v || "").match(/(\d+)$/); return m ? parseInt(m[1], 10) : 0; };
        const diff = getNum(aVal) - getNum(bVal);
        return dir === "asc" ? diff : -diff;
      }
      // Date column
      if (key === "DateTime") {
        const diff = new Date(aVal) - new Date(bVal);
        if (diff !== 0) return dir === "asc" ? diff : -diff;
        return dir === "asc" ? (a.id ?? 0) - (b.id ?? 0) : (b.id ?? 0) - (a.id ?? 0);
      }
      // String columns
      const cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""));
      return dir === "asc" ? cmp : -cmp;
    });

  // Multi-select helpers
  const handleToggleSelect = (e, id) => {
    e.stopPropagation(); // don't trigger row click / item view
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e) => {
    e.stopPropagation();
    if (selectedIds.length === visibleInvoices.length && visibleInvoices.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visibleInvoices.map(inv => inv.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      toast.warn("Select at least one invoice to delete.");
      return;
    }
    if (!window.confirm(`Delete ${selectedIds.length} invoice(s)? This cannot be undone.`)) return;

    try {
      await deleteInvoicesByIds({ businessId: employee?.business_id, invoiceIds: selectedIds });
      toast.success(`${selectedIds.length} invoice(s) deleted!`);
      const remaining = invoices.filter(inv => !selectedIds.includes(inv.id));
      setInvoices(remaining);
      setFilteredInvoices(remaining);
      // Clear selection + item panel if the viewed invoice was deleted
      if (selectedIds.includes(selectedInvoiceId)) {
        setSelectedInvoiceId(null);
        setSelectedInvoiceItems([]);
      }
      setSelectedIds([]);
    } catch (error) {
      toast.error("Error deleting invoices: " + error.message);
    }
  };

  const handlePrint = () => {
    const selectedInvoice = invoices.find(inv => inv.id === selectedInvoiceId);
    if (!selectedInvoice) return;

    // ✅ Normalize items from old invoices to match expected fields in Receipt.js
    const transformedItems = (selectedInvoice.Items || []).map((item) => ({
      itemName: item.ItemName,
      itemPrice: parseFloat(item.SaleValue / item.Quantity || 0),
      quantity: parseInt(item.Quantity || 1),
    }));

    // Clean address field - extract only actual address, not hotel info
    let cleanAddress = selectedInvoice.address || "";
    if (cleanAddress.includes("|")) {
      const parts = cleanAddress.split("|");
      cleanAddress = parts.find(part => 
        !part.trim().startsWith("In:") && 
        !part.trim().startsWith("Out:") && 
        !part.trim().startsWith("TimeIn:") && 
        !part.trim().startsWith("TimeOut:") && 
        !part.trim().startsWith("Nationality:") && 
        !part.trim().startsWith("Emergency:")
      )?.trim() || "";
    }

    console.log("Selected invoice for print:", selectedInvoice);
    navigate("/receipt", {
      state: {
        customer: {
          invoiceNumber: selectedInvoice.USIN,
          name: selectedInvoice.BuyerName,
          cnic: selectedInvoice.BuyerCNIC,
          pntn: selectedInvoice.BuyerPNTN,
          contact: selectedInvoice.BuyerPhoneNumber,
          address: cleanAddress,
          checkInDate: selectedInvoice.check_in_date,
          checkOutDate: selectedInvoice.check_out_date,
          timeIn: selectedInvoice.time_in,
          timeOut: selectedInvoice.time_out,
          dateTime: selectedInvoice.DateTime,
        },
        billing: {
          itemCount: selectedInvoice.TotalQuantity,
          itemCost: selectedInvoice.TotalSaleValue,
          gstAmount: selectedInvoice.TotalTaxCharged,
          posCharges: selectedInvoice.pos_charges ?? "0",
          serviceCharges: selectedInvoice.service_charges ?? "0",
          discount: selectedInvoice.Discount ?? "0",
          balance: selectedInvoice.Balance ?? "0",
          paid: selectedInvoice.Paid ?? "0",
          totalPayable: selectedInvoice.TotalBillAmount,
        },
        selectedMenuItems: transformedItems,
        praInvoiceNumber: selectedInvoice.InvoiceNumber || "",
      }
    });
  };

  return (
    <>
      <Header />
      <div className="main-container">
        <Sidebar />
        <ToastContainer position="top-right" autoClose={3000} />

        <main className="content vertical-layout">
          <LocalizationProvider dateAdapter={AdapterDayjs}>

          <section className="invoice-section">
            {/* Filters and Search */}
            <div style={{ 
              marginBottom: "15px", 
              padding: "15px", 
              backgroundColor: "#f8f9fa", 
              borderRadius: "8px",
              border: "1px solid #e0e0e0"
            }}>
              <div style={{ display: "flex", gap: "15px", alignItems: "center", flexWrap: "wrap" }}>
                {/* Date Range Filter */}
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <label style={{ fontSize: "14px", fontWeight: "500", color: "#333" }}>From:</label>
                  <DesktopDatePicker
                    value={fromDate ? dayjs(fromDate) : null}
                    onChange={(newValue) => setFromDate(newValue ? newValue.format('YYYY-MM-DD') : "")}
                    slotProps={{
                      textField: {
                        size: "small",
                        sx: {
                          width: '150px',
                          '& .MuiInputBase-input': { fontSize: '14px', padding: '6px 10px' }
                        }
                      }
                    }}
                  />
                  <label style={{ fontSize: "14px", fontWeight: "500", color: "#333", marginLeft: "5px" }}>To:</label>
                  <DesktopDatePicker
                    value={toDate ? dayjs(toDate) : null}
                    onChange={(newValue) => setToDate(newValue ? newValue.format('YYYY-MM-DD') : "")}
                    slotProps={{
                      textField: {
                        size: "small",
                        sx: {
                          width: '150px',
                          '& .MuiInputBase-input': { fontSize: '14px', padding: '6px 10px' }
                        }
                      }
                    }}
                  />
                  <button
                    style={{
                      padding: "7px 16px",
                      backgroundColor: "#17a2b8",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500"
                    }}
                    onClick={() => {
                      if (!fromDate || !toDate) {
                        toast.warn("Please select both From and To dates.");
                        return;
                      }
                      
                      // Filter is now automatic via useEffect
                      if (filteredInvoices.length === 0) {
                        toast.info("No invoices found in the selected date range.");
                        setSalesReportData([]);
                        setShowSalesReport(false);
                        return;
                      }
                      
                      // Calculate sales report from already filtered invoices
                      const itemSales = {};
                      filteredInvoices.forEach(inv => {
                        if (inv.Items && Array.isArray(inv.Items)) {
                          inv.Items.forEach(item => {
                            const itemCode = item.ItemCode || item.item_code;
                            const itemName = item.ItemName || item.item_name;
                            const quantity = parseInt(item.Quantity || item.quantity || 0);
                            const saleValue = parseFloat(item.SaleValue || item.sale_value || 0);
                            
                            if (!itemSales[itemCode]) {
                              itemSales[itemCode] = {
                                itemCode,
                                itemName,
                                totalQuantity: 0,
                                totalSales: 0
                              };
                            }
                            
                            itemSales[itemCode].totalQuantity += quantity;
                            itemSales[itemCode].totalSales += saleValue;
                          });
                        }
                      });
                      
                      const reportData = Object.values(itemSales).sort((a, b) => b.totalSales - a.totalSales);
                      setSalesReportData(reportData);
                      setSortConfig({ key: null, direction: 'asc' });
                      setShowSalesReport(true);
                    }}
                  >
                    Sales Report
                  </button>
                  <button
                    style={{
                      padding: "7px 16px",
                      backgroundColor: "#6c757d",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500"
                    }}
                    onClick={() => {
                      setShowSalesReport(false);
                      setSelectedInvoiceId(null);
                      setSelectedInvoiceItems([]);
                      setSearchText("");
                    }}
                  >
                    Clear
                  </button>
                </div>

                {/* Search Box */}
                <div style={{ flex: "1", minWidth: "250px" }}>
                  <input
                    type="text"
                    placeholder="🔍 Search by Name, Contact, Invoice No, CNIC..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value.toLowerCase())}
                    style={{
                      width: "100%",
                      padding: "7px 12px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      fontSize: "14px"
                    }}
                  />
                </div>

                {/* Export Button */}
                <button
                  style={{
                    padding: "7px 16px",
                    backgroundColor: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                  onClick={async () => {
                    const backupData = {
                      metadata: {
                        exportDate: new Date().toISOString(),
                        totalRecords: filteredInvoices.length,
                        description: "Full invoice backup including nested items"
                      },
                      data: filteredInvoices
                    };
                    const jsonContent = JSON.stringify(backupData, null, 2);
                    const date = new Date().toISOString().split('T')[0];
                    const fileName = `customer_invoice_backup_${date}.json`;
                    try {
                      if (window.showSaveFilePicker) {
                        const handle = await window.showSaveFilePicker({
                          suggestedName: fileName,
                          types: [{
                            description: 'JSON Backup File',
                            accept: { 'application/json': ['.json'] },
                          }],
                        });
                        const writable = await handle.createWritable();
                        await writable.write(jsonContent);
                        await writable.close();
                        return;
                      }
                      throw new Error("File System Access API not supported");
                    } catch (err) {
                      if (err.name !== 'AbortError') {
                        const blob = new Blob([jsonContent], { type: "application/json" });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = fileName;
                        a.click();
                        window.URL.revokeObjectURL(url);
                      }
                    }
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                  Export
                </button>
              </div>
            </div>

            {/* Header with Action Buttons */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h2 style={{ margin: 0 }}>
                All Invoices
                <span style={{ fontSize: "14px", fontWeight: 400, color: "#888", marginLeft: "10px" }}>
                  ({visibleInvoices.length} records)
                </span>
                {selectedIds.length > 0 && (
                  <span style={{ fontSize: "14px", fontWeight: 400, color: "#666", marginLeft: "12px" }}>
                    {selectedIds.length} selected
                  </span>
                )}
              </h2>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                {selectedInvoiceId && (
                  <button
                    style={{ padding: "8px 16px", backgroundColor: "#1976d2", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}
                    onClick={handlePrint}
                  >
                    🖨️ Print Receipt
                  </button>
                )}
                {!praLinked && selectedIds.length > 0 && (
                  <button
                    style={{ padding: "8px 16px", backgroundColor: "#d32f2f", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}
                    onClick={handleBulkDelete}
                  >
                    🗑️ Delete ({selectedIds.length})
                  </button>
                )}
              </div>
            </div>
            {fetchError && <p style={{ color: "red", marginBottom: "10px" }}>{fetchError}</p>}
            <TableContainer component={Paper}
              sx={{
                maxHeight: 300,
              }}
            >
              <Table size="small">
                <TableHead>
                  {invoices.length > 0 && (
                    <TableRow sx={{ height: "28px" }}>
                      {!praLinked && (
                        <TableCell
                          padding="checkbox"
                          sx={{ border: "1px solid #ccc", backgroundColor: "#f5f5f5", padding: "0 4px", width: "40px" }}
                        >
                          <Tooltip title={selectedIds.length === visibleInvoices.length && visibleInvoices.length > 0 ? "Deselect all" : "Select all"}>
                            <Checkbox
                              size="small"
                              indeterminate={selectedIds.length > 0 && selectedIds.length < visibleInvoices.length}
                              checked={visibleInvoices.length > 0 && selectedIds.length === visibleInvoices.length}
                              onChange={handleSelectAll}
                            />
                          </Tooltip>
                        </TableCell>
                      )}
                      {renderTableHeader()}
                    </TableRow>
                  )}
                </TableHead>
                <TableBody>
                  {visibleInvoices
                    .map((inv) => (
                      <TableRow
                        key={inv.id}
                        hover
                        selected={inv.id === selectedInvoiceId}
                        onClick={() => handleRowClick(inv)}
                        sx={{
                          cursor: "pointer",
                          height: "28px",
                          ...(selectedIds.includes(inv.id) && { backgroundColor: "rgba(25,118,210,0.08)" }),
                        }}
                      >
                        {!praLinked && (
                          <TableCell
                            padding="checkbox"
                            sx={{ border: "1px solid #ddd", padding: "0 4px", width: "40px" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              size="small"
                              checked={selectedIds.includes(inv.id)}
                              onChange={(e) => handleToggleSelect(e, inv.id)}
                            />
                          </TableCell>
                        )}
                        {renderTableRow(inv)}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </section>

          {/* Bottom Section: Invoice Items */}
          <section className="invoice-section">
            <h2>Invoice Items</h2>
            {itemError && <p style={{ color: "red", marginBottom: "10px" }}>{itemError}</p>}

            {selectedInvoiceItems.length > 0 ? (
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ height: "28px" }}>
                      {INVOICE_ITEM_COLUMNS_TO_DISPLAY.map((col) => (
                        <TableCell
                          key={col.key}
                          sx={{
                            border: "1px solid #ccc",
                            fontWeight: "bold",
                            backgroundColor: "#f5f5f5",
                            fontSize: "12px",
                            padding: "4px 8px",
                          }}
                        >
                          {col.header}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedInvoiceItems.map((item, index) => (
                      <TableRow key={index} sx={{ height: "28px" }}>
                        {INVOICE_ITEM_COLUMNS_TO_DISPLAY.map((col) => {
                          const value = col.formatter
                            ? col.formatter(item, gstIncluded)
                            : item[col.key];
                          return (
                            <TableCell
                              key={col.key}
                              sx={{
                                border: "1px solid #ddd",
                                fontSize: "12px",
                                padding: "4px 8px",
                              }}
                            >
                              {value ?? ""}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <p style={{ color: "#555" }}>Please select an invoice above to view its items.</p>
            )}
          </section>

          {/* Sales Report Section */}
          {showSalesReport && (
            <SalesReportSection
              salesReportData={salesReportData}
              setSalesReportData={setSalesReportData}
              filteredInvoices={filteredInvoices}
              fromDate={fromDate}
              toDate={toDate}
              sortConfig={sortConfig}
              setSortConfig={setSortConfig}
            />
          )}
          </LocalizationProvider>

        </main>
      </div>
    </>
  );
}

export default Invoice;
