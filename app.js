// ===================== GLOBAL VARIABLES =====================
let currentUser = null;
let usersData = [
    {username: 'admin', password: 'admin@2026', fullname: 'System Administrator', role: 'admin', branch: 'Head Office', status: 'active', createdDate: '2026-01-01'}
];
let salesData = [], depositData = [], customersData = [], topupData = [], promotionsData = [];
let salesChart = null, reportsChart = null, reportsGrowthChart = null, editingSalesIndex = null, editingDepositIndex = null;
let dashboardChart1 = null, dashboardChart2 = null, currentDashboardFilter = 'today';
let currentReportPeriod = 'monthly';
let reportFilteredData = [];
let editingPromotionIndex = null;

// ===================== UTILITY FUNCTIONS =====================
function showSuccessPopup(message) {
    document.getElementById('successMessage').textContent = message;
    document.getElementById('successOverlay').classList.add('show');
    document.getElementById('successPopup').classList.add('show');
}

function closeSuccessPopup() {
    document.getElementById('successOverlay').classList.remove('show');
    document.getElementById('successPopup').classList.remove('show');
}

// ===================== PERMISSION SYSTEM =====================
function canEditData(data) {
    if (currentUser.role === 'admin') return true;
    const dataStaff = data.staff_name || data.staff || data.created_by;
    const dataBranch = data.branch;
    if (currentUser.role === 'supervisor') {
        return dataBranch === currentUser.branch;
    }
    if (currentUser.role === 'agent') {
        return dataStaff === currentUser.fullname && dataBranch === currentUser.branch;
    }
    return false;
}

// ===================== PROMOTIONS PERMISSION SYSTEM =====================
function canEditPromotion(promotion) {
    // Only Admin can add/edit promotions
    return currentUser.role === 'admin';
}

function canViewPromotions() {
    // All roles can view promotions
    return true;
}

function saveDataToStorage() {
    localStorage.setItem('usersData', JSON.stringify(usersData));
    localStorage.setItem('salesData', JSON.stringify(salesData));
    localStorage.setItem('depositData', JSON.stringify(depositData));
    localStorage.setItem('customersData', JSON.stringify(customersData));
    localStorage.setItem('topupData', JSON.stringify(topupData));
    localStorage.setItem('promotionsData', JSON.stringify(promotionsData));
    
    // Auto sync to Google Sheets
    if (typeof autoSyncAfterSave === 'function') {
        autoSyncAfterSave();
    }
}

function loadDataFromStorage() {
    const saved = {
        users: localStorage.getItem('usersData'),
        sales: localStorage.getItem('salesData'),
        deposit: localStorage.getItem('depositData'),
        customers: localStorage.getItem('customersData'),
        topup: localStorage.getItem('topupData'),
        promotions: localStorage.getItem('promotionsData')
    };
    if (saved.users) usersData = JSON.parse(saved.users);
    if (saved.sales) salesData = JSON.parse(saved.sales);
    if (saved.deposit) depositData = JSON.parse(saved.deposit);
    if (saved.customers) customersData = JSON.parse(saved.customers);
    if (saved.topup) topupData = JSON.parse(saved.topup);
    if (saved.promotions) promotionsData = JSON.parse(saved.promotions);
    refreshSalesTable();
    refreshDepositTable();
    refreshCustomersTable();
    refreshTopUpTable();
    refreshUsersTable();
    refreshPromotionsGrid();
}

// ===================== PAGE LOAD & LOGIN =====================
window.addEventListener('load', function() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
        document.getElementById('loginOverlay').classList.add('show');
    } else {
        const userData = JSON.parse(sessionStorage.getItem('userData'));
        currentUser = userData;
        document.getElementById('systemContent').classList.add('show');
        document.getElementById('loggedInUser').textContent = userData.fullname;
        let roleDisplay = userData.role === 'admin' ? 'Admin' : userData.role === 'supervisor' ? 'Supervisor' : 'Agent';
        document.getElementById('userRole').textContent = roleDisplay;
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
        document.getElementById('deposit_date').value = today;
        if (userData.username !== 'admin') {
            document.getElementById('staff_name').value = userData.fullname;
            document.getElementById('deposit_staff').value = userData.fullname;
        }
        document.getElementById('branch_name').value = userData.branch;
        loadDataFromStorage();
        checkUserPermissions();
        
        // Show sync buttons
        document.getElementById('syncButtons').style.display = 'flex';
        if (typeof getLastSyncTime === 'function') {
            document.getElementById('lastSyncDisplay').textContent = getLastSyncTime();
        }
        
        showPage('dashboard');
    }
});

// ===================== LOGIN FORM HANDLER =====================
document.getElementById('loginFormPopup').addEventListener('submit', function(e) {
    e.preventDefault();
    document.getElementById('errorMessage').classList.remove('show');
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const loginBtn = document.getElementById('loginBtn');
    loginBtn.classList.add('loading');
    loginBtn.disabled = true;
    setTimeout(function() {
        const user = usersData.find(u => u.username === username && u.password === password && u.status === 'active');
        if (user) {
            currentUser = user;
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('userData', JSON.stringify(user));
            document.getElementById('loginOverlay').classList.remove('show');
            document.getElementById('systemContent').classList.add('show');
            document.getElementById('loggedInUser').textContent = user.fullname;
            let roleDisplay = user.role === 'admin' ? 'Admin' : user.role === 'supervisor' ? 'Supervisor' : 'Agent';
            document.getElementById('userRole').textContent = roleDisplay;
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('date').value = today;
            document.getElementById('deposit_date').value = today;
            if (user.username !== 'admin') {
                document.getElementById('staff_name').value = user.fullname;
                document.getElementById('deposit_staff').value = user.fullname;
            }
            document.getElementById('branch_name').value = user.branch;
            loadDataFromStorage();
            checkUserPermissions();
            
            // Show sync buttons
            document.getElementById('syncButtons').style.display = 'flex';
            if (typeof getLastSyncTime === 'function') {
                document.getElementById('lastSyncDisplay').textContent = getLastSyncTime();
            }
            
            showPage('dashboard');
        } else {
            document.getElementById('errorMessage').classList.add('show');
        }
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
    }, 1000);
});

// ===================== PASSWORD TOGGLE =====================
document.getElementById('loginTogglePassword').addEventListener('click', function() {
    const passwordInput = document.getElementById('loginPassword');
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.classList.toggle('fa-eye');
    this.classList.toggle('fa-eye-slash');
});

// ===================== LOGOUT =====================
function logout() {
    if (confirm('តើអ្នកប្រាកដថាចង់ចាកចេញមែនទេ?')) {
        sessionStorage.clear();
        currentUser = null;
        document.getElementById('systemContent').classList.remove('show');
        document.getElementById('loginOverlay').classList.add('show');
        document.getElementById('loginFormPopup').reset();
        document.getElementById('errorMessage').classList.remove('show');
        document.getElementById('syncButtons').style.display = 'none';
    }
}

// ===================== PAGE NAVIGATION =====================
function showPage(page) {
    document.querySelectorAll('.main-content > .container > div').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.sidebar-menu li').forEach(li => li.classList.remove('active'));
    const pages = {
        'dashboard': ['dashboard-page', 'menu-dashboard', () => setTimeout(initDashboard, 100)],
        'daily-sales': ['daily-sales-page', 'menu-daily-sales', null],
        'deposit': ['deposit-page', 'menu-deposit', null],
        'reports': ['reports-page', 'menu-reports', () => { setTimeout(initReportsPage, 100); }],
        'customers': ['customers-page', 'menu-customers', checkExpiringCustomers],
        'promotions': ['promotions-page', 'menu-promotions', () => { refreshPromotionsGrid(); checkPromotionsPermissions(); }],
        'settings': ['settings-page', 'menu-settings', null]
    };
    if (pages[page]) {
        document.getElementById(pages[page][0]).classList.remove('hidden');
        document.getElementById(pages[page][1]).classList.add('active');
        if (pages[page][2]) pages[page][2]();
    }
}

// ===================== USER PERMISSIONS =====================
function checkUserPermissions() {
    const settingsMenu = document.getElementById('menu-settings');
    const addUserBtn = document.querySelector('.add-user-btn');
    
    if (currentUser.role === 'admin') {
        settingsMenu.style.display = 'block';
        document.getElementById('settingsAdminOnly').style.display = 'block';
        document.getElementById('settingsAgentMessage').classList.add('hidden');
        if (addUserBtn) addUserBtn.style.display = 'flex';
    } else {
        settingsMenu.style.display = 'none';
        document.getElementById('settingsAdminOnly').style.display = 'none';
        document.getElementById('settingsAgentMessage').classList.remove('hidden');
        if (addUserBtn) addUserBtn.style.display = 'none';
    }
}

