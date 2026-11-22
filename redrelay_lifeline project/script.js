
const GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Educational compatibility demonstration only.
// Actual transfusion compatibility must be verified by a hospital.
const compat = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-']
};

// Demo donors
const seedDonors = [
  ['Riya','B+','Uppal','******4821'],
  ['Arjun','O-','Secunderabad','******1183'],
  ['Maya','A+','Miyapur','******9320'],
  ['Kiran','B-','Kukatpally','******3056'],
  ['Dev','O+','Hitech City','******6014'],
  ['Sara','AB+','Uppal','******7352'],
  ['Nikhil','A-','Secunderabad','******2951'],
  ['Ananya','O-','Miyapur','******0094'],
  ['Rahul','B+','Kukatpally','******8751'],
  ['Isha','O+','Uppal','******7330'],
  ['Vikram','AB-','Hitech City','******4092'],
  ['Meera','A+','Secunderabad','******5107']
].map((d, i) => ({
  id: 'D' + (i + 1),
  name: d[0],
  blood: d[1],
  area: d[2],
  phone: d[3],
  available: true,
  lastDonation: '',
  donations: []
}));

// Demo requests
const seedRequests = [
  {
    id:'R1001', patient:'Demo Patient 1',
    hospital:'City Care Hospital', area:'Uppal',
    blood:'B+', units:2, urgency:'Critical',
    deadline:'', verification:'Hospital desk (demo)',
    note:'Sample request only', status:'Open',
    responses:[], created:Date.now()-3600000
  },
  {
    id:'R1002', patient:'Demo Patient 2',
    hospital:'Metro Medical Center', area:'Secunderabad',
    blood:'O-', units:1, urgency:'High',
    deadline:'', verification:'Hospital desk (demo)',
    note:'Sample request only', status:'Broadcasted',
    responses:[], created:Date.now()-7200000
  },
  {
    id:'R1003', patient:'Demo Patient 3',
    hospital:'Sunrise Hospital', area:'Miyapur',
    blood:'A+', units:3, urgency:'Normal',
    deadline:'', verification:'Hospital desk (demo)',
    note:'Sample request only', status:'Open',
    responses:[], created:Date.now()-10800000
  },
  {
    id:'R1004', patient:'Demo Patient 4',
    hospital:'CarePlus Clinic', area:'Kukatpally',
    blood:'AB-', units:1, urgency:'High',
    deadline:'', verification:'Hospital desk (demo)',
    note:'Sample request only', status:'Donors Responded',
    responses:[], created:Date.now()-14400000
  },
  {
    id:'R1005', patient:'Demo Patient 5',
    hospital:'Life Hospital', area:'Hitech City',
    blood:'O+', units:2, urgency:'Critical',
    deadline:'', verification:'Hospital desk (demo)',
    note:'Sample request only', status:'Fulfilled',
    responses:[], created:Date.now()-18000000
  }
];

// Load saved data
function requestLoad(key, seed) {
  try {
    const value = localStorage.getItem('redrelay_' + key);
    return value ? JSON.parse(value) : seed;
  } catch {
    return seed;
  }
}

let donors = requestLoad('donors', seedDonors);
let requests = requestLoad('requests', seedRequests);
let donations = requestLoad('donations', []);
let smsLog = requestLoad('smsLog', []);

// Save data
function save() {
  localStorage.setItem('redrelay_donors', JSON.stringify(donors));
  localStorage.setItem('redrelay_requests', JSON.stringify(requests));
  localStorage.setItem('redrelay_donations', JSON.stringify(donations));
  localStorage.setItem('redrelay_smsLog', JSON.stringify(smsLog));
  renderAll();
}

// Escape unsafe text
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c]));
}

// Notification
function toast(msg) {
  let t = document.querySelector('.toast');
  if (t) t.remove();

  t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.append(t);

  setTimeout(() => t.remove(), 2800);
}

// Donor matching
function matchDonors(request) {
  return donors.filter(d =>
    d.available &&
    compat[request.blood]?.includes(d.blood) &&
    (!d.lastDonation || daysSince(d.lastDonation) >= 90)
  ).sort((a, b) =>
    a.area.toLowerCase() === request.area.toLowerCase() ? -1 : 1
  );
}

