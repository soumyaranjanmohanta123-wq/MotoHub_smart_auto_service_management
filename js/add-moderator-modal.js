/**
 * js/add-moderator-modal.js
 * Reusable dynamic Moderator management modal for MOTOHUB Admin Panel
 */

// Backward compatibility wrapper
window.openModeratorModal = function(mode, userId) {
    window.openAddModeratorModal(mode, userId);
};

// Generates the initial HTML for the moderator modal
function injectAddModeratorModal() {
    if (document.getElementById('moderator-modal-dynamic-overlay')) return; // Already exists

    const modalHTML = `
    <div class="garage-modal-overlay" id="moderator-modal-dynamic-overlay" onclick="if(event.target===this) window.closeAddModeratorModal()">
        <div class="garage-modal" style="max-width: 600px; max-height: 90vh; overflow-y: auto; padding: 0; border: 1px solid rgba(255,255,255,0.1);">
            <form id="dynamic-moderator-form" style="display: grid; grid-template-columns: 1fr;">
                <div class="garage-modal-header" style="position: sticky; top: 0; background: #141428; z-index: 10; border-bottom: 1px solid rgba(255,255,255,0.08); padding: 1.5rem 2rem; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 10px;">
                        <i class="fa-solid fa-user-shield" style="color: var(--accent-red);"></i> 
                        <span>Add New Moderator</span>
                    </h3>
                    <button class="modal-close-btn" type="button" onclick="window.closeAddModeratorModal()" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <!-- Form Fields Container -->
                <div class="moderator-form-body" style="padding: 25px 2rem; display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label>Full Name <span class="req">*</span></label>
                        <input id="dm-name" type="text" placeholder="e.g. John Doe" required />
                    </div>
                    <div class="form-group">
                        <label>Email Address <span class="req">*</span></label>
                        <input id="dm-email" type="email" placeholder="john@motohub.com" required />
                    </div>
                    <div class="form-group">
                        <label>Phone Number <span class="req">*</span></label>
                        <input id="dm-phone" type="text" placeholder="+91 98765 43210" required />
                    </div>
                    <div class="form-group">
                        <label>Role <span class="req">*</span></label>
                        <select id="dm-role" class="users-filter-select" style="width: 100%;" required>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Administrator</option>
                            <option value="garage">Garage Partner</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Status <span class="req">*</span></label>
                        <select id="dm-status" class="users-filter-select" style="width: 100%;" required>
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="blocked">Blocked</option>
                        </select>
                    </div>
                    <div class="form-group" id="dm-password-group" style="grid-column: 1 / -1;">
                        <label>Password <span class="req">*</span></label>
                        <div style="position: relative;">
                            <input id="dm-password" type="password" placeholder="Create a secure password" required />
                            <button type="button" onclick="window.toggleModeratorPassword()" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer;">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                        </div>
                        <small style="color: var(--text-muted); display: block; margin-top: 5px;">Password must be at least 8 characters long.</small>
                    </div>
                </div>

                <div class="garage-modal-footer" style="position: sticky; bottom: 0; background: #141428; z-index: 10; border-top: 1px solid rgba(255,255,255,0.08); padding: 1.5rem 2rem; display: flex; gap: 15px; justify-content: flex-end;">
                    <button type="button" class="btn btn-red btn-sm outline-btn" onclick="window.closeAddModeratorModal()" style="border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.7);">Cancel</button>
                    <button type="submit" class="btn btn-red btn-sm">Save Moderator</button>
                </div>
            </form>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Form Submit Event
    document.getElementById('dynamic-moderator-form').addEventListener('submit', function(e) {
        e.preventDefault();
        window.saveModeratorData();
    });
}

// Open modal
window.openAddModeratorModal = function(mode = 'add', userId = null) {
    injectAddModeratorModal();
    
    currentModeratorMode = mode;
    currentModeratorId = userId;
    
    const overlay = document.getElementById('moderator-modal-dynamic-overlay');
    const form = document.getElementById('dynamic-moderator-form');
    const titleSpan = overlay.querySelector('.garage-modal-header h3 span');
    const submitBtn = form.querySelector('button[type="submit"]');
    const passwordGroup = document.getElementById('dm-password-group');
    const inputs = form.querySelectorAll('input, select, textarea');
    
    // Reset form
    form.reset();

    // Enable all inputs by default
    inputs.forEach(input => {
        input.disabled = false;
        input.style.opacity = '1';
    });
    
    // Set Mode UI
    if (mode === 'edit') {
        titleSpan.innerText = userId ? `Edit Moderator: #${userId}` : 'Edit Moderator';
        submitBtn.innerText = 'Update Moderator';
        submitBtn.style.display = 'block';
        passwordGroup.style.display = 'none'; // Don't allow password change here for now
        document.getElementById('dm-password').required = false;
        if (userId) populateModeratorFields(userId);
    } else if (mode === 'view') {
        titleSpan.innerText = `Moderator Details: #${userId}`;
        submitBtn.style.display = 'none';
        passwordGroup.style.display = 'none';
        if (userId) populateModeratorFields(userId);
        inputs.forEach(input => {
            input.disabled = true;
            input.style.opacity = '0.7';
        });
    } else {
        titleSpan.innerText = 'Add New Moderator';
        submitBtn.innerText = 'Create Moderator';
        submitBtn.style.display = 'block';
        passwordGroup.style.display = 'block';
        document.getElementById('dm-password').required = true;
    }
    
    overlay.classList.add('open');
};

