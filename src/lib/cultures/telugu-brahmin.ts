import type { Culture, Ritual } from "../db/schema";
import { v4 as uuid } from "uuid";

// Telugu Brahmin Wedding Rituals - Comprehensive List
// Based on traditional Vedic Telugu Brahmin wedding customs

export const teluguBrahminRituals: Ritual[] = [
  // ============================================
  // PRE-WEDDING CEREMONIES
  // ============================================
  {
    id: uuid(),
    name: "Nischitartham",
    localName: "నిశ్చితార్థం",
    description:
      "The formal engagement ceremony where both families exchange rings and gifts. The wedding date is officially fixed.",
    significance:
      "Marks the formal agreement between families and confirms the marriage alliance.",
    typicalDuration: 120,
    typicalDay: -30, // 30 days before wedding
    requiredItems: [
      "Rings",
      "Turmeric",
      "Kumkum",
      "Coconuts",
      "Betel leaves",
      "Fruits",
      "New clothes",
      "Gold ornaments",
      "Sweets",
    ],
    participants: ["Bride", "Groom", "Both families", "Priest"],
    order: 1,
    isOptional: false,
    category: "pre-wedding",
  },
  {
    id: uuid(),
    name: "Pellikuthuru / Pellikoduku",
    localName: "పెళ్ళికూతురు / పెళ్ళికొడుకు",
    description:
      "Ceremonial bath for bride (Pellikuthuru) and groom (Pellikoduku) with turmeric paste. Done separately at respective homes.",
    significance:
      "Purification ritual to cleanse and beautify the bride and groom before marriage.",
    typicalDuration: 90,
    typicalDay: -2,
    requiredItems: [
      "Turmeric paste",
      "Sesame oil",
      "Sandalwood paste",
      "Rice flour",
      "Milk",
      "Rose water",
      "New clothes",
    ],
    participants: ["Bride/Groom", "Family elders", "Married women"],
    order: 2,
    isOptional: false,
    category: "pre-wedding",
  },
  {
    id: uuid(),
    name: "Snathakam",
    localName: "స్నాతకం",
    description:
      "The groom takes a sacred bath and declares his intention to pursue higher knowledge (symbolically wants to go to Varanasi). His father-in-law stops him and offers his daughter.",
    significance:
      "Represents the groom's pursuit of knowledge and his acceptance of grihastashram (married life).",
    typicalDuration: 60,
    typicalDay: -1,
    requiredItems: [
      "Umbrella",
      "Walking stick",
      "Slippers",
      "Sacred thread",
      "Rice",
      "Clothes",
    ],
    participants: ["Groom", "Bride's father", "Priest", "Family members"],
    order: 3,
    isOptional: false,
    category: "pre-wedding",
  },
  {
    id: uuid(),
    name: "Kashi Yatra",
    localName: "కాశీ యాత్ర",
    description:
      "The groom pretends to leave for Kashi (Varanasi) for higher studies. The bride's father convinces him to marry his daughter instead.",
    significance:
      "A humorous yet significant ritual symbolizing the value of married life over asceticism.",
    typicalDuration: 30,
    typicalDay: 0,
    requiredItems: [
      "Umbrella",
      "Walking stick",
      "Slippers",
      "Bundle (with rice and dal)",
    ],
    participants: ["Groom", "Bride's father", "Bride's brother", "Guests"],
    order: 4,
    isOptional: true,
    category: "pre-wedding",
  },
  {
    id: uuid(),
    name: "Vara Puja",
    localName: "వర పూజ",
    description:
      "The bride's parents welcome and honor the groom by washing his feet, offering flowers, and treating him as Lord Vishnu.",
    significance:
      "Shows respect and acceptance of the groom into the family.",
    typicalDuration: 30,
    typicalDay: 0,
    requiredItems: [
      "Kalasham",
      "Flowers",
      "Sandalwood paste",
      "Kumkum",
      "Coconut",
      "New clothes",
    ],
    participants: ["Groom", "Bride's parents", "Priest"],
    order: 5,
    isOptional: false,
    category: "pre-wedding",
  },
  {
    id: uuid(),
    name: "Madhuparkam",
    localName: "మధుపర్కం",
    description:
      "A mixture of honey, curd, and ghee is offered to the groom. This is followed by presenting new clothes.",
    significance:
      "A traditional welcome offering symbolizing sweetness and prosperity.",
    typicalDuration: 20,
    typicalDay: 0,
    requiredItems: ["Honey", "Curd", "Ghee", "New clothes"],
    participants: ["Groom", "Bride's parents"],
    order: 6,
    isOptional: false,
    category: "pre-wedding",
  },

  // ============================================
  // WEDDING DAY CEREMONIES (Main)
  // ============================================
  {
    id: uuid(),
    name: "Muhurtham / Kanyadanam",
    localName: "ముహూర్తం / కన్యాదానం",
    description:
      "The most sacred ritual where the bride's father gives away his daughter to the groom. Water is poured over the joined hands.",
    significance:
      "The most auspicious moment when the bride is formally given to the groom by her father.",
    typicalDuration: 45,
    typicalDay: 0,
    requiredItems: [
      "Kalasham",
      "Coconut",
      "Flowers",
      "Sandalwood paste",
      "Turmeric",
      "Kumkum",
      "Sacred thread",
    ],
    participants: ["Bride", "Groom", "Bride's parents", "Priest"],
    order: 7,
    isOptional: false,
    category: "wedding-day",
  },
  {
    id: uuid(),
    name: "Jeelakarra Bellam",
    localName: "జీలకర్ర బెల్లం",
    description:
      "Cumin seeds and jaggery paste is placed on the bride's and groom's heads. They try to remove the paste from each other's head.",
    significance:
      "Symbolizes the inseparable bond between husband and wife, like cumin and jaggery.",
    typicalDuration: 15,
    typicalDay: 0,
    requiredItems: ["Cumin seeds", "Jaggery", "Banana leaves"],
    participants: ["Bride", "Groom", "Priest"],
    order: 8,
    isOptional: false,
    category: "wedding-day",
  },
  {
    id: uuid(),
    name: "Talambralu",
    localName: "తలంబ్రాలు",
    description:
      "The bride and groom shower each other with rice mixed with turmeric (Akshintalu). A playful and joyous ceremony.",
    significance:
      "Symbolizes prosperity and is believed to ward off evil spirits.",
    typicalDuration: 15,
    typicalDay: 0,
    requiredItems: [
      "Rice",
      "Turmeric",
      "Flowers",
      "Coconuts",
      "Betel leaves",
    ],
    participants: ["Bride", "Groom", "Guests"],
    order: 9,
    isOptional: false,
    category: "wedding-day",
  },
  {
    id: uuid(),
    name: "Mangalsutra Dharana",
    localName: "మంగళసూత్ర ధారణ",
    description:
      "The groom ties the sacred Mangalsutra (two golden pendants on a yellow thread) around the bride's neck with three knots.",
    significance:
      "The most important symbol of marriage. The three knots represent commitment of body, mind, and soul.",
    typicalDuration: 15,
    typicalDay: 0,
    requiredItems: ["Mangalsutra", "Turmeric thread"],
    participants: ["Bride", "Groom", "Groom's sister", "Priest"],
    order: 10,
    isOptional: false,
    category: "wedding-day",
  },
  {
    id: uuid(),
    name: "Saptapadi",
    localName: "సప్తపది",
    description:
      "The couple takes seven steps together around the sacred fire, each step representing a vow for their married life.",
    significance:
      "The seven vows form the foundation of their married life covering food, strength, prosperity, family, progeny, health, and friendship.",
    typicalDuration: 30,
    typicalDay: 0,
    requiredItems: ["Sacred fire", "Ghee", "Rice", "Flowers"],
    participants: ["Bride", "Groom", "Priest"],
    order: 11,
    isOptional: false,
    category: "wedding-day",
  },
  {
    id: uuid(),
    name: "Arundhati Nakshatra Darshanam",
    localName: "అరుంధతి నక్షత్ర దర్శనం",
    description:
      "The couple is shown the Arundhati star (if visible) or a symbolic representation. Arundhati is the epitome of a devoted wife.",
    significance:
      "Blesses the couple to have a devoted and harmonious married life like Sage Vasishta and Arundhati.",
    typicalDuration: 10,
    typicalDay: 0,
    requiredItems: ["None (star gazing)"],
    participants: ["Bride", "Groom", "Priest"],
    order: 12,
    isOptional: true,
    category: "wedding-day",
  },
  {
    id: uuid(),
    name: "Sthalipakam",
    localName: "స్థాలీపాకం",
    description:
      "The couple cooks rice together for the first time. The bride and groom jointly prepare pongal (sweet rice).",
    significance:
      "Symbolizes their first act as a married couple, working together to sustain their family.",
    typicalDuration: 30,
    typicalDay: 0,
    requiredItems: ["Rice", "Milk", "Jaggery", "Ghee", "New pot"],
    participants: ["Bride", "Groom"],
    order: 13,
    isOptional: true,
    category: "wedding-day",
  },
  {
    id: uuid(),
    name: "Nagavalli",
    localName: "నాగవల్లి",
    description:
      "A ritual involving decorating the bride with jewelry and seeking blessings from elders.",
    significance:
      "The bride is adorned as Goddess Lakshmi and receives blessings.",
    typicalDuration: 45,
    typicalDay: 0,
    requiredItems: ["Jewelry", "New saree", "Flowers", "Kumkum"],
    participants: ["Bride", "Female relatives", "Elders"],
    order: 14,
    isOptional: true,
    category: "wedding-day",
  },
  {
    id: uuid(),
    name: "Ashirvadham",
    localName: "ఆశీర్వాదం",
    description:
      "All elders and guests bless the newly married couple by showering rice and flowers.",
    significance:
      "Receiving blessings from all guests for a happy and prosperous married life.",
    typicalDuration: 60,
    typicalDay: 0,
    requiredItems: ["Rice", "Flowers", "Kumkum", "Turmeric"],
    participants: ["Bride", "Groom", "All guests"],
    order: 15,
    isOptional: false,
    category: "wedding-day",
  },

  // ============================================
  // POST-WEDDING CEREMONIES
  // ============================================
  {
    id: uuid(),
    name: "Appaginthalu / Vidaai",
    localName: "అప్పగింతలు / విడాయి",
    description:
      "The emotional farewell ceremony where the bride leaves her parental home. She throws rice over her shoulder.",
    significance:
      "Symbolizes the bride's gratitude and prayers for her parents' prosperity as she begins her new life.",
    typicalDuration: 30,
    typicalDay: 0,
    requiredItems: ["Rice", "Coconut", "Turmeric water"],
    participants: ["Bride", "Bride's family", "Groom"],
    order: 16,
    isOptional: false,
    category: "post-wedding",
  },
  {
    id: uuid(),
    name: "Griha Pravesham",
    localName: "గృహ ప్రవేశం",
    description:
      "The bride enters her new home for the first time. She kicks over a pot of rice with her right foot.",
    significance:
      "Symbolizes abundance and prosperity entering the home with the new bride.",
    typicalDuration: 30,
    typicalDay: 0,
    requiredItems: [
      "Rice pot",
      "Kumkum",
      "Flowers",
      "Milk",
      "Lamp",
      "Rangoli",
    ],
    participants: ["Bride", "Groom", "Groom's family"],
    order: 17,
    isOptional: false,
    category: "post-wedding",
  },
  {
    id: uuid(),
    name: "Satyanarayana Vratam",
    localName: "సత్యనారాయణ వ్రతం",
    description:
      "A puja performed by the newlywed couple to seek Lord Vishnu's blessings for a harmonious married life.",
    significance:
      "Brings prosperity, harmony, and removes obstacles from married life.",
    typicalDuration: 120,
    typicalDay: 1,
    requiredItems: [
      "Puja items",
      "Banana leaves",
      "Fruits",
      "Flowers",
      "Prasadam ingredients",
    ],
    participants: ["Bride", "Groom", "Priest", "Family"],
    order: 18,
    isOptional: true,
    category: "post-wedding",
  },
  {
    id: uuid(),
    name: "Reception",
    localName: "రిసెప్షన్",
    description:
      "A grand celebration where the newlywed couple is introduced to extended family and friends from both sides.",
    significance:
      "Social celebration to formally introduce the couple to the larger community.",
    typicalDuration: 240,
    typicalDay: 1,
    requiredItems: ["Stage decoration", "Catering", "Photography", "Music"],
    participants: ["Bride", "Groom", "All guests"],
    order: 19,
    isOptional: true,
    category: "post-wedding",
  },
  {
    id: uuid(),
    name: "Pelli Raatri",
    localName: "పెళ్ళి రాత్రి",
    description:
      "The first night after marriage. The room is decorated and milk with almonds is served to the couple.",
    significance:
      "The couple spends their first night together as husband and wife.",
    typicalDuration: 60,
    typicalDay: 0,
    requiredItems: [
      "Room decoration",
      "Flowers",
      "Milk",
      "Dry fruits",
      "Jasmine garlands",
    ],
    participants: ["Bride", "Groom"],
    order: 20,
    isOptional: false,
    category: "post-wedding",
  },
];

