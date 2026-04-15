export const STUDIO_STEPS = ["בחירת מוצר", "התאמה אישית", "משלוח ותשלום", "אישור"];

export const PRODUCT_CATEGORIES = [
  {
    id: "necklaces",
    title: "שרשראות",
    useSubcategories: true,
  },
  {
    id: "bracelets",
    title: "צמידים",
    useSubcategories: true,
  },
  {
    id: "keychains",
    title: "מחזיקי מפתחות",
    useSubcategories: false,
  },
  {
    id: "other",
    title: "אחר",
    useSubcategories: false,
  },
];

const SWATCH_MAP = {
  gold: { color: "זהב", swatch: "#D4AF37" },
  silver: { color: "כסוף", swatch: "#C0C0C0" },
  black: { color: "שחור", swatch: "#2B2B2B" },
  rose: { color: "רוז גולד", swatch: "#B76E79" },
  white: { color: "לבן", swatch: "#F7F7F5" },
  beige: { color: "בז׳", swatch: "#DCC8AA" },
};

export const STUDIO_VARIANT_BY_KEY = {
  gold: { color: "זהב", swatch: "#D4AF37" },
  silver: { color: "כסף", swatch: "#C0C0C0" },
  black: { color: "שחור", swatch: "#2B2B2B" },
  rose: { color: "רוז גולד", swatch: "#B76E79" },
};

const IMAGE_BANK = {
  necklacesMen: {
    silver: [
      "https://images.pexels.com/photos/1454171/pexels-photo-1454171.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
      "https://images.pexels.com/photos/10983791/pexels-photo-10983791.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
    ],
    black: [
      "https://images.pexels.com/photos/10983785/pexels-photo-10983785.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
      "https://images.pexels.com/photos/9428789/pexels-photo-9428789.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
    ],
    gold: [
      "https://images.pexels.com/photos/5370706/pexels-photo-5370706.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
      "https://images.pexels.com/photos/10983783/pexels-photo-10983783.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
    ],
  },
  necklacesWomen: {
    gold: [
      "https://images.pexels.com/photos/10983783/pexels-photo-10983783.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
      "https://images.pexels.com/photos/5370706/pexels-photo-5370706.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
      "https://images.pexels.com/photos/10983791/pexels-photo-10983791.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
    ],
    rose: [
      "https://images.pexels.com/photos/9428777/pexels-photo-9428777.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
      "https://images.pexels.com/photos/10983783/pexels-photo-10983783.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
      "https://images.pexels.com/photos/1454171/pexels-photo-1454171.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
    ],
    silver: [
      "https://images.pexels.com/photos/10983791/pexels-photo-10983791.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
      "https://images.pexels.com/photos/5370698/pexels-photo-5370698.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
      "https://images.pexels.com/photos/9428777/pexels-photo-9428777.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
    ],
  },
  braceletsMen: {
    black: [
      "https://images.pexels.com/photos/9428789/pexels-photo-9428789.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
      "https://images.pexels.com/photos/10983785/pexels-photo-10983785.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
    ],
    silver: [
      "https://images.pexels.com/photos/10983785/pexels-photo-10983785.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
      "https://images.pexels.com/photos/10983790/pexels-photo-10983790.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
    ],
    gold: [
      "https://images.pexels.com/photos/10983790/pexels-photo-10983790.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
      "https://images.pexels.com/photos/9428789/pexels-photo-9428789.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
    ],
  },
  braceletsWomen: {
    gold: [
      "https://images.pexels.com/photos/10983791/pexels-photo-10983791.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
      "https://images.pexels.com/photos/5370698/pexels-photo-5370698.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
    ],
    rose: [
      "https://images.pexels.com/photos/9428777/pexels-photo-9428777.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
      "https://images.pexels.com/photos/10983791/pexels-photo-10983791.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
    ],
    silver: [
      "https://images.pexels.com/photos/5370698/pexels-photo-5370698.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
      "https://images.pexels.com/photos/9428777/pexels-photo-9428777.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
    ],
  },
  keychains: {
    silver: [
      "https://images.pexels.com/photos/2079451/pexels-photo-2079451.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
      "https://images.pexels.com/photos/10983791/pexels-photo-10983791.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
    ],
    black: [
      "https://images.pexels.com/photos/10983785/pexels-photo-10983785.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
      "https://images.pexels.com/photos/2079451/pexels-photo-2079451.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
    ],
    gold: [
      "https://images.pexels.com/photos/10983791/pexels-photo-10983791.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
      "https://images.pexels.com/photos/585750/pexels-photo-585750.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
    ],
  },
  other: {
    white: [
      "https://images.pexels.com/photos/9826127/pexels-photo-9826127.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
      "https://images.pexels.com/photos/6164042/pexels-photo-6164042.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
    ],
    black: [
      "https://images.pexels.com/photos/585750/pexels-photo-585750.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
      "https://images.pexels.com/photos/9826127/pexels-photo-9826127.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
    ],
    beige: [
      "https://images.pexels.com/photos/6164042/pexels-photo-6164042.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
      "https://images.pexels.com/photos/585750/pexels-photo-585750.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
    ],
  },
};