// ===================== PROMOTIONS PERMISSIONS CHECK =====================
function checkPromotionsPermissions() {
    const addPromotionBtn = document.querySelector('.add-customer-btn[onclick="openPromotionModal()"]');
    const searchInput = document.getElementById('searchPromotion');
    
    if (currentUser.role === 'admin') {
        // Admin can add and edit
        if (addPromotionBtn) {
            addPromotionBtn.style.display = 'flex';
        }
        if (searchInput) {
            searchInput.parentElement.style.justifyContent = 'space-between';
        }
    } else {
        // Supervisor and Agent - View only
        if (addPromotionBtn) {
            addPromotionBtn.style.display = 'none';
        }
        if (searchInput) {
            // Add view-only badge
            const parentDiv = searchInput.parentElement;
            parentDiv.style.justifyContent = 'space-between';
            
            // Check if badge already exists
            if (!parentDiv.querySelector('.view-only-badge')) {
                const badge = document.createElement('div');
                badge.className = 'view-only-badge';
                badge.innerHTML = '<i class="fas fa-eye"></i> មើលប៉ុណ្ណោះ (View Only)';
                parentDiv.appendChild(badge);
            }
        }
    }
}

// ===================== DASHBOARD =====================
function filterDashboard(period) {
    currentDashboardFilter = period;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('filter-' + period).classList.add('active');
    initDashboard();
}

function getFilteredDataByPeriod(data) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return data.filter(d => {
        const dataDate = new Date(d.date);
        dataDate.setHours(0, 0, 0, 0);
        if (currentDashboardFilter === 'all') return true;
        if (currentDashboardFilter === 'today') return dataDate.getTime() === today.getTime();
        if (currentDashboardFilter === 'week') {
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            return dataDate >= weekAgo && dataDate <= today;
        }
        if (currentDashboardFilter === 'month') {
            return dataDate.getMonth() === today.getMonth() && dataDate.getFullYear() === today.getFullYear();
        }
        if (currentDashboardFilter === 'year') {
            return dataDate.getFullYear() === today.getFullYear();
        }
        return true;
    });
}

function initDashboard() {
    calculateDashboardStats();
    initDashboardCharts();
    generateLeaderboard();
}

function calculateDashboardStats() {
    let filteredData = salesData;
    if (currentUser.role !== 'admin') filteredData = salesData.filter(d => d.branch === currentUser.branch);
    filteredData = getFilteredDataByPeriod(filteredData);
    const totalRevenue = filteredData.reduce((sum, d) => sum + parseFloat(d.total_revenue || 0), 0);
    const totalRecharge = filteredData.reduce((sum, d) => sum + parseFloat(d.recharge || 0), 0);
    const totalGrossAds = filteredData.reduce((sum, d) => sum + parseInt(d.gross_ads || 0), 0);
    const totalTransactions = filteredData.length;
    document.getElementById('totalRevenue').textContent = '$' + totalRevenue.toFixed(2);
    document.getElementById('totalRecharge').textContent = '$' + totalRecharge.toFixed(2);
    document.getElementById('totalGrossAds').textContent = totalGrossAds;
    document.getElementById('totalTransactions').textContent = totalTransactions;
}

function initDashboardCharts() {
    if (dashboardChart1) dashboardChart1.destroy();
    if (dashboardChart2) dashboardChart2.destroy();
    const ctx1 = document.getElementById('dashboardChart1');
    const ctx2 = document.getElementById('dashboardChart2');
    if (!ctx1 || !ctx2) return;
    let filteredData = salesData;
    if (currentUser.role !== 'admin') filteredData = salesData.filter(d => d.branch === currentUser.branch);
    filteredData = getFilteredDataByPeriod(filteredData);
    if (filteredData.length === 0) {
        document.getElementById('branchLegend').innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">គ្មានទិន្នន័យ</p>';
        return;
    }
    if (currentUser.role === 'admin') {
        document.getElementById('chartTitle').textContent = 'Revenue by Staff';
        const staffData = {};
        filteredData.forEach(d => {
            if (!staffData[d.staff_name]) staffData[d.staff_name] = { revenue: 0, branch: d.branch };
            staffData[d.staff_name].revenue += parseFloat(d.total_revenue || 0);
        });
        const labels = Object.keys(staffData);
        const revenueData = labels.map(l => staffData[l].revenue);
        const colors = labels.map((l, i) => `hsl(${(i * 137.5) % 360}, 70%, 60%)`);
        dashboardChart1 = new Chart(ctx1, {
            type: 'bar',
            data: { labels: labels, datasets: [{ label: 'Revenue (USD)', data: revenueData, backgroundColor: colors, borderRadius: 8 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },
                    tooltip: { callbacks: { label: function(context) {
                        return ['Staff: ' + context.label, 'Branch: ' + staffData[context.label].branch, 'Revenue: $' + context.parsed.y.toFixed(2)];
                    }}}
                },
                scales: { y: { beginAtZero: true, ticks: { callback: v => '$' + v }}, x: { ticks: { maxRotation: 45, minRotation: 45 }}}
            }
        });
        const branchData = {};
        filteredData.forEach(d => {
            if (!branchData[d.branch]) branchData[d.branch] = 0;
            branchData[d.branch] += parseFloat(d.total_revenue || 0);
        });
        const branchLabels = Object.keys(branchData);
        const branchValues = branchLabels.map(l => branchData[l]);
        const branchColors = branchLabels.map((l, i) => `hsl(${(i * 137.5) % 360}, 70%, 60%)`);
        dashboardChart2 = new Chart(ctx2, {
            type: 'doughnut',
            data: { labels: branchLabels, datasets: [{ data: branchValues, backgroundColor: branchColors, borderWidth: 0 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: function(ctx) {
                        const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                        const pct = ((ctx.parsed / total) * 100).toFixed(1);
                        return ctx.label + ': $' + ctx.parsed.toFixed(2) + ' (' + pct + '%)';
                    }}}
                }
            }
        });
        document.getElementById('branchLegend').innerHTML = branchLabels.map((b, i) => `
            <div class="branch-legend-item">
                <div style="display: flex; align-items: center;">
                    <div class="branch-legend-color" style="background-color: ${branchColors[i]}"></div>
                    <span class="branch-legend-name">${b}</span>
                </div>
                <span class="branch-legend-value">$${branchValues[i].toFixed(2)}</span>
            </div>
        `).join('');
    } else {
        document.getElementById('chartTitle').textContent = 'Revenue by Staff (Your Branch)';
        const staffData = {};
        filteredData.forEach(d => {
            if (!staffData[d.staff_name]) staffData[d.staff_name] = { revenue: 0 };
            staffData[d.staff_name].revenue += parseFloat(d.total_revenue || 0);
        });
        const labels = Object.keys(staffData);
        const revenueData = labels.map(l => staffData[l].revenue);
        const colors = labels.map((l, i) => `hsl(${(i * 137.5) % 360}, 70%, 60%)`);
        dashboardChart1 = new Chart(ctx1, {
            type: 'bar',
            data: { labels: labels, datasets: [{ label: 'Revenue (USD)', data: revenueData, backgroundColor: colors, borderRadius: 8 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => 'Revenue: $' + ctx.parsed.y.toFixed(2) }}},
                scales: { y: { beginAtZero: true, ticks: { callback: v => '$' + v }}, x: { ticks: { maxRotation: 45, minRotation: 45 }}}
            }
        });
        const totals = ['recharge', 'sc_shop', 'sc_dealer'].map(k => filteredData.reduce((s, d) => s + parseFloat(d[k] || 0), 0));
        dashboardChart2 = new Chart(ctx2, {
            type: 'doughnut',
            data: { labels: ['Recharge', 'SC-Shop', 'SC-Dealer'], datasets: [{ data: totals, backgroundColor: ['#28a745', '#ffc107', '#007bff'], borderWidth: 0 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 20, font: { size: 12 }}},
                    tooltip: { callbacks: { label: function(ctx) {
                        const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                        const pct = ((ctx.parsed / total) * 100).toFixed(1);
                        return ctx.label + ': $' + ctx.parsed.toFixed(2) + ' (' + pct + '%)';
                    }}}
                }
            }
        });
        document.getElementById('branchLegend').innerHTML = '';
    }
}

