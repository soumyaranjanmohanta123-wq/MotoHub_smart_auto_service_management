/**
 * ============================================================
 *  MOTOHUB – Admin Dashboard Integration (js/admin-dashboard.js)
 *  Loads stats, users, orders, appointments, products for Admin
 * ============================================================
 */
document.addEventListener('DOMContentLoaded', async () => {

  if (!API.requireAuth()) return;

  const user = API.user();
  if (!user || user.role !== 'admin') {
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
  document.querySelectorAll('.db-tab-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      if (this.classList.contains('nav-group-toggle')) return; // handled by css/html nested
      document.querySelectorAll('.db-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.db-section').forEach(s => {
        s.classList.remove('active'); s.style.display = 'none';
      });
      this.classList.add('active');
      const sec = document.getElementById(this.dataset.target);
      if (sec) { sec.style.display = 'block'; setTimeout(() => sec.classList.add('active'), 10); }
    });
  });

  // ── Logout link ───────────────────────────────────────────
  document.querySelector('.logout-link')?.addEventListener('click', e => {
    e.preventDefault();
    API.clearAuth();
    window.location.href = 'login.html';
  });

  // ==========================================================
  // MODULE: OVERVIEW (Stats & Recent Orders)
  // ==========================================================
  const overviewSec = document.getElementById('overview-sec');
  if (overviewSec) {
      try {
          const stats = await API.req('/stats/');
          const statCards = overviewSec.querySelectorAll('.stat-info h4');
          if (statCards.length >= 4) {
              statCards[0].textContent = API.fmtCurrency(stats.revenue_this_month);
              statCards[1].textContent = stats.pending_orders;
              statCards[2].textContent = stats.pending_appointments;
              statCards[3].textContent = stats.active_garages;
          }
      } catch (err) {
          console.error("Failed to load overview stats", err);
      }

      // Recent Orders Table
      const recentOrdersTbody = overviewSec.querySelector('.db-table tbody');
      if (recentOrdersTbody) {
          try {
              const data = await API.req('/orders/admin/?limit=5');
              const orders = data.results || data;
              recentOrdersTbody.innerHTML = orders.slice(0, 5).map(o => `
                 <tr>
                    <td><strong>#MH-${o.id}</strong></td>
                    <td>${o.user_detail?.first_name || 'Guest'}</td>
                    <td>${API.fmtDate(o.created_at)}</td>
                    <td><span class="status-badge ${API.statusBadge(o.status)}">${o.status}</span></td>
                    <td>${API.fmtCurrency(o.total_price)}</td>
                    <td>
                        <div class="row-actions">
                            <button class="action-btn" title="View" onclick="alert('Order Details: \\n#MH-${o.id}\\nTotal: ${o.total_price}')"><i class="fa-solid fa-eye"></i></button>
                            <button class="action-btn update-order" title="Update Status" onclick="window.openOrderStatusModal(${o.id}, '${o.status}')"><i class="fa-solid fa-arrows-rotate"></i></button>
                        </div>
                    </td>
                </tr>
              `).join('');
          } catch(err) {}
      }
  }

  // ==========================================================
  // MODULE: ORDERS
  // ==========================================================
  const ordersSec = document.getElementById('orders-sec');
  if (ordersSec) {
      const ordersTbody = ordersSec.querySelector('tbody#orders-tbody');
      const renderOrders = async () => {
          if (!ordersTbody) return;
          try {
              const data = await API.req('/orders/admin/');
              const orders = data.results || data;
              ordersTbody.innerHTML = orders.map(o => `
                 <tr>
                    <td><strong>#MH-${o.id}</strong></td>
                    <td>${o.user_detail?.first_name || 'Guest'} ${o.user_detail?.last_name || ''}</td>
                    <td>${o.user_detail?.phone || '—'}</td>
                    <td>${API.fmtDate(o.created_at)}</td>
                    <td>${API.fmtCurrency(o.total_price)}</td>
                    <td>${o.payment_method}</td>
                    <td>
                        <select class="users-filter-select" style="padding: 4px 8px; border-radius: 4px; background: rgba(255,255,255,0.05); color: #fff; border: 1px solid var(--border-color); font-size: 13px;" onchange="window.updateOrderStatusInline(${o.id}, this.value)">
                            <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="confirmed" ${o.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                            <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                            <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                            <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </td>
                    <td>
                        <div class="row-actions">
                            <button class="action-btn" title="View" onclick="alert('Order Details: \\n#MH-${o.id}')"><i class="fa-solid fa-eye"></i></button>
                            <button class="action-btn update-order" title="Open Modal" onclick="window.openOrderStatusModal(${o.id}, '${o.status}')"><i class="fa-solid fa-arrows-rotate"></i></button>
                            <button class="action-btn delete" title="Cancel Order" onclick="window.cancelOrderInline(${o.id})"><i class="fa-solid fa-ban"></i></button>
                        </div>
                    </td>
                </tr>
              `).join('');

              // Update Stat Cards
              const statCards = ordersSec.querySelectorAll('.stat-info h4');
              if (statCards.length >= 4) {
                  statCards[0].textContent = orders.length;
                  statCards[1].textContent = orders.filter(o => o.status === 'delivered').length;
                  statCards[2].textContent = orders.filter(o => o.status === 'pending').length;
                  statCards[3].textContent = orders.filter(o => o.status === 'cancelled').length;
              }

          } catch (err) {}
      };

      // Inline list update
      window.updateOrderStatusInline = async function(id, newStatus) {
          try {
              await API.req(`/orders/admin/${id}/status/`, {
                  method: 'PATCH',
                  body: JSON.stringify({ status: newStatus })
              });
              API.toast('Order status updated', 'success');
              renderOrders();
              // Try to refresh overview if possible
              if(window._refreshOverview) window._refreshOverview();
          } catch (err) {
              API.toast('Update failed', 'error');
              renderOrders(); // Revert
          }
      };
      
      window.cancelOrderInline = async function(id) {
          if (!confirm("Are you sure you want to cancel this order?")) return;
          window.updateOrderStatusInline(id, 'cancelled');
      };

      // Define globally so it can be used in onclick for any table
      window.openOrderStatusModal = function(id, status) {
          document.getElementById('status-order-id-label').innerText = `#MH-${id}`;
          document.getElementById('update-order-status-select').value = status;
          
          window._currentEditingOrderId = id;
          
          document.getElementById('order-status-overlay').classList.add('open');
          document.body.style.overflow = 'hidden';
      };

      window.closeOrderStatusModal = function() {
          document.getElementById('order-status-overlay').classList.remove('open');
          document.body.style.overflow = '';
      };

      window.saveOrderStatus = async function() {
          const id = window._currentEditingOrderId;
          const newStatus = document.getElementById('update-order-status-select').value;
          if (!id || !newStatus) return;
          
          try {
              await API.req(`/orders/admin/${id}/status/`, {
                  method: 'PATCH',
                  body: JSON.stringify({ status: newStatus })
              });
              API.toast('Order updated', 'success');
              window.closeOrderStatusModal();
              renderOrders();
          } catch (err) {
              API.toast('Update failed', 'error');
          }
      };

      renderOrders();
  }

  // ==========================================================
  // MODULE: APPOINTMENTS
  // ==========================================================
  const apptsSec = document.getElementById('appointments-sec');
  if (apptsSec) {
      const apptsTbody = apptsSec.querySelector('tbody#appointments-tbody');
      const renderAppts = async () => {
          if (!apptsTbody) return;
          try {
              const data = await API.req('/services/appointments/admin/');
              const appts = data.results || data;
              apptsTbody.innerHTML = appts.map(a => `
                 <tr>
                    <td><strong>#SA-${a.id}</strong></td>
                    <td>
                        <div class="user-cell">
                            <div><span class="user-name">${a.customer_name || 'Customer'}</span></div>
                        </div>
                    </td>
                    <td>${a.service_detail?.name || 'Service'}<br/><small class="user-role-label" style="color:var(--text-muted);">${a.vehicle_make || ''} ${a.vehicle_model || ''}</small></td>
                    <td>${a.garage_name || '<span style="color:var(--text-muted);">Unassigned</span>'}</td>
                    <td>${API.fmtDate(a.appointment_date)}<br/><small class="user-role-label">${a.appointment_time}</small></td>
                    <td><span class="status-badge ${API.statusBadge(a.status)}">${a.status}</span></td>
                    <td>
                        <div class="row-actions">
                            <button class="action-btn assign-garage-appt" data-id="${a.id}" title="Assign Garage"><i class="fa-solid fa-house-chimney"></i></button>
                            <button class="action-btn update-appt" data-id="${a.id}" title="Update Status"><i class="fa-solid fa-arrows-rotate"></i></button>
                            ${a.status !== 'completed' && a.status !== 'cancelled' ? `<button class="action-btn complete-appt" data-id="${a.id}" title="Mark Completed"><i class="fa-solid fa-check"></i></button>` : ''}
                        </div>
                    </td>
                </tr>
              `).join('');

              // Update Stat Cards
              const statCards = apptsSec.querySelectorAll('.stat-info h4');
              if (statCards.length >= 4) {
                  statCards[0].textContent = appts.length;
                  statCards[1].textContent = appts.filter(a => ['approved', 'assigned'].includes(a.status)).length;
                  statCards[2].textContent = appts.filter(a => a.status === 'pending').length;
                  statCards[3].textContent = appts.filter(a => a.status === 'cancelled').length;
              }

              // Bind Garage Assign
              apptsTbody.querySelectorAll('.assign-garage-appt').forEach(btn => {
                  btn.addEventListener('click', async e => {
                      const id = e.target.closest('button').dataset.id;
                      try {
                          // Fetch available garages
                          const gData = await API.req('/services/garages/');
                          const garages = gData.results || gData;
                          
                          const select = document.getElementById('appt-garage-select');
                          select.innerHTML = '<option value="">Select Garage...</option>' + 
                              garages.map(g => `<option value="${g.id}">${g.garage_display_name}</option>`).join('');
                          
                          // Open modal (defined in HTML)
                          if (window.openApptAssignModal) {
                              window.openApptAssignModal(id);
                          }
                      } catch (err) { API.toast('Failed to load garages', 'error'); }
                  });
              });

              // Bind Update Status
              apptsTbody.querySelectorAll('.update-appt').forEach(btn => {
                  btn.addEventListener('click', async e => {
                      const id = e.target.closest('button').dataset.id;
                      if (window.openApptStatusModal) {
                          window.openApptStatusModal(id);
                      }
                  });
              });

              apptsTbody.querySelectorAll('.complete-appt').forEach(btn => {
                  btn.addEventListener('click', async e => {
                      if (!confirm("Mark this appointment as Completed?")) return;
                      const id = e.target.closest('button').dataset.id;
                      try {
                          await API.req(`/services/appointments/${id}/status/`, {
                              method: 'PATCH',
                              body: JSON.stringify({ status: 'completed' })
                          });
                          API.toast('Appointment completed', 'success');
                          renderAppts();
                      } catch (err) { API.toast('Update failed', 'error'); }
                  });
              });

          } catch (err) {}
      };
      
      // Global Submit Functions for Modals
      window.submitApptGarageAssign = async function() {
          const id = document.getElementById('appt-assign-id').value;
          const gId = document.getElementById('appt-garage-select').value;
          if (!gId) { API.toast("Please select a garage", "error"); return; }
          try {
              await API.req(`/services/appointments/${id}/assign-garage/`, {
                  method: 'PATCH',
                  body: JSON.stringify({ garage: parseInt(gId) })
              });
              if(window.closeApptAssignModal) window.closeApptAssignModal();
              API.toast('Garage assigned successfully', 'success');
              renderAppts();
          } catch (err) { API.toast('Failed to assign garage', 'error'); }
      };

      window.submitApptStatusUpdate = async function() {
          const id = document.getElementById('appt-status-id').value;
          const status = document.getElementById('appt-status-select').value;
          if (!status) { API.toast("Please select a status", "error"); return; }
          try {
              await API.req(`/services/appointments/${id}/status/`, {
                  method: 'PATCH',
                  body: JSON.stringify({ status: status })
              });
              if(window.closeApptStatusModal) window.closeApptStatusModal();
              API.toast('Appointment updated', 'success');
              renderAppts();
          } catch (err) { API.toast('Update failed', 'error'); }
      };

      renderAppts();
  }

  // ==========================================================
  // MODULE: PRODUCTS
  // ==========================================================
  const productsSec = document.getElementById('products-sec');
  if (productsSec) {
      const prodTbody = productsSec.querySelector('tbody#products-tbody');
      const renderProducts = async () => {
          if (!prodTbody) return;
          try {
              const data = await API.req('/products/admin/');
              const products = data.results || data;
              prodTbody.innerHTML = products.map(p => `
                 <tr>
                    <td><strong>#PRD-${p.id}</strong></td>
                    <td>
                        <div class="product-info-cell">
                            <div class="product-thumbnail-cell">
                                <img src="${p.image || 'assets/placeholder.jpg'}" alt="${p.name}"/>
                            </div>
                            <div>
                                <span class="user-name">${p.name}</span><br/>
                                <small class="user-role-label">${p.brand || 'No Brand'}</small>
                            </div>
                        </div>
                    </td>
                    <td>${p.category_name || '—'}</td>
                    <td>${API.fmtCurrency(p.price)}</td>
                    <td>${p.stock}</td>
                    <td><span class="product-status-badge ${p.stock > 10 ? 'status-stock' : (p.stock > 0 ? 'status-low' : 'status-out')}">${p.status}</span></td>
                    <td>
                        <div class="row-actions">
                            <button class="action-btn view-prod" data-id="${p.id}" title="View"><i class="fa-solid fa-eye"></i></button>
                            <button class="action-btn update-prod" data-id="${p.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
                            <button class="action-btn update-stock-prod" data-id="${p.id}" data-stock="${p.stock}" data-name="${p.name}" title="Update Stock" style="color:#6366f1"><i class="fa-solid fa-boxes-stacked"></i></button>
                            <button class="action-btn delete-prod" data-id="${p.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
              `).join('');

              // Update Stat Cards
              const statCards = productsSec.querySelectorAll('.stat-info h4');
              if (statCards.length >= 4) {
                  statCards[0].textContent = products.length;
                  statCards[1].textContent = products.filter(p => p.stock > 10).length;
                  statCards[2].textContent = products.filter(p => p.stock > 0 && p.stock <= 10).length;
                  statCards[3].textContent = products.filter(p => p.stock === 0).length;
              }

              prodTbody.querySelectorAll('.view-prod').forEach(btn => {
                  btn.addEventListener('click', e => {
                      const id = e.target.closest('button').dataset.id;
                      if (window.openAddProductModal) window.openAddProductModal('view', id);
                  });
              });

              prodTbody.querySelectorAll('.update-stock-prod').forEach(btn => {
                  btn.addEventListener('click', e => {
                      const b = e.target.closest('button');
                      if (window.openUpdateStockModal) window.openUpdateStockModal(b.dataset.id, b.dataset.name, b.dataset.stock);
                  });
              });

              prodTbody.querySelectorAll('.update-prod').forEach(btn => {
                  btn.addEventListener('click', e => {
                      const id = e.target.closest('button').dataset.id;
                      if (window.openAddProductModal) {
                          window.openAddProductModal('edit', id);
                      } else {
                          API.toast('Product modal script not loaded.', 'error');
                      }
                  });
              });

              prodTbody.querySelectorAll('.delete-prod').forEach(btn => {
                  btn.addEventListener('click', async e => {
                      if (!confirm("Really delete this product?")) return;
                      const id = e.target.closest('button').dataset.id;
                      try {
                          await API.req(`/products/${id}/`, { method: 'DELETE' });
                          API.toast('Product deleted', 'info');
                          renderProducts();
                      } catch (err) { API.toast('Failed to delete', 'error'); }
                  });
              });
          } catch (err) {}
      };
      // Expose globally so the product modal can refresh this table after save
      window._refreshProductsTable = renderProducts;

      renderProducts();
  }

  // ==========================================================
  // MODULE: USERS & MODERATORS
  // ==========================================================
  const loadUsersTab = async (sectionId, expectedRole) => {
      const sec = document.getElementById(sectionId);
      if (!sec) return;
      
      const tbody = sec.querySelector('tbody');
      if (!tbody) return;

      try {
          const data = await API.req('/auth/users/');
          const allUsers = data.results || data;
          let usersList = allUsers;
          
          if (expectedRole) {
              usersList = usersList.filter(u => u.role === expectedRole);
          }

          // Update Stats for that section
          const statCards = sec.querySelectorAll('.stat-info h4');
          if (statCards.length >= 4) {
              statCards[0].textContent = usersList.length;
              statCards[1].textContent = usersList.filter(u => u.is_active).length;
              const currentMonth = new Date().getMonth();
              statCards[2].textContent = usersList.filter(u => new Date(u.date_joined).getMonth() === currentMonth).length;
              statCards[3].textContent = usersList.filter(u => !u.is_active).length;
          }

          tbody.innerHTML = usersList.map(u => `
             <tr data-id="${u.id}" data-status="${u.is_active ? 'active' : 'blocked'}" data-role="${u.role}">
                <td><strong>#USR-${u.id}</strong></td>
                <td>
                    <div class="user-cell">
                        <div class="user-avatar-sm" style="background:${u.is_active ? 'var(--primary-gradient)' : '#666'}">
                            ${(u.first_name?.[0] || u.username?.[0] || 'U').toUpperCase()}
                        </div>
                        <div>
                            <span class="user-name">${u.first_name || ''} ${u.last_name || ''}</span><br/>
                            <small class="user-role-label">${u.role}</small>
                        </div>
                    </div>
                </td>
                <td>${u.email}</td>
                <td>${u.phone || '—'}</td>
                <td><span class="status-badge ${u.is_active ? 'approved' : 'cancelled'}">${u.is_active ? 'Active' : 'Blocked'}</span></td>
                <td>
                    <div class="row-actions">
                        <button class="action-btn view-user" data-id="${u.id}" title="View Details"><i class="fa-solid fa-eye"></i></button>
                        <button class="action-btn edit-user" data-id="${u.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
                        <button class="action-btn block-user" data-id="${u.id}" data-active="${u.is_active}" data-name="${u.first_name || ''} ${u.last_name || ''}" title="${u.is_active ? 'Block' : 'Unblock'}">
                            <i class="fa-solid ${u.is_active ? 'fa-ban' : 'fa-lock-open'}" style="${u.is_active? 'color:#f59e0b;' : 'color:#10b981;'}"></i>
                        </button>
                        <button class="action-btn delete-user" data-id="${u.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>
          `).join('');

          // Bind Action Buttons
          tbody.querySelectorAll('.view-user').forEach(btn => {
              btn.addEventListener('click', e => {
                  const id = e.currentTarget.dataset.id;
                  if (window.openUserDetails) window.openUserDetails(id);
              });
          });

          tbody.querySelectorAll('.edit-user').forEach(btn => {
              btn.addEventListener('click', e => {
                  const id = e.currentTarget.dataset.id;
                  if (window.openUserModal) window.openUserModal('edit', id);
              });
          });

          tbody.querySelectorAll('.block-user').forEach(btn => {
              btn.addEventListener('click', async e => {
                  const id = e.currentTarget.dataset.id;
                  const name = e.currentTarget.dataset.name;
                  const isActive = e.currentTarget.dataset.active === 'true';
                  if (!confirm(`Really ${isActive ? 'block' : 'unblock'} ${name}?`)) return;
                  
                  try {
                      await API.req(`/auth/users/${id}/`, {
                          method: 'PATCH',
                          body: JSON.stringify({ is_active: !isActive })
                      });
                      
                      if (window.syncUserAppointments) {
                          window.syncUserAppointments(name.trim(), isActive);
                      }

                      API.toast(`User ${isActive ? 'blocked' : 'unblocked'}`, 'success');
                      loadUsersTab(sectionId, expectedRole);
                  } catch(err) { API.toast('Failed to update status', 'error'); }
              });
          });

          tbody.querySelectorAll('.delete-user').forEach(btn => {
              btn.addEventListener('click', async e => {
                  const id = e.currentTarget.dataset.id;
                  if (!confirm('Permanently delete this user?')) return;
                  try {
                      await API.req(`/auth/users/${id}/`, { method: 'DELETE' });
                      API.toast('User deleted', 'info');
                      loadUsersTab(sectionId, expectedRole);
                  } catch(err) { API.toast('Failed to delete', 'error'); }
              });
          });

      } catch (err) {
          console.error(`Error loading ${expectedRole}s:`, err);
      }
  };

  // Initial Data Load
  loadUsersTab('users-sec', 'customer');
  loadUsersTab('moderators-sec', 'moderator');

  // ==========================================================
  // MODULE: GARAGES
  // ==========================================================
  const garagesSec = document.getElementById('garages-sec');
  if (garagesSec) {
      const garagesTbody = garagesSec.querySelector('tbody#garages-tbody');
      let _allGarages   = [];

      const renderGarages = (list) => {
          if (!garagesTbody) return;
          if (!list || list.length === 0) {
              garagesTbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:30px;">No garages found. Click "Add Garage" to create one.</td></tr>`;
              return;
          }
          garagesTbody.innerHTML = list.map(g => `
            <tr data-id="${g.id}" data-status="${g.is_active ? 'active' : 'inactive'}" data-verified="${g.is_verified ? 'verified' : 'unverified'}">
               <td><strong>#GRG-${g.id}</strong></td>
               <td>
                 <div class="user-cell">
                   <div class="user-avatar-sm" style="background:var(--primary-gradient)">
                     ${(g.garage_name?.[0] || 'G').toUpperCase()}
                   </div>
                   <div><span class="user-name">${g.garage_name || '—'}</span><br/>
                   <small class="user-role-label">${g.email}</small></div>
                 </div>
               </td>
               <td>${g.first_name || ''} ${g.last_name || ''}<br/><small class="user-role-label">${g.phone || '—'}</small></td>
               <td>${g.city || '—'}</td>
               <td><span class="status-badge ${g.is_active ? 'approved' : 'cancelled'}">${g.is_active ? 'Active' : 'Inactive'}</span></td>
               <td><span class="status-badge ${g.is_verified ? 'approved' : 'pending'}">${g.is_verified ? 'Verified' : 'Pending'}</span></td>
               <td>
                 <div class="row-actions">
                   <button class="action-btn edit-garage" data-garage='${JSON.stringify(g)}' title="Edit"><i class="fa-solid fa-pen"></i></button>
                   <button class="action-btn toggle-garage" data-id="${g.id}" data-active="${g.is_active}" title="${g.is_active ? 'Deactivate' : 'Activate'}">
                     <i class="fa-solid ${g.is_active ? 'fa-toggle-on' : 'fa-toggle-off'}" style="color:${g.is_active ? '#10b981' : '#6b7280'};"></i>
                   </button>
                   <button class="action-btn verify-garage" data-id="${g.id}" data-verified="${g.is_verified}" title="${g.is_verified ? 'Unverify' : 'Verify'}">
                     <i class="fa-solid fa-shield-halved" style="color:${g.is_verified ? '#f59e0b' : '#6b7280'};"></i>
                   </button>
                   <button class="action-btn delete delete-garage" data-id="${g.id}" data-name="${g.garage_name}" title="Delete"><i class="fa-solid fa-trash"></i></button>
                 </div>
               </td>
            </tr>
          `).join('');

          // Bind Edit
          garagesTbody.querySelectorAll('.edit-garage').forEach(btn => {
              btn.addEventListener('click', e => {
                  const data = JSON.parse(e.currentTarget.dataset.garage);
                  if (window.openGarageModal) window.openGarageModal('edit', data);
              });
          });

          // Bind Toggle Active
          garagesTbody.querySelectorAll('.toggle-garage').forEach(btn => {
              btn.addEventListener('click', async e => {
                  const id       = e.currentTarget.dataset.id;
                  const isActive = e.currentTarget.dataset.active === 'true';
                  if (!confirm(`${isActive ? 'Deactivate' : 'Activate'} this garage?`)) return;
                  try {
                      await API.req(`/auth/garages/admin/${id}/`, { method: 'PATCH', body: JSON.stringify({ is_active: !isActive }) });
                      API.toast(`Garage ${isActive ? 'deactivated' : 'activated'}`, 'success');
                      loadGarages();
                  } catch { API.toast('Update failed', 'error'); }
              });
          });

          // Bind Toggle Verified
          garagesTbody.querySelectorAll('.verify-garage').forEach(btn => {
              btn.addEventListener('click', async e => {
                  const id         = e.currentTarget.dataset.id;
                  const isVerified = e.currentTarget.dataset.verified === 'true';
                  try {
                      await API.req(`/auth/garages/admin/${id}/`, { method: 'PATCH', body: JSON.stringify({ is_verified: !isVerified }) });
                      API.toast(`Garage ${isVerified ? 'unverified' : 'verified'}`, 'success');
                      loadGarages();
                  } catch { API.toast('Update failed', 'error'); }
              });
          });

          // Bind Delete
          garagesTbody.querySelectorAll('.delete-garage').forEach(btn => {
              btn.addEventListener('click', async e => {
                  const id   = e.currentTarget.dataset.id;
                  const name = e.currentTarget.dataset.name;
                  if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
                  try {
                      await API.req(`/auth/garages/admin/${id}/`, { method: 'DELETE' });
                      API.toast('Garage deleted', 'info');
                      loadGarages();
                  } catch { API.toast('Delete failed', 'error'); }
              });
          });
      };

      const loadGarages = async () => {
          if (garagesTbody) garagesTbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:30px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading garages…</td></tr>`;
          try {
              const data    = await API.req('/auth/garages/admin/');
              _allGarages   = data.results || data;

              // Update Stats
              const statTotal    = document.getElementById('garage-stat-total');
              const statActive   = document.getElementById('garage-stat-active');
              const statCities   = document.getElementById('garage-stat-cities');
              const statInactive = document.getElementById('garage-stat-inactive');
              if (statTotal)    statTotal.textContent    = _allGarages.length;
              if (statActive)   statActive.textContent   = _allGarages.filter(g => g.is_active).length;
              if (statCities)   statCities.textContent   = new Set(_allGarages.map(g => g.city)).size;
              if (statInactive) statInactive.textContent = _allGarages.filter(g => !g.is_active).length;

              renderGarages(_allGarages);
          } catch(err) {
              console.error('Failed to load garages', err);
              if (garagesTbody) garagesTbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#e74c3c;padding:30px;">Failed to load garages.</td></tr>`;
          }
      };

      // Global filter function (called by inline oninput/onchange)
      window.filterGaragesTable = () => {
          const q      = (document.getElementById('garages-search-input')?.value || '').toLowerCase();
          const status = (document.getElementById('garages-status-filter')?.value || '');
          const filtered = _allGarages.filter(g => {
              const matchQ = !q || [g.garage_name, g.email, g.city, g.first_name, g.last_name].some(v => (v || '').toLowerCase().includes(q));
              let matchS = true;
              if (status === 'active')       matchS = g.is_active;
              else if (status === 'inactive') matchS = !g.is_active;
              else if (status === 'verified') matchS = g.is_verified;
              else if (status === 'unverified') matchS = !g.is_verified;
              return matchQ && matchS;
          });
          renderGarages(filtered);
      };

      window._refreshGaragesTable = loadGarages;
      loadGarages();
  }
});

