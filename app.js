// ============================================================
// Smart 5G Dashboard — app.js
// ============================================================

// ------------------------------------------------------------
// State & Constants
// ------------------------------------------------------------
let currentRole = 'admin'; // 'admin', 'supervisor', 'user'
let currentPage = 'dashboard';
let currentSaleTab = 'report';
let currentCustomerTab = 'new-customer';
let currentSettingsTab = 'permission';
let currentReportView = 'table'; // 'table' or 'summary'
let filteredSales = [];
let itemGroupSelected = 'unit'; // 'unit' or 'dollar'
let kpiValueMode = 'unit'; // 'unit' or 'currency'
let kpiTypeSelected = 'Sales';

// Chart instances
let _cTrend = null, _cMix = null, _cAgent = null, _cGrowth = null;

// Constants
const TAB_PERM = { admin: ['permission','kpi','promo'], supervisor: ['kpi'], user: [] };
const TAB_LBL = { permission: 'Permission', kpi: 'KPI Setting', promo: 'Promotion' };
const AV_COLORS = ['#E53935','#8E24AA','#1565C0','#00838F','#2E7D32','#F57F17','#4E342E','#37474F'];
const CHART_PAL = ['#1B7D3D','#2196F3','#FF9800','#9C27B0','#F44336','#00BCD4','#FFEB3B','#795548'];
const KNOWN_CURS = ['USD','KHR','THB','VND'];
const KNOWN_UNITS = ['Unit','SIM','GB','MB','Minutes','SMS','Voucher'];

// ------------------------------------------------------------
// Sample Data
// ------------------------------------------------------------
let itemCatalogue = [
  { id: 'i1', name: 'SIM Card', shortcut: 'SIM', group: 'unit', unit: 'Unit', category: 'Prepaid', status: 'active', desc: 'Prepaid SIM card' },
  { id: 'i2', name: 'Data 5GB', shortcut: 'D5', group: 'unit', unit: 'GB', category: 'Data', status: 'active', desc: 'Data package 5GB' },
  { id: 'i3', name: 'Top Up USD', shortcut: 'TU', group: 'dollar', currency: 'USD', price: 10, category: 'Prepaid', status: 'active', desc: 'Top up USD' },
];

let saleRecords = [
  { id: 's1', agent: 'Alice', branch: 'Phnom Penh', date: '2025-01-15', note: '', items: { i1: 5, i2: 3 }, dollarItems: { i3: 20 } },
  { id: 's2', agent: 'Bob', branch: 'Siem Reap', date: '2025-01-20', note: '', items: { i1: 2, i2: 1 }, dollarItems: { i3: 10 } },
  { id: 's3', agent: 'Alice', branch: 'Phnom Penh', date: '2025-02-05', note: '', items: { i1: 8, i2: 5 }, dollarItems: { i3: 40 } },
  { id: 's4', agent: 'Charlie', branch: 'Battambang', date: '2025-02-10', note: '', items: { i1: 3 }, dollarItems: { i3: 15 } },
  { id: 's5', agent: 'Bob', branch: 'Siem Reap', date: '2025-02-18', note: '', items: { i2: 4 }, dollarItems: { i3: 25 } },
];

let newCustomers = [
  { id: 'nc1', name: 'Dara Sok', phone: '012345678', idNum: 'ID001', pkg: 'Prepaid Basic', agent: 'Alice', branch: 'Phnom Penh', date: '2025-02-01' },
];

let topUpList = [
  { id: 'tu1', name: 'Meas Vireak', phone: '098765432', amount: 5, agent: 'Bob', branch: 'Siem Reap', date: '2025-02-10' },
];

let terminationList = [
  { id: 'tr1', name: 'Nget Chenda', phone: '077654321', reason: 'Changed provider', agent: 'Charlie', branch: 'Battambang', date: '2025-02-15' },
];

let staffList = [
  { id: 'u1', name: 'Alice Johnson', username: 'alice', password: 'Pass@123', role: 'Admin', branch: 'Phnom Penh', status: 'active' },
  { id: 'u2', name: 'Bob Smith', username: 'bob', password: 'Pass@123', role: 'Supervisor', branch: 'Siem Reap', status: 'active' },
  { id: 'u3', name: 'Charlie Brown', username: 'charlie', password: 'Pass@123', role: 'User', branch: 'Battambang', status: 'active' },
];

let kpiList = [
  { id: 'k1', name: 'Monthly Sales Target', type: 'Sales', target: 50, valueMode: 'unit', unit: 'Sales', period: 'Monthly' },
  { id: 'k2', name: 'Revenue Goal', type: 'Revenue', target: 5000, valueMode: 'currency', currency: 'USD', period: 'Monthly' },
];

let promotionList = [];
let depositList = [];

// ------------------------------------------------------------
// Helper Functions
// ------------------------------------------------------------
function g(id) { return document.getElementById(id); }
function rv(id) { const el = g(id); return el ? el.value.trim() : ''; }
function rt(id) { const el = g(id); return el ? el.value : ''; }
function $$(sel) { return document.querySelectorAll(sel); }
function uid() { return '_' + Math.random().toString(36).substr(2, 9); }
function ini(name) { return name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2); }
function fmtMoney(n, cur) { cur = cur !== undefined ? cur : '$'; return cur + Number(n).toFixed(2); }
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Toast notification
function showToast(message, type) {
  type = type || 'info';
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function() { toast.classList.add('toast-show'); }, 10);
  setTimeout(function() {
    toast.classList.remove('toast-show');
    setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
  }, 3000);
}

// ------------------------------------------------------------
// Date Helpers
// ------------------------------------------------------------
function ymOf(dateStr) { return dateStr ? dateStr.substring(0, 7) : ''; }
function ymNow() { return new Date().toISOString().substring(0, 7); }
function ymPrev() { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().substring(0, 7); }
function ymLabel(ym) {
  const parts = ym.split('-');
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+parts[1] - 1] + ' ' + parts[0];
}
function last7Months() {
  const r = [];
  const d = new Date();
  for (let i = 6; i >= 0; i--) {
    const t = new Date(d.getFullYear(), d.getMonth() - i, 1);
    r.push(t.toISOString().substring(0, 7));
  }
  return r;
}
function pctChange(curr, prev) {
  if (!prev) return null;
  return Math.round((curr - prev) / prev * 100);
}
function setTrend(elId, curr, prev) {
  const el = g(elId);
  if (!el) return;
  const pct = pctChange(curr, prev);
  if (pct === null) {
    el.innerHTML = '<i class="fas fa-minus"></i> N/A';
    el.className = 'trend-badge trend-flat';
  } else if (pct > 0) {
    el.innerHTML = '<i class="fas fa-arrow-up"></i> ' + pct + '%';
    el.className = 'trend-badge trend-up';
  } else if (pct < 0) {
    el.innerHTML = '<i class="fas fa-arrow-down"></i> ' + pct + '%';
    el.className = 'trend-badge trend-down';
  } else {
    el.innerHTML = '<i class="fas fa-minus"></i> 0%';
    el.className = 'trend-badge trend-flat';
  }
}
function destroyChart(ref) {
  if (ref) { try { ref.destroy(); } catch (e) {} }
  return null;
}
function clearCanvas(id) {
  const c = g(id);
  if (c) { const ctx = c.getContext('2d'); ctx.clearRect(0, 0, c.width, c.height); }
}

// ------------------------------------------------------------
// Branch Helpers
// ------------------------------------------------------------
function getBranches() {
  const defaults = ['Phnom Penh', 'Siem Reap', 'Battambang'];
  const fromRecords = saleRecords.map(function(s) { return s.branch; }).filter(Boolean);
  const all = defaults.concat(fromRecords);
  return all.filter(function(b, i) { return all.indexOf(b) === i; });
}

function populateBranchDropdowns() {
  const branches = getBranches();
  const ids = ['sale-branch', 'nc-branch', 'tu-branch', 'term-branch', 'user-branch', 'deposit-branch'];
  ids.forEach(function(id) {
    const sel = g(id);
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">Select branch</option>' +
      branches.map(function(b) { return '<option value="' + esc(b) + '">' + esc(b) + '</option>'; }).join('');
    sel.value = current;
  });
}