function generateLeaderboard() {
    const tbody = document.getElementById('leaderboardBody');
    tbody.innerHTML = '';
    let filteredData = salesData;
    if (currentUser.role !== 'admin') filteredData = salesData.filter(d => d.branch === currentUser.branch);
    filteredData = getFilteredDataByPeriod(filteredData);
    let leaderboardData = [];
    if (currentUser.role === 'admin') {
        document.getElementById('leaderboardTitle').textContent = 'Top Branches';
        document.getElementById('leaderboardEntityHeader').textContent = 'Branch';
        const branchData = {};
        filteredData.forEach(d => {
            if (!branchData[d.branch]) branchData[d.branch] = { revenue: 0, recharge: 0, ads: 0, homeInternet: 0 };
            branchData[d.branch].revenue += parseFloat(d.total_revenue || 0);
            branchData[d.branch].recharge += parseFloat(d.recharge || 0);
            branchData[d.branch].ads += parseInt(d.gross_ads || 0);
            branchData[d.branch].homeInternet += parseInt(d.s_at_home || 0) + parseInt(d.fiber_plus || 0);
        });
        leaderboardData = Object.keys(branchData).map(b => ({ name: b, ...branchData[b] }));
    } else {
        document.getElementById('leaderboardTitle').textContent = 'Top Staff (Your Branch)';
        document.getElementById('leaderboardEntityHeader').textContent = 'Staff';
        const staffData = {};
        filteredData.forEach(d => {
            if (!staffData[d.staff_name]) staffData[d.staff_name] = { revenue: 0, recharge: 0, ads: 0, homeInternet: 0 };
            staffData[d.staff_name].revenue += parseFloat(d.total_revenue || 0);
            staffData[d.staff_name].recharge += parseFloat(d.recharge || 0);
            staffData[d.staff_name].ads += parseInt(d.gross_ads || 0);
            staffData[d.staff_name].homeInternet += parseInt(d.s_at_home || 0) + parseInt(d.fiber_plus || 0);
        });
        leaderboardData = Object.keys(staffData).map(s => ({ name: s, ...staffData[s] }));
    }
    leaderboardData.sort((a, b) => b.revenue - a.revenue);
    leaderboardData.slice(0, 10).forEach((item, i) => {
        const badges = ['<span class="rank-badge gold">🥇</span>', '<span class="rank-badge silver">🥈</span>', '<span class="rank-badge bronze">🥉</span>'];
        const rankBadge = i < 3 ? badges[i] : `<span style="font-weight: 700; font-size: 16px;">${i + 1}</span>`;
        const rankClass = i < 3 ? `rank-${i + 1}` : '';
        const row = tbody.insertRow();
        row.className = rankClass;
        row.innerHTML = `
            <td>${rankBadge}</td><td><strong>${item.name}</strong></td>
            <td class="total-amount">$${item.revenue.toFixed(2)}</td>
            <td class="amount">$${item.recharge.toFixed(2)}</td><td>${item.ads}</td>
            <td><strong style="font-size: 16px; color: #007bff;">${item.homeInternet} Units</strong></td>
        `;
    });
    if (!leaderboardData.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: #6c757d;"><i class="fas fa-chart-bar" style="font-size: 48px; display: block; margin-bottom: 10px; opacity: 0.3;"></i>គ្មានទិន្នន័យនៅឡើយទេ<br><small>សូមបញ្ចូលទិន្ន័យការលក់ជាមុនសិន</small></td></tr>';
    }
}

// ===================== SALES FORM =====================
document.getElementById('salesForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = {
        date: document.getElementById('date').value,
        staff_name: document.getElementById('staff_name').value.trim() || currentUser.fullname,
        branch: currentUser.branch,
        gross_ads: document.getElementById('gross_ads').value,
        change_sim: document.getElementById('change_sim').value,
        s_at_home: document.getElementById('s_at_home').value,
        fiber_plus: document.getElementById('fiber_plus').value,
        recharge: document.getElementById('recharge').value,
        sc_shop: document.getElementById('sc_shop').value,
        sc_dealer: document.getElementById('sc_dealer').value,
        total_revenue: document.getElementById('total_revenue').value
    };
    if (editingSalesIndex !== null) {
        salesData[editingSalesIndex] = formData;
        editingSalesIndex = null;
        showSuccessPopup('ទិន្នន័យការលក់ត្រូវបានកែប្រែដោយជោគជ័យ!');
    } else {
        salesData.push(formData);
        showSuccessPopup('ទិន្នន័យការលក់ត្រូវបានរក្សាទុកដោយជោគជ័យ!');
    }
    saveDataToStorage();
    refreshSalesTable();
    resetSalesForm();
});

function resetSalesForm() {
    document.getElementById('salesForm').reset();
    editingSalesIndex = null;
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    if (currentUser.username !== 'admin') document.getElementById('staff_name').value = currentUser.fullname;
    document.getElementById('branch_name').value = currentUser.branch;
    ['gross_ads', 'change_sim', 's_at_home', 'fiber_plus'].forEach(id => document.getElementById(id).value = '0');
    ['recharge', 'sc_shop', 'sc_dealer', 'total_revenue'].forEach(id => document.getElementById(id).value = '0.00');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function refreshSalesTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    let filteredData = salesData;
    if (currentUser.role !== 'admin') filteredData = salesData.filter(d => d.branch === currentUser.branch);
    if (!filteredData.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px; color: #6c757d;"><i class="fas fa-inbox" style="font-size: 48px; display: block; margin-bottom: 10px; opacity: 0.3;"></i>មិនទាន់មានទិន្នន័យនៅឡើយទេ</td></tr>';
        return;
    }
    filteredData.forEach(data => {
        const idx = salesData.indexOf(data);
        const canEdit = canEditData(data);
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${data.date}</td><td>${data.staff_name}</td><td>${data.branch}</td>
            <td>${data.gross_ads}/${data.change_sim}/${data.s_at_home}/${data.fiber_plus}</td>
            <td class="amount">$${parseFloat(data.recharge).toFixed(2)}/$${parseFloat(data.sc_shop).toFixed(2)}/$${parseFloat(data.sc_dealer).toFixed(2)}</td>
            <td class="total-amount">$${parseFloat(data.total_revenue).toFixed(2)}</td>
            <td class="actions">
                <button class="edit-btn" onclick="editSalesRow(${idx})" ${!canEdit ? 'disabled' : ''} title="${canEdit ? 'Edit' : 'អ្នកមិនអាចកែប្រែទិន្នន័យនេះបានទេ'}"><i class="fas fa-edit"></i></button>
                <button class="delete-btn" onclick="deleteSalesRow(${idx})" ${!canEdit ? 'disabled' : ''} title="${canEdit ? 'Delete' : 'អ្នកមិនអាចលុបទិន្នន័យនេះបានទេ'}"><i class="fas fa-trash"></i></button>
            </td>
        `;
    });
}

function editSalesRow(index) {
    const data = salesData[index];
    if (!canEditData(data)) { showSuccessPopup('អ្នកមិនអាចកែប្រែទិន្នន័យនេះបានទេ!'); return; }
    editingSalesIndex = index;
    document.getElementById('date').value = data.date;
    document.getElementById('staff_name').value = data.staff_name;
    document.getElementById('branch_name').value = data.branch;
    ['gross_ads', 'change_sim', 's_at_home', 'fiber_plus'].forEach(k => document.getElementById(k).value = data[k]);
    ['recharge', 'sc_shop', 'sc_dealer', 'total_revenue'].forEach(k => document.getElementById(k).value = parseFloat(data[k]).toFixed(2));
    showPage('daily-sales');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const fc = document.querySelector('#daily-sales-page .form-card');
    fc.style.borderLeft = '4px solid #ffc107';
    setTimeout(() => fc.style.borderLeft = '4px solid #28a745', 2000);
}

function deleteSalesRow(index) {
    if (!canEditData(salesData[index])) { showSuccessPopup('អ្នកមិនអាចលុបទិន្នន័យនេះបានទេ!'); return; }
    if (confirm('តើអ្នកប្រាកដថាចង់លុបទិន្នន័យនេះមែនទេ?')) {
        salesData.splice(index, 1);
        saveDataToStorage();
        refreshSalesTable();
        showSuccessPopup('បានលុបទិន្នន័យដោយជោគជ័យ!');
    }
}

// ===================== DEPOSIT FORM =====================
document.getElementById('depositForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = {
        date: document.getElementById('deposit_date').value,
        staff: document.getElementById('deposit_staff').value.trim() || currentUser.fullname,
        branch: currentUser.branch,
        cash: document.getElementById('cash').value,
        credit: document.getElementById('credit').value,
        note: document.getElementById('note').value || '-'
    };
    if (editingDepositIndex !== null) {
        depositData[editingDepositIndex] = formData;
        editingDepositIndex = null;
        showSuccessPopup('ទិន្នន័យការដាក់ប្រាក់ត្រូវបានកែប្រែដោយជោគជ័យ!');
    } else {
        depositData.push(formData);
        showSuccessPopup('ទិន្នន័យការដាក់ប្រាក់ត្រូវបានរក្សាទុកដោយជោគជ័យ!');
    }
    saveDataToStorage();
    refreshDepositTable();
    resetDepositForm();
});

function resetDepositForm() {
    document.getElementById('depositForm').reset();
    editingDepositIndex = null;
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('deposit_date').value = today;
    if (currentUser.username !== 'admin') document.getElementById('deposit_staff').value = currentUser.fullname;
    document.getElementById('cash').value = '0.00';
    document.getElementById('credit').value = '0.00';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function refreshDepositTable() {
    const tbody = document.getElementById('depositTableBody');
    tbody.innerHTML = '';
    let filteredData = depositData;
    if (currentUser.role !== 'admin') filteredData = depositData.filter(d => d.branch === currentUser.branch);
    if (!filteredData.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px; color: #6c757d;"><i class="fas fa-inbox" style="font-size: 48px; display: block; margin-bottom: 10px; opacity: 0.3;"></i>មិនទាន់មានទិន្នន័យនៅឡើយទេ</td></tr>';
        return;
    }
    filteredData.forEach(data => {
        const idx = depositData.indexOf(data);
        const canEdit = canEditData(data);
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${data.date}</td><td>${data.staff}</td><td>${data.branch}</td>
            <td class="cash-amount">$${parseFloat(data.cash).toFixed(2)}</td>
            <td class="credit-amount">$${parseFloat(data.credit).toFixed(2)}</td><td>${data.note}</td>
            <td class="actions">
                <button class="edit-btn" onclick="editDepositRow(${idx})" ${!canEdit ? 'disabled' : ''} title="${canEdit ? 'Edit' : 'អ្នកមិនអាចកែប្រែទិន្នន័យនេះបានទេ'}"><i class="fas fa-edit"></i></button>
                <button class="delete-btn" onclick="deleteDepositRow(${idx})" ${!canEdit ? 'disabled' : ''} title="${canEdit ? 'Delete' : 'អ្នកមិនអាចលុបទិន្នន័យនេះបានទេ'}"><i class="fas fa-trash"></i></button>
            </td>
        `;
    });
}

