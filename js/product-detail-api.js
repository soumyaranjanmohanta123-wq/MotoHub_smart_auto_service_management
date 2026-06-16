/**
 * js/product-detail-api.js
 * Connects product-detail.html to the MOTOHUB backend API.
 * Reads ?id= from URL, fetches product, renders all sections dynamically.
 */

const MEDIA_BASE = 'http://127.0.0.1:8000';

function mediaUrl(path) {
    if (!path) return 'assets/images/placeholder.jpg';
    if (path.startsWith('http')) return path;
    return `${MEDIA_BASE}${path}`;
}

function fmtPrice(n) {
    return `₹${parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function starsHtml(rating = 4) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(rating)) html += '<i class="fa-solid fa-star"></i>';
        else if (i === Math.ceil(rating) && rating % 1 >= 0.5) html += '<i class="fa-solid fa-star-half-stroke"></i>';
        else html += '<i class="fa-regular fa-star"></i>';
    }
    return html;
}

// Spec label prettifier
function prettyLabel(key) {
    const MAP = {
        toolType: 'Tool Type', material: 'Material', usage: 'Usage', warranty: 'Warranty',
        subcategory: 'Subcategory', oilType: 'Oil Type', viscosity: 'Viscosity Grade',
        quantity: 'Quantity', compatibility: 'Compatibility', brakeType: 'Brake Type',
        rimSize: 'Rim Size', finishType: 'Finish Type', lightType: 'Light Type',
        power: 'Power', colorTemp: 'Color Temperature', vehicleCompatibility: 'Vehicle Compatibility',
        audioType: 'Audio Type', powerOutput: 'Power Output', connectivity: 'Connectivity',
        audioBrand: 'Audio Brand', tireSize: 'Tire Size', tireType: 'Tire Type',
        suspensionType: 'Suspension Type', productType: 'Product Type', features: 'Features',
        powerSource: 'Power Source', screenSize: 'Screen Size', resolution: 'Resolution',
        capacity: 'Capacity', voltage: 'Voltage', componentType: 'Component Type',
    };
    return MAP[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
        // No ID — show a placeholder state
        showError('No product ID specified. <a href="products.html">Browse Products</a>');
        return;
    }

    try {
        const p = await API.req(`/products/${productId}/`);
        renderProduct(p);
        loadRelatedProducts(p);
    } catch (err) {
        console.error('Product detail error:', err);
        showError('Could not load product. It may have been removed or the server is unavailable.');
    }
});

function showError(msg) {
    const section = document.querySelector('.product-detail-section');
    if (section) section.innerHTML = `
        <div style="text-align:center;padding:80px 20px;color:#888;">
            <i class="fa-solid fa-circle-exclamation" style="font-size:48px;color:#e53e3e;margin-bottom:20px;display:block;"></i>
            <h2 style="color:#fff;margin-bottom:12px;">Product Not Found</h2>
            <p>${msg}</p>
        </div>`;
}

function renderProduct(p) {
    const price    = parseFloat(p.effective_price || p.price);
    const oldPrice = p.discount_price && parseFloat(p.discount_price) < parseFloat(p.price)
        ? parseFloat(p.price) : null;
    const discount = oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;
    const catName  = (p.category && p.category.name) ? p.category.name : (p.category_name || 'Parts');
    const brand    = p.brand || '';
    const inStock  = p.status !== 'out_of_stock' && p.stock > 0;

    // ── Page Title & Breadcrumb ──────────────────────────────
    document.title = `${p.name} - MOTOHUB`;
    const bc = document.getElementById('pd-breadcrumb-product');
    if (bc) bc.textContent = p.name;
    const bcCat = document.getElementById('pd-breadcrumb-cat');
    if (bcCat) {
        bcCat.textContent = catName;
        bcCat.href = `products.html?category=${encodeURIComponent(catName)}`;
    }

    // ── Gallery ──────────────────────────────────────────────
    const mainImg = document.getElementById('pdMainImg');
    if (mainImg) {
        mainImg.src = mediaUrl(p.image);
        mainImg.alt = p.name;
    }
    const thumbList = document.getElementById('pd-thumb-list');
    if (thumbList) {
        const allImgs = [{ image: p.image, alt_text: p.name }, ...(p.images || [])];
        thumbList.innerHTML = allImgs.map((img, i) => {
            const src = mediaUrl(img.image || img);
            return `<div class="thumb-item${i === 0 ? ' active' : ''}" onclick="pdChangeImage('${src}', this)">
                <img src="${src}" alt="${img.alt_text || p.name}" onerror="this.src='assets/images/placeholder.jpg'">
            </div>`;
        }).join('');
    }

    // ── Category Badge ───────────────────────────────────────
    const catEl = document.getElementById('pd-category');
    if (catEl) catEl.textContent = catName.toUpperCase();

    // ── Title ────────────────────────────────────────────────
    const titleEl = document.getElementById('pd-title');
    if (titleEl) titleEl.textContent = p.name;

    // ── Price ────────────────────────────────────────────────
    document.getElementById('pd-current-price').textContent = fmtPrice(price);
    const oldPriceEl = document.getElementById('pd-old-price');
    const saveBadge  = document.getElementById('pd-save-badge');
    if (oldPrice) {
        oldPriceEl.textContent = fmtPrice(oldPrice);
        oldPriceEl.style.display = '';
        saveBadge.textContent = `Save ${discount}%`;
        saveBadge.style.display = '';
    } else {
        oldPriceEl.style.display = 'none';
        saveBadge.style.display = 'none';
    }

    // ── Description (short) ──────────────────────────────────
    const shortDesc = document.getElementById('pd-short-desc');
    if (shortDesc) {
        const text = p.description || '';
        // Use first sentence or first 200 chars as short desc
        const short = text.length > 220 ? text.slice(0, 220).trim() + '…' : text;
        shortDesc.textContent = short || 'Premium quality automotive part from MOTOHUB.';
    }

    // ── Stock Status ─────────────────────────────────────────
    const stockBadge = document.getElementById('pd-stock-badge');
    if (stockBadge) {
        if (!inStock) {
            stockBadge.textContent = 'Out of Stock';
            stockBadge.style.background = '#e53e3e';
        } else if (p.stock <= (p.low_stock_alert || 5)) {
            stockBadge.textContent = `Low Stock — Only ${p.stock} left`;
            stockBadge.style.background = '#f59e0b';
        } else {
            stockBadge.textContent = 'In Stock';
            stockBadge.style.background = '#27ae60';
        }
    }

    // ── Add-to-Cart button ───────────────────────────────────
    const addBtn = document.getElementById('pd-add-cart-btn');
    if (addBtn) {
        if (!inStock) {
            addBtn.disabled = true;
            addBtn.innerHTML = '<i class="fa-solid fa-ban"></i> Out of Stock';
        }
        addBtn.addEventListener('click', () => {
            const qty = parseInt(document.querySelector('.qty-input')?.value || 1);
            API.addToCart({ id: p.id, name: p.name, price, image: p.image }, qty);
            addBtn.innerHTML = '<i class="fa-solid fa-check"></i> Added to Cart!';
            setTimeout(() => {
                addBtn.innerHTML = '<i class="fa-solid fa-cart-arrow-down"></i> ADD TO CART';
            }, 2000);
        });
    }

    // ── Meta (SKU / Category / Brand) ────────────────────────
    document.getElementById('pd-sku').textContent    = p.sku || '—';
    document.getElementById('pd-cat-link').textContent = catName;
    document.getElementById('pd-cat-link').href = `products.html?category=${encodeURIComponent(catName)}`;
    document.getElementById('pd-brand').textContent  = brand || '—';
    document.getElementById('pd-warranty').textContent = p.warranty || 'No Warranty';
    document.getElementById('pd-return').textContent   = p.return_policy || 'Non-returnable';

    // ── Description Tab ──────────────────────────────────────
    const descPane = document.getElementById('pd-desc-content');
    if (descPane && p.description) {
        // Convert newlines to paragraphs
        const paras = p.description.split(/\r?\n/).filter(Boolean);
        descPane.innerHTML = `<h3>${p.name}</h3>` + paras.map(t => `<p>${t}</p>`).join('');
    }

    // ── Specifications Tab ───────────────────────────────────
    const specsBody = document.getElementById('pd-specs-tbody');
    if (specsBody) {
        const rows = [];
        // Standard fields
        if (p.compatibility_type) rows.push(['Compatible Vehicle', p.compatibility_type]);
        if (p.compatibility_tags) rows.push(['Compatibility Tags', p.compatibility_tags]);
        if (p.warranty)           rows.push(['Warranty', p.warranty]);
        if (p.return_policy)      rows.push(['Return Policy', p.return_policy]);
        if (brand)                rows.push(['Brand', brand]);
        if (p.sku)                rows.push(['SKU', p.sku]);
        if (p.stock !== undefined) rows.push(['Stock Available', p.stock + ' units']);

        // Category-specific specs from JSON
        if (p.specifications && typeof p.specifications === 'object') {
            Object.entries(p.specifications).forEach(([k, v]) => {
                if (k !== 'subcategory' && v) rows.push([prettyLabel(k), v]);
            });
        }

        specsBody.innerHTML = rows.map(([k, v]) => `
            <tr><th>${k}</th><td>${v}</td></tr>
        `).join('') || '<tr><td colspan="2" style="text-align:center;color:#888;">No specifications available.</td></tr>';
    }

    // ── Reviews Tab count ────────────────────────────────────
    const reviewTabBtn = document.getElementById('tab-reviews-btn');
    if (reviewTabBtn) reviewTabBtn.textContent = 'Reviews';

    // ── Compatibility / Variations section ───────────────────
    const compSection = document.getElementById('pd-compat-section');
    if (compSection) {
        if (p.compatibility_type || p.compatibility_tags) {
            const compEl = document.getElementById('pd-compat-value');
            if (compEl) compEl.textContent = [p.compatibility_type, p.compatibility_tags].filter(Boolean).join(' · ');
        } else {
            compSection.style.display = 'none';
        }
    }
}

window.pdChangeImage = function(src, el) {
    document.getElementById('pdMainImg').src = src;
    document.querySelectorAll('.thumb-item').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
};

async function loadRelatedProducts(p) {
    const grid = document.getElementById('related-products-grid');
    if (!grid) return;
    try {
        const catId = (p.category && p.category.id) ? p.category.id : p.category;
        const endpoint = catId
            ? `/products/?category=${catId}&limit=4`
            : `/products/?limit=4`;
        const data = await API.req(endpoint);
        const products = (data.results || data).filter(r => r.id !== p.id).slice(0, 3);
        if (!products.length) {
            grid.closest('.related-products').style.display = 'none';
            return;
        }
        grid.innerHTML = products.map(rp => buildRelatedCard(rp)).join('');
        // Attach cart buttons
        grid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                try {
                    const prod = JSON.parse(btn.dataset.product);
                    API.addToCart(prod);
                    btn.innerHTML = '<i class="fa-solid fa-check"></i> Added!';
                    setTimeout(() => { btn.innerHTML = '<i class="fa-solid fa-cart-shopping"></i> Add To Cart'; }, 1500);
                } catch(e) {}
            });
        });
    } catch (e) {
        console.warn('Related products failed:', e);
    }
}

function buildRelatedCard(p) {
    const price    = parseFloat(p.effective_price || p.price);
    const oldPrice = p.discount_price && parseFloat(p.discount_price) < parseFloat(p.price)
        ? `<span class="old">${fmtPrice(p.price)}</span>` : '';
    const img = mediaUrl(p.image);
    const cat = (p.category_name || '').toUpperCase();
    const prod = JSON.stringify({ id: p.id, name: p.name, price, image: p.image }).replace(/'/g, '&#39;');
    return `
    <div class="product-card" data-id="${p.id}">
        <a href="product-detail.html?id=${p.id}" class="product-image">
            <img src="${img}" alt="${p.name}" onerror="this.src='assets/images/placeholder.jpg'">
        </a>
        <div class="product-info">
            <p class="category">${cat}</p>
            <h3><a href="product-detail.html?id=${p.id}">${p.name}</a></h3>
            <div class="rating">${starsHtml(4)}</div>
            <div class="price"><span class="current">${fmtPrice(price)}</span>${oldPrice}</div>
        </div>
        <div class="product-actions">
            <button class="action-btn"><i class="fa-regular fa-heart"></i></button>
            <button class="add-to-cart-btn btn btn-red" data-product='${prod}'>
                <i class="fa-solid fa-cart-shopping"></i> Add To Cart
            </button>
            <button class="action-btn" onclick="window.location='product-detail.html?id=${p.id}'">
                <i class="fa-solid fa-eye"></i>
            </button>
        </div>
    </div>`;
}
