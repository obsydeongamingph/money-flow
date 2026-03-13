/* ═══════════════════════════════════════════════
   RentPro — App Logic
═══════════════════════════════════════════════ */

// ── INITIAL DATA ─────────────────────────────
const SEED = {
  users: [{ id: 1, username: 'melthirdyproperty', password: 'godisgreat', role: 'admin' }],
  mySalary: (() => {
    const rows = [];
    for (let m = 9; m <= 14; m++) {
      const month = m > 12 ? m - 12 : m;
      const year  = m > 12 ? 2026 : 2025;
      const isPast = year < 2026 || (year === 2026 && month < 3);
      const basic = 20000, housing = 5000, shift = 3000, transport = 2000;
      const gross = basic + housing + shift + transport;
      rows.push({
        id: m - 8, month, year,
        basic, housing, shift, transport,
        gross, absent: 0, leave: 0, ot: 0, shiftded: 0, deductions: 0, net: gross,
        dateReceived: isPast ? `${year}-${String(month).padStart(2,'0')}-28` : '',
        status: isPast ? 'received' : 'pending',
        notes: '',
      });
    }
    return rows;
  })(),
  apartments: [
    { id: 1, name: 'Unit 101', floor: '1st Floor', type: 'small',  area: 35,  monthlyRent: 8000,  investmentCost: 400000, notes: 'Studio unit near entrance', status: 'occupied' },
    { id: 2, name: 'Unit 201', floor: '2nd Floor', type: 'medium', area: 65,  monthlyRent: 14000, investmentCost: 700000, notes: '2-bedroom with balcony',    status: 'occupied' },
    { id: 3, name: 'Unit 301', floor: '3rd Floor', type: 'large',  area: 100, monthlyRent: 22000, investmentCost: 1100000, notes: '3-bedroom corner unit',    status: 'occupied' },
    { id: 4, name: 'Unit 102', floor: '1st Floor', type: 'small',  area: 32,  monthlyRent: 7500,  investmentCost: 380000, notes: 'Small studio unit',         status: 'vacant'   },
  ],
  tenants: [
    { id: 1, name: 'Maria Santos',  phone: '0917-123-4567', email: 'maria@email.com',   apartmentId: 1, startDate: '2025-01-01', monthlyRent: 8000,  deposit: 16000 },
    { id: 2, name: 'Juan Reyes',    phone: '0918-234-5678', email: 'juan@email.com',    apartmentId: 2, startDate: '2025-03-01', monthlyRent: 14000, deposit: 28000 },
    { id: 3, name: 'Ana Gonzales',  phone: '0919-345-6789', email: 'ana@email.com',     apartmentId: 3, startDate: '2025-06-01', monthlyRent: 22000, deposit: 44000 },
  ],
  payments: (() => {
    const p = [];
    let id = 1;
    // Generate 6 months of payment history for 3 tenants
    const tenants = [
      { id: 1, aptId: 1, rent: 8000 },
      { id: 2, aptId: 2, rent: 14000 },
      { id: 3, aptId: 3, rent: 22000 },
    ];
    for (let m = 9; m <= 14; m++) {
      const month = m > 12 ? m - 12 : m;
      const year  = m > 12 ? 2026 : 2025;
      tenants.forEach(t => {
        const isPast   = year < 2026 || (year === 2026 && month < 3);
        const isCurrent = year === 2026 && month === 3;
        p.push({
          id: id++, tenantId: t.id, apartmentId: t.aptId,
          month, year, amount: t.rent,
          dueDate:    `${year}-${String(month).padStart(2,'0')}-05`,
          paidDate:   isPast ? `${year}-${String(month).padStart(2,'0')}-${month % 3 === 0 ? '08' : '04'}` : '',
          status:     isPast ? 'paid' : (isCurrent ? 'pending' : 'pending'),
        });
      });
    }
    return p;
  })(),
};

// ── NUMBER FORMATTING ────────────────────────
// Format a number for display (commas + optional decimal places)
function fmtN(n, dec = 0) {
  return Number(n).toLocaleString('en-US', dec > 0
    ? { minimumFractionDigits: dec, maximumFractionDigits: dec }
    : { maximumFractionDigits: 0 });
}

// Read value from a possibly comma-formatted input
function numVal(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  return parseFloat(String(el.value).replace(/,/g, '')) || 0;
}

// Write a number to an input and display it with commas
function setNumVal(id, n) {
  const el = document.getElementById(id);
  if (!el) return;
  const num = Number(n) || 0;
  el.value = num ? fmtN(num, el.dataset.dec ? Number(el.dataset.dec) : 0) : '0';
}

// Convert monetary inputs to comma-formatted text inputs
const MONEY_INPUT_IDS = [
  'msal-basic','msal-housing','msal-shift','msal-transport',
  'msal-absent','msal-leave','msal-ot','msal-shiftded','msal-deductions',
  'ocr-basic','ocr-housing','ocr-shift','ocr-transport',
  'ocr-absent','ocr-leave','ocr-ot','ocr-shiftded','ocr-deductions',
  'ot-basic',
  'apt-rent','apt-invest','apt-area',
  'tenant-rent','tenant-deposit',
  'pay-amount',
];

document.addEventListener('DOMContentLoaded', () => {
  MONEY_INPUT_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.type = 'text';
    el.inputMode = 'decimal';
    el.addEventListener('focus', () => {
      el.value = el.value.replace(/,/g, '');
    });
    el.addEventListener('blur', () => {
      const n = parseFloat(el.value.replace(/,/g, '')) || 0;
      el.value = n ? fmtN(n) : '0';
    });
    el.addEventListener('input', () => {
      // Allow digits and at most one decimal point
      let v = el.value.replace(/[^0-9.]/g, '');
      const parts = v.split('.');
      if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
      el.value = v;
    });
  });
});

// ── STATE & DB ────────────────────────────────
function db(key, val) {
  if (val !== undefined) { localStorage.setItem('rp_' + key, JSON.stringify(val)); return val; }
  const raw = localStorage.getItem('rp_' + key);
  return raw ? JSON.parse(raw) : null;
}
function initDB() {
  // Migrate old default credentials to new ones
  const existingUsers = db('users');
  if (existingUsers) {
    let changed = false;
    existingUsers.forEach(u => {
      if (u.username === 'admin' && u.password === 'admin123') {
        u.username = 'melthirdyproperty';
        u.password = 'godisgreat';
        changed = true;
      }
    });
    if (changed) db('users', existingUsers);
  }

  if (!db('init')) {
    db('users',         SEED.users);
    db('apartments',    SEED.apartments);
    db('tenants',       SEED.tenants);
    db('payments',      SEED.payments);
    db('mySalary', SEED.mySalary);
    db('otLogs', []);
    db('init', true);
  }
}
function getAll(key)     { return db(key) || []; }
function saveAll(key, a) { db(key, a); }
function nextId(key)     { const a = getAll(key); return a.length ? Math.max(...a.map(x=>x.id)) + 1 : 1; }

// ── AUTH ─────────────────────────────────────
const SESSION_KEY = 'rp_session';
const REMEMBER_KEY = 'rp_remember';

function getSession()  { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; } }
function setSession(u) { localStorage.setItem(SESSION_KEY, JSON.stringify(u)); }
function clearSession(){ localStorage.removeItem(SESSION_KEY); }

function showApp(user) {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  // update sidebar username/avatar
  document.querySelectorAll('.sidebar-username').forEach(el => el.textContent = user.username);
  document.querySelectorAll('.sidebar-avatar, .avatar').forEach(el => el.textContent = user.username[0].toUpperCase());
}

function showLogin() {
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  const remembered = localStorage.getItem(REMEMBER_KEY);
  if (remembered) {
    document.getElementById('login-username').value = remembered;
    document.getElementById('login-remember').checked = true;
  }
}

function doLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const remember = document.getElementById('login-remember').checked;
  const errEl = document.getElementById('login-error');

  const users = getAll('users');
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    errEl.classList.remove('hidden');
    document.getElementById('login-password').value = '';
    return;
  }
  errEl.classList.add('hidden');
  if (remember) localStorage.setItem(REMEMBER_KEY, username);
  else localStorage.removeItem(REMEMBER_KEY);

  setSession({ id: user.id, username: user.username, role: user.role });
  showApp(user);
  navigateTo('dashboard');
}

function saveChangePassword() {
  const errEl = document.getElementById('changepw-error');
  const okEl  = document.getElementById('changepw-success');
  errEl.classList.add('hidden');
  okEl.classList.add('hidden');

  const current = document.getElementById('cp-current').value;
  const next    = document.getElementById('cp-new').value.trim();
  const confirm = document.getElementById('cp-confirm').value.trim();

  const session = getSession();
  if (!session) return;
  const users = getAll('users');
  const user = users.find(u => u.id === session.id);

  if (!user || user.password !== current) {
    errEl.textContent = '❌ Current password is incorrect.'; errEl.classList.remove('hidden'); return;
  }
  if (next.length < 4) {
    errEl.textContent = '❌ New password must be at least 4 characters.'; errEl.classList.remove('hidden'); return;
  }
  if (next !== confirm) {
    errEl.textContent = '❌ Passwords do not match.'; errEl.classList.remove('hidden'); return;
  }
  user.password = next;
  saveAll('users', users);
  document.getElementById('cp-current').value = '';
  document.getElementById('cp-new').value = '';
  document.getElementById('cp-confirm').value = '';
  okEl.classList.remove('hidden');
  setTimeout(() => document.getElementById('modal-change-pw').classList.add('hidden'), 1500);
}

// Login button + Enter key
document.getElementById('login-btn').addEventListener('click', doLogin);
['login-username','login-password'].forEach(id =>
  document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); })
);

// Show/hide password toggle
document.getElementById('login-pw-toggle').addEventListener('click', function() {
  const inp = document.getElementById('login-password');
  if (inp.type === 'password') { inp.type = 'text'; this.textContent = '🙈'; }
  else { inp.type = 'password'; this.textContent = '👁️'; }
});

