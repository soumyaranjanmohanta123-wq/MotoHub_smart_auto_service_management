/**
 * js/add-product-modal.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Dynamic Add Product Modal — MOTOHUB Admin / Moderator / Garage Panels
 *
 * Features:
 *  • 12 category-specific field sets (selects + text inputs)
 *  • Subcategory dropdowns per category
 *  • Auto-generated SKU prefixes
 *  • Drag-and-drop + click image upload (primary + 4 gallery)
 *  • Real API submission via multipart/form-data (POST /api/products/create/)
 *  • Edit mode: fetches live product data (PATCH /api/products/<id>/upload/)
 *  • View-only mode: all fields disabled
 *  • Refreshes admin product table after save (_refreshProductsTable hook)
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ── Backward-compatibility alias ─────────────────────────────────────────── */
window.openProductModal = function (mode, productId) {
    window.openAddProductModal(mode, productId);
};

/* ═══════════════════════════════════════════════════════════════════════════
   DATA DEFINITIONS
═══════════════════════════════════════════════════════════════════════════ */

/* Category-specific dynamic fields */
const CATEGORY_SPECS = {
    "Headlights & Lighting": [
        {
            name: "lightType", label: "Light Type", type: "select",
            options: ["LED", "Halogen", "HID / Xenon", "DRL Strip", "Projector"]
        },
        { name: "power", label: "Power (Watt)", type: "text", placeholder: "e.g. 55W" },
        { name: "colorTemp", label: "Color Temperature", type: "text", placeholder: "e.g. 6000K" },
        {
            name: "vehicleCompatibility", label: "Vehicle Compatibility",
            type: "text", placeholder: "e.g. Honda Civic, Hyundai i20"
        }
    ],
    "Car Audio System": [
        {
            name: "audioType", label: "Type", type: "select",
            options: ["Speaker", "Subwoofer", "Stereo / Head Unit", "Amplifier", "Tweeter", "Full Kit"]
        },
        { name: "powerOutput", label: "Power Output (Watt)", type: "text", placeholder: "e.g. 200W RMS" },
        {
            name: "connectivity", label: "Connectivity", type: "select",
            options: ["Bluetooth", "USB", "AUX", "Bluetooth + USB", "Bluetooth + USB + AUX", "Wired Only"]
        },
        { name: "audioBrand", label: "Audio Brand", type: "text", placeholder: "e.g. JBL, Pioneer, Sony" }
    ],
    "Wheels & Tires": [
        { name: "tireSize", label: "Tire Size", type: "text", placeholder: "e.g. 205/65 R15" },
        {
            name: "tireType", label: "Tire Type", type: "select",
            options: ["Tubeless", "Tube Type", "Run Flat", "All-Season"]
        },
        {
            name: "material", label: "Material", type: "select",
            options: ["Rubber", "Synthetic Rubber", "Performance Compound", "All-Season Compound"]
        },
        {
            name: "vehicleCompatibility", label: "Vehicle Compatibility",
            type: "text", placeholder: "e.g. Maruti Swift, Honda City"
        }
    ],
    "Suspension": [
        {
            name: "suspensionType", label: "Suspension Type", type: "select",
            options: ["Coilover Kit", "Leaf Spring", "Air Suspension", "Shock Absorber", "Strut Assembly", "Stabilizer Bar"]
        },
        {
            name: "material", label: "Material", type: "select",
            options: ["Steel", "Aluminium Alloy", "Carbon Fiber", "Cast Iron", "Forged Steel"]
        },
        {
            name: "compatibility", label: "Compatibility",
            type: "text", placeholder: "e.g. BMW 3 Series, Audi A4"
        },
        {
            name: "warranty", label: "Warranty", type: "select",
            options: ["No Warranty", "6 Months", "1 Year", "2 Years"]
        }
    ],
    "Tools & Equipments": [
        {
            name: "toolType", label: "Tool Type", type: "select",
            options: ["Hand Tool", "Power Tool", "Diagnostic Tool", "Lifting Equipment", "Workshop Kit", "Measuring Tool"]
        },
        {
            name: "material", label: "Material", type: "select",
            options: ["Steel", "Chrome Vanadium", "Aluminium", "Carbon Steel", "Plastic / ABS"]
        },
        { name: "usage", label: "Usage", type: "text", placeholder: "e.g. Tyre Fitting, Engine Repair, Body Work" },
        {
            name: "warranty", label: "Warranty", type: "select",
            options: ["No Warranty", "6 Months", "1 Year", "2 Years"]
        }
    ],
    "Oil Car": [
        {
            name: "oilType", label: "Oil Type", type: "select",
            options: ["Full Synthetic", "Semi-Synthetic", "Mineral", "High Mileage Synthetic"]
        },
        {
            name: "viscosity", label: "Viscosity Grade", type: "select",
            options: ["0W-20", "5W-30", "5W-40", "10W-30", "10W-40", "15W-40", "20W-50"]
        },
        {
            name: "quantity", label: "Quantity", type: "select",
            options: ["500ml", "1L", "2L", "3L", "4L", "5L", "7.5L", "10L", "20L"]
        },
        { name: "compatibility", label: "Engine Compatibility", type: "text", placeholder: "e.g. Petrol, Diesel, Both" }
    ],
    "Brakes": [
        {
            name: "brakeType", label: "Brake Type", type: "select",
            options: ["Disc Brake", "Drum Brake", "Hydraulic Disc", "ABS-Compatible", "Performance Brake Kit"]
        },
        {
            name: "material", label: "Pad / Shoe Material", type: "select",
            options: ["Ceramic", "Semi-Metallic", "Organic / NAO", "Carbon Fiber", "Sintered Metal"]
        },
        { name: "compatibility", label: "Compatibility", type: "text", placeholder: "e.g. Maruti Swift, Honda Civic" },
        {
            name: "warranty", label: "Warranty", type: "select",
            options: ["No Warranty", "6 Months", "1 Year", "2 Years"]
        }
    ],
    "Auto Safety & Security": [
        {
            name: "productType", label: "Product Type", type: "select",
            options: ["Dash Camera", "Reverse Camera", "360° Camera", "Car Alarm", "Steering Lock", "GPS Tracker", "Blind Spot Sensor", "Parking Sensor"]
        },
        { name: "features", label: "Key Features", type: "text", placeholder: "e.g. Night Vision, 4K, Motion Alert, Loop Recording" },
        {
            name: "connectivity", label: "Connectivity", type: "select",
            options: ["Wi-Fi", "Bluetooth", "4G / LTE", "Wired Only", "Wi-Fi + Bluetooth", "None"]
        },
        {
            name: "powerSource", label: "Power Source", type: "select",
            options: ["Car 12V Battery", "USB / Type-C", "Hardwired OBD", "Solar Panel", "Built-in Battery"]
        }
    ],
    "Automotive Rims": [
        { name: "rimSize", label: "Rim Size (inch)", type: "text", placeholder: "e.g. 17, 18, 20" },
        {
            name: "material", label: "Material", type: "select",
            options: ["Alloy", "Steel", "Forged Aluminium", "Carbon Fiber", "Magnesium Alloy"]
        },
        {
            name: "finishType", label: "Finish Type", type: "select",
            options: ["Matte Black", "Gloss Black", "Chrome", "Silver", "Gunmetal", "Bronze", "Gold", "Custom Paint"]
        },
        { name: "compatibility", label: "PCD / Compatibility", type: "text", placeholder: "e.g. PCD 5×114.3, ET 35, CB 72.6" }
    ],
    "Automotive Display": [
        { name: "screenSize", label: "Screen Size", type: "text", placeholder: "e.g. 9 inch, 10.1 inch" },
        {
            name: "resolution", label: "Resolution", type: "select",
            options: ["480p", "720p HD", "1080p Full HD", "2K QHD", "4K UHD"]
        },
        {
            name: "connectivity", label: "Connectivity", type: "select",
            options: ["Android Auto", "Apple CarPlay", "Android Auto + CarPlay", "AV Input", "HDMI", "HDMI + AV"]
        },
        { name: "features", label: "Features", type: "text", placeholder: "e.g. GPS Navigation, Touchscreen, Reversing Camera Input" }
    ],
    "Battery": [
        { name: "capacity", label: "Capacity (Ah)", type: "text", placeholder: "e.g. 35Ah, 65Ah, 100Ah" },
        {
            name: "voltage", label: "Voltage", type: "select",
            options: ["6V", "12V", "24V", "36V", "48V"]
        },
        {
            name: "warranty", label: "Warranty", type: "select",
            options: ["No Warranty", "6 Months", "1 Year", "18 Months", "2 Years", "3 Years"]
        },
        { name: "compatibility", label: "Compatibility", type: "text", placeholder: "e.g. Car, Bike, Truck, Inverter" }
    ],
    "Engine Components": [
        {
            name: "componentType", label: "Component Type", type: "select",
            options: [
                "Piston", "Piston Ring", "Crankshaft", "Camshaft", "Cylinder Head",
                "Gasket Set", "Timing Belt / Chain", "Oil Pump", "Water Pump",
                "Turbocharger", "Fuel Injector", "Exhaust Manifold", "Intake Manifold"
            ]
        },
        {
            name: "material", label: "Material", type: "select",
            options: ["Cast Iron", "Forged Steel", "Aluminium Alloy", "Titanium", "Carbon Steel", "Stainless Steel"]
        },
        { name: "compatibility", label: "Engine Compatibility", type: "text", placeholder: "e.g. Toyota Innova 2.5D, Mahindra Scorpio" },
        {
            name: "warranty", label: "Warranty", type: "select",
            options: ["No Warranty", "6 Months", "1 Year", "2 Years"]
        }
    ]
};

