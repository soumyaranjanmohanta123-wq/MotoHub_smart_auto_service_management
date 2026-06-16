/**
 * ============================================================
 *  MOTOHUB – Order Tracking Integration  (js/tracking-api.js)
 *  Connects tracking.html to real order & appointment API.
 * ============================================================
 */
document.addEventListener('DOMContentLoaded', () => {

  // ── Order tracking form ────────────────────────────────────
  const orderForm = document.querySelector('#order-track-section .track-form');
  if (orderForm) {
    orderForm.addEventListener('submit', async e => {
      e.preventDefault();
      const orderId = orderForm.querySelector('input').value.trim().replace(/^(MH-|#)/i, '');
      if (!orderId) return;

      if (!API.token()) {
        API.toast('Please log in to track your order.', 'warning');
        setTimeout(() => window.location.href = 'login.html', 1200);
        return;
      }

      try {
        const data = await API.req(`/orders/${orderId}/tracking/`);
        renderOrderResult(data);
      } catch (err) {
        API.toast('Order not found or access denied.', 'error');
      }
    });
  }

  // ── Appointment tracking form ──────────────────────────────
  const vehicleForm = document.querySelector('#vehicle-track-section .track-form');
  if (vehicleForm) {
    vehicleForm.addEventListener('submit', async e => {
      e.preventDefault();
      const apptId = vehicleForm.querySelector('input').value.trim().replace(/^(SRV-|#)/i, '');

      if (!API.token()) {
        API.toast('Please log in to track your service.', 'warning');
        setTimeout(() => window.location.href = 'login.html', 1200);
        return;
      }

      try {
        // Fetch all user appointments and match by ID or reg number
        const data = await API.req('/services/appointments/');
        const apts = data.results || data;
        const apt  = apts.find(a =>
          String(a.id) === apptId ||
          (a.vehicle_reg_number || '').toLowerCase() === apptId.toLowerCase()
        );
        if (!apt) {
          API.toast('Appointment not found.', 'error');
          return;
        }
        renderAppointmentResult(apt);
      } catch (err) {
        API.toast('Could not retrieve service status.', 'error');
      }
    });
  }

  // ── Auto-load from URL params ─────────────────────────────
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('order');
  if (orderId && API.token()) {
    API.req(`/orders/${orderId}/tracking/`).then(renderOrderResult).catch(() => {});
  }
});

// ── Render Order Tracking Result ───────────────────────────
function renderOrderResult(data) {
  const resultDiv = document.getElementById('order-result');
  if (!resultDiv) return;

  const statusSteps = ['pending', 'confirmed', 'shipped', 'delivered'];
  const currentIdx  = statusSteps.indexOf(data.status);

  const steps = [
    { icon: 'fa-clipboard-check', label: 'Ordered' },
    { icon: 'fa-box',             label: 'Confirmed' },
    { icon: 'fa-truck-fast',      label: 'Shipped' },
    { icon: 'fa-house-circle-check', label: 'Delivered' },
  ];

  const progressBars = steps.map((s, i) =>
    `<li class="${i <= currentIdx ? 'active' : ''}">
       <i class="fa-solid ${s.icon}"></i> ${s.label}
     </li>`
  ).join('');

  const trackingNum = data.tracking_number ? `<br>Tracking #: ${data.tracking_number}` : '';

  resultDiv.innerHTML = `
    <div class="result-header">
      <div class="result-meta">
        <h4>Order #MH-${data.order_id}</h4>
        <span class="status-badge ${API.statusBadge(data.status)}">${data.status}</span>
      </div>
      <p>Placed on: <strong>${API.fmtDate(data.created_at)}</strong>${trackingNum}</p>
    </div>
    <div class="progress-track">
      <ul class="progressbar">${progressBars}</ul>
    </div>`;

  resultDiv.style.display = 'block';
  setTimeout(() => resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

// ── Render Appointment/Vehicle Tracking Result ─────────────
function renderAppointmentResult(a) {
  const resultDiv = document.getElementById('vehicle-result');
  if (!resultDiv) return;

  const steps = ['pending', 'approved', 'assigned', 'in_progress', 'completed'];
  const labels = ['Received', 'Approved', 'Assigned', 'Repairing', 'Ready'];
  const icons  = ['fa-car-side', 'fa-magnifying-glass', 'fa-gears', 'fa-wrench', 'fa-key'];
  const currentIdx = steps.indexOf(a.status);

  const progressBars = labels.map((l, i) =>
    `<li class="${i <= currentIdx ? 'active' : ''}${i === currentIdx && a.status === 'in_progress' ? ' pulse-step' : ''}">
       <i class="fa-solid ${icons[i]}"></i> ${l}
     </li>`
  ).join('');

  const vehicle = [a.vehicle_year, a.vehicle_make, a.vehicle_model].filter(Boolean).join(' ') || '—';
  const garageName = a.garage_name || 'MOTOHUB Garage';

  resultDiv.innerHTML = `
    <div class="result-header">
      <div class="result-meta">
        <h4>Service #SRV-${a.id} (${vehicle})</h4>
        <span class="status-badge ${API.statusBadge(a.status)}">${a.status}</span>
      </div>
      <p>Booked for: <strong>${API.fmtDate(a.appointment_date)}</strong> at <strong>${garageName}</strong></p>
    </div>
    <div class="progress-track vehicle-track">
      <ul class="progressbar">${progressBars}</ul>
    </div>
    ${a.garage_notes ? `<div class="tracking-details"><h5>Garage Notes:</h5><p>${a.garage_notes}</p></div>` : ''}`;

  resultDiv.style.display = 'block';
  setTimeout(() => resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

// ── Tab Switching ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const tabBtns  = document.querySelectorAll('.track-tab-btn');
  const sections = document.querySelectorAll('.track-section');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      tabBtns.forEach(b => b.classList.remove('active'));
      sections.forEach(s => { s.classList.remove('active'); s.style.display = 'none'; });
      this.classList.add('active');
      const target = document.getElementById(this.dataset.target);
      if (target) { target.style.display = 'block'; setTimeout(() => target.classList.add('active'), 10); }
    });
  });
});