// Change password modal
document.getElementById('change-pw-btn').addEventListener('click', () => {
  document.getElementById('changepw-error').classList.add('hidden');
  document.getElementById('changepw-success').classList.add('hidden');
  document.getElementById('cp-current').value = '';
  document.getElementById('cp-new').value = '';
  document.getElementById('cp-confirm').value = '';
  document.getElementById('modal-change-pw').classList.remove('hidden');
});

// Logout — clears session but NOT the remembered username
document.getElementById('logout-btn').addEventListener('click', () => {
  clearSession();
  showLogin();
});

// Boot: check for existing session
(function boot() {
  initDB();
  const session = getSession();
  if (session) {
    const users = getAll('users');
    const user = users.find(u => u.id === session.id);
    if (user) { showApp(user); navigateTo('dashboard'); return; }
  }
  showLogin();
})();

// ── ROUTER ───────────────────────────────────
const VIEWS = { dashboard: 'Dashboard', apartments: 'Apartments', tenants: 'Tenants', payments: 'Payment Log', roi: 'ROI Report', salary: 'Salary Management', ot: 'OT Calculator' };

function navigateTo(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById('view-' + view).classList.remove('hidden');
  document.querySelector(`[data-view="${view}"]`).classList.add('active');
  document.body.dataset.activeView = view;
  document.getElementById('page-title').textContent = VIEWS[view];
  const subs = { dashboard:'Overview', apartments:'Management', tenants:'Management', payments:'Management', roi:'Finance', salary:'Finance', ot:'Finance' };
  const sub = document.getElementById('page-title-sub');
  if (sub) sub.textContent = subs[view] || '';
  const renders = { dashboard: renderDashboard, apartments: renderApartments, tenants: renderTenants, payments: renderPayments, roi: renderROI, salary: renderSalary, ot: () => { calcOT(); renderOTLogs(); } };
  renders[view] && renders[view]();
}

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => { e.preventDefault(); navigateTo(link.dataset.view); });
});

// ── MODALS ───────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ── DASHBOARD ────────────────────────────────
let incomeChart = null, occupancyChart = null;

const LEVEL_TITLES = [
  'Rookie Landlord','Bronze Landlord','Silver Landlord','Gold Landlord',
  'Platinum Landlord','Diamond Landlord','Master Landlord','Grand Master',
  'Property Legend','Immortal Tycoon'
];
const XP_PER_LEVEL = 50000;

