/**
 * js/user-modal.js
 * Dynamic User Edit/View Modal for MOTOHUB Admin Panel
 */

const userModalState = {
    mode: 'view',
    userId: null
};

// Inject the modal HTML into the DOM if it doesn't exist
function injectUserModal() {
    if (document.getElementById('user-modal-overlay')) return;

    const modalHTML = `
    <div class="garage-modal-overlay" id="user-modal-overlay" onclick="if(event.target===this) window.closeUserModal()">
        <div class="garage-modal" style="max-width: 600px;">
            <form id="user-edit-form">
                <div class="garage-modal-header">
                    <h3><i class="fa-solid fa-user-gear"></i> <span id="user-modal-title">User Details</span></h3>
                    <button class="modal-close-btn" type="button" onclick="window.closeUserModal()">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                
                <div class="moderator-form-body" style="padding: 25px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div class="form-group">
                        <label>First Name</label>
                        <input id="u-first-name" type="text" required />
                    </div>
                    <div class="form-group">
                        <label>Last Name</label>
                        <input id="u-last-name" type="text" required />
                    </div>
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label>Email Address</label>
                        <input id="u-email" type="email" required />
                    </div>
                    <div class="form-group">
                        <label>Phone Number</label>
                        <input id="u-phone" type="text" required />
                    </div>
                    <div class="form-group">
                        <label>Role</label>
                        <select id="u-role" class="users-filter-select" style="width:100%;">
                            <option value="customer">Customer</option>
                            <option value="moderator">Moderator</option>
                            <option value="garage">Garage Partner</option>
                            <option value="admin">Administrator</option>
                        </select>
                    </div>
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label>Account Status</label>
                        <div style="display:flex; gap: 15px; align-items:center;">
                            <select id="u-status" class="users-filter-select" style="width:100%;">
                                <option value="true">Active</option>
                                <option value="false">Blocked</option>
                            </select>
                            <span id="u-status-tag" class="status-badge" style="white-space:nowrap;">Active</span>
                        </div>
                    </div>
                </div>

                <div class="garage-modal-footer">
                    <button type="button" class="btn btn-red btn-sm outline-btn" onclick="window.closeUserModal()">Cancel</button>
                    <button type="submit" id="user-save-btn" class="btn btn-red btn-sm">Save Changes</button>
                </div>
            </form>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Bind form submit
    document.getElementById('user-edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await window.saveUserData();
    });
}

// Open the modal
window.openUserModal = async function(mode = 'view', userId) {
    if (!userId) return;
    injectUserModal();
    
    userModalState.mode = mode;
    userModalState.userId = userId;
    
    const overlay = document.getElementById('user-modal-overlay');
    const title = document.getElementById('user-modal-title');
    const saveBtn = document.getElementById('user-save-btn');
    const form = document.getElementById('user-edit-form');
    const inputs = form.querySelectorAll('input, select');
    
    // Reset view
    title.innerText = mode === 'edit' ? `Edit User: #USR-${userId}` : `User Details: #USR-${userId}`;
    saveBtn.style.display = mode === 'edit' ? 'block' : 'none';
    
    inputs.forEach(inp => {
        inp.disabled = mode === 'view';
        inp.style.opacity = mode === 'view' ? '0.7' : '1';
    });

    overlay.classList.add('open');

    // Fetch data
    try {
        const user = await API.req(`/auth/users/${userId}/`);
        document.getElementById('u-first-name').value = user.first_name || '';
        document.getElementById('u-last-name').value = user.last_name || '';
        document.getElementById('u-email').value = user.email || '';
        document.getElementById('u-phone').value = user.phone || '';
        document.getElementById('u-role').value = user.role || 'customer';
        document.getElementById('u-status').value = user.is_active.toString();
        
        const statusTag = document.getElementById('u-status-tag');
        statusTag.className = `status-badge ${user.is_active ? 'approved' : 'cancelled'}`;
        statusTag.innerText = user.is_active ? 'Active' : 'Blocked';
    } catch (err) {
        API.toast('Failed to load user details', 'error');
        window.closeUserModal();
    }
};

window.closeUserModal = function() {
    const overlay = document.getElementById('user-modal-overlay');
    if (overlay) overlay.classList.remove('open');
};

window.saveUserData = async function() {
    const id = userModalState.userId;
    const body = {
        first_name: document.getElementById('u-first-name').value,
        last_name: document.getElementById('u-last-name').value,
        email: document.getElementById('u-email').value,
        phone: document.getElementById('u-phone').value,
        role: document.getElementById('u-role').value,
        is_active: document.getElementById('u-status').value === 'true'
    };

    try {
        await API.req(`/auth/users/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(body)
        });
        
        API.toast('User updated successfully', 'success');
        window.closeUserModal();
        
        // Refresh the appropriate tab
        if (typeof loadUsersTab === 'function') {
            const role = body.role === 'moderator' ? 'moderator' : 'customer';
            const sec = role === 'moderator' ? 'moderators-sec' : 'users-sec';
            loadUsersTab(sec, role);
        }
    } catch (err) {
        API.toast(err.detail || 'Failed to update user', 'error');
    }
};
