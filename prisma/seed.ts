import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Clean existing seed businesses so re-runs are idempotent
  await prisma.business.deleteMany({
    where: {
      slug: { in: ["the-cozy-bean", "maison-elegante", "the-black-sheep"] },
    },
  });

  // Admin user — upsert so re-running never creates duplicates
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@vexloft.com" },
    update: { password: hashedPassword, name: "Berke", role: "ADMIN" },
    create: {
      email: "admin@vexloft.com",
      password: hashedPassword,
      name: "Berke",
      role: "ADMIN",
    },
  });

  console.log(`Admin user ready: ${admin.email}`);

  // ─── Business 1: The Cozy Bean ───────────────────────────────────────────
  const cozyCafé = await prisma.business.create({
    data: {
      ownerId: admin.id,
      name: "The Cozy Bean",
      slug: "the-cozy-bean",
      template: "CAFE",
      isActive: true,
      theme: {
        create: {
          primaryColor: "#3e2723",
          accentColor: "#8d6346",
          bgColor: "#faf6f0",
          cardBgColor: "#ffffff",
          textColor: "#2c1810",
          mutedTextColor: "#8d7b6a",
          borderColor: "#e8dcc8",
          fontHeading: "Playfair Display",
          fontBody: "Inter",
          layoutType: "FULLCARD",
        },
      },
      info: {
        create: {
          tagline: "SPECIALTY COFFEE & MORE",
          established: "EST. 2024",
          locationTr: "Kadıköy, İstanbul",
          locationEn: "Kadıköy, Istanbul",
          hoursTr: "09:00 – 22:00 | Her gün açık",
          hoursEn: "09:00 – 22:00 | Open every day",
        },
      },
      categories: {
        create: [
          {
            nameTr: "Espresso Bazlı",
            nameEn: "Espresso Based",
            slug: "espresso-bazli",
            sortOrder: 0,
            layout: "DEFAULT",
          },
          {
            nameTr: "Soğuk Kahveler",
            nameEn: "Cold Coffees",
            slug: "soguk-kahveler",
            sortOrder: 1,
            layout: "DEFAULT",
          },
          {
            nameTr: "Tatlılar",
            nameEn: "Desserts",
            slug: "tatlilar",
            sortOrder: 2,
            layout: "DEFAULT",
          },
        ],
      },
    },
    include: { categories: true },
  });

  // Menu items require categoryId and businessId — insert per category
  const cozyCategories = Object.fromEntries(
    cozyCafé.categories.map((c) => [c.slug, c.id])
  );

  await prisma.menuItem.createMany({
    data: [
      // Espresso bazlı
      {
        businessId: cozyCafé.id,
        categoryId: cozyCategories["espresso-bazli"],
        nameTr: "Cappuccino",
        nameEn: "Cappuccino",
        price: 85,
        sortOrder: 0,
      },
      {
        businessId: cozyCafé.id,
        categoryId: cozyCategories["espresso-bazli"],
        nameTr: "Latte",
        nameEn: "Latte",
        price: 90,
        sortOrder: 1,
      },
      {
        businessId: cozyCafé.id,
        categoryId: cozyCategories["espresso-bazli"],
        nameTr: "Mocha",
        nameEn: "Mocha",
        price: 95,
        sortOrder: 2,
      },
      // Soğuk kahveler
      {
        businessId: cozyCafé.id,
        categoryId: cozyCategories["soguk-kahveler"],
        nameTr: "Iced Latte",
        nameEn: "Iced Latte",
        price: 95,
        sortOrder: 0,
      },
      {
        businessId: cozyCafé.id,
        categoryId: cozyCategories["soguk-kahveler"],
        nameTr: "Cold Brew",
        nameEn: "Cold Brew",
        price: 100,
        sortOrder: 1,
      },
      // Tatlılar
      {
        businessId: cozyCafé.id,
        categoryId: cozyCategories["tatlilar"],
        nameTr: "Cheesecake",
        nameEn: "Cheesecake",
        price: 120,
        sortOrder: 0,
      },
      {
        businessId: cozyCafé.id,
        categoryId: cozyCategories["tatlilar"],
        nameTr: "Brownie",
        nameEn: "Brownie",
        price: 90,
        sortOrder: 1,
      },
    ],
  });

  console.log(`Business created: ${cozyCafé.name}`);

  // ─── Business 2: Maison Élégante ────────────────────────────────────────
  const maison = await prisma.business.create({
    data: {
      ownerId: admin.id,
      name: "Maison Élégante",
      slug: "maison-elegante",
      template: "RESTAURANT",
      isActive: true,
      theme: {
        create: {
          primaryColor: "#0a0a0a",
          accentColor: "#c9a96e",
          bgColor: "#0a0a0a",
          cardBgColor: "#111111",
          textColor: "#f5f0eb",
          mutedTextColor: "#555555",
          borderColor: "#1a1a1a",
          fontHeading: "Cormorant Garamond",
          fontBody: "Inter",
          layoutType: "LIST",
        },
      },
      info: {
        create: {
          tagline: "FINE DINING",
          established: "EST. 2024",
          locationTr: "Nişantaşı, İstanbul",
          locationEn: "Nişantaşı, Istanbul",
          hoursTr: "18:00 – 00:00 | Pazartesi kapalı",
          hoursEn: "18:00 – 00:00 | Closed on Mondays",
        },
      },
      categories: {
        create: [
          {
            nameTr: "Başlangıçlar",
            nameEn: "Starters",
            slug: "baslangiclar",
            sortOrder: 0,
            layout: "DEFAULT",
          },
          {
            nameTr: "Ana Yemekler",
            nameEn: "Main Courses",
            slug: "ana-yemekler",
            sortOrder: 1,
            layout: "DEFAULT",
          },
          {
            nameTr: "Tatlılar",
            nameEn: "Desserts",
            slug: "tatlilar",
            sortOrder: 2,
            layout: "DEFAULT",
          },
        ],
      },
    },
    include: { categories: true },
  });

  const maisonCategories = Object.fromEntries(
    maison.categories.map((c) => [c.slug, c.id])
  );

  await prisma.menuItem.createMany({
    data: [
      // Başlangıçlar
      {
        businessId: maison.id,
        categoryId: maisonCategories["baslangiclar"],
        nameTr: "Dana Carpaccio",
        nameEn: "Beef Carpaccio",
        price: 320,
        sortOrder: 0,
      },
      {
        businessId: maison.id,
        categoryId: maisonCategories["baslangiclar"],
        nameTr: "Burrata",
        nameEn: "Burrata",
        price: 290,
        sortOrder: 1,
      },
      // Ana yemekler
      {
        businessId: maison.id,
        categoryId: maisonCategories["ana-yemekler"],
        nameTr: "Wagyu Bonfile",
        nameEn: "Wagyu Sirloin",
        price: 950,
        sortOrder: 0,
      },
      {
        businessId: maison.id,
        categoryId: maisonCategories["ana-yemekler"],
        nameTr: "Kuzu Pirzola",
        nameEn: "Lamb Chops",
        price: 680,
        sortOrder: 1,
      },
      // Tatlılar
      {
        businessId: maison.id,
        categoryId: maisonCategories["tatlilar"],
        nameTr: "Crème Brûlée",
        nameEn: "Crème Brûlée",
        price: 240,
        sortOrder: 0,
      },
      {
        businessId: maison.id,
        categoryId: maisonCategories["tatlilar"],
        nameTr: "Soufflé",
        nameEn: "Soufflé",
        price: 320,
        sortOrder: 1,
      },
    ],
  });

  console.log(`Business created: ${maison.name}`);

  // ─── Business 3: The Black Sheep ────────────────────────────────────────
  const blackSheep = await prisma.business.create({
    data: {
      ownerId: admin.id,
      name: "The Black Sheep",
      slug: "the-black-sheep",
      template: "PUB",
      isActive: true,
      theme: {
        create: {
          primaryColor: "#1c1714",
          accentColor: "#d4a04a",
          bgColor: "#1c1714",
          cardBgColor: "#231e1a",
          textColor: "#f2e8d5",
          mutedTextColor: "#6a5a4a",
          borderColor: "#2a2320",
          fontHeading: "Georgia",
          fontBody: "Inter",
          layoutType: "HYBRID",
        },
      },
      info: {
        create: {
          tagline: "IRISH PUB & KITCHEN",
          established: "EST. 2024",
          locationTr: "Kadıköy, İstanbul",
          locationEn: "Kadıköy, Istanbul",
          hoursTr: "16:00 – 02:00 | Her gün açık",
          hoursEn: "16:00 – 02:00 | Open every day",
        },
      },
      categories: {
        create: [
          {
            nameTr: "Draft Biralar",
            nameEn: "Draft Beers",
            slug: "draft-biralar",
            sortOrder: 0,
            layout: "CHALKBOARD",
          },
          {
            nameTr: "Burgerlar",
            nameEn: "Burgers",
            slug: "burgerlar",
            sortOrder: 1,
            layout: "GRID",
          },
          {
            nameTr: "Atıştırmalıklar",
            nameEn: "Snacks",
            slug: "atistirmaliklar",
            sortOrder: 2,
            layout: "GRID",
          },
        ],
      },
    },
    include: { categories: true },
  });

  const pubCategories = Object.fromEntries(
    blackSheep.categories.map((c) => [c.slug, c.id])
  );

  await prisma.menuItem.createMany({
    data: [
      // Draft biralar — include badge metadata
      {
        businessId: blackSheep.id,
        categoryId: pubCategories["draft-biralar"],
        nameTr: "Guinness",
        nameEn: "Guinness",
        price: 140,
        sortOrder: 0,
        badges: { volume: "500ml", abv: "4.2%", type: "Stout" },
      },
      {
        businessId: blackSheep.id,
        categoryId: pubCategories["draft-biralar"],
        nameTr: "Efes Draft",
        nameEn: "Efes Draft",
        price: 90,
        sortOrder: 1,
        badges: { volume: "500ml", abv: "5.0%", type: "Pilsner" },
      },
      // Burgerlar
      {
        businessId: blackSheep.id,
        categoryId: pubCategories["burgerlar"],
        nameTr: "Classic Burger",
        nameEn: "Classic Burger",
        price: 220,
        sortOrder: 0,
      },
      {
        businessId: blackSheep.id,
        categoryId: pubCategories["burgerlar"],
        nameTr: "BBQ Bacon",
        nameEn: "BBQ Bacon",
        price: 250,
        sortOrder: 1,
      },
      // Atıştırmalıklar
      {
        businessId: blackSheep.id,
        categoryId: pubCategories["atistirmaliklar"],
        nameTr: "Loaded Nachos",
        nameEn: "Loaded Nachos",
        price: 180,
        sortOrder: 0,
      },
      {
        businessId: blackSheep.id,
        categoryId: pubCategories["atistirmaliklar"],
        nameTr: "Buffalo Wings",
        nameEn: "Buffalo Wings",
        price: 190,
        sortOrder: 1,
      },
    ],
  });

  console.log(`Business created: ${blackSheep.name}`);
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