/* Subcategory options per category */
const SUBCATEGORIES = {
    "Headlights & Lighting":      ["Headlight Assembly", "Tail Lights", "Fog Lights", "LED DRL Strips", "Interior Lights", "LED Light Bars"],
    "Car Audio System":           ["Car Speakers", "Subwoofers", "Head Units / Stereo", "Amplifiers", "Tweeters", "Full Audio Kits"],
    "Wheels & Tires":             ["Car Tyres", "Bike Tyres", "Truck Tyres", "All-Season Tyres", "Performance Tyres"],
    "Suspension":                 ["Shock Absorbers", "Coilover Kits", "Leaf Springs", "Air Suspension", "Strut Mounts", "Stabilizer Bars"],
    "Tools & Equipments":         ["Hand Tools", "Power Tools", "Diagnostic Tools", "Lifting Jacks", "Workshop Kits", "Measuring & Inspection"],
    "Oil Car":                    ["Engine Oil", "Gear Oil", "Brake Fluid", "Transmission Fluid", "Coolant / Antifreeze"],
    "Brakes":                     ["Brake Pads", "Brake Rotors / Discs", "Brake Calipers", "Brake Drums", "Full Brake Kits"],
    "Auto Safety & Security":     ["Dash Cameras", "Reverse Cameras", "Car Alarms", "GPS Trackers", "Steering Locks", "Parking Sensors"],
    "Automotive Rims":            ["Alloy Rims", "Steel Rims", "Forged Rims", "Off-Road Rims"],
    "Automotive Display":         ["Android Head Units", "GPS Navigation", "Rear View Monitors", "HUD Displays"],
    "Battery":                    ["Car Battery", "Bike Battery", "Truck / Heavy Duty Battery", "Inverter Battery"],
    "Engine Components":          ["Pistons & Rings", "Gasket Sets", "Timing Belts / Chains", "Oil & Water Pumps", "Turbochargers", "Fuel Injectors"]
};

/* SKU prefix map */
const SKU_PREFIXES = {
    "Headlights & Lighting":  "LGT",
    "Car Audio System":       "AUD",
    "Wheels & Tires":         "WHL",
    "Suspension":             "SUS",
    "Tools & Equipments":     "TOL",
    "Oil Car":                "OIL",
    "Brakes":                 "BRK",
    "Auto Safety & Security": "SEC",
    "Automotive Rims":        "RIM",
    "Automotive Display":     "DSP",
    "Battery":                "BAT",
    "Engine Components":      "ENG"
};

/* Category section icons */
const CATEGORY_ICONS = {
    "Headlights & Lighting":  "fa-lightbulb",
    "Car Audio System":       "fa-volume-high",
    "Wheels & Tires":         "fa-circle-dot",
    "Suspension":             "fa-car-side",
    "Tools & Equipments":     "fa-screwdriver-wrench",
    "Oil Car":                "fa-oil-can",
    "Brakes":                 "fa-circle-stop",
    "Auto Safety & Security": "fa-shield-halved",
    "Automotive Rims":        "fa-gear",
    "Automotive Display":     "fa-desktop",
    "Battery":                "fa-battery-full",
    "Engine Components":      "fa-cogs"
};

/* ═══════════════════════════════════════════════════════════════════════════
   MODAL HTML INJECTION
═══════════════════════════════════════════════════════════════════════════ */

