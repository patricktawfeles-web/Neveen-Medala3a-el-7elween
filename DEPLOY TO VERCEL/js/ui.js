/* ============================================================
   UI — shared chrome: nav, toasts, auth guard, WhatsApp builder
   ============================================================ */
window.UI = (function () {
  const C = window.APP_CONFIG;

  /* ------------------------------------------------ toasts */
  function toast(msg, type) {
    let wrap = document.getElementById('toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    const el = document.createElement('div');
    el.className = 'toast ' + (type || 'info');
    el.innerHTML = '<span class="toast-ico">' + (type === 'error' ? '!' : type === 'success' ? '✓' : '✦') + '</span><span></span>';
    el.lastChild.textContent = msg;
    wrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => {
      el.classList.remove('in');
      setTimeout(() => el.remove(), 400);
    }, 3400);
  }

  /* ------------------------------------------------ money */
  function money(n) {
    const v = Math.round(Number(n) || 0);
    return v.toLocaleString('en-US') + ' ' + C.currency;
  }

  /* ------------------------------------------------ auth guard */
  async function guard() {
    if (!DB.getSession()) await DB.init();
    const s = DB.getSession();
    if (!s) {
      const here = location.pathname.split('/').pop() || 'index.html';
      location.replace('auth.html?next=' + encodeURIComponent(here + location.hash));
      return null;
    }
    return s;
  }

  /* ------------------------------------------------ nav */
  function mountNav() {
    const slot = document.querySelector('[data-account]');
    if (!slot) return;
    const s = DB.getSession();
    if (s) {
      const name = (s.fullName || s.email.split('@')[0]);
      slot.innerHTML =
        '<a class="chip chip-user" href="dashboard.html" title="My Glam Space">' +
          '<span class="avatar">' + escapeHtml(name.charAt(0).toUpperCase()) + '</span>' +
          '<span class="chip-txt"><b></b><i>' + (DB.isCloud ? 'Cloud account' : 'Local account') + '</i></span>' +
        '</a>' +
        '<button class="btn btn-ghost btn-sm" data-signout>Sign Out</button>';
      slot.querySelector('b').textContent = name;
      slot.querySelector('[data-signout]').addEventListener('click', async () => {
        await DB.signOut();
        toast('Signed out. See you soon! ✨', 'success');
        setTimeout(() => location.replace('auth.html'), 500);
      });
    } else {
      slot.innerHTML = '<a class="btn btn-neon btn-sm" href="auth.html">Sign In</a>';
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ------------------------------------------------ chrome behaviour */
  let revealIO = null;

  /* watch any newly-rendered .reveal elements so they animate in like the rest */
  function revealIn(scope) {
    if (!revealIO) return;
    (scope || document).querySelectorAll('.reveal:not(.revealed)').forEach(el => revealIO.observe(el));
  }

  function initChrome() {
    // mobile menu
    const burger = document.querySelector('[data-burger]');
    const menu = document.getElementById('mobile-menu');
    if (burger && menu) {
      burger.addEventListener('click', () => {
        const open = menu.classList.toggle('open');
        burger.classList.toggle('is-open', open);
        document.body.classList.toggle('menu-open', open);
      });
      menu.addEventListener('click', e => {
        if (e.target.tagName === 'A') { menu.classList.remove('open'); burger.classList.remove('is-open'); document.body.classList.remove('menu-open'); }
      });
    }
    // every wa.me link on the site opens the INSTALLED app first — no download page
    document.addEventListener('click', e => {
      const a = e.target && e.target.closest ? e.target.closest('a[href*="wa.me"]') : null;
      if (!a) return;
      e.preventDefault();
      let phone = '', text = '';
      try {
        const u = new URL(a.href);
        phone = u.pathname.replace(/\//g, '');
        text = u.searchParams.get('text') || '';
      } catch (err) {}
      openWhatsApp(text, phone);
    });
    // the "Always allow" hint stays hidden for good once WhatsApp opened once
    try {
      if (localStorage.getItem('nvWaDone')) {
        document.querySelectorAll('.wa-hint').forEach(el => el.classList.add('wa-hint-done'));
      }
    } catch (err) {}
    // nav shadow on scroll
    const nav = document.querySelector('.nav');
    const onScroll = () => { if (nav) nav.classList.toggle('scrolled', window.scrollY > 24); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    // reveal on scroll (kept at module level so re-rendered content can join in)
    if (!revealIO) {
      revealIO = new IntersectionObserver(entries => {
        entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('revealed'); revealIO.unobserve(en.target); } });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    }
    revealIn(document);
    // footer year
    document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
  }

  /* ------------------------------------------------ WhatsApp */
  function waLink(text) {
    return 'https://wa.me/' + C.whatsapp + '?text=' + encodeURIComponent(text);
  }

  // friendly screen shown in the helper tab while the browser asks "Open WhatsApp?"
  const HELPER_SCREEN = '<!doctype html><html><head><meta charset="utf-8"><title>Opening WhatsApp…</title>' +
    '<style>body{margin:0;height:100vh;display:grid;place-items:center;text-align:center;background:#0F0F14;color:#F7F1F5;font:15px/1.7 system-ui,sans-serif}' +
    'b{color:#FF2E93}small{display:block;color:#A9A2AE;margin-top:10px;font-family:system-ui}</style></head><body>' +
    '<div>🌙 <b>Opening WhatsApp…</b><br>If your browser asks to open WhatsApp, choose <b>Always allow</b>.' +
    '<small lang="ar" dir="rtl">هيتفتح الواتساب… لو المتصفح طلب الإذن اختاري Always allow.</small>' +
    '<small>Safe to close this tab · تقدري تقفلي التبويب ده</small></div></body></html>';

  // once the app opened successfully the "Always allow" hint is no longer needed
  function hintDone() {
    try { localStorage.setItem('nvWaDone', '1'); } catch (e) {}
    document.querySelectorAll('.wa-hint').forEach(el => el.classList.add('wa-hint-done'));
  }

  function buildBookingMessage(b) {
    const lines = [];
    lines.push('🌸 *NEW BOOKING — ' + C.brand.toUpperCase() + '*');
    lines.push('──────────────────────');
    lines.push('👤 *Name:* ' + (b.name || '—'));
    lines.push('📱 *Phone:* ' + (b.phone || '—'));
    if (b.date || b.time) lines.push('🗓 *Preferred:* ' + (b.date || 'any day') + (b.time ? ' — ' + b.time : ''));
    lines.push('');
    lines.push('💅 *Services:*');
    (b.services || []).forEach(s => lines.push('  • ' + s.name + (s.price != null ? ' — ' + money(s.price) : '')));
    lines.push('');
    lines.push('🧾 Subtotal: ' + money(b.subtotal || 0));
    if (b.discount > 0) lines.push('💖 Discount (' + Math.round((b.discountRate || 0.1) * 100) + '%): -' + money(b.discount));
    lines.push('💰 *TOTAL: ' + money(b.total || 0) + '*');
    if (b.bundleName) lines.push('🎀 Bundle: ' + b.bundleName);
    if (b.shade) lines.push('🎨 Shade I love: ' + b.shade);
    if (b.notes) lines.push('📝 Notes: ' + b.notes);
    lines.push('──────────────────────');
    lines.push('Sent from ' + C.brand + ' website 🌙');
    return lines.join('\n');
  }

  /**
   * Opens WhatsApp without ever showing a "download WhatsApp" page.
   *  · phones       → wa.me jumps straight into the app (or the store page)
   *  · desktop      → the INSTALLED app is launched directly via whatsapp://
   *                   in a helper tab, so a blocked attempt can never replace this page
   *  · nothing happened after 6s (blocked / declined / app missing)
   *                  → the helper tab becomes the WhatsApp *web* chat instead
   */
  function openWhatsApp(text, phone) {
    phone = String(phone || C.whatsapp).replace(/[^0-9]/g, '') || C.whatsapp;
    const qA = text ? '?text=' + encodeURIComponent(text) : '';
    const qB = text ? '&text=' + encodeURIComponent(text) : '';
    const waUrl   = 'https://wa.me/' + phone + qA;                      // universal link
    const appUrl  = 'whatsapp://send?phone=' + phone + qB;              // installed app
    const chatUrl = 'https://web.whatsapp.com/send?phone=' + phone + qB; // chat in the browser

    // phones: wa.me opens the app directly (or the store page if it's missing)
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      location.href = waUrl;
      return waUrl;
    }

    // desktop attempt 1: launch the installed app in a helper tab — this page stays untouched
    let helper = null;
    try { helper = window.open(appUrl, '_blank'); } catch (e) { helper = null; }

    if (helper) {
      // show our own friendly screen in that tab while the browser asks permission
      try {
        helper.document.open();
        helper.document.write(HELPER_SCREEN);
        helper.document.close();
      } catch (e) { /* the browser already moved on */ }

      let launched = false;
      const onLaunch = () => {
        launched = true;
        hintDone();                                                  // hide the hint from now on
        setTimeout(() => { try { helper.close(); } catch (e) {} }, 1200);  // app has it now
      };
      window.addEventListener('blur', onLaunch, { once: true });

      // no launch within 6s (blocked / declined / app missing) → the helper tab
      // becomes the WhatsApp *web* chat: a working chat, never a download page
      setTimeout(() => {
        window.removeEventListener('blur', onLaunch);
        if (launched) return;
        try {
          if (helper.closed) return;          // visitor closed it on purpose — leave them alone
          helper.location = chatUrl;          // navigating another tab is allowed cross-origin
        } catch (e) { location.href = chatUrl; }
      }, 6000);
      return waUrl;
    }

    // desktop attempt 2: window.open to whatsapp:// was refused (strict popup
    // settings) → launch the app from THIS tab. If the launch is refused the
    // navigation aborts and the page simply stays; only then we open the browser chat.
    let launched = false;
    const onLaunch = () => {
      launched = true;
      hintDone();
    };
    window.addEventListener('blur', onLaunch, { once: true });
    setTimeout(() => {
      window.removeEventListener('blur', onLaunch);
      if (!launched) location.href = chatUrl;   // working chat, never a download page
    }, 6000);
    location.href = appUrl;
    return waUrl;
  }

  /* ------------------------------------------------ misc */
  function todayISO() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
      return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return iso; }
  }

  function timeSlots() {
    const out = [];
    for (let h = 10; h <= 20; h++) { out.push(String(h).padStart(2, '0') + ':00'); if (h < 20) out.push(String(h).padStart(2, '0') + ':30'); }
    return out;
  }

  return {
    toast, money, guard, mountNav, initChrome, revealIn, escapeHtml,
    waLink, buildBookingMessage, openWhatsApp,
    todayISO, formatDate, timeSlots
  };
})();