function makeVariants(imageSet, variantKeys, offset = 0) {
  return variantKeys.map((key, idx) => {
    const images = imageSet[key] || imageSet.silver || imageSet.gold || Object.values(imageSet)[0];
    return {
      ...SWATCH_MAP[key],
      image: images[(offset + idx) % images.length],
    };
  });
}

/** כל כתובות התמונות לגלריה בתחתית הסטודיו (ללא כפילויות, לפי סדר צבעים). */
function collectGalleryUrls(imageSet, variantKeys) {
  const out = [];
  const seen = new Set();
  for (const k of variantKeys) {
    for (const u of imageSet[k] || []) {
      if (u && !seen.has(u)) {
        seen.add(u);
        out.push(u);
      }
    }
  }
  return out;
}

function buildSeries({ prefix, category, subcategory, titleBase, description, startPrice, imageSet, variantKeys }, count = 8) {
  const imageUrls = collectGalleryUrls(imageSet, variantKeys);
  return Array.from({ length: count }, (_, idx) => ({
    id: `${prefix}-${idx + 1}`,
    category,
    subcategory,
    title: `${titleBase} ${idx + 1}`,
    description,
    price: startPrice + (idx % 4) * 15,
    imageUrls,
    variants: makeVariants(imageSet, variantKeys, idx),
  }));
}

export const PRODUCT_ITEMS = [
  ...buildSeries({
    prefix: "n-men",
    category: "necklaces",
    subcategory: "שרשראות לגבר",
    titleBase: "שרשרת גבר קלאסית",
    description: "שרשרת נקייה במראה גברי יוקרתי.",
    startPrice: 189,
    imageSet: IMAGE_BANK.necklacesMen,
    variantKeys: ["silver", "black", "gold"],
  }),
  ...buildSeries({
    prefix: "n-women",
    category: "necklaces",
    subcategory: "שרשראות לאישה",
    titleBase: "שרשרת נשית עדינה",
    description: "שרשרת אלגנטית עם נגיעה אישית.",
    startPrice: 199,
    imageSet: IMAGE_BANK.necklacesWomen,
    variantKeys: ["gold", "rose", "silver"],
  }),
  ...buildSeries({
    prefix: "b-men",
    category: "bracelets",
    subcategory: "צמידים לגבר",
    titleBase: "צמיד גבר מינימל",
    description: "צמיד גברי בגימור נקי ומדויק.",
    startPrice: 169,
    imageSet: IMAGE_BANK.braceletsMen,
    variantKeys: ["black", "silver", "gold"],
  }),
  ...buildSeries({
    prefix: "b-women",
    category: "bracelets",
    subcategory: "צמידים לאישה",
    titleBase: "צמיד נשי מעודן",
    description: "צמיד עדין עם אפשרות חריטה אישית.",
    startPrice: 179,
    imageSet: IMAGE_BANK.braceletsWomen,
    variantKeys: ["gold", "rose", "silver"],
  }),
  ...buildSeries({
    prefix: "k",
    category: "keychains",
    subcategory: null,
    titleBase: "מחזיק מפתחות חריטה",
    description: "מחזיק קומפקטי בעיצוב אישי.",
    startPrice: 89,
    imageSet: IMAGE_BANK.keychains,
    variantKeys: ["silver", "black", "gold"],
  }),
  ...buildSeries({
    prefix: "o",
    category: "other",
    subcategory: null,
    titleBase: "מתנת חריטה מיוחדת",
    description: "מוצר מתנה ייחודי בקטגוריית אחר.",
    startPrice: 149,
    imageSet: IMAGE_BANK.other,
    variantKeys: ["white", "black", "beige"],
  }).map((item, idx) => ({
    ...item,
    title: idx < 4 ? `סט ספלים ${idx + 1}` : idx < 7 ? `סט סכום ${idx - 3}` : `מוצר חריטה נוסף ${idx - 6}`,
  })),
];