export const teluguBrahminCulture: Culture = {
  id: "telugu-brahmin",
  name: "Telugu Brahmin",
  region: "Andhra Pradesh, Telangana",
  religion: "Hindu",
  description:
    "Traditional Vedic Telugu Brahmin wedding ceremonies following ancient customs and rituals passed down through generations. Known for elaborate rituals, sacred mantras, and beautiful ceremonies that span multiple days.",
  isCustom: false,
  rituals: teluguBrahminRituals,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Budget Categories typical for Telugu Brahmin wedding
export const teluguBrahminBudgetCategories = [
  { name: "Venue & Mandapam", color: "#FF6B6B", icon: "🏛️", order: 1 },
  { name: "Catering & Food", color: "#4ECDC4", icon: "🍛", order: 2 },
  { name: "Priest & Pooja Items", color: "#FFE66D", icon: "🪔", order: 3 },
  { name: "Bride's Jewelry", color: "#F7DC6F", icon: "💎", order: 4 },
  { name: "Bride's Sarees & Outfits", color: "#BB8FCE", icon: "👗", order: 5 },
  { name: "Groom's Outfits", color: "#85C1E9", icon: "👔", order: 6 },
  { name: "Photography & Videography", color: "#82E0AA", icon: "📸", order: 7 },
  { name: "Decoration & Flowers", color: "#F1948A", icon: "💐", order: 8 },
  { name: "Music & Entertainment", color: "#D7BDE2", icon: "🎵", order: 9 },
  { name: "Gifts & Tamboolam", color: "#F8C471", icon: "🎁", order: 10 },
  { name: "Guest Accommodation", color: "#7FB3D5", icon: "🏨", order: 11 },
  { name: "Transportation", color: "#F7DC6F", icon: "🚗", order: 12 },
  { name: "Invitation Cards", color: "#AED6F1", icon: "💌", order: 13 },
  { name: "Mehendi & Beauty", color: "#FADBD8", icon: "💅", order: 14 },
  { name: "Mangalsutra & Wedding Items", color: "#FCF3CF", icon: "📿", order: 15 },
  { name: "Miscellaneous", color: "#D5DBDB", icon: "📦", order: 16 },
];

