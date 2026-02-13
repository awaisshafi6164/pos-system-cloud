
import React, { useState, useEffect, useCallback } from "react";
import "./css/vendors.css";
import Header from "./components/header";
import Sidebar from "./components/sidebar";
import API_BASE_URL from './config';

function calcOrderSummary(order) {
  const paid = order.payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = order.total - paid;
  let status = "Unpaid";
  if (paid === 0) status = "Unpaid";
  else if (balance === 0) status = "Paid";
  else status = "Partial";
  return { paid, balance, status };
}


export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const selectedVendor = vendors.find(v => v.id === selectedVendorId) || null;
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [vendorForm, setVendorForm] = useState({ name: "", contactPerson: "", phone: "", address: "" });
  // Purchase Order Modal State
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderForm, setOrderForm] = useState({ id: null, date: "", items: [{ code: "", name: "", qty: 1, unitPrice: 0 }], payments: [], total: 0 });
  // Payment Modal State
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ orderId: null, date: "", amount: 0 });
  // Payment History Modal
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [historyOrder, setHistoryOrder] = useState(null);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/vendor/get_all.php`);
      const data = await response.json();
      if (response.ok) {
        setVendors(data);
        setError(null);
      } else {
        throw new Error(data.error || "Failed to fetch vendors");
      }
    } catch (err) {
      setError(err.message);
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // Add/Edit Vendor
  const handleVendorFormSubmit = async (e) => {
    e.preventDefault();
    const url = vendorForm.id ? `${API_BASE_URL}/vendor/update.php` : `${API_BASE_URL}/vendor/add.php`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendorForm)
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      
      setShowVendorForm(false);
      setVendorForm({ name: "", contactPerson: "", phone: "", address: "" });
      fetchVendors(); // Refresh data
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Delete Vendor
  const handleDeleteVendor = async (id) => {
    if (window.confirm("Delete this vendor? This will also delete all associated orders and payments.")) {
      try {
        const response = await fetch(`${API_BASE_URL}/vendor/delete.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        if (selectedVendorId === id) setSelectedVendorId(null);
        fetchVendors(); // Refresh data
      } catch (err) {
        alert(`Error: ${err.message}`);
      }
    }
  };

  // Vendor Financial Summary
  const getVendorSummary = (vendor) => {
    if (!vendor || !vendor.orders) return { totalPurchased: 0, totalPaid: 0, totalOutstanding: 0 };
    let totalPurchased = 0, totalPaid = 0;
    vendor.orders.forEach(order => {
      totalPurchased += order.total;
      if (order.payments) {
        totalPaid += order.payments.reduce((sum, p) => sum + p.amount, 0);
      }
    });
    return { totalPurchased, totalPaid, totalOutstanding: totalPurchased - totalPaid };
  };

  // Add/Edit Purchase Order
  const handleOrderFormSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVendor) {
      alert("No vendor selected.");
      return;
    }

    const orderData = {
      ...orderForm,
      vendor_id: selectedVendor.id,
    };

    const url = orderForm.id ? `${API_BASE_URL}/vendor/update_order.php` : `${API_BASE_URL}/vendor/add_order.php`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      // First, get the response as text to check if it's valid JSON
      const responseText = await response.text();

      try {
        const result = JSON.parse(responseText); // Now, try to parse it
        if (!result.success) {
          throw new Error(result.error || 'The API returned an error.');
        }
        setShowOrderForm(false);
        fetchVendors(); // Refresh data
      } catch (jsonError) {
        // This will catch errors if the responseText is not valid JSON (i.e., it's an HTML error page)
        console.error("The server returned an invalid response. This is likely a PHP error. Raw server response:", responseText);
        throw new Error(`Server returned an invalid response. Check the browser's developer console for the full PHP error message.`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Delete Purchase Order
  const handleDeleteOrder = async (orderId) => {
    if (window.confirm("Delete this purchase order? This action cannot be undone.")) {
      try {
        const response = await fetch(`${API_BASE_URL}/vendor/delete_order.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: orderId })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error || "Failed to delete order.");
        fetchVendors(); // Refresh data
      } catch (err) {
        alert(`Error: ${err.message}`);
      }
    }
  };

  // Record Payment
  const handlePaymentFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/vendor/add_payment.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentForm)
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || "Failed to record payment.");
      setShowPaymentForm(false);
      fetchVendors(); // Refresh data
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Handler for changes in purchase order items
  const handleOrderItemChange = (index, field, value) => {
    const newItems = [...orderForm.items];
    newItems[index][field] = value;
    setOrderForm({ ...orderForm, items: newItems });
  };

  if (loading) {
    return <div>Loading...</div>;
  }
  if (error) {
    return <div style={{ color: 'red', padding: '2rem' }}>Error: {error}</div>;
  }

  return (
    <>
      <Header />
      <div className="main-container">
        <Sidebar />
        <main className="content">
          <div className="vendors-page">
            <div className="page-header">
              <h1>Vendors Management</h1>
              <button className="btn btn-primary" onClick={() => { setShowVendorForm(true); setVendorForm({ name: "", contactPerson: "", phone: "", address: "" }); }}>Add Vendor</button>
            </div>
            {/* Vendor List (Top) */}
            <div className="vendors-list">
              <div className="vendors-list-header">
                <h2>Vendors</h2>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Phone</th>
                    <th>Address</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map(v => (
                    <tr
                      onClick={() => setSelectedVendorId(v.id)}
                      key={v.id}
                      className={selectedVendor && selectedVendor.id === v.id ? "selected" : ""}
                    >
                      <td>{v.name}</td>
                      <td>{v.contactPerson}</td>
                      <td>{v.phone}</td>
                      <td>{v.address}</td>
                      <td className="vendor-actions" onClick={e => e.stopPropagation()}>
                        <button className="btn btn-secondary" onClick={() => {
                          setShowVendorForm(true);
                          setVendorForm({ ...v });
                        }}>Edit</button>
                        <button className="btn btn-danger" onClick={() => handleDeleteVendor(v.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vendor Detail & Orders (Below) */}
            <div className="vendor-detail">
              {selectedVendor ? (
                <>
                  <h2>{selectedVendor.name} <span >({selectedVendor.contactPerson})</span></h2>
                  <div className="vendor-summary">
                    {(() => {
                      const s = getVendorSummary(selectedVendor);
                      return (
                        <>
                          <div className="summary-item">
                            Total Purchased
                            <b>{s.totalPurchased.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</b>
                          </div>
                          <div className="summary-item">
                            Total Paid
                            <b>{s.totalPaid.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</b>
                          </div>
                          <div className="summary-item">
                            Total Outstanding
                            <b>{s.totalOutstanding.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</b>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <div className="vendor-detail-actions">
                    <button onClick={() => {
                      setOrderForm({ id: null, date: new Date().toISOString().slice(0, 10), items: [{ code: '', name: '', qty: 1, unitPrice: 0 }], payments: [], total: 0 });
                      setShowOrderForm(true);
                    }} className="btn btn-success">Add Purchase Order</button>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Items</th>
                        <th>Total</th>
                        <th>Paid</th>
                        <th>Balance</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedVendor.orders && selectedVendor.orders.map(order => {
                        const summary = calcOrderSummary(order);
                        return (
                          <tr key={order.id}>
                            <td>{order.date}</td>
                            <td>
                              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                                {order.items.map((item, idx) => (
                                  <li key={idx}>{item.name} ({item.code}) x {item.qty} @ {item.unitPrice}</li>
                                ))}
                              </ul>
                            </td>
                            <td>{order.total.toLocaleString()}</td>
                            <td>{summary.paid.toLocaleString()}</td>
                            <td>{summary.balance.toLocaleString()}</td>
                            <td>
                              <span className={`status-badge ${summary.status.toLowerCase()}`}>
                                {summary.status}
                              </span>
                            </td>
                            <td className="vendor-order-actions">
                              <button className="btn btn-secondary" onClick={e => {
                                e.stopPropagation();
                                setOrderForm({ ...order });
                                setShowOrderForm(true);
                              }}>Edit</button>
                              <button className="btn btn-primary" onClick={e => {
                                e.stopPropagation();
                                setPaymentForm({ orderId: order.id, date: new Date().toISOString().slice(0, 10), amount: 0 });
                                setShowPaymentForm(true);
                              }}>Record Payment</button>
                              <button className="btn btn-danger" onClick={e => {
                                e.stopPropagation();
                                handleDeleteOrder(order.id);
                              }}>Delete</button>
                              <button className="btn btn-info" onClick={e => {
                                e.stopPropagation();
                                setHistoryOrder(order);
                                setShowPaymentHistory(true);
                              }}>History</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              ) : (
                <div className="vendor-detail-placeholder">Select a vendor from the list above to see their details and purchase history.</div>
              )}
            </div>

            {/* Vendor Form Modal */}
            {showVendorForm && (
              <div className="modal">
                <div className="modal-content">
                  <h2>{vendorForm.id ? "Edit Vendor" : "Add Vendor"}</h2>
                  <form onSubmit={handleVendorFormSubmit} noValidate>
                    <div className="form-group">
                      <label htmlFor="vendorName">Name*</label>
                      <input id="vendorName" value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="vendorContact">Contact Person</label>
                      <input id="vendorContact" value={vendorForm.contactPerson} onChange={e => setVendorForm({ ...vendorForm, contactPerson: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label htmlFor="vendorPhone">Phone</label>
                      <input id="vendorPhone" value={vendorForm.phone} onChange={e => setVendorForm({ ...vendorForm, phone: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label htmlFor="vendorAddress">Address</label>
                      <input id="vendorAddress" value={vendorForm.address} onChange={e => setVendorForm({ ...vendorForm, address: e.target.value })} />
                    </div>
                    <div className="modal-actions">
                      <button type="button" className="btn btn-secondary" onClick={() => { setShowVendorForm(false); setVendorForm({ name: "", contactPerson: "", phone: "", address: "" }); }}>Cancel</button>
                      <button type="submit" className="btn btn-primary">Save</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Purchase Order Modal */}
            {showOrderForm && (
              <div className="modal">
                <div className="modal-content modal-content-lg">
                  <h2>{orderForm.id ? "Edit Purchase Order" : "Add Purchase Order"}</h2>
                  <form onSubmit={handleOrderFormSubmit} noValidate>
                    <div className="form-group">
                      <label htmlFor="orderDate">Date*</label>
                      <input id="orderDate" type="date" value={orderForm.date} onChange={e => setOrderForm({ ...orderForm, date: e.target.value })} required />
                    </div>
                    <div className="form-section">
                      <label>Items</label>
                      {orderForm.items.map((item, idx) => (
                        <div key={idx} className="form-item-row">
                          <input className="item-code" placeholder="Code" value={item.code} onChange={e => handleOrderItemChange(idx, 'code', e.target.value)} />
                          <input className="item-name" placeholder="Name" value={item.name} onChange={e => handleOrderItemChange(idx, 'name', e.target.value)} />
                          <input className="item-qty" type="number" min="1" placeholder="Qty" value={item.qty} onChange={e => handleOrderItemChange(idx, 'qty', e.target.value)} />
                          <input className="item-price" type="number" min="0" placeholder="Unit Price" value={item.unitPrice} onChange={e => handleOrderItemChange(idx, 'unitPrice', e.target.value)} />
                          <button type="button" className="btn btn-icon btn-danger" onClick={() => {
                            setOrderForm({ ...orderForm, items: orderForm.items.filter((_, i) => i !== idx) });
                          }}>x</button>
                        </div>
                      ))}
                      <button type="button" className="btn btn-secondary" onClick={() => setOrderForm({ ...orderForm, items: [...orderForm.items, { code: '', name: '', qty: 1, unitPrice: 0 }] })}>Add Item</button>
                    </div>
                    <div className="modal-actions">
                      <button type="button" className="btn btn-secondary" onClick={() => setShowOrderForm(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary">Save</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Payment Modal */}
            {showPaymentForm && (
              <div className="modal">
                <div className="modal-content">
                  <h2>Record Payment</h2>
                  <form onSubmit={handlePaymentFormSubmit} noValidate>
                    <div className="form-group">
                      <label htmlFor="paymentDate">Date*</label>
                      <input id="paymentDate" type="date" value={paymentForm.date} onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="paymentAmount">Amount*</label>
                      <input id="paymentAmount" type="number" min="0.01" step="0.01" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} required />
                    </div>
                    <div className="modal-actions">
                      <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentForm(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary">Save</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Payment History Modal */}
            {showPaymentHistory && historyOrder && (
              <div className="modal">
                <div className="modal-content">
                  <h2>Payment History for Order #{historyOrder.id.toString().slice(-6)}</h2>
                  <p><strong>Order Date:</strong> {historyOrder.date}</p>
                  <p><strong>Total Amount:</strong> {historyOrder.total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
                  <table>
                    <thead>
                      <tr>
                        <th>Payment Date</th>
                        <th>Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyOrder.payments.length > 0 ? (
                        historyOrder.payments.map((p, i) => (
                          <tr key={i}>
                            <td>{p.date}</td>
                            <td>{p.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                          </tr>
                        ))
                      ) : (<tr><td colSpan="2" style={{ textAlign: 'center' }}>No payments recorded for this order.</td></tr>)}
                    </tbody>
                  </table>
                  <div className="modal-actions"><button className="btn btn-secondary" onClick={() => setShowPaymentHistory(false)}>Close</button></div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  );
}
