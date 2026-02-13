// src/components/Receipt.js
import React, { useEffect, useState, useRef } from "react";
// import { useLocation } from "react-router-dom";
import { useLocation, useNavigate } from "react-router-dom";
import settingsManager from "../utils/SettingsManager";
import employeeManager from "../utils/EmployeeManager";
import { QRCodeSVG } from "qrcode.react";
import "./receipt.css"; // Assuming you have a CSS file for styling

const Receipt = () => {
  const { state } = useLocation();
  
  const {
    customer,
    billing,
    selectedMenuItems,
    praInvoiceNumber
  } = state || {};

  const [user] = useState(employeeManager.getEmployee());
  const [settings, setSettings] = useState({
    restaurant_name: "",
    address: "",
    ntn_number: "",
    strn_number: "",
    phone_no: "",
    pra_linked: "0",
    logo_path: "",
  });

  // 🔗 Use actual PRA invoice number for QR code
  const qrData = `https://reg.pra.punjab.gov.pk/IMSFiscalReport/SearchPOSInvoice_Report.aspx?PRAInvNo=${praInvoiceNumber || "Unknown"}`;
  const hasPrintedRef = useRef(false);
  const navigate = useNavigate();
  useEffect(() => {
    const loadSettings = async () => {
      const s = await settingsManager.fetchSettings();
      if (s) setSettings(s);
    };
    loadSettings();

    if (!hasPrintedRef.current) {
      hasPrintedRef.current = true;
      setTimeout(() => {
        window.print();
        // navigate("/pos");
        navigate(-1);
      }, 500);
    }
  }, [navigate]);

  return (
    <div className="receipt-print-area">
      <div className="receipt-print-area">
        {settings.logo_path && (
          <div style={{ textAlign: "center", marginBottom: "10px", paddingTop: "5px" }}>
            <img src={settings.logo_path} alt="Logo" style={{ height: "60px", maxWidth: "200px", objectFit: "contain" }} />
          </div>
        )}
        <h2 style={{ textAlign: "center" }}>{settings.restaurant_name || "Restaurant Name"}</h2>
        <p style={{ textAlign: "center" }}>
          {settings.restaurant_address || "Restaurant Address"}<br />
          NTN: {settings.ntn_number || "--------"}<br />
          STRN: {settings.strn_number || "--------"}<br />
          Phone: {settings.phone_no || "--------"}<br />
          FOM: {user?.name || "Guest"}
        </p>

        <hr />
        <p><strong>Invoice #:</strong> {customer?.invoiceNumber}</p>
        {customer?.name && <p><strong>Customer:</strong> {customer.name}</p>}
        {customer?.cnic && <p><strong>CNIC:</strong> {customer.cnic}</p>}
        {customer?.pntn && <p><strong>PNTN:</strong> {customer.pntn}</p>}
        {customer?.contact && <p><strong>Contact:</strong> {customer.contact}</p>}
        {customer?.address && <p><strong>Address:</strong> {customer.address}</p>}
        {customer?.checkInDate && <p><strong>Check-in:</strong> {customer.checkInDate.split(' ')[0]} | {customer.timeIn}</p>}
        {customer?.checkOutDate && <p><strong>Check-out:</strong> {customer.checkOutDate.split(' ')[0]} | {customer.timeOut}</p>}
        {!customer?.checkInDate && <p><strong>Date:</strong> {customer?.dateTime}</p>}

        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid black" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid black", textAlign: "center" }}>Sr.</th>
              <th style={{ border: "1px solid black", textAlign: "left", paddingLeft: "6px" }}>Name</th>
              <th style={{ border: "1px solid black", textAlign: "center" }}>Price</th>
              <th style={{ border: "1px solid black", textAlign: "center" }}>Qty</th>
              <th style={{ border: "1px solid black", textAlign: "center" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {selectedMenuItems?.map((item, index) => {
              const isRoom = item.itemName.toLowerCase().includes('room');
              
              return (
                <tr key={index}>
                  <td style={{ border: "1px solid black", textAlign: "center" }}>{index + 1}</td>
                  <td style={{ border: "1px solid black", textAlign: "left", paddingLeft: "6px" }}>{item.itemName}</td>
                  <td style={{ border: "1px solid black", textAlign: "center" }}>{item.itemPrice}</td>
                  <td style={{ border: "1px solid black", textAlign: "center" }}>
                    {isRoom ? "/Day" : item.quantity}
                  </td>
                  <td style={{ border: "1px solid black", textAlign: "center" }}>
                    {(item.itemPrice * item.quantity)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>No. of Items:</strong><span>{billing?.itemCount}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>Item Cost:</strong><span>{billing?.itemCost}</span>
          </div>
          {billing?.gstAmount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>GST:</strong><span>{billing?.gstAmount}</span>
            </div>
          )}
          {billing?.posCharges > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>POS Charges:</strong><span>{billing.posCharges}</span>
            </div>
          )}
          {billing?.serviceCharges > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>Service Charges:</strong><span>{billing.serviceCharges}</span>
            </div>
          )}
          {billing?.discount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>Discount:</strong><span>{billing.discount}</span>
            </div>
          )}
          {billing?.balance > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>Balance:</strong><span>{billing.balance}</span>
            </div>
          )}
          {billing?.paid > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>Paid:</strong><span>{billing.paid}</span>
            </div>
          )}
        </div>

        <hr />
        <h3 style={{ textAlign: "right" }}>Total Payable: {billing?.totalPayable}</h3>

        {settings.pra_linked === "1" && (
          <>
            <hr />
            <p style={{ textAlign: "center" }}>
              PRA Invoice ID: <strong>{praInvoiceNumber || "N/A"}</strong><br />
              <QRCodeSVG value={qrData} size={100} />
            </p>
          </>
        )}
        <hr />
        <p style={{ textAlign: "center" }}>
          Developed By: KAAF Devs<br />
          Contact No: 0339-4098238
        </p>
      </div>
    </div>
  );
};

export default Receipt;
