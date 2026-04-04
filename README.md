# Aura Bakery Shop 🥐

A modern, "digital-first" e-commerce platform custom-built for an artisanal bakery. This application handles complex product variations, dynamic delivery time slots, and dual-routing checkout flows (Secure Payment Gateway or WhatsApp Fallback), all managed via a real-time admin dashboard.

## 🚀 Key Features

* **Advanced Shopping Cart (Zustand):** Handles complex item groupings using unique cryptographic hashes for product variants and flavor preferences, preventing cart duplication errors.
* **Intelligent Time-Slot Management:** Uses Firestore atomic transactions (`runTransaction`) to manage delivery capacity in real-time, preventing overbooking if multiple users check out simultaneously.
* **Dual Checkout Pipeline:**
    * **Wompi Integration:** Server-side cryptographic signatures (SHA-256) and secure webhook listeners for automated payment tracking.
    * **Manual Fallback:** Automated deep-linking to WhatsApp with formatted order receipts for Nequi/Cash payments.
* **Real-Time Admin Dashboard:** A secure, authenticated portal for bakery staff to monitor live orders, manage daily kitchen capacity, and create sub-accounts using a multi-tenant Firebase architecture.
* **Hydration-Safe UI:** Custom hooks and mounted states to ensure flawless Server-Side Rendering (SSR) alongside `localStorage` cart persistence.

## 🛠 Tech Stack

* **Framework:** Next.js (App Router)
* **Styling:** Tailwind CSS
* **State Management:** Zustand
* **Database & Auth:** Firebase (Firestore, Firebase Authentication)
* **Payment Gateway:** Wompi API
* **Icons & Typography:** Lucide React, `next/font` (Cormorant Garamond & Inter)

## 📂 Project Structure

```text
src/
├── app/
│   ├── admin/          # Secure admin dashboard and login
│   ├── actions/        # Next.js Server Actions (Wompi Cryptography)
│   ├── api/            # Serverless API routes (Wompi Webhooks)
│   ├── cart/           # Shopping cart review
│   ├── checkout/       # Checkout pipeline and time-slot validation
│   ├── menu/           # Dynamic catalog and product detail pages
│   └── success/        # Post-purchase confirmation
├── components/
│   └── layout/         # Global Header and Sticky Footer UI
└── lib/
    ├── firebase.ts     # Firebase initialization and singleton pattern
    ├── store.ts        # Zustand global state management
    └── mockData.ts     # Core TypeScript interfaces and catalog data

    🔐 Environment Variables
To run this project locally, create a .env.local file in the root directory and add the following keys:

# Firebase Public Keys
NEXT_PUBLIC_FIREBASE_API_KEY="your_api_key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_domain"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_project_id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your_bucket"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
NEXT_PUBLIC_FIREBASE_APP_ID="your_app_id"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="your_measurement_id"

# Wompi Payment Gateway Keys
NEXT_PUBLIC_WOMPI_PUBLIC_KEY="pub_test_..."
WOMPI_INTEGRITY_SECRET="your_integrity_secret"
WOMPI_EVENTS_SECRET="your_events_secret"

(Note: Never commit your .env.local file to GitHub. It is included in the .gitignore by default).

💻 Getting Started
1. Clone the repository:

git clone [https://github.com/yourusername/aura-bakery-shop.git](https://github.com/yourusername/aura-bakery-shop.git)
cd aura-bakery-shop


2. Install dependencies:
npm install

3. Run the development server:
npm run dev

4. Open the application:
Navigate to http://localhost:3000 in your browser.

🏗 Key Architectural Decisions
. Server Actions for Cryptography: Wompi requires a SHA-256 hash to validate transaction integrity. This is generated inside src/app/actions/wompi.ts using 'use server' to guarantee the WOMPI_INTEGRITY_SECRET never leaks to the client-side bundle.

. Secondary Firebase App Bypass: Creating a new employee account in Firebase automatically signs out the current user. To prevent the Admin from being logged out when onboarding staff, the app spins up a temporary, isolated Firebase instance (SecondaryApp) strictly for account creation.

. Variant ID Hashing: To solve the e-commerce challenge of grouping identical base products with different flavors, the Zustand store generates a cartItemId hash (e.g., prod_pasteis_v_2_p_areq) to manage quantities accurately.

🌐 Deployment
This project is optimized for deployment on Vercel.

1. Push your code to GitHub.

2. Import the repository into Vercel.

3. Copy all variables from your .env.local into Vercel's Environment Variables settings before clicking "Deploy".