// Mobile Menu Functions
function toggleMobileMenu() {
    const overlay = document.getElementById('mobileMenuOverlay');
    const hamburger = document.querySelector('.hamburger-menu');
    
    if (overlay.classList.contains('active')) {
        closeMobileMenu();
    } else {
        overlay.style.display = 'flex';
        overlay.style.visibility = 'visible';
        overlay.style.opacity = '1';
        overlay.style.zIndex = '1000';
        // Force a reflow to ensure the display change takes effect
        overlay.offsetHeight;
        overlay.classList.add('active');
        hamburger.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeMobileMenu() {
    const overlay = document.getElementById('mobileMenuOverlay');
    const hamburger = document.querySelector('.hamburger-menu');
    
    if (overlay) {
        overlay.style.display = 'none';
        overlay.classList.remove('active');
        overlay.style.visibility = 'hidden';
        overlay.style.opacity = '0';
        overlay.style.zIndex = '-1';
    }
    if (hamburger) {
        hamburger.classList.remove('active');
    }
    document.body.style.overflow = '';
}

// Close mobile menu when clicking outside
document.addEventListener('click', function(event) {
    const overlay = document.getElementById('mobileMenuOverlay');
    const hamburger = document.querySelector('.hamburger-menu');
    
    if (overlay && overlay.classList.contains('active') && 
        !overlay.contains(event.target) && 
        !hamburger.contains(event.target)) {
        closeMobileMenu();
    }
});

// Close mobile menu on window resize
window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        closeMobileMenu();
    }
});

let items = [];
let activeOptionIndex = -1;
let productDatabase = [];
let stockDatabase = [];
let customerDatabase = [];

// API Base URL
API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : 'https://billingsoftware-4mw3.onrender.com/api';
// API Functions
async function fetchProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        const products = await response.json();
        productDatabase = [...products];
        return products;
    } catch (error) {
        console.error('Error fetching products:', error);
        showMessage('Error loading products', 'error');
        return [];
    }
}

async function fetchStock() {
    try {
        const response = await fetch(`${API_BASE_URL}/stock`);
        let stock = await response.json();
        stockDatabase = [...stock];
        return stock;
    } catch (error) {
        console.error('Error fetching stock:', error);
        showMessage('Error loading stock', 'error');
        return [];
    }
}

async function fetchCustomers() {
    try {
        const response = await fetch(`${API_BASE_URL}/customers`);
        const customers = await response.json();
        customerDatabase = [...customers];
        return customers;
    } catch (error) {
        console.error('Error fetching customers:', error);
        showMessage('Error loading customers', 'error');
        return [];
    }
}

async function saveCustomer(customerData) {
    try {
        const response = await fetch(`${API_BASE_URL}/customers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(customerData)
        });
        const result = await response.json();
        
        // Refresh customer database after saving
        await fetchCustomers();
        
        return result;
    } catch (error) {
        console.error('Error saving customer:', error);
        throw error;
    }
}

async function createBill(billData) {
    try {
        const response = await fetch(`${API_BASE_URL}/bills`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                
            },
            body: JSON.stringify(billData)
        });
        return await response.json();
    } catch (error) {
        console.error('Error creating bill:', error);
        throw error;
    }
}

async function addStockItemAPI(stockData) {
    try {
        // const token = localStorage.getItem('token'); 
        const response = await fetch(`${API_BASE_URL}/stock`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(stockData)
        });
        return await response.json();
    } catch (error) {
        console.error('Error adding stock item:', error);
        throw error;
    }
}

async function addStockItem() {
    const itemName = document.getElementById('stockItemName').value.trim();
    const brand = document.getElementById('stockBrand').value.trim();
    const mrp = parseFloat(document.getElementById('stockMRP').value) || 0;
    const purchasedPrice = parseFloat(document.getElementById('stockPurchasedPrice').value) || 0;
    const quantity = parseInt(document.getElementById('stockQuantity').value) || 1;
    
    if (!itemName || !mrp) {
        showMessage('Please fill all required fields', 'error');
        return;
    }
    
    // Check if user is authenticated
    // const token = localStorage.getItem('token');
    // if (!token) {
    //     showMessage('Please log in to add stock items. Go to Admin panel first.', 'error');
    //     return;
    // }
    
    try {
        // First add the product
        const productResponse = await fetch(`${API_BASE_URL}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: itemName,
                brand: brand,
                mrp: mrp,
                purchased_price: purchasedPrice
            })
        });
        
        if (!productResponse.ok) {
            const errorData = await productResponse.json();
            throw new Error(errorData.error || 'Failed to add product');
        }
        
        const productResult = await productResponse.json();
        
        if (productResult.id) {
            // Then update stock
            await addStockItemAPI({
                product_id: productResult.id,
                quantity: quantity
            });
            
            showMessage('Stock item added successfully', 'success');
            clearStockForm();
            await updateStockTable();
            await fetchProducts(); // Refresh product database
        }
    } catch (error) {
        console.error('Error adding stock item:', error);
        showMessage(`Error adding stock item: ${error.message}`, 'error');
    }
}

// Initialize data on page load
document.addEventListener('DOMContentLoaded', async function() {
    await fetchProducts();
    await fetchStock();
    await fetchCustomers();
    
    // Set up customer input event listeners
    setupCustomerDropdowns();
});

// Customer Dropdown Functions
function setupCustomerDropdowns() {
    console.log('setupCustomerDropdowns called');
    
    const customerPhoneInput = document.getElementById('customerPhone');
    const customerNameInput = document.getElementById('customerName');
    
    console.log('customerPhoneInput found:', !!customerPhoneInput);
    console.log('customerNameInput found:', !!customerNameInput);
    
    if (customerPhoneInput) {
        customerPhoneInput.addEventListener('click', showCustomerDropdown);
        customerPhoneInput.addEventListener('input', filterCustomers);
        customerPhoneInput.addEventListener('keydown', handleCustomerKeydown);
        customerPhoneInput.addEventListener('blur', hideCustomerDropdown);
        console.log('Event listeners added to customerPhoneInput');
    }
    
    if (customerNameInput) {
        customerNameInput.addEventListener('click', showCustomerDropdown);
        customerNameInput.addEventListener('input', filterCustomers);
        customerNameInput.addEventListener('keydown', handleCustomerKeydown);
        customerNameInput.addEventListener('blur', hideCustomerDropdown);
        console.log('Event listeners added to customerNameInput');
    }
}