function renderDashboard() {
  const apts      = getAll('apartments');
  const tenants   = getAll('tenants');
  const payments  = getAll('payments');
  const now       = new Date();
  const thisMonth = now.getMonth() + 1;
  const thisYear  = now.getFullYear();

  const monthPays   = payments.filter(p => p.month === thisMonth && p.year === thisYear);
  const totalIncome = monthPays.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const pending     = monthPays.filter(p => p.status !== 'paid').length;
  const totalInvest = apts.reduce((s, a) => s + (a.investmentCost || 0), 0);
  const totalCollect= payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const roi         = totalInvest > 0 ? ((totalCollect / totalInvest) * 100).toFixed(1) : 0;
  const occupied    = apts.filter(a => tenants.find(t => t.apartmentId === a.id)).length;

  // ── Player HUD ──
  const level    = Math.min(Math.floor(totalCollect / XP_PER_LEVEL) + 1, 99);
  const xpInLvl  = totalCollect % XP_PER_LEVEL;
  const xpPct    = Math.min((xpInLvl / XP_PER_LEVEL) * 100, 100);
  const title    = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
  document.getElementById('hud-level').textContent   = level;
  document.getElementById('hud-title').textContent   = title;
  document.getElementById('hud-xp-bar').style.width  = xpPct + '%';
  document.getElementById('hud-xp-label').textContent= fmtN(xpInLvl) + ' / ' + fmtN(XP_PER_LEVEL) + ' XP';
  document.getElementById('hud-gold').textContent    = '₱' + fmtN(totalCollect);
  document.getElementById('today-date').textContent  = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  // ── Stat Cards ──
  const maxRent = apts.reduce((s, a) => s + (a.monthlyRent || 0), 0) || 1;
  document.getElementById('kpi-units').textContent   = `${occupied} / ${apts.length}`;
  document.getElementById('kpi-income').textContent  = '₱' + fmtN(totalIncome);
  document.getElementById('kpi-pending').textContent = pending;
  document.getElementById('kpi-roi').textContent     = roi + '%';
  document.getElementById('sub-units').textContent   = `${occupied} occupied · ${apts.length - occupied} free`;
  document.getElementById('sub-income').textContent  = `${Math.round((totalIncome / maxRent) * 100)}% of max rent`;
  document.getElementById('sub-pending').textContent = pending === 0 ? '🎉 All paid up!' : `${pending} unpaid this month`;

  // Animate bars after a tick so CSS transition fires
  setTimeout(() => {
    document.getElementById('bar-units').style.width   = apts.length ? (occupied / apts.length * 100) + '%' : '0%';
    document.getElementById('bar-income').style.width  = Math.min(totalIncome / maxRent * 100, 100) + '%';
    document.getElementById('bar-pending').style.width = monthPays.length ? (pending / monthPays.length * 100) + '%' : '0%';
    document.getElementById('bar-roi').style.width     = Math.min(parseFloat(roi), 100) + '%';
  }, 80);

  // ── Gold Raid chart ──
  const months = [], incomeData = [];
  for (let i = 5; i >= 0; i--) {
    let m = thisMonth - i, y = thisYear;
    if (m <= 0) { m += 12; y -= 1; }
    months.push(new Date(y, m - 1).toLocaleString('default', { month: 'short', year: '2-digit' }));
    incomeData.push(payments.filter(p => p.month === m && p.year === y && p.status === 'paid').reduce((s, p) => s + p.amount, 0));
  }
  if (incomeChart) incomeChart.destroy();
  incomeChart = new Chart(document.getElementById('chart-income'), {
    type: 'bar',
    data: {
      labels: months,
      datasets: [{ label: 'Gold (₱)', data: incomeData,
        backgroundColor: 'rgba(108,99,255,0.7)',
        borderColor: '#6c63ff', borderWidth: 2, borderRadius: 8,
        hoverBackgroundColor: '#a78bfa'
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#6c63ff', font: { weight: '700' } }, grid: { color: 'rgba(108,99,255,0.1)' } },
        y: { ticks: { color: '#6c63ff', callback: v => '₱' + fmtN(v) }, grid: { color: 'rgba(108,99,255,0.1)' } }
      }
    }
  });

  // ── Territory Control chart ──
  const vacant = apts.length - occupied;
  if (occupancyChart) occupancyChart.destroy();
  occupancyChart = new Chart(document.getElementById('chart-occupancy'), {
    type: 'doughnut',
    data: {
      labels: ['Occupied', 'Unoccupied'],
      datasets: [{ data: [occupied, vacant],
        backgroundColor: ['#6c63ff', 'rgba(108,99,255,0.15)'],
        borderColor: ['#a78bfa', 'rgba(108,99,255,0.3)'],
        borderWidth: 2, hoverOffset: 8
      }]
    },
    options: {
      responsive: true, cutout: '72%',
      plugins: { legend: { position: 'bottom', labels: { color: '#1a1040', font: { weight: '800' } } } }
    }
  });

  // ── Quest Board ──
  const tbody = document.querySelector('#table-recent-payments tbody');
  tbody.innerHTML = '';
  const recent = [...payments].sort((a, b) => b.id - a.id).slice(0, 8);
  if (!recent.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No quests yet.</td></tr>'; return; }
  recent.forEach(p => {
    const tenant = tenants.find(t => t.id === p.tenantId);
    const apt    = apts.find(a => a.id === p.apartmentId);
    const statusIcon = p.status === 'paid' ? '✅' : p.status === 'late' ? '🔴' : '⏳';
    tbody.innerHTML += `<tr>
      <td><strong>${tenant ? tenant.name : '—'}</strong></td>
      <td>${apt ? apt.name : '—'}</td>
      <td>${monthName(p.month)} ${p.year}</td>
      <td><strong>₱${fmtN(p.amount)}</strong></td>
      <td><span class="badge badge-${p.status}">${statusIcon} ${p.status}</span></td>
    </tr>`;
  });
}

// ── APARTMENTS ───────────────────────────────
function inlineRenameApt(el, id) {
  if (el.querySelector('input')) return; // already editing
  const current = el.textContent.trim();
  el.innerHTML = `<input class="apt-inline-input" value="${current}" maxlength="60"
    onclick="event.stopPropagation()"
    onkeydown="if(event.key==='Enter'){this.blur()}if(event.key==='Escape'){this.dataset.cancel='1';this.blur()}"
  />`;
  const inp = el.querySelector('input');
  inp.focus();
  inp.select();
  inp.addEventListener('blur', () => {
    if (inp.dataset.cancel) { el.textContent = current; return; }
    const newName = inp.value.trim();
    if (newName && newName !== current) {
      const apts = getAll('apartments');
      const idx  = apts.findIndex(a => a.id === id);
      if (idx > -1) { apts[idx].name = newName; saveAll('apartments', apts); }
    }
    el.textContent = newName || current;
  });
}

function renderApartments() {
  const apts    = getAll('apartments');
  const tenants = getAll('tenants');
  const grid    = document.getElementById('apt-grid');
  grid.innerHTML = '';

  if (!apts.length) { grid.innerHTML = '<p style="color:var(--text-muted)">No apartments yet. Add one!</p>'; return; }

  // Sync all statuses before rendering
  let statusChanged = false;
  apts.forEach(a => {
    const correct = tenants.find(t => t.apartmentId === a.id) ? 'occupied' : 'vacant';
    if (a.status !== correct) { a.status = correct; statusChanged = true; }
  });
  if (statusChanged) saveAll('apartments', apts);

  apts.forEach(a => {
    const tenant   = tenants.find(t => t.apartmentId === a.id);
    const status   = tenant ? 'occupied' : 'vacant';
    const typeIcons = { small: '🏠', medium: '🏡', large: '🏘' };
    const typeLabel = { small: 'Small', medium: 'Medium', large: 'Large' };
    grid.innerHTML += `
      <div class="apt-card">
        <div class="apt-card-banner apt-banner-${a.type}">
          ${typeIcons[a.type]}
          <span class="apt-type-badge">${typeLabel[a.type]}</span>
        </div>
        <div class="apt-card-body">
          <div class="apt-card-name" title="Click to rename" onclick="inlineRenameApt(this, ${a.id})">${a.name}</div>
          <div class="apt-card-detail">${a.floor || ''}${a.area ? ' · ' + a.area + ' sqm' : ''}${a.notes ? ' · ' + a.notes : ''}</div>
          <div class="apt-card-meta">
            <span class="apt-rent">₱${Number(a.monthlyRent).toLocaleString()}/mo</span>
            <span class="badge badge-${status}">${status === 'occupied' ? 'occupied' : 'unoccupied'}</span>
          </div>
          ${tenant ? `<div style="font-size:.82rem;color:var(--text-muted);margin-bottom:.75rem">👤 ${tenant.name}</div>` : ''}
          <div class="apt-card-actions">
            <button class="btn btn-secondary btn-sm" onclick="view3D(${a.id})">🧊 3D View</button>
            <button class="btn btn-secondary btn-sm" onclick="editApartment(${a.id})">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteRecord('apartments', ${a.id}, renderApartments)">🗑</button>
          </div>
        </div>
      </div>`;
  });
}

// Apartment form
document.getElementById('form-apt').addEventListener('submit', e => {
  e.preventDefault();
  const apts = getAll('apartments');
  const id   = document.getElementById('apt-id').value;
  const obj  = {
    name: document.getElementById('apt-name').value,
    floor: document.getElementById('apt-floor').value,
    type: document.getElementById('apt-type').value,
    area: Number(document.getElementById('apt-area').value),
    monthlyRent: Number(document.getElementById('apt-rent').value),
    investmentCost: Number(document.getElementById('apt-invest').value),
    notes: document.getElementById('apt-notes').value,
    status: 'vacant',
  };
  if (id) {
    const idx = apts.findIndex(a => a.id === Number(id));
    obj.status = apts[idx].status;
    apts[idx] = { ...apts[idx], ...obj };
  } else {
    obj.id = nextId('apartments');
    apts.push(obj);
  }
  saveAll('apartments', apts);
  closeModal('modal-apt');
  renderApartments();
});

function editApartment(id) {
  const a = getAll('apartments').find(x => x.id === id);
  document.getElementById('apt-id').value    = a.id;
  document.getElementById('apt-name').value  = a.name;
  document.getElementById('apt-floor').value = a.floor || '';
  document.getElementById('apt-type').value  = a.type;
  document.getElementById('apt-area').value  = a.area || '';
  document.getElementById('apt-rent').value  = a.monthlyRent;
  document.getElementById('apt-invest').value= a.investmentCost || '';
  document.getElementById('apt-notes').value = a.notes || '';
  document.getElementById('modal-apt-title').textContent = 'Edit Apartment';
  openModal('modal-apt');
}

document.querySelector('[onclick="openModal(\'modal-apt\')"]') && (window._resetAptForm = () => {
  document.getElementById('apt-id').value = '';
  document.getElementById('form-apt').reset();
  document.getElementById('modal-apt-title').textContent = 'Add Apartment';
});

// ── TENANTS ──────────────────────────────────
function renderTenants() {
  const tenants = getAll('tenants');
  const apts    = getAll('apartments');
  const tbody   = document.querySelector('#table-tenants tbody');
  tbody.innerHTML = '';
  if (!tenants.length) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">No tenants yet.</td></tr>'; return; }
  tenants.forEach(t => {
    const apt = apts.find(a => a.id === t.apartmentId);
    tbody.innerHTML += `<tr>
      <td><strong>${t.name}</strong></td>
      <td>${t.phone || '—'}</td>
      <td>${t.email || '—'}</td>
      <td>${apt ? apt.name : '—'}</td>
      <td>${t.startDate || '—'}</td>
      <td>₱${Number(t.monthlyRent).toLocaleString()}</td>
      <td>
        <button class="btn-icon" onclick="editTenant(${t.id})" title="Edit">✏️</button>
        <button class="btn-icon" onclick="deleteRecord('tenants', ${t.id}, renderTenants)" title="Delete">🗑️</button>
      </td>
    </tr>`;
  });
}

function populateTenantAptSelect() {
  const apts = getAll('apartments');
  const sel  = document.getElementById('tenant-apt');
  sel.innerHTML = '<option value="">Select Apartment</option>';
  apts.forEach(a => { sel.innerHTML += `<option value="${a.id}">${a.name} (${a.type})</option>`; });
  sel.onchange = () => {
    const apt = apts.find(a => a.id === Number(sel.value));
    if (apt) document.getElementById('tenant-rent').value = apt.monthlyRent;
  };
}

document.getElementById('form-tenant').addEventListener('submit', e => {
  e.preventDefault();
  const tenants = getAll('tenants');
  const apts    = getAll('apartments');
  const id      = document.getElementById('tenant-id').value;
  const aptId   = Number(document.getElementById('tenant-apt').value);
  const obj     = {
    name: document.getElementById('tenant-name').value,
    phone: document.getElementById('tenant-phone').value,
    email: document.getElementById('tenant-email').value,
    apartmentId: aptId,
    startDate: document.getElementById('tenant-start').value,
    monthlyRent: Number(document.getElementById('tenant-rent').value),
    deposit: Number(document.getElementById('tenant-deposit').value),
  };
  if (id) {
    const idx    = tenants.findIndex(t => t.id === Number(id));
    const oldApt = tenants[idx].apartmentId;
    tenants[idx] = { ...tenants[idx], ...obj };
    // If apartment changed, vacate old and occupy new
    if (oldApt !== aptId) {
      const oldAi = apts.findIndex(a => a.id === oldApt);
      if (oldAi > -1) { apts[oldAi].status = 'vacant'; }
      const newAi = apts.findIndex(a => a.id === aptId);
      if (newAi > -1) { apts[newAi].status = 'occupied'; }
      saveAll('apartments', apts);
    }
  } else {
    obj.id = nextId('tenants');
    tenants.push(obj);
    const ai = apts.findIndex(a => a.id === aptId);
    if (ai > -1) { apts[ai].status = 'occupied'; saveAll('apartments', apts); }
  }
  saveAll('tenants', tenants);
  closeModal('modal-tenant');
  renderTenants();
});

function editTenant(id) {
  const t = getAll('tenants').find(x => x.id === id);
  populateTenantAptSelect();
  document.getElementById('tenant-id').value      = t.id;
  document.getElementById('tenant-name').value    = t.name;
  document.getElementById('tenant-phone').value   = t.phone || '';
  document.getElementById('tenant-email').value   = t.email || '';
  document.getElementById('tenant-apt').value     = t.apartmentId;
  document.getElementById('tenant-start').value   = t.startDate || '';
  document.getElementById('tenant-rent').value    = t.monthlyRent;
  document.getElementById('tenant-deposit').value = t.deposit || '';
  document.getElementById('modal-tenant-title').textContent = 'Edit Tenant';
  openModal('modal-tenant');
}

// ── PAYMENTS ─────────────────────────────────
function renderPayments() {
  const all      = getAll('payments');
  const tenants  = getAll('tenants');
  const apts     = getAll('apartments');
  const m = document.getElementById('filter-month').value;
  const y = document.getElementById('filter-year').value;
  const s = document.getElementById('filter-status').value;
  const filtered = all.filter(p =>
    (!m || p.month === Number(m)) &&
    (!y || p.year  === Number(y)) &&
    (!s || p.status === s)
  );
  const tbody = document.querySelector('#table-payments tbody');
  tbody.innerHTML = '';
  updatePayBulkBtn();
  if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted)">No payments found.</td></tr>'; return; }
  [...filtered].sort((a,b) => b.year - a.year || b.month - a.month).forEach(p => {
    const tenant = tenants.find(t => t.id === p.tenantId);
    const apt    = apts.find(a => a.id === p.apartmentId);
    tbody.innerHTML += `<tr>
      <td><input type="checkbox" class="pay-row-cb" data-id="${p.id}" onchange="updatePayBulkBtn()"/></td>
      <td>${tenant ? tenant.name : '—'}</td>
      <td>${apt ? apt.name : '—'}</td>
      <td>${monthName(p.month)} ${p.year}</td>
      <td>₱${Number(p.amount).toLocaleString()}</td>
      <td>${p.dueDate || '—'}</td>
      <td>${p.paidDate || '—'}</td>
      <td><span class="badge badge-${p.status}">${p.status}</span></td>
      <td>
        <button class="btn-icon" onclick="editPayment(${p.id})" title="Edit">✏️</button>
        <button class="btn-icon" onclick="markPaid(${p.id})" title="Mark Paid">✅</button>
        <button class="btn-icon" onclick="deleteRecord('payments', ${p.id}, renderPayments)" title="Delete">🗑️</button>
      </td>
    </tr>`;
  });

  // Wire select-all checkbox
  const selAll = document.getElementById('pay-select-all');
  if (selAll) {
    selAll.checked = false;
    selAll.onchange = () => {
      document.querySelectorAll('.pay-row-cb').forEach(cb => cb.checked = selAll.checked);
      updatePayBulkBtn();
    };
  }
}

function updatePayBulkBtn() {
  const checked = document.querySelectorAll('.pay-row-cb:checked').length;
  const btn     = document.getElementById('pay-bulk-delete-btn');
  const count   = document.getElementById('pay-selected-count');
  if (!btn) return;
  btn.style.display = checked > 0 ? '' : 'none';
  if (count) count.textContent = checked;
  // Sync select-all state
  const total  = document.querySelectorAll('.pay-row-cb').length;
  const selAll = document.getElementById('pay-select-all');
  if (selAll) selAll.checked = total > 0 && checked === total;
}

function deleteSelectedPayments() {
  const ids = [...document.querySelectorAll('.pay-row-cb:checked')].map(cb => Number(cb.dataset.id));
  if (!ids.length) return;
  if (!confirm(`Delete ${ids.length} payment${ids.length > 1 ? 's' : ''}?`)) return;
  saveAll('payments', getAll('payments').filter(p => !ids.includes(p.id)));
  renderPayments();
}

function markPaid(id) {
  const pays = getAll('payments');
  const idx  = pays.findIndex(p => p.id === id);
  if (idx > -1) {
    pays[idx].status   = 'paid';
    pays[idx].paidDate = new Date().toISOString().split('T')[0];
    saveAll('payments', pays);
    renderPayments();
  }
}

function populatePaymentTenantSelect() {
  const tenants = getAll('tenants');
  const sel = document.getElementById('pay-tenant');
  sel.innerHTML = '<option value="">Select Tenant</option>';
  tenants.forEach(t => { sel.innerHTML += `<option value="${t.id}">${t.name}</option>`; });
}

function fillPaymentRent() {
  const tid = Number(document.getElementById('pay-tenant').value);
  const t   = getAll('tenants').find(x => x.id === tid);
  if (t) document.getElementById('pay-amount').value = t.monthlyRent;
}

document.getElementById('form-payment').addEventListener('submit', e => {
  e.preventDefault();
  const pays = getAll('payments');
  const id   = document.getElementById('pay-id').value;
  const tenantId = Number(document.getElementById('pay-tenant').value);
  const tenant   = getAll('tenants').find(t => t.id === tenantId);
  const obj  = {
    tenantId,
    apartmentId: tenant ? tenant.apartmentId : 0,
    month:    Number(document.getElementById('pay-month').value),
    year:     Number(document.getElementById('pay-year').value),
    amount:   Number(document.getElementById('pay-amount').value),
    dueDate:  document.getElementById('pay-due').value,
    paidDate: document.getElementById('pay-paid-date').value,
    status:   document.getElementById('pay-status').value,
  };
  if (id) {
    const idx = pays.findIndex(p => p.id === Number(id));
    pays[idx] = { ...pays[idx], ...obj };
  } else {
    obj.id = nextId('payments');
    pays.push(obj);
  }
  saveAll('payments', pays);
  closeModal('modal-payment');
  renderPayments();
});

function editPayment(id) {
  const p = getAll('payments').find(x => x.id === id);
  populatePaymentTenantSelect();
  document.getElementById('pay-id').value          = p.id;
  document.getElementById('pay-tenant').value      = p.tenantId;
  document.getElementById('pay-amount').value      = p.amount;
  document.getElementById('pay-month').value       = p.month;
  document.getElementById('pay-year').value        = p.year;
  document.getElementById('pay-due').value         = p.dueDate || '';
  document.getElementById('pay-paid-date').value   = p.paidDate || '';
  document.getElementById('pay-status').value      = p.status;
  document.getElementById('modal-payment-title').textContent = 'Edit Payment';
  openModal('modal-payment');
}

// ── ROI REPORT ───────────────────────────────
let roiChart = null;

function renderROI() {
  const apts    = getAll('apartments');
  const payments = getAll('payments');

  const totalInvest  = apts.reduce((s, a) => s + (a.investmentCost || 0), 0);
  const totalCollect = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const overallROI   = totalInvest > 0 ? ((totalCollect / totalInvest) * 100).toFixed(1) : 0;
  const monthlyIncome = apts.filter(a => a.status === 'occupied').reduce((s, a) => s + a.monthlyRent, 0);
  const paybackMonths = monthlyIncome > 0 ? Math.ceil((totalInvest - totalCollect) / monthlyIncome) : '∞';

  document.getElementById('roi-kpis').innerHTML = `
    <div class="kpi-card" data-icon="🏦">
      <div class="kpi-label">Total Investment</div>
      <div class="kpi-value">₱${(totalInvest/1000000).toFixed(2)}M</div>
      <div class="kpi-sub">All units combined</div>
    </div>
    <div class="kpi-card green" data-icon="💵">
      <div class="kpi-label">Total Collected</div>
      <div class="kpi-value">₱${totalCollect.toLocaleString()}</div>
      <div class="kpi-sub">All paid payments</div>
    </div>
    <div class="kpi-card blue" data-icon="📊">
      <div class="kpi-label">Overall ROI</div>
      <div class="kpi-value">${overallROI}%</div>
      <div class="kpi-sub">vs investment cost</div>
    </div>
    <div class="kpi-card orange" data-icon="⏱">
      <div class="kpi-label">Payback Remaining</div>
      <div class="kpi-value">${typeof paybackMonths === 'number' ? paybackMonths + 'mo' : paybackMonths}</div>
      <div class="kpi-sub">Est. months to breakeven</div>
    </div>`;

  // Per-apt
  const labels = [], investData = [], collectData = [];
  const tbody = document.querySelector('#table-roi tbody');
  tbody.innerHTML = '';

  apts.forEach(a => {
    const collected = payments.filter(p => p.apartmentId === a.id && p.status === 'paid').reduce((s, p) => s + p.amount, 0);
    const roi_pct   = a.investmentCost > 0 ? ((collected / a.investmentCost) * 100).toFixed(1) : 0;
    const rem       = a.investmentCost > 0 ? Math.ceil((a.investmentCost - collected) / a.monthlyRent) : '∞';
    labels.push(a.name);
    investData.push(a.investmentCost || 0);
    collectData.push(collected);
    tbody.innerHTML += `<tr>
      <td><strong>${a.name}</strong></td>
      <td>${a.type}</td>
      <td>₱${(a.investmentCost||0).toLocaleString()}</td>
      <td>₱${collected.toLocaleString()}</td>
      <td class="${Number(roi_pct) >= 50 ? 'roi-positive' : 'roi-neutral'}">${roi_pct}%</td>
      <td>${typeof rem === 'number' ? rem + ' months' : rem}</td>
    </tr>`;
  });

  if (roiChart) roiChart.destroy();
  roiChart = new Chart(document.getElementById('chart-roi'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Investment Cost (₱)', data: investData, backgroundColor: '#e2e8f0', borderRadius: 6 },
        { label: 'Total Collected (₱)', data: collectData, backgroundColor: '#2563eb', borderRadius: 6 },
      ]
    },
    options: {
      responsive: true,
      scales: { y: { ticks: { callback: v => '₱' + v.toLocaleString() } } },
      plugins: { legend: { position: 'top' } }
    }
  });
}

