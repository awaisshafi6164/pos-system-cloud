import React, { useEffect, useState, useCallback, useRef } from "react";
import "./css/pos.css";
// import "./css/common.css";
import Header from "./components/header";
import Sidebar from "./components/sidebar";
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
} from "@mui/material";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import { DesktopTimePicker } from '@mui/x-date-pickers/DesktopTimePicker';
import dayjs from 'dayjs';
import { useNavigate } from "react-router-dom";
import settingsManager from "./utils/SettingsManager";
import { ToastContainer, toast } from "react-toastify";
import { useAuth } from "./context/AuthContext";
import { getCategoriesFromMenuItems, listMenuItems } from "./api/menuItemsApi";
import { lookupInvoiceLegacy, saveInvoiceLegacy, getTotalSalesLegacy } from "./api/invoicesApi";
import { applyMenuStockUpdates } from "./api/stockApi";
import { getBookedRoomsForDate } from "./api/bookedRoomsApi";
import { getNextUsin } from "./api/invoiceNumberApi";

const HotelPOS = () => {
    const { employee, loading: authLoading } = useAuth();
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [categoryFilter, setCategoryFilter] = useState("");
    const [selectedRows, setSelectedRows] = useState([]);
    const [selectedMenuItems, setSelectedMenuItems] = useState([]);
    const [itemCount, setItemCount] = useState(0);
    const [foodCount, setFoodCount] = useState(0);
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
    const [make_invoice_editable, setMakeInvoiceEditable] = useState(true);
    const [room_food_both, setRoomFoodBoth] = useState(true);
    const [lock_booked_room, setLockBookedRoom] = useState(false);
    const [search_using_name, setSearchUsingName] = useState(false);
    const [showEmergencyContact, setShowEmergencyContact] = useState(true);
    const [showPaid, setShowPaid] = useState(true);
    const [showBalance, setShowBalance] = useState(true);
    const [showBuyerPntn, setShowBuyerPntn] = useState(true);
    const [showDate, setShowDate] = useState(true);
    const [showAddress, setShowAddress] = useState(true);
    const [showCustomerName, setShowCustomerName] = useState(true);
    const [lastPRAInvoice, setLastPRAInvoice] = useState("");
    const [showMenuStockQty, setShowMenuStockQty] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [isCreditInvoice, setIsCreditInvoice] = useState(false);
    const [originalInvoiceItems, setOriginalInvoiceItems] = useState([]);
    const [bookedRoomCodes, setBookedRoomCodes] = useState([]); // Track original quantities for credit invoices
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

    // Hotel Specific State
    const [checkInDate, setCheckInDate] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    });
    const [checkOutDate, setCheckOutDate] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    });
    const [timeIn, setTimeIn] = useState(new Date().toTimeString().split(' ')[0].substring(0, 5));
    const [timeOut, setTimeOut] = useState(new Date().toTimeString().split(' ')[0].substring(0, 5));
    const [emergencyContact, setEmergencyContact] = useState("");
    const [nationality, setNationality] = useState("Pakistan");
    const [noOfDays, setNoOfDays] = useState(1);

    // Calculate number of days between check-in and check-out
    const calculateDays = (checkIn, checkOut) => {
        if (!checkIn || !checkOut) return 1;
        const date1 = new Date(checkIn);
        const date2 = new Date(checkOut);
        const diffTime = Math.abs(date2 - date1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays === 0 ? 1 : diffDays;
    };

    const fetchBookedRooms = useCallback(async () => {
        if (!lock_booked_room || !checkInDate || !timeIn) return;
        try {
            if (!employee?.business_id) return;
            const result = await getBookedRoomsForDate({
                businessId: employee.business_id,
                checkInDate,
            });
            if (result && result.success) {
                setBookedRoomCodes(result.bookedRooms || []);
            } else {
                setBookedRoomCodes([]);
            }
        } catch (err) {
            console.error("Failed to fetch booked rooms:", err);
            setBookedRoomCodes([]);
        }
    }, [lock_booked_room, checkInDate, timeIn, employee?.business_id]);

    const fetchMenu = useCallback(async () => {
        try {
            if (!employee?.business_id) return;
            const data = await listMenuItems(employee.business_id);
            setMenuItems(data);
            setCategories(getCategoriesFromMenuItems(data));
        } catch (err) {
            console.error("Failed to fetch menu items:", err);
        }
    }, [employee?.business_id]);

    const fetchNextUSIN = useCallback(async () => {
        const invoiceInput = document.getElementById("invoice-number");
        if (!invoiceInput) return;
        if (isCreditInvoice) {
            invoiceInput.value = "";
            invoiceInput.placeholder = "Enter your invoice number (e.g., LR-01, 001)";
            return;
        }

        try {
            // eslint-disable-next-line no-console
            console.debug("[hotelPos] business_id:", employee?.business_id);
            const next = await getNextUsin();
            // eslint-disable-next-line no-console
            console.debug("[hotelPos] next usin:", next);
            invoiceInput.value = next || "";
            invoiceInput.placeholder = "001";
        } catch (err) {
            console.error("❌ Error fetching next invoice number:", err);
            invoiceInput.value = "";
            invoiceInput.placeholder = "001";
        }
    }, [isCreditInvoice, employee?.business_id]);

    const handleLookupInvoice = async () => {
        const invoiceNo = document.getElementById("invoice-number").value.trim();
        const customerName = document.getElementById("customer-name").value.trim();

        if (!invoiceNo && !customerName) {
            toast.error("Please enter an invoice number or customer name.");
            return;
        }

        try {
            if (!employee?.business_id) {
                toast.error("Missing business id. Please log in again.");
                return;
            }

            const data = await lookupInvoiceLegacy({
                businessId: employee.business_id,
                usin: invoiceNo,
                buyerName: search_using_name ? customerName : undefined,
            });

            if (data.success && data.invoice) {
                toast.success("✅ Invoice found! Data populated.");

                // Update invoice number field with actual USIN if searched by room code
                const invoiceInput = document.getElementById("invoice-number");
                if (invoiceInput && data.invoice.USIN !== invoiceNo) {
                    invoiceInput.value = data.invoice.USIN;
                    // toast.info(`Found invoice ${data.invoice.USIN} for Item ${invoiceNo}`);
                }

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

                // Clean address field - extract only actual address, not hotel info
                let cleanAddress = data.invoice.address || "";
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
                if (addressInput) addressInput.value = cleanAddress;

                // Populate Hotel Fields (New Columns)
                // const now = new Date();
                // const currentDate = now.toISOString().split('T')[0];
                // const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);

                // Parse hotel info from address field (primary method for existing invoices)
                const address = data.invoice.address || "";
                console.log("📍 Address field:", address);

                if (address.includes("|")) {
                    const parts = address.split("|");
                    console.log("📝 Address parts:", parts);
                    parts.forEach(part => {
                        const trimmedPart = part.trim();
                        console.log("🔍 Processing part:", trimmedPart);

                        if (trimmedPart.startsWith("In:")) {
                            const dateValue = trimmedPart.substring(3).trim();
                            console.log("✅ Setting check-in date:", dateValue);
                            setCheckInDate(dateValue);
                        }
                        if (trimmedPart.startsWith("Out:")) {
                            const dateValue = trimmedPart.substring(4).trim();
                            console.log("✅ Setting check-out date:", dateValue);
                            setCheckOutDate(dateValue);
                        }
                        if (trimmedPart.startsWith("TimeIn:")) {
                            const timeValue = trimmedPart.substring(7).trim();
                            console.log("✅ Setting time-in:", timeValue);
                            setTimeIn(timeValue);
                        }
                        if (trimmedPart.startsWith("TimeOut:")) {
                            const timeValue = trimmedPart.substring(8).trim();
                            console.log("✅ Setting time-out:", timeValue);
                            setTimeOut(timeValue);
                        }
                        if (trimmedPart.startsWith("Emergency:")) {
                            const contactValue = trimmedPart.substring(10).trim();
                            setEmergencyContact(contactValue);
                        }
                        if (trimmedPart.startsWith("Nationality:")) {
                            const nationalityValue = trimmedPart.substring(12).trim();
                            setNationality(nationalityValue);
                        }
                    });
                }

                // Override with new database columns if they exist (format dates properly)
                if (data.invoice.check_in_date) {
                    const formattedDate = data.invoice.check_in_date.split(' ')[0]; // Remove time portion
                    setCheckInDate(formattedDate);
                }
                if (data.invoice.check_out_date) {
                    const formattedDate = data.invoice.check_out_date.split(' ')[0]; // Remove time portion
                    setCheckOutDate(formattedDate);
                }
                if (data.invoice.time_in) setTimeIn(data.invoice.time_in);
                if (data.invoice.time_out) setTimeOut(data.invoice.time_out);
                if (data.invoice.emergency_contact) setEmergencyContact(data.invoice.emergency_contact);
                if (data.invoice.nationality) setNationality(data.invoice.nationality);

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
        // Set initial datetime
        const now = new Date();
        const pad = (n) => (n < 10 ? "0" + n : n);
        const formatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
        setCurrentDateTime(formatted);

        // Update hotel date/time fields with current date/time
        const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);
        setCheckInDate(currentDate);
        setCheckOutDate(currentDate);
        setTimeIn(currentTime);
        setTimeOut(currentTime);

        if (authLoading) return;
        fetchNextUSIN();
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
                    const roomFoodBoth = settings.room_food_both === "1";
                    setRoomFoodBoth(roomFoodBoth);
                    const lockBookedRoom = settings.lock_booked_room === "1";
                    setLockBookedRoom(lockBookedRoom);
                    const searchUsingName = settings.search_using_name === "1";
                    setSearchUsingName(searchUsingName);
                    const showEmergencyContact = settings.show_emerg_contact === "1";
                    setShowEmergencyContact(showEmergencyContact);
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

    }, [authLoading, employee?.business_id, fetchMenu, fetchNextUSIN]);

    useEffect(() => {
        const count = selectedMenuItems.filter(item => item.itemName.toLowerCase().includes('room')).length;

        const foodQty = room_food_both
            ? selectedMenuItems.filter(item => !item.itemName.toLowerCase().includes('room')).reduce((sum, item) => sum + item.quantity, 0)
            : 0;

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
        setFoodCount(foodQty);
        setitemCost(netitemCost.toFixed(2));
        setGstAmount(gst);
        setTotalPayable(total.toFixed(2));

        setBalance((total - parseFloat(paid || 0)).toFixed(2));
    }, [selectedMenuItems, posCharges, serviceCharges, discount, balance, paid, gstPercentage, gstIncluded, room_food_both]);

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

    // Update number of days when check-in or check-out dates change
    useEffect(() => {
        const days = calculateDays(checkInDate, checkOutDate);
        setNoOfDays(days);

        // Fetch booked rooms when check-in date or time changes
        fetchBookedRooms();

        // Update room quantities based on number of days
        setSelectedMenuItems(prev => prev.map(item => {
            const isRoom = item.itemName.toLowerCase().includes('room');
            return isRoom ? { ...item, quantity: days } : item;
        }));
    }, [checkInDate, checkOutDate, timeIn, fetchBookedRooms]);

    const filteredItems = menuItems.filter(
        (item) => categoryFilter === "" || item.itemCategory === categoryFilter
    );

    const handleRowClick = (itemCode) => {
        const item = menuItems.find(i => i.itemCode === itemCode);
        const isRoom = item?.itemName.toLowerCase().includes('room');

        // Check if room is booked (only if lock_booked_room is enabled, for new invoices, not credit)
        if (lock_booked_room && !isCreditInvoice && isRoom && bookedRoomCodes.includes(itemCode)) {
            toast.error(`${item.itemName} is already booked for the selected dates.`);
            return;
        }

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
                const isRoom = item.itemName.toLowerCase().includes('room');
                const initialQuantity = isRoom ? noOfDays : 1;
                setSelectedRows(prev => [...prev, itemCode]);
                setSelectedMenuItems(prev => [...prev, { ...item, quantity: initialQuantity }]);
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

        if (customerNameInput) customerNameInput.value = "";
        if (cnicInput) cnicInput.value = "";
        if (pntnInput) pntnInput.value = "";
        if (contactInput) contactInput.value = "";
        if (addressInput) addressInput.value = "";
        document.getElementById("api-message").textContent = "🗒️ Note";

        // Reset Hotel Fields
        const now = new Date();
        const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);

        setCheckInDate(currentDate);
        setCheckOutDate(currentDate);
        setTimeIn(currentTime);
        setTimeOut(currentTime);
        setEmergencyContact("");
        setNationality("Pakistan");

        // Fetch booked rooms for current date
        await fetchBookedRooms();

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
        setFoodCount(0);
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

            // Calculate actual service charges value
            const actualServiceCharges = parseFloat(document.getElementById("service-charges")?.value || 0);
            const furtherTaxValue = parseFloat(posCharges || 0) + actualServiceCharges;

            // Construct address with hotel info
            const baseAddress = document.getElementById("address").value || "";
            const hotelInfo = [];
            if (checkInDate) hotelInfo.push(`In: ${checkInDate}`);
            if (checkOutDate) hotelInfo.push(`Out: ${checkOutDate}`);
            if (timeIn) hotelInfo.push(`TimeIn: ${timeIn}`);
            if (timeOut) hotelInfo.push(`TimeOut: ${timeOut}`);
            if (emergencyContact) hotelInfo.push(`Emergency: ${emergencyContact}`);
            if (nationality) hotelInfo.push(`Nationality: ${nationality}`);

            const fullAddress = hotelInfo.length > 0
                ? (baseAddress ? `${baseAddress} | ${hotelInfo.join(" | ")}` : hotelInfo.join(" | "))
                : baseAddress;

            const payload = {
                InvoiceNumber: "",
                POSID: parseInt(pra_posid),
                USIN: document.getElementById("invoice-number").value,
                RefUSIN: !isCreditUpdate ? null : document.getElementById("invoice-number").value,
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
                TotalQuantity: room_food_both ? parseInt(itemCount) + parseInt(foodCount) : parseInt(itemCount),
                PaymentMode: paymentMode === "online" ? 1 : getPaymentCode(paymentMode),
                InvoiceType: getInvoiceTypeCode(invoiceType),
                Items: selectedMenuItems.map(item => {
                    const rawValue = item.itemPrice * item.quantity;
                    let taxCharged = 0;

                    if (gstIncluded) {
                        const base = +(rawValue / (1 + gstPercentage / 100)).toFixed(2);
                        taxCharged = +(rawValue - base).toFixed(2);
                    } else {
                        taxCharged = +(rawValue * (gstPercentage / 100)).toFixed(2);
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
                        TotalAmount: (item.itemPrice * item.quantity) + taxCharged,
                        InvoiceType: getInvoiceTypeCode(invoiceType),
                        RefUSIN: !isCreditUpdate ? null : document.getElementById("invoice-number").value,
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
                address: fullAddress, // ✅ Keep for backward compatibility
                POS_Charges: parseFloat(posCharges || 0),
                Service_Charges: actualServiceCharges,
                Balance: parseFloat(balance || 0),
                Paid: parseFloat(paid || 0),
                PaymentMode: getPaymentCode(paymentMode),
                // Hotel Fields
                checkInDate,
                checkOutDate,
                timeIn,
                timeOut,
                emergencyContact,
                nationality
            };

            console.log("📦 Saving invoice to Supabase...");
            const result = await saveInvoiceLegacy({
                businessId: employee?.business_id,
                payload: localPayload,
                isCreditUpdate: isCreditUpdate,
            });

            if (result.success) {
                const actionText = isCreditUpdate ? "updated" : "saved";
                const successMessage = pra_linked === "1"
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
                        await applyMenuStockUpdates(stockUpdateItems);
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

        // Clean address field - extract only actual address, not hotel info
        let cleanAddress = addressInput?.value || "";
        if (cleanAddress.includes("|")) {
            // If address contains hotel info, extract only the actual address part
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

        navigate("/receipt", {
            state: {
                customer: {
                    invoiceNumber: invoiceInput.value,
                    name: customerInput.value || "Walk-in Customer",
                    cnic: cnicInput?.value || "",
                    pntn: pntnInput?.value || "",
                    contact: contactInput?.value || "",
                    address: cleanAddress,
                    checkInDate: checkInDate,
                    checkOutDate: checkOutDate,
                    timeIn: timeIn,
                    timeOut: timeOut,
                    dateTime: currentDateTime,
                },
                billing: {
                    itemCount: room_food_both ? parseInt(itemCount) + parseInt(foodCount) : parseInt(itemCount),
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
                                <h3>Guest Information</h3>
                                <div className="invoice-type-container">
                                    {/* <label>Invoice Type</label> */}
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
                                    <label htmlFor="invoice-number">{isCreditInvoice ? "Invoice/Room" : "Invoice No*"}</label>
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
                                                handleLookupInvoice();
                                            }}
                                        >🔍</button>
                                    )}
                                </div>


                                {showCustomerName ? (
                                    <div className="horizontal-group">
                                        <label htmlFor="customer-name">Name*</label>
                                        <input type="text" id="customer-name" placeholder="Guest Name" tabIndex={2} />
                                    </div>
                                ) : (
                                    <div className="horizontal-group">
                                        <label htmlFor="customer-name">Guest Type</label>
                                        <select id="customer-name" className="form-control">
                                            <option value="Walk in Customer">Walk in Customer</option>
                                            <option value="Parcel">Parcel</option>
                                            <option value="Delivery">Delivery</option>
                                        </select>
                                    </div>
                                )}

                                <div className="horizontal-group">
                                    <label htmlFor="contact-no">Contact No</label>
                                    <input type="tel" id="contact-no" placeholder="03XX-XXXXXXX" tabIndex={3} />
                                </div>

                                <div className="horizontal-group"
                                    style={{ display: showCnic ? "flex" : "none" }}
                                >
                                    <label htmlFor="cnic">CNIC</label>
                                    <input type="text" id="cnic" placeholder="XXXXX-XXXXXXX-X" tabIndex={4} />
                                </div>

                                <div className="horizontal-group"
                                    style={{ display: showEmergencyContact ? "flex" : "none" }}
                                >
                                    <label htmlFor="emergency-contact">E-Contact</label>
                                    <input
                                        type="tel"
                                        id="emergency-contact"
                                        placeholder="Emergency Contact"
                                        value={emergencyContact}
                                        onChange={(e) => setEmergencyContact(e.target.value)}
                                        tabIndex={5}
                                    />
                                </div>

                                <div className="horizontal-group"
                                    style={{ display: showBuyerPntn ? "flex" : "none" }}
                                >
                                    <label htmlFor="pntn">PNTN</label>
                                    <input type="text" id="pntn" placeholder="Optional" tabIndex={6} />
                                </div>

                                <div className="horizontal-group">
                                    <label htmlFor="nationality">Nationality</label>
                                    <select
                                        id="nationality"
                                        className="form-control"
                                        value={nationality}
                                        onChange={(e) => setNationality(e.target.value)}
                                        tabIndex={7}
                                    >
                                        <option value="Pakistan">Pakistan</option>
                                        <option value="Foreign">Foreign</option>
                                    </select>
                                </div>

                                <div className="horizontal-group"
                                    style={{ display: showAddress ? "flex" : "none" }}
                                >
                                    <label htmlFor="address">Address</label>
                                    <input type="tel" id="address" placeholder="Address" tabIndex={8} />
                                </div>

                                {/* Hotel Specific Fields */}
                                <div style={{ display: showDate ? "block" : "none", paddingBottom: "10px" }}>
                                    <label style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "5px", display: "block" }}>Check-In</label>
                                    <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                                        <DesktopDatePicker
                                            value={dayjs(checkInDate, 'YYYY-MM-DD')}
                                            onChange={(newValue) => setCheckInDate(newValue.format('YYYY-MM-DD'))}
                                            slotProps={{
                                                textField: {
                                                    size: 'small',
                                                    tabIndex: 9,
                                                    sx: {
                                                        flex: 2,
                                                        minWidth: '100px',
                                                        '& .MuiInputBase-input': {
                                                            fontSize: '12px'
                                                        }
                                                    }
                                                }
                                            }}
                                        />
                                        <DesktopTimePicker
                                            value={dayjs(`2022-04-17T${timeIn}`)}
                                            onChange={(newValue) => setTimeIn(newValue.format('HH:mm'))}
                                            slotProps={{
                                                textField: {
                                                    size: 'small',
                                                    tabIndex: 10,
                                                    sx: {
                                                        flex: 1,
                                                        minWidth: '120px',
                                                        '& .MuiInputBase-input': {
                                                            fontSize: '12px'
                                                        }
                                                    }
                                                }
                                            }}
                                        />
                                    </div>

                                    <label style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "5px", display: "block" }}>Check-Out</label>
                                    <div style={{ display: "flex", gap: "10px" }}>
                                        <DesktopDatePicker
                                            value={dayjs(checkOutDate, 'YYYY-MM-DD')}
                                            onChange={(newValue) => setCheckOutDate(newValue.format('YYYY-MM-DD'))}
                                            slotProps={{
                                                textField: {
                                                    size: 'small',
                                                    tabIndex: 11,
                                                    sx: {
                                                        flex: 2,
                                                        minWidth: '100px',
                                                        '& .MuiInputBase-input': {
                                                            fontSize: '12px'
                                                        }
                                                    }
                                                }
                                            }}
                                        />
                                        <DesktopTimePicker
                                            value={dayjs(`2022-04-17T${timeOut}`)}
                                            onChange={(newValue) => setTimeOut(newValue.format('HH:mm'))}
                                            slotProps={{
                                                textField: {
                                                    size: 'small',
                                                    tabIndex: 12,
                                                    sx: {
                                                        flex: 1,
                                                        minWidth: '120px',
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

                                <div className="horizontal-group" style={{ display: 'flex', gap: '10px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label htmlFor="item-count">Rooms Qty </label>
                                        <input type="number" id="item-count" placeholder="0" min="0" readOnly value={itemCount} style={{ width: '40px' }} />
                                    </div>
                                    {room_food_both && (
                                        <div style={{ flex: 1 }}>
                                            <label htmlFor="food-count">Food Qty </label>
                                            <input type="number" id="food-count" placeholder="0" min="0" readOnly value={foodCount} style={{ width: '40px' }} />
                                        </div>
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <label htmlFor="no-of-days">Days Qty </label>
                                        <input type="number" id="no-of-days" placeholder="1" min="1" readOnly value={noOfDays} style={{ width: '40px' }} />
                                    </div>
                                </div>

                                <div className="horizontal-group">
                                    <label htmlFor="item-cost">Total Cost</label>
                                    <input type="number" id="item-cost" placeholder="0" min="0" readOnly value={itemCost} />
                                </div>

                                {gstPercentage > 0 && (
                                    <div className="horizontal-group">
                                        <label htmlFor="gst">
                                            GST-{gstPercentage}% {gstIncluded ? " (INC)" : " (EXC)"}
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
                                    <label>Method:</label>
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
                                        tabIndex={14}
                                    >SAVE</button>

                                    <button
                                        className="btn btn-secondary"
                                        style={{ marginRight: "10px", paddingLeft: "30px", paddingRight: "30px" }}
                                        onClick={() => handlePrint(lastPRAInvoice)} // ✅ FIXED
                                        tabIndex={15}
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
                                    <h2> {room_food_both ? "Menu Section" : "Room Section"}</h2>
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
                                                        const firstItem = filtered[0];
                                                        const isRoom = firstItem.itemName.toLowerCase().includes('room');
                                                        const isBooked = lock_booked_room && !isCreditInvoice && isRoom && bookedRoomCodes.includes(firstItem.itemCode);
                                                        if (!isBooked) {
                                                            handleRowClick(firstItem.itemCode);
                                                            setSearchText("");
                                                        }
                                                    }
                                                }
                                            }}
                                            tabIndex={13}
                                        />
                                    </div>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={handleReset}
                                        style={{ marginLeft: "10px" }}
                                        tabIndex={16}
                                    >
                                        Reset
                                    </button>
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
                                                        const isRoom = item.itemName.toLowerCase().includes('room');
                                                        const isBooked = lock_booked_room && !isCreditInvoice && isRoom && bookedRoomCodes.includes(item.itemCode);
                                                        return (
                                                            <TableRow
                                                                key={item.itemCode}
                                                                hover
                                                                onClick={() => handleRowClick(item.itemCode)}
                                                                selected={selected}
                                                                sx={{
                                                                    cursor: isBooked ? "not-allowed" : "pointer",
                                                                    '&.Mui-selected': {
                                                                        backgroundColor: '#cfe8fbff !important',
                                                                    },
                                                                    backgroundColor: isBooked ? '#fcbcc5ff !important' : 'inherit',
                                                                    opacity: isBooked ? 0.6 : 1,
                                                                    borderBottom: "1px solid #262626ff",
                                                                    height: "26px"
                                                                }}
                                                            >

                                                                <TableCell sx={{ borderRight: 1, borderColor: "divider", fontSize: 13, textAlign: "center" }}>{item.itemCode}</TableCell>
                                                                <TableCell sx={{ borderRight: 1, borderColor: "divider", fontSize: 13 }}>{item.itemName}</TableCell>
                                                                {showMenuStockQty && (
                                                                    <TableCell sx={{ borderRight: 1, borderColor: "divider", fontSize: 13, textAlign: "center" }}>{item.stockQty || 0}</TableCell>
                                                                )}
                                                                <TableCell
                                                                    sx={{ fontSize: 13, textAlign: "center" }}
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
                            <h2>{room_food_both ? "Selected Items" : "Selected Room"}</h2>
                            <div className="selected-items-table-container">
                                <table className="selected-items-table" style={{ borderCollapse: "collapse", width: "100%", fontFamily: "Arial", fontSize: "13px" }}>
                                    <thead>
                                        <tr style={{ backgroundColor: "#fff", height: "26px", borderBottom: "1px solid #ddd" }}>
                                            <th style={{ border: "1px solid #000", textAlign: "center" }}>Code</th>
                                            <th style={{ border: "1px solid #000", textAlign: "left" }}>Item</th>
                                            {room_food_both && <th style={{ border: "1px solid #000" }}></th>}
                                            {room_food_both && <th style={{ border: "1px solid #000", textAlign: "center" }}>Qty</th>}
                                            {room_food_both && <th style={{ border: "1px solid #000" }}></th>}
                                            <th style={{ border: "1px solid #000", textAlign: "center" }}>Price</th>
                                            <th style={{ border: "1px solid #000" }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedMenuItems.map((item, index) => {
                                            const isRoom = item.itemName.toLowerCase().includes('room');
                                            return (
                                                <tr key={index} style={{ height: "26px", borderBottom: "1px solid #ddd" }}>
                                                    <td style={{ border: "1px solid #000", textAlign: "center" }}>{item.itemCode}</td>
                                                    <td style={{ border: "1px solid #000", textAlign: "left" }}>{item.itemName}</td>
                                                    {room_food_both && (
                                                        <td style={{ border: "1px solid #000", textAlign: "center" }}>
                                                            {!isRoom && (
                                                                <button className="qty-btn" onClick={() => {
                                                                    setSelectedMenuItems(prev => prev.map((menuItem, idx) =>
                                                                        idx === index && menuItem.quantity > 1
                                                                            ? { ...menuItem, quantity: menuItem.quantity - 1 }
                                                                            : menuItem
                                                                    ));
                                                                }}>−</button>
                                                            )}
                                                        </td>
                                                    )}
                                                    {room_food_both && (
                                                        <td style={{ border: "1px solid #000", textAlign: "center" }}>{!isRoom && item.quantity}</td>
                                                    )}
                                                    {room_food_both && (
                                                        <td style={{ border: "1px solid #000", textAlign: "center" }}>
                                                            {!isRoom && (
                                                                <button className="qty-btn" onClick={() => {
                                                                    setSelectedMenuItems(prev => prev.map((menuItem, idx) =>
                                                                        idx === index
                                                                            ? { ...menuItem, quantity: menuItem.quantity + 1 }
                                                                            : menuItem
                                                                    ));
                                                                }}>+</button>
                                                            )}
                                                        </td>
                                                    )}
                                                    <td style={{ border: "1px solid #000", textAlign: "center" }}>{(item.itemPrice * item.quantity).toFixed(2)}</td>
                                                    <td style={{ border: "1px solid #000", textAlign: "center" }}>
                                                        <button className="del-btn" onClick={() => {
                                                            setSelectedMenuItems(prev => prev.filter((_, idx) => idx !== index));
                                                            setSelectedRows(prev => prev.filter(code => code !== item.itemCode));
                                                        }}>x</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
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
                                            const data = await getTotalSalesLegacy({
                                                businessId: employee?.business_id,
                                                fromDate,
                                                toDate,
                                            });
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

export default HotelPOS;
