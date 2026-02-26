# AYUSH AI Assistant 🌿

A clean, Firebase-powered wellness web app that combines:
- a modern AYUSH landing page,
- a searchable herbal encyclopedia, and
- an authenticated admin panel for managing herb records.

The project is built with plain HTML/CSS/JavaScript (no build step) and integrates IBM watsonx Assistant chat on the home page.

## ✨ Features

- **Modern multi-page UI**
  - `index.html`: Product landing page with feature highlights and embedded Watson assistant chat.
  - `herbs.html`: Live herbal encyclopedia with search + category filters.
  - `admin.html`: Secure admin dashboard for data entry and management.
- **Realtime Firestore data sync**
  - Herb entries are loaded live from Firebase Firestore.
- **Admin authentication**
  - Firebase Email/Password sign-in gate for admin actions.
- **CSV bulk import for herbs**
  - Upload multiple herb records from CSV.
  - Includes downloadable CSV template support in admin panel.
- **Theme system**
  - Shared light/dark mode toggle stored in `localStorage`.

## 🧱 Project Structure

```text
.
├── index.html            # Home page + Watson chat embed
├── herbs.html            # Herbal encyclopedia UI
├── herbs.js              # Firestore fetch + filtering logic
├── admin.html            # Admin login and management UI
├── admin.js              # Auth, CRUD, CSV import/template logic
├── firebase-init.js      # Firebase app/auth/firestore/analytics init
├── theme.css             # Shared design system and base styles
├── theme.js              # Theme toggle behavior
└── ayush_herbal_assistant_100x100.png
```

## 🔧 Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES Modules)
- **Backend services:** Firebase Auth, Cloud Firestore, Firebase Analytics
- **AI Chat:** IBM watsonx Assistant Web Chat

## 🚀 Getting Started

Because this project uses JavaScript modules and remote Firebase SDKs, run it from a local web server (not `file://`).

### 1) Clone and open the project

```bash
git clone <your-repo-url>
cd ayush-ai-assistant
```

### 2) Serve locally

Use any static server. Example options:

```bash
python3 -m http.server 8080
```

or

```bash
npx serve .
```

Then open:

- `http://localhost:8080/index.html`
- `http://localhost:8080/herbs.html`
- `http://localhost:8080/admin.html`

## 🔐 Firebase Setup

Firebase is initialized in `firebase-init.js`.

To use your own Firebase project:

1. Create a Firebase project.
2. Enable **Authentication → Email/Password**.
3. Create a **Cloud Firestore** database.
4. Replace the `firebaseConfig` values in `firebase-init.js` with your project config.
5. Ensure Firestore security rules allow the access model you want.

> Note: The admin panel currently authorizes specific email(s) in code. Update the `ADMIN_EMAILS` list in `admin.js` to manage allowed admins.

## 📄 CSV Upload Format (Admin)

The admin bulk uploader expects this exact header row:

```csv
name,category,benefits,used_for,forms,dosage,precautions
```

For list-type columns (`benefits`, `used_for`, `forms`, `precautions`), separate multiple values using a pipe (`|`), for example:

```csv
Ashwagandha,Adaptogen,Stress relief|Energy support,Stress|Fatigue,Powder|Capsule,1-2g daily,Consult physician during pregnancy
```

## 🛡️ Important Notes

- This app provides educational wellness information and is **not** a substitute for professional medical advice.
- Always validate herb recommendations and dosages with qualified practitioners.
- Keep API keys and access policies aligned with your deployment security requirements.

## 📌 Future Improvements

- Add pagination/virtualized list for large herb datasets.
- Add role-based access (custom claims) instead of hardcoded admin emails.
- Add edit/update workflows for existing herbs.
- Add automated tests and linting.

## 📃 License

Add your preferred license (MIT, Apache-2.0, etc.) in a `LICENSE` file.
