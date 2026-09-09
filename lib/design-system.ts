/**
 * Farm2Door Design System
 * 
 * Palette inspired by rich organic agriculture:
 * - Phthalo Green (#0D2E1C) - Primary identity, deep forest, structural elements
 * - Pear Green (#CFE73B) - Vibrant harvest accent, high-conversion CTAs, stock highlights
 * - Asparagus Green (#6A9B48) - Natural leafy midtone, verified tags, category pills
 * - Acid Green (#B5BA3E) - Golden olive field tone, price tags, star ratings
 * - Cream Scale (#FAF8F2, #FFFDF9, #F2ECE0, #E5DBC7, #F7E9BC) - Organic paper canvas, warm tactile surfaces
 */

export const PALETTE = {
  // Brand Core Swatch (Exact Hex from Specification)
  phthalo: {
    base: "#0D2E1C",
    hex: "#0D2E1C",
    rgb: "13, 46, 28",
    cmyk: "72, 0, 39, 82",
    label: "Phthalo Green",
    roles: "Primary brand, navigation bars, deep contrast typography, dark cards",
    shades: {
      950: "#06170D",
      900: "#0D2E1C",
      800: "#134229",
      700: "#1B5A38",
      600: "#25784B",
      500: "#319760",
      100: "#E4F1E9",
      50: "#F1F7F3",
    },
  },

  // Fresh Harvest Accent
  pear: {
    base: "#CFE73B",
    hex: "#CFE73B",
    rgb: "207, 231, 59",
    label: "Pear Green",
    roles: "High-contrast action buttons, stock urgency badges, active highlights",
    hover: "#BBD428",
    light: "#E7F384",
    tint: "#F5FBE0",
  },

  // Organic Botanical Midtone
  asparagus: {
    base: "#6A9B48",
    hex: "#6A9B48",
    rgb: "106, 155, 72",
    label: "Asparagus Green",
    roles: "Verified farmer badges, fresh tags, secondary interactive icons",
    hover: "#568137",
    light: "#87B566",
    tint: "#EAF3E4",
  },

  // Olive Sunlit Field Accent
  acid: {
    base: "#B5BA3E",
    hex: "#B5BA3E",
    rgb: "181, 186, 62",
    label: "Acid Green",
    roles: "Unit pricing chips, harvest season indicators, review stars",
    hover: "#9FA42E",
    light: "#CDD15E",
    tint: "#F6F7DC",
  },

  // Organic Cream Scale (Tactile Linen & Warm Earth)
  cream: {
    canvas: "#FAF8F2",     // Page background, clean warm parchment
    surface: "#FFFDF9",    // Elevated cards, modal sheets
    subtle: "#F2ECE0",     // Input fills, table row alternations
    border: "#E5DBC7",     // Card and section dividers
    gold: "#F7E9BC",       // Warm highlight banner, promo tags
    goldHover: "#EED794",  // Hover state for cream gold buttons
    textMuted: "#6E7E74",  // Neutral metadata text
    textDark: "#0D2E1C",   // High-contrast deep green body text
  },
} as const;

export const AGRICULTURAL_UNITS = [
  { id: "tuber", name: "Tuber", example: "Yam, Cassava", icon: "🥔" },
  { id: "basket", name: "Basket", example: "Tomatoes, Peppers", icon: "🧺" },
  { id: "crate", name: "Crate", example: "Eggplants, Fruits", icon: "📦" },
  { id: "bundle", name: "Bundle", example: "Ugwu, Spinach leaves", icon: "🌿" },
  { id: "bag", name: "50kg Bag", example: "Grains, Beans, Maize", icon: "🌾" },
] as const;

export const PRODUCE_CATEGORIES = [
  { id: 1, name: "Tubers & Roots", color: PALETTE.asparagus.base, bg: PALETTE.asparagus.tint, icon: "🥔" },
  { id: 2, name: "Vegetables", color: PALETTE.phthalo.base, bg: "#EAF3E4", icon: "🥬" },
  { id: 3, name: "Fruits", color: PALETTE.acid.base, bg: PALETTE.acid.tint, icon: "🍊" },
  { id: 4, name: "Grains & Cereals", color: "#8B6B2B", bg: PALETTE.cream.gold, icon: "🌾" },
  { id: 5, name: "Legumes & Beans", color: "#6A4B29", bg: "#F3ECE0", icon: "🫘" },
  { id: 6, name: "Peppers & Spices", color: "#B93826", bg: "#FBEAE8", icon: "🌶️" },
] as const;
