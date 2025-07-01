// Check if user is already logged in
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        loadAdminData();
    }
});

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('loginMessage');

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const result = await response.json();

        if (response.ok) {
            localStorage.setItem('token', result.token);
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('adminPanel').style.display = 'block';
            loadAdminData();
        } else {
            messageDiv.textContent = result.error || 'Login failed';
            messageDiv.style.color = 'red';
        }
    } catch (error) {
        messageDiv.textContent = 'An error occurred during login.';
        messageDiv.style.color = 'red';
    }
}

function logout() {
    localStorage.removeItem('token');
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('adminPanel').style.display = 'none';
}

function showTab(tabName) {
    document.querySelectorAll('.admin-content').forEach(c => c.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');

    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.admin-tab[onclick="showTab('${tabName}')"]`).classList.add('active');

    // Load data for the specific tab
    switch (tabName) {
        case 'dashboard':
            loadDashboardStats();
            loadRecentBills();
            break;
        case 'bills':
            loadAllBills();
            break;
        case 'stock':
            loadStockList();
            break;
        case 'customers':
            loadCustomerList();
            break;
    }
}

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

async function loadAdminData() {
    // Initial load for the default tab (dashboard)
    showTab('dashboard');
}

async function loadDashboardStats() {
    try {
        const headers = getAuthHeaders();
        const [billsRes, customersRes, productsRes] = await Promise.all([
            fetch('/api/bills', { headers }),
            fetch('/api/customers', { headers }),
            fetch('/api/products', { headers })
        ]);

        const bills = await billsRes.json();
        const customers = await customersRes.json();
        const products = await productsRes.json();

        document.getElementById('totalBills').textContent = bills.length || 0;
        document.getElementById('totalCustomers').textContent = customers.length || 0;
        document.getElementById('totalProducts').textContent = products.length || 0;
        
        const totalSales = bills.reduce((sum, bill) => sum + bill.total_amount, 0);
        document.getElementById('totalSales').textContent = `₹${totalSales.toFixed(2)}`;

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

async function loadRecentBills() {
    try {
        const response = await fetch('/api/bills?limit=5', { headers: getAuthHeaders() });
        const bills = await response.json();
        const listEl = document.getElementById('recentBillsList');
        if (!listEl) return;
        listEl.innerHTML = bills.map(bill => `
            <div class="bill-item">
                <div class="bill-info">
                    <h4>${bill.bill_number}</h4>
                    <p>${bill.customer_name || 'Walk-in'} - ${new Date(bill.bill_date).toLocaleDateString()}</p>
                </div>
                <div class="bill-amount">₹${bill.total_amount.toFixed(2)}</div>
            </div>
        `).join('') || '<p>No recent invoices found.</p>';
    } catch (error) {
        console.error('Error loading recent bills:', error);
    }
}

async function loadAllBills() {
    try {
        const response = await fetch('/api/bills', { headers: getAuthHeaders() });
        const bills = await response.json();
        const listEl = document.getElementById('allBillsList');
        if (!listEl) return;
        listEl.innerHTML = `
            <table class="table">
                <thead><tr><th>Bill #</th><th>Customer</th><th>Date</th><th>Items</th><th>Amount</th></tr></thead>
                <tbody>
                    ${bills.map(bill => `
                        <tr>
                            <td>${bill.bill_number}</td>
                            <td>${bill.customer_name || 'Walk-in'}</td>
                            <td>${new Date(bill.bill_date).toLocaleDateString()}</td>
                            <td>${bill.total_items}</td>
                            <td>₹${bill.total_amount.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    } catch (error) {
        console.error('Error loading all bills:', error);
    }
}

async function loadStockList() {
    try {
        const headers = getAuthHeaders();
        const [stockRes, productsRes] = await Promise.all([
            fetch('/api/stock', { headers }),
            fetch('/api/products', { headers })
        ]);
        
        const stockItems = await stockRes.json();
        const products = await productsRes.json();

        const productSelect = document.getElementById('productSelect');
        if(productSelect){
            productSelect.innerHTML = products.map(p => `<option value="${p._id}">${p.name}</option>`).join('');
        }

        const listEl = document.getElementById('stockList');
        if(listEl) {
            listEl.innerHTML = `
            <table class="table">
                <thead><tr><th>Product</th><th>Brand</th><th>In Stock</th><th>Min. Qty</th></tr></thead>
                <tbody>
                    ${stockItems.map(item => `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.brand || '-'}</td>
                            <td>${item.quantity}</td>
                            <td>${item.min_quantity}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
        }
    } catch (error) {
        console.error('Error loading stock list:', error);
    }
}

async function updateStock() {
    const productId = document.getElementById('productSelect').value;
    const quantity = document.getElementById('quantityInput').value;
    const notes = document.getElementById('notesInput').value;
    const messageDiv = document.getElementById('updateStockMessage');

    if (!productId || quantity === '') {
        messageDiv.textContent = 'Please select a product and enter a quantity.';
        messageDiv.style.color = 'red';
        return;
    }

    try {
        const response = await fetch('/api/stock', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ 
                product_id: productId, 
                quantity: parseInt(quantity),
                notes: notes
            }),
        });
        const result = await response.json();
        if (response.ok) {
            messageDiv.textContent = 'Stock updated successfully!';
            messageDiv.style.color = 'green';
            document.getElementById('quantityInput').value = '';
            document.getElementById('notesInput').value = '';
            loadStockList(); // Refresh list
        } else {
            messageDiv.textContent = result.error || 'Failed to update stock.';
            messageDiv.style.color = 'red';
        }
    } catch (error) {
        messageDiv.textContent = 'An error occurred while updating stock.';
        messageDiv.style.color = 'red';
    }
}

async function loadCustomerList() {
    try {
        const response = await fetch('/api/customers', { headers: getAuthHeaders() });
        const customers = await response.json();
        const listEl = document.getElementById('customerList');
        listEl.innerHTML = `
            <table class="table">
                <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Address</th></tr></thead>
                <tbody>
                    ${customers.map(customer => `
                        <tr>
                            <td>${customer.name}</td>
                            <td>${customer.phone}</td>
                            <td>${customer.email || '-'}</td>
                            <td>${customer.address || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    } catch (error) {
        console.error('Error loading customer list:', error);
    }
} 