function populateSaleFilterDropdowns() {
  const agentSel = g('sale-filter-agent');
  const branchSel = g('sale-filter-branch');
  if (agentSel) {
    const agents = [];
    saleRecords.forEach(function(s) { if (s.agent && agents.indexOf(s.agent) < 0) agents.push(s.agent); });
    const current = agentSel.value;
    agentSel.innerHTML = '<option value="">All Agents</option>' +
      agents.map(function(a) { return '<option value="' + esc(a) + '">' + esc(a) + '</option>'; }).join('');
    agentSel.value = current;
  }
  if (branchSel) {
    const branches = getBranches();
    const current = branchSel.value;
    branchSel.innerHTML = '<option value="">All Branches</option>' +
      branches.map(function(b) { return '<option value="' + esc(b) + '">' + esc(b) + '</option>'; }).join('');
    branchSel.value = current;
  }
}

// ------------------------------------------------------------
// Navigation
// ------------------------------------------------------------
function navigateTo(page, btn) {
  $$('.page').forEach(function(p) { p.classList.remove('active'); });
  const pg = g('page-' + page);
  if (pg) pg.classList.add('active');
  currentPage = page;

  $$('.nav-item').forEach(function(li) { li.classList.remove('active'); });
  if (btn) {
    const li = btn.closest ? btn.closest('.nav-item') : null;
    if (li) li.classList.add('active');
  } else if (page === 'dashboard') {
    const navDash = g('nav-dashboard');
    if (navDash) navDash.classList.add('active');
  }

  const titles = {
    dashboard: 'Dashboard',
    promotionPage: 'Promotion',
    deposit: 'Deposit',
    sale: 'Sale',
    customer: 'Customer',
    settings: 'Settings'
  };
  const titleEl = g('page-title');
  if (titleEl) titleEl.textContent = titles[page] || page;

  if (page === 'dashboard') renderDashboard();
  if (page === 'sale') { renderItemChips(); renderSaleTable(); }
  if (page === 'customer') {
    renderNewCustomerTable();
    renderTopUpTable();
    renderTerminationTable();
  }
  if (page === 'settings') {
    renderStaffTable();
    renderKpiTable();
    renderAccessContent(currentSettingsTab);
  }
}

function toggleSubmenu(id, btn) {
  const sub = g(id);
  if (!sub) return;
  const isOpen = sub.classList.contains('open');
  $$('.submenu').forEach(function(s) { s.classList.remove('open'); });
  $$('.has-submenu').forEach(function(li) { li.classList.remove('submenu-open'); });
  if (!isOpen) {
    sub.classList.add('open');
    const li = btn && btn.closest ? btn.closest('.has-submenu') : null;
    if (li) li.classList.add('submenu-open');
  }
}

function openSaleTab(tab, btn) {
  switchSaleTab(tab);
  $$('.sale-tab-btn').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
}

function switchSaleTab(tab) {
  currentSaleTab = tab;
  $$('.sale-tab-content').forEach(function(c) { c.classList.remove('active'); });
  const tc = g('sale-tab-' + tab);
  if (tc) tc.classList.add('active');
}

function openCustomerTab(tab, btn) {
  switchCustomerTab(tab);
  $$('.customer-tab-btn').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
}

function switchCustomerTab(tab) {
  currentCustomerTab = tab;
  $$('.customer-tab-content').forEach(function(c) { c.classList.remove('active'); });
  const tc = g('tab-content-' + tab);
  if (tc) tc.classList.add('active');
}

function openSettingsTab(tab, btn) {
  switchSettingsTab(tab);
  $$('.settings-tab-btn').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  renderAccessContent(tab);
}

function switchSettingsTab(tab) {
  currentSettingsTab = tab;
  $$('.settings-tab-content').forEach(function(c) { c.classList.remove('active'); });
  const tc = g('stab-content-' + tab);
  if (tc) tc.classList.add('active');
}

function renderAccessContent(tab) {
  const allowed = TAB_PERM[currentRole] || [];
  if (!allowed.includes(tab)) {
    const tc = g('stab-content-' + tab);
    if (tc) {
      tc.innerHTML = '<div class="access-denied"><i class="fas fa-lock fa-3x"></i><h3>Access Denied</h3><p>You do not have permission to access this section.</p></div>';
    }
  } else {
    if (tab === 'permission') renderStaffTable();
    if (tab === 'kpi') renderKpiTable();
  }
}

// ------------------------------------------------------------
// Role Switcher
// ------------------------------------------------------------
function switchRole(role) {
  currentRole = role;
  const roleNames = { admin: 'Admin User', supervisor: 'Supervisor User', user: 'Regular User' };
  const roleBadges = { admin: 'Admin', supervisor: 'Supervisor', user: 'User' };
  const roleColors = { admin: '#1B7D3D', supervisor: '#1565C0', user: '#6D4C41' };

  const nameEl = g('topbar-name');
  const roleEl = g('topbar-role');
  const avatarEl = g('topbar-avatar');

  if (nameEl) nameEl.textContent = roleNames[role];
  if (roleEl) { roleEl.textContent = roleBadges[role]; roleEl.style.background = roleColors[role]; }
  if (avatarEl) { avatarEl.textContent = ini(roleNames[role]); avatarEl.style.background = roleColors[role]; }

  const rb = g('role-widget-btn');
  if (rb) rb.textContent = '\u{1F464} ' + roleBadges[role];

  const wd = g('role-widget-dropdown');
  if (wd) wd.style.display = 'none';

  if (currentPage === 'settings') renderAccessContent(currentSettingsTab);
}

function toggleRoleWidget() {
  const wd = g('role-widget-dropdown');
  if (!wd) return;
  wd.style.display = wd.style.display === 'block' ? 'none' : 'block';
}

// ------------------------------------------------------------
// Modal Helpers
// ------------------------------------------------------------
function openModal(id) {
  const el = g(id);
  if (el) { el.style.display = 'flex'; setTimeout(function() { el.classList.add('active'); }, 10); }
}

function closeModal(id) {
  const el = g(id);
  if (el) { el.classList.remove('active'); setTimeout(function() { el.style.display = 'none'; }, 300); }
}

function handleOverlay(e, id) {
  if (e.target === e.currentTarget) closeModal(id);
}

function openAddModal(type) {
  if (type === 'item') openItemModal();
  else if (type === 'sale') openNewSaleModal();
  else if (type === 'new-customer') openCustomerModal('new-customer');
  else if (type === 'topup') openCustomerModal('topup');
  else if (type === 'termination') openCustomerModal('termination');
  else if (type === 'kpi') openKpiModal();
  else if (type === 'user') openUserModal();
}

function togglePwd(inputId, eyeId) {
  const inp = g(inputId);
  const eye = g(eyeId);
  if (!inp) return;
  if (inp.type === 'password') {
    inp.type = 'text';
    if (eye) eye.className = 'fas fa-eye-slash';
  } else {
    inp.type = 'password';
    if (eye) eye.className = 'fas fa-eye';
  }
}

// ------------------------------------------------------------
// Item Catalogue
// ------------------------------------------------------------
function openItemModal(item) {
  const form = g('form-addItem');
  if (form) form.reset();

  selectItemGroup('unit');
  g('item-edit-id').value = '';

  const title = g('modal-addItem-title');
  const btn = g('modal-addItem-submit');

  if (item) {
    if (title) title.textContent = 'Edit Item';
    if (btn) btn.textContent = 'Update Item';
    g('item-edit-id').value = item.id;
    g('item-name').value = item.name || '';
    g('item-shortcut').value = item.shortcut || '';
    g('item-category').value = item.category || '';
    g('item-status').value = item.status || 'active';
    g('item-desc').value = item.desc || '';

    selectItemGroup(item.group || 'unit');

    if (item.group === 'unit') {
      const unitSel = g('item-unit');
      if (KNOWN_UNITS.includes(item.unit)) {
        unitSel.value = item.unit;
      } else {
        unitSel.value = 'custom';
        g('item-custom-unit').value = item.unit || '';
        g('item-custom-unit-group').style.display = '';
      }
    } else {
      const curSel = g('item-currency');
      if (KNOWN_CURS.includes(item.currency)) {
        curSel.value = item.currency;
      } else {
        curSel.value = 'custom';
        g('item-custom-currency').value = item.currency || '';
        g('item-custom-currency-group').style.display = '';
      }
      g('item-price').value = item.price || '';
    }
  } else {
    if (title) title.textContent = 'Add Item';
    if (btn) btn.textContent = 'Add Item';
  }

  openModal('modal-addItem');
}