function injectAddProductModal() {
    if (document.getElementById('product-modal-dynamic-overlay')) return;

    const html = `
    <style>
        #product-modal-dynamic-overlay .pm-section-hdr {
            grid-column: 1 / -1;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--accent-red, #e53e3e);
            padding: 8px 0 4px;
            border-bottom: 1px solid rgba(255,255,255,0.07);
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 6px;
        }
        #product-modal-dynamic-overlay .pm-field {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        #product-modal-dynamic-overlay .pm-field label {
            font-size: 12px;
            font-weight: 600;
            color: rgba(255,255,255,0.75);
            letter-spacing: 0.03em;
        }
        #product-modal-dynamic-overlay .pm-field label .req {
            color: var(--accent-red, #e53e3e);
            margin-left: 2px;
        }
        #product-modal-dynamic-overlay .pm-field input,
        #product-modal-dynamic-overlay .pm-field textarea,
        #product-modal-dynamic-overlay .pm-field select {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 8px;
            color: #fff;
            padding: 9px 12px;
            font-size: 13px;
            width: 100%;
            box-sizing: border-box;
            transition: border-color 0.2s, box-shadow 0.2s;
            outline: none;
        }
        #product-modal-dynamic-overlay .pm-field input:focus,
        #product-modal-dynamic-overlay .pm-field textarea:focus,
        #product-modal-dynamic-overlay .pm-field select:focus {
            border-color: var(--accent-red, #e53e3e);
            box-shadow: 0 0 0 3px rgba(229,62,62,0.15);
        }
        #product-modal-dynamic-overlay .pm-field input:disabled,
        #product-modal-dynamic-overlay .pm-field textarea:disabled,
        #product-modal-dynamic-overlay .pm-field select:disabled {
            opacity: 0.45;
            cursor: not-allowed;
        }
        #product-modal-dynamic-overlay .pm-field select option {
            background: #1a1a2e;
            color: #fff;
        }
        #product-modal-dynamic-overlay .pm-dynfield {
            animation: pm-fadein 0.22s ease both;
        }
        @keyframes pm-fadein {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Category-Specific Panel ─────────────────────────────── */
        #product-modal-dynamic-overlay .pm-cat-panel {
            grid-column: 1 / -1;
            background: linear-gradient(135deg, rgba(229,62,62,0.04) 0%, rgba(99,102,241,0.04) 100%);
            border: 1px solid rgba(229,62,62,0.2);
            border-radius: 14px;
            overflow: hidden;
            transition: border-color 0.3s;
        }
        #product-modal-dynamic-overlay .pm-cat-panel.has-fields {
            border-color: rgba(229,62,62,0.35);
        }
        #product-modal-dynamic-overlay .pm-cat-panel-hdr {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 14px 18px;
            background: rgba(229,62,62,0.08);
            border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        #product-modal-dynamic-overlay .pm-cat-panel-icon {
            width: 34px;
            height: 34px;
            border-radius: 9px;
            background: var(--accent-red, #e53e3e);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            font-size: 14px;
            color: #fff;
            box-shadow: 0 4px 12px rgba(229,62,62,0.35);
        }
        #product-modal-dynamic-overlay .pm-cat-panel-title {
            flex: 1;
        }
        #product-modal-dynamic-overlay .pm-cat-panel-title strong {
            display: block;
            font-size: 13px;
            font-weight: 700;
            color: #fff;
            letter-spacing: 0.02em;
        }
        #product-modal-dynamic-overlay .pm-cat-panel-title span {
            font-size: 11px;
            color: rgba(255,255,255,0.45);
        }
        #product-modal-dynamic-overlay .pm-cat-panel-badge {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 4px 10px;
            background: rgba(229,62,62,0.15);
            border: 1px solid rgba(229,62,62,0.3);
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            color: #ff8a80;
            letter-spacing: 0.03em;
        }
        #product-modal-dynamic-overlay .pm-cat-panel-body {
            padding: 18px;
        }
        #product-modal-dynamic-overlay .pm-cat-fields-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
        }
        #product-modal-dynamic-overlay .pm-cat-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 28px 20px;
            color: rgba(255,255,255,0.3);
            text-align: center;
        }
        #product-modal-dynamic-overlay .pm-cat-placeholder i {
            font-size: 2rem;
            opacity: 0.4;
        }
        #product-modal-dynamic-overlay .pm-cat-placeholder p {
            margin: 0;
            font-size: 13px;
            line-height: 1.5;
        }
        #product-modal-dynamic-overlay .pm-cat-placeholder strong {
            display: block;
            font-size: 14px;
            font-weight: 600;
            color: rgba(255,255,255,0.45);
            margin-bottom: 4px;
        }
        @keyframes pm-cat-in {
            from { opacity: 0; transform: scale(0.97); }
            to   { opacity: 1; transform: scale(1); }
        }
        #product-modal-dynamic-overlay .pm-cat-fields-grid .pm-dynfield {
            animation: pm-cat-in 0.25s ease both;
        }
        #product-modal-dynamic-overlay .pm-cat-fields-grid .pm-dynfield:nth-child(1) { animation-delay: 0.03s; }
        #product-modal-dynamic-overlay .pm-cat-fields-grid .pm-dynfield:nth-child(2) { animation-delay: 0.07s; }
        #product-modal-dynamic-overlay .pm-cat-fields-grid .pm-dynfield:nth-child(3) { animation-delay: 0.11s; }
        #product-modal-dynamic-overlay .pm-cat-fields-grid .pm-dynfield:nth-child(4) { animation-delay: 0.15s; }
        #product-modal-dynamic-overlay .pm-cat-fields-grid .pm-dynfield:nth-child(5) { animation-delay: 0.19s; }
        #product-modal-dynamic-overlay .pm-cat-fields-grid .pm-dynfield:nth-child(6) { animation-delay: 0.23s; }

        #product-modal-dynamic-overlay .pm-img-thumb {
            position: relative;
            width: 78px;
            height: 78px;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid rgba(255,255,255,0.12);
            flex-shrink: 0;
        }
        #product-modal-dynamic-overlay .pm-img-thumb img {
            width: 100%; height: 100%; object-fit: cover;
        }
        #product-modal-dynamic-overlay .pm-img-remove {
            position: absolute;
            top: 3px; right: 3px;
            background: rgba(229,62,62,0.85);
            border: none; color: #fff;
            width: 18px; height: 18px;
            border-radius: 50%;
            font-size: 10px;
            cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            line-height: 1;
        }
        #product-modal-dynamic-overlay .pm-img-label {
            position: absolute; bottom: 0; left: 0; right: 0;
            background: rgba(0,0,0,0.6);
            font-size: 9px; color: #ccc;
            text-align: center; padding: 2px 0;
        }
    </style>

    <div class="garage-modal-overlay" id="product-modal-dynamic-overlay"
         onclick="if(event.target===this) window.closeAddProductModal()">
        <div class="garage-modal" style="
            max-width:920px; max-height:92vh; overflow-y:auto;
            padding:0; border:1px solid rgba(255,255,255,0.1);
            border-radius:16px; background:#0f0f23;">

            <form id="dynamic-product-form" enctype="multipart/form-data"
                  onsubmit="return false;"
                  style="display:grid; grid-template-columns:1fr 1fr;">

                <!-- ━━ HEADER ━━ -->
                <div style="
                    grid-column:1/-1; position:sticky; top:0;
                    background:#0f0f23; z-index:20;
                    border-bottom:1px solid rgba(255,255,255,0.08);
                    padding:1.1rem 1.75rem;
                    display:flex; align-items:center; justify-content:space-between;">
                    <h3 style="margin:0;font-size:1.1rem;font-weight:700;color:#fff;
                               display:flex;align-items:center;gap:10px;">
                        <span style="width:32px;height:32px;border-radius:8px;
                                     background:var(--accent-red,#e53e3e);
                                     display:flex;align-items:center;justify-content:center;">
                            <i class="fa-solid fa-box" style="color:#fff;font-size:13px;"></i>
                        </span>
                        <span id="pmodal-title">Add New Product</span>
                    </h3>
                    <button type="button" onclick="window.closeAddProductModal()"
                        style="background:rgba(255,255,255,0.06);
                               border:1px solid rgba(255,255,255,0.1);
                               color:#fff;width:32px;height:32px;
                               border-radius:8px;cursor:pointer;
                               display:flex;align-items:center;justify-content:center;
                               transition:background 0.2s;"
                        onmouseover="this.style.background='rgba(229,62,62,0.25)'"
                        onmouseout="this.style.background='rgba(255,255,255,0.06)'">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <!-- ━━ BODY ━━ -->
                <div id="pmodal-body"
                     style="grid-column:1/-1;
                            display:grid; grid-template-columns:1fr 1fr;
                            gap:16px; padding:22px 1.75rem;">

                    <!-- §1 BASIC INFO -->
                    <div class="pm-section-hdr">
                        <i class="fa-solid fa-circle-info"></i> Basic Info
                    </div>

                    <div class="pm-field" style="grid-column:1/-1;">
                        <label>Product Name <span class="req">*</span></label>
                        <input id="dp-name" type="text"
                               placeholder="e.g. 18″ Black Alloy Wheel Rim (BMW M-Sport)" required />
                    </div>

                    <div class="pm-field">
                        <label>Category <span class="req">*</span></label>
                        <select id="dp-category" required onchange="window.handleCategoryChange()">
                            <option value="">— Select Category —</option>
                            <option value="Headlights &amp; Lighting">💡 Headlights &amp; Lighting</option>
                            <option value="Car Audio System">🔊 Car Audio System</option>
                            <option value="Wheels &amp; Tires">🛞 Wheels &amp; Tires</option>
                            <option value="Suspension">🏎️ Suspension</option>
                            <option value="Tools &amp; Equipments">🛠️ Tools &amp; Equipments</option>
                            <option value="Oil Car">🛢️ Oil Car</option>
                            <option value="Brakes">🛑 Brakes</option>
                            <option value="Auto Safety &amp; Security">🛡️ Auto Safety &amp; Security</option>
                            <option value="Automotive Rims">⚙️ Automotive Rims</option>
                            <option value="Automotive Display">📺 Automotive Display</option>
                            <option value="Battery">🔋 Battery</option>
                            <option value="Engine Components">🔩 Engine Components</option>
                        </select>
                    </div>

                    <div class="pm-field">
                        <label>Subcategory</label>
                        <select id="dp-subcategory">
                            <option value="">Select Category First</option>
                        </select>
                    </div>

                    <div class="pm-field">
                        <label>Brand</label>
                        <input id="dp-brand" type="text" placeholder="e.g. Bosch, Philips, JBL" />
                    </div>

                    <div class="pm-field">
                        <label>SKU / Product Code <span class="req">*</span></label>
                        <input id="dp-sku" type="text" placeholder="Auto-generated or custom" required />
                    </div>

                    <div class="pm-field" style="grid-column:1/-1;">
                        <label>Description</label>
                        <textarea id="dp-description" rows="3"
                                  placeholder="Full product description, key features, specs summary…"></textarea>
                    </div>

                    <div class="pm-field" style="grid-column:1/-1;">
                        <label>Availability Status</label>
                        <select id="dp-availability">
                            <option value="active">✅ Active (In Stock)</option>
                            <option value="inactive">⏸️ Inactive</option>
                            <option value="out_of_stock">❌ Out of Stock</option>
                        </select>
                    </div>

                    <!-- §2 PRICING & INVENTORY -->
                    <div class="pm-section-hdr">
                        <i class="fa-solid fa-tags"></i> Pricing &amp; Inventory
                    </div>

                    <div class="pm-field">
                        <label>Base Price (₹) <span class="req">*</span></label>
                        <input id="dp-price" type="number" min="0" step="0.01"
                               placeholder="e.g. 2499" required />
                    </div>

                    <div class="pm-field">
                        <label>Discounted Price (₹)</label>
                        <input id="dp-discount" type="number" min="0" step="0.01"
                               placeholder="Leave blank if no discount" />
                    </div>

                    <div class="pm-field">
                        <label>Stock Quantity <span class="req">*</span></label>
                        <input id="dp-stock" type="number" min="0" value="0" required />
                    </div>

                    <div class="pm-field">
                        <label>Low Stock Alert Threshold</label>
                        <input id="dp-alert" type="number" min="0" value="5" />
                    </div>

                    <!-- §3 MEDIA -->
                    <div class="pm-section-hdr">
                        <i class="fa-solid fa-images"></i> Product Images
                        <span style="font-weight:400;color:rgba(255,255,255,0.4);font-size:10px;text-transform:none;">
                            — First image becomes the primary thumbnail
                        </span>
                    </div>

                    <div class="pm-field" style="grid-column:1/-1;">
                        <div id="dp-dropzone"
                             style="display:flex;align-items:center;justify-content:center;
                                    padding:26px 20px;
                                    border:2px dashed rgba(255,255,255,0.15);
                                    border-radius:10px;cursor:pointer;
                                    transition:border-color 0.25s,background 0.25s;"
                             ondragover="event.preventDefault();
                                         document.getElementById('dp-dropzone').style.borderColor='var(--accent-red,#e53e3e)';
                                         document.getElementById('dp-dropzone').style.background='rgba(229,62,62,0.05)'"
                             ondragleave="document.getElementById('dp-dropzone').style.borderColor='rgba(255,255,255,0.15)';
                                          document.getElementById('dp-dropzone').style.background='transparent'"
                             ondrop="window.handleImageDrop(event)"
                             onclick="document.getElementById('dp-image-upload').click()">
                            <input type="file" id="dp-image-upload"
                                   accept="image/jpeg,image/png,image/webp"
                                   multiple style="display:none;"
                                   onchange="window.handleImageSelect(event)" />
                            <div style="text-align:center; pointer-events:none;">
                                <i class="fa-solid fa-cloud-arrow-up"
                                   style="font-size:1.8rem;color:var(--accent-red,#e53e3e);margin-bottom:8px;display:block;"></i>
                                <p style="margin:0;color:#fff;font-weight:600;font-size:13px;">
                                    Click or Drag &amp; Drop images here
                                </p>
                                <span style="font-size:11px;color:rgba(255,255,255,0.35);margin-top:4px;display:block;">
                                    JPEG · PNG · WEBP &nbsp;|&nbsp; Max 5MB per image &nbsp;|&nbsp; Up to 5 images
                                </span>
                            </div>
                        </div>
                        <div id="dp-preview-row"
                             style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;min-height:0;"></div>
                    </div>

                    <!-- §4 STANDARD SPECS -->
                    <div class="pm-section-hdr">
                        <i class="fa-solid fa-list-check"></i> Standard Specifications
                    </div>

                    <div class="pm-field">
                        <label>Compatible Vehicle Type</label>
                        <select id="dp-veh-type" onchange="window.handleVehicleTypeChange()">
                            <option value="">— Select Type —</option>
                            <option value="Car">🚗 Car</option>
                            <option value="Bike">🏍️ Bike / Motorcycle</option>
                            <option value="Truck">🚛 Truck / HCV</option>
                            <option value="Universal">🌐 Universal Fit</option>
                        </select>
                    </div>

                    <div class="pm-field">
                        <label>Vehicle Compatibility Tags</label>
                        <input id="dp-compatibility" type="text"
                               placeholder="e.g. BMW 3 Series, Honda City (comma-separated)" />
                    </div>

                    <div class="pm-field">
                        <label>Warranty</label>
                        <select id="dp-warranty">
                            <option value="No Warranty">No Warranty</option>
                            <option value="6 Months">6 Months</option>
                            <option value="1 Year">1 Year</option>
                            <option value="2 Years">2 Years</option>
                            <option value="3 Years">3 Years</option>
                        </select>
                    </div>

                    <div class="pm-field">
                        <label>Return Policy</label>
                        <select id="dp-return">
                            <option value="Non-returnable">Non-returnable</option>
                            <option value="7 Days Return">7 Days Return</option>
                            <option value="15 Days Return">15 Days Return</option>
                            <option value="30 Days Return">30 Days Return</option>
                        </select>
                    </div>

                    <!-- §5 CATEGORY-SPECIFIC SPECIFICATIONS PANEL -->
                    <div id="dp-cat-spec-panel" class="pm-cat-panel">
                        <!-- Header -->
                        <div class="pm-cat-panel-hdr">
                            <div class="pm-cat-panel-icon" id="dp-cat-spec-icon">
                                <i class="fa-solid fa-layer-group"></i>
                            </div>
                            <div class="pm-cat-panel-title">
                                <strong id="dp-cat-spec-title">Category Specifications</strong>
                                <span id="dp-cat-spec-subtitle">Select a category above to see relevant fields</span>
                            </div>
                            <div id="dp-cat-spec-badge" class="pm-cat-panel-badge" style="display:none;">
                                <i class="fa-solid fa-sliders"></i>
                                <span id="dp-cat-spec-badge-txt">0 fields</span>
                            </div>
                        </div>
                        <!-- Body -->
                        <div class="pm-cat-panel-body">
                            <div id="dp-cat-spec-placeholder" class="pm-cat-placeholder">
                                <i class="fa-solid fa-rectangle-list"></i>
                                <div>
                                    <strong>No Category Selected</strong>
                                    <p>Choose a product category from the dropdown above.<br>Category-specific specification fields will appear here automatically.</p>
                                </div>
                            </div>
                            <div id="dp-cat-fields-grid" class="pm-cat-fields-grid" style="display:none;"></div>
                        </div>
                    </div>

                    <!-- Legacy hidden divs kept for API compatibility -->
                    <div id="dp-dynamic-header" style="display:none;"></div>
                    <div id="dp-dynamic-fields-container" style="display:none;"></div>

                </div><!-- /pmodal-body -->

                <!-- ━━ FOOTER ━━ -->
                <div style="
                    grid-column:1/-1; position:sticky; bottom:0;
                    background:#0f0f23; z-index:20;
                    border-top:1px solid rgba(255,255,255,0.08);
                    padding:1rem 1.75rem;
                    display:flex; align-items:center; gap:12px; justify-content:flex-end;">

                    <span id="pmodal-spinner" style="display:none;color:rgba(255,255,255,0.5);font-size:13px;">
                        <i class="fa-solid fa-spinner fa-spin"></i>&nbsp;Saving…
                    </span>

                    <button type="button" id="pmodal-draft-btn"
                            class="btn btn-red btn-sm outline-btn"
                            style="border-color:#6366f1;color:#6366f1;"
                            onclick="window.saveDynamicProduct('draft')">
                        <i class="fa-regular fa-floppy-disk"></i> Save as Draft
                    </button>

                    <button type="button" id="pmodal-submit-btn"
                            class="btn btn-red btn-sm"
                            onclick="window.saveDynamicProduct('published')">
                        <i class="fa-solid fa-plus"></i> Create Product
                    </button>

                    <button type="button"
                            class="btn btn-red btn-sm outline-btn"
                            style="border-color:rgba(255,255,255,0.18);color:rgba(255,255,255,0.6);"
                            onclick="window.closeAddProductModal()">
                        Cancel
                    </button>
                </div>

            </form>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
}

/* ═══════════════════════════════════════════════════════════════════════════
   OPEN / CLOSE
═══════════════════════════════════════════════════════════════════════════ */

window.openAddProductModal = function (mode = 'add', productId = null) {
    injectAddProductModal();

    const overlay   = document.getElementById('product-modal-dynamic-overlay');
    const form      = document.getElementById('dynamic-product-form');
    const title     = document.getElementById('pmodal-title');
    const submitBtn = document.getElementById('pmodal-submit-btn');
    const draftBtn  = document.getElementById('pmodal-draft-btn');

    /* Store context on the overlay element */
    overlay.dataset.mode      = mode;
    overlay.dataset.productId = productId || '';

    /* Reset form state */
    form.reset();
    document.getElementById('dp-dynamic-fields-container').innerHTML = '';
    document.getElementById('dp-dynamic-header').style.display       = 'none';
    document.getElementById('dp-preview-row').innerHTML               = '';
    window._pmUploadedFiles                                           = [];

    /* Reset category-spec panel to placeholder */
    const catPanel = document.getElementById('dp-cat-spec-panel');
    if (catPanel) {
        catPanel.classList.remove('has-fields');
        const catIcon = document.getElementById('dp-cat-spec-icon');
        const catTitle = document.getElementById('dp-cat-spec-title');
        const catSubtitle = document.getElementById('dp-cat-spec-subtitle');
        const catBadge = document.getElementById('dp-cat-spec-badge');
        const catPlaceholder = document.getElementById('dp-cat-spec-placeholder');
        const catGrid = document.getElementById('dp-cat-fields-grid');
        if (catIcon) catIcon.innerHTML = '<i class="fa-solid fa-layer-group"></i>';
        if (catTitle) catTitle.textContent = 'Category Specifications';
        if (catSubtitle) catSubtitle.textContent = 'Select a category above to see relevant fields';
        if (catBadge) catBadge.style.display = 'none';
        if (catPlaceholder) catPlaceholder.style.display = 'flex';
        if (catGrid) { catGrid.style.display = 'none'; catGrid.innerHTML = ''; }
    }

    if (mode === 'view') {
        title.textContent        = `Product Details`;
        submitBtn.style.display  = 'none';
        draftBtn.style.display   = 'none';
        _pmToggleDisabled(form, true);
    } else if (mode === 'edit') {
        title.textContent        = `Edit Product`;
        submitBtn.style.display  = '';
        submitBtn.innerHTML      = '<i class="fa-solid fa-floppy-disk"></i> Update Product';
        draftBtn.style.display   = 'none';
        _pmToggleDisabled(form, false);
    } else {
        title.textContent        = 'Add New Product';
        submitBtn.style.display  = '';
        submitBtn.innerHTML      = '<i class="fa-solid fa-plus"></i> Create Product';
        draftBtn.style.display   = '';
        _pmToggleDisabled(form, false);
    }

    if (productId && (mode === 'edit' || mode === 'view')) {
        _pmPopulateFromAPI(productId);
    }

    overlay.classList.add('open');
};

window.closeAddProductModal = function () {
    const overlay = document.getElementById('product-modal-dynamic-overlay');
    if (overlay) overlay.classList.remove('open');
};

/* ═══════════════════════════════════════════════════════════════════════════
   FORM HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function _pmToggleDisabled(form, disabled) {
    form.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.id === 'dp-image-upload') return;
        el.disabled = disabled;
    });
    const dropzone = document.getElementById('dp-dropzone');
    if (dropzone) {
        dropzone.style.pointerEvents = disabled ? 'none' : 'auto';
        dropzone.style.opacity       = disabled ? '0.45' : '1';
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
   POPULATE FROM API (edit / view mode)
═══════════════════════════════════════════════════════════════════════════ */

async function _pmPopulateFromAPI(productId) {
    try {
        const p = await API.req(`/products/${productId}/`);

        const _v = (id, val) => {
            const el = document.getElementById(id);
            if (el && val !== undefined && val !== null) el.value = val;
        };

        _v('dp-name',          p.name);
        _v('dp-brand',         p.brand);
        _v('dp-sku',           p.sku);
        _v('dp-description',   p.description);
        _v('dp-availability',  p.status);
        _v('dp-price',         p.price);
        _v('dp-discount',      p.discount_price);
        _v('dp-stock',         p.stock);
        _v('dp-alert',         p.low_stock_alert);
        _v('dp-veh-type',      p.compatibility_type);
        _v('dp-compatibility', p.compatibility_tags);
        _v('dp-warranty',      p.warranty);
        _v('dp-return',        p.return_policy);

        /* Trigger category fields (silent — don't regen SKU) */
        const catName = (p.category && p.category.name) ? p.category.name : (p.category_name || '');
        if (catName) {
            document.getElementById('dp-category').value = catName;
            window.handleCategoryChange(true);
        }

        /* Populate dynamic specs + subcategory after fields render */
        setTimeout(() => {
            const specs = p.specifications || {};
            for (const [key, val] of Object.entries(specs)) {
                const el = document.getElementById(`dyn_${key}`);
                if (el) el.value = val;
            }

            /* Subcategory stored inside specs */
            const subEl = document.getElementById('dp-subcategory');
            if (subEl && specs.subcategory) subEl.value = specs.subcategory;

            /* Show existing images */
            if (p.image) _pmRenderExistingThumb(API.mediaUrl(p.image), 'Primary');
            (p.images || []).forEach((img, i) =>
                _pmRenderExistingThumb(API.mediaUrl(img.image), `Gallery ${i + 1}`)
            );
        }, 80);

    } catch (err) {
        console.error('[ProductModal] Failed to fetch product:', err);
        if (window.API && API.toast) API.toast('Could not load product data', 'error');
    }
}

function _pmRenderExistingThumb(src, label) {
    document.getElementById('dp-preview-row').insertAdjacentHTML('beforeend', `
        <div class="pm-img-thumb">
            <img src="${src}" alt="${label}" />
            <div class="pm-img-label">${label}</div>
        </div>
    `);
}

/* ═══════════════════════════════════════════════════════════════════════════
   CATEGORY CHANGE  →  dynamic field render
═══════════════════════════════════════════════════════════════════════════ */

window.handleCategoryChange = function (silent = false) {
    const cat = document.getElementById('dp-category').value;

    /* Auto-generate SKU */
    if (!silent) {
        const skuField = document.getElementById('dp-sku');
        if (cat && SKU_PREFIXES[cat]) {
            skuField.value = `${SKU_PREFIXES[cat]}-${Math.floor(1000 + Math.random() * 9000)}`;
        } else {
            skuField.value = '';
        }
    }

    /* Subcategories */
    const subField = document.getElementById('dp-subcategory');
    if (SUBCATEGORIES[cat]) {
        subField.innerHTML = SUBCATEGORIES[cat]
            .map(s => `<option value="${s}">${s}</option>`)
            .join('');
    } else {
        subField.innerHTML = '<option value="">Select Category First</option>';
    }

    /* ── Category Spec Panel ────────────────────────────────────── */
    const panel       = document.getElementById('dp-cat-spec-panel');
    const iconEl      = document.getElementById('dp-cat-spec-icon');
    const titleEl     = document.getElementById('dp-cat-spec-title');
    const subtitleEl  = document.getElementById('dp-cat-spec-subtitle');
    const badgeEl     = document.getElementById('dp-cat-spec-badge');
    const badgeTxtEl  = document.getElementById('dp-cat-spec-badge-txt');
    const placeholder = document.getElementById('dp-cat-spec-placeholder');
    const fieldsGrid  = document.getElementById('dp-cat-fields-grid');

    /* Also keep legacy container in sync (empty) */
    const legacyContainer = document.getElementById('dp-dynamic-fields-container');
    if (legacyContainer) legacyContainer.innerHTML = '';

    if (!cat || !CATEGORY_SPECS[cat]) {
        /* Reset to placeholder state */
        panel.classList.remove('has-fields');
        const icon = cat && CATEGORY_ICONS[cat] ? CATEGORY_ICONS[cat] : 'fa-layer-group';
        iconEl.innerHTML  = `<i class="fa-solid ${icon}"></i>`;
        titleEl.textContent    = 'Category Specifications';
        subtitleEl.textContent = cat
            ? `No specific fields defined for "${cat}"`
            : 'Select a category above to see relevant fields';
        badgeEl.style.display   = 'none';
        placeholder.style.display = 'flex';
        fieldsGrid.style.display  = 'none';
        fieldsGrid.innerHTML      = '';
        return;
    }

    /* ── Has specs: render dynamic fields ─────────────────────── */
    const specs = CATEGORY_SPECS[cat];
    const icon  = CATEGORY_ICONS[cat] || 'fa-layer-group';

    panel.classList.add('has-fields');
    iconEl.innerHTML        = `<i class="fa-solid ${icon}"></i>`;
    titleEl.textContent     = `${cat} — Specifications`;
    subtitleEl.textContent  = `Fill in the details specific to this category`;
    badgeTxtEl.textContent  = `${specs.length} field${specs.length !== 1 ? 's' : ''}`;
    badgeEl.style.display   = 'flex';

    /* Clear and rebuild the fields grid */
    fieldsGrid.innerHTML = '';
    specs.forEach(field => {
        const fieldId = `dyn_${field.name}`;
        let inputHtml = '';

        if (field.type === 'select') {
            const opts = field.options
                .map(o => `<option value="${o}">${o}</option>`)
                .join('');
            inputHtml = `<select id="${fieldId}">${opts}</select>`;
        } else {
            inputHtml = `<input type="text" id="${fieldId}" placeholder="${field.placeholder || ''}" />`;
        }

        fieldsGrid.insertAdjacentHTML('beforeend', `
            <div class="pm-field pm-dynfield">
                <label>${field.label}</label>
                ${inputHtml}
            </div>
        `);
    });

    placeholder.style.display = 'none';
    fieldsGrid.style.display  = 'grid';
};

/* ═══════════════════════════════════════════════════════════════════════════
   VEHICLE TYPE CHANGE
═══════════════════════════════════════════════════════════════════════════ */

window.handleVehicleTypeChange = function () {
    const type  = document.getElementById('dp-veh-type').value;
    const field = document.getElementById('dp-compatibility');
    if (!field) return;

    const phMap = {
        'Car':       'e.g. BMW 3 Series, Hyundai i20, Maruti Swift',
        'Bike':      'e.g. Yamaha R15, Royal Enfield Bullet, Honda CBR',
        'Truck':     'e.g. Tata Ace, Ashok Leyland Dost, Eicher Pro',
        'Universal': 'Universal Fit'
    };

    if (type === 'Universal') {
        field.value = 'Universal Fit';
    } else {
        field.placeholder = phMap[type] || '';
    }
};

/* ═══════════════════════════════════════════════════════════════════════════
   IMAGE UPLOAD HANDLERS
═══════════════════════════════════════════════════════════════════════════ */

window._pmUploadedFiles = [];

window.validateAndPreviewImages = function (files) {
    const container = document.getElementById('dp-preview-row');
    const MAX       = 5;

    Array.from(files).forEach(file => {
        if (window._pmUploadedFiles.length >= MAX) {
            API.toast && API.toast('Maximum 5 images allowed', 'warning');
            return;
        }
        if (!file.type.startsWith('image/')) return;
        if (file.size > 5 * 1024 * 1024) {
            API.toast && API.toast(`${file.name} exceeds 5 MB`, 'warning');
            return;
        }

        const idx = window._pmUploadedFiles.length;
        window._pmUploadedFiles.push(file);

        const reader = new FileReader();
        reader.onload = e => {
            container.insertAdjacentHTML('beforeend', `
                <div class="pm-img-thumb" id="pm-img-${idx}">
                    <img src="${e.target.result}" alt="Upload ${idx + 1}" />
                    <button type="button" class="pm-img-remove"
                            onclick="window.pmRemoveImage(${idx})">✕</button>
                    <div class="pm-img-label">${idx === 0 ? 'Primary' : 'Gallery'}</div>
                </div>
            `);
        };
        reader.readAsDataURL(file);
    });
};

window.handleImageSelect = function (e) {
    window.validateAndPreviewImages(e.target.files);
    e.target.value = '';
};

window.handleImageDrop = function (e) {
    e.preventDefault();
    const dz = document.getElementById('dp-dropzone');
    dz.style.borderColor = 'rgba(255,255,255,0.15)';
    dz.style.background  = 'transparent';
    if (e.dataTransfer && e.dataTransfer.files) {
        window.validateAndPreviewImages(e.dataTransfer.files);
    }
};

window.pmRemoveImage = function (idx) {
    window._pmUploadedFiles[idx] = null;
    const el = document.getElementById(`pm-img-${idx}`);
    if (el) el.remove();
};

/* ═══════════════════════════════════════════════════════════════════════════
   SAVE / SUBMIT  →  real API call via multipart/form-data
═══════════════════════════════════════════════════════════════════════════ */

window.saveDynamicProduct = async function (publishStatus = 'published') {
    /* ── Validate required fields ─────────────────────────────── */
    const name     = document.getElementById('dp-name').value.trim();
    const category = document.getElementById('dp-category').value;
    const sku      = document.getElementById('dp-sku').value.trim();
    const price    = document.getElementById('dp-price').value;
    const stock    = document.getElementById('dp-stock').value;

    if (!name || !category || !sku || !price || (stock === '' || stock === null)) {
        API.toast
            ? API.toast('Please fill all required fields (Name, Category, SKU, Price, Stock)', 'warning')
            : alert('Please fill all required fields');
        return;
    }

    /* ── Collect category-specific specs ──────────────────────── */
    const specifications = {};
    if (CATEGORY_SPECS[category]) {
        CATEGORY_SPECS[category].forEach(f => {
            const el = document.getElementById(`dyn_${f.name}`);
            if (el && el.value.trim()) specifications[f.name] = el.value.trim();
        });
    }
    const subCatVal = document.getElementById('dp-subcategory').value;
    if (subCatVal) specifications.subcategory = subCatVal;

    /* ── Build FormData ───────────────────────────────────────── */
    const fd = new FormData();
    fd.append('name',              name);
    fd.append('sku',               sku);
    fd.append('brand',             document.getElementById('dp-brand').value.trim());
    fd.append('description',       document.getElementById('dp-description').value.trim());
    fd.append('status',            document.getElementById('dp-availability').value || 'active');
    fd.append('price',             parseFloat(price));

    const disc = document.getElementById('dp-discount').value;
    if (disc && parseFloat(disc) > 0) fd.append('discount_price', parseFloat(disc));

    fd.append('stock',               parseInt(stock));
    fd.append('low_stock_alert',     parseInt(document.getElementById('dp-alert').value) || 5);
    fd.append('compatibility_type',  document.getElementById('dp-veh-type').value || '');
    fd.append('compatibility_tags',  document.getElementById('dp-compatibility').value.trim());
    fd.append('warranty',            document.getElementById('dp-warranty').value || 'No Warranty');
    fd.append('return_policy',       document.getElementById('dp-return').value || 'Non-returnable');
    fd.append('publish_status',      publishStatus);
    fd.append('specifications',      JSON.stringify(specifications));

    /* ── Spinner ON ───────────────────────────────────────────── */
    const spinner   = document.getElementById('pmodal-spinner');
    const submitBtn = document.getElementById('pmodal-submit-btn');
    const draftBtn  = document.getElementById('pmodal-draft-btn');
    const _setBusy  = busy => {
        if (spinner)   spinner.style.display   = busy ? 'inline-flex' : 'none';
        if (submitBtn) submitBtn.disabled       = busy;
        if (draftBtn)  draftBtn.disabled        = busy;
    };
    _setBusy(true);

    try {
        /* ── Resolve category ID (create if missing) ─────────── */
        try {
            const cats    = await API.req('/products/categories/');
            const catList = Array.isArray(cats) ? cats : (cats.results || []);

            // Exact match first, then case-insensitive fallback
            let found = catList.find(c => c.name === category)
                     || catList.find(c => c.name.toLowerCase() === category.toLowerCase());

            // Auto-create the category in the DB if it doesn't exist yet
            if (!found && category) {
                const slug = category.toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '');
                found = await API.req('/products/categories/', {
                    method: 'POST',
                    body: JSON.stringify({ name: category, slug }),
                });
            }

            if (found && found.id) fd.append('category', found.id);
        } catch (catErr) {
            console.warn('[ProductModal] Category resolve failed:', catErr);
            /* product saved without category — non-fatal */
        }

        /* ── Attach images ────────────────────────────────────── */
        const validFiles = (window._pmUploadedFiles || []).filter(Boolean);
        if (validFiles.length > 0) {
            fd.append('image', validFiles[0], validFiles[0].name);
            for (let i = 1; i < validFiles.length; i++) {
                fd.append('gallery_images', validFiles[i], validFiles[i].name);
            }
        }

        /* ── Determine endpoint ───────────────────────────────── */
        const overlay   = document.getElementById('product-modal-dynamic-overlay');
        const mode      = overlay.dataset.mode;
        const productId = overlay.dataset.productId;

        let result;
        if (mode === 'edit' && productId) {
            result = await _pmFetchMultipart(`/products/${productId}/upload/`, fd, 'PATCH');
        } else {
            result = await _pmFetchMultipart('/products/create/', fd, 'POST');
        }

        /* ── Success ──────────────────────────────────────────── */
        const msg = mode === 'edit'
            ? '✅ Product updated successfully!'
            : publishStatus === 'draft'
                ? '📝 Product saved as draft!'
                : '🎉 Product created successfully!';
        API.toast ? API.toast(msg, 'success') : alert(msg);

        window.closeAddProductModal();

        /* Refresh admin product table if hook exists */
        if (typeof window._refreshProductsTable === 'function') {
            window._refreshProductsTable();
        }

    } catch (err) {
        console.error('[ProductModal] Save error:', err);
        const msg = err?.detail
            || (err?.sku && err.sku[0])
            || (err?.name && err.name[0])
            || (typeof err === 'object' ? JSON.stringify(err) : String(err))
            || 'Failed to save product. Check console for details.';
        API.toast ? API.toast(msg, 'error') : alert(msg);
    } finally {
        _setBusy(false);
    }
};

/* ── Multipart fetch (bypasses API.req which forces Content-Type: application/json) */
async function _pmFetchMultipart(path, formData, method = 'POST') {
    const BASE    = API.BASE || 'http://127.0.0.1:8000/api';
    const token   = API.token ? API.token() : localStorage.getItem('mh_access');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE}${path}`, { method, headers, body: formData });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw err;
    }
    return res.status === 204 ? null : res.json();
}