function editDepositRow(index) {
    const data = depositData[index];
    if (!canEditData(data)) { showSuccessPopup('អ្នកមិនអាចកែប្រែទិន្នន័យនេះបានទេ!'); return; }
    editingDepositIndex = index;
    document.getElementById('deposit_date').value = data.date;
    document.getElementById('deposit_staff').value = data.staff;
    document.getElementById('cash').value = parseFloat(data.cash).toFixed(2);
    document.getElementById('credit').value = parseFloat(data.credit).toFixed(2);
    document.getElementById('note').value = data.note === '-' ? '' : data.note;
    showPage('deposit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const fc = document.querySelector('#deposit-page .form-card');
    fc.style.borderLeft = '4px solid #ffc107';
    setTimeout(() => fc.style.borderLeft = '4px solid #28a745', 2000);
}

function deleteDepositRow(index) {
    if (!canEditData(depositData[index])) { showSuccessPopup('អ្នកមិនអាចលុបទិន្នន័យនេះបានទេ!'); return; }
    if (confirm('តើអ្នកប្រាកដថាចង់លុបទិន្នន័យនេះមែនទេ?')) {
        depositData.splice(index, 1);
        saveDataToStorage();
        refreshDepositTable();
        showSuccessPopup('បានលុបទិន្នន័យដោយជោគជ័យ!');
    }
}

// ===================== REPORTS PAGE =====================
function initReportsPage() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    document.getElementById('reportStartDate').value = firstDay.toISOString().split('T')[0];
    document.getElementById('reportEndDate').value = lastDay.toISOString().split('T')[0];
    document.getElementById('reportStaffFilter').value = '';
    
    populateBranchFilter();
    applyReportFilters();
}

function populateBranchFilter() {
    const branchFilterContainer = document.getElementById('reportBranchFilterContainer');
    const branchFilterSelect = document.getElementById('reportBranchFilter');
    
    if (currentUser.role === 'admin') {
        branchFilterContainer.style.display = 'flex';
        const branches = [...new Set(usersData.map(u => u.branch))].sort();
        branchFilterSelect.innerHTML = '<option value="">ទាំងអស់</option>';
        branches.forEach(branch => {
            const option = document.createElement('option');
            option.value = branch;
            option.textContent = branch;
            branchFilterSelect.appendChild(option);
        });
    } else {
        branchFilterContainer.style.display = 'none';
    }
}

function setReportPeriod(period) {
    currentReportPeriod = period;
    document.querySelectorAll('[id^="report-filter-"]').forEach(btn => btn.classList.remove('active'));
    document.getElementById('report-filter-' + period).classList.add('active');
    document.getElementById('reportPeriodTitle').textContent = 'Items Growth - ' + (period === 'weekly' ? 'Weekly' : 'Monthly');
    renderReportsGrowthChart();
}

function applyReportFilters() {
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    const branchFilter = document.getElementById('reportBranchFilter') ? document.getElementById('reportBranchFilter').value : '';
    const staffFilter = document.getElementById('reportStaffFilter').value.toLowerCase().trim();
    
    let filteredData = salesData;
    
    if (currentUser.role !== 'admin') {
        filteredData = filteredData.filter(d => d.branch === currentUser.branch);
    }
    
    if (startDate) filteredData = filteredData.filter(d => d.date >= startDate);
    if (endDate) filteredData = filteredData.filter(d => d.date <= endDate);
    if (currentUser.role === 'admin' && branchFilter) {
        filteredData = filteredData.filter(d => d.branch === branchFilter);
    }
    if (staffFilter) filteredData = filteredData.filter(d => d.staff_name.toLowerCase().includes(staffFilter));
    
    reportFilteredData = filteredData;
    
    renderReportsGrowthChart();
    renderReportTable();
    updateReportStats();
}

function resetReportFilters() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    document.getElementById('reportStartDate').value = firstDay.toISOString().split('T')[0];
    document.getElementById('reportEndDate').value = lastDay.toISOString().split('T')[0];
    document.getElementById('reportStaffFilter').value = '';
    
    if (document.getElementById('reportBranchFilter')) {
        document.getElementById('reportBranchFilter').value = '';
    }
    
    applyReportFilters();
}

function renderReportsGrowthChart() {
    if (reportsGrowthChart) reportsGrowthChart.destroy();
    
    const ctx = document.getElementById('reportsGrowthChart');
    if (!ctx) return;
    
    if (reportFilteredData.length === 0) {
        ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
        return;
    }
    
    const groupedData = {};
    
    reportFilteredData.forEach(d => {
        const date = new Date(d.date);
        let periodKey;
        
        if (currentReportPeriod === 'weekly') {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            periodKey = weekStart.toISOString().split('T')[0];
        } else {
            periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        
        if (!groupedData[periodKey]) {
            groupedData[periodKey] = {
                gross_ads: 0, change_sim: 0, s_at_home: 0, fiber_plus: 0,
                recharge: 0, sc_shop: 0, sc_dealer: 0
            };
        }
        
        groupedData[periodKey].gross_ads += parseInt(d.gross_ads || 0);
        groupedData[periodKey].change_sim += parseInt(d.change_sim || 0);
        groupedData[periodKey].s_at_home += parseInt(d.s_at_home || 0);
        groupedData[periodKey].fiber_plus += parseInt(d.fiber_plus || 0);
        groupedData[periodKey].recharge += parseFloat(d.recharge || 0);
        groupedData[periodKey].sc_shop += parseFloat(d.sc_shop || 0);
        groupedData[periodKey].sc_dealer += parseFloat(d.sc_dealer || 0);
    });
    
    const sortedPeriods = Object.keys(groupedData).sort();
    const labels = sortedPeriods.map(p => {
        if (currentReportPeriod === 'weekly') {
            const d = new Date(p);
            return `Week ${Math.ceil(d.getDate() / 7)} (${d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})})`;
        } else {
            const [year, month] = p.split('-');
            return new Date(year, month - 1).toLocaleDateString('en-US', {year: 'numeric', month: 'short'});
        }
    });
    
    const datasets = [
        {
            label: 'Gross Ads',
            data: sortedPeriods.map(p => groupedData[p].gross_ads),
            borderColor: '#28a745',
            backgroundColor: 'rgba(40, 167, 69, 0.1)',
            tension: 0.4
        },
        {
            label: 'Change SIM',
            data: sortedPeriods.map(p => groupedData[p].change_sim),
            borderColor: '#007bff',
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            tension: 0.4
        },
        {
            label: 'S@Home',
            data: sortedPeriods.map(p => groupedData[p].s_at_home),
            borderColor: '#ffc107',
            backgroundColor: 'rgba(255, 193, 7, 0.1)',
            tension: 0.4
        },
        {
            label: 'Fiber+',
            data: sortedPeriods.map(p => groupedData[p].fiber_plus),
            borderColor: '#17a2b8',
            backgroundColor: 'rgba(23, 162, 184, 0.1)',
            tension: 0.4
        }
    ];
    
    reportsGrowthChart = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    display: true, 
                    position: 'bottom',
                    labels: { padding: 15, font: { size: 12 }}
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    title: { display: true, text: 'Quantity' }
                },
                x: {
                    title: { display: true, text: currentReportPeriod === 'weekly' ? 'Week' : 'Month' }
                }
            }
        }
    });
}

