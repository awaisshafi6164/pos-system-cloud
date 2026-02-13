import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Card,
  CardContent,
  TextField,
  Box,
  Typography,
  Button,
} from "@mui/material";
import {
  TrendingUp,
  ShoppingCart,
  Receipt,
  AttachMoney,
  Download,
  Print,
} from "@mui/icons-material";

const SalesReportSection = ({ 
  salesReportData, 
  setSalesReportData,
  filteredInvoices, 
  fromDate, 
  toDate,
  sortConfig,
  setSortConfig 
}) => {
  const [reportSearchText, setReportSearchText] = useState("");

  const handleDownloadCSV = () => {
    const headers = ["Item Code", "Item Name", "Quantity", "Sales"];
    const rows = filteredReportData.map(item => [
      item.itemCode,
      item.itemName,
      item.totalQuantity,
      item.totalSales.toFixed(2)
    ]);
    const totalRow = [
      "Total",
      "",
      filteredReportData.reduce((sum, item) => sum + item.totalQuantity, 0),
      filteredReportData.reduce((sum, item) => sum + item.totalSales, 0).toFixed(2)
    ];
    
    const csvContent = [
      `Sales Report (${fromDate} to ${toDate})`,
      `Gross Sales,${grossSales.toFixed(2)}`,
      `Total Tax,${totalTax.toFixed(2)}`,
      `Net Revenue,${netRevenue.toFixed(2)}`,
      `Avg Order Value,${avgOrderValue.toFixed(2)}`,
      "",
      headers.join(","),
      ...rows.map(row => row.join(",")),
      totalRow.join(",")
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${fromDate}-to-${toDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Sales Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #667eea; margin-bottom: 5px; }
            .date-range { color: #6b7280; margin-bottom: 20px; }
            .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .metric { border: 2px solid #e5e7eb; padding: 15px; border-radius: 8px; }
            .metric-label { font-size: 12px; color: #6b7280; font-weight: 600; }
            .metric-value { font-size: 20px; font-weight: 800; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: 700; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .total-row { background-color: #f3f4f6; font-weight: 800; }
            .text-right { text-align: right; }
            @media print { body { padding: 10px; } }
          </style>
        </head>
        <body>
          <h1>Executive Sales Dashboard</h1>
          <div class="date-range">${fromDate} to ${toDate}</div>
          <div class="metrics">
            <div class="metric">
              <div class="metric-label">GROSS SALES</div>
              <div class="metric-value">Rs. ${grossSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div class="metric">
              <div class="metric-label">TOTAL TAX</div>
              <div class="metric-value">Rs. ${totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div class="metric">
              <div class="metric-label">NET REVENUE</div>
              <div class="metric-value">Rs. ${netRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div class="metric">
              <div class="metric-label">AVG ORDER VALUE</div>
              <div class="metric-value">Rs. ${avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
          </div>
          <h2>Item-wise Performance</h2>
          <table>
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Item Name</th>
                <th class="text-right">Quantity</th>
                <th class="text-right">Sales</th>
              </tr>
            </thead>
            <tbody>
              ${filteredReportData.map(item => `
                <tr>
                  <td>${item.itemCode}</td>
                  <td>${item.itemName}</td>
                  <td class="text-right">${item.totalQuantity.toLocaleString()}</td>
                  <td class="text-right">Rs. ${item.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="2">Total</td>
                <td class="text-right">${filteredReportData.reduce((sum, item) => sum + item.totalQuantity, 0).toLocaleString()}</td>
                <td class="text-right">Rs. ${filteredReportData.reduce((sum, item) => sum + item.totalSales, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Calculate metrics
  const totalTax = filteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.TotalTaxCharged || 0), 0);
  const grossSales = filteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.TotalSaleValue || 0), 0);
  const netRevenue = filteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.TotalBillAmount || 0), 0);
  const avgOrderValue = filteredInvoices.length > 0 ? netRevenue / filteredInvoices.length : 0;

  // Filter report data
  const filteredReportData = salesReportData.filter(item =>
    item.itemName.toLowerCase().includes(reportSearchText.toLowerCase()) ||
    item.itemCode.toLowerCase().includes(reportSearchText.toLowerCase())
  );

  if (salesReportData.length === 0) {
    return (
      <section className="invoice-section" style={{ marginTop: "20px" }}>
        <Box sx={{
          textAlign: "center",
          py: 8,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: "16px",
          color: "white"
        }}>
          <Receipt sx={{ fontSize: 80, opacity: 0.3, mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>No Data Found</Typography>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            No invoices found in the selected date range
          </Typography>
        </Box>
      </section>
    );
  }

  return (
    <section className="invoice-section" style={{ marginTop: "20px" }}>
      {/* Header */}
      <Box sx={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        borderRadius: "16px 16px 0 0",
        p: 4,
        color: "white",
        position: "relative",
        overflow: "hidden"
      }}>
        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, letterSpacing: "-0.5px" }}>
            Executive Sales Dashboard
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.95 }}>
            {fromDate} to {toDate}
          </Typography>
        </Box>
        <Box sx={{
          position: "absolute",
          top: -50,
          right: -50,
          width: 150,
          height: 150,
          background: "rgba(255,255,255,0.1)",
          borderRadius: "50%"
        }} />
      </Box>

      {/* KPI Cards */}
      <Box sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 3,
        p: 3,
        background: "#fff",
        borderLeft: "1px solid #e5e7eb",
        borderRight: "1px solid #e5e7eb"
      }}>
        <Card sx={{
          background: "linear-gradient(135deg, #667eea15 0%, #764ba215 100%)",
          border: "2px solid #667eea30",
          borderRadius: 3,
          transition: "all 0.3s",
          "&:hover": { transform: "translateY(-4px)", boxShadow: "0 12px 24px rgba(102,126,234,0.2)" }
        }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Receipt sx={{ color: "#667eea", fontSize: 24 }} />
              <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 600, letterSpacing: 0.5 }}>
                GROSS SALES
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "#667eea" }}>
              Rs. {grossSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{
          background: "linear-gradient(135deg, #f093fb15 0%, #f5576c15 100%)",
          border: "2px solid #f093fb30",
          borderRadius: 3,
          transition: "all 0.3s",
          "&:hover": { transform: "translateY(-4px)", boxShadow: "0 12px 24px rgba(245,87,108,0.2)" }
        }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <TrendingUp sx={{ color: "#f5576c", fontSize: 24 }} />
              <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 600, letterSpacing: 0.5 }}>
                TOTAL TAX
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "#f5576c" }}>
              Rs. {totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{
          background: "linear-gradient(135deg, #4facfe15 0%, #00f2fe15 100%)",
          border: "2px solid #4facfe30",
          borderRadius: 3,
          transition: "all 0.3s",
          "&:hover": { transform: "translateY(-4px)", boxShadow: "0 12px 24px rgba(79,172,254,0.2)" }
        }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <AttachMoney sx={{ color: "#00a8cc", fontSize: 24 }} />
              <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 600, letterSpacing: 0.5 }}>
                NET REVENUE
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "#00a8cc" }}>
              Rs. {netRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{
          background: "linear-gradient(135deg, #fa709a15 0%, #fee14015 100%)",
          border: "2px solid #fa709a30",
          borderRadius: 3,
          transition: "all 0.3s",
          "&:hover": { transform: "translateY(-4px)", boxShadow: "0 12px 24px rgba(250,112,154,0.2)" }
        }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <ShoppingCart sx={{ color: "#fa709a", fontSize: 24 }} />
              <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 600, letterSpacing: 0.5 }}>
                AVG ORDER VALUE
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "#fa709a" }}>
              Rs. {avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Table Section */}
      <Box sx={{ background: "#fff", p: 3, borderRadius: "0 0 16px 16px", border: "1px solid #e5e7eb" }}>
        <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#1f2937" }}>
            Item-wise Performance
          </Typography>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <TextField
              size="small"
              placeholder="🔍 Search items..."
              value={reportSearchText}
              onChange={(e) => setReportSearchText(e.target.value)}
              sx={{
                minWidth: 250,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  background: "#f9fafb"
                }
              }}
            />
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleDownloadCSV}
              sx={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                textTransform: "none",
                fontWeight: 600,
                "&:hover": {
                  background: "linear-gradient(135deg, #5568d3 0%, #65408b 100%)"
                }
              }}
            >
              CSV
            </Button>
            <Button
              variant="contained"
              startIcon={<Print />}
              onClick={handlePrint}
              sx={{
                background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                textTransform: "none",
                fontWeight: 600,
                "&:hover": {
                  background: "linear-gradient(135deg, #3e9be7 0%, #00d9e5 100%)"
                }
              }}
            >
              Print
            </Button>
          </Box>
        </Box>

        <TableContainer component={Paper} sx={{ 
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)", 
          borderRadius: 3, 
          maxHeight: 500,
          overflow: "auto"
        }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: "#374151",
                  background: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
                  borderBottom: "2px solid #e5e7eb",
                  cursor: "pointer"
                }} onClick={() => {
                  const direction = sortConfig.key === 'itemCode' && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                  setSortConfig({ key: 'itemCode', direction });
                  setSalesReportData([...salesReportData].sort((a, b) =>
                    direction === 'asc' ? a.itemCode.localeCompare(b.itemCode) : b.itemCode.localeCompare(a.itemCode)
                  ));
                }}>
                  Item Code {sortConfig.key === 'itemCode' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </TableCell>
                <TableCell sx={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: "#374151",
                  background: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
                  borderBottom: "2px solid #e5e7eb",
                  cursor: "pointer"
                }} onClick={() => {
                  const direction = sortConfig.key === 'itemName' && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                  setSortConfig({ key: 'itemName', direction });
                  setSalesReportData([...salesReportData].sort((a, b) =>
                    direction === 'asc' ? a.itemName.localeCompare(b.itemName) : b.itemName.localeCompare(a.itemName)
                  ));
                }}>
                  Item Name {sortConfig.key === 'itemName' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </TableCell>
                <TableCell align="right" sx={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: "#374151",
                  background: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
                  borderBottom: "2px solid #e5e7eb",
                  cursor: "pointer"
                }} onClick={() => {
                  const direction = sortConfig.key === 'totalQuantity' && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                  setSortConfig({ key: 'totalQuantity', direction });
                  setSalesReportData([...salesReportData].sort((a, b) =>
                    direction === 'asc' ? a.totalQuantity - b.totalQuantity : b.totalQuantity - a.totalQuantity
                  ));
                }}>
                  Quantity {sortConfig.key === 'totalQuantity' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </TableCell>
                <TableCell align="right" sx={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: "#374151",
                  background: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
                  borderBottom: "2px solid #e5e7eb",
                  cursor: "pointer"
                }} onClick={() => {
                  const direction = sortConfig.key === 'totalSales' && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                  setSortConfig({ key: 'totalSales', direction });
                  setSalesReportData([...salesReportData].sort((a, b) =>
                    direction === 'asc' ? a.totalSales - b.totalSales : b.totalSales - a.totalSales
                  ));
                }}>
                  Sales {sortConfig.key === 'totalSales' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </TableCell>

              </TableRow>
            </TableHead>
            <TableBody>
              {filteredReportData.map((item, index) => {
                return (
                  <TableRow key={index} sx={{
                    backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb",
                    "&:hover": { background: "#f3f4f6" },
                    transition: "background 0.2s"
                  }}>
                    <TableCell sx={{ fontSize: 14, fontWeight: 600, color: "#667eea" }}>
                      {item.itemCode}
                    </TableCell>
                    <TableCell sx={{ fontSize: 14, color: "#4b5563" }}>
                      {item.itemName}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: 14, fontWeight: 600, color: "#1f2937" }}>
                      {item.totalQuantity.toLocaleString()}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: 14, fontWeight: 700, color: "#00a8cc" }}>
                      Rs. {item.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>

                  </TableRow>
                );
              })}
              <TableRow sx={{ background: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)" }}>
                <TableCell colSpan={2} sx={{ fontSize: 15, fontWeight: 800, color: "#1f2937", borderTop: "2px solid #e5e7eb" }}>
                  Total
                </TableCell>
                <TableCell align="right" sx={{ fontSize: 15, fontWeight: 800, color: "#1f2937", borderTop: "2px solid #e5e7eb" }}>
                  {filteredReportData.reduce((sum, item) => sum + item.totalQuantity, 0).toLocaleString()}
                </TableCell>
                <TableCell align="right" sx={{ fontSize: 15, fontWeight: 800, color: "#00a8cc", borderTop: "2px solid #e5e7eb" }}>
                  Rs. {filteredReportData.reduce((sum, item) => sum + item.totalSales, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </section>
  );
};

export default SalesReportSection;
