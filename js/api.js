/**
 * ============================================================
 *  MOTOHUB – Central API Client  (js/api.js)
 *
 *  All pages import this first. It handles:
 *  - Base URL config
 *  - JWT token storage / refresh
 *  - Authenticated fetch() wrapper
 *  - Cart state (localStorage)
 *  - Toast notifications
 * ============================================================
 */

const API = (() => {
  // ─── Config ────────────────────────────────────────────────
  const BASE = 'http://127.0.0.1:8000/api';
  const MEDIA = 'http://127.0.0.1:8000';

  // ─── Token Helpers ─────────────────────────────────────────
  const token   = () => localStorage.getItem('mh_access');
  const refresh = () => localStorage.getItem('mh_refresh');
  const user    = () => JSON.parse(localStorage.getItem('mh_user') || 'null');

  function setAuth(data) {
    localStorage.setItem('mh_access',  data.access);
    localStorage.setItem('mh_refresh', data.refresh);
    localStorage.setItem('mh_user',    JSON.stringify(data.user));
    localStorage.setItem('motohub_logged_in', 'true');
    localStorage.setItem('motohub_user_role', data.user.role);
  }

  function clearAuth() {
    ['mh_access','mh_refresh','mh_user',
     'motohub_logged_in','motohub_user_role'].forEach(k => localStorage.removeItem(k));
  }

  // ─── Fetch Wrapper ─────────────────────────────────────────
  async function req(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    const t = token();
    if (t) headers['Authorization'] = `Bearer ${t}`;

    let res = await fetch(`${BASE}${path}`, { ...options, headers });

    // Auto-refresh on 401
    if (res.status === 401 && refresh()) {
      const rr = await fetch(`${BASE}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refresh() }),
      });
      if (rr.ok) {
        const rd = await rr.json();
        localStorage.setItem('mh_access', rd.access);
        headers['Authorization'] = `Bearer ${rd.access}`;
        res = await fetch(`${BASE}${path}`, { ...options, headers });
      } else {
        clearAuth();
        window.location.href = 'login.html';
        return;
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw err;
    }
    if (res.status === 204) return null;
    return res.json();
  }

  // ─── Cart (localStorage) ───────────────────────────────────
  function getCart() {
    return JSON.parse(localStorage.getItem('mh_cart') || '[]');
  }
  function saveCart(items) {
    localStorage.setItem('mh_cart', JSON.stringify(items));
    updateCartBadge();
  }
  function addToCart(product, qty = 1) {
    const cart = getCart();
    const idx  = cart.findIndex(i => i.id === product.id);
    if (idx > -1) {
      cart[idx].quantity += qty;
    } else {
      cart.push({ id: product.id, name: product.name,
                  price: product.effective_price || product.price,
                  image: mediaUrl(product.image),
                  quantity: qty });
    }
    saveCart(cart);
    toast(`${product.name} added to cart!`, 'success');
  }
  function removeFromCart(productId) {
    saveCart(getCart().filter(i => i.id !== productId));
  }
  function clearCart() {
    saveCart([]);
  }
  function cartTotal() {
    return getCart().reduce((s, i) => s + i.price * i.quantity, 0);
  }
  function updateCartBadge() {
    const count = getCart().reduce((s, i) => s + i.quantity, 0);
    document.querySelectorAll('.cart-count').forEach(el => el.textContent = count);
  }

  // ─── Toast ─────────────────────────────────────────────────
  function toast(msg, type = 'info', duration = 3000) {
    let container = document.getElementById('mh-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'mh-toast-container';
      Object.assign(container.style, {
        position: 'fixed', bottom: '24px', right: '24px',
        zIndex: 99999, display: 'flex', flexDirection: 'column', gap: '10px',
      });
      document.body.appendChild(container);
    }
    const t = document.createElement('div');
    const colors = { success: '#27ae60', error: '#e74c3c', info: '#2980b9', warning: '#f39c12' };
    Object.assign(t.style, {
      background: colors[type] || colors.info,
      color: '#fff', padding: '12px 20px',
      borderRadius: '8px', fontFamily: 'Inter, sans-serif',
      fontSize: '14px', fontWeight: '500',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      opacity: '0', transform: 'translateX(40px)',
      transition: 'all 0.3s ease', minWidth: '240px',
    });
    t.textContent = msg;
    container.appendChild(t);
    requestAnimationFrame(() => {
      t.style.opacity = '1';
      t.style.transform = 'translateX(0)';
    });
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateX(40px)';
      setTimeout(() => t.remove(), 300);
    }, duration);
  }

  // ─── Auth Guard ────────────────────────────────────────────
  function requireAuth(redirectTo = 'login.html') {
    if (!token()) {
      toast('Please log in to continue.', 'warning');
      setTimeout(() => window.location.href = redirectTo, 1000);
      return false;
    }
    return true;
  }

  // ─── Media URL ─────────────────────────────────────────────
  function mediaUrl(path) {
    if (!path) return 'assets/images/placeholder.jpg';
    if (path.startsWith('http')) return path;
    return `${MEDIA}${path}`;
  }

  // ─── Misc Helpers ──────────────────────────────────────────
  function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }
  function fmtCurrency(n) {
    return `₹${parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  }
  function statusBadge(status) {
    const map = {
      pending:    'processing', confirmed: 'processing',
      shipped:    'processing', delivered: 'delivered',
      cancelled:  'cancelled',  completed: 'delivered',
      approved:   'delivered',  rejected:  'cancelled',
      open:       'processing', in_progress: 'processing',
      resolved:   'delivered',  closed:    'delivered',
      active:     'delivered',  inactive: 'cancelled',
      out_of_stock: 'cancelled',
    };
    return map[status] || 'processing';
  }

  // ─── Public API ────────────────────────────────────────────
  return {
    BASE, MEDIA, req,
    token, refresh, user, setAuth, clearAuth,
    getCart, saveCart, addToCart, removeFromCart, clearCart, cartTotal,
    updateCartBadge, toast, requireAuth, mediaUrl,
    fmtDate, fmtCurrency, statusBadge,
  };
})();

// Run cart badge on every page load
document.addEventListener('DOMContentLoaded', () => API.updateCartBadge());