function showCustomerDropdown() {
    console.log('showCustomerDropdown called');
    console.log('customerDatabase length:', customerDatabase.length);
    
    const dropdown = getOrCreateCustomerDropdown();
    const customers = customerDatabase.filter(customer => 
        customer.name && customer.phone
    );
    
    console.log('Filtered customers:', customers.length);
    
    if (customers.length === 0) {
        dropdown.innerHTML = '<div class="autocomplete-option">No customers found</div>';
    } else {
        dropdown.innerHTML = customers.map(customer => 
            `<div class="autocomplete-option" data-phone="${customer.phone}" data-name="${customer.name}">
                <strong>${customer.name}</strong><br>
                <small>${customer.phone}</small>
            </div>`
        ).join('');
    }
    
    dropdown.style.display = 'block';
    positionCustomerDropdown();
}

function filterCustomers() {
    const dropdown = getOrCreateCustomerDropdown();
    const searchTerm = this.value.toLowerCase();
    const customers = customerDatabase.filter(customer => 
        customer.name && customer.phone &&
        (customer.name.toLowerCase().includes(searchTerm) || 
         customer.phone.includes(searchTerm))
    );
    
    if (customers.length === 0) {
        dropdown.innerHTML = '<div class="autocomplete-option">No matching customers</div>';
    } else {
        dropdown.innerHTML = customers.map(customer => 
            `<div class="autocomplete-option" data-phone="${customer.phone}" data-name="${customer.name}">
                <strong>${customer.name}</strong><br>
                <small>${customer.phone}</small>
            </div>`
        ).join('');
    }
    
    dropdown.style.display = 'block';
    positionCustomerDropdown();
}

function getOrCreateCustomerDropdown() {
    let dropdown = document.getElementById('customerDropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'customerDropdown';
        dropdown.className = 'autocomplete-dropdown';
        dropdown.style.position = 'absolute';
        dropdown.style.zIndex = '1000';
        dropdown.style.backgroundColor = 'white';
        dropdown.style.border = '1px solid #ddd';
        dropdown.style.borderRadius = '4px';
        dropdown.style.maxHeight = '200px';
        dropdown.style.overflowY = 'auto';
        dropdown.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        dropdown.style.display = 'none';
        
        // Add click event to dropdown options
        dropdown.addEventListener('click', function(e) {
            if (e.target.classList.contains('autocomplete-option')) {
                const phone = e.target.getAttribute('data-phone');
                const name = e.target.getAttribute('data-name');
                if (phone && name) {
                    document.getElementById('customerPhone').value = phone;
                    document.getElementById('customerName').value = name;
                    hideCustomerDropdown();
                }
            }
        });
        
        // Append to billing container instead of body
        const billingContainer = document.querySelector('.billing-container');
        if (billingContainer) {
            billingContainer.appendChild(dropdown);
        } else {
            document.body.appendChild(dropdown);
        }
    }
    return dropdown;
}

function positionCustomerDropdown() {
    const dropdown = document.getElementById('customerDropdown');
    const customerPhoneInput = document.getElementById('customerPhone');
    const customerNameInput = document.getElementById('customerName');
    
    if (dropdown && (customerPhoneInput || customerNameInput)) {
        const activeInput = document.activeElement;
        const rect = activeInput.getBoundingClientRect();
        
        // Position relative to the billing container
        const billingContainer = document.querySelector('.billing-container');
        const containerRect = billingContainer ? billingContainer.getBoundingClientRect() : rect;
        
        dropdown.style.left = (rect.left - containerRect.left) + 'px';
        dropdown.style.top = (rect.bottom - containerRect.top + 5) + 'px';
        dropdown.style.width = rect.width + 'px';
        dropdown.style.position = 'absolute';
        dropdown.style.zIndex = '1000';
    }
}

function hideCustomerDropdown() {
    // Delay hiding to allow for option clicks
    setTimeout(() => {
        const dropdown = document.getElementById('customerDropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }, 200);
}

function handleCustomerKeydown(e) {
    const dropdown = document.getElementById('customerDropdown');
    if (!dropdown || dropdown.style.display === 'none') return;
    
    const options = dropdown.querySelectorAll('.autocomplete-option');
    if (options.length === 0) return;
    
    switch(e.key) {
        case 'ArrowDown':
            e.preventDefault();
            activeOptionIndex = Math.min(activeOptionIndex + 1, options.length - 1);
            updateActiveCustomerOption(options);
            break;
        case 'ArrowUp':
            e.preventDefault();
            activeOptionIndex = Math.max(activeOptionIndex - 1, -1);
            updateActiveCustomerOption(options);
            break;
        case 'Enter':
            e.preventDefault();
            if (activeOptionIndex >= 0 && options[activeOptionIndex]) {
                const option = options[activeOptionIndex];
                const phone = option.getAttribute('data-phone');
                const name = option.getAttribute('data-name');
                if (phone && name) {
                    document.getElementById('customerPhone').value = phone;
                    document.getElementById('customerName').value = name;
                    hideCustomerDropdown();
                }
            }
            break;
        case 'Escape':
            hideCustomerDropdown();
            break;
    }
}

function updateActiveCustomerOption(options) {
    options.forEach((option, index) => {
        if (index === activeOptionIndex) {
            option.style.backgroundColor = '#f0f0f0';
            option.style.fontWeight = 'bold';
        } else {
            option.style.backgroundColor = '';
            option.style.fontWeight = '';
        }
    });
}

// Navigation Functions
// --- Navigation Section Logic ---
function hideAllSections() {
    // Hide all sections with more aggressive hiding
    const sections = [
        'homePage',
        'billingApp', 
        'customerDataSection',
        'salesReportSection',
        'stockSection'
    ];
    
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            // Completely remove from document flow
            section.style.display = 'none';
            section.style.visibility = 'hidden';
            section.style.opacity = '0';
            section.style.position = 'absolute';
            section.style.top = '-9999px';
            section.style.left = '-9999px';
            section.style.zIndex = '-1';
            section.style.height = '0';
            section.style.overflow = 'hidden';
            section.style.pointerEvents = 'none';
        }
    });
    
    // Ensure mobile menu overlay is completely hidden
    const overlay = document.getElementById('mobileMenuOverlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.classList.remove('active');
        overlay.style.visibility = 'hidden';
        overlay.style.opacity = '0';
        overlay.style.zIndex = '-1';
    }
    
    // Reset hamburger menu
    const hamburger = document.querySelector('.hamburger-menu');
    if (hamburger) {
        hamburger.classList.remove('active');
    }
    
    // Reset body styles
    document.body.style.overflow = 'auto';
    document.body.style.position = '';
    document.body.style.width = '';
    
    // Force a reflow to ensure all changes take effect
    document.body.offsetHeight;
    
    // Scroll to top
    window.scrollTo(0, 0);
}