function daysSince(date) {
  return Math.floor(
    (Date.now() - new Date(date + 'T00:00:00').getTime()) / 86400000
  );
}

// Request card
function card(r) {
  const matches = matchDonors(r);

  return `
  <article class="cardrow">
    <div class="panelhead">
      <h3>${esc(r.hospital)}</h3>
      <span class="tag ${r.urgency === 'Critical' ? 'critical' : ''}">
        ${esc(r.urgency)}
      </span>
    </div>

    <p>
      <b>Patient:</b> ${esc(r.patient)}
      • <b>Group:</b> ${esc(r.blood)}
      • <b>Units:</b> ${r.units}
    </p>

    <p>
      <b>Locality:</b> ${esc(r.area)}
      • <b>Status:</b> ${esc(r.status)}
    </p>

    <div class="tags">
      <span class="tag">${matches.length} matching demo donors</span>
      <span class="tag">${esc(r.status)}</span>
    </div>

    <div class="actions">
      <button class="small" onclick="showMatches('${r.id}')">
        View matches
      </button>

      <button class="small" onclick="simulateSMS('${r.id}')">
        Simulate SMS
      </button>

      <button class="small" onclick="advance('${r.id}')">
        Advance status
      </button>

      <button class="small" onclick="details('${r.id}')">
        Details
      </button>
    </div>
  </article>`;
}

// Render emergency requests
function renderRequests() {
  const q = (document.getElementById('requestSearch')?.value || '').toLowerCase();
  const b = document.getElementById('requestBlood')?.value || '';
  const u = document.getElementById('requestUrgency')?.value || '';

  const list = requests.filter(r =>
    (!q || (r.area + ' ' + r.hospital + ' ' + r.patient).toLowerCase().includes(q)) &&
    (!b || r.blood === b) &&
    (!u || r.urgency === u)
  ).sort((a, b) =>
    ({Critical:0, High:1, Normal:2}[a.urgency] -
     {Critical:0, High:1, Normal:2}[b.urgency])
  );

  document.getElementById('requestList').innerHTML =
    list.length
      ? list.map(card).join('')
      : '<p class="muted">No requests match these filters.</p>';
}

// Render donors
function renderDonors() {
  const q = (document.getElementById('donorSearch')?.value || '').toLowerCase();
  const b = document.getElementById('donorBlood')?.value || '';

  const list = donors.filter(d =>
    (!q || d.area.toLowerCase().includes(q)) &&
    (!b || d.blood === b)
  );

  document.getElementById('donorList').innerHTML =
    list.map(d => `
      <article class="cardrow donorline">
        <div>
          <b>${esc(d.name)}</b>
          <p>
            ${esc(d.blood)} • ${esc(d.area)}
            • <span class="mutedline">${esc(d.phone)}</span>
          </p>

          <span class="tag ${d.available ? 'available' : ''}">
            ${d.available ? 'Available' : 'Unavailable'}
          </span>
        </div>

        <div class="actions">
          <button class="small" onclick="toggleDonor('${d.id}')">
            Toggle availability
          </button>

          <button class="small" onclick="donorInfo('${d.id}')">
            Donation history
          </button>
        </div>
      </article>
    `).join('') || '<p>No donors found.</p>';

  const select = document.getElementById('donationDonor');

  if (select) {
    select.innerHTML =
      '<option value="">Select donor</option>' +
      donors.map(d =>
        `<option value="${d.id}">${esc(d.name)} • ${d.blood}</option>`
      ).join('');
  }
}

// Dashboard metrics
function renderMetrics() {
  const open = requests.filter(r =>
    !['Fulfilled', 'Closed'].includes(r.status)
  ).length;

  const fulfilled = requests.filter(r =>
    ['Fulfilled', 'Closed'].includes(r.status)
  ).length;

  document.getElementById('metrics').innerHTML = [
    ['Open requests', open],
    ['Registered donors', donors.length],
    ['Fulfilled / closed', fulfilled],
    ['SMS simulations', smsLog.length]
  ].map(x => `
    <div class="metric">
      <small>${x[0]}</small>
      <strong>${x[1]}</strong>
    </div>
  `).join('');

  document.getElementById('footCount').textContent =
    `${donors.length} sample donors • ${requests.length} sample requests`;
}