// ── DELETE HELPER ─────────────────────────────
function deleteRecord(key, id, refresh) {
  document.getElementById('confirm-delete-btn').onclick = () => {
    if (key === 'tenants') {
      const tenant = getAll('tenants').find(t => t.id === id);
      if (tenant) {
        const apts = getAll('apartments');
        const ai   = apts.findIndex(a => a.id === tenant.apartmentId);
        if (ai > -1) { apts[ai].status = 'vacant'; saveAll('apartments', apts); }
      }
    }
    saveAll(key, getAll(key).filter(x => x.id !== id));
    closeModal('modal-confirm');
    refresh && refresh();
  };
  openModal('modal-confirm');
}

// ── OPEN MODAL HOOKS ─────────────────────────
document.querySelectorAll('[onclick^="openModal"]').forEach(btn => {
  const match = btn.getAttribute('onclick').match(/openModal\('(.+?)'\)/);
  if (!match) return;
  const modalId = match[1];
  btn.addEventListener('click', () => {
    if (modalId === 'modal-apt') {
      document.getElementById('apt-id').value = '';
      document.getElementById('form-apt').reset();
      document.getElementById('modal-apt-title').textContent = 'Add Apartment';
    }
    if (modalId === 'modal-tenant') {
      document.getElementById('tenant-id').value = '';
      document.getElementById('form-tenant').reset();
      document.getElementById('modal-tenant-title').textContent = 'Add Tenant';
      populateTenantAptSelect();
    }
    if (modalId === 'modal-my-salary') {
      document.getElementById('msal-id').value = '';
      document.getElementById('form-my-salary').reset();
      document.getElementById('msal-grade').value = '';
      document.getElementById('modal-my-salary-title').textContent = 'Log My Salary';
      const now = new Date();
      document.getElementById('msal-month').value      = now.getMonth() + 1;
      document.getElementById('msal-year').value       = now.getFullYear();
      document.getElementById('msal-basic').value      = 0;
      document.getElementById('msal-housing').value    = 0;
      document.getElementById('msal-shift').value      = 0;
      document.getElementById('msal-transport').value  = 0;
      setNumVal('msal-basic', 0); setNumVal('msal-housing', 0);
      setNumVal('msal-shift', 0); setNumVal('msal-transport', 0);
      setNumVal('msal-absent', 0); setNumVal('msal-leave', 0);
      setNumVal('msal-ot', 0); setNumVal('msal-shiftded', 0);
      setNumVal('msal-deductions', 0);
      document.getElementById('msal-total-display').textContent       = 'QAR 0';
      document.getElementById('msal-deduct-total-display').textContent = 'QAR 0';
    }
    if (modalId === 'modal-payment') {
      document.getElementById('pay-id').value = '';
      document.getElementById('form-payment').reset();
      document.getElementById('modal-payment-title').textContent = 'Log Payment';
      populatePaymentTenantSelect();
      const now = new Date();
      document.getElementById('pay-month').value = now.getMonth() + 1;
      document.getElementById('pay-year').value  = now.getFullYear();
    }
  });
});

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.add('hidden'); });
});