function showCustomerData() {
    hideAllSections();
    const section = document.getElementById('customerDataSection');
    if (section) {
        section.style.display = 'block';
        section.style.visibility = 'visible';
        section.style.opacity = '1';
        section.style.position = 'relative';
        section.style.top = 'auto';
        section.style.left = 'auto';
        section.style.zIndex = '1001';
        section.style.height = 'auto';
        section.style.overflow = 'visible';
        section.style.pointerEvents = 'auto';
    }
    fetchAndDisplayCustomerData();
    document.body.style.background = 'var(--primary-purple)';
    document.body.style.minHeight = '100vh';
    window.scrollTo(0, 0);
}

function showSalesReport() {
    hideAllSections();
    const section = document.getElementById('salesReportSection');
    if (section) {
        section.style.display = 'block';
        section.style.visibility = 'visible';
        section.style.opacity = '1';
        section.style.position = 'relative';
        section.style.top = 'auto';
        section.style.left = 'auto';
        section.style.zIndex = '1001';
        section.style.height = 'auto';
        section.style.overflow = 'visible';
        section.style.pointerEvents = 'auto';
    }
    fetchAndDisplaySalesReport();
    document.body.style.background = 'var(--primary-purple)';
    document.body.style.minHeight = '100vh';
    window.scrollTo(0, 0);
}

function showBillingApp() {
    hideAllSections();
    const section = document.getElementById('billingApp');
    if (section) {
        section.style.display = 'block';
        section.style.visibility = 'visible';
        section.style.opacity = '1';
        section.style.position = 'relative';
        section.style.top = 'auto';
        section.style.left = 'auto';
        section.style.zIndex = '1001';
        section.style.height = 'auto';
        section.style.overflow = 'visible';
        section.style.pointerEvents = 'auto';
    }
    document.body.style.background = 'var(--primary-purple)';
    document.body.style.minHeight = '100vh';
    document.body.style.padding = '20px';
    if (window.innerWidth <= 768) {
        document.body.style.overflow = 'auto';
        window.scrollTo(0, 0);
    }
    updateItemsTable();
    window.scrollTo(0, 0);
    
    // Initialize customer dropdown after a short delay to ensure DOM is ready
    setTimeout(() => {
        setupCustomerDropdowns();
    }, 100);
}

function showStock() {
    hideAllSections();
    const section = document.getElementById('stockSection');
    if (section) {
        section.style.display = 'block';
        section.style.visibility = 'visible';
        section.style.opacity = '1';
        section.style.position = 'relative';
        section.style.top = 'auto';
        section.style.left = 'auto';
        section.style.zIndex = '1001';
        section.style.height = 'auto';
        section.style.overflow = 'visible';
        section.style.pointerEvents = 'auto';
    }
    updateStockTable();
    document.body.style.background = 'var(--primary-purple)';
    document.body.style.minHeight = '100vh';
    window.scrollTo(0, 0);
    // Set default state - show Add Item section, hide Add New Stock section
    document.getElementById('addItemSection').style.display = 'block';
    document.getElementById('addNewStockSection').style.display = 'none';
    document.getElementById('toggleStockSection').textContent = 'Add New Stock';
    // Auto-set date fields to today
    const today = new Date().toISOString().split('T')[0];
    if (document.getElementById('stockDate')) document.getElementById('stockDate').value = today;
    if (document.getElementById('existingStockDate')) document.getElementById('existingStockDate').value = today;
    // Populate item name dropdown dynamically
    const itemNameDropdown = document.getElementById('existingStockItemName');
    if (itemNameDropdown) {
        itemNameDropdown.innerHTML = '';
        productDatabase.forEach(product => {
            const option = document.createElement('option');
            option.value = product.name;
            option.textContent = product.name;
            itemNameDropdown.appendChild(option);
        });
    }
}

function toggleStockSections() {
    const addItemSection = document.getElementById('addItemSection');
    const addNewStockSection = document.getElementById('addNewStockSection');
    const toggleButton = document.getElementById('toggleStockSection');
    const today = new Date().toISOString().split('T')[0];
    if (addItemSection.style.display === 'none') {
        addItemSection.style.display = 'block';
        addNewStockSection.style.display = 'none';
        toggleButton.textContent = 'Add New Item';
        if (document.getElementById('existingStockDate')) document.getElementById('existingStockDate').value = today;
    } else {
        addItemSection.style.display = 'none';
        addNewStockSection.style.display = 'block';
        toggleButton.textContent = 'Add Stock';
        if (document.getElementById('stockDate')) document.getElementById('stockDate').value = today;
    }
}

