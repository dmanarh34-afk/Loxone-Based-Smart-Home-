// Catalogue and shop info for DOTKAD MINI MALL.
// Shelf-stable groceries and household brands commonly stocked in Ghanaian supermarkets,
// plus a selection of imported American favourites.
//
// Product photos are from Open Food Facts (https://openfoodfacts.org), licensed CC BY-SA 3.0,
// and are stored in /public/products/<barcode>.jpg.
//
// Replace these with calls to the backend API when it's ready —
// the rest of the app only goes through the helper functions at the bottom.
import type { Category, Product, ProductTag } from "./types";

export const MALL = {
  name: "DOTKAD MINI MALL",
  tagline: "Groceries & everyday essentials",
  address: "12 Market Street, City Centre",
  phone: "+1 (555) 010-2030",
  email: "hello@dotkadmall.example",
  hours: [
    { days: "Mon – Fri", time: "7:00 AM – 9:00 PM" },
    { days: "Saturday", time: "8:00 AM – 9:00 PM" },
    { days: "Sunday", time: "10:00 AM – 6:00 PM" },
  ],
  /** Service fee applied to small baskets. */
  serviceFeeRate: 0.02,
  /** Baskets at or above this subtotal pay no service fee. */
  freeServiceThreshold: 300,
  deliveryFee: 20,
};

export const CATEGORIES: Category[] = [
  { id: "grains", name: "Rice, Grains & Pasta", emoji: "🍚", color: "#ca8a04" },
  { id: "cooking", name: "Cooking Essentials", emoji: "🫙", color: "#dc2626" },
  { id: "canned", name: "Canned Foods", emoji: "🥫", color: "#ea580c" },
  { id: "milk", name: "Milk", emoji: "🥛", color: "#2563eb" },
  { id: "hotdrinks", name: "Tea, Coffee & Cocoa", emoji: "☕", color: "#92400e" },
  { id: "breakfast", name: "Breakfast & Spreads", emoji: "🥣", color: "#d97706" },
  { id: "drinks", name: "Soft Drinks & Water", emoji: "🧃", color: "#0891b2" },
  { id: "snacks", name: "Biscuits & Snacks", emoji: "🍪", color: "#7c3aed" },
  { id: "baby", name: "Baby Care", emoji: "🍼", color: "#db2777" },
  { id: "skincare", name: "Lotions & Hand Creams", emoji: "🧴", color: "#0d9488" },
  { id: "fragrance", name: "Perfumes & Body Mists", emoji: "💐", color: "#c026d3" },
  { id: "toiletries", name: "Toiletries", emoji: "🧼", color: "#0284c7" },
];

type Row = [
  code: string,
  categoryId: string,
  brand: string,
  name: string,
  unit: string,
  price: number,
  description: string,
  extra?: { oldPrice?: number; tags?: ProductTag[]; stock?: number; rating?: number },
];

