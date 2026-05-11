import { PrismaClient, Role, PaymentMethod, OrderStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { allocateOrderNumber } from "../src/lib/order-number";
import { allocateProductCode } from "../src/lib/product-code";
import { computeSalePrice } from "../src/lib/money";

const prisma = new PrismaClient();
const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "123456";
const DEFAULT_COMPANY_NAME = "AL Furniture";
const DEFAULT_HOTLINE = "0981074090";

async function main() {
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS unaccent`);
  } catch {
    console.warn(
      "[seed] Không bật được extension unaccent (cần quyền superuser). Tìm kiếm vẫn chạy bằng fallback JS."
    );
  }

  const seedReset = process.env.SEED_RESET === "1" || process.env.SEED_RESET === "true";
  if (seedReset) {
    console.log("[seed] SEED_RESET: xóa đơn, SP, blog seed, chat, audit…");
    await prisma.paymentTransaction.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.inventoryLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.wishlist.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.banner.deleteMany();
    await prisma.blogPost.deleteMany();
    await prisma.faqItem.deleteMany();
    await prisma.adminAuditLog.deleteMany();
    await prisma.chatMessage.deleteMany();
    await prisma.chatUploadAsset.deleteMany();
    await prisma.chatSession.deleteMany();

    await prisma.orderCounter.upsert({
      where: { id: "global" },
      create: { id: "global", lastSeq: 0 },
      update: { lastSeq: 0 },
    });
    await prisma.productCounter.upsert({
      where: { id: "global" },
      create: { id: "global", lastSeq: 0 },
      update: { lastSeq: 0 },
    });

    const hp = await prisma.homePageConfig.findUnique({ where: { id: "default" } });
    if (hp) {
      await prisma.homePageConfig.update({
        where: { id: "default" },
        data: {
          featuredProductIds: [],
          newProductIds: [],
          livingProductIds: [],
          newsPostIds: [],
        },
      });
    }
  }

  await prisma.orderCounter.upsert({
    where: { id: "global" },
    create: { id: "global", lastSeq: 0 },
    update: {},
  });
  await prisma.productCounter.upsert({
    where: { id: "global" },
    create: { id: "global", lastSeq: 0 },
    update: {},
  });

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: "Admin",
      passwordHash,
      role: Role.ADMIN,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: ADMIN_EMAIL,
      name: "Admin",
      passwordHash,
      role: Role.ADMIN,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.themeSettings.upsert({
    where: { id: "default" },
    update: {
      primaryColor: "#2C2620",
      accentColor: "#8B7355",
      headerBg: "#F7F4EF",
      menuColor: "#1A1612",
      textOnPrimary: "#FAF8F5",
      buttonHoverBg: "#EBE5DF",
      brandText: DEFAULT_COMPANY_NAME,
      headerStoreName: DEFAULT_COMPANY_NAME,
      headerHotlineLabel: "Hotline",
      headerHotlinePhone: DEFAULT_HOTLINE,
      footerNote: `${DEFAULT_COMPANY_NAME} — nội thất cao cấp.`,
    },
    create: {
      id: "default",
      primaryColor: "#2C2620",
      accentColor: "#8B7355",
      headerBg: "#F7F4EF",
      menuColor: "#1A1612",
      textOnPrimary: "#FAF8F5",
      buttonHoverBg: "#EBE5DF",
      brandText: DEFAULT_COMPANY_NAME,
      headerStoreName: DEFAULT_COMPANY_NAME,
      headerHotlineLabel: "Hotline",
      headerHotlinePhone: DEFAULT_HOTLINE,
      footerNote: `${DEFAULT_COMPANY_NAME} — nội thất cao cấp.`,
    },
  });

  await prisma.featureFlag.upsert({
    where: { id: "default" },
    update: { chatEnabled: true, blogEnabled: true },
    create: { id: "default", chatEnabled: true, blogEnabled: true },
  });

  const living = await prisma.category.upsert({
    where: { slug: "phong-khach" },
    update: {},
    create: {
      nameVi: "Phòng khách",
      nameEn: "Living room",
      slug: "phong-khach",
      metaTitleVi: "Nội thất phòng khách",
      metaTitleEn: "Living room furniture",
      metaDescriptionVi: "Sofa, bàn, kệ — nội thất phòng khách cao cấp.",
      metaDescriptionEn: "Sofas, tables, shelving — premium living room furniture.",
    },
  });

  const p1 = await prisma.product.upsert({
    where: { slug: "sofa-minimal-3-cho" },
    update: {},
    create: {
      nameVi: "Sofa minimal 3 chỗ",
      nameEn: "Minimal 3-seater sofa",
      slug: "sofa-minimal-3-cho",
      descriptionVi:
        "Khung gỗ tần bì, đệm mousse cao tầng, vải bouclé dễ vệ sinh. Phù hợp phòng khách hiện đại.",
      descriptionEn:
        "Ash wood frame, high-resilience foam, easy-care bouclé fabric. Fits modern living rooms.",
      basePrice: 12_900_000,
      discountPercent: 0,
      salePrice: computeSalePrice(12_900_000, 0),
      categoryId: living.id,
      isFeatured: true,
      metaTitleVi: "Sofa minimal 3 chỗ",
      metaTitleEn: "Minimal 3-seater sofa",
      metaDescriptionVi: "Sofa 3 chỗ nội thất tối giản, nhiều màu và kích thước.",
      metaDescriptionEn: "Minimalist 3-seater sofa in multiple colors and sizes.",
    },
  });

  const sofaGalleryWalnut = [
    "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&q=80",
    "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80",
    "https://images.unsplash.com/photo-1618220179428-22790b461013?w=1200&q=80",
    "https://images.unsplash.com/photo-1503602642458-232111445657?w=1200&q=80",
  ];
  const sofaGalleryCream = [
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=80",
    "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80",
    "https://images.unsplash.com/photo-1618220179428-22790b461013?w=1200&q=80",
    "https://images.unsplash.com/photo-1618220179428-22790b461013?w=1200&q=80",
  ];
  const sofaGalleryGrey = [
    "https://images.unsplash.com/photo-1618220179428-22790b461013?w=1200&q=80",
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=80",
    "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80",
    "https://images.unsplash.com/photo-1503602642458-232111445657?w=1200&q=80",
  ];
  const sofaGalleryMoss = [
    "https://images.unsplash.com/photo-1618220179428-22790b461013?w=1200&q=80",
    "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80",
    "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&q=80",
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=80",
  ];
  const sofaGalleryCharcoal = [
    "https://images.unsplash.com/photo-1503602642458-232111445657?w=1200&q=80",
    "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80",
    "https://images.unsplash.com/photo-1618220179428-22790b461013?w=1200&q=80",
    "https://images.unsplash.com/photo-1618220179428-22790b461013?w=1200&q=80",
  ];

  const sofaColorDefs = [
    {
      code: "OC",
      colorLabelVi: "Vải óc chó",
      colorLabelEn: "Walnut fabric",
      colorHex: "#5C4033",
      imageUrls: sofaGalleryWalnut,
    },
    { code: "KEM", colorLabelVi: "Kem", colorLabelEn: "Cream", colorHex: "#D4C4B0", imageUrls: sofaGalleryCream },
    {
      code: "XAM",
      colorLabelVi: "Xám chì",
      colorLabelEn: "Charcoal grey",
      colorHex: "#6b6560",
      imageUrls: sofaGalleryGrey,
    },
    { code: "REU", colorLabelVi: "Xanh rêu", colorLabelEn: "Moss green", colorHex: "#4a5d4e", imageUrls: sofaGalleryMoss },
    {
      code: "DEN",
      colorLabelVi: "Đen than",
      colorLabelEn: "Charcoal black",
      colorHex: "#2c2c2c",
      imageUrls: sofaGalleryCharcoal,
    },
  ] as const;

  const sofaSizeDefs = [
    { suffix: "180", sizeLabelVi: "180×88cm", sizeLabelEn: "180×88 cm", priceAdjustment: -400_000 },
    { suffix: "200", sizeLabelVi: "200×90cm", sizeLabelEn: "200×90 cm", priceAdjustment: 0 },
    { suffix: "220", sizeLabelVi: "220×92cm", sizeLabelEn: "220×92 cm", priceAdjustment: 1_200_000 },
    { suffix: "240", sizeLabelVi: "240×95cm", sizeLabelEn: "240×95 cm", priceAdjustment: 1_500_000 },
  ] as const;

  const variants = sofaColorDefs.flatMap((c) =>
    sofaSizeDefs.map((s, idx) => ({
      sku: `SOFA-MIN-${c.code}-${s.suffix}`,
      colorLabelVi: c.colorLabelVi,
      colorLabelEn: c.colorLabelEn,
      colorHex: c.colorHex,
      sizeLabelVi: s.sizeLabelVi,
      sizeLabelEn: s.sizeLabelEn,
      priceAdjustment: s.priceAdjustment,
      stockQuantity: 2 + ((idx + c.code.charCodeAt(0)) % 7),
      imageUrls: c.imageUrls,
    }))
  );

  for (const v of variants) {
    await prisma.productVariant.upsert({
      where: { sku: v.sku },
      update: {
        colorLabelVi: v.colorLabelVi,
        colorLabelEn: v.colorLabelEn,
        colorHex: v.colorHex,
        sizeLabelVi: v.sizeLabelVi,
        sizeLabelEn: v.sizeLabelEn,
        priceAdjustment: v.priceAdjustment,
        stockQuantity: v.stockQuantity,
        imageUrls: v.imageUrls,
      },
      create: {
        productId: p1.id,
        ...v,
        imageUrls: v.imageUrls,
      },
    });
  }

  const p2 = await prisma.product.upsert({
    where: { slug: "ban-tra-tron" },
    update: {},
    create: {
      nameVi: "Bàn trà tròn gỗ sồi",
      nameEn: "Round oak coffee table",
      slug: "ban-tra-tron",
      descriptionVi: "Mặt gỗ sồi tự nhiên, chân kim loại sơn tĩnh điện màu đen mờ.",
      descriptionEn: "Natural oak top with powder-coated metal legs in matte black.",
      basePrice: 4_200_000,
      discountPercent: 0,
      salePrice: computeSalePrice(4_200_000, 0),
      categoryId: living.id,
      isFeatured: true,
      metaTitleVi: "Bàn trà tròn gỗ sồi",
      metaTitleEn: "Round oak coffee table",
      metaDescriptionVi: "Bàn trà phòng khách, hai kích thước.",
      metaDescriptionEn: "Living room coffee table in multiple diameters.",
    },
  });

  const coffeeTableGallery = [
    "https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=1200&q=80",
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=80",
    "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80",
    "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1200&q=80",
  ];

  const coffeeFinishes = [
    { code: "OAK", colorLabelVi: "Gỗ sồi tự nhiên", colorLabelEn: "Natural oak", colorHex: "#C4A882" },
    { code: "WAL", colorLabelVi: "Gỗ walnut", colorLabelEn: "Walnut wood", colorHex: "#6b5344" },
    { code: "BLK", colorLabelVi: "Mặt đen", colorLabelEn: "Black top", colorHex: "#2a2a2a" },
  ] as const;

  const coffeeSizes = [
    { key: "70", sizeLabelVi: "Ø70cm", sizeLabelEn: "Ø70 cm", priceAdjustment: -800_000 },
    { key: "80", sizeLabelVi: "Ø80cm", sizeLabelEn: "Ø80 cm", priceAdjustment: 0 },
    { key: "100", sizeLabelVi: "Ø100cm", sizeLabelEn: "Ø100 cm", priceAdjustment: 900_000 },
    { key: "120", sizeLabelVi: "Ø120cm", sizeLabelEn: "Ø120 cm", priceAdjustment: 2_200_000 },
  ] as const;

  const btVariants = coffeeFinishes.flatMap((f) =>
    coffeeSizes.map((s, i) => ({
      sku: `BT-${f.code}-${s.key}`,
      colorLabelVi: f.colorLabelVi,
      colorLabelEn: f.colorLabelEn,
      colorHex: f.colorHex,
      sizeLabelVi: s.sizeLabelVi,
      sizeLabelEn: s.sizeLabelEn,
      priceAdjustment: s.priceAdjustment,
      stockQuantity: 4 + ((i + f.code.length) % 6),
      imageUrls: coffeeTableGallery,
    }))
  );

  for (const v of btVariants) {
    await prisma.productVariant.upsert({
      where: { sku: v.sku },
      update: {
        colorLabelVi: v.colorLabelVi,
        colorLabelEn: v.colorLabelEn,
        colorHex: v.colorHex,
        sizeLabelVi: v.sizeLabelVi,
        sizeLabelEn: v.sizeLabelEn,
        priceAdjustment: v.priceAdjustment,
        stockQuantity: v.stockQuantity,
        imageUrls: v.imageUrls,
      },
      create: {
        productId: p2.id,
        ...v,
        imageUrls: v.imageUrls,
      },
    });
  }

  await prisma.banner.deleteMany({});
  await prisma.banner.createMany({
    data: [
      {
        imageUrl: "https://images.unsplash.com/photo-1618220179428-22790b461013?w=1600&q=80",
        link: "/products",
        title: "Noir",
        subtitle: "bookshelf",
        active: true,
        sortOrder: 0,
      },
      {
        imageUrl: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1600&q=80",
        link: "/products?category=phong-khach",
        title: "Phòng khách",
        subtitle: "minimal & warm",
        active: true,
        sortOrder: 1,
      },
      {
        imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1600&q=80",
        link: "/products",
        title: "Bst mới",
        subtitle: "sofa & bàn ăn",
        active: true,
        sortOrder: 2,
      },
      {
        imageUrl: "https://images.unsplash.com/photo-1503602642458-232111445657?w=1600&q=80",
        link: "/blog",
        title: "Tin tức",
        subtitle: "nội thất 2025",
        active: true,
        sortOrder: 3,
      },
    ],
  });

  const bedroom = await prisma.category.upsert({
    where: { slug: "phong-ngu" },
    update: {},
    create: {
      nameVi: "Phòng ngủ",
      nameEn: "Bedroom",
      slug: "phong-ngu",
      metaTitleVi: "Phòng ngủ",
      metaTitleEn: "Bedroom",
      metaDescriptionVi: "Giường, tủ quần áo.",
      metaDescriptionEn: "Beds and wardrobes.",
    },
  });

  const dining = await prisma.category.upsert({
    where: { slug: "phong-an" },
    update: {},
    create: {
      nameVi: "Phòng ăn",
      nameEn: "Dining room",
      slug: "phong-an",
      metaTitleVi: "Phòng ăn",
      metaTitleEn: "Dining room",
      metaDescriptionVi: "Bàn ghế ăn hiện đại.",
      metaDescriptionEn: "Modern dining tables and chairs.",
    },
  });

  const bedProd = await prisma.product.upsert({
    where: { slug: "giuong-go-soi-noir" },
    update: {},
    create: {
      nameVi: "Giường Noir — gỗ sồi",
      nameEn: "Noir bed — oak",
      slug: "giuong-go-soi-noir",
      descriptionVi:
        "Khung gỗ sồi tự nhiên, đầu giường bọc nỉ dễ vệ sinh. Phù hợp phòng ngủ tối giản.",
      descriptionEn: "Natural oak frame with easy-care upholstered headboard. Fits minimalist bedrooms.",
      basePrice: 8_900_000,
      discountPercent: 0,
      salePrice: computeSalePrice(8_900_000, 0),
      categoryId: bedroom.id,
      isFeatured: true,
      soldCount: 12,
    },
  });

  const bedGallery = [
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80",
    "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80",
    "https://images.unsplash.com/photo-1618220179428-22790b461013?w=1200&q=80",
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=80",
  ];

  const bedFabrics = [
    { code: "XAM", colorLabelVi: "Vải xám", colorLabelEn: "Grey fabric", colorHex: "#8a8580" },
    { code: "BE", colorLabelVi: "Vải be", colorLabelEn: "Beige fabric", colorHex: "#c9bfb5" },
    { code: "NHUNG", colorLabelVi: "Nhung xanh", colorLabelEn: "Blue velvet", colorHex: "#3d5a5c" },
  ] as const;

  const bedSizes = [
    { suffix: "160", sizeLabelVi: "160×200cm", sizeLabelEn: "160×200 cm", priceAdjustment: 0 },
    { suffix: "180", sizeLabelVi: "180×200cm", sizeLabelEn: "180×200 cm", priceAdjustment: 2_000_000 },
    { suffix: "200", sizeLabelVi: "200×200cm", sizeLabelEn: "200×200 cm", priceAdjustment: 4_200_000 },
  ] as const;

  const bedVariants = bedFabrics.flatMap((fabric) =>
    bedSizes.map((sz, i) => {
      const legacySku =
        fabric.code === "XAM" && sz.suffix === "160"
          ? "BED-NOIR-160"
          : fabric.code === "XAM" && sz.suffix === "180"
            ? "BED-NOIR-180"
            : null;
      return {
        sku: legacySku ?? `BED-${fabric.code}-${sz.suffix}`,
        colorLabelVi: fabric.colorLabelVi,
        colorLabelEn: fabric.colorLabelEn,
        colorHex: fabric.colorHex,
        sizeLabelVi: sz.sizeLabelVi,
        sizeLabelEn: sz.sizeLabelEn,
        priceAdjustment: sz.priceAdjustment,
        stockQuantity: 3 + ((i + fabric.code.length) % 6),
        imageUrls: bedGallery,
      };
    })
  );

  for (const v of bedVariants) {
    await prisma.productVariant.upsert({
      where: { sku: v.sku },
      update: {
        colorLabelVi: v.colorLabelVi,
        colorLabelEn: v.colorLabelEn,
        colorHex: v.colorHex,
        sizeLabelVi: v.sizeLabelVi,
        sizeLabelEn: v.sizeLabelEn,
        priceAdjustment: v.priceAdjustment,
        stockQuantity: v.stockQuantity,
        imageUrls: v.imageUrls,
      },
      create: { productId: bedProd.id, ...v },
    });
  }

  const diningProd = await prisma.product.upsert({
    where: { slug: "ban-an-chandler-6-cho" },
    update: {},
    create: {
      nameVi: "Chandler — Bàn ăn 6 chỗ",
      nameEn: "Chandler — 6-seat dining table",
      slug: "ban-an-chandler-6-cho",
      descriptionVi: "Mặt gỗ walnut veneer, chân thép sơn tĩnh điện. Phù hợp không gian phòng ăn hiện đại.",
      descriptionEn: "Walnut veneer top with powder-coated steel legs. Fits modern dining spaces.",
      basePrice: 15_900_000,
      discountPercent: 0,
      salePrice: computeSalePrice(15_900_000, 0),
      categoryId: dining.id,
      isFeatured: true,
      soldCount: 28,
    },
  });

  const chandlerGallery = [
    "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=1200&q=80",
    "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80",
    "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1200&q=80",
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=80",
  ];

  const chandlerFinishes = [
    { code: "WAL", colorLabelVi: "Walnut", colorLabelEn: "Walnut", colorHex: "#5c4033" },
    { code: "OAK", colorLabelVi: "Sồi tự nhiên", colorLabelEn: "Natural oak", colorHex: "#c4a882" },
    { code: "WHT", colorLabelVi: "Trắng sứ", colorLabelEn: "Porcelain white", colorHex: "#e8e4df" },
  ] as const;

  const chandlerSizes = [
    { suffix: "140", sizeLabelVi: "140×80cm", sizeLabelEn: "140×80 cm", priceAdjustment: -2_400_000 },
    { suffix: "160", sizeLabelVi: "160×85cm", sizeLabelEn: "160×85 cm", priceAdjustment: 0 },
    { suffix: "180", sizeLabelVi: "180×90cm", sizeLabelEn: "180×90 cm", priceAdjustment: 1_800_000 },
    { suffix: "200", sizeLabelVi: "200×95cm", sizeLabelEn: "200×95 cm", priceAdjustment: 3_500_000 },
    { suffix: "220", sizeLabelVi: "220×100cm", sizeLabelEn: "220×100 cm", priceAdjustment: 5_800_000 },
  ] as const;

  const chandlerVariants = chandlerFinishes.flatMap((fin) =>
    chandlerSizes.map((sz, i) => {
      const legacySku =
        fin.code === "WAL" && sz.suffix === "160"
          ? "CHANDLER-WAL-160"
          : fin.code === "WAL" && sz.suffix === "200"
            ? "CHANDLER-WAL-200"
            : null;
      return {
        sku: legacySku ?? `CHANDLER-${fin.code}-${sz.suffix}`,
        colorLabelVi: fin.colorLabelVi,
        colorLabelEn: fin.colorLabelEn,
        colorHex: fin.colorHex,
        sizeLabelVi: sz.sizeLabelVi,
        sizeLabelEn: sz.sizeLabelEn,
        priceAdjustment: sz.priceAdjustment,
        stockQuantity: 2 + ((i + fin.code.length) % 6),
        imageUrls: chandlerGallery,
      };
    })
  );

  for (const v of chandlerVariants) {
    await prisma.productVariant.upsert({
      where: { sku: v.sku },
      update: {
        colorLabelVi: v.colorLabelVi,
        colorLabelEn: v.colorLabelEn,
        colorHex: v.colorHex,
        sizeLabelVi: v.sizeLabelVi,
        sizeLabelEn: v.sizeLabelEn,
        priceAdjustment: v.priceAdjustment,
        stockQuantity: v.stockQuantity,
        imageUrls: v.imageUrls,
      },
      create: { productId: diningProd.id, ...v },
    });
  }

  const blogSeeds = [
    {
      slug: "chon-ghe-thu-gian-the-nao",
      title: "Chọn ghế thư giãn thế nào cho đúng?",
      excerpt: "Gợi ý chọn độ cao, độ nghiêng và chất liệu bọc cho ghế lounge.",
      thumbnailUrl: "https://images.unsplash.com/photo-1618220179428-22790b461013?w=900&q=80",
      authorName: DEFAULT_COMPANY_NAME,
      content:
        "<p>Chiều cao ngồi, độ sâu đệm và góc tựa là ba yếu tố quan trọng khi chọn ghế lounge.</p><p>Hãy thử ngồi ít nhất 5 phút trong showroom và kiểm tra độ êm vùng lưng.</p>",
    },
    {
      slug: "da-vs-go-ban-an",
      title: "Đá nhân tạo hay gỗ tự nhiên cho mặt bàn ăn?",
      excerpt: "So sánh độ bền, vệ sinh và phong cách cho không gian phòng ăn.",
      thumbnailUrl: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=900&q=80",
      authorName: DEFAULT_COMPANY_NAME,
      content:
        "<p>Mặt đá Solid Surface chống thấm tốt; gỗ mang hơi ấm và vân tự nhiên.</p><p>Lựa chọn phụ thuộc lượng ánh sáng và tone màu phòng.</p>",
    },
    {
      slug: "mdf-vs-nhua-go-tu-bep",
      title: "MDF và nhựa gỗ trong tủ bếp — nên chọn loại nào?",
      excerpt: "Độ ẩm, khả năng chịu lực và giá thành trong điều kiện Việt Nam.",
      thumbnailUrl: "https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=900&q=80",
      authorName: DEFAULT_COMPANY_NAME,
      content:
        "<p>MDF phủ laminate phù hợp khí hậu ẩm nếu có xử lý chống nước biên.</p><p>Nhựa gỗ PVC nhẹ, dễ lau nhưng cần chọn độ dày ray và bản lề chất lượng.</p>",
    },
  ];

  for (const b of blogSeeds) {
    await prisma.blogPost.upsert({
      where: { slug: b.slug },
      update: {
        title: b.title,
        excerpt: b.excerpt,
        content: b.content,
        thumbnailUrl: b.thumbnailUrl,
        authorName: b.authorName,
      },
      create: {
        slug: b.slug,
        title: b.title,
        excerpt: b.excerpt,
        content: b.content,
        thumbnailUrl: b.thumbnailUrl,
        authorName: b.authorName,
      },
    });
  }

  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  const sofa = await prisma.productVariant.findFirst({
    where: {
      productId: p1.id,
      colorLabelVi: "Vải óc chó",
      sizeLabelVi: "200×90cm",
    },
    select: { id: true },
  });
  const noOrdersYet = (await prisma.order.count()) === 0;
  if (admin && sofa && noOrdersYet) {
    await prisma.$transaction(async (tx) => {
      const orderNumber = await allocateOrderNumber(tx);
      await tx.order.create({
        data: {
          orderNumber,
          userId: admin.id,
          totalAmount: 12_900_000,
          paymentMethod: PaymentMethod.COD,
          status: OrderStatus.PROCESSING,
          shippingAddress: {
            name: "Admin",
            phone: DEFAULT_HOTLINE,
            email: ADMIN_EMAIL,
            line: "123 Đường mẫu",
            ward: "Phường 1",
            district: "Quận 1",
            city: "TP.HCM",
          },
          items: {
            create: [
              {
                productVariantId: sofa.id,
                quantity: 1,
                price: 12_900_000,
                colorLabelSnapshot: "Vải óc chó",
                sizeLabelSnapshot: "200×90cm",
              },
            ],
          },
        },
      });
    });
  }

  await prisma.$transaction(async (tx) => {
    const missing = await tx.product.findMany({
      where: { productCode: null },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    for (const { id } of missing) {
      const productCode = await allocateProductCode(tx);
      await tx.product.update({ where: { id }, data: { productCode } });
    }
  });

  await prisma.homePageConfig.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      featuredTitle: "Bộ sưu tập nổi bật",
      featuredProductsMode: "AUTO",
      featuredSectionEnabled: true,
      featuredProductIds: [],
      newSectionTitle: "Sản phẩm mới",
      newProductsMode: "AUTO",
      newSectionEnabled: true,
      newProductIds: [],
      newProductsLimit: 12,
      livingSectionTitle: "Sản phẩm nổi bật",
      livingCategorySlug: "phong-khach",
      livingProductsMode: "AUTO",
      livingSectionEnabled: true,
      livingProductIds: [],
      livingLimit: 8,
      newsSectionTitle: "Tin tức",
      newsMode: "AUTO",
      newsSectionEnabled: true,
      newsPostIds: [],
      newsLimit: 3,
    },
  });

  await prisma.retailStore.upsert({
    where: { slug: "showroom-go-vap" },
    update: {
      name: "Showroom Gò Vấp",
      address: "30A Lê Đức Thọ, phường 6, Gò Vấp, TP. Hồ Chí Minh",
      phone: DEFAULT_HOTLINE,
      openingHours: "9:00 – 21:00 (T2 – CN)",
      mapUrl: "https://www.google.com/maps/search/?api=1&query=10.8231%2C106.6873",
      sortOrder: 0,
      active: true,
    },
    create: {
      slug: "showroom-go-vap",
      name: "Showroom Gò Vấp",
      address: "30A Lê Đức Thọ, phường 6, Gò Vấp, TP. Hồ Chí Minh",
      phone: DEFAULT_HOTLINE,
      openingHours: "9:00 – 21:00 (T2 – CN)",
      mapUrl: "https://www.google.com/maps/search/?api=1&query=10.8231%2C106.6873",
      sortOrder: 0,
      active: true,
    },
  });

  await prisma.retailStore.upsert({
    where: { slug: "showroom-quan-1" },
    update: {
      name: "Showroom Quận 1",
      address: "45 Lê Lợi, phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
      phone: DEFAULT_HOTLINE,
      openingHours: "8:30 – 20:00 (T2 – T7), 9:00 – 18:00 (CN)",
      mapUrl: "https://www.google.com/maps/search/?api=1&query=10.7769%2C106.7009",
      sortOrder: 1,
      active: true,
    },
    create: {
      slug: "showroom-quan-1",
      name: "Showroom Quận 1",
      address: "45 Lê Lợi, phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
      phone: DEFAULT_HOTLINE,
      openingHours: "8:30 – 20:00 (T2 – T7), 9:00 – 18:00 (CN)",
      mapUrl: "https://www.google.com/maps/search/?api=1&query=10.7769%2C106.7009",
      sortOrder: 1,
      active: true,
    },
  });

  await prisma.bankAccount.upsert({
    where: { slug: "vietcombank-cty" },
    update: {
      bankName: "Vietcombank (VCB)",
      accountHolder: "CONG TY TNHH AL FURNITURE",
      accountNumber: "0123456789",
      branch: "CN Hồ Chí Minh",
      note: "Nội dung chuyển khoản: ghi mã đơn + SĐT",
      sortOrder: 0,
      active: true,
    },
    create: {
      slug: "vietcombank-cty",
      bankName: "Vietcombank (VCB)",
      accountHolder: "CONG TY TNHH AL FURNITURE",
      accountNumber: "0123456789",
      branch: "CN Hồ Chí Minh",
      note: "Nội dung chuyển khoản: ghi mã đơn + SĐT",
      sortOrder: 0,
      active: true,
    },
  });

  await prisma.bankAccount.upsert({
    where: { slug: "techcombank-cty" },
    update: {
      bankName: "Techcombank (TCB)",
      accountHolder: "CONG TY TNHH AL FURNITURE",
      accountNumber: "998877665544",
      branch: "PGD Gò Vấp",
      note: "Ưu tiên Vietcombank nếu cùng ngân hàng của khách.",
      sortOrder: 1,
      active: true,
    },
    create: {
      slug: "techcombank-cty",
      bankName: "Techcombank (TCB)",
      accountHolder: "CONG TY TNHH AL FURNITURE",
      accountNumber: "998877665544",
      branch: "PGD Gò Vấp",
      note: "Ưu tiên Vietcombank nếu cùng ngân hàng của khách.",
      sortOrder: 1,
      active: true,
    },
  });

  await prisma.siteIntegrationSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      general: {},
      api: {},
      payment: {},
      cloud: {},
      seo: {},
      display: {},
    },
    update: {},
  });

  let faqCount = 0;
  try {
    faqCount = await prisma.faqItem.count();
  } catch {
    faqCount = 0;
  }
  if (faqCount === 0) {
    await prisma.faqItem.createMany({
      data: [
        {
          questionVi: "Thời gian giao hàng như thế nào?",
          questionEn: "What is the delivery time?",
          answerVi: "<p>Thông thường từ <strong>2–5 ngày làm việc</strong> tùy khu vực.</p>",
          answerEn: "<p>Usually <strong>2–5 business days</strong> depending on your area.</p>",
          published: true,
          sortOrder: 0,
        },
        {
          questionVi: "Tôi có thể đổi trả không?",
          questionEn: "Can I return an item?",
          answerVi: "<p>Bạn có thể yêu cầu đổi trả trong <strong>7 ngày</strong> kể từ khi nhận hàng (theo chính sách cửa hàng).</p>",
          answerEn: "<p>Returns can be requested within <strong>7 days</strong> of delivery (per store policy).</p>",
          published: true,
          sortOrder: 1,
        },
      ],
    });
  }

  console.log(`Seed OK — admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