function selectItemGroup(grp) {
  itemGroupSelected = grp;
  const unitBtn = g('grp-btn-unit');
  const dollarBtn = g('grp-btn-dollar');
  const unitFields = g('item-unit-fields');
  const dollarFields = g('item-dollar-fields');

  if (grp === 'unit') {
    if (unitBtn) unitBtn.classList.add('active');
    if (dollarBtn) dollarBtn.classList.remove('active');
    if (unitFields) unitFields.style.display = '';
    if (dollarFields) dollarFields.style.display = 'none';
  } else {
    if (dollarBtn) dollarBtn.classList.add('active');
    if (unitBtn) unitBtn.classList.remove('active');
    if (unitFields) unitFields.style.display = 'none';
    if (dollarFields) dollarFields.style.display = '';
  }
}

function handleCurrencySelectChange() {
  const sel = g('item-currency');
  const grp = g('item-custom-currency-group');
  if (!grp) return;
  grp.style.display = sel && sel.value === 'custom' ? '' : 'none';
}

function handleUnitSelectChange() {
  const sel = g('item-unit');
  const grp = g('item-custom-unit-group');
  if (!grp) return;
  grp.style.display = sel && sel.value === 'custom' ? '' : 'none';
}

function submitItem(e) {
  e.preventDefault();
  const editId = rv('item-edit-id');
  const name = rv('item-name');
  const shortcut = rv('item-shortcut');
  const category = rv('item-category');
  const status = rv('item-status');
  const desc = rv('item-desc');
  const grp = itemGroupSelected;

  if (!name) return showToast('Please enter item name', 'error');

  let unit = '', currency = '', price = 0;
  if (grp === 'unit') {
    const unitSel = g('item-unit');
    unit = unitSel && unitSel.value === 'custom' ? rv('item-custom-unit') : rv('item-unit');
  } else {
    const curSel = g('item-currency');
    currency = curSel && curSel.value === 'custom' ? rv('item-custom-currency') : rv('item-currency');
    price = parseFloat(rv('item-price')) || 0;
  }

  const obj = { id: editId || uid(), name: name, shortcut: shortcut, group: grp, unit: unit, currency: currency, price: price, category: category, status: status, desc: desc };

  if (editId) {
    const idx = itemCatalogue.findIndex(function(x) { return x.id === editId; });
    if (idx >= 0) itemCatalogue[idx] = obj;
  } else {
    itemCatalogue.push(obj);
  }

  closeModal('modal-addItem');
  renderItemChips();
  renderDashboard();
}

function editItem(id) {
  const item = itemCatalogue.find(function(x) { return x.id === id; });
  if (item) openItemModal(item);
}

function deleteItem(id) {
  if (!confirm('Delete this item?')) return;
  itemCatalogue = itemCatalogue.filter(function(x) { return x.id !== id; });
  renderItemChips();
  renderDashboard();
}

// openItemModal in openItemModal() already uses `item` object directly for editing;
// renderItemChips uses ID-based onclick to avoid XSS from JSON-in-attribute
function renderItemChips() {
  const strip = g('items-strip');
  if (!strip) return;
  const active = itemCatalogue.filter(function(x) { return x.status === 'active'; });
  if (!active.length) {
    strip.innerHTML = '<span class="empty-chips">No items in catalogue. <a href="#" onclick="openAddModal(\'item\');return false;">Add Item</a></span>';
    return;
  }
  strip.innerHTML = active.map(function(item) {
    const chipClass = item.group === 'unit' ? 'item-chip-unit' : 'item-chip-dollar';
    const iconClass = item.group === 'unit' ? 'fa-box' : 'fa-dollar-sign';
    return '<span class="item-chip ' + chipClass + '" onclick="editItem(\'' + esc(item.id) + '\')">' +
      '<i class="fas ' + iconClass + '"></i> ' + esc(item.shortcut || item.name) + '</span>';
  }).join('');
}

// ------------------------------------------------------------
// New Sale Modal
// ------------------------------------------------------------
function openNewSaleModal(sale) {
  const form = g('form-newSale');
  if (form) form.reset();
  g('sale-edit-id').value = '';

  const title = g('modal-newSale-title');
  const btn = g('modal-newSale-submit');

  const unitItems = itemCatalogue.filter(function(x) { return x.group === 'unit' && x.status === 'active'; });
  const dollarItems = itemCatalogue.filter(function(x) { return x.group === 'dollar' && x.status === 'active'; });

  const unitContainer = g('sale-unit-items');
  const dollarContainer = g('sale-dollar-items');

  if (unitContainer) {
    if (unitItems.length) {
      unitContainer.innerHTML = '<div class="sale-items-grid">' + unitItems.map(function(item) {
        return '<div class="sic-card sic-card-unit">' +
          '<div class="sic-label">' + esc(item.name) + '</div>' +
          '<div class="sic-sub">' + esc(item.unit) + '</div>' +
          '<input type="number" class="sic-input" id="sic-' + esc(item.id) + '" min="0" value="" placeholder="0" oninput="updateSaleModalTotals()">' +
          '</div>';
      }).join('') + '</div>';
    } else {
      unitContainer.innerHTML = '<p class="no-items">No unit items in catalogue.</p>';
    }
  }

  if (dollarContainer) {
    if (dollarItems.length) {
      dollarContainer.innerHTML = '<div class="sale-items-grid">' + dollarItems.map(function(item) {
        return '<div class="sic-card sic-card-dollar">' +
          '<div class="sic-label">' + esc(item.name) + '</div>' +
          '<div class="sic-sub">' + esc(item.currency) + ' ' + esc(String(item.price)) + '</div>' +
          '<input type="number" class="sic-input" id="sic-' + esc(item.id) + '" min="0" step="0.01" value="" placeholder="0" oninput="updateSaleModalTotals()">' +
          '</div>';
      }).join('') + '</div>';
    } else {
      dollarContainer.innerHTML = '<p class="no-items">No dollar items in catalogue.</p>';
    }
  }

  if (sale) {
    if (title) title.textContent = 'Edit Sale';
    if (btn) btn.textContent = 'Update Sale';
    g('sale-edit-id').value = sale.id;
    g('sale-agent-name').value = sale.agent || '';
    g('sale-branch').value = sale.branch || '';
    g('sale-date').value = sale.date || '';
    g('sale-note').value = sale.note || '';

    if (sale.items) {
      Object.keys(sale.items).forEach(function(iid) {
        const inp = g('sic-' + iid);
        if (inp) inp.value = sale.items[iid];
      });
    }
    if (sale.dollarItems) {
      Object.keys(sale.dollarItems).forEach(function(iid) {
        const inp = g('sic-' + iid);
        if (inp) inp.value = sale.dollarItems[iid];
      });
    }
  } else {
    if (title) title.textContent = 'New Sale';
    if (btn) btn.textContent = 'Save Sale';
    g('sale-date').value = new Date().toISOString().split('T')[0];
  }

  updateSaleModalTotals();
  openModal('modal-newSale');
}

function updateSaleModalTotals() {
  let totalUnits = 0, totalRev = 0;

  itemCatalogue.forEach(function(item) {
    const inp = g('sic-' + item.id);
    if (!inp) return;
    const val = parseFloat(inp.value) || 0;
    if (item.group === 'unit') {
      totalUnits += val;
    } else {
      totalRev += val * (item.price || 1);
    }
  });

  const tu = g('sale-total-units');
  const tr = g('sale-total-rev');
  if (tu) tu.textContent = totalUnits;
  if (tr) tr.textContent = fmtMoney(totalRev);
}