function showHomePage() {
    hideAllSections();
    const section = document.getElementById('homePage');
    if (section) {
        section.style.display = 'block';
        section.style.visibility = 'visible';
        section.style.opacity = '1';
        section.style.position = 'relative';
        section.style.top = 'auto';
        section.style.left = 'auto';
        section.style.zIndex = '1001';
        section.style.height = 'auto';
        section.style.overflow = 'visible';
        section.style.pointerEvents = 'auto';
    }
    document.body.style.background = '';
    document.body.style.minHeight = '';
    document.body.style.padding = '';
    window.scrollTo(0, 0);
}

// Billing Functions

function getServiceCharge() {
    // Service charge is total quantity * 10
    return items.reduce((sum, item) => sum + item.quantity, 0) * 10;
}

function addItem() {
    const itemName = document.getElementById('itemName').value.trim();
    const quantity = parseInt(document.getElementById('itemQuantity').value) || 1;
    if (!itemName) {
        showMessage('Please enter item name', 'error');
        return;
    }
    // Find product in database
    const product = productDatabase.find(p => p.name.toLowerCase() === itemName.toLowerCase());
    if (!product) {
        showMessage('Product not found in database', 'error');
        return;
    }
    const mrp = product.mrp;
    const total = mrp * quantity;
    const item = {
        id: product._id,
        // id: Date.now(),
        name: itemName,
        mrp: mrp,
        quantity: quantity,
        total: total,
        product_id: product._id
    };
    items.push(item);
    updateItemsTable();
    clearItemForm();
    hideAddItemForm();
    showMessage('Item added successfully', 'success');
}

function clearItemForm() {
    document.getElementById('itemName').value = '';
    document.getElementById('itemQuantity').value = '1';
    document.getElementById('itemNameDropdown').style.display = 'none';
}

function hideAddItemForm() {
    document.getElementById('addItemForm').style.display = 'none';
    document.getElementById('addAnotherItemBtn').style.display = 'block';
}

function showAddItemForm() {
    document.getElementById('addItemForm').style.display = 'block';
    document.getElementById('addAnotherItemBtn').style.display = 'none';
    document.getElementById('itemName').focus();
}