// ── 3D VIEWER ────────────────────────────────
let renderer3d = null, animId = null;

function view3D(aptId) {
  const apt = getAll('apartments').find(a => a.id === aptId);
  if (!apt) return;
  document.getElementById('modal-3d-title').textContent = `3D View — ${apt.name} (${apt.type})`;
  openModal('modal-3d');
  setTimeout(() => init3D(apt.type), 100);
}

function close3D() {
  if (animId)    { cancelAnimationFrame(animId); animId = null; }
  if (renderer3d){ renderer3d.dispose(); renderer3d = null; }
  closeModal('modal-3d');
}

function init3D(type) {
  if (animId)    { cancelAnimationFrame(animId); animId = null; }
  if (renderer3d){ renderer3d.dispose(); renderer3d = null; }

  const canvas = document.getElementById('canvas-3d');
  const W = canvas.clientWidth, H = canvas.clientHeight;

  const scene    = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(W, H);
  renderer.shadowMap.enabled = true;
  renderer3d = renderer;

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(10, 20, 10);
  sun.castShadow = true;
  scene.add(sun);

  // Build apartment
  const config = getAptConfig(type);
  buildApartmentScene(scene, config);

  // Camera orbit state
  let theta = Math.PI / 4, phi = 1.0, radius = 20;
  updateCamera3D(camera, theta, phi, radius, config.center);

  // Legend
  const legend = document.getElementById('viewer-legend');
  legend.innerHTML = config.rooms.map(r =>
    `<div class="legend-item"><div class="legend-dot" style="background:#${r.color.toString(16).padStart(6,'0')}"></div>${r.name}</div>`
  ).join('');

  // Mouse controls
  let mouseDown = false, prevX = 0, prevY = 0;
  canvas.addEventListener('mousedown', e => { mouseDown = true; prevX = e.clientX; prevY = e.clientY; });
  window.addEventListener('mouseup',  () => mouseDown = false);
  canvas.addEventListener('mousemove', e => {
    if (!mouseDown) return;
    theta -= (e.clientX - prevX) * 0.012;
    phi    = Math.max(0.2, Math.min(1.4, phi - (e.clientY - prevY) * 0.012));
    prevX = e.clientX; prevY = e.clientY;
    updateCamera3D(camera, theta, phi, radius, config.center);
  });
  canvas.addEventListener('wheel', e => {
    radius = Math.max(8, Math.min(40, radius + e.deltaY * 0.04));
    updateCamera3D(camera, theta, phi, radius, config.center);
    e.preventDefault();
  }, { passive: false });

  // Touch support
  let lastTouch = null;
  canvas.addEventListener('touchstart',  e => { lastTouch = e.touches[0]; });
  canvas.addEventListener('touchmove', e => {
    if (!lastTouch) return;
    theta -= (e.touches[0].clientX - lastTouch.clientX) * 0.015;
    phi    = Math.max(0.2, Math.min(1.4, phi - (e.touches[0].clientY - lastTouch.clientY) * 0.015));
    lastTouch = e.touches[0];
    updateCamera3D(camera, theta, phi, radius, config.center);
    e.preventDefault();
  }, { passive: false });

  // Animate
  function animate() {
    animId = requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();
}

function updateCamera3D(camera, theta, phi, radius, center) {
  camera.position.x = center.x + radius * Math.sin(phi) * Math.sin(theta);
  camera.position.y = center.y + radius * Math.cos(phi);
  camera.position.z = center.z + radius * Math.sin(phi) * Math.cos(theta);
  camera.lookAt(center.x, center.y, center.z);
}

// ── APARTMENT CONFIGS ─────────────────────────
function getAptConfig(type) {
  if (type === 'small') return {
    center: new THREE.Vector3(2, 0, 1.5),
    rooms: [
      { name: 'Living/Bedroom', x: 0,   z: 0,   w: 5, d: 4, color: 0x93c5fd },
      { name: 'Bathroom',       x: -1.5, z: 3,   w: 2, d: 2, color: 0x6ee7b7 },
      { name: 'Kitchen',        x: 1.5,  z: 3,   w: 3, d: 2, color: 0xfde68a },
    ],
    walls: [
      { x: 0, z: 1.5, w: 5.2, d: 0.15, h: 1.5 },   // top wall (living)
      { x: -2.5, z: 1.5, w: 0.15, d: 4.15, h: 1.5 }, // left wall
      { x: 2.5, z: 1.5, w: 0.15, d: 4.15, h: 1.5 },  // right wall
      { x: 0, z: -1.9, w: 5.2, d: 0.15, h: 1.5 },   // bottom wall
      { x: 0, z: 2.05, w: 5.2, d: 0.15, h: 1.5 },   // divider between living & wet
      { x: -0.5, z: 3, w: 0.15, d: 2.15, h: 1.5 },  // divider bath/kitchen
      { x: 0, z: 4.05, w: 5.2, d: 0.15, h: 1.5 },   // far wall
    ],
    furniture: [
      { x: 1.5, z: -0.8, w: 1.8, d: 0.9, color: 0x4b5563, label: 'bed' },
      { x: -1.0, z: -0.2, w: 1.2, d: 0.6, color: 0x78716c, label: 'sofa' },
    ]
  };

  if (type === 'medium') return {
    center: new THREE.Vector3(3.5, 0, 3),
    rooms: [
      { name: 'Living Room',  x: 0,   z: 0,  w: 5, d: 4, color: 0x93c5fd },
      { name: 'Bedroom 1',    x: -2,  z: 4.5, w: 3, d: 3, color: 0xfca5a5 },
      { name: 'Bedroom 2',    x: 2,   z: 4.5, w: 4, d: 3, color: 0xfcd34d },
      { name: 'Bathroom',     x: -2,  z: -2.5, w: 3, d: 2, color: 0x6ee7b7 },
      { name: 'Kitchen',      x: 2,   z: -2.5, w: 4, d: 2, color: 0xfde68a },
    ],
    walls: [
      { x: 0.5, z: 0, w: 9.2, d: 0.15, h: 1.8 },
      { x: -4.1, z: 0, w: 0.15, d: 10.2, h: 1.8 },
      { x: 4.1, z: 0, w: 0.15, d: 10.2, h: 1.8 },
      { x: 0.5, z: -4, w: 9.2, d: 0.15, h: 1.8 },
      { x: 0.5, z: 4, w: 9.2, d: 0.15, h: 1.8 },
      { x: 0.5, z: 1.9, w: 9.2, d: 0.15, h: 1.8 },
      { x: 0.5, z: -1.4, w: 9.2, d: 0.15, h: 1.8 },
      { x: -0.5, z: 3.5, w: 0.15, d: 5, h: 1.8 },
    ],
    furniture: [
      { x: -0.5, z: 0.5, w: 2, d: 1, color: 0x78716c, label: 'sofa' },
      { x: -2.5, z: 4.5, w: 1.8, d: 0.9, color: 0x4b5563, label: 'bed1' },
      { x:  2.5, z: 4.5, w: 1.8, d: 0.9, color: 0x4b5563, label: 'bed2' },
    ]
  };

  // large
  return {
    center: new THREE.Vector3(4, 0, 3),
    rooms: [
      { name: 'Living Room',   x: 0,   z: 0,  w: 6, d: 5, color: 0x93c5fd },
      { name: 'Dining',        x: 0,   z: -3.5, w: 6, d: 2, color: 0xc4b5fd },
      { name: 'Master Bedroom',x: -4,  z: 1,  w: 4, d: 4, color: 0xfca5a5 },
      { name: 'Bedroom 2',     x: -4,  z: -3, w: 4, d: 3, color: 0xfcd34d },
      { name: 'Bedroom 3',     x:  5,  z: 2,  w: 4, d: 3, color: 0xfde68a },
      { name: 'Bathroom 1',    x:  5,  z: -1, w: 4, d: 2, color: 0x6ee7b7 },
      { name: 'Bathroom 2',    x: -4,  z: -5.5, w: 2, d: 2, color: 0xa7f3d0 },
      { name: 'Kitchen',       x:  4,  z: -3.5, w: 3, d: 2, color: 0xfef3c7 },
    ],
    walls: [
      { x: 1, z: 0, w: 14.2, d: 0.15, h: 2 },
      { x: -6.1, z: 0, w: 0.15, d: 12, h: 2 },
      { x:  7.1, z: 0, w: 0.15, d: 12, h: 2 },
      { x: 1, z: -6, w: 14.2, d: 0.15, h: 2 },
      { x: 1, z:  5, w: 14.2, d: 0.15, h: 2 },
      { x: -2, z: 0, w: 0.15, d: 12, h: 2 },
      { x: 3, z: 0, w: 0.15, d: 12, h: 2 },
      { x: 1, z: -2.5, w: 6.5, d: 0.15, h: 2 },
      { x: 1, z:  -1, w: 14.2, d: 0.15, h: 2 },
    ],
    furniture: [
      { x: -0.5, z: 0.5, w: 2.5, d: 1.2, color: 0x78716c, label: 'sofa' },
      { x: -4.0, z: 1.0, w: 1.8, d: 0.9, color: 0x4b5563, label: 'master bed' },
      { x: -4.0, z: -3.0, w: 1.6, d: 0.9, color: 0x4b5563, label: 'bed2' },
      { x:  5.0, z:  2.0, w: 1.6, d: 0.9, color: 0x4b5563, label: 'bed3' },
    ]
  };
}

function buildApartmentScene(scene, config) {
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
  const floorMat= new THREE.MeshLambertMaterial({ color: 0x94a3b8 });

  // Ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshLambertMaterial({ color: 0x1e293b }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.06;
  scene.add(ground);

  // Room floors
  config.rooms.forEach(r => {
    const geo  = new THREE.BoxGeometry(r.w, 0.1, r.d);
    const mat  = new THREE.MeshLambertMaterial({ color: r.color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(r.x, 0, r.z);
    mesh.receiveShadow = true;
    scene.add(mesh);
  });

  // Walls
  config.walls.forEach(w => {
    const geo  = new THREE.BoxGeometry(w.w, w.h, w.d);
    const mesh = new THREE.Mesh(geo, wallMat);
    mesh.position.set(w.x, w.h / 2, w.z);
    mesh.castShadow = true;
    scene.add(mesh);
  });

  // Furniture
  config.furniture.forEach(f => {
    const geo  = new THREE.BoxGeometry(f.w, 0.4, f.d);
    const mat  = new THREE.MeshLambertMaterial({ color: f.color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(f.x, 0.25, f.z);
    scene.add(mesh);
  });
}

// ── MY SALARY ────────────────────────────────
function renderSalary() {
  const all      = getAll('mySalary');
  const now      = new Date();
  const thisMonth = now.getMonth() + 1;
  const thisYear  = now.getFullYear();

  // KPIs
  const thisMonthRec = all.find(s => s.month === thisMonth && s.year === thisYear);
  const ytdTotal     = all.filter(s => s.year === thisYear && s.status === 'received').reduce((sum, s) => sum + s.net, 0);
  const allTimeTotal = all.filter(s => s.status === 'received').reduce((sum, s) => sum + s.net, 0);
  const pending      = all.filter(s => s.status === 'pending').length;

  document.getElementById('salary-kpis').innerHTML = `
    <div class="kpi-card green" data-icon="💼">
      <div class="kpi-label">This Month's Salary</div>
      <div class="kpi-value">QAR ${thisMonthRec ? Number(thisMonthRec.net).toLocaleString() : '0'}</div>
      <div class="kpi-sub">${monthName(thisMonth)} ${thisYear}</div>
    </div>
    <div class="kpi-card blue" data-icon="📅">
      <div class="kpi-label">Year-to-Date (${thisYear})</div>
      <div class="kpi-value">QAR ${ytdTotal.toLocaleString()}</div>
      <div class="kpi-sub">Total received this year</div>
    </div>
    <div class="kpi-card" data-icon="🏆">
      <div class="kpi-label">All-Time Total</div>
      <div class="kpi-value">QAR ${allTimeTotal.toLocaleString()}</div>
      <div class="kpi-sub">Cumulative salary received</div>
    </div>
    <div class="kpi-card ${pending > 0 ? 'orange' : 'green'}" data-icon="⏳">
      <div class="kpi-label">Pending Months</div>
      <div class="kpi-value">${pending}</div>
      <div class="kpi-sub">Not yet received</div>
    </div>`;

  // Table with filters
  const m = document.getElementById('sal-filter-month').value;
  const y = document.getElementById('sal-filter-year').value;
  const s = document.getElementById('sal-filter-status').value;
  const filtered = all.filter(r =>
    (!m || r.month === Number(m)) &&
    (!y || r.year  === Number(y)) &&
    (!s || r.status === s)
  );
  const tbody = document.querySelector('#table-my-salary tbody');
  tbody.innerHTML = '';
  if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="13" style="text-align:center;color:var(--text-muted)">No salary records found.</td></tr>'; return; }
  [...filtered].sort((a, b) => b.year - a.year || b.month - a.month).forEach(r => {
    tbody.innerHTML += `<tr>
      <td><strong>${monthName(r.month)} ${r.year}</strong></td>
      <td>QAR ${Number(r.basic||0).toLocaleString()}</td>
      <td>QAR ${Number(r.housing||0).toLocaleString()}</td>
      <td>QAR ${Number(r.shift||0).toLocaleString()}</td>
      <td>QAR ${Number(r.transport||0).toLocaleString()}</td>
      <td><strong>QAR ${Number(r.gross).toLocaleString()}</strong></td>
      <td>${r.absent    ? 'QAR ' + Number(r.absent).toLocaleString()   : '—'}</td>
      <td>${r.leave     ? 'QAR ' + Number(r.leave).toLocaleString()    : '—'}</td>
      <td>${r.ot        ? 'QAR ' + Number(r.ot).toLocaleString()       : '—'}</td>
      <td>${r.shiftded  ? 'QAR ' + Number(r.shiftded).toLocaleString() : '—'}</td>
      <td>${r.deductions? 'QAR ' + Number(r.deductions).toLocaleString(): '—'}</td>
      <td><strong style="color:var(--success)">QAR ${Number(r.net).toLocaleString()}</strong></td>
      <td>${r.dateReceived || '—'}</td>
      <td style="max-width:140px;white-space:normal">${r.notes || '—'}</td>
      <td><span class="badge badge-${r.status === 'received' ? 'paid' : 'pending'}">${r.status}</span></td>
      <td>
        <button class="btn-icon" onclick="editMySalary(${r.id})" title="Edit">✏️</button>
        <button class="btn-icon" onclick="markSalaryReceived(${r.id})" title="Mark Received">✅</button>
        <button class="btn-icon" onclick="deleteRecord('mySalary', ${r.id}, renderSalary)" title="Delete">🗑️</button>
      </td>
    </tr>`;
  });
}

function markSalaryReceived(id) {
  const all = getAll('mySalary');
  const idx = all.findIndex(s => s.id === id);
  if (idx > -1) {
    all[idx].status       = 'received';
    all[idx].dateReceived = new Date().toISOString().split('T')[0];
    saveAll('mySalary', all);
    renderSalary();
  }
}

const SALARY_GRADES = {
  '110': 11950,
  '108': 7550,
};

function applySalaryGrade() {
  const grade = document.getElementById('msal-grade').value;
  if (!grade) return;
  setNumVal('msal-basic', SALARY_GRADES[grade]);
  calcSalaryTotal();
}

function calcSalaryTotal() {
  const basic     = numVal('msal-basic');
  const housing   = numVal('msal-housing');
  const shift     = numVal('msal-shift');
  const transport = numVal('msal-transport');
  const absent    = numVal('msal-absent');
  const leave     = numVal('msal-leave');
  const ot        = numVal('msal-ot');
  const shiftded  = numVal('msal-shiftded');
  const deduct    = numVal('msal-deductions');
  const gross     = basic + housing + shift + transport;
  const totalDeduct = absent + leave + ot + shiftded + deduct;
  document.getElementById('msal-gross').value = gross;
  document.getElementById('msal-total-display').textContent    = 'QAR ' + gross.toLocaleString();
  document.getElementById('msal-deduct-total-display').textContent = 'QAR ' + totalDeduct.toLocaleString();
}

document.getElementById('form-my-salary').addEventListener('submit', e => {
  e.preventDefault();
  const all    = getAll('mySalary');
  const id        = document.getElementById('msal-id').value;
  const basic     = numVal('msal-basic');
  const housing   = numVal('msal-housing');
  const shift     = numVal('msal-shift');
  const transport = numVal('msal-transport');
  const gross     = basic + housing + shift + transport;
  const absent    = numVal('msal-absent');
  const leave     = numVal('msal-leave');
  const ot        = numVal('msal-ot');
  const shiftded  = numVal('msal-shiftded');
  const deduct    = numVal('msal-deductions');
  const totalDeduct = absent + leave + ot + shiftded + deduct;
  const obj = {
    month:        Number(document.getElementById('msal-month').value),
    year:         Number(document.getElementById('msal-year').value),
    basic, housing, shift, transport,
    gross,
    absent, leave, ot, shiftded, deductions: deduct,
    net:          gross - totalDeduct,
    dateReceived: document.getElementById('msal-date').value,
    status:       document.getElementById('msal-status').value,
    notes:        document.getElementById('msal-notes').value,
  };
  if (id) {
    const idx = all.findIndex(s => s.id === Number(id));
    all[idx] = { ...all[idx], ...obj };
  } else {
    obj.id = nextId('mySalary');
    all.push(obj);
  }
  saveAll('mySalary', all);
  closeModal('modal-my-salary');
  renderSalary();
});

function editMySalary(id) {
  const r = getAll('mySalary').find(x => x.id === id);
  // Pre-select grade if basic matches a known grade
  const matchedGrade = Object.entries(SALARY_GRADES).find(([, v]) => v === (r.basic || 0));
  document.getElementById('msal-grade').value = matchedGrade ? matchedGrade[0] : '';
  document.getElementById('msal-id').value         = r.id;
  document.getElementById('msal-month').value      = r.month;
  document.getElementById('msal-year').value       = r.year;
  setNumVal('msal-basic',       r.basic);
  setNumVal('msal-housing',     r.housing);
  setNumVal('msal-shift',       r.shift);
  setNumVal('msal-transport',   r.transport);
  setNumVal('msal-absent',      r.absent);
  setNumVal('msal-leave',       r.leave);
  setNumVal('msal-ot',          r.ot);
  setNumVal('msal-shiftded',    r.shiftded);
  setNumVal('msal-deductions',  r.deductions);
  document.getElementById('msal-date').value       = r.dateReceived || '';
  document.getElementById('msal-status').value     = r.status;
  document.getElementById('msal-notes').value      = r.notes || '';
  document.getElementById('modal-my-salary-title').textContent = 'Edit Salary Record';
  calcSalaryTotal();
  openModal('modal-my-salary');
}

// ── OCR / SALARY SLIP READER ─────────────────
let slipFileData = null;

function onSlipFileSelected(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    slipFileData = ev.target.result;
    document.getElementById('slip-preview-img').src = slipFileData;
    document.getElementById('slip-preview-wrap').classList.remove('hidden');
    document.getElementById('upload-drop-zone').classList.add('hidden');
  };
  reader.readAsDataURL(file);
}

// Drag & drop support
document.addEventListener('DOMContentLoaded', () => {
  const zone = document.getElementById('upload-drop-zone');
  if (!zone) return;
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const dt = new DataTransfer();
      dt.items.add(file);
      document.getElementById('slip-file-input').files = dt.files;
      onSlipFileSelected({ target: { files: [file] } });
    }
  });
});

function resetUpload() {
  slipFileData = null;
  document.getElementById('slip-file-input').value = '';
  document.getElementById('slip-preview-wrap').classList.add('hidden');
  document.getElementById('upload-drop-zone').classList.remove('hidden');
  document.getElementById('slip-step-upload').classList.remove('hidden');
  document.getElementById('slip-step-processing').classList.add('hidden');
  document.getElementById('slip-step-review').classList.add('hidden');
  document.getElementById('ocr-currency-banner').classList.add('hidden');
}

function closeUploadSlip() {
  resetUpload();
  closeModal('modal-upload-slip');
}

async function runOCR() {
  if (!slipFileData) return;
  document.getElementById('slip-step-upload').classList.add('hidden');
  document.getElementById('slip-step-processing').classList.remove('hidden');

  try {
    const imageData = slipFileData; // local copy for OCR only

    const { data: { text } } = await Tesseract.recognize(imageData, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          const pct = Math.round(m.progress * 100);
          document.getElementById('ocr-status').textContent = `Reading text... ${pct}%`;
          document.getElementById('ocr-progress-fill').style.width = pct + '%';
        } else {
          document.getElementById('ocr-status').textContent = m.status.charAt(0).toUpperCase() + m.status.slice(1) + '...';
        }
      }
    });

    // ── Wipe image from memory immediately after OCR ──
    slipFileData = null;
    document.getElementById('slip-preview-img').src = '';
    document.getElementById('slip-file-input').value = '';

    document.getElementById('slip-step-processing').classList.add('hidden');
    document.getElementById('slip-step-review').classList.remove('hidden');
    document.getElementById('ocr-raw-text').textContent = text;

    // Parse extracted text into salary fields
    parseOCRText(text);

  } catch (err) {
    document.getElementById('ocr-status').textContent = 'Error reading image. Please try a clearer photo.';
    console.error(err);
  }
}