function submitSale(e) {
  e.preventDefault();
  const editId = rv('sale-edit-id');
  const agent = rv('sale-agent-name');
  const branch = rv('sale-branch');
  const date = rv('sale-date');
  const note = rv('sale-note');

  if (!agent) return showToast('Please enter agent name', 'error');
  if (!date) return showToast('Please select date', 'error');

  const items = {}, dollarItems = {};
  itemCatalogue.forEach(function(item) {
    const inp = g('sic-' + item.id);
    if (!inp) return;
    const val = parseFloat(inp.value) || 0;
    if (val > 0) {
      if (item.group === 'unit') items[item.id] = val;
      else dollarItems[item.id] = val;
    }
  });

  const obj = { id: editId || uid(), agent: agent, branch: branch, date: date, note: note, items: items, dollarItems: dollarItems };

  if (editId) {
    const idx = saleRecords.findIndex(function(x) { return x.id === editId; });
    if (idx >= 0) saleRecords[idx] = obj;
  } else {
    saleRecords.push(obj);
  }

  closeModal('modal-newSale');
  populateBranchDropdowns();
  applyReportFilters();
  if (currentPage === 'dashboard') renderDashboard();
}

function editSale(id) {
  const sale = saleRecords.find(function(x) { return x.id === id; });
  if (sale) openNewSaleModal(sale);
}

function deleteSale(id) {
  if (!confirm('Delete this sale record?')) return;
  saleRecords = saleRecords.filter(function(x) { return x.id !== id; });
  applyReportFilters();
  if (currentPage === 'dashboard') renderDashboard();
}

// ------------------------------------------------------------
// Sale Filters & Table
// ------------------------------------------------------------
function applyReportFilters() {
  const dateFrom = rv('sale-date-from');
  const dateTo = rv('sale-date-to');
  const agent = rv('sale-filter-agent');
  const branch = rv('sale-filter-branch');

  filteredSales = saleRecords.filter(function(s) {
    if (dateFrom && s.date < dateFrom) return false;
    if (dateTo && s.date > dateTo) return false;
    if (agent && s.agent !== agent) return false;
    if (branch && s.branch !== branch) return false;
    return true;
  });

  renderSaleTable();
  updateSaleKpis();
}

function clearReportFilters() {
  ['sale-date-from', 'sale-date-to', 'sale-filter-agent', 'sale-filter-branch'].forEach(function(id) {
    const el = g(id); if (el) el.value = '';
  });
  filteredSales = saleRecords.slice();
  renderSaleTable();
  updateSaleKpis();
}

function setReportView(view) {
  currentReportView = view;
  $$('.view-toggle-btn').forEach(function(b) { b.classList.remove('active'); });
  const btn = g('view-btn-' + view);
  if (btn) btn.classList.add('active');

  const tableCard = g('sale-table-card');
  const summaryView = g('sale-summary-view');

  if (view === 'table') {
    if (tableCard) tableCard.style.display = '';
    if (summaryView) summaryView.style.display = 'none';
  } else {
    if (tableCard) tableCard.style.display = 'none';
    if (summaryView) summaryView.style.display = '';
    const unitItems = itemCatalogue.filter(function(x) { return x.group === 'unit' && x.status === 'active'; });
    const dollarItems = itemCatalogue.filter(function(x) { return x.group === 'dollar' && x.status === 'active'; });
    renderSummaryView(filteredSales, unitItems, dollarItems);
  }
}

function updateSaleKpis() {
  const data = filteredSales.length ? filteredSales : saleRecords;
  let totalSales = data.length;
  let totalUnits = 0, totalRev = 0;
  const agents = new Set();

  data.forEach(function(s) {
    agents.add(s.agent);
    Object.keys(s.items || {}).forEach(function(iid) { totalUnits += s.items[iid]; });
    Object.keys(s.dollarItems || {}).forEach(function(iid) {
      const item = itemCatalogue.find(function(x) { return x.id === iid; });
      totalRev += s.dollarItems[iid] * (item ? item.price : 1);
    });
  });

  const el1 = g('sale-kpi-sales'); if (el1) el1.textContent = totalSales;
  const el2 = g('sale-kpi-units'); if (el2) el2.textContent = totalUnits;
  const el3 = g('sale-kpi-revenue'); if (el3) el3.textContent = fmtMoney(totalRev);
  const el4 = g('sale-kpi-agents'); if (el4) el4.textContent = agents.size;
}

function renderSaleTable() {
  const table = g('sale-table');
  if (!table) return;

  populateSaleFilterDropdowns();

  const actualData = filteredSales;
  const unitItems = itemCatalogue.filter(function(x) { return x.group === 'unit' && x.status === 'active'; });
  const dollarItems = itemCatalogue.filter(function(x) { return x.group === 'dollar' && x.status === 'active'; });

  if (!actualData.length) {
    table.innerHTML = '<tr><td colspan="20" class="empty-state"><i class="fas fa-inbox"></i><br>No records found</td></tr>';
    updateTotalBar(0, 0);
    return;
  }

  let headerRow1 = '<tr><th rowspan="2">Agent</th><th rowspan="2">Branch</th><th rowspan="2">Date</th>';
  if (unitItems.length) headerRow1 += '<th colspan="' + unitItems.length + '" class="th-group-unit">Unit Group</th>';
  if (dollarItems.length) headerRow1 += '<th colspan="' + dollarItems.length + '" class="th-group-dollar">Dollar Group</th>';
  headerRow1 += '<th rowspan="2" class="td-revenue">Revenue</th><th rowspan="2">Actions</th></tr>';

  let headerRow2 = '<tr>';
  unitItems.forEach(function(item) { headerRow2 += '<th class="th-unit">' + esc(item.shortcut || item.name) + '</th>'; });
  dollarItems.forEach(function(item) { headerRow2 += '<th class="th-dollar">' + esc(item.shortcut || item.name) + '</th>'; });
  headerRow2 += '</tr>';

  let totalUnits = 0, totalRev = 0;

  const bodyRows = actualData.map(function(s) {
    let saleUnits = 0, saleRev = 0;
    const unitCells = unitItems.map(function(item) {
      const qty = s.items && s.items[item.id] ? s.items[item.id] : 0;
      saleUnits += qty;
      totalUnits += qty;
      return '<td class="td-unit">' + (qty || '') + '</td>';
    }).join('');
    const dollarCells = dollarItems.map(function(item) {
      const amt = s.dollarItems && s.dollarItems[item.id] ? s.dollarItems[item.id] : 0;
      const rev = amt * (item.price || 1);
      saleRev += rev;
      totalRev += rev;
      return '<td class="td-dollar">' + (amt > 0 ? fmtMoney(amt, esc(item.currency) + ' ') : '') + '</td>';
    }).join('');

    const avIdx = Math.abs(s.agent.charCodeAt(0)) % 8;
    return '<tr>' +
      '<td><div class="name-cell"><span class="avatar av-' + avIdx + '">' + esc(ini(s.agent)) + '</span>' + esc(s.agent) + '</div></td>' +
      '<td>' + esc(s.branch) + '</td>' +
      '<td>' + esc(s.date) + '</td>' +
      unitCells +
      dollarCells +
      '<td class="td-revenue">' + fmtMoney(saleRev) + '</td>' +
      '<td>' +
        '<button class="btn-edit" onclick="editSale(\'' + esc(s.id) + '\')"><i class="fas fa-edit"></i></button>' +
        '<button class="btn-delete" onclick="deleteSale(\'' + esc(s.id) + '\')"><i class="fas fa-trash"></i></button>' +
      '</td>' +
      '</tr>';
  }).join('');

  table.innerHTML = '<thead>' + headerRow1 + headerRow2 + '</thead><tbody>' + bodyRows + '</tbody>';
  updateTotalBar(totalUnits, totalRev);
}

