/**
 * Fish Species Seeder
 * Run with: node fishSeed.js  (from the backend/ directory)
 *
 * Pre-populates the FishSpecies collection with common freshwater aquarium fish
 * and their research-verified water condition ranges.
 */

import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

export const FISH_SPECIES = [
  {
    name: "Nile Tilapia",
    scientificName: "Oreochromis niloticus",
    description:
      "Hardy, fast-growing freshwater fish widely farmed across tropical regions and Sri Lankan inland aquaculture.",
    imageUrl: "/uploads/fish/tilapia.png",
    phMin: 6.0, phMax: 9.0,
    tempMin: 20, tempMax: 35,
    tdsMin: 100, tdsMax: 2000,
    turbidityMax: 100,
  },
  {
    name: "Koi Carp",
    scientificName: "Cyprinus rubrofuscus",
    description:
      "Ornamental carp prized for vivid colour patterns. Extremely popular in Sri Lankan garden ponds and large display aquariums.",
    imageUrl: "/uploads/fish/koi.png",
    phMin: 6.8, phMax: 8.2,
    tempMin: 15, tempMax: 25,
    tdsMin: 100, tdsMax: 1000,
    turbidityMax: 40,
  },
  {
    name: "Guppy",
    scientificName: "Poecilia reticulata",
    description:
      "One of the most popular tropical fish, known for vibrant colours and peaceful temperament. Widely bred for export in Sri Lanka.",
    imageUrl: "/uploads/fish/guppy.png",
    phMin: 6.8, phMax: 7.8,
    tempMin: 22, tempMax: 28,
    tdsMin: 100, tdsMax: 400,
    turbidityMax: 10,
  },
  {
    name: "Betta Fish",
    scientificName: "Betta splendens",
    description:
      "Famous for striking flowing fins and bold personality. Bettas prefer warm, low-flow water and dense aquatic vegetation.",
    imageUrl: "/uploads/fish/betta.png",
    phMin: 6.5, phMax: 7.5,
    tempMin: 24, tempMax: 30,
    tdsMin: 50, tdsMax: 300,
    turbidityMax: 8,
  },
  {
    name: "Molly",
    scientificName: "Poecilia sphenops",
    description:
      "Hardy, versatile livebearers that adapt well to a wide range of water conditions. Well-suited for community tanks.",
    imageUrl: "/uploads/fish/molly.png",
    phMin: 7.0, phMax: 8.0,
    tempMin: 22, tempMax: 28,
    tdsMin: 150, tdsMax: 600,
    turbidityMax: 15,
  },
  {
    name: "Platy",
    scientificName: "Xiphophorus maculatus",
    description:
      "Colourful and peaceful livebearers that thrive in active community aquariums. Easy to care for and highly prolific.",
    imageUrl: "/uploads/fish/platy.png",
    phMin: 7.0, phMax: 8.0,
    tempMin: 20, tempMax: 26,
    tdsMin: 150, tdsMax: 500,
    turbidityMax: 12,
  },
  {
    name: "Neon Tetra",
    scientificName: "Paracheirodon innesi",
    description:
      "Iconic schooling fish with a brilliant blue-red lateral stripe. Thrives in soft, slightly acidic tropical waters.",
    imageUrl: "/uploads/fish/neon-tetra.png",
    phMin: 6.0, phMax: 7.0,
    tempMin: 20, tempMax: 26,
    tdsMin: 50, tdsMax: 200,
    turbidityMax: 5,
  },
  {
    name: "Goldfish",
    scientificName: "Carassius auratus",
    description:
      "Classic coldwater ornamental species. Produces higher organic load and requires clean, well-oxygenated water.",
    imageUrl: "/uploads/fish/goldfish.png",
    phMin: 7.0, phMax: 8.0,
    tempMin: 12, tempMax: 24,
    tdsMin: 100, tdsMax: 400,
    turbidityMax: 20,
  },
  {
    name: "Angelfish",
    scientificName: "Pterophyllum scalare",
    description:
      "Statuesque cichlid native to the Amazon basin. Requires tall aquariums, gentle filtration, and stable temperature.",
    imageUrl: "/uploads/fish/angelfish.png",
    phMin: 6.5, phMax: 7.5,
    tempMin: 24, tempMax: 30,
    tdsMin: 100, tdsMax: 400,
    turbidityMax: 10,
  },
  {
    name: "Discus",
    scientificName: "Symphysodon spp.",
    description:
      "Prized 'King of the Aquarium'. Highly sensitive species demanding warm, soft, pristine water conditions.",
    imageUrl: "/uploads/fish/discus.png",
    phMin: 5.5, phMax: 7.0,
    tempMin: 28, tempMax: 32,
    tdsMin: 50, tdsMax: 200,
    turbidityMax: 5,
  },
  {
    name: "Corydoras Catfish",
    scientificName: "Corydoras paleatus",
    description:
      "Peaceful bottom-dwellers that act as a natural clean-up crew. Social fish that prefer sandy substrates.",
    imageUrl: "/uploads/fish/corydoras.png",
    phMin: 6.0, phMax: 7.5,
    tempMin: 20, tempMax: 26,
    tdsMin: 100, tdsMax: 400,
    turbidityMax: 15,
  },
  {
    name: "Zebra Danio",
    scientificName: "Danio rerio",
    description:
      "Hardy and active schooling fish with distinctive horizontal stripes. Ideal for beginners due to their resilience.",
    imageUrl: "/uploads/fish/zebra-danio.png",
    phMin: 6.5, phMax: 7.5,
    tempMin: 18, tempMax: 26,
    tdsMin: 50, tdsMax: 400,
    turbidityMax: 15,
  },
  {
    name: "Common Carp (Grass / Mirror Carp)",
    scientificName: "Cyprinus carpio",
    description:
      "Robust freshwater species widely cultured in Sri Lankan commercial aquaculture and outdoor display ponds.",
    imageUrl: "/uploads/fish/carp.png",
    phMin: 6.5, phMax: 8.5,
    tempMin: 18, tempMax: 28,
    tdsMin: 100, tdsMax: 500,
    turbidityMax: 25,
  },
  {
    name: "Walking Catfish (Clarias)",
    scientificName: "Clarias batrachus",
    description:
      "Air-breathing freshwater catfish native to South Asia. Highly resilient to low oxygen levels and turbid waters.",
    imageUrl: "/uploads/fish/catfish.png",
    phMin: 6.5, phMax: 8.0,
    tempMin: 22, tempMax: 30,
    tdsMin: 80, tdsMax: 450,
    turbidityMax: 30,
  },
  {
    name: "Dwarf Gourami",
    scientificName: "Trichogaster lalius",
    description:
      "Peaceful labyrinth fish with brilliant turquoise and orange stripes. Popular centerpiece for Sri Lankan planted aquariums.",
    imageUrl: "/uploads/fish/dwarf-gourami.png",
    phMin: 6.0, phMax: 7.5,
    tempMin: 22, tempMax: 28,
    tdsMin: 50, tdsMax: 300,
    turbidityMax: 10,
  },
  {
    name: "Giant Gourami",
    scientificName: "Osphronemus goramy",
    description:
      "Impressive, intelligent freshwater giant widespread in Sri Lankan large exhibition tanks and commercial culture.",
    imageUrl: "/uploads/fish/giant-gourami.png",
    phMin: 6.5, phMax: 7.8,
    tempMin: 24, tempMax: 30,
    tdsMin: 100, tdsMax: 500,
    turbidityMax: 15,
  },
  {
    name: "Silver Arowana",
    scientificName: "Osteoglossum bicirrhosum",
    description:
      "Prehistoric surface predator known as the 'Dragon Fish'. Demands large aquariums and tight-fitting covers.",
    imageUrl: "/uploads/fish/arowana.png",
    phMin: 6.0, phMax: 7.2,
    tempMin: 24, tempMax: 30,
    tdsMin: 50, tdsMax: 300,
    turbidityMax: 8,
  },
  {
    name: "Tiger Barb",
    scientificName: "Puntigrus tetrazona",
    description:
      "Active, fast-swimming schooling barb with distinct black vertical bands. Heavily exported from Sri Lankan fish farms.",
    imageUrl: "/uploads/fish/tiger-barb.png",
    phMin: 6.0, phMax: 7.5,
    tempMin: 22, tempMax: 26,
    tdsMin: 50, tdsMax: 350,
    turbidityMax: 12,
  },
  {
    name: "Rainbow Shark",
    scientificName: "Epalzeorhynchos frenatum",
    description:
      "Sleek, semi-aggressive bottom swimmer featuring a dark grey body with vivid red/orange fins.",
    imageUrl: "/uploads/fish/rainbow-shark.png",
    phMin: 6.5, phMax: 7.8,
    tempMin: 24, tempMax: 28,
    tdsMin: 100, tdsMax: 400,
    turbidityMax: 10,
  },
  {
    name: "Oscar Fish",
    scientificName: "Astronotus ocellatus",
    description:
      "Intelligent, highly responsive South American cichlid popular in Sri Lanka for its strong personality and bright markings.",
    imageUrl: "/uploads/fish/oscar.png",
    phMin: 6.5, phMax: 7.5,
    tempMin: 23, tempMax: 28,
    tdsMin: 100, tdsMax: 450,
    turbidityMax: 12,
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
