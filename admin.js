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
  updateDoc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// DOM Elements
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
const editIdInput = document.getElementById("editIdInput"); // Hidden input for ID

const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const csvInput = document.getElementById("csvInput");
const uploadCsvBtn = document.getElementById("uploadCsvBtn");
const downloadTemplateBtn = document.getElementById("downloadTemplateBtn");

// State
const herbsCollection = collection(db, "herbs");
const CSV_HEADERS = ["name", "category", "benefits", "used_for", "forms", "image_url", "dosage", "precautions"];
const BATCH_LIMIT = 450;
const ADMIN_EMAILS = ["unenterprisesindia@gmail.com"];

let unsubscribeHerbs = null;
let adminAuthorized = false;
let allHerbs = []; // Store local copy for editing lookup

// Auth Functions
function isAuthorizedAdmin(user) {
  const email = user?.email?.toLowerCase();
  return Boolean(email && ADMIN_EMAILS.includes(email));
}

function setAdminVisibility(isVisible) {
  if (isVisible) {
    adminContent.classList.add("show");
    signOutBtn.hidden = false;
  } else {
    adminContent.classList.remove("show");
    signOutBtn.hidden = true;
  }
}

// Utility Functions
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

// Render List
function renderEntries(items) {
  allHerbs = items; // Store for editing
  
  if (!items.length) {
    entryList.innerHTML = "<p style='opacity:0.7; text-align:center; padding:20px;'>No herbs added yet.</p>";
    return;
  }

  entryList.innerHTML = items.map((item, index) => {
    const imgHtml = item.image_url 
      ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}" class="entry-thumb" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%23071622%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%2367f2c4%22 font-size=%2212%22%3ENo Image%3C/text%3E%3C/svg%3E'">`
      : `<div class="entry-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:0.8rem;">No Image</div>`;

    return `
      <article class="entry-item" style="animation-delay: ${index * 0.03}s">
        ${imgHtml}
        <div class="entry-content">
          <h3>${escapeHtml(item.name)}</h3>
          <p><strong>Category:</strong> ${escapeHtml(item.category)}</p>
          <p><strong>Benefits:</strong> ${escapeHtml((item.benefits || []).join(", "))}</p>
          <p><strong>Dosage:</strong> ${escapeHtml(item.dosage || "-")}</p>
        </div>
        <div class="action-group">
            <button class="edit-btn" data-id="${item.id}">Edit</button>
            <button class="danger-btn" data-id="${item.id}">Delete</button>
        </div>
      </article>
    `;
  }).join("");
}

function chunk(array, size) {
  const result = [];
  for (let index = 0; index < array.length; index += size) {
    result.push(array.slice(index, index + size));
  }
  return result;
}

// Firestore Logic
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
    statusLine.style.opacity = 0.9;
  }, (error) => {
    console.error(error);
    statusLine.textContent = "Firestore connection failed. Check rules/config.";
    statusLine.style.opacity = 1;
    statusLine.style.color = "#ff4d6d";
  });
}

// Edit Logic
function startEdit(id) {
  const herb = allHerbs.find(h => h.id === id);
  if (!herb) return;

  // Populate form
  nameInput.value = herb.name || "";
  categoryInput.value = herb.category || "";
  benefitsInput.value = (herb.benefits || []).join(", ");
  usedForInput.value = (herb.used_for || []).join(", ");
  formsInput.value = (herb.forms || []).join(", ");
  imageUrlInput.value = herb.image_url || "";
  dosageInput.value = herb.dosage || "";
  precautionsInput.value = (herb.precautions || []).join(", ");
  
  // Set ID and change UI mode
  editIdInput.value = id;
  submitBtn.textContent = "Update Herb";
  cancelEditBtn.hidden = false;
  
  // Scroll to form
  herbForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  statusLine.textContent = `Editing: ${herb.name}`;
  statusLine.style.color = "var(--accent)";
}

function cancelEdit() {
  herbForm.reset();
  editIdInput.value = "";
  submitBtn.textContent = "Add Herb Details";
  cancelEditBtn.hidden = true;
  statusLine.textContent = "Add new herb or select one to edit.";
  statusLine.style.color = "";
}

// CSV Logic
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
    uploadCsvBtn.textContent = "Uploading...";
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
    uploadCsvBtn.textContent = "Upload CSV";
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

// Event Listeners
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
    authMessage.textContent = "Sign in failed. Check credentials.";
    authMessage.style.color = "#ff4d6d";
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
  authMessage.style.color = "";
  
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
  };

  if (!payload.name || !payload.category || !payload.dosage) {
    statusLine.textContent = "Please fill in herb name, category, and dosage.";
    return;
  }

  const editId = editIdInput.value;

  try {
    if (editId) {
      // Update existing
      await updateDoc(doc(db, "herbs", editId), payload);
      statusLine.textContent = "Herb updated successfully.";
    } else {
      // Add new
      payload.createdAt = serverTimestamp();
      await addDoc(herbsCollection, payload);
      statusLine.textContent = "Herb details added to Firestore.";
    }
    
    cancelEdit(); // Reset form and state
    
    // Visual feedback
    statusLine.style.color = "var(--accent)";
    setTimeout(() => statusLine.style.color = "", 1500);
    
  } catch (error) {
    console.error(error);
    statusLine.textContent = editId ? "Failed to update herb." : "Failed to add herb details.";
    statusLine.style.color = "#ff4d6d";
  }
});

entryList.addEventListener("click", async (event) => {
  if (!adminAuthorized) return;

  const target = event.target;
  
  // Handle Edit Click
  if (target.matches(".edit-btn")) {
    const id = target.getAttribute("data-id");
    if (id) startEdit(id);
    return;
  }

  // Handle Delete Click
  if (target.matches(".danger-btn")) {
    const id = target.getAttribute("data-id");
    if (!id) return;
    
    if (!confirm("Are you sure you want to delete this herb?")) return;

    try {
      const item = target.closest('.entry-item');
      item.style.transform = "translateX(20px)";
      item.style.opacity = "0";
      
      setTimeout(async () => {
        await deleteDoc(doc(db, "herbs", id));
        statusLine.textContent = "Herb deleted.";
        // If we were editing this item, cancel edit mode
        if (editIdInput.value === id) cancelEdit();
      }, 300);
      
    } catch (error) {
      console.error(error);
      statusLine.textContent = "Failed to delete herb.";
    }
  }
});

// Cancel Button Listener
if (cancelEditBtn) cancelEditBtn.addEventListener("click", cancelEdit);

// CSV Listeners
if (uploadCsvBtn) uploadCsvBtn.addEventListener("click", uploadCsv);
if (downloadTemplateBtn) downloadTemplateBtn.addEventListener("click", downloadTemplate);