function updateTotalBar(units, rev) {
  const bar = g('sale-total-bar');
  if (!bar) return;
  bar.innerHTML = '<span class="total-label">Total Units: <strong>' + units + '</strong></span>' +
    '<span class="total-label">Total Revenue: <strong>' + fmtMoney(rev) + '</strong></span>';
}

function renderSummaryView(data, unitItems, dollarItems) {
  const container = g('sale-summary-view');
  if (!container) return;

  if (!data.length) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox fa-3x"></i><p>No records found</p></div>';
    return;
  }

  const agentMap = {};
  data.forEach(function(s) {
    if (!agentMap[s.agent]) agentMap[s.agent] = { units: {}, dollars: {}, totalUnits: 0, totalRev: 0 };
    const ag = agentMap[s.agent];
    Object.keys(s.items || {}).forEach(function(iid) {
      ag.units[iid] = (ag.units[iid] || 0) + s.items[iid];
      ag.totalUnits += s.items[iid];
    });
    Object.keys(s.dollarItems || {}).forEach(function(iid) {
      ag.dollars[iid] = (ag.dollars[iid] || 0) + s.dollarItems[iid];
      const item = itemCatalogue.find(function(x) { return x.id === iid; });
      ag.totalRev += s.dollarItems[iid] * (item ? item.price : 1);
    });
  });

  const cards = Object.keys(agentMap).map(function(agent, idx) {
    const ag = agentMap[agent];
    const unitRows = unitItems.map(function(item) {
      const qty = ag.units[item.id] || 0;
      return qty ? '<div class="summary-row"><span>' + esc(item.name) + '</span><span class="badge-unit">' + qty + '</span></div>' : '';
    }).join('');
    const dollarRows = dollarItems.map(function(item) {
      const amt = ag.dollars[item.id] || 0;
      return amt ? '<div class="summary-row"><span>' + esc(item.name) + '</span><span class="badge-dollar">' + fmtMoney(amt, esc(item.currency) + ' ') + '</span></div>' : '';
    }).join('');
    return '<div class="summary-card">' +
      '<div class="summary-card-header">' +
        '<span class="avatar av-' + (idx % 8) + '">' + esc(ini(agent)) + '</span>' +
        '<div><strong>' + esc(agent) + '</strong><br><small>Units: ' + ag.totalUnits + ' | Rev: ' + fmtMoney(ag.totalRev) + '</small></div>' +
      '</div>' +
      '<div class="summary-card-body">' + unitRows + dollarRows + '</div>' +
      '</div>';
  }).join('');

  container.innerHTML = '<div class="summary-grid">' + cards + '</div>';
}

