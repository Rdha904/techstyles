export const brandTextFields = [
  "name",
  "website",
  "description",
  "values",
  "positioning",
  "audience",
  "tone",
] as const;
export type BrandTextField = (typeof brandTextFields)[number];
export type BrandField =
  BrandTextField | "colors" | "fonts" | "logo" | "referenceImages";
export const brandLabels: Record<BrandField, string> = {
  name: "Brand name",
  website: "Website",
  description: "Brand description",
  values: "Brand values",
  positioning: "Positioning",
  audience: "Target audience",
  tone: "Tone of voice",
  colors: "Brand colors",
  fonts: "Typography",
  logo: "Logo",
  referenceImages: "Reference images",
};
export interface BrandAsset {
  name: string;
  url: string;
}
export interface BrandEvidence {
  field: BrandField;
  value: string;
  source: string;
  excerpt: string;
}
export interface BrandProfile {
  name: string;
  website: string;
  description: string;
  values: string;
  positioning: string;
  audience: string;
  tone: string;
  colors: string[];
  fonts: string[];
  logo: BrandAsset | null;
  referenceImages: BrandAsset[];
  evidence: BrandEvidence[];
  revision: number;
  updatedAt: string;
}
export interface BrandSuggestion extends BrandEvidence {
  id: string;
}
export interface BrandImport {
  suggestions: BrandSuggestion[];
  warnings: string[];
  sources: string[];
}
export function emptyBrandProfile(): BrandProfile {
  return {
    name: "",
    website: "",
    description: "",
    values: "",
    positioning: "",
    audience: "",
    tone: "",
    colors: [],
    fonts: [],
    logo: null,
    referenceImages: [],
    evidence: [],
    revision: 0,
    updatedAt: "",
  };
}