function renderReportTable() {
    const tbody = document.getElementById('reportTableBody');
    tbody.innerHTML = '';
    
    if (reportFilteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; padding: 30px; color: #6c757d;"><i class="fas fa-chart-bar" style="font-size: 48px; display: block; margin-bottom: 10px; opacity: 0.3;"></i>គ្មានទិន្នន័យនៅឡើយទេ</td></tr>';
        document.getElementById('reportTableFooter').style.display = 'none';
        return;
    }
    
    document.getElementById('reportTableFooter').style.display = '';
    
    let totals = {
        gross_ads: 0, change_sim: 0, s_at_home: 0, fiber_plus: 0,
        recharge: 0, sc_shop: 0, sc_dealer: 0, total_revenue: 0
    };
    
    reportFilteredData.forEach(d => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${d.date}</td>
            <td>${d.staff_name}</td>
            <td>${d.branch}</td>
            <td>${d.gross_ads}</td>
            <td>${d.change_sim}</td>
            <td>${d.s_at_home}</td>
            <td>${d.fiber_plus}</td>
            <td class="amount">$${parseFloat(d.recharge).toFixed(2)}</td>
            <td class="amount">$${parseFloat(d.sc_shop).toFixed(2)}</td>
            <td class="amount">$${parseFloat(d.sc_dealer).toFixed(2)}</td>
            <td class="total-amount">$${parseFloat(d.total_revenue).toFixed(2)}</td>
        `;
        
        totals.gross_ads += parseInt(d.gross_ads || 0);
        totals.change_sim += parseInt(d.change_sim || 0);
        totals.s_at_home += parseInt(d.s_at_home || 0);
        totals.fiber_plus += parseInt(d.fiber_plus || 0);
        totals.recharge += parseFloat(d.recharge || 0);
        totals.sc_shop += parseFloat(d.sc_shop || 0);
        totals.sc_dealer += parseFloat(d.sc_dealer || 0);
        totals.total_revenue += parseFloat(d.total_revenue || 0);
    });
    
    document.getElementById('footerGrossAds').textContent = totals.gross_ads;
    document.getElementById('footerChangeSim').textContent = totals.change_sim;
    document.getElementById('footerSHome').textContent = totals.s_at_home;
    document.getElementById('footerFiber').textContent = totals.fiber_plus;
    document.getElementById('footerRecharge').textContent = '$' + totals.recharge.toFixed(2);
    document.getElementById('footerShop').textContent = '$' + totals.sc_shop.toFixed(2);
    document.getElementById('footerDealer').textContent = '$' + totals.sc_dealer.toFixed(2);
    document.getElementById('footerTotal').textContent = '$' + totals.total_revenue.toFixed(2);
}

function updateReportStats() {
    const totalItems = reportFilteredData.reduce((sum, d) => {
        return sum + parseInt(d.gross_ads || 0) + parseInt(d.change_sim || 0) + 
               parseInt(d.s_at_home || 0) + parseInt(d.fiber_plus || 0);
    }, 0);
    
    const totalRevenue = reportFilteredData.reduce((sum, d) => sum + parseFloat(d.total_revenue || 0), 0);
    const totalRecords = reportFilteredData.length;
    
    const uniqueDates = [...new Set(reportFilteredData.map(d => d.date))];
    const avgRevenue = uniqueDates.length > 0 ? totalRevenue / uniqueDates.length : 0;
    
    document.getElementById('reportTotalItems').textContent = totalItems;
    document.getElementById('reportTotalRevenue').textContent = '$' + totalRevenue.toFixed(2);
    document.getElementById('reportTotalRecords').textContent = totalRecords;
    document.getElementById('reportAvgRevenue').textContent = '$' + avgRevenue.toFixed(2);
    
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    const branchFilter = document.getElementById('reportBranchFilter') ? document.getElementById('reportBranchFilter').value : '';
    const staffFilter = document.getElementById('reportStaffFilter').value;
    
    let infoText = 'បង្ហាញ ' + totalRecords + ' ប្រតិបត្តិការ';
    if (startDate || endDate) {
        infoText += ' (';
        if (startDate) infoText += 'ចាប់ពី ' + startDate;
        if (startDate && endDate) infoText += ' - ';
        if (endDate) infoText += 'ដល់ ' + endDate;
        infoText += ')';
    }
    if (branchFilter) infoText += ' - សាខា: ' + branchFilter;
    if (staffFilter) infoText += ' - បុគ្គលិក: ' + staffFilter;
    
    document.getElementById('reportTableInfo').textContent = infoText;
}

function exportToExcel() {
    if (reportFilteredData.length === 0) {
        showSuccessPopup('មិនមានទិន្នន័យដើម្បី Export!');
        return;
    }
    
    const wb = XLSX.utils.book_new();
    
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    const branchFilter = document.getElementById('reportBranchFilter') ? document.getElementById('reportBranchFilter').value : '';
    const staffFilter = document.getElementById('reportStaffFilter').value;
    
    const wsData = [
        ['របាយការណ៍ការលក់ - Smart Axiata'],
        ['កាលបរិច្ឆេទ: ' + (startDate ? startDate : 'N/A') + ' - ' + (endDate ? endDate : 'N/A')],
    ];
    
    if (branchFilter) wsData.push(['សាខា: ' + branchFilter]);
    if (staffFilter) wsData.push(['បុគ្គលិក: ' + staffFilter]);
    
    wsData.push([]);
    wsData.push(['ថ្ងៃខែ', 'បុគ្គលិក', 'សាខា', 'Gross Ads', 'Change SIM', 'S@Home', 'Fiber+', 'Recharge ($)', 'SC-Shop ($)', 'SC-Dealer ($)', 'Total Revenue ($)']);
    
    reportFilteredData.forEach(d => {
        wsData.push([
            d.date, d.staff_name, d.branch,
            parseInt(d.gross_ads || 0), parseInt(d.change_sim || 0),
            parseInt(d.s_at_home || 0), parseInt(d.fiber_plus || 0),
            parseFloat(d.recharge || 0).toFixed(2),
            parseFloat(d.sc_shop || 0).toFixed(2),
            parseFloat(d.sc_dealer || 0).toFixed(2),
            parseFloat(d.total_revenue || 0).toFixed(2)
        ]);
    });
    
    const totals = reportFilteredData.reduce((acc, d) => ({
        gross_ads: acc.gross_ads + parseInt(d.gross_ads || 0),
        change_sim: acc.change_sim + parseInt(d.change_sim || 0),
        s_at_home: acc.s_at_home + parseInt(d.s_at_home || 0),
        fiber_plus: acc.fiber_plus + parseInt(d.fiber_plus || 0),
        recharge: acc.recharge + parseFloat(d.recharge || 0),
        sc_shop: acc.sc_shop + parseFloat(d.sc_shop || 0),
        sc_dealer: acc.sc_dealer + parseFloat(d.sc_dealer || 0),
        total_revenue: acc.total_revenue + parseFloat(d.total_revenue || 0)
    }), { gross_ads: 0, change_sim: 0, s_at_home: 0, fiber_plus: 0, recharge: 0, sc_shop: 0, sc_dealer: 0, total_revenue: 0 });
    
    wsData.push([]);
    wsData.push([
        'សរុប', '', '',
        totals.gross_ads, totals.change_sim, totals.s_at_home, totals.fiber_plus,
        totals.recharge.toFixed(2), totals.sc_shop.toFixed(2),
        totals.sc_dealer.toFixed(2), totals.total_revenue.toFixed(2)
    ]);
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const colWidths = [
        { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 12 },
        { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }
    ];
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');
    
    const filename = `Sales_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
    
    showSuccessPopup('បាន Export ទិន្នន័យជាឯកសារ Excel ដោយជោគជ័យ!');
}

// ===================== CUSTOMERS =====================
function openCustomerModal() {
    document.getElementById('customerModal').style.display = 'block';
    document.getElementById('edit_customer_index').value = '';
    document.getElementById('customerModalTitle').textContent = 'បន្ថែមអតិថិជនថ្មី';
    document.getElementById('cust_date').value = new Date().toISOString().split('T')[0];
    document.getElementById('cust_staff').value = currentUser.username !== 'admin' ? currentUser.fullname : '';
}

function closeCustomerModal() {
    document.getElementById('customerModal').style.display = 'none';
    document.getElementById('customerForm').reset();
}

document.getElementById('customerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const ei = document.getElementById('edit_customer_index').value;
    const fd = {
        date: document.getElementById('cust_date').value,
        staff: document.getElementById('cust_staff').value.trim() || currentUser.fullname,
        branch: currentUser.branch,
        name: document.getElementById('cust_name').value,
        phone: document.getElementById('cust_phone').value,
        product: document.getElementById('cust_product').value,
        status: document.getElementById('cust_status').value,
        remark: document.getElementById('cust_remark').value || '-'
    };
    if (ei !== '') {
        customersData[ei] = fd;
        showSuccessPopup('បានកែប្រែអតិថិជនដោយជោគជ័យ!');
    } else {
        customersData.push(fd);
        showSuccessPopup('អតិថិជនត្រូវបានបន្ថែមដោយជោគជ័យ!');
    }
    saveDataToStorage();
    refreshCustomersTable();
    closeCustomerModal();
});

