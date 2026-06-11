# 🐠 AquaSense Monitor: Aquarium Intelligence System

An interactive, responsive full-stack web application designed for freshwater aquarium monitoring and species management. AquaSense Monitor tracks, displays, and searches suitable water conditions—including pH, temperature, TDS, and turbidity ranges—for various aquarium fish species.

---

## 🚀 Key Features

- **Species Dashboard**: A responsive grid interface displaying fish cards with hover micro-animations.
- **Dynamic Search & Filtering**: Real-time frontend search integrated with a backend fuzzy regex matcher.
- **Automated Database Seeding**: Pre-loaded default species profiles (Guppies, Mollies, Platies) for instant deployment and testing.
- **Clean Layout Architecture**: Multi-pane dashboard featuring a top header navigation bar, a list-based sidebar, and a dynamic main content section.

---

## 🛠️ Tech Stack & Architecture

AquaSense Monitor is built as a split client-server architecture:

### Frontend
* **Core**: React 19 (JSX, Hooks)
* **Build Tool**: Vite (Fast HMR)
* **Routing**: React Router DOM (v7)
* **HTTP Client**: Axios (configured with base URL mapping)
* **Styling**: Vanilla CSS / Inline styles for modularity, clean layouts, and card transitions

### Backend
* **Runtime**: Node.js & Express
* **Database**: MongoDB (Object data modeling via Mongoose)
* **Configuration**: Dotenv for environment variables
* **CORS**: Enabled cross-origin requests for local development
* **Daemon**: Nodemon for automatic server reloads during development

---

## 📁 Project Directory Structure

```text
aquarium-fish-info/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js          # MongoDB connection handler
│   │   ├── models/
│   │   │   └── Fish.js        # Mongoose schema for Fish parameters
│   │   ├── routes/
│   │   │   └── fishRoutes.js  # REST API endpoints (GET, GET by ID, SEARCH)
│   │   ├── seed.js            # Initial database populator script
│   │   └── server.js          # Main Express app and server startup
│   ├── .env                   # Backend environment configurations
│   ├── package.json
│   └── test-db.js             # Utility database tester script
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── FishCard.jsx   # Visual card with mouse hover effects
│   │   │   ├── Header.jsx     # Navigation header
│   │   │   └── Layout.jsx     # Main frame layout (Sidebar + Content)
│   │   ├── pages/
│   │   │   ├── FishDetails.jsx# Detailed water condition dashboard
│   │   │   └── Home.jsx       # Landing dashboard with search capabilities
│   │   ├── services/
│   │   │   ├── api.js         # Centralized Axios client setup
│   │   │   └── fishService.js # API helper calls to backend
│   │   ├── App.css
│   │   ├── App.jsx            # Routing and paths configuration
│   │   ├── index.css          # Main styling variables
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md                  # Project documentation (this file)
```

---

## 🗄️ Database Model: `Fish`

The Mongoose model ([Fish.js](file:///c:/Users/ravin/Desktop/aquarium-fish-info/backend/src/models/Fish.js)) defines the attributes required to keep a species safe:

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `String` | Yes | Common name of the fish (e.g. "Guppy") |
| `scientificName`| `String` | No | Binomial scientific name |
| `description` | `String` | No | Short care profile/summary |
| `imageUrl` | `String` | No | URL link to a profile image |
| `phMin` / `phMax` | `Number` | No | Recommended pH range |
| `tempMin` / `tempMax`| `Number` | No | Safe temperature limits in °C |
| `tdsMin` / `tdsMax` | `Number` | No | Total Dissolved Solids range (ppm) |
| `turbidityMin` / `turbidityMax`| `Number` | No | NTU range for water clarity |

---

## 🔌 API Endpoints Reference

The backend exposes the following REST endpoints under the base URL `/api/fish`:

### 1. Get All Fish
* **Route**: `GET /api/fish`
* **Description**: Returns a list of all registered fish species profiles.
* **Response**: `200 OK` with JSON array.

### 2. Get Fish by ID
* **Route**: `GET /api/fish/:id`
* **Description**: Returns detailed info for a single species using its MongoDB ObjectId.
* **Response**: `200 OK` with a single JSON object, or `404 Not Found`.

### 3. Search Fish by Name
* **Route**: `GET /api/fish/search/:name`
* **Description**: Case-insensitive regex search matching the fish's common name.
* **Response**: `200 OK` with JSON array of matches.

---

## 🛠️ Local Setup & Installation

### 1. Prerequisites
Ensure you have the following installed on your system:
- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)
- **MongoDB** (local community server instance or a MongoDB Atlas connection string)

### 2. Backend Setup
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install the backend dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root of the `backend/` directory and add your MongoDB connection string and port:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/aquarium-fish-db
   ```
4. Seed the database with the default fish profiles:
   ```bash
   node src/seed.js
   ```
5. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The backend will be available at `http://localhost:5000`.*

### 3. Frontend Setup
1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The application will launch locally (typically at `http://localhost:5173`).*

---

## 📺 Component Interface Breakdown

1. **`Layout`**: Provides the structural grid of the application, placing a dark theme header on top, a light gray sidebar on the left, and a white content viewport on the right.
2. **`Home Page`**: Uses React state to monitor the search bar. Whenever the user inputs text, the sidebar and the main grid adapt immediately using the backend search route.
3. **`FishCard`**: Displays the species name, scientific name, and cover image. Hovering over a card translates the element upwards and intensifies the shadow to feel alive.
4. **`FishDetails Page`**: Accesses parameters via React Router parameters (`:id`) and presents them in a detailed visual layout showing Water Condition threshold cards.