export const FONT_OPTIONS = [
  { id: "heebo", label: "Heebo קלאסי", family: "'Heebo', sans-serif" },
  { id: "serif", label: "אלגנט סריף", family: "'Times New Roman', serif" },
  { id: "mono", label: "מודרני נקי", family: "'Courier New', monospace" },
  { id: "script", label: "כתב רך", family: "'Brush Script MT', cursive" },
  { id: "assistant", label: "Assistant נקי", family: "'Assistant', sans-serif" },
  { id: "rubik", label: "Rubik מודרני", family: "'Rubik', sans-serif" },
  { id: "david", label: "David קלאסי", family: "'David', serif" },
  { id: "arial", label: "Arial נגיש", family: "Arial, sans-serif" },
];

export const MATERIAL_OPTIONS = [
  { id: "gold", label: "זהב", tone: "linear-gradient(150deg, #f2e6b8 0%, #d4af37 42%, #9a7224 100%)" },
  { id: "silver", label: "כסף", tone: "linear-gradient(150deg, #f7f7f7 0%, #c8c8c8 48%, #8e8e8e 100%)" },
  { id: "black-matte", label: "שחור מאט", tone: "linear-gradient(155deg, #3a3a3a 0%, #1a1a1a 55%, #0f0f0f 100%)" },
  { id: "rose-gold", label: "רוז גולד", tone: "linear-gradient(150deg, #fce4e6 0%, #e8b4b8 45%, #b76e79 100%)" },
];

export const SIZE_OPTIONS = [
  { id: "s", label: "קטן", dimensions: "20x12 ס\"מ", multiplier: 1 },
  { id: "m", label: "בינוני", dimensions: "28x18 ס\"מ", multiplier: 1.15 },
  { id: "l", label: "גדול", dimensions: "35x24 ס\"מ", multiplier: 1.35 },
];

export const ICON_OPTIONS = ["❤", "✦", "∞", "☼", "✿", "✶"];

export const SHIPPING_METHODS = [
  { id: "pickup", label: "איסוף עצמי", fee: 0, eta: "תיאום מול הסטודיו" },
  { id: "home", label: "משלוח עד 7 ימי עסקים (חינם)", fee: 0, eta: "חינם" },
];


/** אפשרויות תשלום לתפריט הארנקים (UI דמה בלבד). */
export const PAYMENT_METHOD_OPTIONS = [
  { id: "card", label: "כרטיס אשראי", brand: null },
  { id: "google_pay", label: "Google Pay", brand: "google" },
  { id: "apple_pay", label: "Apple Pay", brand: "apple" },
  { id: "bit", label: "ביט", brand: "bit" },
  { id: "paypal", label: "PayPal", brand: "paypal" },
];