// ------------------------------------------------------------
// Dashboard
// ------------------------------------------------------------
function renderDashboard() {
  const ym = ymNow();
  const ymP = ymPrev();

  const branchFilter = rv('dash-branch-filter');
  const filteredRecords = branchFilter ? saleRecords.filter(function(s) { return s.branch === branchFilter; }) : saleRecords;

  const currSales = filteredRecords.filter(function(s) { return ymOf(s.date) === ym; });
  const prevSales = filteredRecords.filter(function(s) { return ymOf(s.date) === ymP; });

  let currUnits = 0, prevUnits = 0, currRev = 0, prevRev = 0;
  const currAgents = new Set(), prevAgents = new Set();

  currSales.forEach(function(s) {
    currAgents.add(s.agent);
    Object.values(s.items || {}).forEach(function(v) { currUnits += v; });
    Object.keys(s.dollarItems || {}).forEach(function(iid) {
      const item = itemCatalogue.find(function(x) { return x.id === iid; });
      currRev += s.dollarItems[iid] * (item ? item.price : 1);
    });
  });

  prevSales.forEach(function(s) {
    prevAgents.add(s.agent);
    Object.values(s.items || {}).forEach(function(v) { prevUnits += v; });
    Object.keys(s.dollarItems || {}).forEach(function(iid) {
      const item = itemCatalogue.find(function(x) { return x.id === iid; });
      prevRev += s.dollarItems[iid] * (item ? item.price : 1);
    });
  });

  const kv = g('kv-sales'); if (kv) kv.textContent = currSales.length;
  const ku = g('kv-units'); if (ku) ku.textContent = currUnits;
  const kr = g('kv-revenue'); if (kr) kr.textContent = fmtMoney(currRev);
  const ka = g('kv-agents'); if (ka) ka.textContent = currAgents.size;

  setTrend('tr-sales', currSales.length, prevSales.length);
  setTrend('tr-units', currUnits, prevUnits);
  setTrend('tr-revenue', currRev, prevRev);
  setTrend('tr-agents', currAgents.size, prevAgents.size);

  // Chart 1: Monthly Trend (line chart, dual Y)
  _cTrend = destroyChart(_cTrend);
  clearCanvas('cTrend');
  const months = last7Months();
  const monthLabels = months.map(ymLabel);
  const unitsPerMonth = months.map(function(m) {
    let u = 0;
    filteredRecords.filter(function(s) { return ymOf(s.date) === m; }).forEach(function(s) {
      Object.values(s.items || {}).forEach(function(v) { u += v; });
    });
    return u;
  });
  const revPerMonth = months.map(function(m) {
    let r = 0;
    filteredRecords.filter(function(s) { return ymOf(s.date) === m; }).forEach(function(s) {
      Object.keys(s.dollarItems || {}).forEach(function(iid) {
        const item = itemCatalogue.find(function(x) { return x.id === iid; });
        r += s.dollarItems[iid] * (item ? item.price : 1);
      });
    });
    return r;
  });
  const tCtx = g('cTrend');
  if (tCtx && typeof Chart !== 'undefined') {
    _cTrend = new Chart(tCtx, {
      type: 'line',
      data: {
        labels: monthLabels,
        datasets: [
          { label: 'Units', data: unitsPerMonth, borderColor: '#1B7D3D', backgroundColor: 'rgba(27,125,61,0.1)', yAxisID: 'y', tension: 0.4, fill: true },
          { label: 'Revenue ($)', data: revPerMonth, borderColor: '#FF9800', backgroundColor: 'rgba(255,152,0,0.1)', yAxisID: 'y1', tension: 0.4, fill: true }
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: { position: 'left', title: { display: true, text: 'Units' } },
          y1: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Revenue ($)' } }
        }
      }
    });
  }

  // Chart 2: Item Mix (doughnut)
  _cMix = destroyChart(_cMix);
  clearCanvas('cMix');
  const unitItemsDash = itemCatalogue.filter(function(x) { return x.group === 'unit' && x.status === 'active'; });
  const mixData = unitItemsDash.map(function(item) {
    let total = 0;
    currSales.forEach(function(s) { total += (s.items && s.items[item.id]) ? s.items[item.id] : 0; });
    return total;
  });
  const mCtx = g('cMix');
  if (mCtx && unitItemsDash.length && typeof Chart !== 'undefined') {
    _cMix = new Chart(mCtx, {
      type: 'doughnut',
      data: {
        labels: unitItemsDash.map(function(x) { return x.name; }),
        datasets: [{ data: mixData, backgroundColor: CHART_PAL }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
  }

  // Chart 3: Agent Performance (horizontal bar)
  _cAgent = destroyChart(_cAgent);
  clearCanvas('cAgent');
  const agentUnits = {};
  currSales.forEach(function(s) {
    if (!(s.agent in agentUnits)) agentUnits[s.agent] = 0;
    Object.values(s.items || {}).forEach(function(v) { agentUnits[s.agent] += v; });
  });
  const agentNames = Object.keys(agentUnits);
  const agentVals = agentNames.map(function(a) { return agentUnits[a]; });
  const aCtx = g('cAgent');
  if (aCtx && agentNames.length && typeof Chart !== 'undefined') {
    _cAgent = new Chart(aCtx, {
      type: 'bar',
      data: {
        labels: agentNames,
        datasets: [{ label: 'Units This Month', data: agentVals, backgroundColor: CHART_PAL }]
      },
      options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } } }
    });
  }

  // Chart 4: Growth vs Last Month (grouped bar)
  _cGrowth = destroyChart(_cGrowth);
  clearCanvas('cGrowth');
  const growthLabels = unitItemsDash.map(function(x) { return x.shortcut || x.name; });
  const currItemUnits = unitItemsDash.map(function(item) {
    let t = 0; currSales.forEach(function(s) { t += (s.items && s.items[item.id]) || 0; }); return t;
  });
  const prevItemUnits = unitItemsDash.map(function(item) {
    let t = 0; prevSales.forEach(function(s) { t += (s.items && s.items[item.id]) || 0; }); return t;
  });
  const gCtx = g('cGrowth');
  if (gCtx && unitItemsDash.length && typeof Chart !== 'undefined') {
    _cGrowth = new Chart(gCtx, {
      type: 'bar',
      data: {
        labels: growthLabels,
        datasets: [
          { label: 'This Month', data: currItemUnits, backgroundColor: '#1B7D3D' },
          { label: 'Last Month', data: prevItemUnits, backgroundColor: '#A5D6A7' }
        ]
      },
      options: { responsive: true, plugins: { legend: { position: 'top' } } }
    });
  }

  // Branch summary table
  const branchTable = g('branch-table');
  if (branchTable) {
    const branches = [];
    filteredRecords.forEach(function(s) { if (branches.indexOf(s.branch) < 0) branches.push(s.branch); });
    if (!branches.length) {
      branchTable.innerHTML = '<tr><td colspan="4" class="empty-state">No data</td></tr>';
    } else {
      branchTable.innerHTML = branches.map(function(branch) {
        let cU = 0, pU = 0;
        currSales.filter(function(s) { return s.branch === branch; }).forEach(function(s) {
          Object.values(s.items || {}).forEach(function(v) { cU += v; });
        });
        prevSales.filter(function(s) { return s.branch === branch; }).forEach(function(s) {
          Object.values(s.items || {}).forEach(function(v) { pU += v; });
        });
        const pct = pctChange(cU, pU);
        const trendHtml = pct === null ? '<span class="pill-gray">N/A</span>' :
          pct > 0 ? '<span class="pill-green">+' + pct + '%</span>' :
          pct < 0 ? '<span class="pill-red">' + pct + '%</span>' : '<span class="pill-gray">0%</span>';
        return '<tr><td>' + esc(branch) + '</td><td>' + cU + '</td><td>' + pU + '</td><td>' + trendHtml + '</td></tr>';
      }).join('');
    }
  }

  // Branch filter dropdown (preserve current selection)
  const dashBranchFilter = g('dash-branch-filter');
  if (dashBranchFilter) {
    const currentVal = dashBranchFilter.value;
    const allBranches = getBranches();
    dashBranchFilter.innerHTML = '<option value="">All Branches</option>' +
      allBranches.map(function(b) { return '<option value="' + esc(b) + '">' + esc(b) + '</option>'; }).join('');
    dashBranchFilter.value = currentVal;
  }
}

// ------------------------------------------------------------
// Customer Functions
// ------------------------------------------------------------
function openCustomerModal(type, item) {
  if (type === 'new-customer') {
    const form = g('form-newCustomer');
    if (form) form.reset();
    g('nc-edit-id').value = '';
    const title = g('modal-newCustomer-title');
    if (item) {
      if (title) title.textContent = 'Edit New Customer';
      g('nc-edit-id').value = item.id;
      g('nc-name').value = item.name || '';
      g('nc-phone').value = item.phone || '';
      g('nc-id').value = item.idNum || '';
      g('nc-package').value = item.pkg || '';
      g('nc-agent').value = item.agent || '';
      g('nc-branch').value = item.branch || '';
      g('nc-date').value = item.date || '';
    } else {
      if (title) title.textContent = 'Add New Customer';
      g('nc-date').value = new Date().toISOString().split('T')[0];
    }
    openModal('modal-newCustomer');

  } else if (type === 'topup') {
    const form = g('form-topUp');
    if (form) form.reset();
    g('tu-edit-id').value = '';
    const title = g('modal-topUp-title');
    if (item) {
      if (title) title.textContent = 'Edit Top Up';
      g('tu-edit-id').value = item.id;
      g('tu-name').value = item.name || '';
      g('tu-phone').value = item.phone || '';
      g('tu-amount').value = item.amount || '';
      g('tu-agent').value = item.agent || '';
      g('tu-branch').value = item.branch || '';
      g('tu-date').value = item.date || '';
    } else {
      if (title) title.textContent = 'Add Top Up';
      g('tu-date').value = new Date().toISOString().split('T')[0];
    }
    openModal('modal-topUp');

  } else if (type === 'termination') {
    const form = g('form-termination');
    if (form) form.reset();
    g('term-edit-id').value = '';
    const title = g('modal-termination-title');
    if (item) {
      if (title) title.textContent = 'Edit Termination';
      g('term-edit-id').value = item.id;
      g('term-name').value = item.name || '';
      g('term-phone').value = item.phone || '';
      g('term-reason').value = item.reason || '';
      g('term-agent').value = item.agent || '';
      g('term-branch').value = item.branch || '';
      g('term-date').value = item.date || '';
    } else {
      if (title) title.textContent = 'Add Termination';
      g('term-date').value = new Date().toISOString().split('T')[0];
    }
    openModal('modal-termination');
  }
}

function submitNewCustomer(e) {
  e.preventDefault();
  const editId = rv('nc-edit-id');
  const obj = {
    id: editId || uid(),
    name: rv('nc-name'), phone: rv('nc-phone'), idNum: rv('nc-id'),
    pkg: rv('nc-package'), agent: rv('nc-agent'), branch: rv('nc-branch'), date: rv('nc-date')
  };
  if (!obj.name) return showToast('Please enter customer name', 'error');
  if (editId) {
    const idx = newCustomers.findIndex(function(x) { return x.id === editId; });
    if (idx >= 0) newCustomers[idx] = obj;
  } else {
    newCustomers.push(obj);
  }
  closeModal('modal-newCustomer');
  renderNewCustomerTable();
}

function editNewCustomer(id) {
  const item = newCustomers.find(function(x) { return x.id === id; });
  if (item) openCustomerModal('new-customer', item);
}

function deleteNewCustomer(id) {
  if (!confirm('Delete this customer?')) return;
  newCustomers = newCustomers.filter(function(x) { return x.id !== id; });
  renderNewCustomerTable();
}

function renderNewCustomerTable() {
  const tbody = g('new-customer-table');
  if (!tbody) return;
  if (!newCustomers.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><i class="fas fa-users"></i><br>No customers yet</td></tr>';
    return;
  }
  tbody.innerHTML = newCustomers.map(function(c, i) {
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td><div class="name-cell"><span class="avatar av-' + (i % 8) + '">' + esc(ini(c.name)) + '</span>' + esc(c.name) + '</div></td>' +
      '<td>' + esc(c.phone) + '</td>' +
      '<td>' + esc(c.idNum || '') + '</td>' +
      '<td>' + esc(c.pkg || '') + '</td>' +
      '<td>' + esc(c.agent || '') + '</td>' +
      '<td>' + esc(c.date || '') + '</td>' +
      '<td>' +
        '<button class="btn-edit" onclick="editNewCustomer(\'' + esc(c.id) + '\')"><i class="fas fa-edit"></i></button>' +
        '<button class="btn-delete" onclick="deleteNewCustomer(\'' + esc(c.id) + '\')"><i class="fas fa-trash"></i></button>' +
      '</td>' +
      '</tr>';
  }).join('');
}

function submitTopUp(e) {
  e.preventDefault();
  const editId = rv('tu-edit-id');
  const obj = {
    id: editId || uid(),
    name: rv('tu-name'), phone: rv('tu-phone'), amount: parseFloat(rv('tu-amount')) || 0,
    agent: rv('tu-agent'), branch: rv('tu-branch'), date: rv('tu-date')
  };
  if (!obj.name) return showToast('Please enter customer name', 'error');
  if (editId) {
    const idx = topUpList.findIndex(function(x) { return x.id === editId; });
    if (idx >= 0) topUpList[idx] = obj;
  } else {
    topUpList.push(obj);
  }
  closeModal('modal-topUp');
  renderTopUpTable();
}

function editTopUp(id) {
  const item = topUpList.find(function(x) { return x.id === id; });
  if (item) openCustomerModal('topup', item);
}

function deleteTopUp(id) {
  if (!confirm('Delete this top up record?')) return;
  topUpList = topUpList.filter(function(x) { return x.id !== id; });
  renderTopUpTable();
}

function renderTopUpTable() {
  const tbody = g('topup-table');
  if (!tbody) return;
  if (!topUpList.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-coins"></i><br>No top up records yet</td></tr>';
    return;
  }
  tbody.innerHTML = topUpList.map(function(c, i) {
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td><div class="name-cell"><span class="avatar av-' + (i % 8) + '">' + esc(ini(c.name)) + '</span>' + esc(c.name) + '</div></td>' +
      '<td>' + esc(c.phone) + '</td>' +
      '<td>' + fmtMoney(c.amount) + '</td>' +
      '<td>' + esc(c.agent || '') + '</td>' +
      '<td>' + esc(c.date || '') + '</td>' +
      '<td>' +
        '<button class="btn-edit" onclick="editTopUp(\'' + esc(c.id) + '\')"><i class="fas fa-edit"></i></button>' +
        '<button class="btn-delete" onclick="deleteTopUp(\'' + esc(c.id) + '\')"><i class="fas fa-trash"></i></button>' +
      '</td>' +
      '</tr>';
  }).join('');
}

function submitTermination(e) {
  e.preventDefault();
  const editId = rv('term-edit-id');
  const obj = {
    id: editId || uid(),
    name: rv('term-name'), phone: rv('term-phone'), reason: rv('term-reason'),
    agent: rv('term-agent'), branch: rv('term-branch'), date: rv('term-date')
  };
  if (!obj.name) return showToast('Please enter customer name', 'error');
  if (editId) {
    const idx = terminationList.findIndex(function(x) { return x.id === editId; });
    if (idx >= 0) terminationList[idx] = obj;
  } else {
    terminationList.push(obj);
  }
  closeModal('modal-termination');
  renderTerminationTable();
}

function editTermination(id) {
  const item = terminationList.find(function(x) { return x.id === id; });
  if (item) openCustomerModal('termination', item);
}

function deleteTermination(id) {
  if (!confirm('Delete this termination record?')) return;
  terminationList = terminationList.filter(function(x) { return x.id !== id; });
  renderTerminationTable();
}

function renderTerminationTable() {
  const tbody = g('termination-table');
  if (!tbody) return;
  if (!terminationList.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-times-circle"></i><br>No termination records yet</td></tr>';
    return;
  }
  tbody.innerHTML = terminationList.map(function(c, i) {
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td><div class="name-cell"><span class="avatar av-' + (i % 8) + '">' + esc(ini(c.name)) + '</span>' + esc(c.name) + '</div></td>' +
      '<td>' + esc(c.phone) + '</td>' +
      '<td>' + esc(c.reason || '') + '</td>' +
      '<td>' + esc(c.agent || '') + '</td>' +
      '<td>' + esc(c.date || '') + '</td>' +
      '<td>' +
        '<button class="btn-edit" onclick="editTermination(\'' + esc(c.id) + '\')"><i class="fas fa-edit"></i></button>' +
        '<button class="btn-delete" onclick="deleteTermination(\'' + esc(c.id) + '\')"><i class="fas fa-trash"></i></button>' +
      '</td>' +
      '</tr>';
  }).join('');
}

// ------------------------------------------------------------
// Staff Functions
// ------------------------------------------------------------
function openUserModal(user) {
  const form = g('form-addUser');
  if (form) form.reset();
  g('user-edit-id').value = '';
  const title = g('modal-addUser-title');
  const btn = g('modal-addUser-submit');

  if (user) {
    if (title) title.textContent = 'Edit User';
    if (btn) btn.textContent = 'Update User';
    g('user-edit-id').value = user.id;
    g('user-name').value = user.name || '';
    g('user-username').value = user.username || '';
    g('user-password').value = user.password || '';
    g('user-role').value = user.role || 'User';
    g('user-branch').value = user.branch || '';
    g('user-status').value = user.status || 'active';
  } else {
    if (title) title.textContent = 'Add User';
    if (btn) btn.textContent = 'Add User';
  }
  openModal('modal-addUser');
}

function submitUser(e) {
  e.preventDefault();
  const editId = rv('user-edit-id');
  const obj = {
    id: editId || uid(),
    name: rv('user-name'), username: rv('user-username'), password: rv('user-password'),
    role: rv('user-role'), branch: rv('user-branch'), status: rv('user-status')
  };
  if (!obj.name) return showToast('Please enter user name', 'error');
  if (!obj.username) return showToast('Please enter username', 'error');
  if (editId) {
    const idx = staffList.findIndex(function(x) { return x.id === editId; });
    if (idx >= 0) staffList[idx] = obj;
  } else {
    staffList.push(obj);
  }
  closeModal('modal-addUser');
  renderStaffTable();
}

function editUser(id) {
  const user = staffList.find(function(x) { return x.id === id; });
  if (user) openUserModal(user);
}

function deleteUser(id) {
  if (!confirm('Delete this user?')) return;
  staffList = staffList.filter(function(x) { return x.id !== id; });
  renderStaffTable();
}

function renderStaffTable() {
  const tbody = g('staff-table');
  if (!tbody) return;
  if (!staffList.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-users-cog"></i><br>No users yet</td></tr>';
    return;
  }
  tbody.innerHTML = staffList.map(function(u, i) {
    const rolePill = u.role === 'Admin' ? 'pill-green' : u.role === 'Supervisor' ? 'pill-blue' : 'pill-gray';
    const statusPill = u.status === 'active' ? 'pill-green' : 'pill-red';
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td><div class="name-cell"><span class="avatar av-' + (i % 8) + '">' + esc(ini(u.name)) + '</span>' + esc(u.name) + '</div></td>' +
      '<td>' + esc(u.username) + '</td>' +
      '<td><span class="' + rolePill + ' pill">' + esc(u.role) + '</span></td>' +
      '<td>' + esc(u.branch || '') + '</td>' +
      '<td><span class="' + statusPill + ' pill">' + esc(u.status) + '</span></td>' +
      '<td>' +
        '<button class="btn-edit" onclick="editUser(\'' + esc(u.id) + '\')"><i class="fas fa-edit"></i></button>' +
        '<button class="btn-delete" onclick="deleteUser(\'' + esc(u.id) + '\')"><i class="fas fa-trash"></i></button>' +
      '</td>' +
      '</tr>';
  }).join('');
}

// ------------------------------------------------------------
// KPI Functions
// ------------------------------------------------------------
function openKpiModal(item) {
  const form = g('form-kpi');
  if (form) form.reset();
  g('kpi-edit-id').value = '';
  kpiTypeSelected = 'Sales';
  setValueMode('unit');

  const title = g('modal-kpi-title');
  const btn = g('modal-kpi-submit');

  $$('.kpi-type-chip').forEach(function(c) { c.classList.remove('active'); });
  const firstChip = g('kpi-chip-Sales');
  if (firstChip) firstChip.classList.add('active');

  if (item) {
    if (title) title.textContent = 'Edit KPI';
    if (btn) btn.textContent = 'Update KPI';
    g('kpi-edit-id').value = item.id;
    g('kpi-name').value = item.name || '';
    g('kpi-target').value = item.target || '';
    g('kpi-period').value = item.period || 'Monthly';

    kpiTypeSelected = item.type || 'Sales';
    $$('.kpi-type-chip').forEach(function(c) { c.classList.remove('active'); });
    const chip = g('kpi-chip-' + kpiTypeSelected);
    if (chip) chip.classList.add('active');

    setValueMode(item.valueMode || 'unit');
    if (item.valueMode === 'unit') {
      g('kpi-unit-val').value = item.unit || '';
    } else {
      g('kpi-currency-sel').value = item.currency || 'USD';
    }
  } else {
    if (title) title.textContent = 'Add KPI';
    if (btn) btn.textContent = 'Add KPI';
  }
  openModal('modal-kpi');
}

function selectKpiType(el) {
  const type = el ? el.getAttribute('data-value') : 'Sales';
  kpiTypeSelected = type;
  $$('.kpi-type-chip').forEach(function(c) { c.classList.remove('active'); });
  if (el) el.classList.add('active');
}

function setValueMode(mode) {
  kpiValueMode = mode;
  const unitField = g('kpi-unit-field');
  const curField = g('kpi-currency-field');
  const unitToggle = g('kpi-unit-toggle');
  const curToggle = g('kpi-currency-toggle');

  if (mode === 'unit') {
    if (unitField) unitField.style.display = '';
    if (curField) curField.style.display = 'none';
    if (unitToggle) unitToggle.classList.add('active');
    if (curToggle) curToggle.classList.remove('active');
  } else {
    if (unitField) unitField.style.display = 'none';
    if (curField) curField.style.display = '';
    if (unitToggle) unitToggle.classList.remove('active');
    if (curToggle) curToggle.classList.add('active');
  }
}

function submitKpi(e) {
  e.preventDefault();
  const editId = rv('kpi-edit-id');
  const obj = {
    id: editId || uid(),
    name: rv('kpi-name'),
    type: kpiTypeSelected,
    target: parseFloat(rv('kpi-target')) || 0,
    valueMode: kpiValueMode,
    unit: kpiValueMode === 'unit' ? rv('kpi-unit-val') : '',
    currency: kpiValueMode === 'currency' ? rv('kpi-currency-sel') : '',
    period: rv('kpi-period')
  };
  if (!obj.name) return showToast('Please enter KPI name', 'error');
  if (editId) {
    const idx = kpiList.findIndex(function(x) { return x.id === editId; });
    if (idx >= 0) kpiList[idx] = obj;
  } else {
    kpiList.push(obj);
  }
  closeModal('modal-kpi');
  renderKpiTable();
}

function editKpi(id) {
  const item = kpiList.find(function(x) { return x.id === id; });
  if (item) openKpiModal(item);
}

function deleteKpi(id) {
  if (!confirm('Delete this KPI?')) return;
  kpiList = kpiList.filter(function(x) { return x.id !== id; });
  renderKpiTable();
}

function renderKpiTable() {
  const tbody = g('kpi-table');
  if (!tbody) return;
  if (!kpiList.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><i class="fas fa-chart-line"></i><br>No KPIs defined yet</td></tr>';
    return;
  }
  tbody.innerHTML = kpiList.map(function(k, i) {
    const typePill = k.type === 'Sales' ? 'pill-green' : k.type === 'Revenue' ? 'pill-orange' : k.type === 'Units' ? 'pill-blue' : 'pill-purple';
    const valueDisplay = k.valueMode === 'currency'
      ? fmtMoney(k.target, esc(k.currency) + ' ')
      : k.target + ' ' + esc(k.unit || '');
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + esc(k.name) + '</td>' +
      '<td><span class="' + typePill + ' pill">' + esc(k.type) + '</span></td>' +
      '<td>' + valueDisplay + '</td>' +
      '<td>' + esc(k.period || '') + '</td>' +
      '<td>' +
        '<button class="btn-edit" onclick="editKpi(\'' + esc(k.id) + '\')"><i class="fas fa-edit"></i></button>' +
        '<button class="btn-delete" onclick="deleteKpi(\'' + esc(k.id) + '\')"><i class="fas fa-trash"></i></button>' +
      '</td>' +
      '</tr>';
  }).join('');
}

// ------------------------------------------------------------
// Promotion Functions (Stub)
// ------------------------------------------------------------
function renderPromotionTable() {
  const tbody = g('promotion-table');
  if (!tbody) return;
  if (!promotionList.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-tag"></i><br>No promotions yet</td></tr>';
    return;
  }
  tbody.innerHTML = promotionList.map(function(p, i) {
    const statusPill = p.status === 'Active' ? 'pill-green' : 'pill-gray';
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + esc(p.name) + '</td>' +
      '<td>—</td>' +
      '<td>' + esc(p.start || '') + '</td>' +
      '<td>' + esc(p.end || '') + '</td>' +
      '<td><span class="' + statusPill + ' pill">' + esc(p.status) + '</span></td>' +
      '<td>' +
        '<button class="btn-delete" onclick="deletePromotion(\'' + esc(p.id) + '\')"><i class="fas fa-trash"></i></button>' +
      '</td>' +
      '</tr>';
  }).join('');
}

function submitPromotion(e) {
  e.preventDefault();
  const obj = {
    id: uid(),
    name: rv('promo-name'),
    start: rv('promo-start'),
    end: rv('promo-end'),
    status: rv('promo-status')
  };
  if (!obj.name) return showToast('Please enter promotion name', 'error');
  promotionList.push(obj);
  closeModal('modal-addPromotion');
  renderPromotionTable();
  showToast('Promotion added', 'success');
}

function deletePromotion(id) {
  if (!confirm('Delete this promotion?')) return;
  promotionList = promotionList.filter(function(x) { return x.id !== id; });
  renderPromotionTable();
}

// ------------------------------------------------------------
// Deposit Functions (Stub)
// ------------------------------------------------------------
function renderDepositTable() {
  const tbody = g('deposit-table');
  if (!tbody) return;
  if (!depositList.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-piggy-bank"></i><br>No deposits yet</td></tr>';
    return;
  }
  tbody.innerHTML = depositList.map(function(d, i) {
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + esc(d.agent || '') + '</td>' +
      '<td>' + esc(d.branch || '') + '</td>' +
      '<td>' + fmtMoney(d.amount || 0) + '</td>' +
      '<td>' + esc(d.date || '') + '</td>' +
      '<td>' + esc(d.note || '') + '</td>' +
      '<td>' +
        '<button class="btn-delete" onclick="deleteDeposit(\'' + esc(d.id) + '\')"><i class="fas fa-trash"></i></button>' +
      '</td>' +
      '</tr>';
  }).join('');
}

function submitDeposit(e) {
  e.preventDefault();
  const obj = {
    id: uid(),
    agent: rv('deposit-agent'),
    branch: rv('deposit-branch'),
    amount: parseFloat(rv('deposit-amount')) || 0,
    date: rv('deposit-date'),
    note: rv('deposit-note')
  };
  if (!obj.agent) return showToast('Please enter agent name', 'error');
  depositList.push(obj);
  closeModal('modal-addDeposit');
  renderDepositTable();
  showToast('Deposit added', 'success');
}

function deleteDeposit(id) {
  if (!confirm('Delete this deposit?')) return;
  depositList = depositList.filter(function(x) { return x.id !== id; });
  renderDepositTable();
}

// ------------------------------------------------------------
// Init
// ------------------------------------------------------------
// ------------------------------------------------------------
// Compatibility aliases (HTML uses these names)
// ------------------------------------------------------------
function applySaleFilters() { applyReportFilters(); }
function clearSaleFilters() { clearReportFilters(); }
function loadDashboard() { renderDashboard(); }
function selectKpiMode(mode) { setValueMode(mode); }
function submitKPI(e) { submitKpi(e); }
function switchSaleView(view) { setReportView(view); }
function togglePasswordVisibility(inputId, eyeId) { togglePwd(inputId, eyeId); }
function toggleSidebar() {
  const sidebar = g('sidebar');
  if (sidebar) sidebar.classList.toggle('sidebar-collapsed');
}

document.addEventListener('DOMContentLoaded', function() {
  filteredSales = saleRecords.slice();

  populateBranchDropdowns();
  populateSaleFilterDropdowns();

  navigateTo('dashboard', null);

  renderItemChips();
  renderNewCustomerTable();
  renderTopUpTable();
  renderTerminationTable();
  renderStaffTable();
  renderKpiTable();
  renderPromotionTable();
  renderDepositTable();

  renderSaleTable();
  updateSaleKpis();

  switchRole('admin');
});
