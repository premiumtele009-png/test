// ============================================================
// Smart 5G Dashboard — app.js
// ============================================================

// ------------------------------------------------------------
// State & Constants
// ------------------------------------------------------------
let currentRole = 'admin'; // 'admin', 'supervisor', 'user'
let currentUser = null;
let currentPage = 'dashboard';
let currentSaleTab = 'report';
let currentCustomerTab = 'new-customer';
let currentSettingsTab = 'permission';
let currentReportView = 'table'; // 'table' or 'summary'
let filteredSales = [];
let itemGroupSelected = 'unit'; // 'unit' or 'dollar'
let kpiValueMode = 'unit'; // 'unit' or 'currency'
let kpiTypeSelected = 'Sales';
let kpiForSelected = 'shop'; // 'shop' or 'agent'

// Chart instances
let _cTrend = null, _cMix = null, _cAgent = null, _cGrowth = null;
let _cSaleMix = null, _cSaleAgent = null;

// Constants
const TAB_PERM = { admin: ['permission','kpi','promo'], supervisor: ['kpi'], user: [] };
const TAB_LBL = { permission: 'Permission', kpi: 'KPI Setting', promo: 'Promotion' };
const AV_COLORS = ['#E53935','#8E24AA','#1565C0','#00838F','#2E7D32','#F57F17','#4E342E','#37474F'];
const CHART_PAL = ['#1B7D3D','#2196F3','#FF9800','#9C27B0','#F44336','#00BCD4','#FFEB3B','#795548'];
const KNOWN_CURS = ['USD','KHR','THB','VND'];
const KNOWN_UNITS = ['Unit','SIM','GB','MB','Minutes','SMS','Voucher'];

const BRANCHES = ['Phnom Penh', 'Siem Reap', 'Battambang', 'Sihanoukville', 'Kampong Cham'];

// ------------------------------------------------------------
// Sample Data
// ------------------------------------------------------------
let itemCatalogue = [
  { id: 'i1', name: 'SIM Card', shortcut: 'SIM', group: 'unit', unit: 'Unit', category: 'Prepaid', status: 'active', desc: 'Prepaid SIM card' },
  { id: 'i2', name: 'Data 5GB', shortcut: 'D5', group: 'unit', unit: 'GB', category: 'Data', status: 'active', desc: 'Data package 5GB' },
  { id: 'i3', name: 'Top Up USD', shortcut: 'TU', group: 'dollar', currency: 'USD', price: 10, category: 'Prepaid', status: 'active', desc: 'Top up USD' },
];

let saleRecords = [];

let newCustomers = [];

let topUpList = [];

let terminationList = [];

let staffList = [
  { id: 'u1', name: 'Admin', username: 'admin', password: 'admin@2026', role: 'Admin', branch: 'Phnom Penh', status: 'active' },
];

let kpiList = [];

let promotionList = [];

let depositList = [];

let notifications = [];

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

function showToast(message, type) {
  var toast = document.createElement('div');
  var bg = (type === 'success') ? '#1B7D3D' : (type === 'error') ? '#C62828' : '#333';
  toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:' + bg + ';color:#fff;padding:12px 20px;border-radius:10px;font-size:.875rem;font-weight:500;box-shadow:0 4px 16px rgba(0,0,0,.2);z-index:10000;opacity:0;transition:opacity .25s;max-width:320px;';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function() { toast.style.opacity = '1'; }, 10);
  setTimeout(function() { toast.style.opacity = '0'; setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300); }, 3000);
}

