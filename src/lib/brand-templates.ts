import type { BrandTextField } from "./brand-types";

export interface ClothingBrandTemplate {
  name: string;
  category: string;
  image: string;
  colors: string[];
  fonts: string[];
  details: Partial<Record<BrandTextField, string>>;
}

// Editorial examples, never extracted facts or claims about the user's brand.
export const clothingBrandTemplates: ClothingBrandTemplate[] = [
  {
    name: "Everyday Essentials",
    category: "Minimal & Everyday",
    image: "essentials",
    colors: ["#E7DFD0", "#333A36", "#A8B5A2"],
    fonts: ["Inter", "Georgia"],
    details: {
      description:
        "An everyday clothing concept built around easy layers, relaxed knitwear and versatile wardrobe staples.",
      values: "Simplicity, comfort and considered design.",
      positioning: "Understated clothing for a versatile everyday wardrobe.",
      audience:
        "People who prefer easy-to-style clothing, neutral colors and comfortable silhouettes.",
      tone: "Clear, calm, warm and approachable.",
    },
  },
  {
    name: "Urban Collective",
    category: "Streetwear",
    image: "streetwear",
    colors: ["#181818", "#EBFF70", "#F5F5F5"],
    fonts: ["Space Grotesk", "Inter"],
    details: {
      description:
        "A streetwear concept combining oversized tees, hoodies and statement outerwear with expressive graphics.",
      values: "Self-expression, individuality and creative community.",
      positioning:
        "Expressive streetwear with distinctive silhouettes and graphic-led collections.",
      audience:
        "Style-conscious people drawn to urban culture, graphic clothing and relaxed fits.",
      tone: "Direct, energetic, confident and expressive.",
    },
  },
  {
    name: "Motion Studio",
    category: "Activewear",
    image: "activewear",
    colors: ["#26344B", "#DD5374", "#F0F2F4"],
    fonts: ["Inter", "Arial"],
    details: {
      description:
        "An activewear concept featuring coordinated leggings, training tops and layers for movement and everyday routines.",
      values: "Movement, confidence and everyday motivation.",
      positioning:
        "Versatile activewear that connects training and daily life.",
      audience:
        "People looking for coordinated workout clothing and comfortable, movement-focused styling.",
      tone: "Encouraging, positive, practical and energetic.",
    },
  },
  {
    name: "Atelier Edit",
    category: "Premium Fashion",
    image: "premium",
    colors: ["#452F35", "#EADFD3", "#FFFFFF"],
    fonts: ["Georgia", "Arial"],
    details: {
      description:
        "A contemporary fashion concept focused on tailored separates, elegant outerwear and a considered seasonal wardrobe.",
      values: "Thoughtful detail, restraint and personal style.",
      positioning:
        "Refined contemporary clothing with an editorial point of view.",
      audience:
        "People drawn to tailored silhouettes, subtle detailing and elevated wardrobe pieces.",
      tone: "Refined, thoughtful, confident and warm.",
    },
  },
  {
    name: "Indigo Works",
    category: "Denim & Workwear",
    image: "denim",
    colors: ["#283F59", "#BB8A51", "#EAE4D9"],
    fonts: ["Arial", "Georgia"],
    details: {
      description:
        "A denim and workwear concept featuring jeans, overshirts and utility-inspired jackets with visible construction details.",
      values: "Utility, character and attention to construction.",
      positioning: "Denim-led everyday clothing with a workwear influence.",
      audience:
        "People who appreciate denim, functional pockets and classic utility silhouettes.",
      tone: "Grounded, straightforward, knowledgeable and friendly.",
    },
  },
  {
    name: "Alpine Layers",
    category: "Outdoor & Outerwear",
    image: "outdoor",
    colors: ["#17658C", "#D2572B", "#EAF0F2"],
    fonts: ["Inter", "Arial"],
    details: {
      description:
        "An outdoor clothing concept centered on layered outfits, shell-inspired jackets and versatile trousers for time outside.",
      values: "Exploration, practicality and freedom of movement.",
      positioning:
        "Outdoor-inspired clothing with functional styling and bold color accents.",
      audience:
        "People who enjoy outdoor activities and prefer versatile layers and utility-led design.",
      tone: "Adventurous, clear, capable and welcoming.",
    },
  },
];
