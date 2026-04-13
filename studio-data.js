export const STUDIO_STEPS = ["בחירת מוצר", "התאמה אישית", "משלוח ותשלום", "אישור"];

export const PRODUCT_CATEGORIES = [
  {
    id: "cutting-board",
    title: "קרש חיתוך",
    description: "עץ מלא עם חריטה אישית לחוויית מטבח אלגנטית.",
    price: 169,
    material: "עץ",
    image:
      "https://images.pexels.com/photos/6164042/pexels-photo-6164042.jpeg?auto=compress&cs=tinysrgb&w=900&h=600&fit=crop",
  },
  {
    id: "thermos",
    title: "כוס / תרמוס",
    description: "תרמוס פרימיום עם חריטת שם או הקדשה אישית.",
    price: 139,
    material: "מתכת",
    image:
      "https://images.pexels.com/photos/4482900/pexels-photo-4482900.jpeg?auto=compress&cs=tinysrgb&w=900&h=600&fit=crop",
  },
  {
    id: "frame",
    title: "מסגרת",
    description: "מסגרת מעוצבת עם חריטה שמשלימה את הרגע שלכם.",
    price: 189,
    material: "עץ",
    image:
      "https://images.pexels.com/photos/1743101/pexels-photo-1743101.jpeg?auto=compress&cs=tinysrgb&w=900&h=600&fit=crop",
  },
  {
    id: "keychain",
    title: "מחזיק מפתחות",
    description: "פריט יומיומי קטן עם נגיעה אישית מדויקת.",
    price: 89,
    material: "מתכת",
    image:
      "https://images.pexels.com/photos/1749303/pexels-photo-1749303.jpeg?auto=compress&cs=tinysrgb&w=900&h=600&fit=crop",
  },
  {
    id: "wood-sign",
    title: "שלט עץ",
    description: "שלט כניסה מעץ טבעי עם גימור חם ויוקרתי.",
    price: 229,
    material: "עץ",
    image:
      "https://images.pexels.com/photos/1055058/pexels-photo-1055058.jpeg?auto=compress&cs=tinysrgb&w=900&h=600&fit=crop",
  },
  {
    id: "personal-gift",
    title: "מתנה אישית",
    description: "ערכת מתנה מעוצבת בהתאמה אישית מלאה.",
    price: 259,
    material: "משולב",
    image:
      "https://images.pexels.com/photos/264771/pexels-photo-264771.jpeg?auto=compress&cs=tinysrgb&w=900&h=600&fit=crop",
  },
];

export const FONT_OPTIONS = [
  { id: "heebo", label: "Heebo קלאסי", family: "'Heebo', sans-serif" },
  { id: "serif", label: "אלגנט סריף", family: "'Times New Roman', serif" },
  { id: "mono", label: "מודרני נקי", family: "'Courier New', monospace" },
  { id: "script", label: "כתב רך", family: "'Brush Script MT', cursive" },
];

export const MATERIAL_OPTIONS = [
  { id: "oak", label: "אלון טבעי", tone: "#b2845f" },
  { id: "walnut", label: "אגוז כהה", tone: "#6e4b33" },
  { id: "matte-steel", label: "מתכת מאט", tone: "#808890" },
  { id: "champagne", label: "שמפניה", tone: "#be9f73" },
];

export const SIZE_OPTIONS = [
  { id: "s", label: "קטן", dimensions: "20x12 ס\"מ", multiplier: 1 },
  { id: "m", label: "בינוני", dimensions: "28x18 ס\"מ", multiplier: 1.15 },
  { id: "l", label: "גדול", dimensions: "35x24 ס\"מ", multiplier: 1.35 },
];

export const ICON_OPTIONS = ["❤", "✦", "∞", "☼", "✿", "✶"];

export const SHIPPING_METHODS = [
  { id: "home", label: "משלוח עד הבית", fee: 29, eta: "2-5 ימי עסקים" },
  { id: "pickup", label: "איסוף עצמי", fee: 0, eta: "זמין תוך 24 שעות" },
  { id: "express", label: "משלוח מהיר", fee: 49, eta: "עד 2 ימי עסקים" },
];
