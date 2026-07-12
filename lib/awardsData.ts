/**
 * Single source of truth for Awards & Recognition section data.
 * Content is transcribed as-given — do NOT paraphrase or invent
 * years/details here. Anything marked "// TODO" needs confirmation
 * from Sir Andi before going live.
 */

export interface FeaturedAward {
  id: string;
  title: string;
  grantor: string;
  /** Leave undefined if the year wasn't provided — never guess. */
  year?: string;
  description: string;
}

export interface Recognition {
  id: string;
  text: string;
}

// ─── Tier 1: Featured formal awards (become constellation nodes) ────────
export const FEATURED_AWARDS: FeaturedAward[] = [
  {
    id: "military-innovation",
    title: "Military Innovation Award",
    grantor: "Kementerian Komunikasi dan Informatika (Kominfo)",
    year: undefined, // TODO: confirm year with Sir Andi
    description: "Rocket Scoring System untuk jet tempur Sukhoi SU27-30 & F16.",
  },
  {
    id: "markplus-innovation",
    title: "Markplus Innovation Awards",
    grantor: "MarkPlus Inc.",
    year: undefined, // TODO: confirm year with Sir Andi
    description: "Diberikan untuk aplikasi ManadoPost.id.",
  },
  {
    id: "best-indonesian-ip",
    title: "Best Indonesian IP — Manguni Squad",
    grantor: "BEKRAF KATAPEL 2nd Batch",
    year: "2019",
    description:
      "Manguni Squad mewakili Indonesia ke Licensing Expo Internasional.",
  },
  {
    id: "aki-2023-champion",
    title: "Pemenang Terbaik AKI 2023",
    grantor: "Asosiasi Kreasi Indonesia · Menparekraf",
    year: "2023",
    description: "Wardeka mewakili Sulawesi Utara dan meraih juara nasional.",
  },
  {
    id: "tniau-training-innovation",
    title: "Awards of Military Training Innovation",
    grantor: "TNI-AU",
    year: undefined, // TODO: confirm year with Sir Andi
    description: "Simulasi latihan tembak VR untuk pelatihan militer.",
  },
];

// ─── Tier 2: Recognitions / milestones (ticker, not nodes) ──────────────
export const RECOGNITIONS: Recognition[] = [
  {
    id: "aki-2023-finalist",
    text: "Finalis Terbaik 2023 Apresiasi Kreasi Indonesia — kategori Aplikasi dan Game (BigDade Studio)",
  },
  {
    id: "menparekraf-ar-tshirt",
    text: "Apresiasi dari Menparekraf — peluncuran aplikasi Digital T-shirt (AR)",
  },
  {
    id: "esports-national",
    text: "Wardeka ditetapkan resmi sebagai disiplin esports nasional",
  },
  {
    id: "porprov-xii",
    text: "Wardeka menjadi cabang olahraga resmi PORPROV XII Sulawesi Utara (Kota Manado 2025)",
  },
  {
    id: "first-tournament",
    text: "Turnamen esports shooter lokal Indonesia pertama, peserta dari Sabang–Merauke",
  },
  {
    id: "ministers-recognition",
    text: "Apresiasi dari 5 menteri, Wapres, dan Gubernur (Menpar, Menpora, Wapres, Menekraf, Menkominfo, serta Bekraf & Gubernur Sulut)",
  },
];
