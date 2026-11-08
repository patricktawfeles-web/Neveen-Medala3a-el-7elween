/* ============================================================
   Service price catalog (EGP) + preset bundles
   ============================================================ */
var __root = (typeof window !== 'undefined') ? window : globalThis;
__root.CATALOG = {
  categories: [
    {
      id: 'hard-gel',
      name: 'Hard Gel Extensions',
      nameAr: 'هارد جِل إكستنشن',
      icon: '💎',
      items: [
        { id: 'hg-standard', name: 'Standard Set',              nameAr: 'ست قياسي',        price: 800,  blurb: 'Strong, glossy everyday length.' },
        { id: 'hg-refill',   name: 'Gel Overlay / Refill',      nameAr: 'أوفرلاي / ريفيل', price: 500,  blurb: 'Fresh overlay in 45 minutes.' },
        { id: 'hg-sculpt',   name: 'Sculpted Long Extensions',  nameAr: 'إكستنشن طويل',    price: 1000, blurb: 'Sculpted length, catwalk finish.' }
      ]
    },
    {
      id: 'soft-gel',
      name: 'Soft Gel & Gel Polish',
      nameAr: 'سوفت جِل و جيل بوليش',
      icon: '🌸',
      items: [
        { id: 'sg-tips',    name: 'Soft Gel Tips Full Set',        nameAr: 'سيت سوفت جِل تيبس',   price: 650, blurb: 'Lightweight, natural-looking tips.' },
        { id: 'sg-removal', name: 'Gel Polish Removal + New Color', nameAr: 'إزالة + لون جديد',     price: 400, blurb: 'Gentle removal, fresh colour.' },
        { id: 'gg-hands',   name: 'Gelish Hands',                  nameAr: 'جيليش أيدي',          price: 300, blurb: 'Shine that lasts 3 weeks.' },
        { id: 'gg-feet',    name: 'Gelish Feet',                   nameAr: 'جيليش رجلين',         price: 350, blurb: 'Perfect toes, chip-free.' }
      ]
    },
    {
      id: 'care',
      name: 'Nail Care & Prep',
      nameAr: 'العناية والتحضير',
      icon: '🧖‍♀️',
      items: [
        { id: 'care-russian', name: 'Russian Dry Manicure',        nameAr: 'مانيكير روسياي جاف', price: 250, blurb: 'Ultra-clean, precise cuticle work.' },
        { id: 'care-spa',     name: 'Luxury Spa Pedicure + Gel',   nameAr: 'بديكير سبا + جيل',   price: 500, blurb: 'Soak, scrub, mask, gel colour.' },
        { id: 'care-repair',  name: 'Nail Repair Treatment',       nameAr: 'ترميم الأظافر',      price: 150, unit: 'per nail', blurb: 'Fix a break without losing length.' }
      ]
    },
    {
      id: 'art',
      name: 'Nail Art & Extras',
      nameAr: 'نيل آرت والإضافات',
      icon: '✨',
      items: [
        { id: 'art-hand',   name: 'Custom Hand-Drawn Art', nameAr: 'آرت مرسوم باليد', price: 50, priceLabel: '50–150', unit: 'per nail', blurb: 'Your idea, painted by hand.' },
        { id: 'art-chrome', name: 'Chrome / Cat Eye',      nameAr: 'كروم / كات آي',   price: 150, unit: 'set', add: true, blurb: 'Mirror shine or magnetic depth.' },
        { id: 'art-french', name: 'French / Ombré',        nameAr: 'فرنش / أومبري',   price: 200, unit: 'set', add: true, blurb: 'Timeless tips or soft blend.' },
        { id: 'art-charms', name: '3D Charms',             nameAr: 'شارمز 3D',        price: 100, unit: 'set', add: true, blurb: 'Crystals, bows & pearls.' }
      ]
    }
  ],

  bundles: [
    {
      id: 'bridal',
      name: 'Bridal Glam Package',
      nameAr: 'باقة العروس',
      price: 1800,
      tag: 'Best for the big day · وفرة 300',
      items: ['hg-sculpt', 'care-spa', 'gg-hands', 'art-french', 'art-charms'],
      emoji: '👑'
    },
    {
      id: 'chic',
      name: 'Clean & Chic Glow',
      nameAr: 'باقة الاناقة والنضارة',
      price: 850,
      tag: 'Everyday elegance · وفرة 200',
      items: ['care-russian', 'sg-tips', 'art-chrome'],
      emoji: '🤍'
    },
    {
      id: 'weekend',
      name: 'Weekend Refresh',
      nameAr: 'باقة نهار الجمعة',
      price: 600,
      tag: 'Friday plan, sorted · وفرة 100',
      items: ['gg-hands', 'care-russian', 'art-chrome'],
      emoji: '💖'
    }
  ],

  shades: [
    { id: 'n1', name: 'Bare Rose',      nameAr: 'وردة عارية',   cat: 'Nude',   color: '#E7C4BC' },
    { id: 'n2', name: 'Milky Beige',    nameAr: 'بيج حليبي',    cat: 'Nude',   color: '#EAD9CC' },
    { id: 'n3', name: 'Dusty Mauve',    nameAr: 'موف باهت',     cat: 'Nude',   color: '#C9A3A9' },
    { id: 'n4', name: 'Caramel Nude',   nameAr: 'كاجمل نود',    cat: 'Nude',   color: '#C99C7E' },
    { id: 'n5', name: 'Soft Peach',     nameAr: 'خوخي ناعم',    cat: 'Nude',   color: '#F2C3A8' },
    { id: 'k1', name: 'Neon Pink',      nameAr: 'وردي نيون',    cat: 'Neon',   color: '#FF2E93' },
    { id: 'k2', name: 'Electric Fuchsia',nameAr: 'فوشيا كهربائي',cat: 'Neon',   color: '#F0229B' },
    { id: 'k3', name: 'Hot Coral',      nameAr: 'كورال حار',    cat: 'Neon',   color: '#FF5E5B' },
    { id: 'k4', name: 'Acid Lime',      nameAr: 'ليموني',       cat: 'Neon',   color: '#C7F53F' },
    { id: 'k5', name: 'UV Violet',      nameAr: 'بنفسجي فاقع',  cat: 'Neon',   color: '#A66BFF' },
    { id: 'c1', name: 'Rose Cat Eye',   nameAr: 'كات آي وردي',  cat: 'Cat-Eye', css: 'radial-gradient(circle at 32% 30%, #FFD9EC 0%, #FF2E93 38%, #7A0B45 100%)' },
    { id: 'c2', name: 'Gold Cat Eye',   nameAr: 'كات آي ذهبي',  cat: 'Cat-Eye', css: 'radial-gradient(circle at 32% 30%, #FFF1D6 0%, #E8C39E 40%, #6B4A2B 100%)' },
    { id: 'c3', name: 'Emerald Cat Eye',nameAr: 'كات آي زمردي', cat: 'Cat-Eye', css: 'radial-gradient(circle at 32% 30%, #D9FFE9 0%, #2FBF8F 40%, #083A2C 100%)' },
    { id: 'c4', name: 'Midnight Cat Eye',nameAr:'كات آي ليلي',   cat: 'Cat-Eye', css: 'radial-gradient(circle at 32% 30%, #D8DCFF 0%, #4A57C9 40%, #0B0F3A 100%)' },
    { id: 'g1', name: 'Rose Gold Glitz',nameAr: 'غلتر وردي ذهبي', cat: 'Glitz', css: 'radial-gradient(circle at 20% 25%, #fff6 0 8%, transparent 9%), radial-gradient(circle at 70% 60%, #fff5 0 7%, transparent 8%), radial-gradient(circle at 45% 80%, #fffd 0 6%, transparent 7%), linear-gradient(135deg, #E5A9B4, #E8C39E)' },
    { id: 'g2', name: 'Disco Silver',   nameAr: 'فضي ديسكو',    cat: 'Glitz',   css: 'radial-gradient(circle at 25% 30%, #ffffffaa 0 7%, transparent 8%), radial-gradient(circle at 65% 55%, #ffffff88 0 6%, transparent 7%), radial-gradient(circle at 40% 75%, #ffffffff 0 5%, transparent 6%), linear-gradient(135deg, #D9D9E3, #8E8EA8)' },
    { id: 'g3', name: 'Champagne Sparkle', nameAr: 'شمبانيا لامعة', cat: 'Glitz', css: 'radial-gradient(circle at 30% 25%, #fff9 0 7%, transparent 8%), radial-gradient(circle at 72% 62%, #fff7 0 6%, transparent 7%), linear-gradient(135deg, #F6E3B8, #D8B26A)' },
    { id: 'g4', name: 'Magenta Crush',  nameAr: 'ماجنتا مكسور', cat: 'Glitz',   css: 'radial-gradient(circle at 28% 28%, #ffd7ec 0 7%, transparent 8%), radial-gradient(circle at 68% 58%, #ffb8dd 0 6%, transparent 7%), linear-gradient(135deg, #FF2E93, #8A0E52)' },
    { id: 'f1', name: 'Classic French', nameAr: 'فرنش كلاسيك',  cat: 'French',  css: 'linear-gradient(180deg, #F7E4E4 0 62%, #FFFFFF 62% 100%)' },
    { id: 'f2', name: 'Pink French',    nameAr: 'فرنش وردي',    cat: 'French',  css: 'linear-gradient(180deg, #F9E1EC 0 62%, #FF8FC4 62% 100%)' },
    { id: 'f3', name: 'Black French',   nameAr: 'فرنش أسود',    cat: 'French',  css: 'linear-gradient(180deg, #F6E7E2 0 62%, #17171D 62% 100%)' },
    { id: 'f4', name: 'Glitter French', nameAr: 'فرنش جليتر',   cat: 'French',  css: 'linear-gradient(180deg, #F7E6EA 0 58%, linear-gradient(90deg, #E8C39E, #FF2E93) 58% 100%)' }
  ],

  shadeCategories: ['All', 'Nude', 'Neon', 'Cat-Eye', 'Glitz', 'French']
};

/* flat lookup: id -> item */
__root.CATALOG.itemById = function (id) {
  const all = [];
  window.CATALOG.categories.forEach(c => c.items.forEach(i => all.push(Object.assign({ categoryId: c.id, categoryName: c.name }, i))));
  return all.find(i => i.id === id) || null;
};

__root.CATALOG.allItems = function () {
  const all = [];
  __root.CATALOG.categories.forEach(c => c.items.forEach(i => all.push(Object.assign({ categoryId: c.id, categoryName: c.name }, i))));
  return all;
};

/* allow the local server (Node) to reuse this exact same catalog */
if (typeof module !== 'undefined' && module.exports) module.exports = __root.CATALOG;
