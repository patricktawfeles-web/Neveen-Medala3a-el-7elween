/* ============================================================
   app.js — services, bundles, live calculator, shades, FAQ, booking
   ============================================================ */
(function () {
  const C = window.APP_CONFIG;
  const CAT = window.CATALOG;

  /* state ------------------------------------------------------ */
  const state = { selected: new Set(), bundle: null, shadeFilter: 'All' };
  const byId = id => CAT.itemById(id);
  const inBundle = id => state.bundle && state.bundle.items.indexOf(id) !== -1;

  /* =========================== RENDER: services =========================== */
  function renderServices() {
    const el = document.getElementById('services-grid');
    el.innerHTML = CAT.categories.map((c, ci) => `
      <div class="glass glass-hover cat-card reveal d${(ci % 4) + 1}">
        <div class="cat-head">
          <div class="cat-ico">${c.icon}</div>
          <div><h3>${c.name}</h3><div class="ar">${c.nameAr}</div></div>
        </div>
        <div class="svc-list">
          ${c.items.map(i => `
            <div class="svc" data-add="${i.id}" role="button" tabindex="0" title="Add to my package">
              <div>
                <b>${i.name}</b>
                <i>${i.nameAr}</i>
                ${i.blurb ? `<small>${i.blurb}</small>` : ''}
              </div>
              <div class="price">${i.priceLabel || i.price}${i.unit === 'per nail' ? '<small>/nail</small>' : i.unit === 'set' ? '<small>/set</small>' : ''}</div>
            </div>`).join('')}
        </div>
        <button class="svc-add" type="button" data-addcat="${c.id}">＋ Add all to calculator</button>
      </div>`).join('');

    el.querySelectorAll('[data-add]').forEach(n => {
      const act = () => { toggleItem(n.dataset.add, true); jump('#calculator'); };
      n.addEventListener('click', act);
      n.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
    });
    el.querySelectorAll('[data-addcat]').forEach(b => {
      b.addEventListener('click', () => {
        const cat = CAT.categories.find(c => c.id === b.dataset.addcat);
        cat.items.forEach(i => state.selected.add(i.id));
        keepBundle();
        syncCalc();
        UI.toast(cat.name + ' added to your package ✨', 'success');
        jump('#calculator');
      });
    });
  }

  /* =========================== RENDER: bundles =========================== */
  function renderBundles() {
    const el = document.getElementById('bundles-grid');
    el.innerHTML = CAT.bundles.map((b, i) => {
      const worth = b.items.reduce((s, id) => s + (byId(id) ? byId(id).price : 0), 0);
      b.worth = worth;
      return `
      <div class="glass glass-hover bundle ${i === 0 ? 'featured' : ''} reveal d${i + 1}">
        ${i === 0 ? '<div class="ribbon">Most loved</div>' : ''}
        <div class="emo">${b.emoji}</div>
        <h3>${b.name}</h3>
        <div class="ar">${b.nameAr}</div>
        <div class="tag">${b.tag}</div>
        <div class="bundle-price"><b>${b.price.toLocaleString('en-US')}</b><span>EGP</span><s>${worth.toLocaleString('en-US')} EGP</s></div>
        <ul>${b.items.map(id => `<li>${byId(id).name}</li>`).join('')}</ul>
        <button class="btn ${i === 0 ? 'btn-neon' : 'btn-outline'}" type="button" data-bundle="${b.id}">Load this package ✦</button>
      </div>`;
    }).join('');

    el.querySelectorAll('[data-bundle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const b = CAT.bundles.find(x => x.id === btn.dataset.bundle);
        state.bundle = b;
        state.selected = new Set(b.items);
        syncCalc();
        UI.toast(b.name + ' loaded — ' + UI.money(b.price) + ' 🎀', 'success');
        jump('#calculator');
      });
    });
  }

  /* =========================== RENDER: calculator ======================== */
  function renderCalc() {
    const el = document.getElementById('calc-services');
    el.innerHTML = CAT.categories.map((c, ci) => `
      <div class="glass calc-group reveal d${(ci % 3) + 1}">
        <h3>${c.icon} ${c.name} <span class="ar">${c.nameAr}</span></h3>
        <div class="opt-grid">
          ${c.items.map(i => `
            <label class="opt" data-opt="${i.id}">
              <input type="checkbox" value="${i.id}">
              <div class="txt"><b>${i.name}</b><i>${i.nameAr}</i></div>
              <span class="amt">${i.priceLabel || i.price}${i.unit === 'per nail' ? '<small style="font-size:11px">/n</small>' : ''}</span>
              <span class="tick">✓</span>
            </label>`).join('')}
        </div>
      </div>`).join('');

    el.querySelectorAll('.opt input').forEach(inp => {
      inp.addEventListener('change', () => toggleItem(inp.value, inp.checked));
    });
  }

  function toggleItem(id, on) {
    if (on) {
      state.selected.add(id);
      // extras can be added on top of a bundle; the bundle survives as long as its own services stay selected
      keepBundle();
    } else {
      state.selected.delete(id);
      if (state.bundle && inBundle(id)) { state.bundle = null; UI.toast('Bundle removed — back to custom pricing', 'info'); }
    }
    syncCalc();
  }

  function hasBundleItems() { return state.bundle && state.bundle.items.every(id => state.selected.has(id)); }

  function keepBundle() {
    // bundle stays only while ALL of its services are still selected
    if (!state.bundle) return;
    if (!state.bundle.items.every(id => state.selected.has(id))) state.bundle = null;
  }

  /* =========================== PRICE ENGINE ============================= */
  function price() {
    const items = Array.from(state.selected).map(byId).filter(Boolean);
    const subtotal = items.reduce((s, i) => s + i.price, 0);

    let bundleSaving = 0, extras = subtotal, discount = 0;
    if (state.bundle) {
      const worth = state.bundle.worth || state.bundle.items.reduce((s, id) => s + byId(id).price, 0);
      bundleSaving = Math.max(0, worth - state.bundle.price);
      extras = subtotal - worth;
    }
    if (items.length >= C.discountThreshold && extras > 0) {
      discount = Math.round(extras * C.discountRate);
    }
    const total = Math.max(0, subtotal - bundleSaving - discount);
    return { items, subtotal, bundleSaving, discount, total, count: items.length };
  }

  /* =========================== SYNC UI ================================== */
  function syncCalc() {
    keepBundle();

    // checkboxes
    document.querySelectorAll('.opt').forEach(o => {
      const on = state.selected.has(o.dataset.opt);
      o.classList.toggle('on', on);
      const inp = o.querySelector('input');
      if (inp.checked !== on) inp.checked = on;
    });

    const p = price();

    // summary list
    const list = document.getElementById('sum-list');
    list.innerHTML = p.items.length
      ? p.items.map(i => `<div class="sum-item"><span>${i.name}</span><span>${UI.money(i.price)}</span></div>`).join('')
      : '<div class="sum-empty"><span>💅</span>Pick services to see your price live</div>';

    document.getElementById('sum-count').textContent = p.count + (p.count === 1 ? ' service' : ' services');
    document.getElementById('sum-subtotal').textContent = UI.money(p.subtotal);
    document.getElementById('sum-total').textContent = UI.money(p.total);

    const rowB = document.getElementById('row-bundle');
    rowB.hidden = p.bundleSaving <= 0;
    document.getElementById('sum-bundle').textContent = '− ' + UI.money(p.bundleSaving);

    const rowD = document.getElementById('row-discount');
    rowD.hidden = p.discount <= 0;
    document.getElementById('sum-discount').textContent = '− ' + UI.money(p.discount);

    // bundle flag
    const flag = document.getElementById('bundle-flag');
    flag.classList.toggle('on', !!state.bundle);
    if (state.bundle) document.getElementById('bundle-flag-name').textContent = state.bundle.name;

    // progress note toward 10% off
    const note = document.getElementById('progress-note');
    if (p.count === 0) note.innerHTML = `Pick <b>${C.discountThreshold}</b> services and unlock <b>10% off</b> · خصم 10% عند 3 خدمات`;
    else if (p.count < C.discountThreshold) note.innerHTML = `Add <b>${C.discountThreshold - p.count}</b> more to unlock <b>10% off</b> · ضيفي ${C.discountThreshold - p.count} خدمات كمان`;
    else if (p.discount > 0) note.innerHTML = `🎉 <b>10% discount unlocked!</b> · تم تفعيل الخصم`;
    else note.innerHTML = `🎀 Bundle price applied — best value!`;

    // booking list
    const bk = document.getElementById('bk-services');
    if (bk) {
      bk.innerHTML = p.items.length
        ? p.items.map(i => `<div class="sum-item"><span>${i.name}</span><span>${UI.money(i.price)}</span></div>`).join('')
        : 'Nothing selected yet — build your package in the <a href="#calculator" style="color:var(--pink-2);font-weight:700">calculator</a> above. · اختاري خدماتك من الحاسبة';
      bk.classList.toggle('sum-empty', p.items.length === 0);
    }

    // sticky bar
    const sticky = document.getElementById('sticky-total');
    if (sticky) {
      sticky.classList.toggle('show', p.count > 0);
      document.body.classList.toggle('has-sticky', p.count > 0);
      document.getElementById('st-total').textContent = UI.money(p.total);
      const saved = p.bundleSaving + p.discount;
      document.getElementById('st-save').textContent = saved > 0 ? '· you save ' + UI.money(saved) : '';
    }

    updatePreview();
  }

  /* =========================== SHADES =================================== */
  function renderShadeFilters() {
    const el = document.getElementById('shade-filters');
    el.innerHTML = CAT.shadeCategories.map(c =>
      `<button class="f-chip ${c === state.shadeFilter ? 'on' : ''}" type="button" data-f="${c}">${c}${c === 'All' ? '' : ''}</button>`
    ).join('');
    el.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => {
      state.shadeFilter = b.dataset.f;
      renderShadeFilters();
      renderShades();
    }));
  }

  function renderShades() {
    const el = document.getElementById('shade-grid');
    const favs = DB.favoriteShades().map(f => f.id);
    const list = CAT.shades.filter(s => state.shadeFilter === 'All' || s.cat === state.shadeFilter);
    el.innerHTML = list.map((s, i) => `
      <div class="shade ${favs.indexOf(s.id) !== -1 ? 'saved' : ''} reveal d${(i % 5) + 1}" data-shade="${s.id}">
        <span class="heart">${favs.indexOf(s.id) !== -1 ? '♥' : '♡'}</span>
        <div class="shade-dot" style="background:${s.css || s.color}"></div>
        <b>${s.name}</b><i>${s.nameAr}</i>
        <span class="cat">${s.cat}</span>
      </div>`).join('');

    el.querySelectorAll('[data-shade]').forEach(n => n.addEventListener('click', async () => {
      const s = CAT.shades.find(x => x.id === n.dataset.shade);
      const { data, error } = await DB.toggleShade(s);
      if (error) return UI.toast(error, 'error');
      n.classList.toggle('saved', data.saved);
      n.querySelector('.heart').textContent = data.saved ? '♥' : '♡';
      UI.toast(data.saved ? s.name + ' saved to My Glam Space ♥' : s.name + ' removed', data.saved ? 'success' : 'info');
      renderShadeSelect();
    }));

    // freshly rendered tiles must be watched too, otherwise they stay invisible
    UI.revealIn(el);
  }

  function renderShadeSelect() {
    const sel = document.getElementById('bk-shade');
    if (!sel) return;
    const current = sel.value;
    const favs = DB.favoriteShades();
    sel.innerHTML = '<option value="">No preference</option>' +
      (favs.length ? '<optgroup label="♥ My saved shades">' + favs.map(f => `<option value="${escapeAttr(f.name)}">${f.name}</option>`).join('') + '</optgroup>' : '') +
      '<optgroup label="Full shade library">' + CAT.shades.map(s => `<option value="${escapeAttr(s.name)}">${s.name} · ${s.cat}</option>`).join('') + '</optgroup>';
    sel.value = current || '';
  }

  function escapeAttr(s) { return String(s).replace(/"/g, '&quot;'); }

  /* =========================== FAQ ====================================== */
  function initFaq() {
    document.querySelectorAll('.faq').forEach(f => {
      const q = f.querySelector('.faq-q'), a = f.querySelector('.faq-a');
      q.addEventListener('click', () => {
        const open = f.classList.contains('open');
        document.querySelectorAll('.faq.open').forEach(o => { o.classList.remove('open'); o.querySelector('.faq-a').style.maxHeight = null; });
        if (!open) { f.classList.add('open'); a.style.maxHeight = a.scrollHeight + 'px'; }
      });
    });
  }

  /* =========================== BOOKING ================================== */
  function fillBooking() {
    const date = document.getElementById('bk-date');
    date.min = UI.todayISO();
    date.value = UI.todayISO();

    const time = document.getElementById('bk-time');
    time.innerHTML = '<option value="">Choose a slot…</option>' + UI.timeSlots().map(t => `<option>${t}</option>`).join('');

    DB.getProfile().then(({ data }) => {
      if (!data) return;
      if (!document.getElementById('bk-name').value) document.getElementById('bk-name').value = data.fullName || '';
      if (!document.getElementById('bk-phone').value) document.getElementById('bk-phone').value = data.phone || '';
      updatePreview();
    });

    ['bk-name', 'bk-phone', 'bk-date', 'bk-time', 'bk-shade', 'bk-notes'].forEach(id => {
      const el = document.getElementById(id);
      el.addEventListener('input', updatePreview);
      el.addEventListener('change', updatePreview);
    });
    renderShadeSelect();
    updatePreview();
  }

  function bookingPayload() {
    const p = price();
    return {
      name: document.getElementById('bk-name').value.trim(),
      phone: document.getElementById('bk-phone').value.trim(),
      date: document.getElementById('bk-date').value,
      time: document.getElementById('bk-time').value,
      shade: document.getElementById('bk-shade').value,
      notes: document.getElementById('bk-notes').value.trim(),
      services: p.items.map(i => ({ id: i.id, name: i.name, nameAr: i.nameAr, price: i.price })),
      subtotal: p.subtotal,
      discount: p.discount + p.bundleSaving,
      discountRate: C.discountRate,
      total: p.total,
      discountReason: state.bundle
        ? 'Bundle: ' + state.bundle.name + (p.discount > 0 ? ' + loyalty 10%' : '')
        : (p.discount > 0 ? 'Loyalty 10% (3+ services)' : null),
      bundleName: state.bundle ? state.bundle.name : ''
    };
  }

  function updatePreview() {
    const pre = document.getElementById('wa-preview');
    if (!pre) return;
    const b = bookingPayload();
    if (!b.services.length && !b.name && !b.date) {
      pre.textContent = UI.buildBookingMessage({ name: '—', phone: '—', services: [], subtotal: 0, discount: 0, total: 0 });
      return;
    }
    pre.textContent = UI.buildBookingMessage(b);
  }

  function initBooking() {
    const form = document.getElementById('book-form');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const b = bookingPayload();
      if (b.name.length < 2) return UI.toast('Please write your full name. · اكتبي اسمك', 'error');
      if (!/^[0-9+\s()-]{8,}$/.test(b.phone)) return UI.toast('Please enter a valid phone number. · اكتبي رقم الموبايل', 'error');
      if (!b.date) return UI.toast('Please choose your preferred date. · اختاري التاريخ', 'error');
      if (!b.time) return UI.toast('Please choose a time slot. · اختاري الوقت', 'error');
      if (!b.services.length) return UI.toast('Pick at least one service first in the calculator 💅', 'error');

      const btn = document.getElementById('bk-submit');
      const old = btn.textContent;
      btn.textContent = 'Sending to Neven…';
      btn.disabled = true;

      const { error } = await DB.addBooking({
        services: b.services, subtotal: b.subtotal, discount: b.discount,
        total: b.total, date: b.date, time: b.time, notes: b.notes,
        discountReason: b.discountReason
      });
      if (error) UI.toast('Saved locally, but: ' + error, 'info');

      const msg = UI.buildBookingMessage(b);
      const link = UI.openWhatsApp(msg);

      btn.textContent = old;
      btn.disabled = false;

      document.getElementById('success-open').href = link;
      document.getElementById('book-form-card').style.display = 'none';
      document.getElementById('book-success').classList.add('show');
      document.getElementById('book-success').scrollIntoView({ behavior: 'smooth', block: 'center' });
      UI.toast('Booking sent to Neven on WhatsApp 💖', 'success');
    });

    document.getElementById('success-again').addEventListener('click', () => {
      document.getElementById('book-success').classList.remove('show');
      document.getElementById('book-form-card').style.display = '';
      document.getElementById('book-form-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  /* =========================== SUMMARY ACTIONS ========================== */
  function initSummary() {
    document.getElementById('btn-book').addEventListener('click', () => {
      if (!state.selected.size) return UI.toast('Pick your services first 💅', 'error');
      jump('#book');
      setTimeout(() => document.getElementById('bk-name').focus({ preventScroll: true }), 700);
    });

    document.getElementById('st-book').addEventListener('click', () => {
      jump('#book');
      setTimeout(() => document.getElementById('bk-name').focus({ preventScroll: true }), 700);
    });

    document.getElementById('btn-save').addEventListener('click', async () => {
      const p = price();
      if (!p.count) return UI.toast('Nothing to save yet — pick some services ✨', 'error');
      const name = 'My Glam Package · ' + p.count + ' service' + (p.count > 1 ? 's' : '');
      const { data, error } = await DB.addPackage({
        name: name,
        items: p.items.map(i => ({ id: i.id, name: i.name, price: i.price })),
        subtotal: p.subtotal, discount: p.bundleSaving + p.discount, total: p.total
      });
      if (error) return UI.toast(error, 'error');
      UI.toast('Saved to My Glam Space 💾 (see your dashboard)', 'success');
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
      state.selected.clear();
      state.bundle = null;
      syncCalc();
      UI.toast('Selection cleared', 'info');
    });

    document.querySelector('[data-clear-bundle]').addEventListener('click', () => {
      state.bundle = null;
      syncCalc();
      UI.toast('Bundle removed', 'info');
    });
  }

  /* =========================== BOOT: DATABASE CATALOG =================== */
  async function mergeRemoteCatalog() {
    try {
      const remote = await DB.loadCatalog();
      if (!remote || !remote.categories || !remote.categories.length) return;
      CAT.categories = remote.categories;
      if (remote.shades && remote.shades.length) CAT.shades = remote.shades;
      if (remote.bundles && remote.bundles.length) CAT.bundles = remote.bundles;
    } catch (e) { /* offline → keep the built-in catalog */ }
  }

  /* =========================== HELPERS ================================== */
  function jump(sel) {
    const t = document.querySelector(sel);
    if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* =========================== BOOT ===================================== */
  async function boot() {
    const session = await UI.guard();
    if (!session) return;

    await mergeRemoteCatalog();

    renderServices();
    renderBundles();
    renderCalc();
    renderShadeFilters();
    renderShades();

    // prefill sent from a saved package in My Glam Space
    try {
      const pre = sessionStorage.getItem('nmh:prefill');
      if (pre) {
        JSON.parse(pre).forEach(i => { if (i && i.id && byId(i.id)) state.selected.add(i.id); });
        keepBundle();
        sessionStorage.removeItem('nmh:prefill');
        if (state.selected.size) UI.toast('Package loaded — review and book 💖', 'success');
      }
    } catch (e) {}

    syncCalc();
    fillBooking();
    initFaq();
    initBooking();
    initSummary();

    UI.initChrome();
    UI.mountNav();

    // duplicate marquee content for a seamless loop
    const m = document.getElementById('marquee');
    if (m) m.innerHTML += m.innerHTML;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
