/**
 * ============================================================
 *  MOTOHUB – Checkout Integration  (js/checkout-api.js)
 *
 *  Responsibilities:
 *  1. Render cart items in the Order Summary sidebar
 *  2. Load & display saved addresses from /api/auth/addresses/
 *  3. Allow selecting a saved address OR entering a new one
 *  4. Optionally save the new address to the DB on checkout
 *  5. POST to /api/orders/create/ with full payload
 *  6. Store order info in sessionStorage → redirect to gateway
 * ============================================================
 */
document.addEventListener('DOMContentLoaded', async () => {

  // ── 1. Render Cart Items in Order Summary ────────────────
  const orderItemsEl  = document.querySelector('.order-items');
  const subtotalSpans = document.querySelectorAll('.totals-row span:last-child');
  const grandEl       = document.querySelector('.grand-total .price, .grand-total span:last-child');
  const cart          = API.getCart();

  if (orderItemsEl && cart.length > 0) {
    orderItemsEl.innerHTML = cart.map(item => {
      const imgSrc = item.image && !item.image.includes('placeholder')
        ? (item.image.startsWith('http') ? item.image : 'http://127.0.0.1:8000' + item.image)
        : 'assets/images/placeholder.jpg';
      return `
      <div class="order-item">
        <div class="order-item-img">
          <img src="${imgSrc}" alt="${item.name}"
               onerror="if(!this.dataset.err){this.dataset.err=1;this.src='assets/images/placeholder.jpg'}">
        </div>
        <div class="order-item-info">
          <h4>${item.name}</h4>
          <p>Qty: ${item.quantity}</p>
        </div>
        <div class="order-item-price">${API.fmtCurrency(item.price * item.quantity)}</div>
      </div>`;
    }).join('');

    const total = API.cartTotal();
    if (subtotalSpans[0]) subtotalSpans[0].textContent = API.fmtCurrency(total);
    if (grandEl)          grandEl.textContent          = API.fmtCurrency(total);
    sessionStorage.setItem('mh_order_total', total);
  } else if (orderItemsEl) {
    orderItemsEl.innerHTML = `<p style="color:#888;text-align:center;padding:20px;">
      Your cart is empty. <a href="products.html">Continue Shopping</a></p>`;
  }

  // ── 2. Address Management ─────────────────────────────────
  const addrGrid    = document.getElementById('saved-addresses-grid');
  const newAddrForm = document.getElementById('new-address-form');

  // Track which saved address is selected (null = user is entering new)
  let selectedAddressId = null;
  let savedAddresses    = [];

  /**
   * Renders the saved-address cards + "Add New" card
   */
  function renderAddressCards(addresses) {
    savedAddresses = addresses;
    let html = '';

    addresses.forEach(addr => {
      const isDefault = addr.is_default;
      html += `
        <div class="saved-addr-card${isDefault ? ' selected' : ''}"
             data-id="${addr.id}"
             onclick="selectSavedAddress(${addr.id})">
          ${isDefault ? '<span class="addr-badge">Default</span>' : ''}
          <h5>${addr.title}</h5>
          <p>${addr.name}</p>
          <p>${addr.address_lines}</p>
          <p>${addr.city}, ${addr.state} – ${addr.pincode}</p>
          ${addr.phone ? `<p><i class="fa-solid fa-phone" style="font-size:10px;"></i> ${addr.phone}</p>` : ''}
        </div>`;
    });

    // "Add New Address" card
    html += `
      <div class="addr-add-card" onclick="showNewAddressForm()">
        <i class="fa-solid fa-plus"></i>
        <span>Add New Address</span>
      </div>`;

    addrGrid.innerHTML = html;

    // Auto-select the default address
    const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
    if (defaultAddr) {
      selectedAddressId = defaultAddr.id;
    } else if (addresses.length === 0) {
      // No saved addresses — open new form automatically
      showNewAddressForm();
    }
  }

  /** Select a saved address card */
  window.selectSavedAddress = function(id) {
    selectedAddressId = id;
    document.querySelectorAll('.saved-addr-card').forEach(c => c.classList.remove('selected'));
    const card = addrGrid.querySelector(`[data-id="${id}"]`);
    if (card) card.classList.add('selected');
    // Hide new address form when selecting saved
    if (newAddrForm) newAddrForm.classList.remove('active');
  };

  /** Show the new address entry form */
  window.showNewAddressForm = function() {
    selectedAddressId = null;
    document.querySelectorAll('.saved-addr-card').forEach(c => c.classList.remove('selected'));
    if (newAddrForm) newAddrForm.classList.add('active');
    // Scroll to the form
    newAddrForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Load addresses from API (if logged in)
  if (API.token()) {
    try {
      const data = await API.req('/auth/addresses/');
      const addresses = data.results || data;
      renderAddressCards(addresses);
    } catch (_) {
      addrGrid.innerHTML = `
        <div class="addr-add-card" onclick="showNewAddressForm()" style="flex:1 0 100%;">
          <i class="fa-solid fa-plus"></i>
          <span>Add Delivery Address</span>
        </div>`;
      showNewAddressForm();
    }
  } else {
    // Not logged in – show the new address form
    addrGrid.innerHTML = `
      <div class="addr-add-card" onclick="showNewAddressForm()" style="flex:1 0 100%;">
        <i class="fa-solid fa-plus"></i>
        <span>Enter Delivery Address</span>
      </div>`;
    showNewAddressForm();
  }

  // ── 3. Payment Option UI ──────────────────────────────────
  document.querySelectorAll('.payment-option').forEach(opt => {
    opt.addEventListener('click', function () {
      document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
      this.classList.add('selected');
      this.querySelector('input[type="radio"]').checked = true;
    });
  });

  // ── 4. Form Submit → Place Order ─────────────────────────
  const form = document.getElementById('checkout-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();

    if (!API.requireAuth()) return;

    const currentCart = API.getCart();
    if (currentCart.length === 0) {
      API.toast('Your cart is empty!', 'warning');
      return;
    }

    // --- Build shippingAddress object ---
    let shippingAddress = null;

    if (selectedAddressId !== null) {
      // Use the saved address from memory
      const saved = savedAddresses.find(a => a.id === selectedAddressId);
      if (!saved) {
        API.toast('Please select a delivery address.', 'warning');
        return;
      }
      shippingAddress = {
        name:         saved.name,
        address:      saved.address_lines,
        city:         saved.city,
        state:        saved.state,
        pincode:      saved.pincode,
        phone:        saved.phone || '',
      };
    } else {
      // Validate new address form
      const title   = document.getElementById('addr-title')?.value.trim();
      const name    = document.getElementById('addr-name')?.value.trim();
      const lines   = document.getElementById('addr-lines')?.value.trim();
      const city    = document.getElementById('addr-city')?.value.trim();
      const state   = document.getElementById('addr-state')?.value.trim();
      const pincode = document.getElementById('addr-pincode')?.value.trim();
      const phone   = document.getElementById('addr-phone')?.value.trim();

      if (!name || !lines || !city || !state || !pincode) {
        API.toast('Please fill in all required address fields.', 'warning');
        document.getElementById('addr-name')?.focus();
        return;
      }

      shippingAddress = {
        name, address: lines, city, state, pincode, phone,
      };

      // ── Save address to DB if checkbox is checked ─────────
      const saveCb = document.getElementById('save-address-cb');
      if (saveCb && saveCb.checked && API.token()) {
        try {
          await API.req('/auth/addresses/', {
            method: 'POST',
            body: JSON.stringify({
              title:         title || 'Home',
              name:          name,
              address_lines: lines,
              city:          city,
              state:         state,
              pincode:       pincode,
              phone:         phone,
              is_default:    savedAddresses.length === 0, // first address becomes default
            }),
          });
        } catch (_) {
          // Non-fatal — continue with order anyway
        }
      }
    }

    // --- Submit Order ---
    const btn      = form.querySelector('.place-order-btn');
    const origText = btn.innerHTML;
    btn.innerHTML  = '<i class="fa-solid fa-circle-notch fa-spin"></i> Placing Order\u2026';
    btn.disabled   = true;

    const gateway = document.querySelector('input[name="payment_gateway"]:checked')?.value || 'paytm';
    const notes   = document.getElementById('notes')?.value || '';

    const payload = {
      payment_method:   gateway,
      shipping_address: shippingAddress,
      notes,
      items: currentCart.map(i => ({ product: i.id, quantity: i.quantity })),
    };

    try {
      const order = await API.req('/orders/create/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      API.clearCart();

      // Store for gateway & success pages
      sessionStorage.setItem('mh_order_id',      String(order.id));
      sessionStorage.setItem('mh_order_total',   String(order.total_price));
      sessionStorage.setItem('mh_order_gateway', gateway);

      setTimeout(() => {
        if (gateway === 'paytm') {
          window.location.href = `gateway-paytm.html?order=${order.id}`;
        } else if (gateway === 'billdesk') {
          window.location.href = `gateway-billdesk.html?order=${order.id}`;
        } else {
          window.location.href = `order-success.html?order=${order.id}`;
        }
      }, 300);

    } catch (err) {
      btn.innerHTML = origText;
      btn.disabled  = false;
      let msg = 'Could not place order. Please try again.';
      if (err && typeof err === 'object') {
        const msgs = Object.values(err).flat().filter(v => typeof v === 'string');
        if (msgs.length) msg = msgs.join(' ');
      }
      API.toast(msg, 'error');
    }
  });
});