/* ═══════════════════════════════════════════════════════════════════════════
   UPDATE STOCK MODAL
   Called from both admin-dashboard.js (dynamic rows) and the static HTML
   buttons via: openUpdateStockModal(id, name, currentStock)
═══════════════════════════════════════════════════════════════════════════ */
window.openUpdateStockModal = function (productId, productName, currentStock) {
    // Remove any previous instance
    const existing = document.getElementById('pm-stock-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'pm-stock-modal-overlay';
    overlay.className = 'garage-modal-overlay';
    overlay.setAttribute('onclick', "if(event.target===this) window.closeUpdateStockModal()");

    overlay.innerHTML = `
        <div class="pm-mini-modal">
            <h3>Update Stock</h3>
            <p style="margin-bottom:6px;color:#fff;font-weight:600;">${productName || 'Product'}</p>
            <p>Current stock: <strong style="color:var(--accent-red,#e53e3e);">${currentStock ?? '—'}</strong></p>
            <input type="number" id="pm-stock-new-value" min="0" value="${currentStock ?? 0}"
                   placeholder="Enter new stock quantity" />
            <div class="pm-mini-actions">
                <button class="btn btn-red btn-sm" onclick="window.saveStockUpdate(${productId})">
                    <i class="fa-solid fa-floppy-disk"></i> Update
                </button>
                <button class="btn btn-red btn-sm outline-btn"
                        style="border-color:rgba(255,255,255,0.18);color:rgba(255,255,255,0.6);"
                        onclick="window.closeUpdateStockModal()">Cancel</button>
            </div>
        </div>`;

    document.body.appendChild(overlay);
    // Slight delay so CSS transition fires
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('open')));
    document.getElementById('pm-stock-new-value').focus();
};