function updateItemsTable() {
    const tbody = document.getElementById('itemsTableBody');
    tbody.innerHTML = '';
    let totalAmount = 0;
    let totalItems = 0;
    items.forEach(item => {
        console.log('Item id', item.id, typeof item.id);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="Item Name">${item.name}</td>
            <td data-label="MRP (₹)">₹${item.mrp.toFixed(2)}</td>
            <td data-label="Quantity">${item.quantity}</td>
            <td data-label="Total (₹)">₹${item.total.toFixed(2)}</td>
            <td data-label="Action">
                <button class="btn-remove" onclick="removeItem('${item.id}')">Remove</button>
            </td>
        `;
        tbody.appendChild(row);
        totalAmount += item.total;
        totalItems += item.quantity;
    });
    // Calculate and show service charge
    const serviceCharge = getServiceCharge();
    document.getElementById('serviceCharges').textContent = serviceCharge.toFixed(2);
    // Bill-level discount
    const billDiscount = parseFloat(document.getElementById('billDiscount').value) || 0;
    // Update total
    document.getElementById('totalAmount').textContent = (totalAmount + serviceCharge - billDiscount).toFixed(2);
    document.getElementById('totalItems').textContent = totalItems;
}

function removeItem(id) {
    items = items.filter(item => item.id !== id);
    updateItemsTable();
}

function clearAll() {
    items = [];
    updateItemsTable();
    document.getElementById('customerPhone').value = '';
    document.getElementById('customerName').value = '';
    showMessage('All items cleared', 'success');
}

document.getElementById('billDiscount').addEventListener('input', updateItemsTable);
    
async function sendWhatsApp() {
    if (items.length === 0) {
        showMessage('Please add items to the bill', 'error');
        return;
    }
    const customerPhone = document.getElementById('customerPhone').value.trim();
    const customerName = document.getElementById('customerName').value.trim();
    if (!customerPhone) {
        showMessage('Please enter customer phone number', 'error');
        return;
    }
    try {
        if (customerName) {
            await saveCustomer({ phone: customerPhone, name: customerName });
        }
        const billDiscount = parseFloat(document.getElementById('billDiscount').value) || 0;
        const serviceCharge = getServiceCharge();
        const totalAmount = items.reduce((sum, item) => sum + item.total, 0) + serviceCharge - billDiscount;
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        const billData = {
            customer_phone: customerPhone,
            customer_name: customerName || 'Walk-in Customer',
            items: items,
            total_amount: totalAmount,
            total_items: totalItems,
            notes: 'Generated via Smart Billing System',
            discount: billDiscount,
            service_charges: serviceCharge
        };
        const billResult = await createBill(billData);
        // Generate WhatsApp message
        const currentDate = new Date();
        const formattedDate = currentDate.toLocaleDateString('en-GB');
        // Invoice number format: DD-0001/2025-26/07-0096
        let invoiceNumber = '';
        if (billResult.bill_number) {
            // bill_number is like DIP/2025-26/07-0096
            // Convert to DD-0001/2025-26/07-0096
            invoiceNumber = billResult.bill_number.replace('DIP', 'DD-0001');
        }
        let message = `DIPDIPS INVOICE\n`;
        message += `Franchisee: Buddhadeb Mondal (Garg House)\n\n`;
        message += `Invoice Date: ${formattedDate}\n`;
        message += `Invoice Number: ${invoiceNumber}\n\n`;
        message += `Dear ${customerName || 'Customer'},\n`;
        message += `Here's your INVOICE from Buddhadeb Mondal (Franchisee- Dipdips)\n\n`;
        message += `Items Purchased:\n`;
        message += `━━━━━━━━━━━━━━━\n`;
        message += `Item         Qty  Price  Subtotal\n`;
        message += `━━━━━━━━━━━━━━━\n`;
        items.forEach(item => {
            // Item name max 15 chars, no ellipsis, no padding if not needed
            const itemName = item.name.length > 15 ? item.name.substring(0, 15) : item.name;
            const qty = item.quantity;
            const price = `₹${item.mrp.toFixed(2)}`;
            const subtotal = `₹${(item.mrp * item.quantity).toFixed(2)}`;
            message += `${itemName}${' '.repeat(15 - itemName.length)}${qty} ${price} ${subtotal}\n`;
        });
        message += `━━━━━━━━━━━━━━━\n`;
        message += `Service Charges: ₹${serviceCharge.toFixed(2)}\n`;
        if (billDiscount > 0) {
            message += `Discount: -₹${billDiscount.toFixed(2)}\n`;
        }
        message += `Total Amount: ₹${totalAmount.toFixed(2)}\n\n`;
        message += `Thank you for your purchase!\n\n`;
        message += `Regards\n`;
        message += `Buddhadeb Mondal (Garg House)\n`;
        message += `DipDips: Real Food, Really Fast\n`;
        message += `Powered by SIMTRAK`;
        const whatsappUrl = `https://wa.me/${customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        showMessage('Bill created and WhatsApp opened successfully!', 'success');
        setTimeout(() => { clearAll(); }, 2000);
    } catch (error) {
        console.error('Error creating bill:', error);
        showMessage('Error creating bill. Please try again.', 'error');
    }
}

function showMessage(message, type) {
    // Determine which section is currently visible
    const stockSection = document.getElementById('stockSection');
    const billingApp = document.getElementById('billingApp');
    
    let messagesDiv;
    if (stockSection && stockSection.style.display !== 'none') {
        // Stock section is visible
        messagesDiv = document.getElementById('stockMessages');
    } else if (billingApp && billingApp.style.display !== 'none') {
        // Billing app is visible
        messagesDiv = document.getElementById('messages');
    } else {
        // Fallback to any available messages div
        messagesDiv = document.getElementById('stockMessages') || document.getElementById('messages');
    }
    
    if (!messagesDiv) {
        console.error('No messages container found');
        return;
    }
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;
    
    messagesDiv.appendChild(messageElement);
    
    // Auto-remove message after 5 seconds
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
        }
    }, 5000);
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#' || !href || href === '') {
            e.preventDefault(); // Prevent jump for #
            return;
        }
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    updateItemsTable();
    
    // Add modal click outside to close functionality
    const stockModal = document.getElementById('stockModal');
    if (stockModal) {
        stockModal.addEventListener('click', function(e) {
            if (e.target === stockModal) {
                closeStock();
            }
        });
    }
});

// --- Autocomplete Dropdown for Item Name ---
const itemNameInput = document.getElementById('itemName');
const dropdown = document.getElementById('itemNameDropdown');

itemNameInput.addEventListener('input', function() {
    const inputValue = this.value.trim().toLowerCase();
    dropdown.innerHTML = '';
    activeOptionIndex = -1;
    
    if (!inputValue) {
        dropdown.style.display = 'none';
        return;
    }
    
    const matches = [];
    
    // Search by product name
    productDatabase.forEach((product) => {
        if (product.name.toLowerCase().includes(inputValue)) {
            matches.push({
                name: product.name,
                price: product.price
            });
        }
    });
    
    if (matches.length === 0) {
        dropdown.style.display = 'none';
        return;
    }
    
    matches.forEach((match, idx) => {
        const option = document.createElement('div');
        option.className = 'autocomplete-option';
        option.textContent = match.name;
        option.addEventListener('mousedown', function(e) {
            e.preventDefault();
            itemNameInput.value = match.name;
            dropdown.style.display = 'none';
            itemNameInput.focus();
        });
        dropdown.appendChild(option);
    });
    dropdown.style.display = 'block';
});

itemNameInput.addEventListener('keydown', function(event) {
    const options = dropdown.querySelectorAll('.autocomplete-option');
    if (dropdown.style.display === 'block' && options.length > 0) {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            activeOptionIndex = (activeOptionIndex + 1) % options.length;
            options.forEach((opt, idx) => {
                opt.classList.toggle('active', idx === activeOptionIndex);
            });
            options[activeOptionIndex].scrollIntoView({ block: 'nearest' });
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            activeOptionIndex = (activeOptionIndex - 1 + options.length) % options.length;
            options.forEach((opt, idx) => {
                opt.classList.toggle('active', idx === activeOptionIndex);
            });
            options[activeOptionIndex].scrollIntoView({ block: 'nearest' });
        } else if (event.key === 'Enter') {
            if (activeOptionIndex > -1) {
                event.preventDefault();
                options[activeOptionIndex].dispatchEvent(new Event('mousedown'));
            } else {
                const inputValue = itemNameInput.value.trim().toLowerCase();
                const matches = [];
                
                // Search by product name
                productDatabase.forEach((product) => {
                    if (product.name.toLowerCase().includes(inputValue)) {
                        matches.push({ name: product.name });
                    }
                });
                
                if (matches.length === 1) {
                    itemNameInput.value = matches[0].name;
                    dropdown.style.display = 'none';
                }
            }
        }
    }
});

document.addEventListener('mousedown', function(e) {
    if (!dropdown.contains(e.target) && e.target !== itemNameInput) {
        dropdown.style.display = 'none';
    }
});

// Mobile menu button handlers
function handleMobileStartBilling() {
    const overlay = document.getElementById('mobileMenuOverlay');
    const hamburger = document.querySelector('.hamburger-menu');
    
    // Immediately hide overlay and reset state
    if (overlay) {
        overlay.style.display = 'none';
        overlay.classList.remove('active');
        overlay.style.visibility = 'hidden';
        overlay.style.opacity = '0';
        overlay.style.zIndex = '-1';
    }
    if (hamburger) {
        hamburger.classList.remove('active');
    }
    document.body.style.overflow = '';
    
    // Force a reflow to ensure the overlay is hidden
    if (overlay) overlay.offsetHeight;
    
    setTimeout(() => {
        showBillingApp();
    }, 50);
}

function handleMobileCustomerData() {
    const overlay = document.getElementById('mobileMenuOverlay');
    const hamburger = document.querySelector('.hamburger-menu');
    
    // Immediately hide overlay and reset state
    if (overlay) {
        overlay.style.display = 'none';
        overlay.classList.remove('active');
        overlay.style.visibility = 'hidden';
        overlay.style.opacity = '0';
        overlay.style.zIndex = '-1';
    }
    if (hamburger) {
        hamburger.classList.remove('active');
    }
    document.body.style.overflow = '';
    
    // Force a reflow to ensure the overlay is hidden
    if (overlay) overlay.offsetHeight;
    
    setTimeout(() => {
        showCustomerData();
    }, 50);
}

function handleMobileSalesReport() {
    const overlay = document.getElementById('mobileMenuOverlay');
    const hamburger = document.querySelector('.hamburger-menu');
    
    // Immediately hide overlay and reset state
    if (overlay) {
        overlay.style.display = 'none';
        overlay.classList.remove('active');
        overlay.style.visibility = 'hidden';
        overlay.style.opacity = '0';
        overlay.style.zIndex = '-1';
    }
    if (hamburger) {
        hamburger.classList.remove('active');
    }
    document.body.style.overflow = '';
    
    // Force a reflow to ensure the overlay is hidden
    if (overlay) overlay.offsetHeight;
    
    setTimeout(() => {
        showSalesReport();
    }, 50);
}

function handleMobileStock() {
    const overlay = document.getElementById('mobileMenuOverlay');
    const hamburger = document.querySelector('.hamburger-menu');
    
    // Immediately hide overlay and reset state
    if (overlay) {
        overlay.style.display = 'none';
        overlay.classList.remove('active');
        overlay.style.visibility = 'hidden';
        overlay.style.opacity = '0';
        overlay.style.zIndex = '-1';
    }
    if (hamburger) {
        hamburger.classList.remove('active');
    }
    document.body.style.overflow = '';
    
    // Force a reflow to ensure the overlay is hidden
    if (overlay) overlay.offsetHeight;
    
    setTimeout(() => {
        showStock();
    }, 50);
}

async function updateStockTable() {
    try {
        const stock = await fetchStock();
        console.log('Fetched stock:', stock); // Log the stock array for debugging
        const tbody = document.getElementById('stockTableBody');
        tbody.innerHTML = '';
        
        stock.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Item Name">${item.name}</td>
                <td data-label="Brand">${item.brand || '-'}</td>
                <td data-label="MRP (₹)">₹${item.mrp}</td>
                <td data-label="Purchased Price (₹)">₹${item.purchased_price || '-'}</td>
                <td data-label="Quantity">${item.quantity || 0}</td>
                <td data-label="Action">
                    <button class="btn-remove" onclick="removeStockItem('${item.product_id}')">Remove</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error updating stock table:', error);
        showMessage('Error loading stock data', 'error');
    }
}

async function removeStockItem(id) {
    if (confirm('Are you sure you want to remove this item?')) {
        try {
            // const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/stock/${id}`, {
                method: 'DELETE',
                // headers: {
                //     'Authorization': `Bearer ${token}`
                // }
            });
            if (response.ok) {
                showMessage('Item removed successfully', 'success');
                await updateStockTable();
            } else {
                const result = await response.json();
                showMessage(result.error || 'Failed to remove item', 'error');
            }
        } catch (error) {
            showMessage('Error removing item', 'error');
        }
    }
}

