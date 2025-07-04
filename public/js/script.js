// Mobile Menu Functions
function toggleMobileMenu() {
    const overlay = document.getElementById('mobileMenuOverlay');
    const hamburger = document.querySelector('.hamburger-menu');
    
    if (overlay.classList.contains('active')) {
        closeMobileMenu();
    } else {
        overlay.classList.add('active');
        hamburger.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeMobileMenu() {
    const overlay = document.getElementById('mobileMenuOverlay');
    const hamburger = document.querySelector('.hamburger-menu');
    
    if (overlay) {
        overlay.classList.remove('active');
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
        const token = localStorage.getItem('token'); 
        const response = await fetch(`${API_BASE_URL}/stock`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
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
    
    try {
        // First add the product
        const token = localStorage.getItem('token'); 
        const productResponse = await fetch(`${API_BASE_URL}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: itemName,
                brand: brand,
                mrp: mrp,
                purchased_price: purchasedPrice
            })
        });
        
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
        showMessage('Error adding stock item', 'error');
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
    const customerPhoneInput = document.getElementById('customerPhone');
    const customerNameInput = document.getElementById('customerName');
    
    if (customerPhoneInput) {
        customerPhoneInput.addEventListener('click', showCustomerDropdown);
        customerPhoneInput.addEventListener('input', filterCustomers);
        customerPhoneInput.addEventListener('keydown', handleCustomerKeydown);
        customerPhoneInput.addEventListener('blur', hideCustomerDropdown);
    }
    
    if (customerNameInput) {
        customerNameInput.addEventListener('click', showCustomerDropdown);
        customerNameInput.addEventListener('input', filterCustomers);
        customerNameInput.addEventListener('keydown', handleCustomerKeydown);
        customerNameInput.addEventListener('blur', hideCustomerDropdown);
    }
}

function showCustomerDropdown() {
    const dropdown = getOrCreateCustomerDropdown();
    const customers = customerDatabase.filter(customer => 
        customer.name && customer.phone
    );
    
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
        
        document.body.appendChild(dropdown);
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
        
        dropdown.style.left = rect.left + 'px';
        dropdown.style.top = (rect.bottom + window.scrollY) + 'px';
        dropdown.style.width = rect.width + 'px';
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
function showBillingApp() {
    closeMobileMenu();
    
    const homePage = document.getElementById('homePage');
    const billingApp = document.getElementById('billingApp');
    
    if (homePage && billingApp) {
        homePage.classList.add('hidden');
        billingApp.classList.add('active');
        
        document.body.style.background = 'var(--primary-purple)';
        document.body.style.minHeight = '100vh';
        document.body.style.padding = '20px';
        
        if (window.innerWidth <= 768) {
            document.body.style.overflow = 'auto';
            window.scrollTo(0, 0);
        }
    }
}

function showHomePage() {
    const homePage = document.getElementById('homePage');
    const billingApp = document.getElementById('billingApp');
    
    if (homePage && billingApp) {
        homePage.classList.remove('hidden');
        billingApp.classList.remove('active');
        
        document.body.style.background = '';
        document.body.style.minHeight = '';
        document.body.style.padding = '';
    }
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
            <td>${item.name}</td>
            <td>₹${item.mrp.toFixed(2)}</td>
            <td>${item.quantity}</td>
            <td>₹${item.total.toFixed(2)}</td>
            <td>
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
        const invoiceNumber = billResult.bill_number;
        let message = `*DIPDIPS INVOICE*\n`;
        message += `*Franchisee: Buddhadeb Mondal (Garg House)*\n\n`;
        message += `Invoice Date: ${formattedDate}\n`;
        message += `Invoice Number: *${invoiceNumber}*\n\n`;
        message += `Dear ${customerName || 'Customer'},\n`;
        message += `Here's your INVOICE from Buddhadeb Mondal (Franchisee- Dipdips)\n\n`;
    message += `*Items Purchased:*\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `Item Name          Qty  Price   Subtotal  Total\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
    items.forEach(item => {
            const itemName = item.name.length > 15 ? item.name.substring(0, 12) + '...' : item.name.padEnd(15);
            const qty = item.quantity.toString().padStart(3);
            const price = `₹${item.mrp.toFixed(2)}`.padStart(8);
            const subtotal = `₹${(item.mrp * item.quantity).toFixed(2)}`.padStart(10);
            const total = `₹${item.total.toFixed(0)}`.padStart(5);
            message += `${itemName}    ${qty}  ${price}   ${subtotal}  ${total}\n`;
        });
        message += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `Service Charges: ₹${serviceCharge.toFixed(2)}\n`;
        if (billDiscount > 0) {
            message += `Discount: -₹${billDiscount.toFixed(2)}\n`;
        }
    message += `*Total Amount: ₹${totalAmount.toFixed(2)}*\n\n`;
    message += `Thank you for your purchase!\n\n`;
        message += `Regards\n`;
        message += `Franchisee Name\n`;
        message += `*DipDips: Real Food, Really Fast*\n`;
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
    const messagesDiv = document.getElementById('messages');
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
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
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
    closeMobileMenu();
    setTimeout(() => {
        showBillingApp();
    }, 100);
}

function handleMobileStock() {
    closeMobileMenu();
    setTimeout(() => {
        showStock();
    }, 100);
}

function showStock() {
    const stockModal = document.getElementById('stockModal');
    const stockTableBody = document.getElementById('stockTableBody');
    
    if (!stockModal || !stockTableBody) {
        showMessage('Stock modal elements not found.', 'error');
        return;
    }
    
    // Update stock table
    updateStockTable();
    
    // Show the modal
    stockModal.style.display = 'flex';
    
    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
}

async function updateStockTable() {
    try {
        const stock = await fetchStock();
        const tbody = document.getElementById('stockTableBody');
        tbody.innerHTML = '';
        
        stock.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.brand || '-'}</td>
                <td>₹${item.mrp}</td>
                <td>₹${item.purchased_price || '-'}</td>
                <td>${item.quantity || 0}</td>
                <td>
                    <button class="btn-remove" onclick="removeStockItem('${item.id}')">Remove</button>
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
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/stock/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
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
    document.getElementById('stockItemName').value = '';
    document.getElementById('stockBrand').value = '';
    document.getElementById('stockMRP').value = '';
    document.getElementById('stockPurchasedPrice').value = '';
    document.getElementById('stockQuantity').value = '1';
}

function closeStock() {
    const stockModal = document.getElementById('stockModal');
    if (stockModal) {
        stockModal.style.display = 'none';
        
        // Restore background scrolling
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
    }
}