window.closeUpdateStockModal = function () {
    const overlay = document.getElementById('pm-stock-modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    setTimeout(() => overlay.remove(), 260);
};

window.saveStockUpdate = async function (productId) {
    const input = document.getElementById('pm-stock-new-value');
    if (!input) return;
    const newStock = parseInt(input.value);
    if (isNaN(newStock) || newStock < 0) {
        API.toast ? API.toast('Enter a valid stock quantity', 'warning') : alert('Enter a valid stock quantity');
        return;
    }

    input.disabled = true;
    try {
        await _pmFetchMultipart(`/products/${productId}/upload/`, (() => {
            const fd = new FormData();
            fd.append('stock', newStock);
            return fd;
        })(), 'PATCH');

        API.toast ? API.toast(`Stock updated to ${newStock}`, 'success') : alert('Stock updated!');
        window.closeUpdateStockModal();
        if (typeof window._refreshProductsTable === 'function') window._refreshProductsTable();
    } catch (err) {
        console.error('[StockModal] Error:', err);
        API.toast ? API.toast('Failed to update stock', 'error') : alert('Failed to update stock');
        input.disabled = false;
    }
};


/* ═══════════════════════════════════════════════════════════════════════════
   DELETE PRODUCT CONFIRM MODAL
   Called from both admin-dashboard.js (dynamic rows) and the static HTML
   buttons via: confirmDeleteProduct(id, onSuccessCallback)
═══════════════════════════════════════════════════════════════════════════ */
window.confirmDeleteProduct = function (productId, onSuccess) {
    const existing = document.getElementById('pm-delete-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'pm-delete-modal-overlay';
    overlay.className = 'garage-modal-overlay';
    overlay.setAttribute('onclick', "if(event.target===this) window.closeDeleteModal()");

    overlay.innerHTML = `
        <div class="pm-mini-modal">
            <div style="width:56px;height:56px;border-radius:50%;
                        background:rgba(229,57,53,0.12);
                        display:flex;align-items:center;justify-content:center;
                        margin:0 auto 16px;">
                <i class="fa-solid fa-trash" style="font-size:22px;color:#e57373;"></i>
            </div>
            <h3>Delete Product?</h3>
            <p>This action is permanent and cannot be undone. The product will be removed from the catalogue immediately.</p>
            <div class="pm-mini-actions">
                <button class="btn btn-red btn-sm" id="pm-delete-confirm-btn"
                        onclick="window.executeDeleteProduct(${productId})">
                    <i class="fa-solid fa-trash"></i> Yes, Delete
                </button>
                <button class="btn btn-red btn-sm outline-btn"
                        style="border-color:rgba(255,255,255,0.18);color:rgba(255,255,255,0.6);"
                        onclick="window.closeDeleteModal()">Cancel</button>
            </div>
        </div>`;

    // Store callback reference on the overlay element
    overlay._onSuccess = onSuccess;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('open')));
};