function parseOCRText(text) {
  const clean = text.toLowerCase(); // keep commas — normalizeAmount handles them per-number

  // ── Currency detection ────────────────────────
  const isQAR = /\bqar\b|﷼|qatar\s*riyal/i.test(text);
  const isPHP = /₱|\bphp\b|philippine\s*peso/i.test(text);
  const qarRate = getQARRate();
  // Salary is stored in QAR — QAR slips use rate 1, PHP slips convert PHP→QAR
  const rate = isPHP && !isQAR ? (1 / qarRate) : 1;

  const cached    = db('qar_rate');
  const rateLabel = cached ? `${qarRate.toFixed(2)} (rate as of ${cached.date})` : `${qarRate.toFixed(2)} (fallback)`;

  const banner = document.getElementById('ocr-currency-banner');
  if (isPHP && !isQAR) {
    banner.textContent = `💱 Philippine Peso (PHP) detected — converted to QAR at 1 QAR = ₱${rateLabel}`;
    banner.className = 'ocr-currency-banner ocr-currency-php';
    banner.classList.remove('hidden');
  } else if (isQAR) {
    banner.textContent = `🇶🇦 Qatar Riyal (QAR) detected — values stored directly in QAR`;
    banner.className = 'ocr-currency-banner ocr-currency-qar';
    banner.classList.remove('hidden');
  } else {
    banner.textContent = '🇶🇦 Currency not detected — assuming Qatar Riyal (QAR)';
    banner.className = 'ocr-currency-banner ocr-currency-qar';
    banner.classList.remove('hidden');
  }

  // Normalize a raw OCR number string — handles both US (1,234.56) and European (1.234,56) formats
  function normalizeAmount(str) {
    str = str.trim();
    const hasDot   = str.includes('.');
    const hasComma = str.includes(',');
    if (hasDot && hasComma) {
      // Whichever separator comes last is the decimal point
      if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
        // European: 1.234,56 → remove dots, comma becomes decimal
        str = str.replace(/\./g, '').replace(',', '.');
      } else {
        // US/QAR: 1,234.56 → remove commas
        str = str.replace(/,/g, '');
      }
    } else if (hasComma && !hasDot) {
      // Comma only — decimal if exactly 2 digits follow it (e.g. 5250,75), else thousands (e.g. 5,250)
      str = /,\d{2}$/.test(str) ? str.replace(',', '.') : str.replace(/,/g, '');
    }
    // dot only → standard decimal, no change needed
    return str;
  }

  // Helper: find the first number after a keyword match
  // Captures full number token including commas/dots for proper decimal handling
  function extract(patterns) {
    for (const pat of patterns) {
      const re = new RegExp(pat + '[\\s:=|]+(?:qar|₱|php|﷼|sr|riyals?)?\\s*([\\d][\\d,. ]*)', 'i');
      const m  = clean.match(re);
      if (m) {
        const raw = normalizeAmount(m[1].replace(/\s/g, ''));
        const val = parseFloat(raw);
        if (!isNaN(val)) return Math.round(val * rate * 100) / 100;
      }
    }
    return 0;
  }

  const basic     = extract(['basic salary', 'basic pay', 'basic wage', 'basic']);
  const housing   = extract(['housing allowance', 'house allowance', 'housing', 'hra']);
  const shift     = extract(['shift allowance', 'shift diff', 'shift']);
  const transport = extract(['transportation allowance', 'transport allowance', 'transportation', 'transport', 'travel allowance']);
  const absent    = extract(['absent hours deduction', 'absent hours', 'absent deduction', 'absent']);
  const leave     = extract(['leave advance deduction', 'leave advance', 'leave deduction', 'leave']);
  const ot        = extract(['regular ot deduction', 'regular ot', 'ot deduction', 'overtime deduction', 'overtime']);
  const shiftded  = extract(['shift allowance deduction', 'shift deduction', 'shift ded']);
  const deduct    = extract(['other deduction', 'total deduction', 'deductions', 'deduction', 'sss', 'philhealth', 'pagibig']);

  // Try to detect date (month/year)
  const dateMatch = text.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[^\d]*(\d{4})/i);
  if (dateMatch) {
    const months = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
    const mKey = dateMatch[1].toLowerCase().slice(0,3);
    document.getElementById('ocr-month').value = months[mKey] || new Date().getMonth() + 1;
    document.getElementById('ocr-year').value  = dateMatch[2];
  } else {
    const now = new Date();
    document.getElementById('ocr-month').value = now.getMonth() + 1;
    document.getElementById('ocr-year').value  = now.getFullYear();
  }

  // Try to detect date received (DD/MM/YYYY or YYYY-MM-DD)
  const dateReceived = text.match(/\b(\d{4}-\d{2}-\d{2})\b/) || text.match(/\b(\d{2}\/\d{2}\/\d{4})\b/);
  if (dateReceived) {
    let d = dateReceived[1];
    if (d.includes('/')) {
      const [dd, mm, yyyy] = d.split('/');
      d = `${yyyy}-${mm}-${dd}`;
    }
    document.getElementById('ocr-date').value = d;
  }

  setNumVal('ocr-basic',       basic);
  setNumVal('ocr-housing',     housing);
  setNumVal('ocr-shift',       shift);
  setNumVal('ocr-transport',   transport);
  setNumVal('ocr-absent',      absent);
  setNumVal('ocr-leave',       leave);
  setNumVal('ocr-ot',          ot);
  setNumVal('ocr-shiftded',    shiftded);
  setNumVal('ocr-deductions',  deduct);
  calcOCRTotal();
}