// Populate branch dropdowns
function populateBranchSelects() {
  const branchSelectIds = ['sale-branch', 'nc-branch', 'tu-branch', 'term-branch', 'dep-branch'];
  branchSelectIds.forEach(function(id) {
    const sel = g(id);
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">Select branch</option>' +
      BRANCHES.map(function(b) { return '<option value="' + esc(b) + '"' + (current === b ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('');
  });
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
    el.innerHTML = '<i class="fas fa-arrow-down"></i> ' + Math.abs(pct) + '%';
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
  }

  const titles = {
    dashboard: 'Dashboard',
    promotionPage: 'Promotion',
    deposit: 'Deposit',
    sale: 'Sale',
    customer: 'Customer',
    settings: 'Settings',
    permission: 'Permission',
    kpiSetting: 'KPI Setting',
    promoSetting: 'Promotion Setting'
  };
  const titleEl = g('page-title');
  if (titleEl) titleEl.textContent = titles[page] || page;

  populateBranchSelects();

  if (page === 'dashboard') renderDashboard();
  if (page === 'promotionPage') renderPromotionCards();
  if (page === 'deposit') { renderDepositTable(); updateDepositKpis(); }
  if (page === 'sale') { renderItemChips(); renderSaleTable(); updateSaleKpis(); }
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
  if (page === 'permission') {
    renderStaffTable();
    var banner = g('settings-contact-banner');
    if (banner) banner.style.display = (currentRole !== 'admin') ? '' : 'none';
    var addBtn = g('perm-add-user-btn');
    if (addBtn) addBtn.style.display = currentRole === 'admin' ? '' : 'none';
  }
  if (page === 'kpiSetting') renderKpiTable();
  if (page === 'promoSetting') renderPromoSettingTable();
}

function toggleSubmenu(id, elOrId) {
  const sub = g(id);
  if (!sub) return;
  const isOpen = sub.classList.contains('open');
  $$('.submenu').forEach(function(s) { s.classList.remove('open'); });
  $$('.has-submenu').forEach(function(li) { li.classList.remove('submenu-open'); });
  if (!isOpen) {
    sub.classList.add('open');
    const li = typeof elOrId === 'string' ? g(elOrId) : (elOrId && elOrId.closest ? elOrId.closest('.has-submenu') : null);
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
  $$('.tab-content').forEach(function(c) { c.classList.remove('active'); });
  // Update tab button states
  $$('.tab-btn').forEach(function(b) {
    if (b.getAttribute('data-tab') === tab) b.classList.add('active');
    else if (['new-customer','topup','termination'].includes(b.getAttribute('data-tab'))) b.classList.remove('active');
  });
  const tc = g('tab-content-' + tab);
  if (tc) tc.classList.add('active');
}

function openSettingsTab(tab, btn) {
  switchSettingsTab(tab);
}

function switchSettingsTab(tab) {
  // Settings tabs are now separate pages; use navigateTo instead
  const pageMap = { permission: 'permission', kpi: 'kpiSetting', promo: 'promoSetting' };
  if (pageMap[tab]) navigateTo(pageMap[tab], null);
}

function renderAccessContent(tab) {
  // No longer needed for tab display; kept for compatibility
  var banner = g('settings-contact-banner');
  if (banner) banner.style.display = (currentRole !== 'admin') ? '' : 'none';
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
  if (rb) { const lbl = rb.querySelector('#role-widget-label'); if (lbl) lbl.textContent = roleBadges[role]; }

  const wd = g('role-widget-dropdown');
  if (wd) wd.style.display = 'none';

  var banner = g('settings-contact-banner');
  if (banner) banner.style.display = (role !== 'admin') ? '' : 'none';

  var addBtn = g('perm-add-user-btn');
  if (addBtn) addBtn.style.display = role === 'admin' ? '' : 'none';

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
  populateBranchSelects();
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
  else if (type === 'promotion') openPromotionModal();
  else if (type === 'deposit') openDepositModal();
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
  const btn = g('item-submit-btn');

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
      if (unitSel) {
        if (KNOWN_UNITS.includes(item.unit)) {
          unitSel.value = item.unit;
        } else {
          unitSel.value = 'custom';
          const cu = g('item-custom-unit');
          if (cu) { cu.value = item.unit || ''; cu.style.display = ''; }
        }
      }
    } else {
      const curSel = g('item-currency');
      if (curSel) {
        if (KNOWN_CURS.includes(item.currency)) {
          curSel.value = item.currency;
        } else {
          curSel.value = 'custom';
          const cc = g('item-custom-currency');
          if (cc) { cc.value = item.currency || ''; cc.style.display = ''; }
        }
      }
      const priceEl = g('item-price');
      if (priceEl) priceEl.value = item.price || '';
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
  const inp = g('item-custom-currency');
  if (!inp) return;
  inp.style.display = sel && sel.value === 'custom' ? '' : 'none';
}

function handleUnitSelectChange() {
  const sel = g('item-unit');
  const inp = g('item-custom-unit');
  if (!inp) return;
  inp.style.display = sel && sel.value === 'custom' ? '' : 'none';
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

  if (!name) return alert('Please enter item name');

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
  if (currentPage === 'dashboard') renderDashboard();
}

function editItem(id) {
  const item = itemCatalogue.find(function(x) { return x.id === id; });
  if (item) openItemModal(item);
}

function deleteItem(id) {
  if (!confirm('Delete this item?')) return;
  itemCatalogue = itemCatalogue.filter(function(x) { return x.id !== id; });
  renderItemChips();
  if (currentPage === 'dashboard') renderDashboard();
}

function renderItemChips() {
  const strip = g('items-strip');
  if (!strip) return;
  const active = itemCatalogue.filter(function(x) { return x.status === 'active'; });
  if (!active.length) {
    strip.innerHTML = '<span style="color:#999;font-size:0.85rem;">No items in catalogue. <a href="#" onclick="openAddModal(\'item\');return false;">Add Item</a></span>';
    return;
  }
  strip.innerHTML = active.map(function(item) {
    const chipClass = item.group === 'unit' ? 'item-chip-unit' : 'item-chip-dollar';
    const iconClass = item.group === 'unit' ? 'fa-box' : 'fa-dollar-sign';
    return '<span class="item-chip ' + chipClass + '" onclick="editItem(\'' + esc(item.id) + '\')" title="' + esc(item.name) + '">' +
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
  const btn = g('sale-submit-btn');

  const unitItems = itemCatalogue.filter(function(x) { return x.group === 'unit' && x.status === 'active'; });
  const dollarItems = itemCatalogue.filter(function(x) { return x.group === 'dollar' && x.status === 'active'; });

  const unitContainer = g('sale-unit-items');
  const dollarContainer = g('sale-dollar-items');

  if (unitContainer) {
    if (unitItems.length) {
      unitContainer.innerHTML = '<div class="sale-items-grid">' + unitItems.map(function(item) {
        return '<div class="sic-card sic-card-unit">' +
          '<div class="sic-label">' + esc(item.name) + '</div>' +
          '<div style="font-size:0.72rem;color:#888;">' + esc(item.unit) + '</div>' +
          '<input type="number" class="sic-input" id="sic-' + esc(item.id) + '" min="0" value="" placeholder="0" oninput="updateSaleModalTotals()">' +
          '</div>';
      }).join('') + '</div>';
    } else {
      unitContainer.innerHTML = '<p style="color:#999;font-size:0.85rem;">No unit items in catalogue.</p>';
    }
  }

  if (dollarContainer) {
    if (dollarItems.length) {
      dollarContainer.innerHTML = '<div class="sale-items-grid">' + dollarItems.map(function(item) {
        return '<div class="sic-card sic-card-dollar">' +
          '<div class="sic-label">' + esc(item.name) + '</div>' +
          '<div style="font-size:0.72rem;color:#888;">' + esc(item.currency) + ' ' + esc(String(item.price)) + '</div>' +
          '<input type="number" class="sic-input" id="sic-' + esc(item.id) + '" min="0" step="0.01" value="" placeholder="0" oninput="updateSaleModalTotals()">' +
          '</div>';
      }).join('') + '</div>';
    } else {
      dollarContainer.innerHTML = '<p style="color:#999;font-size:0.85rem;">No dollar items in catalogue.</p>';
    }
  }

  populateBranchSelects();

  if (sale) {
    if (title) title.textContent = 'Edit Sale';
    if (btn) btn.textContent = 'Update Sale';
    g('sale-edit-id').value = sale.id;
    g('sale-agent-name').value = sale.agent || '';
    const brSel = g('sale-branch');
    if (brSel) brSel.value = sale.branch || '';
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

  if (!agent) return alert('Please enter agent name');
  if (!date) return alert('Please select date');

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
    addNotification((currentUser ? currentUser.name : 'User') + ' updated a sale record.');
  } else {
    saleRecords.push(obj);
    addNotification((currentUser ? currentUser.name : 'User') + ' added a new sale record.');
  }

  closeModal('modal-newSale');
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
  const btn = g('btn-view-' + view);
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
    renderSummaryView(filteredSales.length ? filteredSales : saleRecords, unitItems, dollarItems);
    renderSaleCharts();
  }
}

function updateSaleKpis() {
  const data = filteredSales.length ? filteredSales : saleRecords;
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

  const el1 = g('sale-kpi-sales'); if (el1) el1.textContent = data.length;
  const el2 = g('sale-kpi-units'); if (el2) el2.textContent = totalUnits;
  const el3 = g('sale-kpi-revenue'); if (el3) el3.textContent = fmtMoney(totalRev);
  const el4 = g('sale-kpi-agents'); if (el4) el4.textContent = agents.size;
  // Also update the KPI cards on the sale page
  const s1 = g('sale-kv-sales'); if (s1) s1.textContent = data.length;
  const s2 = g('sale-kv-units'); if (s2) s2.textContent = totalUnits;
  const s3 = g('sale-kv-revenue'); if (s3) s3.textContent = fmtMoney(totalRev);
  const s4 = g('sale-kv-agents'); if (s4) s4.textContent = agents.size;
}

function renderSaleTable() {
  const table = g('sale-table');
  if (!table) return;

  // Populate filter dropdowns
  const agentFilter = g('sale-filter-agent');
  const branchFilter = g('sale-filter-branch');
  if (agentFilter) {
    const agents = [...new Set(saleRecords.map(function(s) { return s.agent; }))];
    const curAgent = agentFilter.value;
    agentFilter.innerHTML = '<option value="">All Agents</option>' +
      agents.map(function(a) { return '<option value="' + esc(a) + '"' + (curAgent === a ? ' selected' : '') + '>' + esc(a) + '</option>'; }).join('');
  }
  if (branchFilter) {
    const branches = [...new Set(saleRecords.map(function(s) { return s.branch; }))];
    const curBranch = branchFilter.value;
    branchFilter.innerHTML = '<option value="">All Branches</option>' +
      branches.map(function(b) { return '<option value="' + esc(b) + '"' + (curBranch === b ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('');
  }

  const actualData = filteredSales.length ? filteredSales : (filteredSales === saleRecords ? saleRecords : filteredSales);
  const data = filteredSales;
  const unitItems = itemCatalogue.filter(function(x) { return x.group === 'unit' && x.status === 'active'; });
  const dollarItems = itemCatalogue.filter(function(x) { return x.group === 'dollar' && x.status === 'active'; });

  if (!data.length) {
    table.innerHTML = '<tr><td colspan="20" style="text-align:center;padding:40px;color:#999;"><i class="fas fa-inbox" style="font-size:2rem;display:block;margin-bottom:8px;"></i>No records found</td></tr>';
    updateTotalBar(0, 0);
    return;
  }

  let headerRow1 = '<tr><th rowspan="2">Agent</th><th rowspan="2">Branch</th><th rowspan="2">Date</th>';
  if (unitItems.length) headerRow1 += '<th colspan="' + unitItems.length + '" class="th-group-unit">Unit Group</th>';
  if (dollarItems.length) headerRow1 += '<th colspan="' + dollarItems.length + '" class="th-group-dollar">Dollar Group</th>';
  headerRow1 += '<th rowspan="2" class="td-revenue">Revenue</th><th rowspan="2">Note</th><th rowspan="2">Actions</th></tr>';

  let headerRow2 = '<tr>';
  unitItems.forEach(function(item) { headerRow2 += '<th class="th-unit">' + esc(item.shortcut || item.name) + '</th>'; });
  dollarItems.forEach(function(item) { headerRow2 += '<th class="th-dollar">' + esc(item.shortcut || item.name) + '</th>'; });
  headerRow2 += '</tr>';

  let totalUnits = 0, totalRev = 0;

  const bodyRows = data.map(function(s) {
    let saleRev = 0;
    const unitCells = unitItems.map(function(item) {
      const qty = s.items && s.items[item.id] ? s.items[item.id] : 0;
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

    const avIdx = Math.abs((s.agent.charCodeAt(0) || 0)) % 8;
    return '<tr>' +
      '<td><div class="name-cell"><span class="avatar-circle av-' + avIdx + '" style="width:30px;height:30px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;color:#fff;background:#1B7D3D;margin-right:8px;">' + esc(ini(s.agent)) + '</span>' + esc(s.agent) + '</div></td>' +
      '<td>' + esc(s.branch) + '</td>' +
      '<td>' + esc(s.date) + '</td>' +
      unitCells +
      dollarCells +
      '<td class="td-revenue">' + fmtMoney(saleRev) + '</td>' +
      '<td style="color:#888;font-size:0.8rem;">' + esc(s.note || '') + '</td>' +
      '<td style="white-space:nowrap;">' +
        '<button class="btn-edit" onclick="editSale(\'' + esc(s.id) + '\')"><i class="fas fa-edit"></i></button> ' +
        '<button class="btn-delete" onclick="deleteSale(\'' + esc(s.id) + '\')"><i class="fas fa-trash"></i></button>' +
      '</td>' +
      '</tr>';
  }).join('');

  const thead = table.querySelector('thead') || document.createElement('thead');
  const tbody = table.querySelector('tbody') || document.createElement('tbody');
  thead.innerHTML = headerRow1 + headerRow2;
  tbody.innerHTML = bodyRows;
  if (!table.querySelector('thead')) table.appendChild(thead);
  if (!table.querySelector('tbody')) table.appendChild(tbody);

  updateTotalBar(totalUnits, totalRev);
}

function updateTotalBar(units, rev) {
  const bar = g('sale-total-bar');
  if (!bar) return;
  bar.innerHTML =
    '<span class="total-label"><strong>Total Units:</strong> ' + units + '</span>' +
    '<span class="total-label" style="margin-left:20px;"><strong>Total Revenue:</strong> ' + fmtMoney(rev) + '</span>';
}

function renderSummaryView(data, unitItems, dollarItems) {
  const container = g('sale-summary-view');
  if (!container) return;

  if (!data.length) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;"><i class="fas fa-inbox fa-3x" style="display:block;margin-bottom:12px;"></i>No records found</div>';
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
      return qty ? '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f0f0f0;font-size:0.8125rem;"><span>' + esc(item.name) + '</span><span style="font-weight:600;color:#1B7D3D;">' + qty + '</span></div>' : '';
    }).join('');
    const dollarRows = dollarItems.map(function(item) {
      const amt = ag.dollars[item.id] || 0;
      return amt ? '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f0f0f0;font-size:0.8125rem;"><span>' + esc(item.name) + '</span><span style="font-weight:600;color:#E65100;">' + fmtMoney(amt, esc(item.currency) + ' ') + '</span></div>' : '';
    }).join('');
    return '<div class="summary-card">' +
      '<div class="summary-card-header">' +
        '<span class="sc-avatar av-' + (idx % 8) + '">' + esc(ini(agent)) + '</span>' +
        '<div><div class="sc-name">' + esc(agent) + '</div><div style="font-size:0.72rem;opacity:0.8;">Units: ' + ag.totalUnits + ' | Rev: ' + fmtMoney(ag.totalRev) + '</div></div>' +
      '</div>' +
      '<div class="summary-card-body">' + (unitRows + dollarRows || '<div style="color:#999;font-size:0.8rem;">No sales</div>') + '</div>' +
      '</div>';
  }).join('');

  const chartRow = '<div class="chart-row" style="margin-top:20px;">' +
    '<div class="chart-card"><div class="chart-card-header"><span class="chart-card-title">Sales by Item</span></div><div class="chart-card-body"><canvas id="cSaleMix"></canvas></div></div>' +
    '<div class="chart-card"><div class="chart-card-header"><span class="chart-card-title">Sales by Agent</span></div><div class="chart-card-body"><canvas id="cSaleAgent"></canvas></div></div>' +
    '</div>';

  container.innerHTML = '<div class="summary-grid">' + cards + '</div>' + chartRow;
  setTimeout(renderSaleCharts, 50);
}

function renderSaleCharts() {
  _cSaleMix = destroyChart(_cSaleMix);
  _cSaleAgent = destroyChart(_cSaleAgent);

  const data = filteredSales.length ? filteredSales : saleRecords;
  const unitItems = itemCatalogue.filter(function(x) { return x.group === 'unit' && x.status === 'active'; });

  const mixLabels = unitItems.map(function(x) { return x.name; });
  const mixData = unitItems.map(function(item) {
    let t = 0; data.forEach(function(s) { t += (s.items && s.items[item.id]) ? s.items[item.id] : 0; }); return t;
  });

  const mixCtx = g('cSaleMix');
  if (mixCtx && typeof Chart !== 'undefined' && mixData.some(function(v) { return v > 0; })) {
    _cSaleMix = new Chart(mixCtx, {
      type: 'doughnut',
      data: { labels: mixLabels, datasets: [{ data: mixData, backgroundColor: CHART_PAL }] },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
  }

  const agentMap = {};
  data.forEach(function(s) {
    if (!agentMap[s.agent]) agentMap[s.agent] = 0;
    Object.values(s.items || {}).forEach(function(v) { agentMap[s.agent] += v; });
  });
  const agentLabels = Object.keys(agentMap);
  const agentVals = agentLabels.map(function(a) { return agentMap[a]; });

  const agCtx = g('cSaleAgent');
  if (agCtx && typeof Chart !== 'undefined' && agentLabels.length) {
    _cSaleAgent = new Chart(agCtx, {
      type: 'bar',
      data: { labels: agentLabels, datasets: [{ label: 'Units', data: agentVals, backgroundColor: CHART_PAL }] },
      options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } } }
    });
  }
}

// ------------------------------------------------------------
// Dashboard
// ------------------------------------------------------------
function renderDashboard() {
  const ym = ymNow();
  const ymP = ymPrev();

  const currSales = saleRecords.filter(function(s) { return ymOf(s.date) === ym; });
  const prevSales = saleRecords.filter(function(s) { return ymOf(s.date) === ymP; });

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

  // Chart 1: Monthly Trend
  _cTrend = destroyChart(_cTrend);
  clearCanvas('cTrend');
  const months = last7Months();
  const monthLabels = months.map(ymLabel);
  const unitsPerMonth = months.map(function(m) {
    let u = 0;
    saleRecords.filter(function(s) { return ymOf(s.date) === m; }).forEach(function(s) {
      Object.values(s.items || {}).forEach(function(v) { u += v; });
    });
    return u;
  });
  const revPerMonth = months.map(function(m) {
    let r = 0;
    saleRecords.filter(function(s) { return ymOf(s.date) === m; }).forEach(function(s) {
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
    saleRecords.forEach(function(s) { total += (s.items && s.items[item.id]) ? s.items[item.id] : 0; });
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

  // Chart 3: Agent Performance
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

  // Chart 4: Growth vs Last Month
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
  const branchTableBody = g('branch-table') ? g('branch-table').querySelector('tbody') : null;
  if (branchTableBody) {
    const branches = [];
    saleRecords.forEach(function(s) { if (branches.indexOf(s.branch) < 0) branches.push(s.branch); });
    if (!branches.length) {
      branchTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#999;">No data</td></tr>';
    } else {
      branchTableBody.innerHTML = branches.map(function(branch) {
        let cU = 0, pU = 0;
        currSales.filter(function(s) { return s.branch === branch; }).forEach(function(s) {
          Object.values(s.items || {}).forEach(function(v) { cU += v; });
        });
        prevSales.filter(function(s) { return s.branch === branch; }).forEach(function(s) {
          Object.values(s.items || {}).forEach(function(v) { pU += v; });
        });
        const pct = pctChange(cU, pU);
        const trendHtml = pct === null ? '<span class="pill pill-gray">N/A</span>' :
          pct > 0 ? '<span class="pill pill-green">+' + pct + '%</span>' :
          pct < 0 ? '<span class="pill pill-red">' + pct + '%</span>' : '<span class="pill pill-gray">0%</span>';
        return '<tr><td>' + esc(branch) + '</td><td>' + cU + '</td><td>' + pU + '</td><td>' + trendHtml + '</td></tr>';
      }).join('');
    }
  }

  // Branch filter dropdown
  const branchFilter = g('dash-branch-filter');
  if (branchFilter) {
    const branches = [];
    saleRecords.forEach(function(s) { if (branches.indexOf(s.branch) < 0) branches.push(s.branch); });
    const cur = branchFilter.value;
    branchFilter.innerHTML = '<option value="">All Branches</option>' +
      branches.map(function(b) { return '<option value="' + esc(b) + '"' + (cur === b ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('');
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
    populateBranchSelects();
    if (item) {
      if (title) title.textContent = 'Edit New Customer';
      g('nc-edit-id').value = item.id;
      g('nc-name').value = item.name || '';
      g('nc-phone').value = item.phone || '';
      g('nc-id').value = item.idNum || '';
      g('nc-package').value = item.pkg || '';
      g('nc-agent').value = item.agent || '';
      const bSel = g('nc-branch'); if (bSel) bSel.value = item.branch || '';
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
    populateBranchSelects();
    if (item) {
      if (title) title.textContent = 'Edit Top Up';
      g('tu-edit-id').value = item.id;
      g('tu-name').value = item.name || '';
      g('tu-phone').value = item.phone || '';
      g('tu-amount').value = item.amount || '';
      g('tu-agent').value = item.agent || '';
      const bSel = g('tu-branch'); if (bSel) bSel.value = item.branch || '';
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
    populateBranchSelects();
    if (item) {
      if (title) title.textContent = 'Edit Termination';
      g('term-edit-id').value = item.id;
      g('term-name').value = item.name || '';
      g('term-phone').value = item.phone || '';
      g('term-reason').value = item.reason || '';
      g('term-agent').value = item.agent || '';
      const bSel = g('term-branch'); if (bSel) bSel.value = item.branch || '';
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
  if (!obj.name) return alert('Please enter customer name');
  if (editId) {
    const idx = newCustomers.findIndex(function(x) { return x.id === editId; });
    if (idx >= 0) newCustomers[idx] = obj;
    addNotification((currentUser ? currentUser.name : 'User') + ' updated a customer record.');
  } else {
    newCustomers.push(obj);
    addNotification((currentUser ? currentUser.name : 'User') + ' added a new customer.');
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
  const tbody = g('new-customer-table') ? g('new-customer-table').querySelector('tbody') : null;
  if (!tbody) return;
  if (!newCustomers.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#999;"><i class="fas fa-users" style="font-size:2rem;display:block;margin-bottom:8px;"></i>No customers yet</td></tr>';
    return;
  }
  tbody.innerHTML = newCustomers.map(function(c, i) {
    const avIdx = i % 8;
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td><div class="name-cell"><span class="avatar-circle av-' + avIdx + '" style="width:30px;height:30px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;color:#fff;margin-right:8px;">' + esc(ini(c.name)) + '</span>' + esc(c.name) + '</div></td>' +
      '<td>' + esc(c.phone) + '</td>' +
      '<td>' + esc(c.idNum || '') + '</td>' +
      '<td>' + esc(c.pkg || '') + '</td>' +
      '<td>' + esc(c.agent || '') + '</td>' +
      '<td>' + esc(c.branch || '') + '</td>' +
      '<td>' + esc(c.date || '') + '</td>' +
      '<td style="white-space:nowrap;">' +
        '<button class="btn-edit" onclick="editNewCustomer(\'' + esc(c.id) + '\')"><i class="fas fa-edit"></i></button> ' +
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
  if (!obj.name) return alert('Please enter customer name');
  if (editId) {
    const idx = topUpList.findIndex(function(x) { return x.id === editId; });
    if (idx >= 0) topUpList[idx] = obj;
    addNotification((currentUser ? currentUser.name : 'User') + ' updated a top-up record.');
  } else {
    topUpList.push(obj);
    addNotification((currentUser ? currentUser.name : 'User') + ' submitted a top-up.');
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
  const tbody = g('topup-table') ? g('topup-table').querySelector('tbody') : null;
  if (!tbody) return;
  if (!topUpList.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#999;"><i class="fas fa-coins" style="font-size:2rem;display:block;margin-bottom:8px;"></i>No top up records yet</td></tr>';
    return;
  }
  tbody.innerHTML = topUpList.map(function(c, i) {
    const avIdx = i % 8;
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td><div class="name-cell"><span class="avatar-circle av-' + avIdx + '" style="width:30px;height:30px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;color:#fff;margin-right:8px;">' + esc(ini(c.name)) + '</span>' + esc(c.name) + '</div></td>' +
      '<td>' + esc(c.phone) + '</td>' +
      '<td>' + fmtMoney(c.amount) + '</td>' +
      '<td>' + esc(c.agent || '') + '</td>' +
      '<td>' + esc(c.branch || '') + '</td>' +
      '<td>' + esc(c.date || '') + '</td>' +
      '<td style="white-space:nowrap;">' +
        '<button class="btn-edit" onclick="editTopUp(\'' + esc(c.id) + '\')"><i class="fas fa-edit"></i></button> ' +
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
  if (!obj.name) return alert('Please enter customer name');
  if (editId) {
    const idx = terminationList.findIndex(function(x) { return x.id === editId; });
    if (idx >= 0) terminationList[idx] = obj;
    addNotification((currentUser ? currentUser.name : 'User') + ' updated a termination record.');
  } else {
    terminationList.push(obj);
    addNotification((currentUser ? currentUser.name : 'User') + ' submitted a termination.');
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
  const tbody = g('termination-table') ? g('termination-table').querySelector('tbody') : null;
  if (!tbody) return;
  if (!terminationList.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#999;"><i class="fas fa-times-circle" style="font-size:2rem;display:block;margin-bottom:8px;"></i>No termination records yet</td></tr>';
    return;
  }
  tbody.innerHTML = terminationList.map(function(c, i) {
    const avIdx = i % 8;
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td><div class="name-cell"><span class="avatar-circle av-' + avIdx + '" style="width:30px;height:30px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;color:#fff;margin-right:8px;">' + esc(ini(c.name)) + '</span>' + esc(c.name) + '</div></td>' +
      '<td>' + esc(c.phone) + '</td>' +
      '<td>' + esc(c.reason || '') + '</td>' +
      '<td>' + esc(c.agent || '') + '</td>' +
      '<td>' + esc(c.branch || '') + '</td>' +
      '<td>' + esc(c.date || '') + '</td>' +
      '<td style="white-space:nowrap;">' +
        '<button class="btn-edit" onclick="editTermination(\'' + esc(c.id) + '\')"><i class="fas fa-edit"></i></button> ' +
        '<button class="btn-delete" onclick="deleteTermination(\'' + esc(c.id) + '\')"><i class="fas fa-trash"></i></button>' +
      '</td>' +
      '</tr>';
  }).join('');
}

// ------------------------------------------------------------
// Promotion Functions
// ------------------------------------------------------------
function isPromoExpired(p) {
  if (!p.endDate) return false;
  const today = new Date(new Date().toISOString().split('T')[0]);
  return new Date(p.endDate) < today;
}

function openNewPromotionModal(item) {
  const form = g('form-newPromotion');
  if (form) form.reset();
  const editEl = g('np-edit-id');
  if (editEl) editEl.value = '';
  const title = g('modal-newPromotion-title');
  const btn = g('np-submit-btn');
  if (item) {
    if (title) title.textContent = 'Edit Promotion';
    if (btn) btn.textContent = 'Update Promotion';
    if (editEl) editEl.value = item.id;
    const c = g('np-campaign'); if (c) c.value = item.campaign || '';
    const ch = g('np-channel'); if (ch) ch.value = item.channel || '';
    const s = g('np-start'); if (s) s.value = item.startDate || '';
    const e = g('np-end'); if (e) e.value = item.endDate || '';
    const t = g('np-terms'); if (t) t.value = item.terms || '';
  } else {
    if (title) title.textContent = 'New Promotion';
    if (btn) btn.textContent = 'Add Promotion';
    const s = g('np-start'); if (s) s.value = new Date().toISOString().split('T')[0];
  }
  openModal('modal-newPromotion');
}

function submitNewPromotion(e) {
  e.preventDefault();
  const editId = rv('np-edit-id');
  const obj = {
    id: editId || uid(),
    campaign: rv('np-campaign'),
    channel: rv('np-channel'),
    startDate: rv('np-start'),
    endDate: rv('np-end'),
    terms: g('np-terms') ? g('np-terms').value : ''
  };
  if (!obj.campaign) return alert('Please enter campaign name');
  if (!obj.startDate || !obj.endDate) return alert('Please enter the promotion period');
  if (editId) {
    const idx = promotionList.findIndex(function(x) { return x.id === editId; });
    if (idx >= 0) promotionList[idx] = obj;
  } else {
    promotionList.push(obj);
  }
  closeModal('modal-newPromotion');
  renderPromotionCards();
  renderPromoSettingTable();
}

function editNewPromotion(id) {
  const item = promotionList.find(function(x) { return x.id === id; });
  if (item) openNewPromotionModal(item);
}

function deleteNewPromotion(id) {
  if (!confirm('Delete this promotion?')) return;
  promotionList = promotionList.filter(function(x) { return x.id !== id; });
  renderPromotionCards();
  renderPromoSettingTable();
}

function renderPromotionCards() {
  const available = promotionList.filter(function(p) { return !isPromoExpired(p); });
  const expired = promotionList.filter(function(p) { return isPromoExpired(p); });

  const avCount = g('promo-available-count');
  const exCount = g('promo-expired-count');
  if (avCount) avCount.textContent = available.length;
  if (exCount) exCount.textContent = expired.length;

  const avGrid = g('promo-available-grid');
  const avEmpty = g('promo-available-empty');
  if (avGrid) {
    if (!available.length) {
      avGrid.innerHTML = '';
      if (avEmpty) avEmpty.style.display = '';
    } else {
      if (avEmpty) avEmpty.style.display = 'none';
      avGrid.innerHTML = available.map(function(p) { return buildPromoCard(p, false); }).join('');
    }
  }

  const exGrid = g('promo-expired-grid');
  const exEmpty = g('promo-expired-empty');
  if (exGrid) {
    if (!expired.length) {
      exGrid.innerHTML = '';
      if (exEmpty) exEmpty.style.display = '';
    } else {
      if (exEmpty) exEmpty.style.display = 'none';
      exGrid.innerHTML = expired.map(function(p) { return buildPromoCard(p, true); }).join('');
    }
  }
  var newBtn = g('promo-new-btn');
  if (newBtn) newBtn.style.display = (currentRole === 'admin') ? '' : 'none';
}

function buildPromoCard(p, isExpired) {
  var isAdmin = (currentRole === 'admin');
  var statusBadge = isExpired
    ? '<span class="promo-status-badge promo-status-expired">Expired</span>'
    : '<span class="promo-status-badge promo-status-active">Active</span>';
  var termsHtml = p.terms ? '<div class="promo-info-row"><span class="promo-info-icon"><i class="fas fa-file-lines"></i></span><span class="promo-info-value promo-terms-text">' + esc(p.terms) + '</span></div>' : '';
  var actionsHtml;
  if (isAdmin) {
    if (isExpired) {
      actionsHtml = '<button class="btn-restore" onclick="restorePromotion(\'' + esc(p.id) + '\')"><i class="fas fa-rotate-left"></i> Restore</button>' +
        '<button class="btn-delete" onclick="deleteNewPromotion(\'' + esc(p.id) + '\')"><i class="fas fa-trash"></i></button>';
    } else {
      actionsHtml = '<button class="btn-edit" onclick="editNewPromotion(\'' + esc(p.id) + '\')"><i class="fas fa-edit"></i> Edit</button>' +
        '<button class="btn-delete" onclick="deleteNewPromotion(\'' + esc(p.id) + '\')"><i class="fas fa-trash"></i></button>';
    }
  } else {
    actionsHtml = '<button class="btn-view-promo" onclick="openPromoViewModal(\'' + esc(p.id) + '\')"><i class="fas fa-eye"></i> View</button>';
  }
  return '<div class="promo-card-v2' + (isExpired ? ' expired' : '') + '">' +
    '<div class="promo-card-v2-header">' +
      '<span class="promo-card-v2-title">' + esc(p.campaign) + '</span>' +
      statusBadge +
    '</div>' +
    '<div class="promo-card-v2-body">' +
      '<div class="promo-info-row"><span class="promo-info-icon"><i class="fas fa-broadcast-tower"></i></span><span><span class="promo-info-label">Channel: </span><span class="promo-info-value">' + esc(p.channel || '—') + '</span></span></div>' +
      '<div class="promo-info-row"><span class="promo-info-icon"><i class="fas fa-calendar-range"></i></span><span><span class="promo-info-label">Period: </span><span class="promo-info-value">' + esc(p.startDate || '') + ' \u2192 ' + esc(p.endDate || '') + '</span></span></div>' +
      termsHtml +
    '</div>' +
    '<div class="promo-card-v2-footer">' + actionsHtml + '</div>' +
  '</div>';
}

function restorePromotion(id) {
  var idx = promotionList.findIndex(function(x) { return x.id === id; });
  if (idx < 0) return;
  var today = new Date();
  var future = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
  promotionList[idx].endDate = future.toISOString().split('T')[0];
  renderPromotionCards();
  showToast('Promotion restored for 30 days.', 'success');
}

function openPromoViewModal(id) {
  var p = promotionList.find(function(x) { return x.id === id; });
  if (!p) return;
  var body = g('modal-viewPromo-body');
  if (body) {
    body.innerHTML =
      '<div class="promo-info-row"><span class="promo-info-icon"><i class="fas fa-tag"></i></span><span><span class="promo-info-label">Campaign: </span><span class="promo-info-value">' + esc(p.campaign) + '</span></span></div>' +
      '<div class="promo-info-row"><span class="promo-info-icon"><i class="fas fa-broadcast-tower"></i></span><span><span class="promo-info-label">Channel: </span><span class="promo-info-value">' + esc(p.channel || '—') + '</span></span></div>' +
      '<div class="promo-info-row"><span class="promo-info-icon"><i class="fas fa-calendar"></i></span><span><span class="promo-info-label">Start: </span><span class="promo-info-value">' + esc(p.startDate || '—') + '</span></span></div>' +
      '<div class="promo-info-row"><span class="promo-info-icon"><i class="fas fa-calendar-xmark"></i></span><span><span class="promo-info-label">End: </span><span class="promo-info-value">' + esc(p.endDate || '—') + '</span></span></div>' +
      (p.terms ? '<div class="promo-info-row" style="margin-top:8px;"><span class="promo-info-icon"><i class="fas fa-file-lines"></i></span><span><span class="promo-info-label">Terms: </span><span class="promo-info-value" style="font-style:italic;color:#777;">' + esc(p.terms) + '</span></span></div>' : '');
  }
  openModal('modal-viewPromo');
}

function renderPromotionTable() {
  renderPromotionCards();
}

function renderPromoSettingTable() {
  const tbody = g('promo-setting-table') ? g('promo-setting-table').querySelector('tbody') : null;
  if (!tbody) return;
  if (!promotionList.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#999;">No promotions defined</td></tr>';
    return;
  }
  tbody.innerHTML = promotionList.map(function(p, i) {
    const expired = isPromoExpired(p);
    const statusPill = expired ? 'pill-gray' : 'pill-green';
    const statusLabel = expired ? 'Expired' : 'Active';
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td><strong>' + esc(p.campaign || p.name || '') + '</strong></td>' +
      '<td>' + esc(p.channel || '') + '</td>' +
      '<td>' + esc(p.startDate || '') + ' – ' + esc(p.endDate || '') + '</td>' +
      '<td><span class="pill ' + statusPill + '">' + statusLabel + '</span></td>' +
      '<td style="white-space:nowrap;">' +
        (expired ? '' : '<button class="btn-edit" onclick="editNewPromotion(\'' + esc(p.id) + '\')"><i class="fas fa-edit"></i></button> ') +
        '<button class="btn-delete" onclick="deleteNewPromotion(\'' + esc(p.id) + '\')"><i class="fas fa-trash"></i></button>' +
      '</td>' +
      '</tr>';
  }).join('');
}

// ------------------------------------------------------------
// Deposit Functions
// ------------------------------------------------------------
function openDepositModal(item) {
  const form = g('form-addDeposit');
  if (form) form.reset();
  const editEl = g('dep-edit-id');
  if (editEl) editEl.value = '';

  const title = g('modal-addDeposit-title');
  const btn = g('dep-submit-btn');
  populateBranchSelects();

  if (item) {
    if (title) title.textContent = 'Edit Deposit';
    if (btn) btn.textContent = 'Update Deposit';
    if (editEl) editEl.value = item.id;
    const agEl = g('dep-agent'); if (agEl) agEl.value = item.agent || '';
    const brEl = g('dep-branch'); if (brEl) brEl.value = item.branch || '';
    const amEl = g('dep-amount'); if (amEl) amEl.value = item.amount || '';
    const curEl = g('dep-currency'); if (curEl) curEl.value = item.currency || 'USD';
    const dtEl = g('dep-date'); if (dtEl) dtEl.value = item.date || '';
    const ntEl = g('dep-note'); if (ntEl) ntEl.value = item.note || '';
  } else {
    if (title) title.textContent = 'Add Deposit';
    if (btn) btn.textContent = 'Add Deposit';
    const dtEl = g('dep-date'); if (dtEl) dtEl.value = new Date().toISOString().split('T')[0];
  }
  openModal('modal-addDeposit');
}

function submitDeposit(e) {
  e.preventDefault();
  const editId = rv('dep-edit-id');
  const obj = {
    id: editId || uid(),
    agent: rv('dep-agent'),
    branch: rv('dep-branch'),
    amount: parseFloat(rv('dep-amount')) || 0,
    currency: rv('dep-currency') || 'USD',
    date: rv('dep-date'),
    note: rv('dep-note')
  };
  if (!obj.agent) return alert('Please enter agent name');
  if (!obj.amount) return alert('Please enter deposit amount');
  if (editId) {
    const idx = depositList.findIndex(function(x) { return x.id === editId; });
    if (idx >= 0) depositList[idx] = obj;
    addNotification((currentUser ? currentUser.name : 'User') + ' updated a deposit record.');
  } else {
    depositList.push(obj);
    addNotification((currentUser ? currentUser.name : 'User') + ' added a deposit.');
  }
  closeModal('modal-addDeposit');
  renderDepositTable();
  updateDepositKpis();
}

function editDeposit(id) {
  const item = depositList.find(function(x) { return x.id === id; });
  if (item) openDepositModal(item);
}

function deleteDeposit(id) {
  if (!confirm('Delete this deposit record?')) return;
  depositList = depositList.filter(function(x) { return x.id !== id; });
  renderDepositTable();
  updateDepositKpis();
}

function updateDepositKpis() {
  let total = 0;
  const agents = new Set();
  depositList.forEach(function(d) { total += d.amount; agents.add(d.agent); });
  const el1 = g('dep-kpi-total'); if (el1) el1.textContent = fmtMoney(total);
  const el2 = g('dep-kpi-count'); if (el2) el2.textContent = depositList.length;
  const el3 = g('dep-kpi-agents'); if (el3) el3.textContent = agents.size;
}

function renderDepositTable() {
  const tbody = g('deposit-table') ? g('deposit-table').querySelector('tbody') : null;
  if (!tbody) return;
  if (!depositList.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#999;"><i class="fas fa-piggy-bank" style="font-size:2rem;display:block;margin-bottom:8px;"></i>No deposit records yet</td></tr>';
    return;
  }
  tbody.innerHTML = depositList.map(function(d, i) {
    const avIdx = i % 8;
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td><div class="name-cell"><span class="avatar-circle av-' + avIdx + '" style="width:30px;height:30px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;color:#fff;margin-right:8px;">' + esc(ini(d.agent)) + '</span>' + esc(d.agent) + '</div></td>' +
      '<td>' + esc(d.branch || '') + '</td>' +
      '<td style="font-weight:700;color:#1B7D3D;">' + fmtMoney(d.amount, esc(d.currency) + ' ') + '</td>' +
      '<td>' + esc(d.date || '') + '</td>' +
      '<td style="color:#888;font-size:0.8rem;">' + esc(d.note || '') + '</td>' +
      '<td style="white-space:nowrap;">' +
        '<button class="btn-edit" onclick="editDeposit(\'' + esc(d.id) + '\')"><i class="fas fa-edit"></i></button> ' +
        '<button class="btn-delete" onclick="deleteDeposit(\'' + esc(d.id) + '\')"><i class="fas fa-trash"></i></button>' +
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
  const btn = g('user-submit-btn');
  populateBranchSelects();

  if (user) {
    if (title) title.textContent = 'Edit User';
    if (btn) btn.textContent = 'Update User';
    g('user-edit-id').value = user.id;
    g('user-name').value = user.name || '';
    g('user-username').value = user.username || '';
    g('user-password').value = user.password || '';
    g('user-role').value = user.role || 'Agent';
    const bInput = g('user-branch'); if (bInput) bInput.value = user.branch || '';
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
  if (!obj.name) return alert('Please enter user name');
  if (!obj.username) return alert('Please enter username');
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
  const tbody = g('staff-table') ? g('staff-table').querySelector('tbody') : null;
  if (!tbody) return;
  if (!staffList.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#999;"><i class="fas fa-users-cog" style="font-size:2rem;display:block;margin-bottom:8px;"></i>No users yet</td></tr>';
    return;
  }
  tbody.innerHTML = staffList.map(function(u, i) {
    const rolePill = u.role === 'Admin' ? 'pill-green' : u.role === 'Supervisor' ? 'pill-blue' : u.role === 'Agent' ? 'pill-orange' : 'pill-gray';
    const statusPill = u.status === 'active' ? 'pill-green' : 'pill-red';
    const avIdx = i % 8;
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td><div class="name-cell"><span class="avatar-circle av-' + avIdx + '" style="width:30px;height:30px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;color:#fff;margin-right:8px;">' + esc(ini(u.name)) + '</span>' + esc(u.name) + '</div></td>' +
      '<td>' + esc(u.username) + '</td>' +
      '<td><span class="pill ' + rolePill + '">' + esc(u.role) + '</span></td>' +
      '<td>' + esc(u.branch || '') + '</td>' +
      '<td><span class="pill ' + statusPill + '">' + esc(u.status) + '</span></td>' +
      '<td style="white-space:nowrap;">' +
        '<button class="btn-edit" onclick="editUser(\'' + esc(u.id) + '\')"><i class="fas fa-edit"></i></button> ' +
        '<button class="btn-delete" onclick="deleteUser(\'' + esc(u.id) + '\')"><i class="fas fa-trash"></i></button>' +
      '</td>' +
      '</tr>';
  }).join('');
}

// ------------------------------------------------------------
// KPI Functions
// ------------------------------------------------------------
function onUserRoleChange() {
  // reserved for role-specific UI changes
}

function selectKpiFor(type) {
  kpiForSelected = type;
  const shopBtn = g('kpi-for-shop');
  const agentBtn = g('kpi-for-agent');
  if (shopBtn) { shopBtn.classList.toggle('active', type === 'shop'); }
  if (agentBtn) { agentBtn.classList.toggle('active', type === 'agent'); }

  const shopGroup = g('kpi-shop-assignee-group');
  const agentBranchGroup = g('kpi-agent-branch-group');
  const agentAssigneeGroup = g('kpi-agent-assignee-group');

  if (type === 'shop') {
    if (shopGroup) shopGroup.style.display = '';
    if (agentBranchGroup) agentBranchGroup.style.display = 'none';
    if (agentAssigneeGroup) agentAssigneeGroup.style.display = 'none';
    populateKpiShopAssignee();
  } else {
    if (shopGroup) shopGroup.style.display = 'none';
    if (agentBranchGroup) agentBranchGroup.style.display = '';
    if (agentAssigneeGroup) agentAssigneeGroup.style.display = '';
    populateKpiAgentBranch();
  }
}

function populateKpiShopAssignee() {
  const sel = g('kpi-shop-assignee');
  if (!sel) return;
  const sups = staffList.filter(function(u) { return u.role === 'Supervisor'; });
  sel.innerHTML = '<option value="">Select Supervisor</option>' +
    sups.map(function(u) { return '<option value="' + esc(u.id) + '">' + esc(u.name) + '</option>'; }).join('');
}

function populateKpiAgentBranch() {
  const branchSel = g('kpi-agent-branch');
  if (!branchSel) return;
  branchSel.innerHTML = '<option value="">Select branch</option>' +
    BRANCHES.map(function(b) { return '<option value="' + esc(b) + '">' + esc(b) + '</option>'; }).join('');
  const agentSel = g('kpi-agent-assignee');
  if (agentSel) agentSel.innerHTML = '<option value="">Select Agent</option>';
}

function onKpiBranchChange() {
  const branch = rv('kpi-agent-branch');
  const agentSel = g('kpi-agent-assignee');
  if (!agentSel) return;
  const agents = staffList.filter(function(u) { return u.role === 'Agent' && u.branch === branch; });
  agentSel.innerHTML = '<option value="">Select Agent</option>' +
    agents.map(function(u) { return '<option value="' + esc(u.id) + '">' + esc(u.name) + '</option>'; }).join('');
}

function openKpiModal(item) {
  const form = g('form-kpi');
  if (form) form.reset();
  g('kpi-edit-id').value = '';
  kpiTypeSelected = 'Sales';
  setValueMode('unit');
  kpiForSelected = (item && item.kpiFor) ? item.kpiFor : 'shop';
  selectKpiFor(kpiForSelected);

  const title = g('modal-kpi-title');
  const btn = g('kpi-submit-btn');

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
      const uvEl = g('kpi-unit-val'); if (uvEl) uvEl.value = item.unit || '';
    } else {
      const csEl = g('kpi-currency-sel'); if (csEl) csEl.value = item.currency || 'USD';
    }
    if (item.kpiFor === 'shop') {
      populateKpiShopAssignee();
      const shopSel = g('kpi-shop-assignee');
      if (shopSel && item.assigneeId) shopSel.value = item.assigneeId;
    } else if (item.kpiFor === 'agent') {
      populateKpiAgentBranch();
      const branchSel = g('kpi-agent-branch');
      if (branchSel && item.assigneeBranch) {
        branchSel.value = item.assigneeBranch;
        onKpiBranchChange();
        const agentSel = g('kpi-agent-assignee');
        if (agentSel && item.assigneeId) agentSel.value = item.assigneeId;
      }
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
    kpiFor: kpiForSelected,
    assigneeId: kpiForSelected === 'shop' ? rv('kpi-shop-assignee') : rv('kpi-agent-assignee'),
    assigneeBranch: kpiForSelected === 'agent' ? rv('kpi-agent-branch') : '',
    target: parseFloat(rv('kpi-target')) || 0,
    valueMode: kpiValueMode,
    unit: kpiValueMode === 'unit' ? rv('kpi-unit-val') : '',
    currency: kpiValueMode === 'currency' ? rv('kpi-currency-sel') : '',
    period: rv('kpi-period')
  };
  if (!obj.name) return alert('Please enter KPI name');
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
  const tbody = g('kpi-table') ? g('kpi-table').querySelector('tbody') : null;
  if (!tbody) return;
  if (!kpiList.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#999;"><i class="fas fa-chart-line" style="font-size:2rem;display:block;margin-bottom:8px;"></i>No KPIs defined yet</td></tr>';
    return;
  }
  tbody.innerHTML = kpiList.map(function(k, i) {
    const typePill = k.type === 'Sales' ? 'pill-green' : k.type === 'Revenue' ? 'pill-orange' : k.type === 'Units' ? 'pill-blue' : 'pill-purple';
    const valueDisplay = k.valueMode === 'currency'
      ? fmtMoney(k.target, esc(k.currency) + ' ')
      : k.target + ' ' + esc(k.unit || '');
    const assignee = staffList.find(function(u) { return u.id === k.assigneeId; });
    const forLabel = k.kpiFor === 'shop' ? '<span class="pill pill-blue"><i class="fas fa-store"></i> Shop</span>' : '<span class="pill pill-orange"><i class="fas fa-user"></i> Agent</span>';
    const assigneeName = assignee ? esc(assignee.name) : (k.assigneeBranch ? esc(k.assigneeBranch) : '—');
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + esc(k.name) + '</td>' +
      '<td><span class="pill ' + typePill + '">' + esc(k.type) + '</span></td>' +
      '<td>' + forLabel + '<br><small style="color:#888;">' + assigneeName + '</small></td>' +
      '<td>' + valueDisplay + '</td>' +
      '<td>' + esc(k.period || '') + '</td>' +
      '<td style="white-space:nowrap;">' +
        '<button class="btn-edit" onclick="editKpi(\'' + esc(k.id) + '\')"><i class="fas fa-edit"></i></button> ' +
        '<button class="btn-delete" onclick="deleteKpi(\'' + esc(k.id) + '\')"><i class="fas fa-trash"></i></button>' +
      '</td>' +
      '</tr>';
  }).join('');
}

// ------------------------------------------------------------
// Login / Logout
// ------------------------------------------------------------
function handleLogin(e) {
  e.preventDefault();
  var username = rv('login-username');
  var password = rv('login-password');
  var errEl = g('login-error');
  var btn = g('login-submit-btn');
  if (!username || !password) {
    if (errEl) { errEl.textContent = 'Please enter username and password.'; errEl.style.display = ''; }
    return;
  }
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in\u2026'; }
  setTimeout(function() {
    var user = staffList.find(function(u) {
      return u.username.toLowerCase() === username.toLowerCase() && u.password === password && u.status === 'active';
    });
    if (user) {
      var roleMap = { 'Admin': 'admin', 'Supervisor': 'supervisor', 'Agent': 'user' };
      currentUser = user;
      if (errEl) errEl.style.display = 'none';
      var ls = g('login-screen'); if (ls) ls.style.display = 'none';
      var as = g('app-shell'); if (as) { as.style.display = 'flex'; }
      switchRole(roleMap[user.role] || 'user');
      var nameEl = g('topbar-name'); if (nameEl) nameEl.textContent = user.name;
      navigateTo('dashboard', null);
    } else {
      if (errEl) { errEl.textContent = 'Invalid username or password, or account is inactive.'; errEl.style.display = ''; }
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-right-to-bracket"></i> Sign In'; }
    }
  }, 600);
}

function toggleLoginPwd() {
  var inp = g('login-password');
  var eye = g('login-pwd-eye');
  if (!inp) return;
  if (inp.type === 'password') { inp.type = 'text'; if (eye) eye.className = 'fas fa-eye-slash'; }
  else { inp.type = 'password'; if (eye) eye.className = 'fas fa-eye'; }
}

function handleLogout() {
  if (!confirm('Sign out of Smart 5G Dashboard?')) return;
  currentUser = null;
  var as = g('app-shell'); if (as) as.style.display = 'none';
  var ls = g('login-screen'); if (ls) ls.style.display = 'flex';
  var lf = g('login-form'); if (lf) lf.reset();
  var errEl = g('login-error'); if (errEl) errEl.style.display = 'none';
  var btn = g('login-submit-btn'); if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-right-to-bracket"></i> Sign In'; }
}

function addNotification(msg) {
  notifications.push({ id: uid(), msg: msg, time: new Date().toLocaleString(), read: false });
  updateNotificationBadge();
}

function updateNotificationBadge() {
  var unread = notifications.filter(function(n) { return !n.read; }).length;
  var badge = g('notif-badge');
  if (badge) {
    badge.textContent = unread > 9 ? '9+' : (unread || '');
    badge.style.display = unread > 0 ? 'flex' : 'none';
  }
}

function toggleNotifications() {
  var panel = g('notif-panel');
  if (!panel) return;
  var isOpen = panel.style.display === 'block';
  panel.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    notifications.forEach(function(n) { n.read = true; });
    updateNotificationBadge();
    renderNotificationPanel();
  }
}

function renderNotificationPanel() {
  var list = g('notif-list');
  if (!list) return;
  if (!notifications.length) {
    list.innerHTML = '<div style="text-align:center;padding:24px;color:#999;font-size:.85rem;"><i class="fas fa-bell-slash" style="font-size:1.5rem;display:block;margin-bottom:8px;opacity:.3;"></i>No notifications yet</div>';
    return;
  }
  list.innerHTML = notifications.slice().reverse().map(function(n) {
    return '<div style="padding:10px 16px;border-bottom:1px solid #F5F5F5;font-size:.82rem;">' +
      '<div style="color:#1A1A2E;font-weight:500;">' + esc(n.msg) + '</div>' +
      '<div style="color:#999;font-size:.72rem;margin-top:2px;">' + esc(n.time) + '</div>' +
    '</div>';
  }).join('');
}

function loginContactSupport() {
  alert('Please contact admin via Telegram: @saray2026123');
}

// ------------------------------------------------------------
// Contact Support Modal
// ------------------------------------------------------------
function openContactSupportModal() {
  var form = g('form-contactSupport'); if (form) form.reset();
  if (currentUser) {
    var nm = g('support-req-name'); if (nm) nm.value = currentUser.name || '';
    var un = g('support-req-username'); if (un) un.value = currentUser.username || '';
    var br = g('support-req-branch'); if (br) br.value = currentUser.branch || '';
  }
  openModal('modal-contactSupport');
}

function submitSupportRequest(e) {
  e.preventDefault();
  var details = rv('support-req-details');
  if (!details) { alert('Please describe your request'); return; }
  closeModal('modal-contactSupport');
  showToast('Request sent! Admin will contact you via Telegram @saray2026123.', 'success');
  addNotification((currentUser ? currentUser.name : 'User') + ' sent a contact support request.');
}

// ------------------------------------------------------------
// Compatibility Aliases
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

// ------------------------------------------------------------
// Init
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {
  filteredSales = saleRecords.slice();
  populateBranchSelects();
  renderItemChips();
  renderNewCustomerTable();
  renderTopUpTable();
  renderTerminationTable();
  renderStaffTable();
  renderKpiTable();
  renderPromotionCards();
  renderDepositTable();
  updateDepositKpis();
  renderSaleTable();
  updateSaleKpis();
});

document.addEventListener('click', function(e) {
  var panel = g('notif-panel');
  var btn = g('notif-btn');
  if (panel && panel.style.display === 'block') {
    if (!panel.contains(e.target) && (!btn || !btn.contains(e.target))) {
      panel.style.display = 'none';
    }
  }
});
