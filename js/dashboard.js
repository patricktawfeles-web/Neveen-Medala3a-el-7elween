/* ============================================================
   dashboard.js — My Glam Space
   ============================================================ */
(function () {
  const C = window.APP_CONFIG;
  const esc = UI.escapeHtml;

  /* ---------------------------------------------------- stats */
  async function loadStats(profile, bookings, packages, shades) {
    document.getElementById('st-bookings').textContent = bookings.length;

    const spent = bookings.reduce((s, b) => s + (Number(b.total) || 0), 0);
    document.getElementById('st-spent').textContent = Math.round(spent).toLocaleString('en-US');

    const points = (profile && profile.points) || 0;
    document.getElementById('st-points').textContent = points.toLocaleString('en-US');

    document.getElementById('st-saved').textContent = packages.length + shades.length;

    // loyalty tier
    let tier = C.tiers[0], next = C.tiers[1] || null;
    for (let i = 0; i < C.tiers.length; i++) if (points >= C.tiers[i].min) tier = C.tiers[i];
    const idx = C.tiers.indexOf(tier);
    next = C.tiers[idx + 1] || null;

    const line = document.getElementById('tier-line');
    const fill = document.getElementById('tier-fill');
    if (next) {
      const span = next.min - tier.min;
      const done = points - tier.min;
      const pct = Math.max(4, Math.min(100, Math.round((done / span) * 100)));
      line.innerHTML = `<b style="color:var(--gold-2)">${tier.name}</b> · ${(next.min - points)} pts to <b style="color:var(--pink-2)">${next.name}</b>`;
      setTimeout(() => { fill.style.width = pct + '%'; }, 250);
    } else {
      line.innerHTML = `<b style="color:var(--gold-2)">${tier.name}</b> — top tier reached 👑`;
      fill.style.width = '100%';
    }
  }

  /* ---------------------------------------------------- bookings */
  function renderBookings(list) {
    const el = document.getElementById('list-bookings');
    if (!list.length) {
      el.innerHTML = emptyCard('📅', 'No bookings yet',
        'Your appointments with Neven will appear here. Ready for a fresh set?',
        'Book my first appointment', 'index.html#book');
      return;
    }
    el.innerHTML = list.map(b => {
      const services = Array.isArray(b.services) ? b.services : [];
      const status = (b.status || 'pending').toLowerCase();
      return `
      <div class="glass row-card reveal">
        <div class="main">
          <b>${services.length ? esc(services.map(s => s.name).join(' + ')) : 'Studio appointment'}</b>
          <div class="meta">
            <span>${UI.formatDate(b.appointment_date || b.date)}</span>
            <span>${esc(b.appointment_time || b.time || 'time TBC')}</span>
            <span>${services.length} service${services.length === 1 ? '' : 's'}</span>
            ${b.notes ? '<span>' + esc(String(b.notes).slice(0, 60)) + '</span>' : ''}
          </div>
        </div>
        <div class="side">
          <span class="tag-st st-${status}">${status}</span>
          <b style="font-family:var(--display);font-size:26px;background:linear-gradient(90deg,var(--pink-2),var(--gold));-webkit-background-clip:text;background-clip:text;color:transparent">${UI.money(b.total)}</b>
          <a class="btn btn-ghost btn-sm" target="_blank" rel="noopener"
             href="${UI.waLink(UI.buildBookingMessage({
               name: (profileCache && profileCache.fullName) || '',
               phone: (profileCache && profileCache.phone) || '',
               services: services, subtotal: b.subtotal, discount: b.discount, total: b.total,
               date: b.appointment_date || b.date, time: b.appointment_time || b.time, notes: b.notes
             }))}">💬 Follow up</a>
        </div>
      </div>`;
    }).join('');
  }

  /* ---------------------------------------------------- packages */
  function renderPackages(list) {
    const el = document.getElementById('list-packages');
    if (!list.length) {
      el.innerHTML = emptyCard('🎀', 'No saved packages yet',
        'Use the live calculator to build your own bundle, then save it with one tap.',
        'Open the calculator', 'index.html#calculator');
      return;
    }
    el.innerHTML = list.map(p => {
      const items = Array.isArray(p.items) ? p.items : [];
      return `
      <div class="glass row-card reveal">
        <div class="main">
          <b>${esc(p.name || 'Custom package')}</b>
          <div class="pkg-items">${items.map(i => esc(i.name)).join(' · ') || '—'}</div>
          <div class="meta">
            <span>Subtotal ${UI.money(p.subtotal)}</span>
            ${Number(p.discount) > 0 ? '<span>You saved ' + UI.money(p.discount) + '</span>' : ''}
            <span>${UI.formatDate((p.created_at || '').slice(0, 10))}</span>
          </div>
        </div>
        <div class="side">
          <b style="font-family:var(--display);font-size:26px;background:linear-gradient(90deg,var(--pink-2),var(--gold));-webkit-background-clip:text;background-clip:text;color:transparent">${UI.money(p.total)}</b>
          <button class="btn btn-neon btn-sm" data-book-pkg="${p.id}">Book this</button>
          <button class="btn btn-ghost btn-sm" data-del-pkg="${p.id}">Remove</button>
        </div>
      </div>`;
    }).join('');

    el.querySelectorAll('[data-book-pkg]').forEach(btn => btn.addEventListener('click', () => {
      const p = list.find(x => String(x.id) === btn.dataset.bookPkg);
      const items = (p && p.items) || [];
      sessionStorage.setItem('nmh:prefill', JSON.stringify(items));
      location.href = 'index.html#calculator';
    }));

    el.querySelectorAll('[data-del-pkg]').forEach(btn => btn.addEventListener('click', async () => {
      const { error } = await DB.removePackage(btn.dataset.delPkg);
      if (error) return UI.toast(error, 'error');
      UI.toast('Package removed', 'info');
      refresh();
    }));
  }

  /* ---------------------------------------------------- shades */
  function renderShades(list) {
    const el = document.getElementById('list-shades');
    if (!list.length) {
      el.innerHTML = `<div class="empty" style="padding:36px 10px;width:100%">
        <div class="ic">🎨</div>
        <h4>No shades saved yet</h4>
        <p>Explore the shade library and tap ♥ on the colours you love.</p>
        <a class="btn btn-outline" href="index.html#shades">Browse shades</a>
      </div>`;
      return;
    }
    el.innerHTML = list.map(s => `
      <div class="mini-shade">
        <div class="dot" style="background:${s.color}"></div>
        <b>${esc(s.name)}</b>
        <button type="button" data-unshade="${esc(s.id)}">remove</button>
      </div>`).join('');

    el.querySelectorAll('[data-unshade]').forEach(btn => btn.addEventListener('click', async () => {
      const s = list.find(x => String(x.id) === btn.dataset.unshade);
      if (!s) return;
      await DB.toggleShade({ id: s.id, name: s.name, color: s.color, cat: s.cat });
      UI.toast('Shade removed', 'info');
      refresh();
    }));
  }

  function emptyCard(ic, title, text, btn, href) {
    return `<div class="glass empty">
      <div class="ic">${ic}</div>
      <h4>${title}</h4><p>${text}</p>
      <a class="btn btn-neon" href="${href}">${btn}</a>
    </div>`;
  }

  /* ---------------------------------------------------- profile */
  function fillProfile(profile) {
    document.getElementById('pf-email').value = DB.getSession().email;
    document.getElementById('pf-name').value = profile.fullName || '';
    document.getElementById('pf-phone').value = profile.phone || '';
    document.getElementById('pf-mode').textContent =
      DB.mode === 'server' ? 'Local database on this computer (server/data/studio.db)'
      : DB.mode === 'cloud' ? 'Supabase cloud database (live)'
      : 'Demo mode — this browser only. Run start.bat for the real database.';
  }

  function initProfile() {
    document.getElementById('pf-save').addEventListener('click', async () => {
      const fullName = document.getElementById('pf-name').value.trim();
      const phone = document.getElementById('pf-phone').value.trim();
      const btn = document.getElementById('pf-save');
      btn.disabled = true; btn.textContent = 'Saving…';
      const { error } = await DB.updateProfile({ fullName, phone });
      btn.disabled = false; btn.textContent = 'Save changes';
      if (error) return UI.toast(error, 'error');
      UI.toast('Profile updated ✓', 'success');
      UI.mountNav();
      document.getElementById('dash-name').textContent = fullName.split(' ')[0] || 'Gorgeous';
    });

    document.getElementById('pf-out').addEventListener('click', async () => {
      await DB.signOut();
      UI.toast('Signed out. See you soon! ✨', 'success');
      setTimeout(() => location.replace('auth.html'), 500);
    });

    document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === t));
      document.querySelectorAll('.panel').forEach(p => p.classList.toggle('on', p.id === 'panel-' + t.dataset.panel));
      document.querySelectorAll('#panel-' + t.dataset.panel + ' .reveal').forEach(r => r.classList.add('revealed'));
    }));
  }

  /* ---------------------------------------------------- refresh */
  let profileCache = null;

  async function refresh() {
    const { data: profile } = await DB.getProfile();
    profileCache = profile || { fullName: '', phone: '', points: 0, favorite_shades: [] };

    const [bk, pk] = await Promise.all([DB.listBookings(), DB.listPackages()]);
    const shades = profileCache.favorite_shades || [];

    const name = (profileCache.fullName || '').split(' ')[0];
    document.getElementById('dash-name').textContent = name || (DB.getSession().email.split('@')[0]) || 'Gorgeous';

    await loadStats(profileCache, bk.data || [], pk.data || [], shades);
    renderBookings(bk.data || []);
    renderPackages(pk.data || []);
    renderShades(shades);
    fillProfile(profileCache);
    renderShadeSelectOnDash(shades);
    await loadOwner();

    document.querySelectorAll('.reveal').forEach(r => r.classList.add('revealed'));
  }

  function renderShadeSelectOnDash(shades) {
    // nothing to select here; kept for future use
  }

  /* ---------------------------------------------------- owner view */
  async function loadOwner() {
    const tab = document.getElementById('tab-owner');
    const isOwner = !!(profileCache && profileCache.role === 'owner');
    tab.hidden = !isOwner;
    if (!isOwner) return;

    const { data, error } = await DB.listAllBookings();
    if (error) return UI.toast(error, 'error');
    const rows = data || [];
    const today = UI.todayISO();
    const month = today.slice(0, 7);
    const active = rows.filter(b => b.status !== 'cancelled');
    const d = iso => String(iso || '').slice(0, 10);
    const monthRows = active.filter(b => d(b.appointment_date).slice(0, 7) === month);

    document.getElementById('kpi-today').textContent = active.filter(b => d(b.appointment_date) === today).length;
    document.getElementById('kpi-month').textContent = monthRows.length;
    document.getElementById('kpi-revenue').textContent =
      Math.round(monthRows.reduce((s, b) => s + (Number(b.total) || 0), 0)).toLocaleString('en-US');
    document.getElementById('kpi-clients').textContent =
      new Set(rows.map(b => b.client_email || b.client_name || '?')).size;

    renderAllBookings(rows);
  }

  function renderAllBookings(rows) {
    const el = document.getElementById('list-all-bookings');
    if (!rows.length) {
      el.innerHTML = emptyCard('👑', 'No bookings yet',
        'As soon as a client books, the appointment appears here instantly.',
        'Book a demo appointment', 'index.html#book');
      return;
    }
    const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
    el.innerHTML = rows.map(b => `
      <div class="glass row-card reveal">
        <div class="main">
          <b>${esc(b.client_name || 'Client')}</b>
          <span style="color:var(--muted-2);font-weight:500;font-size:13px;margin-left:8px">${esc(b.reference || '')}</span>
          <div class="meta">
            <span>${UI.formatDate(b.appointment_date)}</span>
            <span>${esc(b.appointment_time || 'time TBC')}</span>
            <span>${esc(b.client_phone || '—')}</span>
            <span>${esc(b.client_email || '—')}</span>
            ${b.discount_reason ? '<span>' + esc(b.discount_reason) + '</span>' : ''}
          </div>
          <div class="pkg-items">${(b.services || []).map(s => esc(s.name)).join(' · ') || '—'}</div>
        </div>
        <div class="side">
          <b style="font-family:var(--display);font-size:26px;background:linear-gradient(90deg,var(--pink-2),var(--gold));-webkit-background-clip:text;background-clip:text;color:transparent">${UI.money(b.total)}</b>
          <select class="status-sel" data-id="${esc(b.id)}" aria-label="Booking status">
            ${STATUSES.map(s => `<option value="${s}" ${String(b.status) === s ? 'selected' : ''}>${s.replace('_', ' ')}</option>`).join('')}
          </select>
          <a class="btn btn-ghost btn-sm" target="_blank" rel="noopener"
             href="${UI.waLink(UI.buildBookingMessage({
               name: b.client_name || '', phone: b.client_phone || '',
               services: b.services || [], subtotal: b.subtotal, discount: b.discount_amount, total: b.total,
               date: b.appointment_date, time: b.appointment_time, notes: b.notes
             }))}">💬 Chat</a>
        </div>
      </div>`).join('');

    el.querySelectorAll('.status-sel').forEach(sel => sel.addEventListener('change', async () => {
      const btn = sel;
      btn.disabled = true;
      const { error } = await DB.updateBookingStatus(btn.dataset.id, btn.value);
      btn.disabled = false;
      if (error) return UI.toast(error, 'error');
      UI.toast('Booking marked "' + btn.value.replace('_', ' ') + '" ✓', 'success');
    }));
  }

  /* ---------------------------------------------------- boot */
  async function boot() {
    const session = await UI.guard();
    if (!session) return;

    UI.initChrome();
    UI.mountNav();
    initProfile();
    await refresh();

    const m = document.getElementById('marquee');
    if (m) m.innerHTML += m.innerHTML;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
