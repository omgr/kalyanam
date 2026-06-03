import { Culture } from "../db/schema";
import { teluguBrahminCulture, teluguBrahminBudgetCategories } from "./telugu-brahmin";
import { hinduNorthIndianCulture } from "./hindu-north";
import { hinduSouthIndianCulture } from "./hindu-south";
import { muslimCulture } from "./muslim";
import { christianCulture } from "./christian";

// Export all cultures
export {
  teluguBrahminCulture,
  teluguBrahminBudgetCategories,
  hinduNorthIndianCulture,
  hinduSouthIndianCulture,
  muslimCulture,
  christianCulture,
};

// All available cultures
export const allCultures: Culture[] = [
  teluguBrahminCulture,
  hinduSouthIndianCulture,
  hinduNorthIndianCulture,
  muslimCulture,
  christianCulture,
];

// Get culture by ID
export function getCultureById(id: string): Culture | undefined {
  return allCultures.find((c) => c.id === id);
}

// Get cultures by religion
export function getCulturesByReligion(religion: string): Culture[] {
  return allCultures.filter(
    (c) => c.religion?.toLowerCase() === religion.toLowerCase()
  );
}

// Get cultures by region
export function getCulturesByRegion(region: string): Culture[] {
  return allCultures.filter((c) =>
    c.region?.toLowerCase().includes(region.toLowerCase())
  );
}

// Create a custom culture template
export function createCustomCulture(
  name: string,
  description?: string,
  region?: string,
  religion?: string
): Culture {
  return {
    id: `custom-${Date.now()}`,
    name,
    description,
    region,
    religion,
    isCustom: true,
    rituals: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Default budget categories (culture-agnostic)
export const defaultBudgetCategories = [
  { name: "Venue", color: "#FF6B6B", icon: "🏛️", order: 1 },
  { name: "Catering", color: "#4ECDC4", icon: "🍽️", order: 2 },
  { name: "Photography", color: "#82E0AA", icon: "📸", order: 3 },
  { name: "Decorations", color: "#F1948A", icon: "💐", order: 4 },
  { name: "Attire & Accessories", color: "#BB8FCE", icon: "👗", order: 5 },
  { name: "Music & Entertainment", color: "#D7BDE2", icon: "🎵", order: 6 },
  { name: "Transportation", color: "#F7DC6F", icon: "🚗", order: 7 },
  { name: "Accommodation", color: "#7FB3D5", icon: "🏨", order: 8 },
  { name: "Invitations", color: "#AED6F1", icon: "💌", order: 9 },
  { name: "Gifts", color: "#F8C471", icon: "🎁", order: 10 },
  { name: "Officiant/Religious", color: "#FFE66D", icon: "🙏", order: 11 },
  { name: "Miscellaneous", color: "#D5DBDB", icon: "📦", order: 12 },
];