// Dashboard request list
function renderDashboard() {
  document.getElementById('dashRequests').innerHTML =
    requests.filter(r =>
      !['Fulfilled', 'Closed'].includes(r.status)
    ).slice(0, 3).map(card).join('') ||
    '<p>No open requests.</p>';
}

// Donation history
function renderTracker() {
  const html = donations.map(d => `
    <article class="cardrow">
      <b>${esc(donorName(d.donorId))}</b>
      • ${esc(d.date)}
      <span class="tag">
        Reminder date: ${esc(addDays(d.date, 90))}
      </span>
    </article>
  `).join('');

  document.getElementById('donationList').innerHTML =
    html || '<p class="muted">No donation entries yet.</p>';
}

function donorName(id) {
  return donors.find(d => d.id === id)?.name || 'Removed donor';
}

function addDays(date, n) {
  let dt = new Date(date + 'T00:00:00');
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}

// Admin panel
function renderAdmin() {
  document.getElementById('adminStats').innerHTML = `
    <p>
      <b>${donors.length}</b> donors •
      <b>${requests.length}</b> requests •
      <b>${smsLog.length}</b> simulated dispatches
    </p>
  `;

  document.getElementById('adminList').innerHTML =
    requests.map(r => `
      <article class="cardrow">
        <b>${esc(r.id)} — ${esc(r.hospital)}</b>
        <p>${esc(r.blood)} • ${esc(r.status)}</p>

        <div class="actions">
          <button class="small" onclick="setStatus('${r.id}','Fulfilled')">
            Mark fulfilled
          </button>

          <button class="small" onclick="setStatus('${r.id}','Closed')">
            Close request
          </button>

          <button class="small" onclick="deleteRequest('${r.id}')">
            Delete demo request
          </button>
        </div>
      </article>
    `).join('');
}

// Render everything
function renderAll() {
  renderMetrics();
  renderRequests();
  renderDonors();
  renderDashboard();
  renderTracker();
  renderAdmin();
}

// View matches
function showMatches(id) {
  const r = requests.find(x => x.id === id);
  if (!r) return;

  const m = matchDonors(r);

  openModal(`
    <h2>Compatible demo donors</h2>
    <p>
      For request ${esc(r.id)} (${esc(r.blood)}).
      Compatibility must be confirmed by hospital staff.
    </p>

    ${m.map(d => `
      <article class="cardrow">
        <b>${esc(d.name)}</b>
        <p>${esc(d.blood)} • ${esc(d.area)} • ${esc(d.phone)}</p>

        <button class="small" onclick="respond('${r.id}','${d.id}')">
          Record volunteer response
        </button>
      </article>
    `).join('') || '<p>No demo donors match.</p>'}
  `);
}

// Record response
function respond(rid, did) {
  let r = requests.find(x => x.id === rid);
  let d = donors.find(x => x.id === did);

  if (!r || !d) return;

  if (!r.responses.includes(did)) {
    r.responses.push(did);
  }

  if (r.status === 'Open' || r.status === 'Broadcasted') {
    r.status = 'Donors Responded';
  }

  toast('Volunteer response recorded in demo');
  save();
  closeModal();
}

// Advance request
function advance(id) {
  let r = requests.find(x => x.id === id);
  if (!r) return;

  const stages = [
    'Open',
    'Broadcasted',
    'Donors Responded',
    'Fulfilled',
    'Closed'
  ];

  r.status = stages[
    Math.min(stages.indexOf(r.status) + 1, stages.length - 1)
  ];

  toast('Request status: ' + r.status);
  save();
}

// Admin status update
function setStatus(id, s) {
  let r = requests.find(x => x.id === id);

  if (r) {
    r.status = s;
    save();
    toast('Status updated');
  }
}

// Delete request
function deleteRequest(id) {
  if (confirm('Delete this demo request?')) {
    requests = requests.filter(r => r.id !== id);
    save();
  }
}