function calcOCRTotal() {
  const basic     = numVal('ocr-basic');
  const housing   = numVal('ocr-housing');
  const shift     = numVal('ocr-shift');
  const transport = numVal('ocr-transport');
  const absent    = numVal('ocr-absent');
  const leave     = numVal('ocr-leave');
  const ot        = numVal('ocr-ot');
  const shiftded  = numVal('ocr-shiftded');
  const deduct    = numVal('ocr-deductions');
  const gross     = basic + housing + shift + transport;
  const totalDeduct = absent + leave + ot + shiftded + deduct;
  document.getElementById('ocr-total-display').textContent       = 'QAR ' + gross.toLocaleString();
  document.getElementById('ocr-deduct-total-display').textContent = 'QAR ' + totalDeduct.toLocaleString();
}

function applyOCRValues() {
  // Copy OCR values into the main Log Salary form
  const now = new Date();
  document.getElementById('msal-month').value      = document.getElementById('ocr-month').value;
  document.getElementById('msal-year').value       = document.getElementById('ocr-year').value;
  setNumVal('msal-basic',      numVal('ocr-basic'));
  setNumVal('msal-housing',    numVal('ocr-housing'));
  setNumVal('msal-shift',      numVal('ocr-shift'));
  setNumVal('msal-transport',  numVal('ocr-transport'));
  setNumVal('msal-absent',     numVal('ocr-absent'));
  setNumVal('msal-leave',      numVal('ocr-leave'));
  setNumVal('msal-ot',         numVal('ocr-ot'));
  setNumVal('msal-shiftded',   numVal('ocr-shiftded'));
  setNumVal('msal-deductions', numVal('ocr-deductions'));
  document.getElementById('msal-date').value       = document.getElementById('ocr-date').value;
  document.getElementById('msal-status').value     = 'received';
  calcSalaryTotal();

  closeUploadSlip();
  document.getElementById('modal-my-salary-title').textContent = 'Log Salary (from slip)';
  openModal('modal-my-salary');
}

// ── OT CALCULATOR ────────────────────────────
const OT_MULTIPLIER      = 1.25;
const MONTHLY_TO_HOURLY  = 0.0058333;

