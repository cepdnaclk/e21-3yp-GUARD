/**
 * Fish Species Seeder
 * Run with: node fishSeed.js  (from the backend/ directory)
 *
 * Pre-populates the FishSpecies collection with common freshwater aquarium fish
 * and their safe water condition ranges.
 */

import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

const FISH_SPECIES = [
  {
    name: "Guppy",
    scientificName: "Poecilia reticulata",
    description:
      "One of the most popular freshwater fish, known for their vibrant colours and peaceful temperament. Highly adaptable and ideal for beginners.",
    imageUrl: null,
    phMin: 6.8, phMax: 7.8,
    tempMin: 22, tempMax: 28,
    tdsMin: 100, tdsMax: 400,
    turbidityMax: 10,
  },
  {
    name: "Betta Fish",
    scientificName: "Betta splendens",
    description:
      "Famous for their striking fins and bold personality. Bettas prefer slightly warmer, low-flow water and should be kept alone or with calm tank-mates.",
    imageUrl:
      "https://inaturalist-open-data.s3.amazonaws.com/photos/211724756/medium.jpg",
    phMin: 6.5, phMax: 7.5,
    tempMin: 24, tempMax: 30,
    tdsMin: 50, tdsMax: 300,
    turbidityMax: 8,
  },
  {
    name: "Molly",
    scientificName: "Poecilia sphenops",
    description:
      "Hardy and versatile, Mollies adapt well to a wide range of water conditions. They are livebearers and well-suited to community tanks.",
    imageUrl:
      "https://inaturalist-open-data.s3.amazonaws.com/photos/226944435/medium.jpg",
    phMin: 7.0, phMax: 8.0,
    tempMin: 22, tempMax: 28,
    tdsMin: 150, tdsMax: 600,
    turbidityMax: 15,
  },
  {
    name: "Platy",
    scientificName: "Xiphophorus maculatus",
    description:
      "Colourful and peaceful livebearers that thrive in community tanks. They are easy to care for and available in dozens of colour varieties.",
    imageUrl:
      "https://inaturalist-open-data.s3.amazonaws.com/photos/193613671/medium.jpg",
    phMin: 7.0, phMax: 8.0,
    tempMin: 20, tempMax: 26,
    tdsMin: 150, tdsMax: 500,
    turbidityMax: 12,
  },
  {
    name: "Neon Tetra",
    scientificName: "Paracheirodon innesi",
    description:
      "Iconic schooling fish with a brilliant blue-red stripe. Neon Tetras prefer soft, slightly acidic water and look best in groups of six or more.",
    imageUrl:
      "https://inaturalist-open-data.s3.amazonaws.com/photos/185358832/medium.jpg",
    phMin: 6.0, phMax: 7.0,
    tempMin: 20, tempMax: 26,
    tdsMin: 50, tdsMax: 200,
    turbidityMax: 5,
  },
  {
    name: "Goldfish",
    scientificName: "Carassius auratus",
    description:
      "One of the oldest domesticated fish. Goldfish prefer cooler water than most tropical species and produce significant waste, requiring strong filtration.",
    imageUrl:
      "https://inaturalist-open-data.s3.amazonaws.com/photos/207918161/medium.jpg",
    phMin: 7.0, phMax: 8.0,
    tempMin: 10, tempMax: 22,
    tdsMin: 100, tdsMax: 400,
    turbidityMax: 20,
  },
  {
    name: "Angelfish",
    scientificName: "Pterophyllum scalare",
    description:
      "Elegant and statuesque, Angelfish are a classic centerpiece fish. They need tall tanks and slightly acidic to neutral water to thrive.",
    imageUrl:
      "https://inaturalist-open-data.s3.amazonaws.com/photos/204487491/medium.jpg",
    phMin: 6.5, phMax: 7.5,
    tempMin: 24, tempMax: 30,
    tdsMin: 100, tdsMax: 400,
    turbidityMax: 10,
  },
  {
    name: "Discus",
    scientificName: "Symphysodon spp.",
    description:
      "Often called the 'King of the Aquarium', Discus are demanding fish that require very warm, soft, and pristine water. Best suited for experienced hobbyists.",
    imageUrl:
      "https://inaturalist-open-data.s3.amazonaws.com/photos/181536543/medium.jpg",
    phMin: 5.5, phMax: 7.0,
    tempMin: 28, tempMax: 32,
    tdsMin: 50, tdsMax: 200,
    turbidityMax: 5,
  },
  {
    name: "Corydoras Catfish",
    scientificName: "Corydoras paleatus",
    description:
      "Peaceful bottom-dwellers that act as a natural clean-up crew. They are social fish that should be kept in groups and prefer sandy substrates.",
    imageUrl:
      "https://inaturalist-open-data.s3.amazonaws.com/photos/207459882/medium.jpg",
    phMin: 6.0, phMax: 7.5,
    tempMin: 20, tempMax: 26,
    tdsMin: 100, tdsMax: 400,
    turbidityMax: 15,
  },
  {
    name: "Zebra Danio",
    scientificName: "Danio rerio",
    description:
      "Hardy and active schooling fish with distinctive horizontal blue-and-silver stripes. Ideal for beginners due to their resilience and adaptability.",
    imageUrl:
      "https://inaturalist-open-data.s3.amazonaws.com/photos/169742910/medium.jpg",
    phMin: 6.5, phMax: 7.5,
    tempMin: 18, tempMax: 26,
    tdsMin: 50, tdsMax: 400,
    turbidityMax: 15,
  },
];

async function main() {
  console.log("🐠 Seeding fish species...");

  for (const species of FISH_SPECIES) {
    const result = await prisma.fishSpecies.upsert({
      where: { name: species.name },
      update: species,
      create: species,
    });
    console.log(`  ✅ ${result.name} (${result.id})`);
  }

  console.log(`\n✨ Done! ${FISH_SPECIES.length} species seeded.`);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