function clearStockForm() {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Add New Stock (new item) fields
    const newFields = [
        'stockItemName', 'stockBrand', 'stockMRP', 'stockPurchasedPrice', 'stockQuantity',
        'stockVendorInput', 'stockInvoice', 'stockDate',
        'consumableGlass', 'consumableSpoon', 'consumableStirrer',
        'consumableNapkin', 'consumableFoilSmall', 'consumableFoilBig'
    ];
    newFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (el.type === 'number' || el.type === 'text' || el.type === 'date') {
                if (el.type === 'date') {
                    el.value = today;
                } else if (el.type === 'number') {
                    el.value = (id === 'stockQuantity') ? '1' : '0';
                } else {
                    el.value = '';
                }
            }
        }
    });
    // Add Stock (existing item) fields
    const existingFields = [
        'existingStockItemNameInput', 'existingStockVendorInput', 'existingStockMRP',
        'existingStockPurchasePrice', 'existingStockInvoice', 'existingStockDate',
        'existingStockBrand', 'existingStockAddQuantity'
    ];
    existingFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (el.type === 'number') {
                el.value = (id === 'existingStockAddQuantity') ? '1' : '';
            } else if (el.type === 'date') {
                el.value = today;
            } else {
                el.value = '';
            }
        }
    });
}

