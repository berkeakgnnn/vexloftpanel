import { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/rbac.js";

// ============ CAFE TEMPLATE DATA ============
const CAFE_CATEGORIES = [
  {
    nameTr: "Espresso Bazlı", nameEn: "Espresso Based",
    slug: "espresso-bazli", layout: "DEFAULT" as const,
    banner: "https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=1200&q=80",
    items: [
      { nameTr: "Cappuccino", nameEn: "Cappuccino", descTr: "Özenle çekilmiş espresso, kadifemsi buharlanmış süt ve ince mikro köpük katmanı", descEn: "Carefully pulled espresso, velvety steamed milk and a thin layer of microfoam", price: 85, image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800&q=80" },
      { nameTr: "Caffè Latte", nameEn: "Caffè Latte", descTr: "Double shot espresso ile kremamsı süt, latte art ile servis edilir", descEn: "Double shot espresso with creamy milk, served with latte art", price: 90, image: "https://images.unsplash.com/photo-1534778101976-62847782c213?w=800&q=80" },
      { nameTr: "Mocha", nameEn: "Mocha", descTr: "Espresso, belçika çikolatası ve buharlanmış süt, üzerine kakao tozu", descEn: "Espresso, Belgian chocolate and steamed milk, topped with cocoa powder", price: 95, image: "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=800&q=80" },
      { nameTr: "Flat White", nameEn: "Flat White", descTr: "Ristretto double shot, ipeksi mikro köpüklü süt, yoğun kahve aroması", descEn: "Ristretto double shot, silky microfoam milk, intense coffee aroma", price: 90, image: "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=800&q=80" },
      { nameTr: "Americano", nameEn: "Americano", descTr: "Double espresso, sıcak su ile uzatılmış, saf kahve lezzeti", descEn: "Double espresso extended with hot water, pure coffee flavor", price: 70, image: "https://images.unsplash.com/photo-1551030173-122aabc4489c?w=800&q=80" },
      { nameTr: "Macchiato", nameEn: "Macchiato", descTr: "Espresso, bir dokunuş süt köpüğü ile taçlandırılmış", descEn: "Espresso crowned with a touch of milk foam", price: 75, image: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=800&q=80" },
    ],
  },
  {
    nameTr: "Soğuk Kahveler", nameEn: "Cold Coffees",
    slug: "soguk-kahveler", layout: "DEFAULT" as const,
    banner: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=1200&q=80",
    items: [
      { nameTr: "Iced Latte", nameEn: "Iced Latte", descTr: "Espresso, soğuk süt ve buz, serinletici klasik", descEn: "Espresso, cold milk and ice, a refreshing classic", price: 95, image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=800&q=80" },
      { nameTr: "Cold Brew", nameEn: "Cold Brew", descTr: "18 saat soğuk demleme, yumuşak ve düşük asitli", descEn: "18-hour cold extraction, smooth and low acidity", price: 100, image: "https://images.unsplash.com/photo-1592663527359-cf6642f54cff?w=800&q=80" },
      { nameTr: "Iced Mocha", nameEn: "Iced Mocha", descTr: "Espresso, çikolata sosu, soğuk süt ve buz", descEn: "Espresso, chocolate sauce, cold milk and ice", price: 105, image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&q=80" },
    ],
  },
  {
    nameTr: "Tatlılar", nameEn: "Desserts",
    slug: "tatlilar", layout: "DEFAULT" as const,
    banner: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=1200&q=80",
    items: [
      { nameTr: "San Sebastian Cheesecake", nameEn: "San Sebastián Cheesecake", descTr: "Kremalı, karamelize üst, ev yapımı özel tarif", descEn: "Creamy, caramelized top, homemade special recipe", price: 120, image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&q=80" },
      { nameTr: "Brownie", nameEn: "Brownie", descTr: "Sıcak servis, çikolata parçacıklı, dondurma eşliğinde", descEn: "Served warm, chocolate chip, accompanied with ice cream", price: 90, image: "https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=800&q=80" },
      { nameTr: "Tiramisu", nameEn: "Tiramisu", descTr: "Mascarpone, espresso emdirilmiş lady finger, kakao tozu", descEn: "Mascarpone, espresso-soaked lady fingers, cocoa powder", price: 110, image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&q=80" },
    ],
  },
  {
    nameTr: "Sandviçler", nameEn: "Sandwiches",
    slug: "sandvicler", layout: "DEFAULT" as const,
    banner: "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=1200&q=80",
    items: [
      { nameTr: "Avocado Toast", nameEn: "Avocado Toast", descTr: "Ekşi maya ekmek, avokado, poşe yumurta, chili pul biber", descEn: "Sourdough bread, avocado, poached egg, chili flakes", price: 130, image: "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=800&q=80" },
      { nameTr: "Tost", nameEn: "Grilled Toast", descTr: "Kaşar, domates, sucuk, taze ekmek üzerinde", descEn: "Cheese, tomato, Turkish sausage on fresh bread", price: 85, image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80" },
      { nameTr: "Croissant Sandviç", nameEn: "Croissant Sandwich", descTr: "Taze kruvasan, füme hindi, cheddar peyniri, roka", descEn: "Fresh croissant, smoked turkey, cheddar cheese, arugula", price: 110, image: "https://images.unsplash.com/photo-1550507992-eb63ffee0847?w=800&q=80" },
    ],
  },
];

// ============ RESTAURANT TEMPLATE DATA ============
const RESTAURANT_CATEGORIES = [
  {
    nameTr: "Başlangıçlar", nameEn: "Starters",
    slug: "baslangiclar", layout: "DEFAULT" as const,
    banner: "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80",
    items: [
      { nameTr: "Dana Carpaccio", nameEn: "Beef Carpaccio", descTr: "İnce dilimlenmiş dana fileto, trüf yağı, parmesan talaşı, roka ve kapari", descEn: "Thinly sliced beef tenderloin, truffle oil, parmesan shavings, arugula and capers", price: 320, image: "" },
      { nameTr: "Izgara Ahtapot", nameEn: "Grilled Octopus", descTr: "Yumuşacık pişirilmiş ahtapot, chorizo, patates püresi, paprika yağı", descEn: "Tender grilled octopus, chorizo, mashed potatoes, paprika oil", price: 380, image: "" },
      { nameTr: "Burrata", nameEn: "Burrata", descTr: "Taze burrata, heirloom domates, fesleğen pesto, balzamik redüksiyon", descEn: "Fresh burrata, heirloom tomatoes, basil pesto, balsamic reduction", price: 290, image: "" },
    ],
  },
  {
    nameTr: "Ana Yemekler", nameEn: "Main Courses",
    slug: "ana-yemekler", layout: "DEFAULT" as const,
    banner: "https://images.unsplash.com/photo-1558030006-450675393462?w=1200&q=80",
    items: [
      { nameTr: "Wagyu Bonfile", nameEn: "Wagyu Tenderloin", descTr: "A5 Wagyu, trüf jus, mevsim sebzeleri, fondant patates", descEn: "A5 Wagyu, truffle jus, seasonal vegetables, fondant potato", price: 950, image: "" },
      { nameTr: "Kuzu Pirzola", nameEn: "Lamb Chops", descTr: "Yeni Zelanda kuzu, biberiye jus, patlıcan beğendi", descEn: "New Zealand lamb, rosemary jus, smoked eggplant purée", price: 680, image: "" },
      { nameTr: "Risotto ai Funghi", nameEn: "Mushroom Risotto", descTr: "Porcini mantarı, parmesan, trüf yağı, taze kekik", descEn: "Porcini mushroom, parmesan, truffle oil, fresh thyme", price: 420, image: "" },
    ],
  },
  {
    nameTr: "Tatlılar", nameEn: "Desserts",
    slug: "tatlilar", layout: "DEFAULT" as const,
    banner: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=1200&q=80",
    items: [
      { nameTr: "Crème Brûlée", nameEn: "Crème Brûlée", descTr: "Klasik Fransız tarif, karamelize şeker kabuğu", descEn: "Classic French recipe, caramelized sugar crust", price: 240, image: "" },
      { nameTr: "Soufflé", nameEn: "Soufflé", descTr: "Sıcak çikolata soufflé, crème anglaise (20 dk bekleme)", descEn: "Warm chocolate soufflé, crème anglaise (20 min wait)", price: 320, image: "" },
    ],
  },
];

// ============ PUB TEMPLATE DATA ============
const PUB_CATEGORIES = [
  {
    nameTr: "Draft Biralar", nameEn: "Draft Beers",
    slug: "draft-biralar", layout: "CHALKBOARD" as const,
    banner: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=1200&q=80",
    items: [
      { nameTr: "Guinness", nameEn: "Guinness", descTr: "İrlanda'nın efsane draft stout'u. Koyu, kremamsı, hafif acı", descEn: "Ireland's legendary draft stout. Dark, creamy, slightly bitter", price: 140, image: "", badges: { volume: "500ml", abv: "4.2%", type: "Stout" } },
      { nameTr: "Efes Draft", nameEn: "Efes Draft", descTr: "Türkiye'nin klasiği. Hafif, ferah, her daim güvenilir", descEn: "Turkey's classic. Light, refreshing, always reliable", price: 90, image: "", badges: { volume: "500ml", abv: "5.0%", type: "Pilsner" } },
      { nameTr: "Bomonti", nameEn: "Bomonti", descTr: "1890'dan beri. Dengeli, maltlı, temiz bitiş", descEn: "Since 1890. Balanced, malty, clean finish", price: 95, image: "", badges: { volume: "500ml", abv: "5.0%", type: "Lager" } },
    ],
  },
  {
    nameTr: "Kokteyller", nameEn: "Cocktails",
    slug: "kokteyller", layout: "CHALKBOARD" as const,
    banner: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1200&q=80",
    items: [
      { nameTr: "Irish Coffee", nameEn: "Irish Coffee", descTr: "Jameson, sıcak kahve, şeker, taze krema", descEn: "Jameson, hot coffee, sugar, fresh cream", price: 180, image: "", badges: { type: "Sıcak" } },
      { nameTr: "Whiskey Sour", nameEn: "Whiskey Sour", descTr: "Bourbon, taze limon suyu, şeker, yumurta akı", descEn: "Bourbon, fresh lemon juice, sugar, egg white", price: 200, image: "", badges: { type: "Klasik" } },
      { nameTr: "Espresso Martini", nameEn: "Espresso Martini", descTr: "Vodka, Kahlúa, taze espresso. Enerjik ve zarif", descEn: "Vodka, Kahlúa, fresh espresso. Energetic and elegant", price: 210, image: "", badges: { type: "Modern" } },
    ],
  },
  {
    nameTr: "Burgerlar", nameEn: "Burgers",
    slug: "burgerlar", layout: "GRID" as const,
    banner: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&q=80",
    items: [
      { nameTr: "Classic Burger", nameEn: "Classic Burger", descTr: "200gr dana eti, cheddar, turşu, özel sos, brioche", descEn: "200g beef patty, cheddar, pickles, special sauce, brioche", price: 220, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80" },
      { nameTr: "BBQ Bacon", nameEn: "BBQ Bacon", descTr: "Çıtır bacon, BBQ sos, karamelize soğan, cheddar", descEn: "Crispy bacon, BBQ sauce, caramelized onion, cheddar", price: 250, image: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=800&q=80" },
    ],
  },
  {
    nameTr: "Atıştırmalıklar", nameEn: "Bar Snacks",
    slug: "atistirmaliklar", layout: "GRID" as const,
    banner: "https://images.unsplash.com/photo-1461009312844-e80697a81cc7?w=1200&q=80",
    items: [
      { nameTr: "Loaded Nachos", nameEn: "Loaded Nachos", descTr: "Cheddar, jalapeno, salsa, guacamole, ekşi krema", descEn: "Cheddar, jalapeño, salsa, guacamole, sour cream", price: 180, image: "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=800&q=80" },
      { nameTr: "Buffalo Wings", nameEn: "Buffalo Wings", descTr: "8 adet tavuk kanat, buffalo sos, ranch dip", descEn: "8 chicken wings, buffalo sauce, ranch dip", price: 190, image: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=800&q=80" },
    ],
  },
];

type TemplateItem = {
  nameTr: string;
  nameEn: string;
  descTr: string;
  descEn: string;
  price: number;
  image: string;
  badges?: Record<string, string>;
};

type TemplateCategory = {
  nameTr: string;
  nameEn: string;
  slug: string;
  layout: "DEFAULT" | "CHALKBOARD" | "GRID";
  banner: string;
  items: TemplateItem[];
};

export default async function seedTemplateRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/businesses/:slug/seed-template",
    { preHandler: [authenticate, authorize("ADMIN")] },
    async (request, reply) => {
      const { slug } = request.params as { slug: string };
      const { layoutType, businessType } = request.body as { layoutType: string; businessType?: string };

      const business = await prisma.business.findUnique({ where: { slug } });
      if (!business) return reply.status(404).send({ error: "Business not found" });

      // Delete existing items first (FK constraint), then categories
      await prisma.menuItem.deleteMany({ where: { businessId: business.id } });
      await prisma.category.deleteMany({ where: { businessId: business.id } });

      // Select template data based on businessType first, then apply layout
      let templateCategories: TemplateCategory[];

      // Pick data source by business type
      const baseData = businessType === "RESTAURANT" ? RESTAURANT_CATEGORIES
        : businessType === "PUB" ? PUB_CATEGORIES
        : CAFE_CATEGORIES; // CAFE or default

      // Apply layout override
      switch (layoutType) {
        case "FULLCARD":
          templateCategories = baseData.map((c) => ({ ...c, layout: "DEFAULT" as const }));
          break;
        case "LIST":
          templateCategories = baseData.map((c) => ({ ...c, layout: "CHALKBOARD" as const }));
          break;
        case "GRID":
          templateCategories = baseData.map((c) => ({ ...c, layout: "GRID" as const }));
          break;
        case "HYBRID":
          // Keep original layouts from template (pub has CHALKBOARD for drinks, GRID for food)
          templateCategories = baseData;
          break;
        default:
          templateCategories = CAFE_CATEGORIES;
      }

      // Create categories and their items sequentially to preserve sortOrder
      for (let i = 0; i < templateCategories.length; i++) {
        const cat = templateCategories[i];
        const category = await prisma.category.create({
          data: {
            businessId: business.id,
            nameTr: cat.nameTr,
            nameEn: cat.nameEn,
            slug: cat.slug,
            banner: cat.banner || null,
            layout: cat.layout,
            sortOrder: i,
            isActive: true,
          },
        });

        const items = cat.items ?? [];
        for (let j = 0; j < items.length; j++) {
          const item = items[j];
          await prisma.menuItem.create({
            data: {
              categoryId: category.id,
              businessId: business.id,
              nameTr: item.nameTr,
              nameEn: item.nameEn,
              descriptionTr: item.descTr,
              descriptionEn: item.descEn,
              price: item.price,
              image: item.image || null,
              sortOrder: j,
              isActive: true,
              badges: item.badges != null ? item.badges : Prisma.DbNull,
            },
          });
        }
      }

      return { message: "Template seeded successfully", categories: templateCategories.length };
    }
  );
}
