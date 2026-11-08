/* ============================================================
   DB — data layer
     · server  → real SQLite database running on this computer
     · cloud   → Supabase / PostgreSQL (supabase/schema.sql)
     · local   → instant demo accounts stored in this browser
   Every method resolves to { data, error }
   ============================================================ */
window.DB = (function () {
  const C = window.APP_CONFIG;
  const hasCloud = !!C.supabaseUrl && !/^YOUR_/.test(C.supabaseUrl) &&
                   !!C.supabaseAnonKey && !/^YOUR_/.test(C.supabaseAnonKey);

  let MODE = C.db === 'supabase' ? (hasCloud ? 'cloud' : 'local')
           : C.db === 'server'  ? 'server'
           : hasCloud           ? 'cloud'
           : 'local';

  const BASE = String(C.serverUrl || '').replace(/\/+$/, '');
  const isServer = () => MODE === 'server';
  const isCloud = () => MODE === 'cloud';

  const K_USERS = 'nmh:users';
  const K_SESSION = 'nmh:session';
  const dataKey = email => 'nmh:data:' + String(email).toLowerCase();

  const store = {
    get(k, f) { try { const v = localStorage.getItem(k); return v === null ? f : JSON.parse(v); } catch (e) { return f; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return 'h' + h.toString(36) + '_' + s.length; };
  const norm = e => String(e || '').trim().toLowerCase();
  const firstError = e => (e && (e.message || e.error_description || e.error)) || 'Something went wrong. Please try again.';
  const num = v => Number(v) || 0;

  let client = null;      // supabase client (cloud mode)
  let session = null;     // { email, fullName }
  let profile = null;     // current profile
  let favorites = [];     // [{id,name,color,cat}]

  /* ====================================================== SERVER API ==== */
  async function api(method, path, body) {
    let res;
    try {
      res = await fetch(BASE + path, {
        method: method,
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch (e) {
      return { data: null, error: 'Cannot reach the local database. Run start.bat first.' };
    }
    let json = null;
    try { json = await res.json(); } catch (e) {}
    if (!json) return { data: null, error: 'The database gave an unexpected answer. Please try again.' };
    if (json.error) return { data: null, error: json.error, status: res.status };
    return { data: json.data, error: null, status: res.status };
  }

  function adoptProfile(p) {
    if (!p) return;
    profile = {
      fullName: p.fullName || '',
      phone: p.phone || '',
      email: p.email || '',
      role: p.role || 'client',
      points: num(p.points),
      lifetimeSpent: num(p.lifetimeSpent),
      favorite_shades: Array.isArray(p.favorite_shades) ? p.favorite_shades : []
    };
    favorites = profile.favorite_shades.slice();
    if (profile.fullName || profile.email) {
      session = { email: profile.email, fullName: profile.fullName };
    }
  }

  /* ========================================================== LOCAL ===== */
  function localData(email) {
    const key = dataKey(email);
    let d = store.get(key, null);
    if (!d) {
      d = {
        profile: { fullName: '', phone: '', points: 0, lifetimeSpent: 0, role: 'client', favorite_shades: [] },
        bookings: [], packages: []
      };
      store.set(key, d);
    }
    d.profile = d.profile || {};
    d.profile.fullName = d.profile.fullName || '';
    d.profile.phone = d.profile.phone || '';
    d.profile.points = d.profile.points || 0;
    d.profile.lifetimeSpent = d.profile.lifetimeSpent || 0;
    d.profile.role = d.profile.role || 'client';
    d.profile.favorite_shades = d.profile.favorite_shades || [];
    d.bookings = d.bookings || [];
    d.packages = d.packages || [];
    return d;
  }
  const saveLocalData = (email, d) => store.set(dataKey(email), d);

  function adoptLocal(email) {
    const d = localData(email);
    session = { email: email, fullName: d.profile.fullName || '' };
    profile = d.profile;
    favorites = d.profile.favorite_shades.slice();
    profile.favorite_shades = favorites.slice();
  }

  /* ====================================================== INIT ========== */
  async function init() {
    /* --- try the local server first ---------------------------------- */
    if (MODE === 'server') {
      const probe = await api('GET', '/api/health');
      if (probe.data && probe.data.ok) {
        try {
          const s = await api('GET', '/api/auth/session');
          if (s.data && s.data.session) adoptProfile(s.data.profile);
        } catch (e) { /* not signed in */ }
        return { data: session, error: null };
      }
      MODE = 'local';     // server not running → demo mode keeps the site usable
    }

    /* --- cloud (Supabase) --------------------------------------------- */
    if (MODE === 'cloud') {
      try {
        if (!window.supabase || !window.supabase.createClient) throw new Error('Supabase library failed to load.');
        client = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey);
        await applyStudioSettings();

        const { data } = await client.auth.getSession();
        if (data && data.session && data.session.user) {
          session = { email: data.session.user.email, fullName: (data.session.user.user_metadata || {}).full_name || '' };
          await loadCloudProfile();
        }
        client.auth.onAuthStateChange((_e, s) => {
          if (s && s.user) {
            session = { email: s.user.email, fullName: (s.user.user_metadata || {}).full_name || '' };
            loadCloudProfile();
          } else { session = null; profile = null; favorites = []; }
        });
      } catch (err) {
        return { data: null, error: firstError(err) };
      }
      return { data: session, error: null };
    }

    /* --- local demo ---------------------------------------------------- */
    const email = store.get(K_SESSION, null);
    const users = store.get(K_USERS, {});
    if (email && users[email]) adoptLocal(email);
    return { data: session, error: null };
  }

  /* Studio rules can live in the database (discount, points, WhatsApp) */
  async function applyStudioSettings() {
    try {
      const { data: rows, error } = await client.from('studio_settings').select('key, value');
      if (error || !rows) return;
      const m = {};
      rows.forEach(r => { m[r.key] = r.value; });
      if (m.owner_whatsapp) C.whatsapp = m.owner_whatsapp;
      if (m.currency) C.currency = m.currency;
      if (m.point_rate) C.pointRate = num(m.point_rate) || C.pointRate;
      if (m.discount_rate) C.discountRate = num(m.discount_rate) || C.discountRate;
      if (m.discount_threshold) C.discountThreshold = num(m.discount_threshold) || C.discountThreshold;
      if (m.studio_name) C.brand = m.studio_name;
      if (m.studio_name_ar) C.brandAr = m.studio_name_ar;
      if (m.owner_name) C.owner = m.owner_name;
    } catch (e) { /* settings optional */ }
  }

  function applySettings(s) {
    if (!s) return;
    if (s.owner_whatsapp) C.whatsapp = s.owner_whatsapp;
    if (s.currency) C.currency = s.currency;
    if (s.point_rate) C.pointRate = num(s.point_rate) || C.pointRate;
    if (s.discount_rate) C.discountRate = num(s.discount_rate) || C.discountRate;
    if (s.discount_threshold) C.discountThreshold = num(s.discount_threshold) || C.discountThreshold;
    if (s.studio_name) C.brand = s.studio_name;
    if (s.studio_name_ar) C.brandAr = s.studio_name_ar;
    if (s.owner_name) C.owner = s.owner_name;
  }

  async function loadCloudProfile() {
    try {
      const user = await cloudUser();
      let { data: row, error } = await client.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (error) throw error;
      if (!row) {
        const ins = await client.from('profiles').insert({
          id: user.id,
          email: (user.email || '').toLowerCase(),
          full_name: (user.user_metadata || {}).full_name || '',
          phone: (user.user_metadata || {}).phone || ''
        }).select().single();
        if (ins.error) throw ins.error;
        row = ins.data;
      }
      await loadFavorites();
      adoptProfile({
        fullName: row.full_name, phone: row.phone, email: row.email, role: row.role,
        points: row.loyalty_points, lifetimeSpent: row.lifetime_spent, favorite_shades: favorites
      });
    } catch (e) { /* profile optional */ }
  }

  async function cloudUser() {
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Please sign in again.');
    return user;
  }

  async function loadFavorites() {
    try {
      const user = await cloudUser();
      const { data, error } = await client
        .from('favorite_shades')
        .select('shade_id, created_at, shade:shades(name, name_ar, color, css, category)')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      favorites = (data || [])
        .filter(r => r.shade)
        .map(r => ({
          id: r.shade_id, name: r.shade.name, nameAr: r.shade.name_ar || '',
          color: r.shade.color || r.shade.css, cat: shadeLabel(r.shade.category)
        }));
    } catch (e) { favorites = favorites || []; }
  }

  const SHADE_LABELS = { nude: 'Nude', neon: 'Neon', cat_eye: 'Cat-Eye', glitz: 'Glitz', french: 'French' };
  const shadeLabel = c => SHADE_LABELS[c] || String(c || '').replace('_', '-');

  /* ========================================================== AUTH ====== */
  async function signUp({ email, password, fullName, phone }) {
    email = norm(email);
    if (!email || !password) return { data: null, error: 'Email and password are required.' };
    if (password.length < 6) return { data: null, error: 'Password must be at least 6 characters.' };

    if (isServer()) {
      const r = await api('POST', '/api/auth/signup', { email, password, fullName, phone });
      if (r.error) return { data: null, error: r.error };
      adoptProfile(r.data.profile);
      return { data: { needsConfirm: false, becameOwner: !!r.data.becameOwner }, error: null };
    }

    if (isCloud()) {
      try {
        const { data, error } = await client.auth.signUp({
          email, password,
          options: { data: { full_name: fullName || '', phone: phone || '' } }
        });
        if (error) return { data: null, error: firstError(error) };
        let becameOwner = false;
        if (data && data.session) {
          session = { email: email, fullName: fullName || '' };
          await loadCloudProfile();
          await updateProfile({ fullName: fullName, phone: phone });
          becameOwner = !!(profile && profile.role === 'owner');   // first account created = studio owner
        }
        return { data: { needsConfirm: !(data && data.session), becameOwner: becameOwner }, error: null };
      } catch (e) { return { data: null, error: firstError(e) }; }
    }

    const users = store.get(K_USERS, {});
    if (users[email]) return { data: null, error: 'An account with this email already exists. Please sign in.' };
    users[email] = { email: email, hash: hash(password), fullName: fullName || '', phone: phone || '', createdAt: Date.now() };
    store.set(K_USERS, users);
    const d = localData(email);
    d.profile.fullName = fullName || '';
    d.profile.phone = phone || '';
    d.profile.role = email.indexOf('owner') === 0 ? 'owner' : 'client';
    saveLocalData(email, d);
    store.set(K_SESSION, email);
    adoptLocal(email);
    return { data: { needsConfirm: false }, error: null };
  }

  async function signIn({ email, password }) {
    email = norm(email);
    if (!email || !password) return { data: null, error: 'Email and password are required.' };

    if (isServer()) {
      const r = await api('POST', '/api/auth/signin', { email, password });
      if (r.error) return { data: null, error: r.error };
      adoptProfile(r.data.profile);
      return { data: session, error: null };
    }

    if (isCloud()) {
      try {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) return { data: null, error: firstError(error) };
        session = { email: data.user.email, fullName: (data.user.user_metadata || {}).full_name || '' };
        await loadCloudProfile();
        return { data: session, error: null };
      } catch (e) { return { data: null, error: firstError(e) }; }
    }

    const users = store.get(K_USERS, {});
    const u = users[email];
    if (!u || u.hash !== hash(password)) return { data: null, error: 'Wrong email or password. Please try again.' };
    store.set(K_SESSION, email);
    adoptLocal(email);
    return { data: session, error: null };
  }

  async function signOut() {
    if (isServer()) await api('POST', '/api/auth/signout');
    if (isCloud() && client) { try { await client.auth.signOut(); } catch (e) {} }
    store.del(K_SESSION);
    session = null; profile = null; favorites = [];
    return { data: true, error: null };
  }

  async function sendReset(email) {
    email = norm(email);
    if (!email) return { data: null, error: 'Please enter your email.' };

    if (isServer()) {
      return api('POST', '/api/auth/reset', { email: email });   // returns { token, link }
    }

    if (isCloud()) {
      try {
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
        if (error) return { data: null, error: firstError(error) };
        return { data: true, error: null };
      } catch (e) { return { data: null, error: firstError(e) }; }
    }

    const users = store.get(K_USERS, {});
    if (!users[email]) return { data: null, error: 'No account found with this email.' };
    return { data: { link: null, message: 'Demo mode: open the Sign Up tab again to use a new password.' }, error: null };
  }

  async function confirmReset(token, password) {
    if (!token) return { data: null, error: 'Missing reset token.' };
    if (String(password || '').length < 6) return { data: null, error: 'Password must be at least 6 characters.' };
    if (isServer()) return api('POST', '/api/auth/reset-confirm', { token: token, password: password });
    if (isCloud()) return { data: null, error: 'Cloud mode uses the emailed link instead.' };
    return { data: null, error: 'Demo mode: please sign up again with a new password.' };
  }

  const getSession = () => session;

  /* ======================================================= PROFILE ====== */
  async function getProfile() {
    if (!session) return { data: null, error: 'Not signed in.' };

    if (isServer()) {
      const r = await api('GET', '/api/profile');
      if (r.error) return { data: null, error: r.error };
      adoptProfile(r.data);
      return { data: profile, error: null };
    }

    if (isCloud()) {
      if (profile && profile.fullName !== undefined) {
        profile.favorite_shades = favorites.slice();
        return { data: profile, error: null };
      }
      await loadCloudProfile();
      return { data: profile, error: profile ? null : 'Could not load your profile.' };
    }

    adoptLocal(session.email);
    return { data: profile, error: null };
  }

  async function updateProfile(patch) {
    if (!session) return { data: null, error: 'Not signed in.' };
    const clean = {};
    if ('fullName' in patch) clean.fullName = String(patch.fullName || '').trim();
    if ('phone' in patch) clean.phone = String(patch.phone || '').trim();

    if (isServer()) {
      const r = await api('PATCH', '/api/profile', clean);
      if (r.error) return { data: null, error: r.error };
      adoptProfile(r.data);
      return { data: profile, error: null };
    }

    if (isCloud()) {
      try {
        const user = await cloudUser();
        const body = {};
        if ('fullName' in clean) body.full_name = clean.fullName;
        if ('phone' in clean) body.phone = clean.phone;
        const { data, error } = await client.from('profiles').update(body).eq('id', user.id).select().single();
        if (error) throw error;
        adoptProfile({
          fullName: data.full_name, phone: data.phone, email: data.email, role: data.role,
          points: data.loyalty_points, lifetimeSpent: data.lifetime_spent, favorite_shades: favorites
        });
        if (clean.fullName !== undefined) session = { email: session.email, fullName: clean.fullName };
        return { data: profile, error: null };
      } catch (e) { return { data: null, error: firstError(e) }; }
    }

    const d = localData(session.email);
    if (clean.fullName !== undefined) d.profile.fullName = clean.fullName;
    if (clean.phone !== undefined) d.profile.phone = clean.phone;
    saveLocalData(session.email, d);
    adoptLocal(session.email);
    return { data: profile, error: null };
  }

  /* ======================================================= BOOKINGS ===== */
  function localReference() {
    const d = new Date();
    const seq = String(Math.floor(Math.random() * 90000) + 10000);
    return 'NVL-' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + '-' + seq;
  }

  async function addBooking(b) {
    if (!session) return { data: null, error: 'Please sign in to book.' };
    const services = b.services || [];

    if (isServer()) {
      return api('POST', '/api/bookings', {
        date: b.date, time: b.time || null,
        subtotal: b.subtotal || 0, discount: b.discount || 0, total: b.total || 0,
        discountReason: b.discountReason || null, notes: b.notes || null,
        services: services
      });
    }

    if (isCloud()) {
      try {
        const user = await cloudUser();
        const { data: row, error } = await client.from('bookings').insert({
          client_id: user.id,
          appointment_date: b.date,
          appointment_time: b.time || null,
          subtotal: b.subtotal || 0,
          discount_amount: b.discount || 0,
          total: b.total || 0,
          discount_reason: b.discountReason || null,
          notes: b.notes || null,
          status: 'pending'
        }).select('id, reference, created_at').single();
        if (error) throw error;

        if (services.length) {
          const items = services.map((s, i) => ({
            booking_id: row.id, service_id: s.id || null, name: s.name,
            name_ar: s.nameAr || null, price: s.price || 0, sort_order: i
          }));
          const { error: ierr } = await client.from('booking_items').insert(items);
          if (ierr) throw ierr;
        }
        return { data: Object.assign({}, row, { services: services }), error: null };
      } catch (e) { return { data: null, error: firstError(e) }; }
    }

    const d = localData(session.email);
    const full = {
      id: 'b' + Date.now(), reference: localReference(), status: 'pending',
      created_at: new Date().toISOString(),
      appointment_date: b.date || null, appointment_time: b.time || '',
      subtotal: b.subtotal || 0, discount_amount: b.discount || 0,
      discount_reason: b.discountReason || null, total: b.total || 0,
      notes: b.notes || '', services: services
    };
    d.bookings.unshift(full);
    const pts = Math.floor((full.total || 0) / (C.pointRate || 10));
    d.profile.points = (d.profile.points || 0) + pts;
    if (full.status !== 'cancelled') d.profile.lifetimeSpent = (d.profile.lifetimeSpent || 0) + (full.total || 0);
    saveLocalData(session.email, d);
    adoptLocal(session.email);
    return { data: full, error: null };
  }

  function mapBookingRow(b) {
    const items = b.items || b.booking_items || [];
    const services = items
      .slice()
      .sort((a, z) => (a.sort_order || 0) - (z.sort_order || 0))
      .map(i => ({ id: i.service_id, name: i.name, price: num(i.price) }));
    return Object.assign({}, b, { services: services.length ? services : (b.services || []) });
  }

  async function listBookings() {
    if (!session) return { data: [], error: null };

    if (isServer()) {
      const r = await api('GET', '/api/bookings');
      return { data: r.error ? [] : (r.data || []).map(mapBookingRow), error: r.error };
    }

    if (isCloud()) {
      try {
        const user = await cloudUser();
        const { data, error } = await client
          .from('bookings')
          .select('*, items:booking_items(service_id, name, price, sort_order)')
          .eq('client_id', user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return { data: (data || []).map(mapBookingRow), error: null };
      } catch (e) { return { data: [], error: firstError(e) }; }
    }

    return { data: localData(session.email).bookings, error: null };
  }

  /* -------- owner: every booking in the studio -------- */
  async function listAllBookings() {
    if (!session) return { data: [], error: 'Not signed in.' };

    if (isServer()) {
      const r = await api('GET', '/api/owner/bookings');
      return { data: r.error ? [] : (r.data || []).map(mapBookingRow), error: r.error };
    }

    if (isCloud()) {
      try {
        let { data, error } = await client.from('owner_bookings').select('*');
        if (error || !data) {
          const fb = await client
            .from('bookings')
            .select('*, client:profiles(full_name, phone, email), items:booking_items(name, price, sort_order)')
            .order('appointment_date', { ascending: false });
          if (fb.error) throw fb.error;
          data = (fb.data || []).map(b => Object.assign({}, b, {
            client_name: (b.client || {}).full_name,
            client_phone: (b.client || {}).phone,
            client_email: (b.client || {}).email
          }));
        }
        return { data: (data || []).map(mapBookingRow), error: null };
      } catch (e) { return { data: [], error: firstError(e) }; }
    }

    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || k.indexOf('nmh:data:') !== 0) continue;
      const d = store.get(k, null);
      if (!d) continue;
      const email = k.replace('nmh:data:', '');
      (d.bookings || []).forEach(b => out.push(Object.assign({}, b, {
        client_name: (d.profile && d.profile.fullName) || email.split('@')[0],
        client_phone: (d.profile && d.profile.phone) || '—',
        client_email: email
      })));
    }
    out.sort((a, z) => String(z.appointment_date || '').localeCompare(String(a.appointment_date || '')));
    return { data: out, error: null };
  }

  async function updateBookingStatus(id, status) {
    if (!session) return { data: null, error: 'Not signed in.' };

    if (isServer()) {
      return api('PATCH', '/api/bookings/' + encodeURIComponent(id) + '/status', { status: status });
    }

    if (isCloud()) {
      try {
        const user = await cloudUser();
        const { data, error } = await client.from('bookings')
          .update({ status: status })
          .eq('id', id)
          .select('id, status')
          .single();
        if (error) throw error;
        return { data: data, error: null };
      } catch (e) { return { data: null, error: firstError(e) }; }
    }

    const owner = profile && profile.role === 'owner';
    const targets = owner
      ? Object.keys(localStorage).filter(k => k.indexOf('nmh:data:') === 0).map(k => store.get(k, null)).filter(Boolean)
      : [localData(session.email)];
    let done = false;
    targets.forEach(d => {
      const b = (d.bookings || []).find(x => String(x.id) === String(id));
      if (b) { b.status = status; done = true; }
    });
    if (!owner) saveLocalData(session.email, localData(session.email));
    return done ? { data: { id: id, status: status }, error: null } : { data: null, error: 'Booking not found.' };
  }

  /* ======================================================= PACKAGES ===== */
  async function addPackage(p) {
    if (!session) return { data: null, error: 'Please sign in to save.' };
    const items = p.items || [];

    if (isServer()) {
      return api('POST', '/api/packages', {
        name: p.name, subtotal: p.subtotal, discount: p.discount, total: p.total, items: items
      });
    }

    if (isCloud()) {
      try {
        const user = await cloudUser();
        const { data: row, error } = await client.from('saved_packages').insert({
          client_id: user.id,
          name: p.name || 'My Custom Package',
          subtotal: p.subtotal || 0,
          discount_amount: p.discount || 0,
          total: p.total || 0
        }).select('id, created_at').single();
        if (error) throw error;
        if (items.length) {
          const { error: ierr } = await client.from('saved_package_items').insert(items.map((s, i) => ({
            package_id: row.id, service_id: s.id || null, name: s.name, price: s.price || 0, sort_order: i
          })));
          if (ierr) throw ierr;
        }
        return { data: Object.assign({}, row, { name: p.name, items: items }), error: null };
      } catch (e) { return { data: null, error: firstError(e) }; }
    }

    const d = localData(session.email);
    const full = {
      id: 'p' + Date.now(), created_at: new Date().toISOString(),
      name: p.name || 'My Custom Package',
      subtotal: p.subtotal || 0, discount_amount: p.discount || 0, total: p.total || 0,
      items: items
    };
    d.packages.unshift(full);
    saveLocalData(session.email, d);
    return { data: full, error: null };
  }

  function mapPackageRow(p) {
    const items = (p.items || p.saved_package_items || [])
      .slice()
      .sort((a, z) => (a.sort_order || 0) - (z.sort_order || 0))
      .map(i => ({ id: i.service_id || i.id, name: i.name, price: num(i.price) }));
    return Object.assign({}, p, {
      discount: num(p.discount_amount !== undefined ? p.discount_amount : p.discount),
      items: items.length ? items : (p.items || [])
    });
  }

  async function listPackages() {
    if (!session) return { data: [], error: null };

    if (isServer()) {
      const r = await api('GET', '/api/packages');
      return { data: r.error ? [] : (r.data || []).map(mapPackageRow), error: r.error };
    }

    if (isCloud()) {
      try {
        const user = await cloudUser();
        const { data, error } = await client
          .from('saved_packages')
          .select('*, items:saved_package_items(service_id, name, price, sort_order)')
          .eq('client_id', user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return { data: (data || []).map(mapPackageRow), error: null };
      } catch (e) { return { data: [], error: firstError(e) }; }
    }

    return { data: localData(session.email).packages.map(mapPackageRow), error: null };
  }

  async function removePackage(id) {
    if (!session) return { data: null, error: 'Not signed in.' };

    if (isServer()) {
      return api('DELETE', '/api/packages/' + encodeURIComponent(id));
    }

    if (isCloud()) {
      try {
        const user = await cloudUser();
        const { error } = await client.from('saved_packages').delete().eq('id', id).eq('client_id', user.id);
        if (error) throw error;
        return { data: true, error: null };
      } catch (e) { return { data: null, error: firstError(e) }; }
    }

    const d = localData(session.email);
    d.packages = d.packages.filter(p => String(p.id) !== String(id));
    saveLocalData(session.email, d);
    return { data: true, error: null };
  }

  /* ========================================================== SHADES ==== */
  async function toggleShade(shade) {
    if (!session) return { data: null, error: 'Please sign in to save shades.' };
    const i = favorites.findIndex(s => s.id === shade.id);
    const removing = i >= 0;

    if (isServer()) {
      const r = await api('POST', '/api/favorites', { shadeId: shade.id });
      if (r.error) return { data: null, error: r.error };
      favorites = (r.data.list || []).slice();
      if (profile) profile.favorite_shades = favorites.slice();
      return { data: { saved: !!r.data.saved, list: favorites.slice() }, error: null };
    }

    if (isCloud()) {
      try {
        const user = await cloudUser();
        if (removing) {
          const { error } = await client.from('favorite_shades')
            .delete().eq('profile_id', user.id).eq('shade_id', shade.id);
          if (error) throw error;
          favorites.splice(i, 1);
        } else {
          const { error } = await client.from('favorite_shades')
            .insert({ profile_id: user.id, shade_id: shade.id });
          if (error && error.code !== '23505') throw error;   // already saved
          favorites.unshift({
            id: shade.id, name: shade.name, nameAr: shade.nameAr || '',
            color: shade.color || shade.css, cat: shade.cat || shade.category
          });
        }
        return { data: { saved: !removing, list: favorites.slice() }, error: null };
      } catch (e) { return { data: null, error: firstError(e) }; }
    }

    const d = localData(session.email);
    if (removing) {
      favorites.splice(i, 1);
      d.profile.favorite_shades = favorites;
      saveLocalData(session.email, d);
      return { data: { saved: false, list: favorites.slice() }, error: null };
    }
    favorites.unshift({
      id: shade.id, name: shade.name, nameAr: shade.nameAr || '',
      color: shade.color || shade.css, cat: shade.cat || shade.category
    });
    d.profile.favorite_shades = favorites;
    saveLocalData(session.email, d);
    return { data: { saved: true, list: favorites.slice() }, error: null };
  }

  const favoriteShades = () => favorites.slice();

  /* ============================================ CATALOG FROM DATABASE === */
  const CAT_META = {
    hard_gel: { id: 'hard-gel', name: 'Hard Gel Extensions', nameAr: 'هارد جِل إكستنشن', icon: '💎' },
    soft_gel: { id: 'soft-gel', name: 'Soft Gel & Gel Polish', nameAr: 'سوفت جِل و جيل بوليش', icon: '🌸' },
    care:     { id: 'care',     name: 'Nail Care & Prep',    nameAr: 'العناية والتحضير',    icon: '🧖‍♀️' },
    art:      { id: 'art',      name: 'Nail Art & Extras',   nameAr: 'نيل آرت والإضافات',  icon: '✨' }
  };

  function shapeCatalog(services, shades, bundles) {
    const categories = [];
    services.forEach(row => {
      const meta = CAT_META[row.category];
      if (!meta) return;
      let cat = categories.find(c => c.id === meta.id);
      if (!cat) { cat = Object.assign({}, meta, { items: [] }); categories.push(cat); }
      cat.items.push({
        id: row.id,
        name: row.name,
        nameAr: row.name_ar || row.nameAr || '',
        price: num(row.price),
        priceLabel: row.price_label || row.priceLabel || null,
        unit: row.unit || 'set',
        blurb: row.blurb || ''
      });
    });

    return {
      categories: categories,
      shades: shades.map(r => ({
        id: r.id, name: r.name, nameAr: r.name_ar || r.nameAr || '',
        cat: r.category && SHADE_LABELS[r.category] ? SHADE_LABELS[r.category] : (r.cat || shadeLabel(r.category)),
        color: r.color || null, css: r.css || null
      })),
      bundles: bundles.map(r => ({
        id: r.id, name: r.name, nameAr: r.name_ar || r.nameAr || '',
        tag: r.tag || '', emoji: r.emoji || '🎀', price: num(r.price),
        items: (r.items || []).map(i => (i && i.service_id) ? i.service_id : i)
      }))
    };
  }

  async function loadCatalog() {
    if (isServer()) {
      try {
        const r = await api('GET', '/api/catalog');
        if (r.error || !r.data || !r.data.services || !r.data.services.length) return null;
        applySettings(r.data.settings);
        return shapeCatalog(r.data.services, r.data.shades || [], r.data.bundles || []);
      } catch (e) { return null; }
    }

    if (!isCloud()) return null;
    try {
      const [s, sh, b] = await Promise.all([
        client.from('services').select('*').eq('is_active', true).order('sort_order'),
        client.from('shades').select('*').eq('is_active', true).order('sort_order'),
        client.from('bundles').select('*, items:bundle_items(service_id, sort_order)').eq('is_active', true).order('sort_order')
      ]);
      if (s.error || sh.error || b.error) return null;
      if (!s.data || !s.data.length || !sh.data || !sh.data.length || !b.data || !b.data.length) return null;
      return shapeCatalog(s.data, sh.data, b.data);
    } catch (e) { return null; }
  }

  return {
    get mode() { return MODE; },
    get isCloud() { return MODE === 'cloud'; },
    get isServer() { return MODE === 'server'; },
    init, getSession, signUp, signIn, signOut, sendReset, confirmReset,
    getProfile, updateProfile,
    addBooking, listBookings, listAllBookings, updateBookingStatus,
    addPackage, listPackages, removePackage,
    toggleShade, favoriteShades,
    loadCatalog
  };
})();