window.closeAddModeratorModal = function() {
    const overlay = document.getElementById('moderator-modal-dynamic-overlay');
    if (overlay) overlay.classList.remove('open');
};

window.toggleModeratorPassword = function() {
    const pwdInput = document.getElementById('dm-password');
    const icon = event.currentTarget.querySelector('i');
    if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        pwdInput.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
};

let currentModeratorMode = 'add';
let currentModeratorId = null;

async function populateModeratorFields(userId) {
    try {
        const user = await API.req(`/auth/users/${userId}/`);
        document.getElementById('dm-name').value = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        document.getElementById('dm-email').value = user.email || '';
        document.getElementById('dm-phone').value = user.phone || '';
        document.getElementById('dm-role').value = user.role || 'moderator';
        document.getElementById('dm-status').value = user.is_active ? 'active' : 'blocked';
    } catch (err) {
        API.toast('Failed to load user details', 'error');
        window.closeAddModeratorModal();
    }
}

window.saveModeratorData = async function() {
    const fullName = document.getElementById('dm-name').value.trim();
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    const payload = {
        first_name: firstName,
        last_name: lastName,
        email: document.getElementById('dm-email').value,
        phone: document.getElementById('dm-phone').value,
        role: document.getElementById('dm-role').value,
        is_active: document.getElementById('dm-status').value === 'active'
    };

    if (currentModeratorMode === 'add') {
        payload.password = document.getElementById('dm-password').value;
    }

    try {
        if (currentModeratorMode === 'edit' && currentModeratorId) {
            await API.req(`/auth/users/${currentModeratorId}/`, {
                method: 'PATCH',
                body: JSON.stringify(payload)
            });
            API.toast('Moderator updated successfully!', 'success');
        } else {
            await API.req('/auth/users/', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            API.toast('Moderator created successfully!', 'success');
        }
        
        window.closeAddModeratorModal();
        if (typeof loadUsersTab === 'function') {
            loadUsersTab('moderators-sec', 'moderator');
        }
    } catch (err) {
        console.error(err);
        let msg = err.detail || 'Failed to save moderator';
        if(err.email) msg = `Email: ${err.email[0]}`;
        else if(err.username) msg = `Username: ${err.username[0]}`;
        API.toast(msg, 'error');
    }
};
