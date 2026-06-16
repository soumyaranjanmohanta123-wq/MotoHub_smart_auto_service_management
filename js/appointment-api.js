/**
 * ============================================================
 *  MOTOHUB – Service Appointment API  (js/appointment-api.js)
 *  Loads garage list from API, submits appointments to backend.
 * ============================================================
 */
document.addEventListener('DOMContentLoaded', async () => {

  // ── Pre-fill form from logged-in user ─────────────────────
  const user = API.user();
  if (user) {
    const nameFields = ['insp-name', 'home-name', 'garage-name'];
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
    nameFields.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = name;
    });
    const phoneFields = ['insp-phone', 'home-phone', 'garage-phone'];
    phoneFields.forEach(id => {
      const el = document.getElementById(id);
      if (el && user.phone) el.value = user.phone;
    });
    const emailFields = ['insp-email', 'home-email', 'garage-email'];
    emailFields.forEach(id => {
      const el = document.getElementById(id);
      if (el && user.email) el.value = user.email;
    });
  }

  // ── Load services from API ─────────────────────────────────
  let services = [];
  try {
    const data = await API.req('/services/');
    services = data.results || data;
  } catch (_) {
    // Silently degrade - form still works with static options
  }

  // ── Load garages by city from API ─────────────────────────
  async function updateGaragesFromAPI(cityValue) {
    const garageSelect = document.getElementById('garage-garage-name');
    if (!garageSelect || !cityValue) return;

    garageSelect.innerHTML = '<option value="">Loading…</option>';
    try {
      const data   = await API.req(`/auth/garages/?city=${encodeURIComponent(cityValue)}`);
      const garages = data.results || data;
      if (garages.length === 0) {
        garageSelect.innerHTML = '<option value="">No garages available in this city</option>';
      } else {
        garageSelect.innerHTML = '<option value="">Select Garage</option>' +
          garages.map(g => `<option value="${g.id}">${g.garage_name} - ${g.city}</option>`).join('');
        // Store garage data for submission
        garageSelect.dataset.garages = JSON.stringify(garages);
      }
    } catch (_) {
      // Fall back to static options if API fails
      garageSelect.innerHTML = '<option value="">Select City First</option>';
      window.updateGarages?.(); // call original static function
    }
  }

  // ── Override the static garage city change handler ─────────
  const garageCitySelect = document.getElementById('garage-city');
  if (garageCitySelect) {
    garageCitySelect.addEventListener('change', () => {
      updateGaragesFromAPI(garageCitySelect.value);
    });
  }

  // ── Handle Form Submission ─────────────────────────────────
  const serviceForm = document.getElementById('serviceForm');
  if (!serviceForm) return;

  serviceForm.addEventListener('submit', async e => {
    e.preventDefault();

    if (!API.requireAuth('login.html')) return;

    const submitBtn = serviceForm.querySelector('.sa-submit-btn');
    const origText  = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Submitting…';
    submitBtn.disabled  = true;

    // Determine active branch
    const selectedType = document.querySelector('input[name="service_type"]:checked')?.value;

    let payload = {};

    if (selectedType === 'inspection') {
      const svc = services.find(s => s.service_type === 'inspection') || services[0];
      payload = {
        service:             svc?.id || null,
        appointment_date:   document.getElementById('insp-date')?.value,
        appointment_time:   document.getElementById('insp-time')?.value?.split(' ')[0] || '09:00',
        vehicle_make:       document.getElementById('insp-brand')?.value,
        vehicle_model:      document.getElementById('insp-model')?.value,
        vehicle_year:       parseInt(document.getElementById('insp-year')?.value) || null,
        vehicle_reg_number: document.getElementById('insp-regno')?.value,
        customer_notes:     document.getElementById('insp-describe')?.value,
      };
    } else if (selectedType === 'home_service') {
      const svc = services.find(s => s.service_type === 'home') || services[0];
      payload = {
        service:             svc?.id || null,
        appointment_date:   document.getElementById('home-date')?.value,
        appointment_time:   document.getElementById('home-time')?.value?.split(' ')[0] || '09:00',
        vehicle_make:       document.getElementById('home-brand')?.value,
        vehicle_model:      document.getElementById('home-model')?.value,
        vehicle_year:       parseInt(document.getElementById('home-year')?.value) || null,
        vehicle_reg_number: document.getElementById('home-regno')?.value,
        customer_notes:     document.getElementById('home-describe')?.value,
      };
    } else {
      // Garage service
      const svc    = services.find(s => s.service_type === 'garage') || services[0];
      const garSel = document.getElementById('garage-garage-name');
      payload = {
        service:             svc?.id || null,
        garage:              garSel?.value ? parseInt(garSel.value) : null,
        appointment_date:   document.getElementById('garage-date')?.value,
        appointment_time:   document.getElementById('garage-time')?.value?.split(' ')[0] || '09:00',
        vehicle_make:       document.getElementById('garage-brand')?.value,
        vehicle_model:      document.getElementById('garage-model')?.value,
        vehicle_year:       parseInt(document.getElementById('garage-year')?.value) || null,
        vehicle_reg_number: document.getElementById('garage-regno')?.value,
        customer_notes:     document.getElementById('garage-describe')?.value,
      };
    }

    // Clean nulls
    Object.keys(payload).forEach(k => { if (!payload[k]) delete payload[k]; });

    try {
      const appt = await API.req('/services/appointments/book/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      API.toast('Appointment booked! Our team will confirm shortly.', 'success');
      setTimeout(() => window.location.href = 'dashboard-customer.html', 1500);
    } catch (err) {
      submitBtn.innerHTML = origText;
      submitBtn.disabled  = false;
      const msg = Object.values(err).flat().join(' ') || 'Failed to book appointment.';
      API.toast(msg, 'error');
    }
  });
});
