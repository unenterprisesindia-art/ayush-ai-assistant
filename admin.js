import { auth, db } from "./firebase-init.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const statusLine = document.getElementById("status");
const authMessage = document.getElementById("authMessage");
const authForm = document.getElementById("authForm");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const signOutBtn = document.getElementById("signOutBtn");
const adminContent = document.getElementById("adminContent");

const herbForm = document.getElementById("herbForm");
const entryList = document.getElementById("entryList");

const nameInput = document.getElementById("nameInput");
const categoryInput = document.getElementById("categoryInput");
const benefitsInput = document.getElementById("benefitsInput");
const usedForInput = document.getElementById("usedForInput");
const formsInput = document.getElementById("formsInput");
const imageUrlInput = document.getElementById("imageUrlInput");
const dosageInput = document.getElementById("dosageInput");
const precautionsInput = document.getElementById("precautionsInput");

const csvInput = document.getElementById("csvInput");
const uploadCsvBtn = document.getElementById("uploadCsvBtn");
const downloadTemplateBtn = document.getElementById("downloadTemplateBtn");

const herbsCollection = collection(db, "herbs");
const CSV_HEADERS = ["name", "category", "benefits", "used_for", "forms", "image_url", "dosage", "precautions"];
const BATCH_LIMIT = 450;
const ADMIN_EMAILS = ["unenterprisesindia@gmail.com"];

let unsubscribeHerbs = null;
let adminAuthorized = false;

function isAuthorizedAdmin(user) {
  const email = user?.email?.toLowerCase();
  return Boolean(email && ADMIN_EMAILS.includes(email));
}

