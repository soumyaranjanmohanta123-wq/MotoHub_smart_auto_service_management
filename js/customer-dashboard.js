/**
 * ============================================================
 *  MOTOHUB – Customer Dashboard Integration (js/customer-dashboard.js)
 *  Loads real profile, orders, appointments, tickets, reviews.
 * ============================================================
 */
document.addEventListener('DOMContentLoaded', async () => {

  if (!API.requireAuth()) return;

  const user = API.user();

  // ── Populate Sidebar Profile ───────────────────────────────
  const sidebarName  = document.querySelector('.user-profile-summary h3');
  const sidebarEmail = document.querySelector('.user-profile-summary p');
  if (sidebarName && user) {
    sidebarName.textContent  = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
    sidebarEmail.textContent = user.email;
  }

  // ── Populate Profile Form ──────────────────────────────────
  function fillProfileForm(u) {
    const fields = {
      'input[name="first_name"], input:nth-child(1)': u.first_name,
      'input[name="last_name"]':  u.last_name,
      'input[type="email"]':      u.email,
      'input[type="tel"]':        u.phone || '',
    };
    const profileSec = document.getElementById('profile-sec');
    if (!profileSec) return;
    const inputs = profileSec.querySelectorAll('input');
    const vals = [u.first_name, u.last_name, u.email, u.phone || ''];
    inputs.forEach((inp, i) => { if (vals[i] !== undefined) inp.value = vals[i]; });
  }
  fillProfileForm(user);

  // ── Fetch fresh profile from API ───────────────────────────
  try {
    const profile = await API.req('/auth/profile/');
    fillProfileForm(profile);

    // Update localStorage with fresh data
    const stored = JSON.parse(localStorage.getItem('mh_user') || '{}');
    localStorage.setItem('mh_user', JSON.stringify({ ...stored, ...profile }));
  } catch (_) {}

  // ── Edit Profile Logic ─────────────────────────────────────
  const profileSec = document.getElementById('profile-sec');
  if (profileSec) {
    const editBtn = profileSec.querySelector('.db-header button.outline-btn');
    const profileForm = profileSec.querySelectorAll('form.db-form')[0];
    const passwordForm = profileSec.querySelectorAll('form.db-form')[1];

    if (editBtn && profileForm) {
      let isEditing = false;
      const inputs = profileForm.querySelectorAll('input');
      
      editBtn.addEventListener('click', async () => {
        if (!isEditing) {
          isEditing = true;
          editBtn.innerHTML = '<i class="fa-solid fa-save"></i> Save Profile';
          inputs.forEach((inp, i) => { if (i !== 2) inp.removeAttribute('readonly'); }); // keep email readonly
          inputs[0].focus();
        } else {
          try {
            editBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            const res = await API.req('/auth/profile/', {
              method: 'PATCH',
              body: JSON.stringify({
                first_name: inputs[0].value,
                last_name: inputs[1].value,
                phone: inputs[3].value
              })
            });
            API.toast('Profile updated successfully!', 'success');
            isEditing = false;
            editBtn.innerHTML = '<i class="fa-solid fa-pen"></i> Edit Profile';
            inputs.forEach(inp => inp.setAttribute('readonly', 'true'));
            
            // update localstorage
            const stored = JSON.parse(localStorage.getItem('mh_user') || '{}');
            localStorage.setItem('mh_user', JSON.stringify({ ...stored, ...res }));
            if (sidebarName) sidebarName.textContent = `${res.first_name || ''} ${res.last_name || ''}`.trim() || res.username;
          } catch (err) {
            API.toast('Failed to update profile.', 'error');
            editBtn.innerHTML = '<i class="fa-solid fa-save"></i> Save Profile';
          }
        }
      });
    }

    // ── Change Password Logic ────────────────────────────────
    if (passwordForm) {
      const updatePwdBtn = passwordForm.querySelector('button');
      const pwdInputs = passwordForm.querySelectorAll('input');
      
      updatePwdBtn.addEventListener('click', async () => {
        const old_password = pwdInputs[0].value;
        const new_password = pwdInputs[1].value;
        const confirm_password = pwdInputs[2].value;

        if (!old_password || !new_password || !confirm_password) return API.toast('Please fill all password fields.', 'error');
        if (new_password !== confirm_password) return API.toast('New passwords do not match.', 'error');

        try {
          updatePwdBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';
          await API.req('/auth/profile/password/', {
            method: 'PUT',
            body: JSON.stringify({ old_password, new_password, confirm_password })
          });
          API.toast('Password updated securely!', 'success');
          pwdInputs.forEach(inp => inp.value = '');
          updatePwdBtn.innerHTML = 'Update Password';
        } catch (err) {
          const msg = Object.values(err)[0]?.[0] || 'Failed to update password.';
          API.toast(msg, 'error');
          updatePwdBtn.innerHTML = 'Update Password';
        }
      });
    }
  }

  // ── Load My Garage (Vehicles) ─────────────────────────────
  const garageSec = document.getElementById('garage-sec');
  const vehicleCards = document.querySelector('.vehicle-cards');
  if (garageSec && vehicleCards) {
    const renderVehicles = async () => {
      try {
        const data = await API.req('/auth/vehicles/');
        const vehicles = data.results || data;
        if (vehicles.length === 0) {
          vehicleCards.innerHTML = `<div style="text-align:center;padding:40px;color:#888;">No vehicles found. Add your first vehicle!</div>`;
        } else {
          vehicleCards.innerHTML = vehicles.map(v => `
            <div class="vehicle-card" data-id="${v.id}">
                <div class="vc-image">
                    <i class="fa-solid fa-car"></i>
                </div>
                <div class="vc-info">
                    <h4>${v.year} ${v.make} ${v.model}</h4>
                    <p>License Plate: <strong>${v.license_plate}</strong></p>
                    <p>VIN: <strong>${v.vin || 'N/A'}</strong></p>
                </div>
                <div class="vc-actions">
                    <button class="action-btn delete-vehicle" title="Remove"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
          `).join('');

          // Attach delete events
          document.querySelectorAll('.delete-vehicle').forEach(btn => {
            btn.addEventListener('click', async e => {
              if(!confirm('Delete this vehicle?')) return;
              const id = e.target.closest('.vehicle-card').dataset.id;
              try {
                await API.req(`/auth/vehicles/${id}/`, { method: 'DELETE' });
                API.toast('Vehicle deleted.', 'info');
                renderVehicles();
              } catch(err) { API.toast('Failed to delete vehicle.', 'error'); }
            });
          });
        }
      } catch(err) {
        vehicleCards.innerHTML = `<div style="color:#e74c3c;">Failed to load garage.</div>`;
      }
    };

    renderVehicles();
    window.renderVehicles = renderVehicles;

    // Add Vehicle
    const addVehicleBtn = garageSec.querySelector('.btn-red');
    if (addVehicleBtn) {
      addVehicleBtn.addEventListener('click', () => {
        if (window.openVehicleModal) {
            window.openVehicleModal();
        } else {
            API.toast('Modal framework not initialized.', 'error');
        }
      });
    }
  }

  // ── Load Orders ───────────────────────────────────────────
  const ordersTbody = document.querySelector('#orders-sec .db-table tbody');
  if (ordersTbody) {
    try {
      const data   = await API.req('/orders/');
      const orders = data.results || data;
      if (orders.length === 0) {
        ordersTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#888;padding:30px;">
          No orders yet. <a href="products.html">Start Shopping!</a></td></tr>`;
      } else {
        ordersTbody.innerHTML = orders.map(o => `
          <tr>
            <td><strong>#MH-${o.id}</strong></td>
            <td>${API.fmtDate(o.created_at)}</td>
            <td><span class="status-badge ${API.statusBadge(o.status)}">${o.status}</span></td>
            <td>${API.fmtCurrency(o.total_price)}</td>
            <td><a href="tracking.html?order=${o.id}" class="text-link">Track</a></td>
          </tr>`).join('');
      }
    } catch (err) {
      ordersTbody.innerHTML = `<tr><td colspan="5" style="color:#e74c3c;text-align:center;">Failed to load orders.</td></tr>`;
    }
  }

  // ── Load Appointments ─────────────────────────────────────
  const apptContainer = document.querySelector('#appointments-sec .appointment-cards');
  if (apptContainer) {
    try {
      const data  = await API.req('/services/appointments/');
      const apts  = data.results || data;
      if (apts.length === 0) {
        apptContainer.innerHTML = `<div style="text-align:center;padding:40px;color:#888;">
          No appointments yet. <a href="service-appointment.html">Book one now!</a></div>`;
      } else {
        apptContainer.innerHTML = apts.map(a => {
          const d   = new Date(a.appointment_date);
          const mon = d.toLocaleString('en', { month: 'short' }).toUpperCase();
          const day = d.getDate();
          const isPast = a.status === 'completed' || a.status === 'cancelled';
          // Cache full data for modal
          const apptKey = 'live_' + a.id;
          window._liveAppts = window._liveAppts || {};
          window._liveAppts[apptKey] = {
            id: '#SA-' + a.id,
            title: a.service_detail?.name || 'Service Appointment',
            status: a.status,
            service: a.service_detail?.name || '—',
            vehicle: [a.vehicle_year, a.vehicle_make, a.vehicle_model].filter(Boolean).join(' ') || '—',
            date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
            time: a.appointment_time || '—',
            location: a.garage_name || 'MOTOHUB Garage',
            tech: a.technician || 'To be assigned',
            cost: a.estimated_cost ? '₹' + a.estimated_cost : '—',
            package: a.service_package || '—',
            notes: a.customer_notes || 'No additional notes.',
            isPast
          };
          return `
            <div class="appt-card ${isPast ? 'past' : 'upcoming'}">
              <div class="appt-date"><span class="month">${mon}</span><span class="day">${day}</span></div>
              <div class="appt-details">
                <h4>${a.service_detail?.name || 'Service'}</h4>
                <p><i class="fa-solid fa-car"></i> ${[a.vehicle_make, a.vehicle_model, a.vehicle_year].filter(Boolean).join(' ') || '—'}</p>
                <p><i class="fa-regular fa-clock"></i> ${a.appointment_time || '—'}</p>
                <p><i class="fa-solid fa-location-dot"></i> ${a.garage_name || 'MOTOHUB Garage'}</p>
              </div>
              <div class="appt-status" style="display: flex; flex-direction: column; align-items: flex-end; gap: 12px;">
                <span class="status-badge ${API.statusBadge(a.status)}">${a.status}</span>
                <div style="display: flex; gap: 8px;">
                  <button class="btn appt-view-btn-styled" onclick="openApptModal('${apptKey}')"><i class="fa-solid fa-eye"></i> View Details</button>
                  ${!isPast ? `<button class="btn appt-reschedule-btn-styled" onclick="openRescheduleModal('${apptKey}', '${window._liveAppts[apptKey].date}', '${a.appointment_time || ''}')"><i class="fa-solid fa-calendar-days"></i> Reschedule</button>` : ''}
                </div>
              </div>
            </div>`;
        }).join('');
      }

      // ── Load Maintenance History ────────────────────────────
      const historyTimeline = document.querySelector('#history-sec .timeline');
      if (historyTimeline) {
        const completedApts = apts.filter(a => a.status === 'completed');
        if (completedApts.length === 0) {
          historyTimeline.innerHTML = `<div style="text-align:center;padding:40px;color:#888;">No completed maintenance history found.</div>`;
        } else {
          historyTimeline.innerHTML = completedApts.map(a => `
            <div class="timeline-item">
                <div class="tl-icon"><i class="fa-solid fa-wrench"></i></div>
                <div class="tl-content">
                    <div class="tl-header">
                        <h4>${a.service_detail?.name || 'Service Completed'}</h4>
                        <span class="tl-date">${API.fmtDate(a.appointment_date)}</span>
                    </div>
                    <p class="tl-vehicle">${[a.vehicle_year, a.vehicle_make, a.vehicle_model].filter(Boolean).join(' ') || 'Vehicle'} • ${a.garage_name || 'MOTOHUB Garage'}</p>
                    <p class="tl-desc">${a.garage_notes || 'Standard service completed successfully.'}</p>
                </div>
            </div>
          `).join('');
        }
      }

    } catch (_) {}
  }

  // ── Load Tickets ──────────────────────────────────────────
  const ticketTbody = document.querySelector('#tickets-sec .db-table tbody');
  const openTicketBtn = document.querySelector('#tickets-sec .btn-red');
  if (ticketTbody) {
    try {
      const data    = await API.req('/support/tickets/');
      const tickets = data.results || data;
      if (tickets.length === 0) {
        ticketTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#888;padding:30px;">No support tickets yet.</td></tr>`;
      } else {
        ticketTbody.innerHTML = tickets.map(t => `
          <tr>
            <td><strong>#TK-${t.id}</strong></td>
            <td>${t.subject}</td>
            <td>${API.fmtDate(t.created_at)}</td>
            <td><span class="status-badge ${API.statusBadge(t.status)}">${t.status}</span></td>
            <td><button class="text-link" onclick="alert('Ticket #TK-${t.id}\\n\\nSubject: ${t.subject}\\nStatus: ${t.status}')">View</button></td>
          </tr>`).join('');
      }
    } catch (_) {}
  }

  // ── Open New Ticket Modal ─────────────────────────────────
  // Handled by global functions window.openTicketModal, window.closeTicketModal, and window.submitTicketModal

  // ── Load Reviews ──────────────────────────────────────────
  const reviewsTbody = document.querySelector('#reviews-sec .db-table tbody');
  if (reviewsTbody) {
    try {
      const data    = await API.req('/reviews/mine/');
      const reviews = data.results || data;
      if (reviews.length === 0) {
        reviewsTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#888;padding:30px;">No reviews yet.</td></tr>`;
      } else {
        reviewsTbody.innerHTML = reviews.map(r => `
          <tr>
            <td><strong>${r.product ? 'Product #' + r.product : 'Service #' + r.service}</strong></td>
            <td><div class="stars" style="color:#f1c40f;">${'<i class="fa-solid fa-star"></i>'.repeat(r.rating)}</div></td>
            <td>${API.fmtDate(r.created_at)}</td>
            <td><span class="status-badge ${API.statusBadge(r.status)}">${r.status}</span></td>
            <td><button class="text-link" title="${r.comment || ''}">View</button></td>
          </tr>`).join('');
      }
    } catch (_) {}
  }

  // ── Load Wishlist ─────────────────────────────────────────
  const wishlistSec = document.getElementById('wishlist-sec');
  const wishlistGrid = document.querySelector('.wishlist-grid');
  if (wishlistSec && wishlistGrid) {
    const renderWishlist = async () => {
      try {
        const data = await API.req('/products/wishlist/');
        const items = data.results || data;
        if (items.length === 0) {
          wishlistGrid.innerHTML = `<div style="text-align:center;padding:40px;color:#888;grid-column:1/-1;">No items in your wishlist.</div>`;
        } else {
          wishlistGrid.innerHTML = items.map(item => {
            const p = item.product;
            const img = p.image ? API.MEDIA + p.image : 'assets/images/placeholder.jpg';
            return `
              <div class="wishlist-card db-card" data-id="${item.id}" data-product-id="${p.id}" style="padding: 15px; display: flex; flex-direction: column; align-items: center; text-align: center;">
                  <div class="wishlist-img" style="width: 100%; height: 150px; background-color: #f5f5f5; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 15px; overflow: hidden;">
                      <img src="${img}" alt="${p.name}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                  </div>
                  <h4 style="margin-bottom: 5px;">${p.name}</h4>
                  <p style="color: var(--primary-color, #e63946); font-weight: 600; margin-bottom: 15px;">${API.fmtCurrency(p.effective_price || p.price)}</p>
                  <div style="display: flex; gap: 10px; width: 100%;">
                      <button class="btn btn-red btn-sm wl-add-cart" style="flex: 1;"><i class="fa-solid fa-cart-plus"></i> Add to Cart</button>
                      <button class="btn btn-primary outline-btn btn-sm wl-remove" style="padding: 0 15px;" title="Remove"><i class="fa-solid fa-trash"></i></button>
                  </div>
              </div>
            `;
          }).join('');

          // Bind Actions
          document.querySelectorAll('.wl-add-cart').forEach(btn => {
            btn.addEventListener('click', e => {
               const card = e.target.closest('.wishlist-card');
               const itemNode = items.find(i => i.id == card.dataset.id);
               if (itemNode && itemNode.product) {
                 API.addToCart(itemNode.product, 1);
               }
            });
          });

          document.querySelectorAll('.wl-remove').forEach(btn => {
            btn.addEventListener('click', async e => {
              if(!confirm('Remove this item from your wishlist?')) return;
              const id = e.target.closest('.wishlist-card').dataset.id;
              try {
                await API.req(`/products/wishlist/${id}/`, { method: 'DELETE' });
                API.toast('Item removed from wishlist.', 'info');
                renderWishlist();
              } catch(err) { API.toast('Failed to remove item.', 'error'); }
            });
          });
        }
      } catch(err) {
        wishlistGrid.innerHTML = `<div style="color:#e74c3c;">Failed to load wishlist.</div>`;
      }
    };
    renderWishlist();
  }

  // ── Load Saved Addresses ──────────────────────────────────
  const addressSec = document.getElementById('address-sec');
  const addressGrid = document.querySelector('.address-grid');
  if (addressSec && addressGrid) {
    const renderAddresses = async () => {
      try {
        const data = await API.req('/auth/addresses/');
        const addresses = data.results || data;
        if (addresses.length === 0) {
          addressGrid.innerHTML = `<div style="text-align:center;padding:40px;color:#888;grid-column:1/-1;">No saved addresses found.</div>`;
        } else {
          addressGrid.innerHTML = addresses.map(a => `
            <div class="address-card ${a.is_default ? 'default' : ''}" data-id="${a.id}">
                <div class="address-header">
                    <h4>${a.title}</h4>
                    ${a.is_default ? '<span class="default-badge">Default</span>' : ''}
                </div>
                <p class="name">${a.name}</p>
                <p class="address-lines">
                    ${a.address_lines.replace(/\\n/g, '<br>')}<br>
                    ${a.city}, ${a.state} ${a.pincode}
                </p>
                <p class="phone">${a.phone || ''}</p>
                <div class="address-actions">
                    ${!a.is_default ? '<button class="text-link set-default">Set Default</button> <span>|</span>' : ''}
                    <button class="text-link text-red delete-address">Delete</button>
                </div>
            </div>
          `).join('');

          // Bind Actions
          document.querySelectorAll('.set-default').forEach(btn => {
            btn.addEventListener('click', async e => {
              const id = e.target.closest('.address-card').dataset.id;
              try {
                await API.req(`/auth/addresses/${id}/`, {
                  method: 'PATCH', body: JSON.stringify({ is_default: true })
                });
                renderAddresses();
              } catch(err) { API.toast('Failed to set default.', 'error'); }
            });
          });

          document.querySelectorAll('.delete-address').forEach(btn => {
            btn.addEventListener('click', async e => {
              if(!confirm('Delete this address?')) return;
              const id = e.target.closest('.address-card').dataset.id;
              try {
                await API.req(`/auth/addresses/${id}/`, { method: 'DELETE' });
                API.toast('Address deleted.', 'info');
                renderAddresses();
              } catch(err) { API.toast('Failed to delete address.', 'error'); }
            });
          });
        }
      } catch(err) {
        addressGrid.innerHTML = `<div style="color:#e74c3c;">Failed to load addresses.</div>`;
      }
    };

    renderAddresses();

    const addAddressBtn = addressSec.querySelector('.btn-red');
    if (addAddressBtn) {
      addAddressBtn.addEventListener('click', () => {
         if (typeof openAddressModal !== 'undefined') openAddressModal();
      });
    }
  }

  // ── Logout link ───────────────────────────────────────────
  document.querySelector('.logout-link')?.addEventListener('click', e => {
    e.preventDefault();
    API.clearAuth();
    window.location.href = 'login.html';
  });

  // ── Dashboard Tab Switching ───────────────────────────────
  document.querySelectorAll('.db-tab-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.db-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.db-section').forEach(s => {
        s.classList.remove('active'); s.style.display = 'none';
      });
      this.classList.add('active');
      const sec = document.getElementById(this.dataset.target);
      if (sec) { sec.style.display = 'block'; setTimeout(() => sec.classList.add('active'), 10); }
    });
  });

  // Handle URL hash to open specific tab on load (e.g., #orders)
  if (window.location.hash) {
    const hash = window.location.hash.substring(1);
    const targetBtn = document.querySelector(`.db-tab-btn[data-target="${hash}-sec"]`);
    if (targetBtn) targetBtn.click();
  }
});

