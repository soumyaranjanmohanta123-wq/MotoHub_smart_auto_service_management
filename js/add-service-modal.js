(function() {
    'use strict';

    function injectAddServiceModal() {
        if (document.getElementById('add-service-modal-overlay')) return;

        const modalHTML = `
            <div class="garage-modal-overlay" id="add-service-modal-overlay">
                <div class="garage-modal" style="max-width: 800px; display: grid; grid-template-rows: auto 1fr auto; padding: 0;">
                    <!-- Sticky Header -->
                    <div class="garage-modal-header" style="padding: 1.5rem 2rem; border-bottom: 1px solid rgba(255,255,255,0.08);">
                        <h3 id="service-modal-title"><i class="fa-solid fa-gears"></i> Add New Service</h3>
                        <button class="modal-close-btn" onclick="window.closeAddServiceModal()"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <!-- Scrollable Content -->
                    <div class="garage-modal-content" style="padding: 2rem; overflow-y: auto; max-height: 70vh;">
                        <form id="add-service-form" class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <input type="hidden" id="service-id-hidden">
                            
                            <!-- Basic Info -->
                            <div class="form-group" style="grid-column: 1 / -1;">
                                <label>Service Name</label>
                                <input type="text" id="service-name" placeholder="e.g. Premium Synthetic Oil Change" required>
                            </div>

                            <div class="form-group">
                                <label>Category</label>
                                <select id="service-category" required onchange="window.updateServiceSubcategories()">
                                    <option value="">Select Category</option>
                                    <option value="Maintenance">Maintenance</option>
                                    <option value="Mechanical">Mechanical</option>
                                    <option value="Electrical">Electrical</option>
                                    <option value="Detailing">Detailing</option>
                                    <option value="Tires">Tires & Wheels</option>
                                    <option value="Inspection">Inspection</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label>Subcategory</label>
                                <select id="service-subcategory">
                                    <option value="">Select Subcategory</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label>Estimated Duration</label>
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <input type="number" id="service-duration-val" placeholder="30" style="flex: 1;">
                                    <select id="service-duration-unit" style="width: 100px;">
                                        <option value="min">Mins</option>
                                        <option value="hr">Hrs</option>
                                        <option value="day">Days</option>
                                    </select>
                                </div>
                            </div>

                            <div class="form-group">
                                <label>Base Price (₹)</label>
                                <input type="number" id="service-price" placeholder="499">
                            </div>

                            <div class="form-group">
                                <label>Service Status</label>
                                <select id="service-status">
                                    <option value="active">Active</option>
                                    <option value="pending">Draft</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label>Priority Level</label>
                                <select id="service-priority">
                                    <option value="normal">Normal</option>
                                    <option value="high">High</option>
                                    <option value="low">Low</option>
                                </select>
                            </div>

                            <div class="form-group" style="grid-column: 1 / -1;">
                                <label>Service Description</label>
                                <textarea id="service-description" rows="4" placeholder="Describe the service details, inclusions, and specialized equipment needed..."></textarea>
                            </div>

                            <!-- Image Upload (Mock) -->
                            <div class="form-group" style="grid-column: 1 / -1;">
                                <label>Service Banner / Icon</label>
                                <div style="border: 2px dashed rgba(255,255,255,0.1); border-radius: 12px; padding: 2rem; text-align: center; cursor: pointer; transition: all 0.3s; background: rgba(255,255,255,0.02);"
                                     onmouseover="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='var(--accent-red)'"
                                     onmouseout="this.style.background='rgba(255,255,255,0.02)'; this.style.borderColor='rgba(255,255,255,0.1)'">
                                    <i class="fa-solid fa-cloud-arrow-up" style="font-size: 2rem; color: var(--accent-red); margin-bottom: 1rem; display: block;"></i>
                                    <span style="font-weight: 600; display: block; margin-bottom: 0.5rem;">Click to upload or drag and drop</span>
                                    <small style="color: var(--text-muted);">PNG, JPG (Max 2MB)</small>
                                </div>
                            </div>
                        </form>
                    </div>

                    <!-- Sticky Footer -->
                    <div class="garage-modal-footer" style="padding: 1.5rem 2rem; border-top: 1px solid rgba(255,255,255,0.08); background: rgba(15,15,15,0.98); display: flex; justify-content: flex-end; gap: 12px;">
                        <button class="btn btn-red btn-sm outline-btn" onclick="window.closeAddServiceModal()">Cancel</button>
                        <button class="btn btn-red btn-sm" id="save-service-btn" onclick="window.saveService()">Create Service</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Handle overlay click
        document.getElementById('add-service-modal-overlay').addEventListener('click', function(e) {
            if (e.target === this) window.closeAddServiceModal();
        });
    }

    const subcategoriesMapping = {
        'Maintenance': ['Oil Change', 'Filter Replacement', 'Fluid Check', 'General Service'],
        'Mechanical': ['Engine Repair', 'Brake Service', 'Suspension', 'Transmission'],
        'Electrical': ['Battery Health', 'Lighting', 'Diagnostics', 'AC Service'],
        'Detailing': ['Washing', 'Polishing', 'Interior Cleaning', 'Ceramic Coating'],
        'Tires': ['Alignment', 'Balancing', 'Tire Rotation', 'Puncture Repair'],
        'Inspection': ['Pre-purchase Inspection', 'Safety Check', 'Emissions']
    };

    window.updateServiceSubcategories = function() {
        const cat = document.getElementById('service-category').value;
        const subCatSelect = document.getElementById('service-subcategory');
        subCatSelect.innerHTML = '<option value="">Select Subcategory</option>';
        
        if (subcategoriesMapping[cat]) {
            subcategoriesMapping[cat].forEach(sub => {
                const opt = document.createElement('option');
                opt.value = sub;
                opt.textContent = sub;
                subCatSelect.appendChild(opt);
            });
        }
    };

    window.openAddServiceModal = function(mode = 'add', serviceId = null) {
        injectAddServiceModal();
        const overlay = document.getElementById('add-service-modal-overlay');
        const title = document.getElementById('service-modal-title');
        const saveBtn = document.getElementById('save-service-btn');
        const form = document.getElementById('add-service-form');

        form.reset();
        document.getElementById('service-id-hidden').value = serviceId || '';

        // Enable all inputs by default
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.disabled = false;
            input.style.opacity = '1';
        });

        if (mode === 'edit' && serviceId) {
            title.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Edit Service #${serviceId}`;
            saveBtn.textContent = 'Save Changes';
            saveBtn.style.display = 'block';
            populateServiceFields(serviceId);
        } else if (mode === 'view' && serviceId) {
            title.innerHTML = `<i class="fa-solid fa-eye"></i> View Service Details`;
            saveBtn.style.display = 'none';
            populateServiceFields(serviceId);
            inputs.forEach(input => {
                input.disabled = true;
                input.style.opacity = '0.7';
            });
        } else {
            title.innerHTML = `<i class="fa-solid fa-gears"></i> Add New Service`;
            saveBtn.textContent = 'Create Service';
            saveBtn.style.display = 'block';
        }

        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    };

    window.closeAddServiceModal = function() {
        const overlay = document.getElementById('add-service-modal-overlay');
        if (overlay) {
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        }
    };

    function populateServiceFields(id) {
        const mockData = {
            '1': { name: 'Simple Inspection', category: 'Inspection', subcategory: 'Safety Check', duration: '30', unit: 'min', price: 499, status: 'active', priority: 'normal', desc: 'Basic 25-point safety inspection for all vehicle types.' },
            '2': { name: 'Home Service', category: 'Maintenance', subcategory: 'Oil Change', duration: '90', unit: 'min', price: 1299, status: 'active', priority: 'high', desc: 'Doorstep oil change and basic checkup.' },
            '3': { name: 'Major Garage Service', category: 'Mechanical', subcategory: 'Engine Repair', duration: '8', unit: 'hr', price: 4999, status: 'active', priority: 'high', desc: 'Comprehensive engine and transmission overhaul.' },
            '4': { name: 'Wheel Alignment & Balancing', category: 'Tires', subcategory: 'Alignment', duration: '45', unit: 'min', price: 799, status: 'pending', priority: 'normal', desc: 'Precision laser alignment and wheel balancing.' }
        };

        const s = mockData[id];
        if (s) {
            document.getElementById('service-name').value = s.name;
            document.getElementById('service-category').value = s.category;
            window.updateServiceSubcategories();
            document.getElementById('service-subcategory').value = s.subcategory;
            document.getElementById('service-duration-val').value = s.duration;
            document.getElementById('service-duration-unit').value = s.unit;
            document.getElementById('service-price').value = s.price;
            document.getElementById('service-status').value = s.status;
            document.getElementById('service-priority').value = s.priority;
            document.getElementById('service-description').value = s.desc;
        }
    }

    window.saveService = async function() {
        const btn = document.getElementById('save-service-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Saving...';
        btn.disabled = true;

        const serviceId = document.getElementById('service-id-hidden').value;
        const formData = {
            name: document.getElementById('service-name').value,
            category: document.getElementById('service-category').value,
            subcategory: document.getElementById('service-subcategory').value,
            duration: document.getElementById('service-duration-val').value + ' ' + document.getElementById('service-duration-unit').value,
            price: document.getElementById('service-price').value,
            status: document.getElementById('service-status').value,
            description: document.getElementById('service-description').value
        };

        console.log('Saving Service:', formData);

        try {
            // await API.req(serviceId ? \`/services/\${serviceId}\` : '/services', serviceId ? 'PUT' : 'POST', formData);
            alert(`Service \${serviceId ? 'updated' : 'created'} successfully!`);
            window.closeAddServiceModal();
            if (window.loadServices) window.loadServices();
        } catch (err) {
            console.error('Failed to save service:', err);
            alert('Error saving service. Check console.');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    };

})();