function setAdminVisibility(isVisible) {
  adminContent.hidden = !isVisible;
  signOutBtn.hidden = !isVisible;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function splitList(value = "") {
  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCsvLine(line = "") {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      const next = line[index + 1];
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current.trim());
  return cells;
}

function toArray(text) {
  return text
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function renderEntries(items) {
  if (!items.length) {
    entryList.innerHTML = "<p>No herbs added yet.</p>";
    return;
  }

  entryList.innerHTML = items.map((item) => `
    <article class="entry-item">
      <div>
        <h3>${escapeHtml(item.name)}</h3>
        <p><strong>Category:</strong> ${escapeHtml(item.category)}</p>
        <p><strong>Benefits:</strong> ${escapeHtml((item.benefits || []).join(", "))}</p>
        <p><strong>Used for:</strong> ${escapeHtml((item.used_for || []).join(", "))}</p>
        <p><strong>Forms:</strong> ${escapeHtml((item.forms || []).join(", "))}</p>
        <p><strong>Image:</strong> ${item.image_url ? `<a href="${escapeHtml(item.image_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.image_url)}</a>` : "-"}</p>
        <p><strong>Dosage:</strong> ${escapeHtml(item.dosage || "-")}</p>
        <p><strong>Precautions:</strong> ${escapeHtml((item.precautions || []).join(", "))}</p>
      </div>
      <button class="danger-btn" data-id="${item.id}">Delete</button>
    </article>
  `).join("");
}

function chunk(array, size) {
  const result = [];
  for (let index = 0; index < array.length; index += size) {
    result.push(array.slice(index, index + size));
  }
  return result;
}

function stopHerbListener() {
  if (unsubscribeHerbs) {
    unsubscribeHerbs();
    unsubscribeHerbs = null;
  }
}

function startHerbListener() {
  stopHerbListener();
  const herbsQuery = query(herbsCollection, orderBy("createdAt", "desc"));
  unsubscribeHerbs = onSnapshot(herbsQuery, (snapshot) => {
    const entries = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    renderEntries(entries);
    statusLine.textContent = "Connected to Firestore.";
  }, (error) => {
    console.error(error);
    statusLine.textContent = "Firestore connection failed. Check rules/config.";
  });
}

async function uploadCsv() {
  if (!adminAuthorized) {
    statusLine.textContent = "Admin authorization required.";
    return;
  }

  const file = csvInput?.files?.[0];
  if (!file) {
    statusLine.textContent = "Please choose a CSV file first.";
    return;
  }

  try {
    uploadCsvBtn.disabled = true;
    statusLine.textContent = "Reading CSV file...";

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

    if (!lines.length) {
      statusLine.textContent = "CSV file is empty.";
      return;
    }

    const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
    const headersValid = CSV_HEADERS.every((header, index) => headers[index] === header);
    if (!headersValid) {
      statusLine.textContent = "Invalid CSV headers. Use: name,category,benefits,used_for,forms,image_url,dosage,precautions";
      return;
    }

    const docsToCreate = [];
    for (let rowIndex = 1; rowIndex < lines.length; rowIndex += 1) {
      const row = parseCsvLine(lines[rowIndex]);
      if (row.length < CSV_HEADERS.length) continue;

      const payload = {
        name: row[0]?.trim(),
        category: row[1]?.trim(),
        benefits: splitList(row[2]),
        used_for: splitList(row[3]),
        forms: splitList(row[4]),
        image_url: row[5]?.trim(),
        dosage: row[6]?.trim(),
        precautions: splitList(row[7]),
        createdAt: serverTimestamp()
      };

      if (!payload.name || !payload.category || !payload.dosage) continue;
      docsToCreate.push(payload);
    }

    if (!docsToCreate.length) {
      statusLine.textContent = "No valid herb rows found in CSV.";
      return;
    }

    const batches = chunk(docsToCreate, BATCH_LIMIT);
    for (const set of batches) {
      const batch = writeBatch(db);
      set.forEach((payload) => batch.set(doc(herbsCollection), payload));
      await batch.commit();
    }

    statusLine.textContent = `Uploaded ${docsToCreate.length} herb records from CSV.`;
    csvInput.value = "";
  } catch (error) {
    console.error(error);
    statusLine.textContent = "Failed to upload CSV data.";
  } finally {
    uploadCsvBtn.disabled = false;
  }
}

function downloadTemplate() {
  const sample = [
    CSV_HEADERS.join(","),
        'Ashwagandha,Adaptogen,"Stress relief|Sleep support","Stress|Fatigue","Powder|Capsule",https://example.com/ashwagandha.jpg,1 capsule daily,"Consult doctor if pregnant"'
  ].join("\n");

  const blob = new Blob([sample], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "herbs-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  try {
    authMessage.textContent = "Signing in...";
    await signInWithEmailAndPassword(auth, email, password);
    passwordInput.value = "";
  } catch (error) {
    console.error(error);
    authMessage.textContent = "Sign in failed. Check Firebase email/password.";
  }
});

signOutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error(error);
    authMessage.textContent = "Failed to sign out.";
  }
});

onAuthStateChanged(auth, async (user) => {
  adminAuthorized = isAuthorizedAdmin(user);

  if (!user) {
    setAdminVisibility(false);
    stopHerbListener();
    entryList.innerHTML = "";
    statusLine.textContent = "Sign in to connect to Firestore.";
    authMessage.textContent = "Sign in with Firebase email/password (admin account only).";
    return;
  }

  if (!adminAuthorized) {
    setAdminVisibility(false);
    stopHerbListener();
    entryList.innerHTML = "";
    statusLine.textContent = "Access denied: this account is not an admin.";
    authMessage.textContent = "Only admin users can access this panel.";
    await signOut(auth);
    return;
  }

  setAdminVisibility(true);
  authMessage.textContent = `Signed in as ${user.email}`;
  statusLine.textContent = "Connecting to Firestore...";
  startHerbListener();
});

herbForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!adminAuthorized) {
    statusLine.textContent = "Admin authorization required.";
    return;
  }

  const payload = {
    name: nameInput.value.trim(),
    category: categoryInput.value.trim(),
    benefits: toArray(benefitsInput.value),
    used_for: toArray(usedForInput.value),
    forms: toArray(formsInput.value),
    image_url: imageUrlInput.value.trim(),
    dosage: dosageInput.value.trim(),
    precautions: toArray(precautionsInput.value),
    createdAt: serverTimestamp()
  };

  if (!payload.name || !payload.category || !payload.dosage) {
    statusLine.textContent = "Please fill in herb name, category, and dosage.";
    return;
  }

  try {
    await addDoc(herbsCollection, payload);
    herbForm.reset();
    statusLine.textContent = "Herb details added to Firestore.";
  } catch (error) {
    console.error(error);
    statusLine.textContent = "Failed to add herb details.";
  }
});

entryList.addEventListener("click", async (event) => {
  if (!adminAuthorized) {
    statusLine.textContent = "Admin authorization required.";
    return;
  }

  const target = event.target;
  if (!(target instanceof HTMLElement) || !target.matches(".danger-btn")) return;

  const id = target.getAttribute("data-id");
  if (!id) return;

  try {
    await deleteDoc(doc(db, "herbs", id));
    statusLine.textContent = "Herb deleted.";
  } catch (error) {
    console.error(error);
    statusLine.textContent = "Failed to delete herb.";
  }
});

if (uploadCsvBtn) uploadCsvBtn.addEventListener("click", uploadCsv);
if (downloadTemplateBtn) downloadTemplateBtn.addEventListener("click", downloadTemplate);