function calcOT() {
  const basic = numVal('ot-basic');
  const hours = Number(document.getElementById('ot-hours').value) || 0;

  const hourlyRate   = basic * MONTHLY_TO_HOURLY;
  const otHourlyRate = hourlyRate * OT_MULTIPLIER;
  const totalOT      = otHourlyRate * hours;

  document.getElementById('ot-bd-basic').textContent       = 'QAR ' + fmtN(basic);
  document.getElementById('ot-bd-hourly').textContent      = 'QAR ' + fmtN(hourlyRate, 4);
  document.getElementById('ot-bd-ot-hourly').textContent   = 'QAR ' + fmtN(otHourlyRate, 4);
  document.getElementById('ot-bd-hours-label').textContent = hours;
  document.getElementById('ot-bd-total').textContent       = 'QAR ' + fmtN(totalOT, 2);
}

function setOTGrade(basic, btn) {
  setNumVal('ot-basic', basic);
  document.querySelectorAll('.ot-grade-btn').forEach(b => b.classList.remove('ot-grade-btn-active'));
  btn.classList.add('ot-grade-btn-active');
  calcOT();
}

function otCalcPay(basic, hours) {
  return Math.round(basic * MONTHLY_TO_HOURLY * OT_MULTIPLIER * hours * 100) / 100;
}

function saveOTLog() {
  const basic = numVal('ot-basic');
  const hours = Number(document.getElementById('ot-hours').value) || 0;
  const month = Number(document.getElementById('ot-month').value);
  const year  = Number(document.getElementById('ot-year').value);
  if (!basic || !hours) { alert('Enter a Basic Salary and OT Hours first.'); return; }

  const all = getAll('otLogs');
  const existing = all.findIndex(l => l.month === month && l.year === year);
  const otPay = otCalcPay(basic, hours);

  if (existing > -1) {
    if (!confirm(`A log for ${monthName(month)} ${year} already exists. Replace it?`)) return;
    all[existing] = { ...all[existing], basic, hours, otPay, addendums: all[existing].addendums || [] };
  } else {
    all.push({ id: nextId('otLogs'), month, year, basic, hours, otPay, addendums: [] });
  }
  saveAll('otLogs', all);
  renderOTLogs();
}

function renderOTLogs() {
  const all = getAll('otLogs');
  const now = new Date();
  const thisMonth = now.getMonth() + 1;
  const thisYear  = now.getFullYear();

  // KPIs
  const thisRec     = all.find(l => l.month === thisMonth && l.year === thisYear);
  const thisTotal   = thisRec ? (thisRec.otPay + (thisRec.addendums||[]).reduce((s,a)=>s+a.pay,0)) : 0;
  const ytd         = all.filter(l => l.year === thisYear).reduce((s,l) => s + l.otPay + (l.addendums||[]).reduce((a,x)=>a+x.pay,0), 0);
  const allTime     = all.reduce((s,l) => s + l.otPay + (l.addendums||[]).reduce((a,x)=>a+x.pay,0), 0);
  const addCount    = all.reduce((s,l) => s + (l.addendums||[]).length, 0);

  document.getElementById('ot-log-kpis').innerHTML = `
    <div class="kpi-card green" data-icon="⏱️">
      <div class="kpi-label">This Month OT</div>
      <div class="kpi-value">QAR ${fmtN(thisTotal, 2)}</div>
      <div class="kpi-sub">${monthName(thisMonth)} ${thisYear}</div>
    </div>
    <div class="kpi-card blue" data-icon="📅">
      <div class="kpi-label">Year-to-Date OT (${thisYear})</div>
      <div class="kpi-value">QAR ${fmtN(ytd, 2)}</div>
      <div class="kpi-sub">All months this year</div>
    </div>
    <div class="kpi-card" data-icon="🏆">
      <div class="kpi-label">All-Time OT Total</div>
      <div class="kpi-value">QAR ${fmtN(allTime, 2)}</div>
      <div class="kpi-sub">Every logged month</div>
    </div>
    <div class="kpi-card orange" data-icon="➕">
      <div class="kpi-label">Total Addendums</div>
      <div class="kpi-value">${addCount}</div>
      <div class="kpi-sub">Extra OT entries</div>
    </div>`;

  const tbody = document.querySelector('#table-ot-logs tbody');
  tbody.innerHTML = '';
  if (!all.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">No OT logs yet. Calculate OT above and save.</td></tr>';
    return;
  }
  [...all].sort((a,b) => b.year - a.year || b.month - a.month).forEach(l => {
    const addendums   = l.addendums || [];
    const addTotal    = addendums.reduce((s,a) => s + a.pay, 0);
    const grandTotal  = l.otPay + addTotal;
    const addBadge    = addendums.length
      ? `<span class="ot-addendum-badge">+${addendums.length} · QAR ${fmtN(addTotal, 2)}</span>`
      : '<span style="color:var(--text-muted)">—</span>';
    tbody.innerHTML += `<tr>
      <td><strong>${monthName(l.month)} ${l.year}</strong></td>
      <td>QAR ${fmtN(l.basic)}</td>
      <td>${l.hours} hrs</td>
      <td>QAR ${fmtN(l.otPay, 2)}</td>
      <td>${addBadge}</td>
      <td><strong style="color:var(--success)">QAR ${fmtN(grandTotal, 2)}</strong></td>
      <td>
        <button class="btn-icon" onclick="openAddendum(${l.id})" title="Add Addendum">➕</button>
        <button class="btn-icon" onclick="deleteRecord('otLogs',${l.id},renderOTLogs)" title="Delete">🗑️</button>
      </td>
    </tr>`;
  });
}

function openAddendum(logId) {
  const log = getAll('otLogs').find(l => l.id === logId);
  if (!log) return;
  document.getElementById('ot-addendum-log-id').value = logId;
  document.getElementById('ot-addendum-title').textContent = `OT Addendum — ${monthName(log.month)} ${log.year}`;
  document.getElementById('ot-addendum-base').textContent  = 'QAR ' + fmtN(log.otPay, 2);
  document.getElementById('ot-add-hours').value  = 0;
  document.getElementById('ot-add-preview').value = 'QAR 0.00';
  document.getElementById('ot-add-notes').value  = '';

  // Render existing addendums
  const addendums = log.addendums || [];
  const wrap = document.getElementById('ot-addendum-existing');
  if (addendums.length) {
    wrap.innerHTML = `<div class="salary-breakdown" style="margin-bottom:.75rem">
      <div class="salary-breakdown-title">Existing Addendums</div>
      ${addendums.map((a,i) => `
        <div class="ot-step" style="margin-top:.4rem">
          <span class="ot-step-label">#${i+1} · ${a.hours} hrs${a.notes ? ' — ' + a.notes : ''}</span>
          <span class="ot-step-value">QAR ${fmtN(a.pay, 2)}
            <button class="btn-icon" style="margin-left:.5rem" onclick="deleteAddendum(${logId},${i})" title="Remove">🗑️</button>
          </span>
        </div>`).join('')}
    </div>`;
  } else {
    wrap.innerHTML = '';
  }
  openModal('modal-ot-addendum');
}

function calcAddendumPreview() {
  const logId = Number(document.getElementById('ot-addendum-log-id').value);
  const log   = getAll('otLogs').find(l => l.id === logId);
  const hours = Number(document.getElementById('ot-add-hours').value) || 0;
  const pay   = log ? otCalcPay(log.basic, hours) : 0;
  document.getElementById('ot-add-preview').value = 'QAR ' + fmtN(pay, 2);
}

function saveAddendum() {
  const logId = Number(document.getElementById('ot-addendum-log-id').value);
  const hours = Number(document.getElementById('ot-add-hours').value) || 0;
  const notes = document.getElementById('ot-add-notes').value.trim();
  if (!hours) { alert('Enter extra OT hours.'); return; }

  const all = getAll('otLogs');
  const idx = all.findIndex(l => l.id === logId);
  if (idx === -1) return;
  const pay = otCalcPay(all[idx].basic, hours);
  all[idx].addendums = all[idx].addendums || [];
  all[idx].addendums.push({ hours, pay, notes, date: new Date().toISOString().slice(0,10) });
  saveAll('otLogs', all);
  closeModal('modal-ot-addendum');
  renderOTLogs();
}

function deleteAddendum(logId, addIdx) {
  const all = getAll('otLogs');
  const idx = all.findIndex(l => l.id === logId);
  if (idx === -1) return;
  all[idx].addendums.splice(addIdx, 1);
  saveAll('otLogs', all);
  openAddendum(logId); // re-render modal
  renderOTLogs();
}

// ── QAR → PHP LIVE RATE ───────────────────────
const QAR_FALLBACK = 15.50;

function getQARRate() {
  const cached = db('qar_rate');
  if (cached && cached.date === new Date().toISOString().slice(0, 10)) {
    return cached.rate;
  }
  return QAR_FALLBACK;
}

async function refreshQARRate() {
  const today = new Date().toISOString().slice(0, 10);
  const cached = db('qar_rate');
  if (cached && cached.date === today) return; // already up to date

  try {
    const res  = await fetch('https://api.frankfurter.app/latest?from=QAR&to=PHP');
    const json = await res.json();
    const rate = json.rates && json.rates.PHP;
    if (rate) {
      db('qar_rate', { rate: Math.round(rate * 100) / 100, date: today });
      console.log(`[MoneyFlow] QAR→PHP rate updated: 1 QAR = ₱${rate.toFixed(2)} (${today})`);
    }
  } catch (e) {
    console.warn('[MoneyFlow] Could not fetch QAR rate, using fallback ₱' + QAR_FALLBACK);
  }
}

// ── UTILITY ──────────────────────────────────
function monthName(n) {
  return ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][n] || '?';
}

// ── BOOT ─────────────────────────────────────
refreshQARRate();
// Default OT month/year selectors to current month
(function() {
  const now = new Date();
  document.getElementById('ot-month').value = now.getMonth() + 1;
  document.getElementById('ot-year').value  = now.getFullYear();
})();
