import React, { useEffect, useState, useRef } from "react";
import "./css/pos.css";
// import "./css/common.css";
import Header from "./components/header";
import Sidebar from "./components/sidebar";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
} from "@mui/material";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DesktopDateTimePicker } from '@mui/x-date-pickers/DesktopDateTimePicker';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import dayjs from 'dayjs';
import { useNavigate } from "react-router-dom";
import settingsManager from "./utils/SettingsManager";
import { ToastContainer, toast } from "react-toastify";
import { getMenuItems, getCategories, getNextUSIN, saveInvoiceToPOS, getTotalSales, updateStockQuantities } from "./api/posApi";

const POS = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedMenuItems, setSelectedMenuItems] = useState([]);
  const [itemCount, setItemCount] = useState(0);
  const [itemCost, setitemCost] = useState(0);
  const [gstAmount, setGstAmount] = useState(0);
  const [totalPayable, setTotalPayable] = useState(0);
  const [posCharges, setPosCharges] = useState(0);
  const [serviceCharges, setServiceCharges] = useState();
  const [serviceChargesType, setServiceChargesType] = useState("0");
  const [serviceChargesPercentage, setServiceChargesPercentage] = useState(0);
  const [discount, setDiscount] = useState();
  const [balance, setBalance] = useState();
  const [paid, setPaid] = useState();
  const [currentDateTime, setCurrentDateTime] = useState("");
  const [gstPercentage, setGstPercentage] = useState(0);
  const [gstIncluded, setGstIncluded] = useState(false);
  const [showInvoiceNo, setShowInvoiceNo] = useState(true);
  const [showCnic, setShowCnic] = useState(true);
  const [showPaid, setShowPaid] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [showBuyerPntn, setShowBuyerPntn] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [showAddress, setShowAddress] = useState(true);
  const [showCustomerName, setShowCustomerName] = useState(true);
  const [lastPRAInvoice, setLastPRAInvoice] = useState("");
  const [showMenuStockQty, setShowMenuStockQty] = useState(true);
  const [make_invoice_editable, setMakeInvoiceEditable] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [isCreditInvoice, setIsCreditInvoice] = useState(false);
  const [originalInvoiceItems, setOriginalInvoiceItems] = useState([]); // Track original quantities for credit invoices
  const isInvoiceLoading = useRef(false);

  // Total Sale Summary State
  const [totalSaleFromDate, setTotalSaleFromDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [totalSaleToDate, setTotalSaleToDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });


  const fetchMenu = async () => {
    try {
      const data = await getMenuItems();
      setMenuItems(data);
    } catch (err) {
      console.error("Failed to fetch menu items:", err);
    }
  };

  const fetchNextUSIN = async () => {
    try {
      const data = await getNextUSIN();
      const invoiceInput = document.getElementById("invoice-number");
      if (invoiceInput) {
        if (data.success && data.next_usin) {
          invoiceInput.value = data.next_usin;
        } else {
          invoiceInput.value = "";
          invoiceInput.placeholder = "Invoice No (e.g., LR-01)";
        }
      }
    } catch (error) {
      console.error("❌ Error fetching next USIN:", error);
      const invoiceInput = document.getElementById("invoice-number");
      if (invoiceInput) {
        invoiceInput.value = "";
        invoiceInput.placeholder = "Enter your invoice number (e.g., LR-01, 001)";
      }
    }
  };

  const handleLookupInvoice = async () => {
    const invoiceNo = document.getElementById("invoice-number").value.trim();
    if (!invoiceNo) {
      toast.error("Please enter an invoice number.");
      return;
    }

    try {
      const res = await fetch(`http://localhost/restaurant-pos/api/customer/check_invoice.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ usin: invoiceNo }),
      });

      const data = await res.json();

      if (data.success && data.invoice) {
        toast.success("✅ Invoice found! Data populated.");

        // Populate customer information fields
        const customerNameInput = document.getElementById("customer-name");
        const cnicInput = document.getElementById("cnic");
        const pntnInput = document.getElementById("pntn");
        const contactInput = document.getElementById("contact-no");
        const addressInput = document.getElementById("address");

        // Use common column name variations (adjust based on your actual column names)
        if (customerNameInput) customerNameInput.value = data.invoice.BuyerName || data.invoice.buyer_name || "";
        if (cnicInput) cnicInput.value = data.invoice.BuyerCNIC || data.invoice.buyer_cnic || "";
        if (pntnInput) pntnInput.value = data.invoice.BuyerPNTN || data.invoice.buyer_pntn || "";
        if (contactInput) contactInput.value = data.invoice.BuyerPhoneNumber || data.invoice.buyer_phone || "";
        if (addressInput) addressInput.value = data.invoice.address || "";

        // Populate billing fields from invoice data
        setPosCharges(parseFloat(data.invoice.POS_Charges || data.invoice.pos_charges || 0));

        // Load service charges type from settings and handle accordingly
        const settings = await settingsManager.fetchSettings();
        const settingsServiceChargesType = settings?.service_charges_type || "0";
        const settingsServiceChargesPercentage = parseFloat(settings?.service_charges || 0);

        setServiceChargesType(settingsServiceChargesType);

        if (settingsServiceChargesType === "1") {
          // Percentage type: store the percentage value
          setServiceChargesPercentage(settingsServiceChargesPercentage);
          // Use stored amount from invoice, prevent auto-calc overwrite
          isInvoiceLoading.current = true;
          setServiceCharges(parseFloat(data.invoice.Service_Charges || data.invoice.service_charges || 0));
        } else {
          // Fixed type: use the stored Rs amount from invoice
          setServiceCharges(parseFloat(data.invoice.Service_Charges || data.invoice.service_charges || 0));
        }

        setDiscount(parseFloat(data.invoice.Discount || data.invoice.discount || 0));
        setBalance(parseFloat(data.invoice.Balance || data.invoice.balance || 0));
        // Calculate paid as: paid = payable - balance
        const invoicePayable = parseFloat(data.invoice.TotalBillAmount || data.invoice.TotalBillAmount || 0);
        const invoiceBalance = parseFloat(data.invoice.Balance || data.invoice.balance || 0);
        const calculatedPaid = invoicePayable - invoiceBalance;
        setPaid(calculatedPaid);

        // Set payment mode radio button
        if (data.invoice.PaymentMode || data.invoice.payment_mode) {
          const paymentModeMap = {
            1: "cash",
            2: "card",
            5: "mixed",
            6: "online"
          };
          const paymentModeValue = data.invoice.PaymentMode || data.invoice.payment_mode;
          const paymentMode = paymentModeMap[paymentModeValue];
          if (paymentMode) {
            const paymentRadio = document.querySelector(`input[name="payment-mode"][value="${paymentMode}"]`);
            if (paymentRadio) paymentRadio.checked = true;
          }
        }

        // Clear existing selected items and populate from invoice
        setSelectedRows([]);
        setSelectedMenuItems([]);

        if (data.invoice.Items && data.invoice.Items.length > 0) {
          const newSelectedRows = [];
          const newSelectedMenuItems = [];
          const originalItems = []; // 👈 Track original quantities
          const updatedMenuItems = [...menuItems]; // Create a mutable copy

          data.invoice.Items.forEach(invoiceItem => {
            // Find the menu item by ItemCode to get full details
            const itemCode = invoiceItem.ItemCode || invoiceItem.item_code;
            const originalQuantity = parseInt(invoiceItem.Quantity || invoiceItem.quantity) || 1;
            const saleValue = parseFloat(invoiceItem.SaleValue || invoiceItem.sale_value || 0);

            // Calculate the price per single unit
            const unitPrice = originalQuantity > 0 ? saleValue / originalQuantity : 0;

            const menuItemIndex = updatedMenuItems.findIndex(mi => mi.itemCode === itemCode);

            // 👈 Store original item data for stock calculations
            originalItems.push({
              itemCode: itemCode,
              originalQuantity: originalQuantity
            });

            if (menuItemIndex !== -1) {
              const menuItem = updatedMenuItems[menuItemIndex];
              // Update the price in the main menu list
              updatedMenuItems[menuItemIndex] = {
                ...menuItem,
                itemPrice: unitPrice
              };

              newSelectedRows.push(itemCode);
              newSelectedMenuItems.push({
                ...menuItem,
                itemPrice: unitPrice, // Use the calculated unit price
                quantity: originalQuantity
              });
            } else {
              // If menu item not found, create a basic item from invoice data
              const newItem = {
                itemCode: itemCode,
                itemName: invoiceItem.ItemName || invoiceItem.item_name,
                itemPrice: unitPrice,
                quantity: originalQuantity,
                itemCategory: "Unknown", // Default category
                stockQty: 0 // Assume 0 stock for items not in the menu
              };
              newSelectedRows.push(itemCode);
              newSelectedMenuItems.push(newItem);

              // Also add this new item to the main menu list so it's visible and editable
              updatedMenuItems.push({
                itemCode: newItem.itemCode,
                itemName: newItem.itemName,
                itemPrice: newItem.itemPrice,
                itemCategory: newItem.itemCategory,
                stockQty: newItem.stockQty
              });
            }
          });

          setMenuItems(updatedMenuItems);
          setSelectedRows(newSelectedRows);
          setSelectedMenuItems(newSelectedMenuItems);
          setOriginalInvoiceItems(originalItems); // 👈 Store original quantities
        }

        // Update API message to show loaded invoice info
        document.getElementById("api-message").textContent =
          `📄 Loaded Invoice: ${invoiceNo} (${data.invoice.BuyerName || data.invoice.buyer_name || 'Unknown Customer'})`;

        setIsSaving(false); // 🔓 Re-enable after reset

        // Reset flag after state settles
        setTimeout(() => {
          isInvoiceLoading.current = false;
        }, 1000);
      } else {
        toast.error(`❌ ${data.message || "Invoice not found"}`);
      }
    } catch (error) {
      console.error("❌ Lookup error:", error);
      toast.error("Server error occurred.");
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };

    // Set initial datetime
    const now = new Date();
    const pad = (n) => (n < 10 ? "0" + n : n);
    const formatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setCurrentDateTime(formatted);

    fetchNextUSIN();
    fetchCategories();
    fetchMenu();

    const loadSettings = async () => {
      try {
        const settings = await settingsManager.fetchSettings();
        if (settings) {
          const gst = parseFloat(settings.gst_percentage || 0);
          setGstPercentage(gst); // 👈 store in state
          const gstIncluded = settings.gst_included === "1"; // 👈 convert to boolean
          setGstIncluded(gstIncluded);
          const showInvoiceNo = settings.show_invoice_no === "1";
          setShowInvoiceNo(showInvoiceNo);
          const showCnic = settings.show_cnic === "1";
          setShowCnic(showCnic);
          const makeInvoiceEditable = settings.make_invoice_editable === "1";
          setMakeInvoiceEditable(makeInvoiceEditable);
          const showPaid = settings.show_paid === "1";
          setShowPaid(showPaid);
          const showBalance = settings.show_balance === "1";
          setShowBalance(showBalance);
          const showBuyerPntn = settings.show_buyerPNTN === "1";
          setShowBuyerPntn(showBuyerPntn);
          const showDate = settings.show_date === "1";
          setShowDate(showDate);
          const showAddress = settings.show_address === "1";
          setShowAddress(showAddress);
          const showCustomerName = settings.show_customer_name === "1";
          setShowCustomerName(showCustomerName);
          const showMenuStockQty = settings.show_menu_stock_qty === "1";
          setShowMenuStockQty(showMenuStockQty);
          setGstAmount((prevCost) => +(prevCost * (gst / 100)).toFixed(2));
          setPosCharges(parseFloat(settings.pos_charges || 0));

          const sType = settings.service_charges_type || "0";
          const sVal = parseFloat(settings.service_charges || 0);
          setServiceChargesType(sType);

          if (sType === "1") {
            setServiceChargesPercentage(sVal);
            // serviceCharges amount will be calculated by the useEffect
          } else {
            setServiceCharges(sVal);
          }
        } else {
          console.warn("⚠️ No settings found");
        }
      } catch (error) {
        console.error("❌ Failed to load settings from SettingsManager:", error);
      }
    };


    loadSettings();

  }, []);

  useEffect(() => {
    const count = selectedMenuItems.reduce((sum, item) => sum + item.quantity, 0);
    const rawCost = selectedMenuItems.reduce((sum, item) => sum + (item.itemPrice * item.quantity), 0);

    let netitemCost = rawCost;
    let gst = 0;

    if (gstIncluded) {
      // GST is already in the price → extract it
      netitemCost = +(rawCost / (1 + gstPercentage / 100)).toFixed(2);
      gst = +(rawCost - netitemCost).toFixed(2);
    } else {
      // GST is not in price → add it on top
      gst = +(rawCost * (gstPercentage / 100)).toFixed(2);
    }

    const total =
      netitemCost
      + gst
      + parseFloat(posCharges || 0)
      + parseFloat(serviceCharges || 0)
      - parseFloat(discount || 0);
    // - parseFloat(balance || 0);

    setItemCount(count);
    setitemCost(netitemCost.toFixed(2));
    setGstAmount(gst);
    setTotalPayable(total.toFixed(2));

    setBalance((total - parseFloat(paid || 0)).toFixed(2));
  }, [selectedMenuItems, posCharges, serviceCharges, discount, balance, paid, gstPercentage, gstIncluded]);

  // New useEffect to handle Service Charges Calculation
  useEffect(() => {
    if (serviceChargesType === "1") {
      if (isInvoiceLoading.current) return; // Skip calculation if loading invoice

      const baseAmount = parseFloat(itemCost) + parseFloat(gstAmount);
      const newServiceCharges = +(baseAmount * (serviceChargesPercentage / 100)).toFixed(2);
      // Only update if the value is different to avoid unnecessary loops
      setServiceCharges(prev => {
        if (parseFloat(prev) !== newServiceCharges) {
          return newServiceCharges;
        }
        return prev;
      });
    }
  }, [itemCost, gstAmount, serviceChargesType, serviceChargesPercentage]);

  const filteredItems = menuItems.filter(
    (item) => categoryFilter === "" || item.itemCategory === categoryFilter
  );

  const handleRowClick = (itemCode) => {
    const isAlreadySelected = selectedRows.includes(itemCode);

    if (isAlreadySelected) {
      // Unselect and remove from selectedMenuItems
      setSelectedRows(prev => prev.filter(code => code !== itemCode));
      setSelectedMenuItems(prev => prev.filter(item => item.itemCode !== itemCode));
    } else {
      // Select and add to selectedMenuItems
      const item = menuItems.find(i => i.itemCode === itemCode);
      if (item) {
        // ✅ Stock check before adding
        if (showMenuStockQty && item.stockQty <= 0) {
          toast.error(`${item.itemName} is out of stock.`);
          return;
        }
        setSelectedRows(prev => [...prev, itemCode]);
        setSelectedMenuItems(prev => [...prev, { ...item, quantity: 1 }]);
      }
    }
  };

  const handleReset = async () => {
    // Reset customer input fields
    const customerNameInput = document.getElementById("customer-name");
    const cnicInput = document.getElementById("cnic");
    const pntnInput = document.getElementById("pntn");
    const contactInput = document.getElementById("contact-no");
    const addressInput = document.getElementById("address");

    if (customerNameInput) { !showCustomerName ? customerNameInput.value = "Walk in Customer" : customerNameInput.value = "" };
    if (cnicInput) cnicInput.value = "";
    if (pntnInput) pntnInput.value = "";
    if (contactInput) contactInput.value = "";
    if (addressInput) addressInput.value = "";
    document.getElementById("api-message").textContent = "🗒️ Note";

    // 👈 Reset invoice type to "new" (default)
    const newInvoiceRadio = document.querySelector('input[name="invoice-type"][value="new"]');
    const creditInvoiceRadio = document.querySelector('input[name="invoice-type"][value="credit"]');

    if (newInvoiceRadio) newInvoiceRadio.checked = true;
    if (creditInvoiceRadio) creditInvoiceRadio.checked = false;
    setIsCreditInvoice(false);
    setIsSaving(false); // 🔓 Re-enable after reset

    fetchNextUSIN();
    fetchMenu(); // Refresh menu to show updated stock

    setSelectedRows([]);
    setSelectedMenuItems([]);
    setOriginalInvoiceItems([]); // 👈 Clear original items
    setItemCount(0);
    setitemCost(0);
    setGstAmount(0);
    setDiscount(0);
    setBalance(0);
    setPaid(0);
    setTotalPayable(0);
    setSearchText("");

    // 🔁 Fetch values from settings
    try {
      const settings = await settingsManager.fetchSettings();
      if (settings) {
        setPosCharges(parseFloat(settings.pos_charges || 0));

        const sType = settings.service_charges_type || "0";
        const sVal = parseFloat(settings.service_charges || 0);
        setServiceChargesType(sType);

        if (sType === "1") {
          setServiceChargesPercentage(sVal);
          setServiceCharges(0); // Reset to 0, will be recalculated
        } else {
          setServiceCharges(sVal);
        }
      }
    } catch (err) {
      console.error("❌ Failed to reload settings in handleReset:", err);
      setPosCharges(0);
      setServiceCharges();
      setServiceChargesType("0");
    }
  };

  const handleSave = async () => {
    setIsSaving(true); // 🔒 Disable button initially

    try {
      const settings = await settingsManager.fetchSettings();
      if (!settings) {
        document.getElementById("api-message").textContent =
          "❌ Error: Failed to load settings.";
        setIsSaving(false); // 🔓 Enable on error
        return;
      }

      const { pra_posid, pra_token, pra_api_type, pra_linked } = settings;

      const getPaymentCode = (mode) => {
        switch (mode) {
          case "cash": return 1;
          case "card": return 2;
          case "mixed": return 5;
          case "online": return 6;
          default: return 1;
        }
      };

      const getInvoiceTypeCode = (type) => {
        switch (type) {
          case "new": return 1;
          case "credit": return 3;
          default: return 1;
        }
      };

      const paymentMode = document.querySelector('input[name="payment-mode"]:checked')?.value;
      const invoiceType = document.querySelector('input[name="invoice-type"]:checked')?.value;
      const isCreditUpdate = invoiceType === "credit";

      // Calculate actual service charges value from current field value
      const actualServiceCharges = parseFloat(document.getElementById("service-charges")?.value || 0);
      const furtherTaxValue = parseFloat(posCharges || 0) + actualServiceCharges;

      const payload = {
        InvoiceNumber: "",
        POSID: parseInt(pra_posid),
        USIN: document.getElementById("invoice-number").value,
        RefUSIN: null,
        DateTime: currentDateTime.replace("T", " ") + ":00",
        BuyerName: document.getElementById("customer-name").value || "Walk-in Customer",
        BuyerPNTN: document.getElementById("pntn").value,
        BuyerCNIC: document.getElementById("cnic").value,
        BuyerPhoneNumber: document.getElementById("contact-no").value,
        TotalSaleValue: parseFloat(itemCost),
        TotalTaxCharged: parseFloat(gstAmount),
        Discount: parseFloat(discount) || 0,
        FurtherTax: furtherTaxValue,
        TotalBillAmount: parseFloat(totalPayable),
        TotalQuantity: parseInt(itemCount),
        PaymentMode: paymentMode === "online" ? 1 : getPaymentCode(paymentMode),
        InvoiceType: getInvoiceTypeCode(invoiceType),
        Items: selectedMenuItems.map(item => {
          const rawValue = item.itemPrice * item.quantity;
          let taxCharged = 0;
          let totalAmount = rawValue;

          if (gstIncluded) {
            const base = +(rawValue / (1 + gstPercentage / 100)).toFixed(2);
            taxCharged = +(rawValue - base).toFixed(2);
            totalAmount = rawValue; // Tax already included in price
          } else {
            taxCharged = +(rawValue * (gstPercentage / 100)).toFixed(2);
            totalAmount = rawValue + taxCharged; // Add tax on top
          }

          return {
            ItemCode: item.itemCode,
            ItemName: item.itemName,
            PCTCode: "01011000",
            Quantity: item.quantity,
            TaxRate: gstPercentage,
            SaleValue: item.itemPrice * item.quantity,
            Discount: 0.0,
            FurtherTax: 0.0,
            TaxCharged: taxCharged,
            TotalAmount: totalAmount,
            InvoiceType: getInvoiceTypeCode(invoiceType),
            RefUSIN: null,
          };
        })
      };

      // Conditionally send to PRA ONLY for new invoices (not credit updates)
      if (pra_linked === "1") {
        const praURL =
          pra_api_type === "production"
            ? "https://ims.pral.com.pk/ims/production/api/Live/PostData"
            : "https://ims.pral.com.pk/ims/sandbox/api/Live/PostData";

        console.log("📤 Sending to PRA API:", praURL);
        const praResponse = await fetch(praURL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${pra_token}`
          },
          body: JSON.stringify(payload)
        });

        const praResult = await praResponse.json();
        console.log("✅ PRA API Response:", praResult);

        if (praResult.Code !== "100") {
          document.getElementById("api-message").textContent = "❌ PRA Error: " + praResult.Response;
          setIsSaving(false);
          return;
        }

        payload.InvoiceNumber = praResult.InvoiceNumber;
        setLastPRAInvoice(praResult.InvoiceNumber);
      } else {
        console.log("📦 PRA not linked, skipping PRA API call.");
        payload.InvoiceNumber = payload.USIN; // Use USIN as InvoiceNumber when not sending to PRA
      }

      const localPayload = {
        ...payload,
        address: document.getElementById("address").value || "",
        POS_Charges: parseFloat(posCharges || 0),
        Service_Charges: actualServiceCharges,
        Balance: parseFloat(balance || 0),
        Paid: parseFloat(paid || 0),
        PaymentMode: getPaymentCode(paymentMode)
      };

      console.log("📦 Sending to local POS DB...");
      const result = await saveInvoiceToPOS(localPayload);

      if (result.success) {
        const actionText = isCreditUpdate ? "updated" : "saved";
        const successMessage = pra_linked === "1" && !isCreditUpdate
          ? `✅ Invoice ${actionText} successfully. PRA #: ${payload.InvoiceNumber}`
          : `✅ Invoice ${actionText} successfully. Invoice #: ${payload.InvoiceNumber}`;
        document.getElementById("api-message").textContent = successMessage;

        // ✅ Smart stock quantity updates
        if (showMenuStockQty) {
          let stockUpdateItems = [];

          if (isCreditUpdate && originalInvoiceItems.length > 0) {
            // 👈 CREDIT INVOICE: Calculate differences
            console.log("📊 Credit invoice - calculating stock differences...");

            selectedMenuItems.forEach(currentItem => {
              const originalItem = originalInvoiceItems.find(orig => orig.itemCode === currentItem.itemCode);

              if (originalItem) {
                // Item existed in original invoice
                const quantityDifference = currentItem.quantity - originalItem.originalQuantity;

                if (quantityDifference !== 0) {
                  stockUpdateItems.push({
                    itemCode: currentItem.itemCode,
                    quantity: quantityDifference, // Positive = subtract more stock, Negative = add back to stock
                    isUpdate: true
                  });
                  console.log(`📊 ${currentItem.itemName}: Original=${originalItem.originalQuantity}, New=${currentItem.quantity}, Difference=${quantityDifference}`);
                }
              } else {
                // New item added to credit invoice
                stockUpdateItems.push({
                  itemCode: currentItem.itemCode,
                  quantity: currentItem.quantity,
                  isUpdate: true
                });
                console.log(`📊 ${currentItem.itemName}: New item added with quantity=${currentItem.quantity}`);
              }
            });

            // Check for items removed from credit invoice
            originalInvoiceItems.forEach(originalItem => {
              const stillExists = selectedMenuItems.find(current => current.itemCode === originalItem.itemCode);

              if (!stillExists) {
                // Item was completely removed - add back to stock
                stockUpdateItems.push({
                  itemCode: originalItem.itemCode,
                  quantity: -originalItem.originalQuantity, // Negative to add back to stock
                  isUpdate: true
                });
                console.log(`📊 Item ${originalItem.itemCode}: Removed from invoice, adding back ${originalItem.originalQuantity} to stock`);
              }
            });

          } else {
            // 👈 NEW INVOICE: Subtract all quantities from stock
            stockUpdateItems = selectedMenuItems.map(item => ({
              itemCode: item.itemCode,
              quantity: item.quantity,
              isUpdate: false
            }));
          }

          if (stockUpdateItems.length > 0) {
            console.log("📦 Stock update payload:", stockUpdateItems);

            // 👈 Call with just the items array (not wrapped in an object)
            await updateStockQuantities(stockUpdateItems);
          } else {
            console.log("📦 No stock changes needed");
          }
        }

      } else {
        document.getElementById("api-message").textContent =
          `❌ POS DB Error: ${result.error}`;
        setIsSaving(false); // 🔓 Enable on error
      }
    } catch (err) {
      console.error("❌ Save error:", err);
      document.getElementById("api-message").textContent =
        `❌ Network error: ${err.message}`;
      setIsSaving(false); // 🔓 Enable on error
    }
  };

  const navigate = useNavigate();

  const handlePrint = (praInvoiceNumber) => {
    const invoiceInput = document.getElementById("invoice-number");
    const customerInput = document.getElementById("customer-name");
    const cnicInput = document.getElementById("cnic");
    const pntnInput = document.getElementById("pntn");
    const contactInput = document.getElementById("contact-no");
    const addressInput = document.getElementById("address");

    if (!invoiceInput || !customerInput) {
      console.error("❌ Required input fields not found in DOM.");
      return;
    }

    navigate("/receipt", {
      state: {
        customer: {
          invoiceNumber: invoiceInput.value,
          name: customerInput.value || "Walk-in Customer",
          cnic: cnicInput?.value || "",
          pntn: pntnInput?.value || "",
          contact: contactInput?.value || "",
          address: addressInput?.value || "",
          dateTime: currentDateTime,
        },
        billing: {
          itemCount,
          itemCost,
          gstAmount,
          posCharges,
          serviceCharges,
          discount,
          balance,
          paid,
          totalPayable,
        },
        selectedMenuItems,
        praInvoiceNumber, // passed in argument
      },
    });

  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Header />

      <div className="main-container">
        <Sidebar />
        <ToastContainer position="top-right" autoClose={3000} />

        <main className="content three-column-layout">
          {/* Left Section */}
          <section className="section left-section">
            <div className="vertical-subsection">
              {/* Left Top Section */}
              <div className="subsection top">
                <h3>Customer Information</h3>
                <div className="invoice-type-container">
                  <div className="invoice-type-tabs">
                    <label className={`invoice-type-tab ${!isCreditInvoice ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="invoice-type"
                        value="new"
                        defaultChecked
                        onChange={() => {
                          handleReset();
                          setIsCreditInvoice(false);
                        }}
                        style={{ display: "none" }}
                      /> New
                    </label>
                    <label className={`invoice-type-tab ${isCreditInvoice ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="invoice-type"
                        value="credit"
                        onChange={() => {
                          setIsSaving(true);
                          setIsCreditInvoice(true);
                          const invoiceInput = document.getElementById("invoice-number");
                          if (invoiceInput) {
                            invoiceInput.readOnly = false;
                            invoiceInput.placeholder = "Enter Invoice No (e.g., LR-01)";
                          }
                        }}
                        style={{ display: "none" }}
                      /> Credit
                    </label>
                  </div>
                </div>

                <div className="horizontal-group" style={{ display: showInvoiceNo ? "flex" : "none" }}>
                  <label htmlFor="invoice-number">Invoice No*</label>
                  <input
                    type="text"
                    id="invoice-number"
                    placeholder={isCreditInvoice ? "Enter Invoice No (e.g., LR-01)" : "001"}
                    readOnly={!isCreditInvoice && !make_invoice_editable}
                    style={{ marginBottom: "5px" }}
                    tabIndex={1}
                  />
                  {isCreditInvoice && (
                    <button
                      className="btn btn-icon"
                      style={{ alignSelf: "flex-start", padding: "4px 10px", fontSize: "12px" }}
                      onClick={() => {
                        // Add your search logic here
                        // toast.info("🔍 Lookup button clicked!");
                        handleLookupInvoice();
                      }}
                    >🔍</button>
                  )}
                </div>


                {showCustomerName ? (
                  <div className="horizontal-group">
                    <label htmlFor="customer-name">Customer</label>
                    <input type="text" id="customer-name" placeholder="Customer Name" tabIndex={2} />
                  </div>
                ) : (
                  <div className="horizontal-group">
                    <label htmlFor="customer-name">Customer Type</label>
                    <select id="customer-name" className="form-control" tabIndex={2}>
                      <option value="Walk in Customer">Walk in Customer</option>
                      <option value="Parcel">Parcel</option>
                      <option value="Delivery">Delivery</option>
                    </select>
                  </div>
                )}
                <div className="horizontal-group"
                  style={{ display: showCnic ? "flex" : "none" }}
                >
                  <label htmlFor="cnic">CNIC</label>
                  <input type="text" id="cnic" placeholder="XXXXX-XXXXXXX-X" tabIndex={3} />
                </div>
                <div className="horizontal-group"
                  style={{ display: showBuyerPntn ? "flex" : "none" }}
                >
                  <label htmlFor="pntn">Buyer PNTN</label>
                  <input type="text" id="pntn" placeholder="Optional" tabIndex={4} />
                </div>
                <div className="horizontal-group"
                  style={{ display: showAddress ? "flex" : "none" }}
                >
                  <label htmlFor="address">Address</label>
                  <input type="tel" id="address" placeholder="address" tabIndex={5} />
                </div>
                <div className="horizontal-group">
                  <label htmlFor="contact-no">Contact</label>
                  <input type="tel" id="contact-no" placeholder="03XX-XXXXXXX" tabIndex={6} />
                </div>
                <div className="horizontal-group"
                  style={{ display: showDate ? "flex" : "none" }}
                >
                  <label htmlFor="datetime">Date-Time*</label>
                  <div style={{ flex: 1 }}>
                    <DesktopDateTimePicker
                      value={dayjs(currentDateTime)}
                      onChange={(newValue) => setCurrentDateTime(newValue.format('YYYY-MM-DDTHH:mm'))}
                      slotProps={{
                        textField: {
                          size: 'small',
                          tabIndex: 7,
                          sx: {
                            width: '100%',
                            '& .MuiInputBase-input': {
                              fontSize: '12px'
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Left Center Section */}
              <div className="subsection center">
                <h3>Billing Details</h3>

                <div className="horizontal-group">
                  <label htmlFor="item-count">No. of Items</label>
                  <input type="number" id="item-count" placeholder="0" min="0" readOnly value={itemCount} />
                </div>

                <div className="horizontal-group">
                  <label htmlFor="item-cost">Item Cost</label>
                  <input type="number" id="item-cost" placeholder="0" min="0" readOnly value={itemCost} />
                </div>

                {gstPercentage > 0 && (
                  <div className="horizontal-group">
                    <label htmlFor="gst">
                      GST ({gstPercentage}%) {gstIncluded ? " (INC)" : " (EXC)"}
                    </label>
                    <input
                      type="number"
                      id="gst"
                      placeholder="0"
                      min="0"
                      readOnly
                      value={gstAmount}
                    />
                  </div>
                )}

                {posCharges > 0 && (
                  <div className="horizontal-group">
                    <label htmlFor="pos-charges">POS</label>
                    <input
                      type="number"
                      id="pos-charges"
                      placeholder="0"
                      min="0"
                      readOnly
                      value={posCharges}
                      onChange={(e) => setPosCharges(e.target.value)}
                    />
                  </div>
                )}

                <div className="horizontal-group">
                  <label htmlFor="service-charges">Service</label>
                  <input
                    type="number"
                    id="service-charges"
                    placeholder="0"
                    min="0"
                    value={serviceCharges}
                    onChange={(e) => setServiceCharges(e.target.value)}
                  />
                </div>

                <div className="horizontal-group">
                  <label htmlFor="discount">Discount</label>
                  <input
                    type="number"
                    id="discount"
                    placeholder="0"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>

                <div className="horizontal-group">
                  <label htmlFor="payable">Total Payable</label>
                  <input type="number" id="payable" placeholder="0" readOnly value={totalPayable} />
                </div>

                <div className="horizontal-group"
                  style={{ display: showPaid ? "flex" : "none" }}
                >
                  <label htmlFor="paid">Paid</label>
                  <input
                    type="number"
                    id="paid"
                    placeholder="0"
                    min="0"
                    value={paid}
                    onChange={(e) => {
                      const paidValue = parseFloat(e.target.value);
                      setPaid(paidValue);
                      // recompute balance = totalPayable - paid
                      const tp = parseFloat(totalPayable) || 0;
                      setBalance(parseFloat((tp - paidValue).toFixed(2)));
                    }}
                  />
                </div>

                <div className="horizontal-group"
                  style={{ display: showBalance ? "flex" : "none" }}
                >
                  <label htmlFor="balance">Balance</label>
                  <input
                    type="number"
                    id="balance"
                    placeholder="0"
                    min="0"
                    value={balance}
                    onChange={(e) => {
                      const balanceValue = parseFloat(e.target.value);
                      setBalance(balanceValue);
                      // recompute paid = totalPayable - balance
                      const tp = parseFloat(totalPayable) || 0;
                      setPaid(parseFloat((tp - balanceValue).toFixed(2)));
                    }}
                  />
                </div>

                {/* Horizontal payment options */}
                <div className="horizontal-group">
                  <label style={{ marginRight: '10px' }}>Method:</label>
                  <label style={{ display: 'flex', alignItems: 'center' }}><input type="radio" name="payment-mode" value="cash" defaultChecked style={{ marginRight: '5px' }} /> Cash</label>
                  {/* <label style={{ display: 'flex', alignItems: 'center', marginRight: '10px' }}><input type="radio" name="payment-mode" value="card" style={{ marginRight: '5px' }}/> Card</label> */}
                  <label style={{ display: 'flex', alignItems: 'center' }}><input type="radio" name="payment-mode" value="online" style={{ marginRight: '5px' }} /> Online</label>
                  <label style={{ display: 'flex', alignItems: 'center' }}><input type="radio" name="payment-mode" value="mixed" style={{ marginRight: '5px' }} /> Mixed</label>
                </div>

                <div className="horizontal-group" id="action-buttons">
                  <button
                    className={`btn ${isSaving ? "btn-disabled" : "btn-primary"}`}
                    style={{
                      marginRight: "10px",
                      paddingLeft: "30px",
                      paddingRight: "30px",
                      opacity: isSaving ? 0.5 : 1,
                      cursor: isSaving ? "not-allowed" : "pointer",
                    }}
                    onClick={handleSave}
                    disabled={isSaving}
                    tabIndex={9}
                  >SAVE</button>

                  <button
                    className="btn btn-secondary"
                    style={{ marginRight: "10px", paddingLeft: "30px", paddingRight: "30px" }}
                    onClick={() => handlePrint(lastPRAInvoice)} // ✅ FIXED
                    tabIndex={10}
                  >
                    PRINT
                  </button>
                </div>
              </div>

            </div>
          </section>

          <section className="section center-section">
            <div className="menu-split-layout">
              <div className="menu-left">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "10px" }}>
                  <h2>Menu Section</h2>
                  <div className="search-box">
                    <input
                      type="text"
                      id="menu-item-search"
                      placeholder="Search menu items..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value.toLowerCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const filtered = [...filteredItems]
                            .sort((a, b) => {
                              const codeA = isNaN(Number(a.itemCode)) ? a.itemCode : Number(a.itemCode);
                              const codeB = isNaN(Number(b.itemCode)) ? b.itemCode : Number(b.itemCode);
                              if (typeof codeA === "number" && typeof codeB === "number") return codeA - codeB;
                              return String(codeA).localeCompare(String(codeB));
                            })
                            .filter((mu) => {
                              const matchesCategory = categoryFilter === "" || mu.itemCategory === categoryFilter;
                              const matchesSearch = mu.itemName.toLowerCase().includes(searchText) || mu.itemCode.toLowerCase().includes(searchText);
                              return matchesCategory && matchesSearch;
                            });
                          if (filtered.length > 0) {
                            handleRowClick(filtered[0].itemCode);
                            setSearchText("");
                          }
                        }
                      }}
                      tabIndex={8}
                    />
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={handleReset}
                    tabIndex={11}
                    style={{ marginLeft: "10px" }}
                  >Reset</button>
                </div>

                <div className="menu-table-container">
                  <TableContainer component={Paper}
                    sx={{
                      maxHeight: "100%",
                      border: 1,
                    }}
                  >
                    <Table sx={{ border: 1, borderColor: "divider" }} size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ borderRight: 1, borderColor: "divider", fontSize: 15, fontWeight: "bold", width: "15%" }}>Code</TableCell>
                          <TableCell sx={{ borderRight: 1, borderColor: "divider", fontSize: 15, fontWeight: "bold", width: showMenuStockQty ? "55%" : "70%" }}>Item</TableCell>
                          {showMenuStockQty && <TableCell sx={{ borderRight: 1, borderColor: "divider", fontSize: 15, fontWeight: "bold", width: "15%" }}>Stock</TableCell>}
                          <TableCell sx={{ fontSize: 15, fontWeight: "bold", width: "15%" }}>Price</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {[...filteredItems]
                          .sort((a, b) => {
                            const codeA = isNaN(Number(a.itemCode)) ? a.itemCode : Number(a.itemCode);
                            const codeB = isNaN(Number(b.itemCode)) ? b.itemCode : Number(b.itemCode);
                            if (typeof codeA === "number" && typeof codeB === "number") {
                              return codeA - codeB;
                            }
                            return String(codeA).localeCompare(String(codeB));
                          })
                          .filter((mu) => {
                            const matchesCategory = categoryFilter === "" || mu.itemCategory === categoryFilter;
                            const matchesSearch = mu.itemName.toLowerCase().includes(searchText) ||
                              mu.itemCode.toLowerCase().includes(searchText);
                            return matchesCategory && matchesSearch;
                          })
                          .map((item, index) => {
                            const selected = selectedRows.includes(item.itemCode);
                            return (
                              <TableRow
                                key={item.itemCode}
                                hover
                                onClick={() => handleRowClick(item.itemCode)}
                                selected={selected}
                                sx={{
                                  cursor: "pointer",
                                  '&.Mui-selected': {
                                    backgroundColor: '#cfe8fbff !important',
                                  },
                                  borderBottom: "1px solid #ddd",
                                  height: "26px"
                                }}
                              >

                                <TableCell sx={{ borderRight: 1, borderColor: "divider", fontSize: 15, textAlign: "center" }}>{item.itemCode}</TableCell>
                                <TableCell sx={{ borderRight: 1, borderColor: "divider", fontSize: 15 }}>{item.itemName}</TableCell>
                                {showMenuStockQty && (
                                  <TableCell sx={{ borderRight: 1, borderColor: "divider", fontSize: 15, textAlign: "center" }}>{item.stockQty || 0}</TableCell>
                                )}
                                <TableCell
                                  sx={{ fontSize: 15, textAlign: "center" }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="number"
                                    value={item.itemPrice}
                                    onChange={(e) => {
                                      const newPrice = parseFloat(e.target.value);
                                      if (!isNaN(newPrice) && newPrice >= 0) {
                                        setMenuItems(prev => prev.map(menuItem =>
                                          menuItem.itemCode === item.itemCode ? { ...menuItem, itemPrice: newPrice } : menuItem
                                        ));
                                      }
                                    }}
                                    style={{ width: "60px", textAlign: "center", border: "1px solid #ccc", borderRadius: "3px", padding: "2px" }}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </div>
              </div>

              {/* Right Side: Category Buttons */}
              <div className="menu-right">
                <button className={`category-btn ${categoryFilter === "" ? "active" : ""}`} onClick={() => setCategoryFilter("")}>All</button>
                {categories.map((cat, index) => (
                  <button key={index} className={`category-btn ${categoryFilter === cat ? "active" : ""}`} onClick={() => setCategoryFilter(cat)}>{cat}</button>
                ))}
              </div>
            </div>
          </section>

          {/* Right Section */}
          <section className="section right-section">
            {/* Center: Selected Items */}
            <div className="right-top">
              <h2>Selected Items</h2>
              <div className="selected-items-table-container">
                <table className="selected-items-table" style={{ borderCollapse: "collapse", width: "100%", fontFamily: "Arial", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#fff", height: "26px", borderBottom: "1px solid #ddd" }}>
                      <th style={{ border: "1px solid #000", textAlign: "center" }}>Code</th>
                      <th style={{ border: "1px solid #000", textAlign: "left" }}>Item</th>
                      <th style={{ border: "1px solid #000" }}></th>
                      <th style={{ border: "1px solid #000", textAlign: "center" }}>Qty</th>
                      <th style={{ border: "1px solid #000" }}></th>
                      <th style={{ border: "1px solid #000", textAlign: "center" }}>Price</th>
                      <th style={{ border: "1px solid #000" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMenuItems.map((item, index) => (
                      <tr key={index} style={{ height: "26px", borderBottom: "1px solid #ddd" }}>
                        <td style={{ border: "1px solid #000", textAlign: "center" }}>{item.itemCode}</td>
                        <td style={{ border: "1px solid #000", textAlign: "left" }}>{item.itemName}</td>
                        <td style={{ border: "1px solid #000", textAlign: "center" }}>
                          <button className="qty-btn" onClick={() => {
                            setSelectedMenuItems(prev =>
                              prev.map((itm, idx) =>
                                idx === index
                                  ? { ...itm, quantity: Math.max(1, itm.quantity - 1) }
                                  : itm
                              )
                            );
                          }}>−</button>
                        </td>
                        <td style={{ border: "1px solid #000", textAlign: "center" }}>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const newQty = parseInt(e.target.value, 10);

                              if (isNaN(newQty) || newQty < 1) return;

                              if (showMenuStockQty && newQty > item.stockQty) {
                                toast.warn(`Only ${item.stockQty} of ${item.itemName} available.`);
                                return;
                              }

                              setSelectedMenuItems(prev =>
                                prev.map((itm, idx) =>
                                  idx === index ? { ...itm, quantity: newQty } : itm
                                )
                              );
                            }}
                            style={{
                              width: "50px",
                              textAlign: "center",
                              fontSize: "13px",
                              padding: "2px"
                            }}
                          />
                        </td>

                        <td style={{ border: "1px solid #000", textAlign: "center" }}>
                          <button className="qty-btn" onClick={() => {
                            const currentItem = selectedMenuItems[index];
                            // ✅ Perform check outside the state updater
                            if (showMenuStockQty && currentItem.quantity + 1 > currentItem.stockQty) {
                              toast.warn(`Only ${currentItem.stockQty} of ${currentItem.itemName} available.`);
                              return; // Exit without updating state
                            }

                            // If check passes, update the state
                            setSelectedMenuItems(prev =>
                              prev.map((itm, idx) =>
                                idx === index
                                  ? { ...itm, quantity: itm.quantity + 1 }
                                  : itm
                              )
                            );
                          }}>+</button>
                        </td>
                        <td style={{ border: "1px solid #000", textAlign: "center" }}>{(item.itemPrice * item.quantity).toFixed(2)}</td>
                        <td style={{ border: "1px solid #000", textAlign: "center" }}>
                          <button className="del-btn" onClick={() => {
                            setSelectedMenuItems(prev => prev.filter((_, idx) => idx !== index));
                            setSelectedRows(prev => prev.filter(code => code !== item.itemCode));
                          }}>x</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Center: Sales Summary Section */}
            <div
              className="right-center"
              style={{
                // backgroundColor: "#f0f8ff",
                border: "2px solid #000",
                padding: "10px",
                marginTop: "10px",
                borderRadius: "5px",
              }}
            >
              <h3>Total Sale Summary</h3>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <label htmlFor="from-date" style={{ fontSize: "12px", fontWeight: "500" }}>From:</label>
                <DesktopDatePicker
                  value={totalSaleFromDate ? dayjs(totalSaleFromDate, 'YYYY-MM-DD') : null}
                  onChange={(newValue) => setTotalSaleFromDate(newValue ? newValue.format('YYYY-MM-DD') : "")}
                  slotProps={{
                    textField: {
                      size: "small",
                      sx: {
                        width: '130px',
                        '& .MuiInputBase-input': { fontSize: '12px', padding: '6px 10px' }
                      }
                    }
                  }}
                />

                <label htmlFor="to-date" style={{ fontSize: "12px", fontWeight: "500" }}>To:</label>
                <DesktopDatePicker
                  value={totalSaleToDate ? dayjs(totalSaleToDate, 'YYYY-MM-DD') : null}
                  onChange={(newValue) => setTotalSaleToDate(newValue ? newValue.format('YYYY-MM-DD') : "")}
                  slotProps={{
                    textField: {
                      size: "small",
                      sx: {
                        width: '130px',
                        '& .MuiInputBase-input': { fontSize: '12px', padding: '6px 10px' }
                      }
                    }
                  }}
                />

                <label htmlFor="total-sale">Total Sale:</label>
                <input
                  type="text"
                  id="total-sale"
                  readOnly
                  style={{ padding: "5px", width: "120px" }}>

                </input>

                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    const fromDate = totalSaleFromDate;
                    const toDate = totalSaleToDate;
                    const totalSaleInput = document.getElementById("total-sale");

                    if (!fromDate || !toDate) {
                      toast.error("Please select both From and To dates.");
                      return;
                    }

                    try {
                      const data = await getTotalSales(fromDate, toDate);
                      if (data.success) {
                        const total = parseFloat(data.total);
                        totalSaleInput.value = isNaN(total) ? "0.00" : total.toFixed(2);
                      } else {
                        totalSaleInput.value = "0.00";
                        // alert("Error: " + data.error);
                        toast.error("Error: " + data.error);
                      }
                    } catch (err) {
                      console.error("❌ Total sale fetch failed:", err);
                      // alert("Failed to fetch total sale");
                      toast.error("Failed to fetch total sale");
                    }
                  }}
                >
                  Show
                </button>
              </div>
            </div>

            {/* Bottom: API Message */}
            <div className="right-bottom">
              <div id="api-message" className="api-message" style={{ marginTop: "10px" }}>🗒️ Note</div>
            </div>
          </section>

        </main>

      </div>
    </LocalizationProvider>
  );
};

export default POS;

