/**
 * ============================================================
 *  MOTOHUB – Products Page Integration  (js/products-api.js)
 *  Connects products.html & collection.html to the API.
 *  Also handles cart operations across all product pages.
 * ============================================================
 */
document.addEventListener('DOMContentLoaded', async () => {
  const grid   = document.querySelector('.products-grid');
  const toolbar = document.querySelector('.toolbar-left p');

  // ── Load Products from API ─────────────────────────────────
  if (grid) {
    try {
      // Get URL params for filtering
      const params  = new URLSearchParams(window.location.search);
      const search  = params.get('search') || '';
      const cat     = params.get('category') || '';
      const minP    = params.get('min_price') || '';
      const maxP    = params.get('max_price') || '';
      const sort    = params.get('ordering') || '-created_at';

      const qs = new URLSearchParams({
        ...(search && { search }),
        ...(cat    && { category: cat }),
        ...(minP   && { min_price: minP }),
        ...(maxP   && { max_price: maxP }),
        ordering: sort,
      });

      const data = await API.req(`/products/?${qs}`);
      const products = data.results || data;

      if (toolbar) {
        toolbar.textContent = `Showing ${products.length} result${products.length !== 1 ? 's' : ''}`;
      }

      if (products.length === 0) {
        grid.innerHTML = `
          <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#888;">
            <i class="fa-solid fa-box-open" style="font-size:48px;margin-bottom:16px;display:block;"></i>
            <h3>No products found</h3>
            <p>Try adjusting your filters or search query.</p>
          </div>`;
        return;
      }

      grid.innerHTML = products.map(p => buildProductCard(p)).join('');
      attachCartButtons();

    } catch (err) {
      console.warn('Products API error:', err);
      // Keep existing static HTML if API fails (graceful degradation)
    }
  }

  // ── Search bar integration ─────────────────────────────────
  const searchBtn  = document.querySelector('.search-btn');
  const searchInp  = document.querySelector('.search-input');
  if (searchBtn && searchInp) {
    searchBtn.addEventListener('click', () => {
      const q = searchInp.value.trim();
      if (q) window.location.href = `products.html?search=${encodeURIComponent(q)}`;
    });
    searchInp.addEventListener('keydown', e => {
      if (e.key === 'Enter') searchBtn.click();
    });
  }

  // ── Sort select ────────────────────────────────────────────
  const sortSel = document.querySelector('.sort-by select');
  if (sortSel) {
    sortSel.addEventListener('change', () => {
      const map = {
        'Sort by Popularity':          '-created_at',
        'Sort by Latest':              '-created_at',
        'Sort by Price: Low to High':  'price',
        'Sort by Price: High to Low':  '-price',
      };
      const ordering = map[sortSel.value] || '-created_at';
      const params = new URLSearchParams(window.location.search);
      params.set('ordering', ordering);
      window.location.href = `products.html?${params}`;
    });
  }

  // ── Price filter button ────────────────────────────────────
  const filterBtn = document.querySelector('.filter-btn');
  const slider    = document.getElementById('priceRange');
  const maxVal    = document.getElementById('maxValue');
  if (slider && maxVal) {
    slider.oninput = () => { maxVal.textContent = slider.value; };
  }
  if (filterBtn && slider) {
    filterBtn.addEventListener('click', () => {
      const params = new URLSearchParams(window.location.search);
      params.set('max_price', slider.value);
      window.location.href = `products.html?${params}`;
    });
  }

  // ── Category filter (sidebar checkboxes) ──────────────────
  const urlParams = new URLSearchParams(window.location.search);
  const activeCategory = urlParams.get('category');
  const categoryCheckboxes = document.querySelectorAll('.filter-widget:first-of-type input[type="checkbox"]');
  if (activeCategory) {
    categoryCheckboxes.forEach(cb => {
      cb.checked = cb.value === activeCategory;
    });
  }
  categoryCheckboxes.forEach(cb => {
    cb.addEventListener('change', e => {
      if (e.target.checked) {
        const params2 = new URLSearchParams(window.location.search);
        if (e.target.value === 'all') {
          params2.delete('category');
        } else {
          params2.set('category', e.target.value);
        }
        window.location.href = `products.html?${params2}`;
      }
    });
  });
});

// ── Build Product Card HTML ────────────────────────────────
function buildProductCard(p) {
  const price       = parseFloat(p.effective_price || p.price);
  const oldPrice    = p.discount_price && p.price > p.effective_price
                        ? `<span class="old">${API.fmtCurrency(p.price)}</span>` : '';
  const isOnSale    = p.discount_price && parseFloat(p.discount_price) < parseFloat(p.price);
  const badge       = isOnSale ? '<span class="badge sale">Sale</span>' : '';
  const img         = API.mediaUrl(p.image);
  const outOfStock  = p.status === 'out_of_stock' || p.stock === 0;

  return `
    <div class="product-card" data-id="${p.id}">
      <a href="product-detail.html?id=${p.id}" class="product-image">
        <img src="${img}" alt="${p.name}" onerror="this.src='assets/images/placeholder.jpg'">
        <div class="product-badges">${badge}</div>
      </a>
      <div class="product-info">
        <p class="category">${(p.category_name || '').toUpperCase()}</p>
        <h3><a href="product-detail.html?id=${p.id}">${p.name}</a></h3>
        <div class="rating">
          <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
          <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
          <i class="fa-regular fa-star"></i>
        </div>
        <div class="price">
          <span class="current">${API.fmtCurrency(price)}</span>
          ${oldPrice}
        </div>
      </div>
      <div class="product-actions">
        <button class="action-btn"><i class="fa-regular fa-heart"></i></button>
        <button class="add-to-cart-btn btn btn-red"
                data-product='${JSON.stringify({id:p.id,name:p.name,price:price,image:p.image}).replace(/'/g,"&#39;")}'
                ${outOfStock ? 'disabled' : ''}>
          <i class="fa-solid fa-cart-shopping"></i> ${outOfStock ? 'Out of Stock' : 'Add To Cart'}
        </button>
        <button class="action-btn" onclick="window.location='product-detail.html?id=${p.id}'">
          <i class="fa-solid fa-eye"></i>
        </button>
      </div>
    </div>`;
}

// ── Attach Add-to-Cart Buttons ─────────────────────────────
function attachCartButtons() {
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    if (btn._mhBound) return;
    btn._mhBound = true;
    btn.addEventListener('click', () => {
      try {
        const product = JSON.parse(btn.dataset.product);
        API.addToCart(product);
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Added!';
        setTimeout(() => {
          btn.innerHTML = '<i class="fa-solid fa-cart-shopping"></i> Add To Cart';
        }, 1500);
      } catch (e) {
        API.toast('Could not add to cart.', 'error');
      }
    });
  });
}

// Attach to static cards too (pages not loaded from API)
document.addEventListener('DOMContentLoaded', attachCartButtons);
