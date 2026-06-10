import prisma from "../lib/prisma.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../lib/AppError.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

/* ── Multer: save uploaded fish images to public/uploads/fish/ ── */
const uploadDir = path.join(__dirname, "../../../public/uploads/fish");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename:    (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `fish-${Date.now()}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB cap
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) return cb(null, true);
    cb(new AppError("Only image files are allowed.", 400));
  },
});

/* ── Helper: delete an old image file safely ── */
function deleteImageFile(imageUrl) {
  if (!imageUrl) return;
  // imageUrl looks like "/uploads/fish/fish-1234.jpg"
  const relativePath = imageUrl.startsWith("/") ? imageUrl.slice(1) : imageUrl;
  const filePath = path.join(__dirname, "../../../public", relativePath);
  fs.unlink(filePath, (err) => {
    if (err && err.code !== "ENOENT") {
      console.warn(`⚠️ Could not delete old fish image: ${filePath}`);
    }
  });
}

/* ── Helper: build the stored URL from a multer file ── */
function toImageUrl(file) {
  return file ? `/uploads/fish/${file.filename}` : null;
}

/* ────────────────────────────────────────────────────────────────
   Controllers
   ──────────────────────────────────────────────────────────────── */

/**
 * GET /api/fish
 * Returns all fish species. Supports optional ?search= for case-insensitive name search.
 */
export const getAllFish = asyncHandler(async (req, res) => {
  const { search } = req.query;

  const where = search
    ? {
        OR: [
          { name:           { contains: search, mode: "insensitive" } },
          { scientificName: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const fish = await prisma.fishSpecies.findMany({ where, orderBy: { name: "asc" } });
  return res.status(200).json(fish);
});

/**
 * GET /api/fish/:id
 */
export const getFishById = asyncHandler(async (req, res) => {
  const fish = await prisma.fishSpecies.findUnique({ where: { id: req.params.id } });
  if (!fish) throw new AppError("Fish species not found.", 404);
  return res.status(200).json(fish);
});

/**
 * POST /api/fish
 * SUPER_ADMIN only. Accepts multipart/form-data with optional `image` file.
 */
export const createFish = asyncHandler(async (req, res) => {
  const {
    name, scientificName, description,
    phMin, phMax, tempMin, tempMax, tdsMin, tdsMax, turbidityMax,
  } = req.body;

  if (!name?.trim()) {
    // Clean up uploaded file if validation fails
    if (req.file) deleteImageFile(toImageUrl(req.file));
    throw new AppError("Fish name is required.", 400);
  }

  const existing = await prisma.fishSpecies.findUnique({ where: { name: name.trim() } });
  if (existing) {
    if (req.file) deleteImageFile(toImageUrl(req.file));
    throw new AppError(`A species named "${name.trim()}" already exists.`, 409);
  }

  const fish = await prisma.fishSpecies.create({
    data: {
      name:           name.trim(),
      scientificName: scientificName?.trim() || null,
      description:    description?.trim()    || null,
      imageUrl:       toImageUrl(req.file),
      phMin:          phMin        != null ? parseFloat(phMin)        : null,
      phMax:          phMax        != null ? parseFloat(phMax)        : null,
      tempMin:        tempMin      != null ? parseFloat(tempMin)      : null,
      tempMax:        tempMax      != null ? parseFloat(tempMax)      : null,
      tdsMin:         tdsMin       != null ? parseFloat(tdsMin)       : null,
      tdsMax:         tdsMax       != null ? parseFloat(tdsMax)       : null,
      turbidityMax:   turbidityMax != null ? parseFloat(turbidityMax) : null,
    },
  });

  return res.status(201).json(fish);
});

/**
 * PUT /api/fish/:id
 * SUPER_ADMIN only. Accepts multipart/form-data with optional `image` file.
 * If a new image is uploaded, the old one is deleted from disk.
 */
export const updateFish = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.fishSpecies.findUnique({ where: { id } });
  if (!existing) {
    if (req.file) deleteImageFile(toImageUrl(req.file));
    throw new AppError("Fish species not found.", 404);
  }

  const {
    name, scientificName, description,
    phMin, phMax, tempMin, tempMax, tdsMin, tdsMax, turbidityMax,
    removeImage,
  } = req.body;

  const data = {};
  if (name           !== undefined) data.name           = name.trim();
  if (scientificName !== undefined) data.scientificName = scientificName?.trim() || null;
  if (description    !== undefined) data.description    = description?.trim()    || null;
  if (phMin        != null)  data.phMin        = parseFloat(phMin);
  if (phMax        != null)  data.phMax        = parseFloat(phMax);
  if (tempMin      != null)  data.tempMin      = parseFloat(tempMin);
  if (tempMax      != null)  data.tempMax      = parseFloat(tempMax);
  if (tdsMin       != null)  data.tdsMin       = parseFloat(tdsMin);
  if (tdsMax       != null)  data.tdsMax       = parseFloat(tdsMax);
  if (turbidityMax != null)  data.turbidityMax = parseFloat(turbidityMax);

  // Handle image update (defer deleting old files until DB update succeeds)
  const newImageUrl = req.file ? toImageUrl(req.file) : null;

  if (req.file) {
    data.imageUrl = newImageUrl;
  } else if (removeImage === "true") {
    data.imageUrl = null;
  }

  let updated;
  try {
    updated = await prisma.fishSpecies.update({ where: { id }, data });
  } catch (err) {
    // Clean up newly uploaded file if the DB update fails
    if (req.file) deleteImageFile(newImageUrl);
    throw err;
  }

  // Remove old image only after DB update succeeded
  if (req.file || removeImage === "true") {
    if (existing.imageUrl && existing.imageUrl !== updated.imageUrl) deleteImageFile(existing.imageUrl);
  }

  return res.status(200).json(updated);
});

/**
 * DELETE /api/fish/:id
 * SUPER_ADMIN only. Also removes the stored image file.
 */
export const deleteFish = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.fishSpecies.findUnique({ where: { id } });
  if (!existing) throw new AppError("Fish species not found.", 404);

  if (existing.imageUrl) deleteImageFile(existing.imageUrl);
  await prisma.fishSpecies.delete({ where: { id } });

  return res.status(200).json({ message: `"${existing.name}" deleted successfully.` });
});
