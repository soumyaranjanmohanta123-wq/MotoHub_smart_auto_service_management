/**
 * ============================================================
 *  MOTOHUB – Moderator Dashboard Integration (js/moderator-dashboard.js)
 *  Loads stats, orders, appointments, products, support, reviews for Moderator
 * ============================================================
 */
document.addEventListener('DOMContentLoaded', async () => {

  if (!API.requireAuth()) return;

  const user = API.user();
  if (!user || (user.role !== 'moderator' && user.role !== 'admin')) {
      window.location.href = 'index.html';
      return;
  }

  // ── Populate Sidebar Profile ───────────────────────────────
  const sidebarName  = document.querySelector('.user-profile-summary h3');
  const sidebarEmail = document.querySelector('.user-profile-summary p');
  if (sidebarName && user) {
    sidebarName.textContent  = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
    sidebarEmail.textContent = user.email;
  }

  // ── Dashboard Tab Switching ───────────────────────────────
  const tabBtns = document.querySelectorAll('.db-tab-btn');
  const sections = document.querySelectorAll('.db-section');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      tabBtns.forEach(b => b.classList.remove('active'));
      sections.forEach(s => { s.classList.remove('active'); s.style.display = 'none'; });
      this.classList.add('active');
      const target = document.getElementById(this.getAttribute('data-target'));
      if (target) {
          target.style.display = 'block';
          setTimeout(() => target.classList.add('active'), 10);
      }
    });
  });

  // ── Logout link ───────────────────────────────────────────
  document.querySelector('.logout-link')?.addEventListener('click', e => {
    e.preventDefault();
    API.clearAuth();
    window.location.href = 'login.html';
  });

  // ==========================================================
  // MODULE: OVERVIEW
  // ==========================================================
  // ── Update Today's Date Header ─────────────────────────────
  const dateEl = document.querySelector('#overview-sec .db-header span');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  const loadOverview = async () => {
    const overviewSec = document.getElementById('overview-sec');
    if (!overviewSec) return;

    // Show loading skeleton in stat cards
    overviewSec.querySelectorAll('.stat-info h4').forEach(el => {
      el.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="font-size:14px;"></i>';
    });

    try {
      // ── Load Stats ──────────────────────────────────────────
      const stats = await API.req('/stats/');
      const statCards = overviewSec.querySelectorAll('.stat-info h4');
      if (statCards.length >= 4) {
        statCards[0].textContent = stats.pending_appointments ?? 0;
        statCards[1].textContent = stats.pending_orders ?? 0;
        statCards[2].textContent = stats.open_support_tickets ?? 0;
        statCards[3].textContent = stats.pending_reviews ?? 0;
      }

      // ── Load Pending Appointments Table (Overview) ──────────
      const pendingApptsTbody = overviewSec.querySelector('.db-table tbody');
      if (pendingApptsTbody) {
        pendingApptsTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading…</td></tr>';
        const data = await API.req('/services/appointments/admin/');
        const appts = (data.results || data).filter(a => a.status === 'pending');

        if (appts.length === 0) {
          pendingApptsTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted);"><i class="fa-regular fa-calendar-check" style="margin-right:8px;"></i>No pending appointment requests</td></tr>';
        } else {
          pendingApptsTbody.innerHTML = appts.slice(0, 5).map(a => `
            <tr>
              <td><strong>#SA-${a.id}</strong></td>
              <td>${a.customer_name}</td>
              <td>${a.service_detail?.name || 'Service'}</td>
              <td>${API.fmtDate(a.appointment_date)}</td>
              <td>
                <div class="row-actions">
                  <button class="action-btn approve" title="Assign Garage"
                    onclick="window.switchToTab('appointments-sec'); window.openApptAssignModal(${a.id})">
                    <i class="fa-solid fa-check"></i>
                  </button>
                  <button class="action-btn delete" title="Cancel Request"
                    onclick="window.quickRejectAppt(${a.id})">
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </div>
              </td>
            </tr>
          `).join('');
        }
      }
    } catch (err) {
      console.error('Failed to load overview', err);
      API.toast('Failed to load dashboard overview', 'error');
      // Reset stat cards to 0 on error
      document.querySelectorAll('#overview-sec .stat-info h4').forEach(el => el.textContent = '—');
    }
  };

  // ==========================================================
  // MODULE: APPOINTMENTS
  // ==========================================================
  const apptsSec = document.getElementById('appointments-sec');
  const renderAppts = async () => {
      if (!apptsSec) return;
      const tbody = document.getElementById('appointments-tbody');
      if (!tbody) return;

      try {
          const data = await API.req('/services/appointments/admin/');
          const appts = data.results || data;

          tbody.innerHTML = appts.map(a => `
             <tr data-type="${a.service_type || 'garage'}" data-status="${a.status}">
                <td><strong>#SA-${a.id}</strong></td>
                <td>
                    <div class="user-cell">
                        <div><span class="user-name">${a.customer_name}</span><br><small class="user-role-label">${a.customer_phone || ''}</small></div>
                    </div>
                </td>
                <td>${a.service_detail?.name || 'Service'}<br><small class="user-role-label" style="color:var(--text-muted);">${a.vehicle_make} ${a.vehicle_model}</small></td>
                <td>${a.garage_name || '<span style="color:var(--text-muted);">Unassigned</span>'}</td>
                <td>${API.fmtDate(a.appointment_date)}<br><small class="user-role-label">${a.appointment_time}</small></td>
                <td><span class="status-badge ${API.statusBadge(a.status)}">${a.status}</span></td>
                <td>
                    <div class="row-actions">
                        <button class="action-btn" title="View Details" onclick="window.viewAppointment('${a.id}')"><i class="fa-solid fa-eye"></i></button>
                        <button class="action-btn assign" title="Assign Garage" onclick="window.openApptAssignModal(${a.id})"><i class="fa-solid fa-warehouse"></i></button>
                        <button class="action-btn approve" title="Update Status" onclick="window.openApptStatusModal(${a.id})"><i class="fa-solid fa-arrows-rotate"></i></button>
                    </div>
                </td>
            </tr>
          `).join('');

          // Update Stats
          const statCards = apptsSec.querySelectorAll('.stat-info h4');
          if (statCards.length >= 4) {
              statCards[0].textContent = appts.length;
              statCards[1].textContent = appts.filter(a => ['confirmed','approved','assigned'].includes(a.status)).length;
              statCards[2].textContent = appts.filter(a => a.status === 'pending').length;
              statCards[3].textContent = appts.filter(a => a.status === 'cancelled').length;
          }
      } catch (err) { console.error(err); }
  };

  // ==========================================================
  // MODULE: ORDERS
  // ==========================================================
  const ordersSec = document.getElementById('orders-sec');
  const renderOrders = async () => {
      if (!ordersSec) return;
      const tbody = document.getElementById('orders-tbody');
      if (!tbody) return;

      try {
          const data = await API.req('/orders/admin/');
          const orders = data.results || data;

          tbody.innerHTML = orders.map(o => `
             <tr data-status="${o.status}" data-date="${o.created_at}">
                <td><strong>#MH-${o.id}</strong></td>
                <td>${o.user_detail?.first_name || 'Guest'} ${o.user_detail?.last_name || ''}</td>
                <td>${o.user_detail?.phone || '—'}</td>
                <td>${API.fmtDate(o.created_at)}</td>
                <td>${API.fmtCurrency(o.total_price)}</td>
                <td>${o.payment_method}</td>
                <td><span class="status-badge ${API.statusBadge(o.status)}">${o.status}</span></td>
                <td>
                    <div class="row-actions">
                        <button class="action-btn" title="View" onclick="alert('Order Details: \\n#MH-${o.id}')"><i class="fa-solid fa-eye"></i></button>
                        <button class="action-btn approve" title="Update Status" onclick="window.openOrderStatusModal(${o.id}, '${o.status}')"><i class="fa-solid fa-arrows-rotate"></i></button>
                        <button class="action-btn delete" title="Cancel" onclick="window.cancelOrder(${o.id})"><i class="fa-solid fa-ban"></i></button>
                    </div>
                </td>
            </tr>
          `).join('');

          const statCards = ordersSec.querySelectorAll('.stat-info h4');
          if (statCards.length >= 4) {
              statCards[0].textContent = orders.length;
              statCards[1].textContent = orders.filter(o => o.status === 'delivered').length;
              statCards[2].textContent = orders.filter(o => o.status === 'pending').length;
              statCards[3].textContent = orders.filter(o => o.status === 'cancelled').length;
          }
      } catch (err) { console.error(err); }
  };

  // ==========================================================
  // MODULE: PRODUCTS
  // ==========================================================
  const productsSec = document.getElementById('products-sec');
  const renderProducts = async () => {
    if (!productsSec) return;
    const tbody = document.getElementById('products-tbody');
    if (!tbody) return;

    try {
      const data = await API.req('/products/');
      const list = data.results || data;

      tbody.innerHTML = list.map(p => `
          <tr data-category="${p.category_name}" data-status="${p.stock > 0 ? 'In Stock' : 'Out of Stock'}">
              <td><strong>#${p.id}</strong></td>
              <td>
                  <div class="product-info-cell">
                      <div class="product-thumbnail-cell">
                          <img src="${API.mediaUrl(p.image)}" alt="${p.name}">
                      </div>
                      <div>
                          <span class="user-name">${p.name}</span><br>
                          <small class="user-role-label">${p.brand || ''} • ${p.sku || ''}</small>
                      </div>
                  </div>
              </td>
              <td>${p.category_name || '—'}</td>
              <td>${API.fmtCurrency(p.price)}</td>
              <td>${p.stock}</td>
              <td><span class="product-status-badge ${p.stock > 10 ? 'status-stock' : (p.stock > 0 ? 'status-low' : 'status-out')}">${p.stock > 0 ? (p.stock > 10 ? 'In Stock' : 'Low Stock') : 'Out of Stock'}</span></td>
              <td>
                  <div class="row-actions">
                      <button class="action-btn" title="View" onclick="window.openProductModal('view', ${p.id})"><i class="fa-solid fa-eye"></i></button>
                      <button class="action-btn" title="Edit" onclick="window.openProductModal('edit', ${p.id})"><i class="fa-solid fa-pen"></i></button>
                      <button class="action-btn" title="Update Stock" style="color:#6366f1;" onclick="window.openUpdateStockModal(${p.id}, '${p.name.replace(/'/g,"\\'")}', ${p.stock})"><i class="fa-solid fa-boxes-stacked"></i></button>
                      <button class="action-btn delete" title="Delete" onclick="window.confirmDeleteProduct(${p.id})"><i class="fa-solid fa-trash"></i></button>
                  </div>
              </td>
          </tr>
      `).join('');

      const statCards = productsSec.querySelectorAll('.stat-info h4');
      if (statCards.length >= 4) {
          statCards[0].textContent = list.length;
          statCards[1].textContent = list.filter(p => p.stock > 10).length;
          statCards[2].textContent = list.filter(p => p.stock > 0 && p.stock <= 10).length;
          statCards[3].textContent = list.filter(p => p.stock === 0).length;
      }
    } catch (err) { console.error(err); }
  };

  // ==========================================================
  // MODULE: SUPPORT
  // ==========================================================
  const supportSec = document.getElementById('support-sec');
  const renderSupport = async () => {
    if (!supportSec) return;
    const tbody = supportSec.querySelector('tbody');
    try {
      const tickets = await API.req('/support/tickets/');
      tbody.innerHTML = tickets.map(t => `
        <tr>
          <td>#TKT-${t.id}</td>
          <td>${t.user_name || 'Customer'}</td>
          <td>${t.subject}</td>
          <td>${API.fmtDate(t.created_at)}</td>
          <td><span class="status-badge ${t.priority === 'high' ? 'cancelled' : (t.priority === 'medium' ? 'processing' : 'approved')}">${t.priority}</span></td>
          <td>
              <div class="row-actions">
                <button class="action-btn" onclick="alert('Ticket: ${t.subject}\\nStatus: ${t.status}')"><i class="fa-solid fa-reply"></i></button>
                <button class="action-btn approve" onclick="window.updateTicketStatus(${t.id}, 'resolved')"><i class="fa-solid fa-check"></i></button>
              </div>
          </td>
        </tr>
      `).join('') || '<tr><td colspan="6" style="text-align:center;padding:20px;">No support tickets</td></tr>';
    } catch (err) {}
  };

  // ==========================================================
  // MODULE: REVIEWS
  // ==========================================================
  const reviewsSec = document.getElementById('reviews-sec');
  const renderReviews = async () => {
    if (!reviewsSec) return;
    const tbody = reviewsSec.querySelector('tbody');
    try {
      const data = await API.req('/reviews/admin/');
      const reviews = data.results || data;
      tbody.innerHTML = reviews.map(r => `
        <tr>
          <td>${r.user_name}</td>
          <td>${r.product_name || r.service_name}</td>
          <td><span style="color:#f5a623;">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span></td>
          <td style="max-width:200px;color:var(--text-muted);font-size:12px;">"${r.comment}"</td>
          <td>${API.fmtDate(r.created_at)}</td>
          <td>
              <div class="row-actions">
                <button class="action-btn approve" title="Approve" onclick="window.moderateReview(${r.id}, 'approve')"><i class="fa-solid fa-check"></i></button>
                <button class="action-btn delete" title="Reject" onclick="window.moderateReview(${r.id}, 'reject')"><i class="fa-solid fa-xmark"></i></button>
              </div>
          </td>
        </tr>
      `).join('') || '<tr><td colspan="6" style="text-align:center;padding:20px;">No pending reviews</td></tr>';
    } catch (err) {}
  };

  // ==========================================================
  // MODULE: ADS
  // ==========================================================
  const adsSec = document.getElementById('ads-sec');
  const renderAds = async () => {
    if (!adsSec) return;
    try {
      const banners = await API.req('/marketing/banners/');
      const ads = await API.req('/marketing/ads/');
      
      // Update Banners (Slider) - Just showing the list/grid for moderator
      // This is simplified for the moderator view
    } catch (err) {}
  };

  // ── Global Helper Functions (attached to window) ───────────
  window.switchToTab = (targetId) => {
    const btn = document.querySelector(`.db-tab-btn[data-target="${targetId}"]`);
    if (btn) btn.click();
  };

  // Quick-reject a pending appointment from the overview table
  window.quickRejectAppt = async (id) => {
    if (!confirm('Cancel this appointment request?')) return;
    try {
      await API.req(`/services/appointments/${id}/status/`, {
        method: 'PATCH', body: JSON.stringify({ status: 'cancelled' })
      });
      API.toast('Appointment cancelled', 'info');
      loadOverview(); // refresh overview counts + table
    } catch (err) { API.toast('Failed to cancel appointment', 'error'); }
  };

  // View appointment details modal — fetches fresh data from API
  window.viewAppointment = async (id) => {
    const overlay = document.getElementById('appointment-details-overlay');
    if (!overlay) return;
    // Show modal with loading state
    document.getElementById('appointment-id-display').textContent = `#SA-${id}`;
    document.getElementById('appt-det-customer').textContent = 'Loading…';
    document.getElementById('appt-det-vehicle').textContent = 'Loading…';
    document.getElementById('appt-det-type').textContent = 'Loading…';
    document.getElementById('appt-det-datetime').textContent = 'Loading…';
    document.getElementById('appt-det-garage').textContent = 'Loading…';
    document.getElementById('appt-det-note').textContent = '—';
    overlay.classList.add('open');
    try {
      // Fetch all appointments and find the one we need
      const data = await API.req('/services/appointments/admin/');
      const appts = data.results || data;
      const a = appts.find(ap => ap.id == id);
      if (!a) { API.toast('Appointment not found', 'error'); overlay.classList.remove('open'); return; }

      document.getElementById('appointment-id-display').textContent = `#SA-${a.id}`;
      document.getElementById('appt-det-customer').innerHTML =
        `${a.customer_name}<br><small style="color:var(--text-muted);font-weight:400;">${a.customer_phone || '—'}</small>`;
      document.getElementById('appt-det-vehicle').innerHTML =
        `${a.vehicle_make || ''} ${a.vehicle_model || ''}<br><small style="color:var(--text-muted);font-weight:400;">${a.vehicle_reg_number || '—'}</small>`;
      document.getElementById('appt-det-type').textContent = a.service_detail?.name || 'Service';
      document.getElementById('appt-det-datetime').textContent =
        `${API.fmtDate(a.appointment_date)} at ${a.appointment_time || '—'}`;
      const garageEl = document.getElementById('appt-det-garage');
      garageEl.textContent = a.garage_name || 'Unassigned';
      garageEl.style.color = a.garage_name ? '#fff' : 'var(--accent-red)';
      document.getElementById('appt-det-note').textContent = a.customer_notes || 'No notes provided.';
    } catch (err) {
      API.toast('Could not load appointment details', 'error');
      overlay.classList.remove('open');
    }
  };

  window.closeAppointmentDetails = () => {
    document.getElementById('appointment-details-overlay')?.classList.remove('open');
  };

  window.openApptAssignModal = async (id) => {
    document.getElementById('appt-assign-id').value = id;
    try {
        const garages = await API.req('/services/garages/');
        const select = document.getElementById('appt-garage-select');
        select.innerHTML = '<option value="">Select Garage...</option>' + 
            garages.map(g => `<option value="${g.id}">${g.garage_display_name}</option>`).join('');
        document.getElementById('appt-assign-modal-overlay').classList.add('open');
    } catch (err) { API.toast('Failed to load garages', 'error'); }
  };

  window.closeApptAssignModal = () => document.getElementById('appt-assign-modal-overlay').classList.remove('open');

  window.submitApptGarageAssign = async () => {
    const id = document.getElementById('appt-assign-id').value;
    const gId = document.getElementById('appt-garage-select').value;
    if (!gId) return API.toast("Select a garage", "error");
    try {
        await API.req(`/services/appointments/${id}/assign-garage/`, {
            method: 'PATCH', body: JSON.stringify({ garage: parseInt(gId) })
        });
        window.closeApptAssignModal();
        API.toast('Garage assigned', 'success');
        renderAppts();
    } catch (err) { API.toast('Failed', 'error'); }
  };

  window.openApptStatusModal = (id) => {
    document.getElementById('appt-status-id').value = id;
    document.getElementById('appt-status-modal-overlay').classList.add('open');
  };

  window.closeApptStatusModal = () => document.getElementById('appt-status-modal-overlay').classList.remove('open');

  window.submitApptStatusUpdate = async () => {
    const id = document.getElementById('appt-status-id').value;
    const status = document.getElementById('appt-status-select').value;
    try {
        await API.req(`/services/appointments/${id}/status/`, {
            method: 'PATCH', body: JSON.stringify({ status })
        });
        window.closeApptStatusModal();
        API.toast('Status updated', 'success');
        renderAppts();
    } catch (err) { API.toast('Update failed', 'error'); }
  };

  window.openOrderStatusModal = (id, current) => {
      document.getElementById('status-order-id-label').innerText = `#MH-${id}`;
      document.getElementById('update-order-status-id').value = id;
      document.getElementById('update-order-status-select').value = current;
      document.getElementById('order-status-overlay').classList.add('open');
  };

  window.closeOrderStatusModal = () => document.getElementById('order-status-overlay').classList.remove('open');

  window.saveOrderStatus = async () => {
      const id = document.getElementById('update-order-status-id').value;
      const status = document.getElementById('update-order-status-select').value;
      try {
          await API.req(`/orders/admin/${id}/status/`, {
              method: 'PATCH', body: JSON.stringify({ status })
          });
          window.closeOrderStatusModal();
          API.toast('Order updated', 'success');
          renderOrders();
      } catch (err) { API.toast('Failed', 'error'); }
  };

  window.cancelOrder = async (id) => {
      if (!confirm("Cancel this order?")) return;
      try {
          await API.req(`/orders/admin/${id}/status/`, {
              method: 'PATCH', body: JSON.stringify({ status: 'cancelled' })
          });
          API.toast('Order cancelled', 'info');
          renderOrders();
      } catch (err) { API.toast('Failed', 'error'); }
  };

  window.openUpdateStockModal = (id, name, current) => {
      document.getElementById('stock-p-id').innerText = `#${id}`;
      document.getElementById('update-stock-p-id').value = id;
      document.getElementById('stock-p-name').innerText = name;
      document.getElementById('stock-qty').value = 0;
      document.getElementById('update-stock-overlay').classList.add('open');
  };

  window.closeUpdateStockModal = () => document.getElementById('update-stock-overlay').classList.remove('open');

  window.saveStockUpdate = async () => {
      const id = document.getElementById('update-stock-p-id').value;
      const change = parseInt(document.getElementById('stock-qty').value);
      if (change === 0) return API.toast("Enter quantity", "error");
      try {
          // Assuming there's a stock update endpoint or we PATCH the product
          // For now, we'll patch the product stock directly (fetch current + change)
          const p = await API.req(`/products/${id}/`);
          await API.req(`/products/${id}/`, {
              method: 'PATCH', body: JSON.stringify({ stock: p.stock + change })
          });
          window.closeUpdateStockModal();
          API.toast('Stock updated', 'success');
          renderProducts();
      } catch (err) { API.toast('Failed', 'error'); }
  };

  window.confirmDeleteProduct = async (id) => {
      if (!confirm("Delete product?")) return;
      try {
          await API.req(`/products/${id}/`, { method: 'DELETE' });
          API.toast('Product deleted', 'info');
          renderProducts();
      } catch (err) { API.toast('Failed', 'error'); }
  };

  window.moderateReview = async (id, action) => {
    try {
      await API.req(`/reviews/${id}/moderate/`, {
        method: 'PATCH', body: JSON.stringify({ status: action === 'approve' ? 'approved' : 'rejected' })
      });
      API.toast(`Review ${action}d`, 'success');
      renderReviews();
    } catch (err) { API.toast('Failed', 'error'); }
  };

  window.updateTicketStatus = async (id, status) => {
    try {
      await API.req(`/support/tickets/${id}/status/`, {
        method: 'PATCH', body: JSON.stringify({ status })
      });
      API.toast('Ticket updated', 'success');
      renderSupport();
    } catch (err) { API.toast('Failed', 'error'); }
  };

  // ── Overview tab: reload data when user clicks back to it ─
  document.querySelector('.db-tab-btn[data-target="overview-sec"]')
    ?.addEventListener('click', () => loadOverview());

  // ==========================================================
  // TABLE FILTER HELPERS (called by HTML oninput / onchange)
  // ==========================================================

  // Appointments filter (search + type + status)
  window.filterAppointmentsTable = () => {
    const search = (document.getElementById('appointments-search-input')?.value || '').toLowerCase();
    const type   = (document.getElementById('appointments-type-filter')?.value || '').toLowerCase();
    const status = (document.getElementById('appointments-status-filter')?.value || '').toLowerCase();
    document.querySelectorAll('#appointments-tbody tr').forEach(row => {
      const text   = row.textContent.toLowerCase();
      const rType  = (row.dataset.type || '').toLowerCase();
      const rStat  = (row.dataset.status || '').toLowerCase();
      const matchSearch = !search || text.includes(search);
      const matchType   = !type   || rType.includes(type);
      const matchStatus = !status || rStat === status;
      row.style.display = (matchSearch && matchType && matchStatus) ? '' : 'none';
    });
  };

  // Orders filter (status + date)
  window.filterOrdersTable = () => {
    const status = (document.getElementById('orders-status-filter')?.value || '').toLowerCase();
    const dateF  = (document.getElementById('orders-date-filter')?.value || '').toLowerCase();
    const now    = new Date();
    document.querySelectorAll('#orders-tbody tr').forEach(row => {
      const rStat = (row.dataset.status || '').toLowerCase();
      const rDate = row.dataset.date || '';
      let matchStatus = !status || rStat === status;
      let matchDate   = true;
      if (dateF && rDate) {
        const d = new Date(rDate);
        if (dateF === 'today') {
          matchDate = d.toDateString() === now.toDateString();
        } else if (dateF === 'week') {
          const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
          matchDate = d >= weekAgo;
        } else if (dateF === 'month') {
          matchDate = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }
      }
      row.style.display = (matchStatus && matchDate) ? '' : 'none';
    });
  };

  // Products filter (search + category + status)
  window.filterProductsTable = () => {
    const search = (document.getElementById('products-search-input')?.value || '').toLowerCase();
    const cat    = (document.getElementById('products-category-filter')?.value || '').toLowerCase();
    const status = (document.getElementById('products-status-filter')?.value || '').toLowerCase();
    document.querySelectorAll('#products-tbody tr').forEach(row => {
      const text  = row.textContent.toLowerCase();
      const rCat  = (row.dataset.category || '').toLowerCase();
      const rStat = (row.dataset.status || '').toLowerCase();
      const matchSearch = !search || text.includes(search);
      const matchCat    = !cat    || rCat === cat;
      const matchStatus = !status || rStat.toLowerCase() === status.toLowerCase();
      row.style.display = (matchSearch && matchCat && matchStatus) ? '' : 'none';
    });
  };

  // Initial Load
  loadOverview();
  renderAppts();
  renderOrders();
  renderProducts();
  renderSupport();
  renderReviews();
  renderAds();

});