// prettier-ignore
const ROWS: Row[] = [
  // Rice, Grains & Pasta
  ["9356922000019", "grains", "Royal Feast", "Delight Jasmine Rice", "5 kg bag", 165, "Fragrant long-grain jasmine rice, perfect for jollof and plain rice.", { tags: ["bestseller"], rating: 4.8 }],
  ["6034000153156", "grains", "Sunny Gold", "Gari", "1 kg", 22, "Crisp, fine-grain cassava gari for soakings and eba.", { rating: 4.6 }],
  ["6156000051161", "grains", "Golden Penny", "Semovita", "1 kg", 35, "Premium semolina for smooth, lump-free swallow.", {}],
  ["5000184592372", "grains", "Napolina", "Spaghetti", "500 g", 18, "Durum wheat spaghetti that cooks in 10 minutes.", {}],
  ["6034000390261", "grains", "Indomie", "Onion Chicken Instant Noodles", "Belle Full pack", 7, "Ghana's favourite noodles, onion chicken flavour.", { tags: ["bestseller"], rating: 4.9 }],
  ["0089686130270", "grains", "Indomie", "Pepper Chicken Instant Noodles", "70 g", 6.5, "Spicy pepper chicken flavour, ready in 3 minutes.", {}],
  ["5060735420011", "grains", "Kub's", "Bofrot Puff Puff Mix", "400 g", 28, "Just add water for soft, golden bofrot at home.", { tags: ["new"] }],

  // Cooking Essentials
  ["6034000190144", "cooking", "Frytol", "Vegetable Cooking Oil", "1 L", 48, "Pure, cholesterol-free vegetable oil for frying and stews.", { tags: ["bestseller"], rating: 4.7 }],
  ["6186000195053", "cooking", "Aya", "Vegetable Oil", "1 L", 42, "Light vegetable oil for seasoning, cooking and frying.", { oldPrice: 48, tags: ["sale"] }],
  ["8410300362111", "cooking", "Gino", "Tomato Paste", "210 g tin", 12, "Rich double-concentrated tomato paste for stews and jollof.", { tags: ["bestseller"], rating: 4.8 }],
  ["8410300361435", "cooking", "Gino", "Tomato Seasoning Mix", "Sachet", 4, "Tomato, onion and spice mix for quick, tasty stews.", {}],
  ["6171100031790", "cooking", "Maggi", "Seasoning Cubes", "400 g · 100 cubes", 45, "The classic seasoning cube for soups, stews and rice.", { rating: 4.7 }],
  ["6008155016550", "cooking", "Onga", "Seasoning Powder", "Jar", 25, "Savoury all-purpose seasoning powder.", {}],
  ["8712566432363", "cooking", "Knorr", "Chicken Cubes", "54 g", 15, "Chicken stock cubes for deep, homemade flavour.", {}],
  ["3454302004308", "cooking", "Iodised", "Sea Salt", "1 kg", 8, "Fine iodised sea salt for everyday cooking.", {}],
  ["6944941901016", "cooking", "Suppa Awo", "Dark Soy Sauce", "250 ml", 18, "Rich dark soy sauce for fried rice and marinades.", {}],
  ["50457243", "cooking", "Heinz", "Tomato Ketchup", "460 g", 42, "The classic thick and rich tomato ketchup.", {}],

  // Canned Foods
  ["3553460000310", "canned", "Titus", "Sardines in Sunflower Oil", "125 g tin", 18, "Tender sardines in sunflower oil. Great with bread or gari.", { tags: ["bestseller"], rating: 4.7 }],
  ["0071140302231", "canned", "Geisha", "Mackerel in Hot Tomato Sauce", "155 g tin", 15, "Mackerel in a spicy tomato sauce, ready to eat.", { oldPrice: 18, tags: ["sale"] }],
  ["5000157071644", "canned", "Heinz", "Baked Beanz", "415 g tin", 22, "Beans in a rich tomato sauce, perfect for breakfast.", {}],

  // Milk
  ["8716200449250", "milk", "Peak", "Full Cream Milk Powder", "900 g tin", 165, "Rich and creamy full cream milk powder.", { tags: ["bestseller"], rating: 4.8 }],
  ["6033000088635", "milk", "Nestlé Ideal", "Evaporated Milk", "160 g tin", 9, "Creamy evaporated milk for tea, porridge and baking.", { rating: 4.6 }],
  ["6033000083708", "milk", "Nestlé Nido", "Essentia Milk Powder", "365 g", 75, "Fortified milk powder for the whole family.", {}],
  ["6008155011470", "milk", "Cowbell", "Milk Powder", "400 g pouch", 55, "Instant milk powder with vitamins and minerals.", { oldPrice: 62, tags: ["sale"] }],

  // Tea, Coffee & Cocoa
  ["6033000088031", "hotdrinks", "Nestlé Milo", "Energy Food Drink", "400 g", 60, "Chocolate malt drink packed with energy for the day.", { tags: ["bestseller"], rating: 4.9 }],
  ["7622201766269", "hotdrinks", "Cadbury", "Bournvita", "500 g", 70, "Chocolate malt drink with vitamins and minerals.", {}],
  ["5000201001085", "hotdrinks", "Richoco", "Cocoa Drink", "1 kg", 85, "Rich chocolate drink powder, great hot or cold.", {}],
  ["6033000080493", "hotdrinks", "Chocolim", "Cocoa Drink", "Pouch", 40, "Chocolate drink powder for breakfast.", { tags: ["new"] }],
  ["6033000231215", "hotdrinks", "Top Choco", "Pure Cocoa Powder", "Tub", 45, "100% pure cocoa powder for drinks and baking.", {}],
  ["4800361393645", "hotdrinks", "Nescafé", "Classic Instant Coffee", "50 g", 35, "Rich, full-flavoured instant coffee.", {}],
  ["6008155002027", "hotdrinks", "Cowbell", "Coffee Milk Drink", "Sachet pack", 25, "Creamy 3-in-1 coffee with milk.", { tags: ["new"] }],
  ["6033000298874", "hotdrinks", "Lipton", "Yellow Label Tea", "25 tea bags", 22, "Bright, refreshing black tea.", { rating: 4.6 }],

  // Breakfast & Spreads
  ["6154000101022", "breakfast", "Kellogg's", "Corn Flakes", "450 g", 55, "Crispy golden corn flakes, the breakfast classic.", { rating: 4.6 }],
  ["6154000101091", "breakfast", "Kellogg's", "Coco Pops", "375 g", 60, "Chocolatey rice cereal that turns milk chocolatey.", { oldPrice: 68, tags: ["sale"] }],
  ["6151100032973", "breakfast", "Nestlé", "Golden Morn", "500 g", 45, "Maize and soya cereal, rich in protein.", { tags: ["bestseller"] }],
  ["6034000514032", "breakfast", "Sika", "Cereal Mix", "1.5 kg", 70, "Nutritious cereal mix for hearty porridge.", {}],
  ["6545632540011", "breakfast", "Mummy's Joy", "Tom Brown", "500 g", 30, "Roasted grain porridge mix, a Ghanaian favourite.", { tags: ["new"] }],
  ["6034000482034", "breakfast", "Blue Band", "Spread for Bread", "450 g", 32, "Smooth spread for bread with vitamins A & D.", { rating: 4.7 }],
  ["0839675002855", "breakfast", "Golden Tree", "Choco Delight Spread", "500 g", 45, "Ghanaian chocolate spread made with local cocoa.", { tags: ["bestseller"] }],
  ["6001200007732", "breakfast", "Red Bicycle", "Chocnut Spread", "750 g", 75, "Chocolate and nut spread for bread and pancakes.", {}],
  ["6156000051512", "breakfast", "Golden Penny", "White Cube Sugar", "500 g · 90 cubes", 25, "Neat sugar cubes for tea and coffee.", {}],
  ["6034000153101", "breakfast", "Sunny Gold", "Brown Sugar", "1 kg", 22, "Natural brown sugar for drinks and baking.", {}],

  // Soft Drinks & Water
  ["6034000048018", "drinks", "Voltic", "Natural Mineral Water", "1.5 L", 7, "Pure natural mineral water.", { tags: ["bestseller"], rating: 4.7 }],
  ["5000213019160", "drinks", "Malta Guinness", "Non-Alcoholic Malt Drink", "330 ml", 12, "Rich, energising malt drink. Best served chilled.", { tags: ["bestseller"], rating: 4.8 }],
  ["9501053210466", "drinks", "Kalyppo", "Orange Fruit Drink", "250 ml", 4, "The lunchbox favourite, orange flavour.", {}],
  ["6034000054125", "drinks", "Ekumfi", "Pure Pineapple Juice", "250 ml", 9, "100% Ghanaian pineapple juice, no added sugar.", { tags: ["new"] }],
  ["5038896000205", "drinks", "Blue Skies", "Pineapple Juice", "1 L", 35, "Freshly pressed pineapple juice made in Ghana.", {}],
  ["57045399", "drinks", "Coca-Cola", "Original Taste", "500 ml", 10, "Ice-cold refreshment.", {}],
  ["5449000258304", "drinks", "Fanta", "Orange", "500 ml", 10, "Bright, bubbly orange soft drink.", {}],
  ["6164003477475", "drinks", "Lucozade", "Energy Original", "380 ml", 15, "Sparkling glucose energy drink.", { oldPrice: 18, tags: ["sale"] }],
  ["5010438020186", "drinks", "Vimto", "Fizzy Fruit Drink", "330 ml", 10, "Grape, raspberry and blackcurrant soft drink.", {}],

  // Biscuits & Snacks
  ["0839675207557", "snacks", "Golden Tree", "Premium Dark Chocolate", "100 g", 22, "Made in Ghana with Ghanaian cocoa.", { tags: ["bestseller"], rating: 4.8 }],
  ["5053990111503", "snacks", "Pringles", "Original Crisps", "165 g", 45, "Stackable, crunchy potato crisps.", {}],
  ["5000396015935", "snacks", "McVitie's", "Digestive Biscuits", "400 g", 35, "The original wheatmeal biscuit.", {}],
  ["7622210625243", "snacks", "Oreo", "Golden Sandwich Biscuits", "10 × 22 g", 30, "Golden biscuits with vanilla creme.", { oldPrice: 35, tags: ["sale"] }],
  ["6034000166163", "snacks", "Bonita", "Petit Beurre Biscuits", "Pack", 8, "Light, buttery tea biscuits.", {}],
  ["8888101430276", "snacks", "Munchee", "Super Cream Cracker", "85 g", 6, "Crisp, light crackers.", {}],
  ["6034000568080", "snacks", "Ginger", "Ginger Biscuits", "75 g", 5, "Spicy, crunchy ginger biscuits.", {}],
  ["6186000648061", "snacks", "NutriSnax", "Digestive Biscuits", "84 g", 6, "Oat digestive biscuits made in Ghana.", { tags: ["new"] }],
  ["6027000843608", "snacks", "Cashew Daddy", "Roasted Cashew Nuts", "100 g jar", 30, "Crunchy roasted Ghanaian cashews.", { rating: 4.9 }],

  // Baby Care (+ the Olay body wash, now under Toiletries; it stays here to keep its id)
  ["6033000084736", "baby", "Nestlé", "Cerelac Infant Cereal", "400 g", 65, "Wheat infant cereal with milk, from 6 months.", { rating: 4.8 }],
  ["8886472101689", "baby", "SMA", "Gold Infant Formula", "400 g", 180, "First infant milk, from birth.", { stock: 6 }],
  ["0037000424314", "toiletries", "Olay", "Ultra Moisture Shea Butter Body Wash", "700 ml", 120, "Moisturising body wash with shea butter.", {}],

  // American favourites — imported from US supermarkets.
  // Kept at the end of the list because product ids are positional (carts store ids).
  ["0021000658831", "grains", "Kraft", "Original Mac & Cheese", "7.25 oz (206 g)", 35, "The classic American macaroni with cheesy sauce mix, ready in minutes.", { tags: ["new"], rating: 4.7 }],
  ["0051500255162", "breakfast", "Jif", "Creamy Peanut Butter", "16 oz (454 g)", 85, "Smooth, roasted peanut butter, a US lunchbox staple.", { tags: ["new"], rating: 4.8 }],
  ["0016000124790", "breakfast", "Cheerios", "Honey Nut Cheerios", "10.8 oz (306 g)", 95, "Whole grain oat cereal sweetened with real honey.", { rating: 4.7 }],
  ["0030000010204", "breakfast", "Quaker", "Old Fashioned Rolled Oats", "18 oz (510 g)", 70, "100% whole grain rolled oats for hearty oatmeal and baking.", {}],
  ["0038000223006", "breakfast", "Kellogg's", "Pop-Tarts Frosted Strawberry", "16 pastries · 27 oz", 120, "Frosted toaster pastries with strawberry filling.", { tags: ["new"] }],
  ["0051000012616", "canned", "Campbell's", "Cream of Mushroom Soup", "10.5 oz (298 g) tin", 30, "Condensed soup, great on its own or as a sauce base.", {}],
  ["0028400517799", "snacks", "Doritos", "Nacho Cheese Tortilla Chips", "Party size · 411 g", 75, "Bold nacho cheese tortilla chips, big enough to share.", { tags: ["bestseller"], rating: 4.8 }],
  ["0028400589864", "snacks", "Cheetos", "Crunchy Cheese Snacks", "8.5 oz (241 g)", 55, "Crunchy corn puffs made with real cheese.", {}],
  ["0014100085478", "snacks", "Pepperidge Farm", "Goldfish Cheddar Crackers", "6.6 oz (187 g)", 48, "Baked cheddar crackers shaped like little fish.", { tags: ["new"] }],
  ["0044000031114", "snacks", "Ritz", "Original Crackers", "13.7 oz (388 g)", 65, "Buttery, flaky round crackers. Perfect with cheese.", {}],
  ["0044000032029", "snacks", "Oreo", "Chocolate Sandwich Cookies", "14.3 oz (405 g)", 60, "Milk's favourite cookie, with classic vanilla creme.", { oldPrice: 70, tags: ["sale"] }],
  ["0034000002405", "snacks", "Hershey's", "Milk Chocolate Bar", "1.55 oz (43 g)", 18, "The classic American milk chocolate bar.", {}],
  ["0012000001291", "drinks", "Pepsi", "Cola", "20 fl oz (591 ml)", 14, "Crisp, refreshing American cola.", {}],
  ["07831504", "drinks", "Dr Pepper", "Original", "12 fl oz (355 ml) can", 15, "A unique blend of 23 flavours. Best served ice-cold.", { tags: ["new"] }],

  // Lotions & Hand Creams
  ["4005808713059", "skincare", "Nivea", "Shea Smooth Body Lotion", "625 ml", 95, "48-hour moisture with shea butter for dry skin.", { tags: ["bestseller"], rating: 4.8 }],
  ["8712561484398", "skincare", "Vaseline", "Intensive Care Essential Healing Lotion", "400 ml", 75, "Everyday body lotion with micro-droplets of Vaseline jelly.", { rating: 4.7 }],
  ["8712561478762", "skincare", "Vaseline", "Intensive Care Advanced Repair Lotion", "200 ml", 50, "Unscented lotion that repairs very dry skin.", {}],
  ["0019100109995", "skincare", "Jergens", "Ultra Healing Moisturizer", "621 ml", 130, "Extra-dry skin lotion with vitamins C, E and B5.", { tags: ["new"] }],
  ["0772618078008", "skincare", "Cetaphil", "Moisturizing Lotion", "Pump bottle", 220, "Gentle, fragrance-free lotion for dry and sensitive skin.", { rating: 4.8 }],
  ["4005900890504", "skincare", "Nivea", "Soft Moisturising Cream", "200 ml jar", 60, "Light, fast-absorbing cream for face, hands and body.", {}],
  ["0722510027000", "skincare", "O'Keeffe's", "Working Hands Hand Cream", "2.7 oz (76 g) jar", 85, "Concentrated hand cream for extremely dry, cracked hands.", { tags: ["new"], rating: 4.8 }],
  ["0072140633820", "skincare", "Eucerin", "Advanced Repair Hand Cream", "2.7 oz (75 ml)", 110, "Fragrance-free hand cream with ceramides for very dry skin.", {}],
  ["4005808274628", "skincare", "Atrix", "Intensive Protection Hand Cream", "Tube", 45, "Rich, protective hand cream with camomile.", { oldPrice: 55, tags: ["sale"] }],

  // Perfumes & Body Mists
  ["3145891165203", "fragrance", "Chanel", "Coco Mademoiselle Eau de Parfum", "100 ml", 2450, "Fresh, oriental fragrance with orange, rose and patchouli.", { rating: 4.9, stock: 4 }],
  ["3348901321129", "fragrance", "Dior", "Sauvage Eau de Toilette", "200 ml", 2300, "Fresh, spicy men's fragrance with bergamot and ambroxan.", { tags: ["bestseller"], rating: 4.9, stock: 5 }],
  ["8435415012669", "fragrance", "Jean Paul Gaultier", "Le Male Eau de Toilette", "125 ml", 1500, "Iconic men's scent with lavender, mint and vanilla.", { stock: 6 }],
  ["8720168306500", "fragrance", "Versace", "Eros Eau de Toilette", "50 ml", 1100, "Mint, green apple and vanilla for men.", { oldPrice: 1300, tags: ["sale"] }],
  ["8720039305618", "fragrance", "Nina Ricci", "Nina Fleur Eau de Toilette", "50 ml", 850, "Light, floral women's fragrance in the famous apple bottle.", { tags: ["new"] }],
  ["8719979523701", "fragrance", "Calvin Klein", "CK One Eau de Toilette", "100 ml", 750, "Clean, citrus unisex fragrance.", {}],
  ["3414202011752", "fragrance", "Davidoff", "Cool Water Woman Eau de Toilette", "100 ml", 650, "Fresh aquatic floral for women.", {}],
  ["6291108737194", "fragrance", "Lattafa", "Khamrah Eau de Parfum", "100 ml", 500, "Warm, spicy oriental with dates, cinnamon and praline.", { tags: ["bestseller"], rating: 4.8 }],
  ["6291108735411", "fragrance", "Lattafa", "Asad Eau de Parfum", "100 ml", 450, "Bold men's oriental with black pepper, tobacco and vanilla.", {}],
  ["0667556605051", "fragrance", "Victoria's Secret", "Romantic Fragrance Mist", "250 ml", 320, "Soft body mist with pink petals and musk.", { tags: ["new"] }],

  // Toiletries
  ["8000700000012", "toiletries", "Dove", "Beauty Cream Bar", "90 g", 15, "Gentle cleansing bar with ¼ moisturising cream.", { tags: ["bestseller"], rating: 4.8 }],
  ["8850006533000", "toiletries", "Palmolive", "Naturals Milk & Honey Shower Gel", "1 L", 85, "Nourishing body wash with milk and honey.", {}],
  ["8718951564862", "toiletries", "Colgate", "Triple Action Toothpaste", "75 ml", 18, "Cavity protection, whitening and fresh mint breath.", { rating: 4.7 }],
  ["8717163913987", "toiletries", "Close-Up", "Everfresh Red Hot Toothpaste", "75 ml", 16, "Red gel toothpaste for long-lasting fresh breath.", {}],
  ["4005808257669", "toiletries", "Nivea", "Pearl & Beauty Roll-On Deodorant", "50 ml", 38, "48-hour anti-perspirant with pearl extracts.", {}],
  ["8711600504141", "toiletries", "Rexona", "Women Maximum Protection Stick", "45 ml", 60, "Clinical-strength anti-perspirant, Confidence scent.", { oldPrice: 70, tags: ["sale"] }],

  // Baby Care
  ["3574669908108", "baby", "Johnson's", "Baby Lotion", "500 ml", 70, "Mild, clinically proven lotion for baby's delicate skin.", { rating: 4.8 }],
  ["0381371177301", "baby", "Johnson's", "Baby Shampoo", "400 ml", 65, "No More Tears formula, as gentle to eyes as pure water.", { tags: ["bestseller"], rating: 4.8 }],
  ["3574660217599", "baby", "Johnson's", "Baby Bath", "500 ml", 60, "Mild, soap-free everyday bath wash for babies.", {}],
  ["3574669909105", "baby", "Johnson's", "Baby Oil", "500 ml", 75, "Pure mineral oil that locks in moisture after the bath.", {}],
  ["3574660026757", "baby", "Johnson's", "Baby Powder", "200 g", 35, "Classic soft powder that keeps skin dry and fresh.", {}],
  ["8006530135269", "baby", "Pampers", "Fresh Clean Baby Wipes", "2 × 80 wipes", 60, "Soft, lightly scented wipes for nappy changes and sticky hands.", { tags: ["bestseller"], rating: 4.7 }],
  ["5029053585543", "baby", "Huggies", "Extra Care Sensitive Wipes", "48 wipes", 25, "Fragrance-free wipes, 99% pure water, for sensitive skin.", { oldPrice: 30, tags: ["sale"] }],
  ["0772618083187", "baby", "Cetaphil", "Baby Daily Lotion with Shea Butter", "400 ml", 180, "Hypoallergenic, paediatrician-tested lotion for daily use.", { tags: ["new"] }],
  ["0772618090529", "baby", "Cetaphil", "Baby Diaper Rash Cream", "70 g", 95, "Zinc oxide cream that soothes and protects against nappy rash.", {}],
  ["0381370042297", "baby", "Aveeno", "Baby Daily Moisture Lotion", "12 fl oz (354 ml)", 150, "Fragrance-free lotion with natural colloidal oatmeal.", { rating: 4.8 }],
  ["60019035", "baby", "Vaseline", "Blue Seal Baby Protecting Jelly", "Jar", 30, "Gentle petroleum jelly that protects baby's skin from wetness.", {}],
  ["0015000070212", "baby", "Gerber", "Organic Oatmeal Cereal", "8 oz (227 g)", 70, "Iron-fortified whole grain oat cereal, from 6 months.", { tags: ["new"] }],
  ["7613032849283", "baby", "Nestlé", "NAN Optipro 1 Infant Formula", "800 g tin", 280, "Starter infant formula with Optipro protein, from birth.", { rating: 4.8, stock: 8 }],
];

export const PRODUCTS: Product[] = ROWS.map(([code, categoryId, brand, name, unit, price, description, extra = {}], i) => ({
  id: i + 1,
  categoryId,
  brand,
  name,
  unit,
  price,
  description,
  oldPrice: extra.oldPrice,
  image: `/products/${code}.jpg`,
  // Stable pseudo-random ratings/stock so the catalogue looks varied but renders the same on server and client.
  rating: extra.rating ?? 4.2 + ((i * 7) % 6) / 10,
  stock: extra.stock ?? (i % 13 === 5 ? 0 : 6 + ((i * 11) % 40)),
  tags: extra.tags ?? [],
}));

export const MAX_PRICE = Math.ceil(Math.max(...PRODUCTS.map((p) => p.price)) / 10) * 10;

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function getProduct(id: number): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function getProductsByCategory(categoryId: string): Product[] {
  return PRODUCTS.filter((p) => p.categoryId === categoryId);
}

export function discountPercent(p: Product): number | null {
  return p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : null;
}

export const fullName = (p: Product) => `${p.brand} ${p.name}`;
