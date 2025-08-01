document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('admin_token');
    const role = localStorage.getItem('admin_role');
    if (token && role === 'admin') { 
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        loadAdminData();
    } else {
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('adminPanel').style.display = 'none';
    }
    loadFranchiseApprovals();
    loadApprovedFranchises();
});



async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('loginMessage');

    try {
        const response = await fetch('/api/adminlogin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const result = await response.json();

        if (response.ok) {
            localStorage.setItem('admin_token', result.token);
            localStorage.setItem('admin_role', result.user.role); // <-- Use admin_role
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
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_role');
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
        case 'notifications': // ✅ Add this block
            loadFranchiseApprovals();
            break;
    }
}

function getAuthHeaders() {
    const token = localStorage.getItem('admin_token');
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
        const query = selectedFranchiseId ? `?franchise_id=${selectedFranchiseId}` : '';

        const [billsRes, customersRes, productsRes] = await Promise.all([
            fetch(`/api/bills${query}`, { headers }),
            fetch(`/api/customers${query}`, { headers }),
            fetch(`/api/products${query}`, { headers })
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
        const headers = getAuthHeaders();
        const baseUrl = '/api/bills';
        const params = new URLSearchParams();

        params.append('limit', '5');
        if (selectedFranchiseId) {
            params.append('franchise_id', selectedFranchiseId);
        }

        const response = await fetch(`${baseUrl}?${params.toString()}`, { headers });
        const bills = await response.json();

        const listEl = document.getElementById('recentBillsList');
        if (!listEl) return;

        listEl.innerHTML = bills.length > 0
            ? bills.map(bill => `
                <div class="bill-item">
                    <div class="bill-info">
                        <h4>${bill.bill_number}</h4>
                        <p>${bill.customer_name || 'Walk-in'} - ${new Date(bill.bill_date).toLocaleDateString()}</p>
                    </div>
                    <div class="bill-amount">₹${bill.total_amount.toFixed(2)}</div>
                </div>
            `).join('')
            : '<p>No recent invoices found.</p>';

    } catch (error) {
        console.error('Error loading recent bills:', error);
    }
}


async function loadAllBills() {
    try {
        const headers = getAuthHeaders();
        const baseUrl = '/api/bills';
        const params = new URLSearchParams();

        if (selectedFranchiseId) {
            params.append('franchise_id', selectedFranchiseId);
        }

        const response = await fetch(`${baseUrl}?${params.toString()}`, { headers });
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
        const params = new URLSearchParams();

        if (selectedFranchiseId) {
            params.append('franchise_id', selectedFranchiseId);
        }

        const [stockRes, productsRes] = await Promise.all([
            fetch(`/api/stock?${params.toString()}`, { headers }),
            fetch(`/api/products?${params.toString()}`, { headers })
        ]);
        
        const stockItems = await stockRes.json();
        const products = await productsRes.json();

        const productSelect = document.getElementById('productSelect');
        if (productSelect) {
            productSelect.innerHTML = products.map(p => `<option value="${p._id}">${p.name}</option>`).join('');
        }

        const listEl = document.getElementById('stockList');
        if (listEl) {
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
        const bodyData = {
            product_id: productId,
            quantity: parseInt(quantity),
            notes: notes
        };

        // ✅ Add franchise_id if admin and selectedFranchiseId is set
        const role = localStorage.getItem('admin_role');
        if (role === 'admin' && selectedFranchiseId) {
            bodyData.franchise_id = selectedFranchiseId;
        }

        const response = await fetch('/api/stock', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(bodyData),
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
        const role = localStorage.getItem('admin_role');
        const headers = getAuthHeaders();

        let url = '/api/customers';
        if (role === 'admin' && selectedFranchiseId) {
            url += `?franchise_id=${selectedFranchiseId}`;
        }

        const response = await fetch(url, { headers });
        const customers = await response.json();

        const listEl = document.getElementById('customerList');
        if (!listEl) return;

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


async function loadFranchiseApprovals() {
  try {
    const res = await fetch('/api/franchise-approvals', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('admin_token')}` // ✅ important
      }
    });

    const users = await res.json();

    const container = document.getElementById('franchiseApprovalList');
    container.innerHTML = '';

    if (!Array.isArray(users) || users.length === 0) {
      container.innerHTML = '<p>No franchise registrations found.</p>';
      return;
    }

    users.forEach(user => {
      const div = document.createElement('div');
      div.className = 'bill-item';
      div.id = `user-${user._id}`;

      const statusHTML = user.status === 'pending'
  ? `
      <button onclick="approveFranchise('${user._id}')" class="action-button approve-btn">Approve</button>
      <button onclick="rejectFranchise('${user._id}')" class="action-button reject-btn">Reject</button>
    `
  : `<p><strong>Status: ${user.status}</strong></p>`;


      div.innerHTML = `
        <div class="bill-info">
          <h4>${user.franchise_name}</h4>
          <p>Location: ${user.location}</p>
          <p>Phone: ${user.phone_number}</p>
        </div>
        <div class="status-buttons">
          ${statusHTML}
        </div>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    console.error('Failed to load franchise approvals:', err);
    document.getElementById('franchiseApprovalList').innerHTML = '<p>Error loading data.</p>';
  }
}




async function updateFranchiseStatus(id, status) {
    try {
        const res = await fetch(`/api/franchise/${id}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}` // ✅ add this line
            },
            body: JSON.stringify({ status }),
        });

        const result = await res.json();

        if (res.ok) {
            loadFranchiseApprovals(); // Reload list on success
        } else {
            alert(result.error || 'Something went wrong');
        }
    } catch (err) {
        alert('Network error');
    }
}


function approveFranchise(id) {
    updateFranchiseStatus(id, 'approved');
}

function rejectFranchise(id) {
    updateFranchiseStatus(id, 'rejected');
}

// ✅ Call this when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    loadFranchiseApprovals();
});


function renderFranchises(franchises) {
  const container = document.getElementById('franchiseList');
  container.innerHTML = '';

  franchises.forEach(user => {
    const userDiv = document.createElement('div');
    userDiv.setAttribute('id', `franchise-${user._id}`);

    // Only show buttons if user is pending
    const actions = user.status === 'pending'
      ? `<button onclick="approveFranchise('${user._id}')" style="margin-right: 10px;">Approve</button>
         <button onclick="rejectFranchise('${user._id}')">Reject</button>`
      : `<span>Status: ${user.status}</span>`;

    userDiv.innerHTML = `
      <p><strong>Username:</strong> ${user.username}</p>
      <div id="actions-${user._id}">
        ${actions}
      </div>
      <hr/>
    `;

    container.appendChild(userDiv);
  });
}

async function loadApprovedFranchises() {
  try {
    const res = await fetch('/api/approved-franchises');
    const franchises = await res.json();

    const select = document.getElementById('approvedFranchiseSelect');
    select.innerHTML = '<option value="">ALL</option>'; // Reset

    if (!Array.isArray(franchises) || franchises.length === 0) {
      const opt = document.createElement('option');
      opt.text = 'No approved franchises';
      opt.disabled = true;
      select.appendChild(opt);
      return;
    }

    franchises.forEach(franchise => {
      const option = document.createElement('option');
      option.value = franchise._id;
      option.textContent = franchise.franchise_name;
      select.appendChild(option);
    });
  } catch (err) {
    console.error('Failed to load approved franchises:', err);
  }
}

document.addEventListener('DOMContentLoaded', loadApprovedFranchises);


let selectedFranchiseId = null;

function onFranchiseChange() {
    const select = document.getElementById('approvedFranchiseSelect');
    selectedFranchiseId = select.value || null;

    // Update heading text
    const selectedText = select.options[select.selectedIndex].textContent;
    document.getElementById('selectedFranchiseHeading').textContent = `Dipdips Franchisee: ${selectedText}`;

    // Refresh current tab data
    showTab(getCurrentTab());
}

function getCurrentTab() {
    const activeTab = document.querySelector('.admin-tab.active');
    if (!activeTab) return 'dashboard';
    const onclickAttr = activeTab.getAttribute('onclick');
    const match = onclickAttr.match(/showTab\('(.+?)'\)/);
    return match ? match[1] : 'dashboard';
}