// --- Fetch and Populate Customer Data ---
async function fetchAndDisplayCustomerData() {
    try {
        // Fetch all customers
        const customers = await fetch(`${API_BASE_URL}/customers`).then(r => r.json());
        // Fetch all bills to get last purchase date
        const bills = await fetch(`${API_BASE_URL}/bills`).then(r => r.json());
        // Map phone to last purchase date
        const lastPurchaseMap = {};
        bills.forEach(bill => {
            if (bill.customer_phone) {
                const prev = lastPurchaseMap[bill.customer_phone];
                const billDate = bill.bill_date || bill.created_at;
                if (!prev || new Date(billDate) > new Date(prev)) {
                    lastPurchaseMap[bill.customer_phone] = billDate;
                }
            }
        });
        // Populate table
        const tbody = document.getElementById('customerDataTableBody');
        tbody.innerHTML = '';
        customers.forEach(cust => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="Name">${cust.name || ''}</td>
                <td data-label="WhatsApp Number">${cust.phone || ''}</td>
                <td data-label="Last Purchase Date">${lastPurchaseMap[cust.phone] ? new Date(lastPurchaseMap[cust.phone]).toLocaleDateString() : '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        showMessage('Error loading customer data', 'error');
    }
}

// --- Fetch and Populate Sales Report ---
async function fetchAndDisplaySalesReport() {
    try {
        const sales = await fetch(`${API_BASE_URL}/reports/sales`).then(r => r.json());
        const tbody = document.getElementById('salesReportTableBody');
        tbody.innerHTML = '';
        sales.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="Date">${row.date}</td>
                <td data-label="Total Bills">${row.total_bills}</td>
                <td data-label="Total Sales (₹)">₹${row.total_sales.toFixed(2)}</td>
                <td data-label="Total Items Sold">${row.total_items_sold}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        showMessage('Error loading sales report', 'error');
    }
}

// Update addStockItem to send all new fields
async function addStockItem() {
    const itemName = document.getElementById('stockItemName').value.trim();
    const brand = document.getElementById('stockBrand').value.trim();
    const mrp = parseFloat(document.getElementById('stockMRP').value) || 0;
    const purchasedPrice = parseFloat(document.getElementById('stockPurchasedPrice').value) || 0;
    const quantity = parseInt(document.getElementById('stockQuantity').value) || 1;
    
    if (!itemName || !mrp) {
        showMessage('Please fill all required fields', 'error');
        return;
    }
    
    // Check if user is authenticated
    // const token = localStorage.getItem('token');
    // if (!token) {
    //     showMessage('Please log in to add stock items. Go to Admin panel first.', 'error');
    //     return;
    // }
    
    try {
        // First add the product
        const productResponse = await fetch(`${API_BASE_URL}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: itemName,
                brand: brand,
                mrp: mrp,
                purchased_price: purchasedPrice
            })
        });
        
        if (!productResponse.ok) {
            const errorData = await productResponse.json();
            throw new Error(errorData.error || 'Failed to add product');
        }
        
        const productResult = await productResponse.json();
        
        if (productResult.id) {
            // Then update stock
            await addStockItemAPI({
                product_id: productResult.id,
                quantity: quantity
            });
            
            showMessage('Stock item added successfully', 'success');
            clearStockForm();
            await updateStockTable();
            await fetchProducts(); // Refresh product database
        }
    } catch (error) {
        console.error('Error adding stock item:', error);
        showMessage(`Error adding stock item: ${error.message}`, 'error');
    }
}

// Update addQuantityToExistingStock to send all new fields
async function addQuantityToExistingStock() {
    const itemName = document.getElementById('existingStockItemNameInput').value;
    const vendor = document.getElementById('existingStockVendorInput').value;
    const mrp = parseFloat(document.getElementById('existingStockMRP').value) || 0;
    const purchasePrice = parseFloat(document.getElementById('existingStockPurchasePrice').value) || 0;
    const invoice = document.getElementById('existingStockInvoice').value.trim();
    const date = document.getElementById('existingStockDate').value;
    const brand = document.getElementById('existingStockBrand').value.trim();
    const quantity = parseInt(document.getElementById('existingStockAddQuantity').value) || 1;
    if (!itemName || !mrp) {
        showMessage('Please fill all required fields', 'error');
        return;
    }
    try {
        // Find product by name
        const product = productDatabase.find(p => p.name === itemName);
        if (!product) {
            showMessage('Product not found', 'error');
            return;
        }
        await addStockItemAPI({
            product_id: product._id,
            quantity: quantity,
            vendor: vendor,
            invoice: invoice,
            date: date,
            brand: brand,
            mrp: mrp,
            purchased_price: purchasePrice
        });
        showMessage('Stock quantity updated successfully', 'success');
        clearStockForm();
        await updateStockTable();
    } catch (error) {
        console.error('Error updating stock quantity:', error);
        showMessage(`Error updating stock: ${error.message}`, 'error');
    }
}

// --- Add New Stock Stepper Logic ---
document.addEventListener('DOMContentLoaded', function() {
    const nextBtn = document.getElementById('nextToConsumablesBtn');
    const backBtn = document.getElementById('backToProductBtn');
    const step1 = document.getElementById('addStockFormStep1');
    const step2 = document.getElementById('addStockFormStep2');
    const submitBtn = document.getElementById('submitNewStockBtn');

    if (nextBtn && backBtn && step1 && step2) {
        nextBtn.onclick = function() {
            // Optionally validate step 1 fields here
            step1.style.display = 'none';
            step2.style.display = 'block';
        };
        backBtn.onclick = function() {
            step2.style.display = 'none';
            step1.style.display = 'block';
        };
        step2.onsubmit = function(e) {
            e.preventDefault();
            addStockItemWithConsumables();
        };
    }
    
    // Initialize data and dropdowns
    initializeApp();
});

// Initialize the application
async function initializeApp() {
    try {
        // Load all necessary data
        await Promise.all([
            fetchProducts(),
            fetchStock(),
            fetchCustomers()
        ]);
        
        // Set up customer dropdowns
        setupCustomerDropdowns();
        
        console.log('App initialized successfully');
        console.log('Products loaded:', productDatabase.length);
        console.log('Customers loaded:', customerDatabase.length);
        console.log('Stock loaded:', stockDatabase.length);
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

async function addStockItemWithConsumables() {
    // Product fields
    const itemName = document.getElementById('stockItemName').value.trim();
    const brand = document.getElementById('stockBrand').value.trim();
    const mrp = parseFloat(document.getElementById('stockMRP').value) || 0;
    const purchasedPrice = parseFloat(document.getElementById('stockPurchasedPrice').value) || 0;
    const quantity = parseInt(document.getElementById('stockQuantity').value) || 1;
    const vendor = document.getElementById('stockVendorInput').value;
    const invoice = document.getElementById('stockInvoice').value.trim();
    const date = document.getElementById('stockDate').value;
    // Consumables
    const consumables = {
        glass_150ml: parseInt(document.getElementById('consumableGlass').value) || 0,
        spoon: parseInt(document.getElementById('consumableSpoon').value) || 0,
        stirrer: parseInt(document.getElementById('consumableStirrer').value) || 0,
        napkin: parseInt(document.getElementById('consumableNapkin').value) || 0,
        foil_small: parseInt(document.getElementById('consumableFoilSmall').value) || 0,
        foil_big: parseInt(document.getElementById('consumableFoilBig').value) || 0
    };
    if (!itemName || !mrp) {
        showMessage('Please fill all required fields', 'error');
        return;
    }
    try {
        // Add product with consumables
        const productResponse = await fetch(`${API_BASE_URL}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: itemName,
                brand: brand,
                mrp: mrp,
                purchased_price: purchasedPrice,
                vendor: vendor,
                invoice: invoice,
                date: date,
                consumables: consumables
            })
        });
        if (!productResponse.ok) {
            const errorData = await productResponse.json();
            throw new Error(errorData.error || 'Failed to add product');
        }
        const productResult = await productResponse.json();
        if (productResult.id) {
            // Then update stock
            await addStockItemAPI({
                product_id: productResult.id,
                quantity: quantity,
                vendor: vendor,
                invoice: invoice,
                date: date
            });
            showMessage('Stock item added successfully', 'success');
            clearStockForm();
            await updateStockTable();
            await fetchProducts(); // Refresh product database
            // Reset stepper
            document.getElementById('addStockFormStep1').style.display = 'block';
            document.getElementById('addStockFormStep2').style.display = 'none';
        }
    } catch (error) {
        console.error('Error adding stock item:', error);
        showMessage(`Error adding stock item: ${error.message}`, 'error');
    }
}

