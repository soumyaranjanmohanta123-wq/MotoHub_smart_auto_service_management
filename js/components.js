// =============================================================
//  MOTOHUB – Shared Component Loader  (js/components.js)
//
//  Fetches components/header.html and components/footer.html
//  and injects them into #header-placeholder / #footer-placeholder.
//  Also handles auth-aware nav state after injection.
// =============================================================

/**
 * Resolve the component URL — works both from:
 *   file://  (VS Code Live Server)
 *   http://  (Django dev server at 127.0.0.1:8000)
 */
function getComponentUrl(filename) {
    const isHttp = location.protocol.startsWith('http');
    if (isHttp) {
        // When served by Django, components are at /components/<file>
        return `/components/${filename}`;
    }
    return `components/${filename}`;
}

/**
 * Fetch an HTML partial and inject into a placeholder element.
 */
async function loadComponent(filename, el) {
    try {
        const res = await fetch(getComponentUrl(filename));
        if (!res.ok) throw new Error(`${filename}: HTTP ${res.status}`);
        el.innerHTML = await res.text();
    } catch (err) {
        console.warn('[components.js]', err.message);
    }
}

/**
 * Highlight the nav link matching the current page.
 */
function highlightActiveNav() {
    const current = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.main-nav a').forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === current);
    });
}

/**
 * Apply auth state to the injected header.
 * Called after header HTML is in the DOM.
 */
function applyAuthState() {
    const navAccount  = document.getElementById('nav-account');
    const navWishlist = document.getElementById('nav-wishlist');
    const searchBtn   = document.getElementById('global-search-btn');
    const searchInp   = document.getElementById('global-search-input');

    // ── Cart badge ────────────────────────────────────────────
    try {
        const cart  = JSON.parse(localStorage.getItem('mh_cart') || '[]');
        const count = cart.reduce((s, i) => s + i.quantity, 0);
        document.querySelectorAll('.cart-count').forEach(el => el.textContent = count);
    } catch(_) {}

    // ── Account links ─────────────────────────────────────────
    if (!navAccount) return;

    const token = localStorage.getItem('mh_access');
    const user  = JSON.parse(localStorage.getItem('mh_user') || 'null');

    if (token && user) {
        // Logged in
        const name = (user.first_name || user.username || 'Account').trim();
        navAccount.innerHTML = `<i class="fa-regular fa-user"></i> ${name}`;
        const dashMap = {
            admin:     'dashboard-admin.html',
            moderator: 'dashboard-moderator.html',
            garage:    'dashboard-garage.html',
            customer:  'dashboard-customer.html',
        };
        navAccount.href = dashMap[user.role] || 'dashboard-customer.html';

        // Show wishlist
        if (navWishlist) navWishlist.style.display = '';

        // Add logout link
        if (!document.getElementById('nav-logout')) {
            const logoutA      = document.createElement('a');
            logoutA.href       = '#';
            logoutA.id         = 'nav-logout';
            logoutA.innerHTML  = '<i class="fa-solid fa-arrow-right-from-bracket"></i> Logout';
            logoutA.addEventListener('click', e => {
                e.preventDefault();
                ['mh_access','mh_refresh','mh_user',
                 'motohub_logged_in','motohub_user_role']
                  .forEach(k => localStorage.removeItem(k));
                window.location.href = 'index.html';
            });
            navAccount.parentElement.appendChild(logoutA);
        }
    } else {
        // Not logged in
        navAccount.innerHTML = '<i class="fa-regular fa-user"></i> Login';
        navAccount.href      = 'login.html';
        if (navWishlist) navWishlist.style.display = 'none';
    }

    // ── Global Search ─────────────────────────────────────────
    if (searchBtn && searchInp) {
        searchBtn.addEventListener('click', () => {
            const q = searchInp.value.trim();
            if (q) window.location.href = `products.html?search=${encodeURIComponent(q)}`;
        });
        searchInp.addEventListener('keydown', e => {
            if (e.key === 'Enter') searchBtn.click();
        });
    }
}

// ── Main Entry Point ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const headerEl = document.getElementById('header-placeholder');
    const footerEl = document.getElementById('footer-placeholder');

    // Load both in parallel
    await Promise.all([
        headerEl ? loadComponent('header.html', headerEl) : Promise.resolve(),
        footerEl ? loadComponent('footer.html', footerEl) : Promise.resolve(),
    ]);

    // Post-injection tasks
    highlightActiveNav();
    applyAuthState();
});
