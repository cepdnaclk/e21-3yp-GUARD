# Fish Info Feature Documentation

This document describes the design, permissions, database model, backend APIs, and frontend pages implemented for the **Fish Info** feature in the G.U.A.R.D project.

---

## 1. Feature Overview
The **Fish Info** feature provides a comprehensive catalogue of freshwater aquarium fish species, detailing their scientific names, descriptions, and recommended water parameter ranges (Temperature, pH, TDS, and Turbidity). It also integrates with local tank configurations to check for species compatibility and apply species parameters as tank presets.

---

## 2. Role-Based Access Control (RBAC)

The feature enforces strict permissions to separate the product seller (manufacturer) from client admins and workers:

| Action | `SUPER_ADMIN` (Product Seller) | `ADMIN` (Tank Owner) | `USER` (Worker/Viewer) |
|---|:---:|:---:|:---:|
| **Browse Catalogue** | Yes | Yes | Yes |
| **Search/Filter Species** | Yes | Yes | Yes |
| **View Parameter Ranges** | Yes | Yes | Yes |
| **Check Tank Compatibility** | Yes | Yes | Yes |
| **Add / Edit / Delete Species** | **Yes** | No | No |
| **Upload Species Photo** | **Yes** | No | No |
| **Apply Fish Presets to Tanks** | No | **Yes** | No |

*   **`SUPER_ADMIN`**: Acts as the product/system administrator. They can modify the catalogue and upload photos of fishes directly to the server. They cannot apply presets to tanks (since they do not own or manage specific client hardware).
*   **`ADMIN`**: Acts as the facility manager. They browse the catalogue, compare fish compatibility with their tanks, and apply fish parameters directly as warning thresholds for their devices.
*   **`USER`**: Can only browse the catalogue and check compatibility. They cannot perform any modifications or change thresholds.

---

## 3. Database Schema

The database model is defined in [`schema.prisma`](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/backend/prisma/schema.prisma):

```prisma
model FishSpecies {
  id             String   @id @default(auto()) @map("_id") @db.ObjectId
  name           String   @unique
  scientificName String?
  description    String?
  imageUrl       String?  // Stored locally: e.g. "/uploads/fish/filename.png"
  phMin          Float?
  phMax          Float?
  tempMin        Float?
  tempMax        Float?
  tdsMin         Float?
  tdsMax         Float?
  turbidityMax   Float?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

---

## 4. Backend APIs & File Uploads

### Local Image Uploads via Multer
To avoid unsafe external URLs, photos are uploaded directly to the backend server:
*   **Storage Folder**: `code/public/uploads/fish/`
*   **Static Endpoint**: Served at `/uploads` by the Express app in [`index.js`](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/backend/src/index.js#L30):
    ```javascript
    app.use('/uploads', express.static(path.join(__dirname, '../../public/uploads')));
    ```
*   **Multer Middleware**: Set up in [`fishController.js`](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/backend/src/controllers/fishController.js#L16-L31) to handle uploads up to **5MB** and filter out non-image files.

### Routes Configuration ([`fishRoutes.js`](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/backend/src/routes/fishRoutes.js))
*   `GET /api/fish` — Returns all fish species (available to all logged-in roles).
*   `GET /api/fish/:id` — Returns detail of a single species.
*   `POST /api/fish` — Create a new species (`SUPER_ADMIN` only, accepts multipart/form-data upload).
*   `PUT /api/fish/:id` — Update species (`SUPER_ADMIN` only, deletes old file from disk if replaced).
*   `DELETE /api/fish/:id` — Delete species (`SUPER_ADMIN` only, deletes associated file from disk).

---

## 5. Frontend UI Component ([`FishInfo.jsx`](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/frontend/src/pages/FishInfo.jsx))

The frontend implementation consists of three primary parts:

1.  **Main Catalogue View**: 
    *   Features a search input to instantly filter species.
    *   Displays cards with the fish image and basic safe ranges.
    *   Shows a **"＋ Add Species"** button at the top-right only if logged in as `SUPER_ADMIN`.
2.  **Detail Side-Drawer**:
    *   Reveals detailed descriptions and a comprehensive range grid.
    *   Contains the **Tank Compatibility Checker**: Admins and Users can choose a tank from the dropdown list to compare current live sensor telemetry directly against the fish's ideal ranges.
    *   Contains the **Apply as Tank Preset** action (exclusive to the `ADMIN` role).
    *   Shows **"✏️ Edit"** and **"🗑 Delete"** buttons (exclusive to the `SUPER_ADMIN` role).
3.  **Add / Edit Modal**:
    *   A clean pop-up modal containing the form fields and a file upload drag-and-drop zone with instant photo previews.

---

## 6. Seeding Data

A seeder script [`fishSeed.js`](file:///c:/Users/ravin/Documents/Projects/e21-3yp-GUARD/code/backend/fishSeed.js) is provided to seed 10 common freshwater species (e.g. Guppy, Goldfish, Neon Tetra, Betta, Discus, Angelfish) into the database with high-resolution, local, safe-hosted images.

To run the seeder:
```powershell
cd code/backend
node fishSeed.js
```