// SMS simulator
function simulateSMS(id) {
  const r = requests.find(x => x.id === id);
  if (!r) return;

  const list = matchDonors(r);

  smsLog.unshift({
    id: 'S' + Date.now(),
    requestId: id,
    date: new Date().toLocaleString(),
    count: list.length
  });

  openModal(`
    <h2>SMS dispatch simulation</h2>

    <p><b>${list.length}</b> matching demo donors.</p>
    <p>No actual messages or phone calls were sent.</p>
    <p>Request: ${esc(r.hospital)} • ${esc(r.blood)}</p>

    <button class="primary" onclick="closeModal()">Done</button>
  `);

  save();
}

// Request details
function details(id) {
  let r = requests.find(x => x.id === id);
  if (!r) return;

  openModal(`
    <h2>Request details</h2>
    <p><b>ID:</b> ${esc(r.id)}</p>
    <p><b>Patient:</b> ${esc(r.patient)}</p>
    <p><b>Hospital:</b> ${esc(r.hospital)}</p>
    <p><b>Locality:</b> ${esc(r.area)}</p>
    <p><b>Blood group:</b> ${esc(r.blood)} • <b>Units:</b> ${r.units}</p>
    <p><b>Deadline:</b> ${esc(r.deadline || 'Not provided')}</p>
    <p><b>Verification contact:</b> ${esc(r.verification)}</p>
    <p><b>Note:</b> ${esc(r.note)}</p>
    <p><b>Status:</b> ${esc(r.status)}</p>
  `);
}

// Donor history
function donorInfo(id) {
  let d = donors.find(x => x.id === id);
  if (!d) return;

  openModal(`
    <h2>${esc(d.name)} donation history</h2>
    <p>${esc(d.blood)} • ${esc(d.area)}</p>

    ${d.donations?.map(x =>
      `<p>Recorded: ${esc(x)}</p>`
    ).join('') || '<p>No history entries recorded.</p>'}

    <p>Last donation date: ${esc(d.lastDonation || 'Not recorded')}</p>
    <p>Eligibility must be assessed by qualified professionals.</p>

    <button class="primary" onclick="certificate('${d.id}')">
      Create appreciation certificate
    </button>
  `);
}

// Certificate
function certificate(id) {
  let d = donors.find(x => x.id === id);
  if (!d) return;

  let w = window.open('', '_blank');

  if (!w) {
    toast('Allow popups to print the certificate');
    return;
  }

  w.document.write(`
    <!doctype html>
    <html>
    <head>
      <title>RedRelay Certificate</title>
      <style>
        body {
          font-family: Georgia, serif;
          text-align: center;
          padding: 60px;
          color: #253248;
        }
        .frame {
          border: 12px double #c72b45;
          padding: 50px;
        }
        h1 {
          color: #c72b45;
          font-size: 40px;
        }
        p {
          font-size: 20px;
        }
        .small {
          font-size: 13px;
        }
      </style>
    </head>

    <body>
      <div class="frame">
        <h1>Certificate of Appreciation</h1>
        <p>Presented to</p>
        <h2>${esc(d.name)}</h2>
        <p>
          In appreciation of registering as a volunteer donor
          in the RedRelay demonstration.
        </p>
        <p>${new Date().toLocaleDateString()}</p>
        <p class="small">
          Demonstration certificate only • Not an official donation certificate
        </p>
      </div>

      <script>
        window.onload = () => window.print();
      <\/script>
    </body>
    </html>
  `);

  w.document.close();
}

// Toggle availability
function toggleDonor(id) {
  let d = donors.find(x => x.id === id);

  if (d) {
    d.available = !d.available;
    save();
  }
}

// Modal
function openModal(content) {
  document.getElementById('modalContent').innerHTML = content;
  document.getElementById('modal').showModal();
}

function closeModal() {
  document.getElementById('modal').close();
}

