/* ============================================================
   Neven Medala3a El 7elween — global settings
   ============================================================ */
window.APP_CONFIG = {
  brand: 'Neven Medala3a El 7elween',
  brandAr: 'نڤين مدلعة الحلوين',
  tagline: "Elite Girl's Nail & Beauty Studio",
  taglineAr: 'استوديو العناية والأظافر للبنات',

  /* ---- WhatsApp (OWNER = Neven) — all bookings arrive here ---- */
  whatsapp: '201551787902',              // international format, no +
  whatsappDisplay: '+20 155 178 7902',
  owner: 'Neven',

  /* ---- Database ------------------------------------------------------
     'server'      → the real local database that runs on this computer
                     (start it with  start.bat  or  node server/server.js)
     'supabase'    → cloud PostgreSQL (fill the two values below)
     'local'       → instant demo mode, data stays in this browser only
  ------------------------------------------------------------------ */
  db: 'supabase',
  serverUrl: '',                     // '' = same address the page is opened on
  supabaseUrl: 'https://bfkbdvjjqifjpjewwyff.supabase.co',
  supabaseAnonKey: 'sb_publishable_U9M-Ym42H8YCjLiAzHh8KQ_I9DQe2ae',

  /* ---- Pricing rules ---- */
  currency: 'EGP',
  discountThreshold: 3,      // select 3+ services ...
  discountRate: 0.10,        // ... and get 10% off
  pointRate: 10,             // 1 royalty point per 10 EGP spent

  /* ---- Loyalty tiers ---- */
  tiers: [
    { name: 'Rose Member',   nameAr: 'عضوة روز',     min: 0 },
    { name: 'Gold Glam',     nameAr: 'جولد غلام',     min: 300 },
    { name: 'Diamond Diva',  nameAr: 'دايموند ديفا',  min: 800 }
  ]
};