// --- Autocomplete Dropdown for Stock Item Name (Existing Stock) ---
function setupExistingStockItemDropdown() {
    const input = document.getElementById('existingStockItemNameInput');
    const dropdown = document.getElementById('existingStockItemDropdown');
    if (!input || !dropdown) return;
    function showDropdown(value) {
        dropdown.innerHTML = '';
        let matches = [];
        if (!value) {
            matches = productDatabase;
        } else {
            matches = productDatabase.filter(product => product.name.toLowerCase().includes(value));
        }
        if (matches.length === 0) {
            dropdown.style.display = 'none';
            return;
        }
        matches.forEach(match => {
            const option = document.createElement('div');
            option.className = 'autocomplete-option';
            option.textContent = match.name;
            option.addEventListener('mousedown', function(e) {
                e.preventDefault();
                input.value = match.name;
                // Autofill related fields
                document.getElementById('existingStockBrand').value = match.brand || '';
                document.getElementById('existingStockMRP').value = match.mrp || '';
                document.getElementById('existingStockPurchasePrice').value = match.purchased_price || '';
                document.getElementById('existingStockAddQuantity').value = (match.quantity !== undefined && match.quantity !== null) ? match.quantity : 1;
                dropdown.style.display = 'none';
                input.focus();
            });
            dropdown.appendChild(option);
        });
        dropdown.style.display = 'block';
    }
    input.addEventListener('input', function() {
        const value = this.value.trim().toLowerCase();
        showDropdown(value);
    });
    input.addEventListener('focus', function() {
        showDropdown('');
    });
    input.addEventListener('blur', function() {
        setTimeout(() => { dropdown.style.display = 'none'; }, 200);
    });
}

// --- Autocomplete Dropdown for Vendor (Existing Stock) ---
function setupExistingStockVendorDropdown() {
    const input = document.getElementById('existingStockVendorInput');
    const dropdown = document.getElementById('existingStockVendorDropdown');
    if (!input || !dropdown) return;
    const vendors = ["PURVANCHAL", "AMAZON", "BLINKIT", "METRO", "BB"];
    input.addEventListener('input', function() {
        const value = this.value.trim().toLowerCase();
        dropdown.innerHTML = '';
        if (!value) {
            dropdown.style.display = 'none';
            return;
        }
        const matches = vendors.filter(vendor => vendor.toLowerCase().includes(value));
        if (matches.length === 0) {
            dropdown.style.display = 'none';
            return;
        }
        matches.forEach(match => {
            const option = document.createElement('div');
            option.className = 'autocomplete-option';
            option.textContent = match;
            option.addEventListener('mousedown', function(e) {
                e.preventDefault();
                input.value = match;
                dropdown.style.display = 'none';
                input.focus();
            });
            dropdown.appendChild(option);
        });
        dropdown.style.display = 'block';
    });
    input.addEventListener('blur', function() {
        setTimeout(() => { dropdown.style.display = 'none'; }, 200);
    });
}

// --- Autocomplete Dropdown for Vendor (Add New Stock) ---
function setupNewStockVendorDropdown() {
    const input = document.getElementById('stockVendorInput');
    const dropdown = document.getElementById('stockVendorDropdown');
    if (!input || !dropdown) return;
    const vendors = ["PURVANCHAL", "AMAZON", "BLINKIT", "METRO", "BB"];
    input.addEventListener('input', function() {
        const value = this.value.trim().toLowerCase();
        dropdown.innerHTML = '';
        if (!value) {
            dropdown.style.display = 'none';
            return;
        }
        const matches = vendors.filter(vendor => vendor.toLowerCase().includes(value));
        if (matches.length === 0) {
            dropdown.style.display = 'none';
            return;
        }
        matches.forEach(match => {
            const option = document.createElement('div');
            option.className = 'autocomplete-option';
            option.textContent = match;
            option.addEventListener('mousedown', function(e) {
                e.preventDefault();
                input.value = match;
                dropdown.style.display = 'none';
                input.focus();
            });
            dropdown.appendChild(option);
        });
        dropdown.style.display = 'block';
    });
    input.addEventListener('blur', function() {
        setTimeout(() => { dropdown.style.display = 'none'; }, 200);
    });
}

// Call these in showStock after productDatabase is loaded
function setupStockDropdowns() {
    setupExistingStockItemDropdown();
    setupExistingStockVendorDropdown();
    setupNewStockVendorDropdown();
}

// Patch showStock to call setupStockDropdowns after productDatabase is loaded
const originalShowStock = showStock;
showStock = function() {
    originalShowStock.apply(this, arguments);
    setTimeout(setupStockDropdowns, 200); // Wait for DOM and productDatabase
};