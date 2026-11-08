/* ============================================================
   auth.js — Sign In / Sign Up / Reset Password
   ============================================================ */
(function () {
  const msg = document.getElementById('auth-msg');
  const tabs = Array.from(document.querySelectorAll('.auth-tab'));
  const panels = {
    signin: document.getElementById('panel-signin'),
    signup: document.getElementById('panel-signup'),
    reset: document.getElementById('panel-reset')
  };

  function showMsg(text, type) {
    if (!text) { msg.className = 'auth-msg'; msg.textContent = ''; return; }
    msg.className = 'auth-msg show ' + (type || 'err');
    msg.textContent = text;
    if (type === 'ok') setTimeout(() => { msg.className = 'auth-msg'; }, 6000);
  }

  function goto(name) {
    tabs.forEach(t => t.classList.toggle('on', t.dataset.tab === name));
    Object.keys(panels).forEach(k => panels[k].classList.toggle('on', k === name));
    showMsg('');
    const first = panels[name].querySelector('input');
    if (first && window.innerWidth > 980) first.focus({ preventScroll: true });
    if (history.replaceState) history.replaceState(null, '', '#' + name);
  }

  tabs.forEach(t => t.addEventListener('click', () => goto(t.dataset.tab)));
  document.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => goto(b.dataset.goto)));

  /* show / hide password */
  document.querySelectorAll('[data-eye]').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = document.getElementById(btn.dataset.eye);
      const visible = inp.type === 'text';
      inp.type = visible ? 'password' : 'text';
      btn.textContent = visible ? 'Show' : 'Hide';
    });
  });

  function val(id) { return document.getElementById(id).value.trim(); }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }

  function busy(form, on, label) {
    const btn = form.querySelector('button[type=submit]');
    if (!btn) return;
    if (on) { btn.dataset.txt = btn.textContent; btn.textContent = label || 'Please wait…'; btn.disabled = true; }
    else { btn.textContent = btn.dataset.txt || btn.textContent; btn.disabled = false; }
  }

  /* ---------------------------------------------------- sign in */
  document.getElementById('form-signin').addEventListener('submit', async e => {
    e.preventDefault();
    const email = val('si-email'), password = val('si-pass');
    if (!validEmail(email)) return showMsg('Please enter a valid email address.');
    if (!password) return showMsg('Please enter your password.');

    const form = e.target;
    busy(form, true, 'Signing you in…');
    const { data, error } = await DB.signIn({ email, password });
    busy(form, false);
    if (error) return showMsg(error);
    showMsg('Welcome back! Opening your glam space… ✨', 'ok');
    setTimeout(() => { location.href = nextUrl(); }, 700);
  });

  /* ---------------------------------------------------- sign up */
  document.getElementById('form-signup').addEventListener('submit', async e => {
    e.preventDefault();
    const fullName = val('su-name'), phone = val('su-phone'),
          email = val('su-email'), password = val('su-pass');

    if (fullName.length < 2) return showMsg('Please write your full name. · اكتبي اسمك بالكامل');
    if (!/^[0-9+\s()-]{8,}$/.test(phone)) return showMsg('Please enter a valid phone number. · اكتبي رقم موبايل صحيح');
    if (!validEmail(email)) return showMsg('Please enter a valid email address.');
    if (password.length < 6) return showMsg('Password must be at least 6 characters.');

    const form = e.target;
    busy(form, true, 'Creating your account…');
    const { data, error } = await DB.signUp({ email, password, fullName, phone });
    busy(form, false);
    if (error) return showMsg(error);

    if (data && data.needsConfirm) {
      showMsg('Almost there! We sent a confirmation link to ' + email + ' — open it, then sign in. · فيدي لينك تأكيد على إيميلك', 'ok');
      goto('signin');
      return;
    }
    if (data && data.becameOwner) {
      showMsg('👑 Welcome Neven! This first account is now the OWNER account — you get the admin panel. Opening your studio…', 'ok');
      setTimeout(() => { location.href = nextUrl(); }, 1400);
      return;
    }
    showMsg('Account created! Opening your glam space… 💖', 'ok');
    setTimeout(() => { location.href = nextUrl(); }, 700);
  });

  /* ---------------------------------------------------- reset */
  let resetToken = '';
  document.getElementById('form-reset').addEventListener('submit', async e => {
    e.preventDefault();
    const email = val('rs-email');
    if (!validEmail(email)) return showMsg('Please enter a valid email address.');
    const form = e.target;
    busy(form, true, 'Creating…');
    const { data, error } = await DB.sendReset(email);
    busy(form, false);
    if (error) return showMsg(error);

    if (data && data.link) {
      /* local database: there is no email service, so show the link right here */
      resetToken = data.token || '';
      const url = location.origin + location.pathname + '?' + data.link;
      document.getElementById('rs-link').value = url;
      document.getElementById('reset-step2').hidden = false;
      document.getElementById('rc-pass').value = '';
      showMsg('Reset link created — choose your new password below. · اللينك جاهز', 'ok');
      document.getElementById('rc-pass').focus({ preventScroll: false });
      return;
    }
    showMsg((data && data.message) || ('Reset link sent to ' + email + ' — check your inbox. · هتلاقي اللينك على إيميلك'), 'ok');
  });

  document.getElementById('btn-reset-confirm').addEventListener('click', async () => {
    const pass = document.getElementById('rc-pass').value;
    if (pass.length < 6) return showMsg('Password must be at least 6 characters.');
    const btn = document.getElementById('btn-reset-confirm');
    btn.disabled = true; btn.textContent = 'Saving…';
    const { data, error } = await DB.confirmReset(resetToken, pass);
    btn.disabled = false; btn.textContent = 'Set New Password';
    if (error) return showMsg(error);
    showMsg('Password updated! You can sign in now. · تم تغيير كلمة المرور', 'ok');
    document.getElementById('reset-step2').hidden = true;
    document.getElementById('form-reset').reset();
    setTimeout(() => goto('signin'), 900);
  });

  /* ---------------------------------------------------- helpers */
  function nextUrl() {
    const p = new URLSearchParams(location.search).get('next');
    if (!p) return 'index.html';
    const base = p.split('#')[0];
    if (['index.html', 'dashboard.html', 'auth.html'].indexOf(base) === -1) return 'index.html';
    return p;
  }

  /* ---------------------------------------------------- boot */
  (async function boot() {
    /* explain which database is in use */
    const hint = document.getElementById('demo-hint');
    const mode = DB.mode;
    hint.hidden = false;
    hint.innerHTML = mode === 'server'
      ? '<b>🗄 Local database:</b> your account, bookings and points are stored in this computer\'s database (server/data/studio.db).'
      : mode === 'cloud'
        ? '<b>☁️ Cloud database:</b> accounts are stored in Supabase.'
        : '<b>⚡ Demo mode:</b> no database is connected, so accounts are saved in this browser only. Run <b>start.bat</b> to use the real database.';

    await DB.init();

    /* a reset link was opened: pre-fill the token and jump to Reset */
    const qs = new URLSearchParams(location.search);
    const token = qs.get('token') || '';
    if (token) {
      resetToken = token;
      goto('reset');
      document.getElementById('reset-step2').hidden = false;
      showMsg('Link opened — choose your new password. · افتح اللينك واختاري كلمة مرور جديدة', 'ok');
      return;
    }

    const s = DB.getSession();
    if (s) { location.replace(nextUrl()); return; }
    const hash = (location.hash || '').replace('#', '').split('&')[0];
    if (panels[hash]) goto(hash); else goto('signin');
  })();
})();