function refreshCustomersTable() {
    const tbody = document.getElementById('customersTableBody');
    tbody.innerHTML = '';
    let fd = customersData;
    if (currentUser.role !== 'admin') fd = customersData.filter(d => d.branch === currentUser.branch);
    if (!fd.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 30px; color: #6c757d;"><i class="fas fa-users" style="font-size: 48px; display: block; margin-bottom: 10px; opacity: 0.3;"></i>មិនទាន់មានអតិថិជននៅឡើយទេ</td></tr>';
        return;
    }
    const sc = {'New Lead': 'status-new-lead', 'Prospect': 'status-prospect', 'Hot Prospect': 'status-hot-prospect', 'Closed': 'status-closed'};
    fd.forEach(d => {
        const idx = customersData.indexOf(d);
        const ce = canEditData(d);
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${d.date}</td><td>${d.staff}</td><td>${d.branch}</td><td>${d.name}</td><td>${d.phone}</td><td>${d.product}</td>
            <td><span class="status-badge ${sc[d.status]}">${d.status}</span></td><td>${d.remark}</td>
            <td class="actions">
                <button class="edit-btn" onclick="editCustomerRow(${idx})" ${!ce ? 'disabled' : ''} title="${ce ? 'Edit' : 'អ្នកមិនអាចកែប្រែទិន្នន័យនេះបានទេ'}"><i class="fas fa-edit"></i></button>
                <button class="delete-btn" onclick="deleteCustomerRow(${idx})" ${!ce ? 'disabled' : ''} title="${ce ? 'Delete' : 'អ្នកមិនអាចលុបទិន្នន័យនេះបានទេ'}"><i class="fas fa-trash"></i></button>
            </td>
        `;
    });
}

function editCustomerRow(i) {
    const d = customersData[i];
    if (!canEditData(d)) { showSuccessPopup('អ្នកមិនអាចកែប្រែទិន្នន័យនេះបានទេ!'); return; }
    ['cust_date', 'cust_staff', 'cust_name', 'cust_phone', 'cust_product', 'cust_status'].forEach(k => {
        const v = k.replace('cust_', '');
        document.getElementById(k).value = d[v];
    });
    document.getElementById('cust_remark').value = d.remark === '-' ? '' : d.remark;
    document.getElementById('edit_customer_index').value = i;
    document.getElementById('customerModalTitle').textContent = 'កែប្រែអតិថិជន';
    document.getElementById('customerModal').style.display = 'block';
}

function deleteCustomerRow(i) {
    if (!canEditData(customersData[i])) { showSuccessPopup('អ្នកមិនអាចលុបទិន្នន័យនេះបានទេ!'); return; }
    if (confirm('តើអ្នកប្រាកដថាចង់លុបអតិថិជននេះមែនទេ?')) {
        customersData.splice(i, 1);
        saveDataToStorage();
        refreshCustomersTable();
        showSuccessPopup('បានលុបអតិថិជនដោយជោគជ័យ!');
    }
}

// ===================== TOP UP =====================
function openTopUpModal() {
    document.getElementById('topupModal').style.display = 'block';
    document.getElementById('edit_topup_index').value = '';
    document.getElementById('topupModalTitle').textContent = 'បន្ថែម Top Up';
    document.getElementById('topup_date').value = new Date().toISOString().split('T')[0];
    document.getElementById('topup_staff').value = currentUser.username !== 'admin' ? currentUser.fullname : '';
}

function closeTopUpModal() {
    document.getElementById('topupModal').style.display = 'none';
    document.getElementById('topupForm').reset();
}

document.getElementById('topupForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const ei = document.getElementById('edit_topup_index').value;
    const fd = {
        date: document.getElementById('topup_date').value,
        staff: document.getElementById('topup_staff').value.trim() || currentUser.fullname,
        branch: currentUser.branch,
        customer: document.getElementById('topup_customer').value,
        phone: document.getElementById('topup_phone').value,
        contact: document.getElementById('topup_contact').value || '-',
        product: document.getElementById('topup_product').value,
        expiry: document.getElementById('topup_expiry').value,
        remark: document.getElementById('topup_remark').value || '-'
    };
    if (ei !== '') {
        topupData[ei] = fd;
        showSuccessPopup('បានកែប្រែ Top Up ដោយជោគជ័យ!');
    } else {
        topupData.push(fd);
        showSuccessPopup('Top Up ត្រូវបានបន្ថែមដោយជោគជ័យ!');
    }
    saveDataToStorage();
    refreshTopUpTable();
    checkExpiringCustomers();
    closeTopUpModal();
});

function refreshTopUpTable() {
    const tbody = document.getElementById('topupTableBody');
    tbody.innerHTML = '';
    let fd = topupData;
    if (currentUser.role !== 'admin') fd = topupData.filter(d => d.branch === currentUser.branch);
    if (!fd.length) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 30px; color: #6c757d;"><i class="fas fa-mobile-alt" style="font-size: 48px; display: block; margin-bottom: 10px; opacity: 0.3;"></i>មិនទាន់មាន Top Up នៅឡើយទេ</td></tr>';
        return;
    }
    fd.forEach(d => {
        const idx = topupData.indexOf(d);
        const ce = canEditData(d);
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${d.date}</td><td>${d.staff}</td><td>${d.branch}</td><td>${d.customer}</td><td>${d.phone}</td><td>${d.contact}</td>
            <td>${d.product}</td><td>${d.expiry}</td><td>${d.remark}</td>
            <td class="actions">
                <button class="edit-btn" onclick="editTopUpRow(${idx})" ${!ce ? 'disabled' : ''} title="${ce ? 'Edit' : 'អ្នកមិនអាចកែប្រែទិន្នន័យនេះបានទេ'}"><i class="fas fa-edit"></i></button>
                <button class="delete-btn" onclick="deleteTopUpRow(${idx})" ${!ce ? 'disabled' : ''} title="${ce ? 'Delete' : 'អ្នកមិនអាចលុបទិន្នន័យនេះបានទេ'}"><i class="fas fa-trash"></i></button>
            </td>
        `;
    });
}

function editTopUpRow(i) {
    const d = topupData[i];
    if (!canEditData(d)) { showSuccessPopup('អ្នកមិនអាចកែប្រែទិន្នន័យនេះបានទេ!'); return; }
    ['topup_date', 'topup_staff', 'topup_customer', 'topup_phone', 'topup_product', 'topup_expiry'].forEach(k => {
        const v = k.replace('topup_', '');
        document.getElementById(k).value = d[v];
    });
    document.getElementById('topup_contact').value = d.contact === '-' ? '' : d.contact;
    document.getElementById('topup_remark').value = d.remark === '-' ? '' : d.remark;
    document.getElementById('edit_topup_index').value = i;
    document.getElementById('topupModalTitle').textContent = 'កែប្រែ Top Up';
    document.getElementById('topupModal').style.display = 'block';
}

function deleteTopUpRow(i) {
    if (!canEditData(topupData[i])) { showSuccessPopup('អ្នកមិនអាចលុបទិន្នន័យនេះបានទេ!'); return; }
    if (confirm('តើអ្នកប្រាកដថាចង់លុប Top Up នេះមែនទេ?')) {
        topupData.splice(i, 1);
        saveDataToStorage();
        refreshTopUpTable();
        checkExpiringCustomers();
        showSuccessPopup('បានលុប Top Up ដោយជោគជ័យ!');
    }
}