window.closeDeleteModal = function () {
    const overlay = document.getElementById('pm-delete-modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    setTimeout(() => overlay.remove(), 260);
};

window.executeDeleteProduct = async function (productId) {
    const btn = document.getElementById('pm-delete-confirm-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting…'; }

    try {
        const BASE  = (API && API.BASE) ? API.BASE : 'http://127.0.0.1:8000/api';
        const token = (API && API.token) ? API.token() : localStorage.getItem('mh_access');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${BASE}/products/${productId}/`, { method: 'DELETE', headers });
        if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);

        API.toast ? API.toast('Product deleted successfully', 'info') : alert('Product deleted');
        window.closeDeleteModal();

        // Fire refresh callback if provided, or try global hook
        const overlay = document.getElementById('pm-delete-modal-overlay');
        const cb = overlay?._onSuccess;
        if (typeof cb === 'function') cb();
        else if (typeof window._refreshProductsTable === 'function') window._refreshProductsTable();
    } catch (err) {
        console.error('[DeleteModal] Error:', err);
        API.toast ? API.toast('Failed to delete product', 'error') : alert('Failed to delete');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-trash"></i> Yes, Delete'; }
    }
};


/* ═══════════════════════════════════════════════════════════════════════════
   API COMPATIBILITY SHIM
   Ensures API.mediaUrl() exists for edit/view mode image rendering
   in case the api.js version doesn't define it.
═══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    if (window.API && !API.mediaUrl) {
        API.mediaUrl = (path) => {
            if (!path) return '';
            if (path.startsWith('http')) return path;
            const base = (API.BASE || 'http://127.0.0.1:8000/api').replace('/api', '');
            return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
        };
    }
});
