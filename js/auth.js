/**
 * ============================================================
 *  MOTOHUB – Auth Integration  (js/auth.js)
 *  Connects login.html / signup forms to the real API.
 * ============================================================
 */
document.addEventListener('DOMContentLoaded', () => {

  // ── Tab Switching ──────────────────────────────────────────
  const tabs   = document.querySelectorAll('.auth-tab');
  const forms  = document.querySelectorAll('.auth-form');
  const slider = document.querySelector('.auth-tab-slider');
  if (tabs.length) {
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        if (slider) slider.style.transform = `translateX(${index * 100}%)`;
        const targetId = tab.getAttribute('data-target') + '-form';
        forms.forEach(f => {
          f.classList.toggle('active', f.id === targetId);
          if (f.id === targetId) {
            f.querySelectorAll('.input-group').forEach((inp, i) => {
              inp.style.opacity = '0';
              inp.style.transform = 'translateY(10px)';
              setTimeout(() => {
                inp.style.transition = 'all 0.3s ease';
                inp.style.opacity = '1';
                inp.style.transform = 'translateY(0)';
              }, 50 * i + 100);
            });
          }
        });
      });
    });
  }

  // ── Password Toggle ────────────────────────────────────────
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', function () {
      const input = this.previousElementSibling;
      const icon  = this.querySelector('i');
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      icon.classList.toggle('fa-eye', !isPassword);
      icon.classList.toggle('fa-eye-slash', isPassword);
    });
  });

  // ── Helper: set button loading ─────────────────────────────
  function setBtnLoading(btn, loading) {
    if (loading) {
      btn.dataset.orig = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Please wait…';
      btn.disabled = true;
    } else {
      btn.innerHTML = btn.dataset.orig || btn.innerHTML;
      btn.disabled = false;
    }
  }

  // ── LOGIN FORM ─────────────────────────────────────────────
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const btn      = loginForm.querySelector('button[type="submit"]');
      const username = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      setBtnLoading(btn, true);
      try {
        const data = await API.req('/auth/login/', {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        });

        // Fetch user profile to get role
        const profile = await fetch(`${API.BASE}/auth/profile/`, {
          headers: { 'Authorization': `Bearer ${data.access}` },
        }).then(r => r.json());

        API.setAuth({ access: data.access, refresh: data.refresh, user: profile });
        API.toast('Login successful! Redirecting…', 'success');

        // Role-based redirect
        setTimeout(() => {
          const role = profile.role;
          if (role === 'admin')       window.location.href = 'dashboard-admin.html';
          else if (role === 'moderator') window.location.href = 'dashboard-moderator.html';
          else if (role === 'garage')    window.location.href = 'dashboard-garage.html';
          else                           window.location.href = 'dashboard-customer.html';
        }, 800);
      } catch (err) {
        setBtnLoading(btn, false);
        API.toast(err.detail || 'Login failed. Check your credentials.', 'error');
      }
    });
  }

  // ── SIGNUP FORM ────────────────────────────────────────────
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', async e => {
      e.preventDefault();
      const btn       = signupForm.querySelector('button[type="submit"]');
      const firstName = document.getElementById('signup-fname').value.trim();
      const lastName  = document.getElementById('signup-lname').value.trim();
      const email     = document.getElementById('signup-email').value.trim();
      const password  = document.getElementById('signup-password').value;

      setBtnLoading(btn, true);
      try {
        const data = await API.req('/auth/register/', {
          method: 'POST',
          body: JSON.stringify({
            username:  email,
            email,
            first_name: firstName,
            last_name:  lastName,
            password,
            password2: password,
          }),
        });
        API.setAuth(data);
        API.toast('Account created! Welcome to MOTOHUB!', 'success');
        setTimeout(() => window.location.href = 'dashboard-customer.html', 800);
      } catch (err) {
        setBtnLoading(btn, false);
        const msg = Object.values(err).flat().join(' ') || 'Registration failed.';
        API.toast(msg, 'error');
      }
    });
  }

  // ── Password Strength Bar ──────────────────────────────────
  const signupPassword = document.getElementById('signup-password');
  const strengthBar = document.querySelector('.strength-bar');
  if (signupPassword && strengthBar) {
    signupPassword.addEventListener('input', function() {
      const val = this.value;
      let strength = 0;
      if (val.length > 5) strength += 1;
      if (val.length > 8) strength += 1;
      if (/[A-Z]/.test(val)) strength += 1;
      if (/[0-9]/.test(val)) strength += 1;
      if (/[^A-Za-z0-9]/.test(val)) strength += 1;

      if (val.length === 0) {
        strengthBar.style.width = '0';
      } else if (strength <= 2) {
        strengthBar.style.width = '33%';
        strengthBar.style.backgroundColor = '#e74c3c'; // Weak, Red
      } else if (strength <= 4) {
        strengthBar.style.width = '66%';
        strengthBar.style.backgroundColor = '#f1c40f'; // Medium, Yellow
      } else {
        strengthBar.style.width = '100%';
        strengthBar.style.backgroundColor = '#2ecc71'; // Strong, Green
      }
    });
  }

  // ── Auth State Check (every page) ─────────────────────────
  const u = API.user();
  if (u) {
    // Update "My Account" link to show user name + logout
    document.querySelectorAll('.account-links a').forEach(link => {
      if (link.innerHTML.includes('My Account')) {
        link.innerHTML = `<i class="fa-regular fa-user"></i> ${u.first_name || u.username}`;
        link.href = u.role === 'admin'       ? 'dashboard-admin.html' :
                    u.role === 'moderator'   ? 'dashboard-moderator.html' :
                    u.role === 'garage'      ? 'dashboard-garage.html' :
                                               'dashboard-customer.html';
      }
    });
  }
});