// Map
function initMap() {
  if (!window.L || !document.getElementById('map')) return;

  let map = L.map('map').setView([17.43, 78.54], 10);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  const pts = [
    [17.405,78.559,'Uppal • demo'],
    [17.439,78.498,'Secunderabad • demo'],
    [17.495,78.352,'Miyapur • demo'],
    [17.484,78.407,'Kukatpally • demo'],
    [17.443,78.377,'Hitech City • demo']
  ];

  pts.forEach(p =>
    L.marker([p[0],p[1]])
      .addTo(map)
      .bindPopup(p[2])
  );

  setTimeout(() => map.invalidateSize(), 300);
}

// Navigation
document.querySelectorAll('[data-view]').forEach(btn =>
  btn.addEventListener('click', () => {
    let v = btn.dataset.view;

    document.querySelectorAll('.view').forEach(x =>
      x.classList.add('hidden')
    );

    document.getElementById(v).classList.remove('hidden');

    document.querySelectorAll('nav [data-view]').forEach(x =>
      x.classList.toggle('active', x.dataset.view === v)
    );
  })
);

// Request filters
['requestSearch','requestBlood','requestUrgency'].forEach(id =>
  document.getElementById(id)?.addEventListener('input', renderRequests)
);

// Donor filters
['donorSearch','donorBlood'].forEach(id =>
  document.getElementById(id)?.addEventListener('input', renderDonors)
);

// Close modal
document.getElementById('closeModal')
  .addEventListener('click', closeModal);

// Toggle donor form
document.getElementById('showDonorForm')
  .addEventListener('click', () =>
    document.getElementById('donorFormPanel').classList.toggle('hidden')
  );

// Donor registration
document.getElementById('donorForm')
  .addEventListener('submit', e => {
    e.preventDefault();

    let f = new FormData(e.target);

    donors.unshift({
      id: 'D' + Date.now(),
      name: f.get('name'),
      blood: f.get('blood'),
      area: f.get('area'),
      phone: maskPhone(f.get('phone')),
      available: f.get('available') === 'true',
      lastDonation: f.get('lastDonation') || '',
      donations: []
    });

    e.target.reset();

    document.getElementById('donorFormPanel')
      .classList.add('hidden');

    save();
    toast('Demo donor registered');
  });

function maskPhone(p) {
  let digits = String(p).replace(/\D/g, '');
  return '******' + digits.slice(-4);
}

// SOS submission
document.getElementById('sosForm')
  .addEventListener('submit', e => {
    e.preventDefault();

    let f = new FormData(e.target);

    requests.unshift({
      id: 'R' + Date.now(),
      patient: f.get('patient'),
      hospital: f.get('hospital'),
      area: f.get('area'),
      blood: f.get('blood'),
      units: +f.get('units'),
      urgency: f.get('urgency'),
      deadline: f.get('deadline'),
      verification: f.get('verification'),
      note: f.get('note'),
      status: 'Broadcasted',
      responses: [],
      created: Date.now()
    });

    e.target.reset();
    save();

    toast('SOS created and broadcast simulated');

    document.querySelector('[data-view="requests"]').click();
  });

// Donation tracking
document.getElementById('donationForm')
  .addEventListener('submit', e => {
    e.preventDefault();

    let donorId = document.getElementById('donationDonor').value;
    let date = new FormData(e.target).get('date');

    if (!donorId) return;

    let d = donors.find(x => x.id === donorId);

    d.lastDonation = date;
    d.donations = d.donations || [];
    d.donations.push(date);

    donations.unshift({ donorId, date });

    e.target.reset();
    save();

    toast('Donation reminder recorded');
  });

// Reset demo
document.getElementById('resetDemo')
  .addEventListener('click', () => {
    if (confirm('Reset all local demo data?')) {
      donors = structuredClone(seedDonors);
      requests = structuredClone(seedRequests);
      donations = [];
      smsLog = [];

      save();
      toast('Demo data reset');
    }
  });

// Expose functions used by HTML buttons
window.certificate = certificate;
window.showMatches = showMatches;
window.respond = respond;
window.advance = advance;
window.details = details;
window.simulateSMS = simulateSMS;
window.toggleDonor = toggleDonor;
window.donorInfo = donorInfo;
window.setStatus = setStatus;
window.deleteRequest = deleteRequest;
window.closeModal = closeModal;

// Start application
renderAll();
initMap();