function checkExpiringCustomers() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDays = new Date(today);
    sevenDays.setDate(today.getDate() + 7);
    let ec = 0, esc = 0, rows = [];
    let fd = topupData;
    if (currentUser.role !== 'admin') fd = topupData.filter(d => d.branch === currentUser.branch);
    fd.forEach(d => {
        const ed = new Date(d.expiry);
        ed.setHours(0, 0, 0, 0);
        let st = '', rc = '';
        if (ed < today) {
            ec++;
            st = '<span class="expiry-status expiry-expired"><i class="fas fa-times-circle"></i> ផុតកំណត់</span>';
            rc = 'expiry-row-danger';
        } else if (ed <= sevenDays) {
            esc++;
            const dl = Math.ceil((ed - today) / 86400000);
            st = `<span class="expiry-status expiry-soon"><i class="fas fa-exclamation-triangle"></i> ជិតផុត (${dl} ថ្ងៃ)</span>`;
            rc = 'expiry-row-warning';
        }
        if (st) rows.push({...d, status: st, rowClass: rc, originalIndex: topupData.indexOf(d)});
    });
    const tbody = document.getElementById('expiryTableBody');
    tbody.innerHTML = '';
    if (rows.length) {
        rows.forEach(d => {
            const ce = canEditData(d);
            const row = tbody.insertRow();
            row.className = d.rowClass;
            row.innerHTML = `
                <td>${d.date}</td><td>${d.staff}</td><td>${d.branch}</td><td>${d.customer}</td><td>${d.phone}</td><td>${d.contact}</td>
                <td>${d.product}</td><td>${d.expiry}</td><td>${d.status}</td><td>${d.remark}</td>
                <td class="actions">
                    <button class="edit-btn" onclick="editTopUpRow(${d.originalIndex})" ${!ce ? 'disabled' : ''} title="${ce ? 'Edit' : 'អ្នកមិនអាចកែប្រែទិន្នន័យនេះបានទេ'}"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" onclick="deleteTopUpRow(${d.originalIndex})" ${!ce ? 'disabled' : ''} title="${ce ? 'Delete' : 'អ្នកមិនអាចលុបទិន្នន័យនេះបានទេ'}"><i class="fas fa-trash"></i></button>
                </td>
            `;
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; padding: 30px; color: #6c757d;"><i class="fas fa-check-circle" style="font-size: 48px; margin-bottom: 10px; display: block;"></i>គ្មានអតិថិជនជិតផុតកំណត់ ឬ ផុតកំណត់ទេ</td></tr>';
    }
    document.getElementById('expiredCount').textContent = ec;
    document.getElementById('expiryDangerWarning').classList.toggle('hidden', !ec);
    document.getElementById('expirySoonCount').textContent = esc;
    document.getElementById('expiryWarning').classList.toggle('hidden', !esc);
}

// ===================== USERS MANAGEMENT - ADMIN ONLY =====================
function openUserModal() {
    if (currentUser.role !== 'admin') {
        showSuccessPopup('អ្នកមិនមានសិទ្ធិបន្ថែមអ្នកប្រើប្រាស់ទេ!');
        return;
    }
    
    document.getElementById('userModal').style.display = 'block';
    document.getElementById('edit_user_index').value = '';
    document.getElementById('user_password').required = true;
    document.getElementById('user_password').placeholder = '';
    document.getElementById('userModalTitle').textContent = 'បន្ថែមអ្នកប្រើប្រាស់ថ្មី';
    
    document.getElementById('user_username').disabled = false;
    document.getElementById('user_role').disabled = false;
    document.getElementById('user_branch').disabled = false;
    document.getElementById('user_status').disabled = false;
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
    document.getElementById('userForm').reset();
}

document.getElementById('userForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (currentUser.role !== 'admin') {
        showSuccessPopup('អ្នកមិនមានសិទ្ធិធ្វើប្រតិបត្តិការនេះទេ!');
        return;
    }
    
    const ei = document.getElementById('edit_user_index').value;
    const fd = {
        username: document.getElementById('user_username').value,
        password: document.getElementById('user_password').value,
        fullname: document.getElementById('user_fullname').value,
        role: document.getElementById('user_role').value,
        branch: document.getElementById('user_branch').value,
        status: document.getElementById('user_status').value,
        createdDate: ei !== '' ? usersData[ei].createdDate : new Date().toISOString().split('T')[0]
    };
    
    if (ei !== '') {
        if (!fd.password) fd.password = usersData[ei].password;
        usersData[ei] = fd;
        showSuccessPopup('បានកែប្រែអ្នកប្រើប្រាស់ដោយជោគជ័យ!');
    } else {
        if (usersData.some(u => u.username === fd.username)) {
            showSuccessPopup('Username នេះមានរួចហើយ! សូមប្រើ Username ផ្សេង។');
            return;
        }
        usersData.push(fd);
        showSuccessPopup('អ្នកប្រើប្រាស់ត្រូវបានបន្ថែមដោយជោគជ័យ!');
    }
    
    saveDataToStorage();
    refreshUsersTable();
    populateBranchFilter();
    closeUserModal();
});

function refreshUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';
    
    if (!usersData.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px; color: #6c757d;"><i class="fas fa-users" style="font-size: 48px; display: block; margin-bottom: 10px; opacity: 0.3;"></i>មិនទាន់មានអ្នកប្រើប្រាស់នៅឡើយទេ</td></tr>';
        return;
    }
    
    usersData.forEach((d, i) => {
        const row = tbody.insertRow();
        const isMainAdmin = (d.username === 'admin' && d.role === 'admin');
        const canEdit = !isMainAdmin;
        
        row.innerHTML = `
            <td>${d.username}</td>
            <td>${d.fullname}</td>
            <td><span class="status-badge status-${d.role}">${d.role.toUpperCase()}</span></td>
            <td>${d.branch}</td>
            <td><span class="status-badge status-${d.status}">${d.status.toUpperCase()}</span></td>
            <td>${d.createdDate}</td>
            <td class="actions">
                <button class="edit-btn" onclick="editUserRow(${i})" ${!canEdit ? 'disabled' : ''} title="${canEdit ? 'កែប្រែ' : 'មិនអាចកែប្រែ Admin មេបានទេ'}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-btn" onclick="deleteUserRow(${i})" ${!canEdit ? 'disabled' : ''} title="${canEdit ? 'លុប' : 'មិនអាចលុប Admin មេបានទេ'}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
    });
}

function editUserRow(i) {
    if (currentUser.role !== 'admin') {
        showSuccessPopup('អ្នកមិនមានសិទ្ធិកែប្រែអ្នកប្រើប្រាស់ទេ!');
        return;
    }
    
    const d = usersData[i];
    
    if (d.username === 'admin' && d.role === 'admin') {
        showSuccessPopup('មិនអាចកែប្រែ Admin account មេបានទេ!');
        return;
    }
    
    document.getElementById('user_username').value = d.username;
    document.getElementById('user_fullname').value = d.fullname;
    document.getElementById('user_role').value = d.role;
    document.getElementById('user_branch').value = d.branch;
    document.getElementById('user_status').value = d.status;
    document.getElementById('user_password').value = '';
    document.getElementById('user_password').required = false;
    document.getElementById('user_password').placeholder = 'ទុកទទេដើម្បីរក្សាពាក្យសម្ងាត់ចាស់';
    document.getElementById('edit_user_index').value = i;
    document.getElementById('userModalTitle').textContent = 'កែប្រែអ្នកប្រើប្រាស់';
    
    document.getElementById('user_username').disabled = true;
    document.getElementById('user_role').disabled = false;
    document.getElementById('user_branch').disabled = false;
    document.getElementById('user_status').disabled = false;
    
    document.getElementById('userModal').style.display = 'block';
}

function deleteUserRow(i) {
    if (currentUser.role !== 'admin') {
        showSuccessPopup('អ្នកមិនមានសិទ្ធិលុបអ្នកប្រើប្រាស់ទេ!');
        return;
    }
    
    const u = usersData[i];
    
    if (u.username === 'admin' && u.role === 'admin') {
        showSuccessPopup('មិនអាចលុប Admin account មេបានទេ!');
        return;
    }
    
    if (confirm(`តើអ្នកប្រាកដថាចង់លុបអ្នកប្រើប្រាស់ "${u.fullname}" មែនទេ?`)) {
        usersData.splice(i, 1);
        saveDataToStorage();
        refreshUsersTable();
        populateBranchFilter();
        showSuccessPopup('បានលុបអ្នកប្រើប្រាស់ដោយជោគជ័យ!');
    }
}

// ===================== PROMOTIONS MANAGEMENT WITH PERMISSIONS =====================
function generatePromotionId() {
    return 'PROMO-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function getPromotionStatus(endDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    return end >= today ? 'active' : 'expired';
}

function openPromotionModal() {
    // Check if user has permission to add promotions
    if (!canEditPromotion(null)) {
        showSuccessPopup('មានតែ Admin ប៉ុណ្ណោះដែលអាចបន្ថែមប្រូម៉ូសិនបាន!');
        return;
    }
    
    document.getElementById('promotionModal').style.display = 'block';
    document.getElementById('edit_promotion_index').value = '';
    document.getElementById('promotionModalTitle').textContent = 'បន្ថែមប្រូម៉ូសិន';
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('promo_start_date').value = today;
    document.getElementById('promo_start_date').setAttribute('min', today);
    document.getElementById('promo_end_date').setAttribute('min', today);
}

function closePromotionModal() {
    document.getElementById('promotionModal').style.display = 'none';
    document.getElementById('promotionForm').reset();
    editingPromotionIndex = null;
}

document.getElementById('promotionForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Check permission before saving
    if (!canEditPromotion(null)) {
        showSuccessPopup('មានតែ Admin ប៉ុណ្ណោះដែលអាចបន្ថែម/កែប្រែប្រូម៉ូសិនបាន!');
        return;
    }
    
    const formData = {
        id: editingPromotionIndex !== null ? promotionsData[editingPromotionIndex].id : generatePromotionId(),
        channel: document.getElementById('promo_channel').value,
        campaign: document.getElementById('promo_campaign').value,
        start_date: document.getElementById('promo_start_date').value,
        end_date: document.getElementById('promo_end_date').value,
        terms: document.getElementById('promo_terms').value,
        status: getPromotionStatus(document.getElementById('promo_end_date').value),
        created_by: currentUser.fullname,
        created_date: editingPromotionIndex !== null ? promotionsData[editingPromotionIndex].created_date : new Date().toISOString().split('T')[0],
        branch: currentUser.branch
    };
    
    if (editingPromotionIndex !== null) {
        promotionsData[editingPromotionIndex] = formData;
        showSuccessPopup('ប្រូម៉ូសិនត្រូវបានកែប្រែដោយជោគជ័យ!');
    } else {
        promotionsData.push(formData);
        showSuccessPopup('ប្រូម៉ូសិនត្រូវបានបន្ថែមដោយជោគជ័យ!');
    }
    
    saveDataToStorage();
    refreshPromotionsGrid();
    closePromotionModal();
});

function refreshPromotionsGrid(filteredData = null) {
    const grid = document.getElementById('promotionsGrid');
    const emptyState = document.getElementById('promotionsEmptyState');
    grid.innerHTML = '';
    
    let dataToShow = filteredData !== null ? filteredData : promotionsData;
    
    // Admin can see all promotions, others see all too (view only)
    // No filtering by branch for promotions - everyone can view all promotions
    
    if (dataToShow.length === 0) {
        grid.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    
    grid.classList.remove('hidden');
    emptyState.classList.add('hidden');
    
    dataToShow.forEach((promo, index) => {
        const originalIndex = promotionsData.indexOf(promo);
        const canEdit = canEditPromotion(promo); // Only admin can edit
        const status = getPromotionStatus(promo.end_date);
        const statusClass = status === 'active' ? 'status-active' : 'status-expired';
        const statusText = status === 'active' ? 'សកម្ម' : 'ផុតកំណត់';
        
        const card = document.createElement('div');
        card.className = 'promotion-card';
        card.innerHTML = `
            <span class="promotion-status ${statusClass}">${statusText}</span>
            <h3>${promo.campaign}</h3>
            <div class="promotion-info">
                <strong>Channel:</strong> ${promo.channel}
            </div>
            <div class="promotion-info">
                <strong>Campaign:</strong> ${promo.campaign}
            </div>
            <div class="promotion-info">
                <strong>ថ្ងៃចាប់ផ្ដើម:</strong> ${promo.start_date}
            </div>
            <div class="promotion-info">
                <strong>ថ្ងៃបញ្ចប់:</strong> ${promo.end_date}
            </div>
            <div class="promotion-terms">
                <strong>លក្ខខណ្ឌ:</strong>
                <div class="promotion-terms-content collapsed" id="terms-${originalIndex}">
                    ${promo.terms}
                </div>
                <button class="btn-view-more" onclick="togglePromotionTerms(${originalIndex})">
                    មើលបន្ថែម <i class="fas fa-chevron-down"></i>
                </button>
            </div>
            <div class="promotion-created-info">
                <span><i class="fas fa-user"></i> ${promo.created_by}</span>
                <span><i class="fas fa-building"></i> ${promo.branch}</span>
            </div>
            ${canEdit ? `
            <div class="promotion-actions">
                <button class="btn-edit-promo" onclick="editPromotion(${originalIndex})" title="កែប្រែ">
                    <i class="fas fa-edit"></i> កែប្រែ
                </button>
                <button class="btn-delete-promo" onclick="deletePromotion(${originalIndex})" title="លុប">
                    <i class="fas fa-trash"></i> លុប
                </button>
            </div>
            ` : `
            <div class="promotion-actions">
                <div class="view-only-badge" style="width: 100%; text-align: center; padding: 12px;">
                    <i class="fas fa-eye"></i> មើលប៉ុណ្ណោះ - មានតែ Admin ទេដែលអាចកែប្រែបាន
                </div>
            </div>
            `}
        `;
        
        grid.appendChild(card);
    });
}

function togglePromotionTerms(index) {
    const termsContent = document.getElementById(`terms-${index}`);
    const button = termsContent.nextElementSibling;
    const isExpanded = termsContent.classList.contains('expanded');
    
    if (isExpanded) {
        termsContent.classList.remove('expanded');
        termsContent.classList.add('collapsed');
        button.innerHTML = 'មើលបន្ថែម <i class="fas fa-chevron-down"></i>';
        button.classList.remove('expanded');
    } else {
        termsContent.classList.remove('collapsed');
        termsContent.classList.add('expanded');
        button.innerHTML = 'បង្រួម <i class="fas fa-chevron-down"></i>';
        button.classList.add('expanded');
    }
}

function editPromotion(index) {
    const promo = promotionsData[index];
    
    // Check permission
    if (!canEditPromotion(promo)) {
        showSuccessPopup('មានតែ Admin ប៉ុណ្ណោះដែលអាចកែប្រែប្រូម៉ូសិនបាន!');
        return;
    }
    
    editingPromotionIndex = index;
    
    document.getElementById('promo_channel').value = promo.channel;
    document.getElementById('promo_campaign').value = promo.campaign;
    document.getElementById('promo_start_date').value = promo.start_date;
    document.getElementById('promo_end_date').value = promo.end_date;
    document.getElementById('promo_terms').value = promo.terms;
    
    document.getElementById('edit_promotion_index').value = index;
    document.getElementById('promotionModalTitle').textContent = 'កែប្រែប្រូម៉ូសិន';
    document.getElementById('promotionModal').style.display = 'block';
}

function deletePromotion(index) {
    const promo = promotionsData[index];
    
    // Check permission
    if (!canEditPromotion(promo)) {
        showSuccessPopup('មានតែ Admin ប៉ុណ្ណោះដែលអាចលុបប្រូម៉ូសិនបាន!');
        return;
    }
    
    if (confirm(`តើអ្នកប្រាកដថាចង់លុបប្រូម៉ូសិន "${promo.campaign}" មែនទេ?`)) {
        promotionsData.splice(index, 1);
        saveDataToStorage();
        refreshPromotionsGrid();
        showSuccessPopup('បានលុបប្រូម៉ូសិនដោយជោគជ័យ!');
    }
}

function filterPromotions(searchTerm) {
    if (!searchTerm.trim()) {
        refreshPromotionsGrid();
        return;
    }
    
    const filtered = promotionsData.filter(promo => {
        const search = searchTerm.toLowerCase();
        return promo.channel.toLowerCase().includes(search) ||
               promo.campaign.toLowerCase().includes(search) ||
               promo.terms.toLowerCase().includes(search);
    });
    
    refreshPromotionsGrid(filtered);
}

document.getElementById('promo_start_date').addEventListener('change', function() {
    document.getElementById('promo_end_date').setAttribute('min', this.value);
});

// ===================== SIGNUP MODAL FUNCTIONS =====================
function openSignupModal() {
    document.getElementById('signupModal').style.display = 'block';
}

function closeSignupModal() {
    document.getElementById('signupModal').style.display = 'none';
}

function sendToTelegram() {
    window.open('https://t.me/saray2026123', '_blank');
}

// ===================== SOCIAL LOGIN FUNCTIONS =====================
function loginWithGoogle() {
    alert('Google Login នឹងត្រូវបានអភិវឌ្ឍនាពេលខាងមុខ!');
}

function loginWithFacebook() {
    alert('Facebook Login នឹងត្រូវបានអភិវឌ្ឍនាពេលខាងមុខ!');
}

// ===================== EVENT LISTENERS =====================
document.getElementById('signupLink').addEventListener('click', function(e) {
    e.preventDefault();
    openSignupModal();
});

window.addEventListener('click', function(event) {
    const modal = document.getElementById('signupModal');
    if (event.target == modal) {
        closeSignupModal();
    }
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeSignupModal();
    }
});

window.onclick = function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
}

// ===================== END OF APP.JS =====================
console.log('✅ App.js loaded successfully');
console.log('📱 Sales Management System V17.0 with Promotions');
console.log('🔐 Promotions: Admin (Add/Edit), Supervisor/Agent (View Only)');
console.log('🔗 Google Sheets: https://script.google.com/macros/s/AKfycbyife3a_9tnA4VLy6dYSN1NmtAp4mVcfhAt0NBKHB6l75MG3UO1ZzQtSd4mVU0foR9I/exec');
console.log('🚀 Ready to use!');