// ── Global Ticket Modal Handlers ────────────────────────────
window.openTicketModal = function() {
    const modal = document.getElementById('ticketModalOverlay');
    if (modal) modal.classList.add('open');
};

window.closeTicketModal = function() {
    const modal = document.getElementById('ticketModalOverlay');
    if (modal) {
        modal.classList.remove('open');
        const form = document.getElementById('openTicketForm');
        if (form) form.reset();
    }
};

window.submitTicketModal = async function(event) {
    event.preventDefault();
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    const category = document.getElementById('ticketCategory').value;
    const subject = document.getElementById('ticketSubject').value;
    const description = document.getElementById('ticketDescription').value;
    
    if (!category || !subject || !description) {
        if (typeof API !== 'undefined' && API.toast) {
            API.toast('Please fill all required fields', 'error');
        }
        return;
    }
    
    try {
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;
        
        // 1. Create the Ticket
        const ticketRes = await API.req('/support/tickets/', {
            method: 'POST',
            body: JSON.stringify({ subject, category })
        });
        
        // 2. Add the initial message
        if (ticketRes && ticketRes.id) {
            await API.req(`/support/tickets/${ticketRes.id}/messages/`, {
                method: 'POST',
                body: JSON.stringify({ message: description })
            });
        }
        
        if (typeof API !== 'undefined' && API.toast) {
            API.toast('Support ticket submitted successfully!', 'success');
        }
        window.closeTicketModal();
        setTimeout(() => location.reload(), 1000); // Reload to fetch fresh tickets
    } catch (err) {
        if (typeof API !== 'undefined' && API.toast) {
            API.toast('Failed to submit ticket. Please try again.', 'error');
        }
        console.error('Ticket creation error:', err);
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
};
