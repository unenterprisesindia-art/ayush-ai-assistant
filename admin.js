import { db } from "./firebase-init.js";
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
const herbForm = document.getElementById("herbForm");
const entryList = document.getElementById("entryList");

const nameInput = document.getElementById("nameInput");
const categoryInput = document.getElementById("categoryInput");
const benefitsInput = document.getElementById("benefitsInput");
const usedForInput = document.getElementById("usedForInput");
const formsInput = document.getElementById("formsInput");
const dosageInput = document.getElementById("dosageInput");
const precautionsInput = document.getElementById("precautionsInput");

const csvInput = document.getElementById("csvInput");
const uploadCsvBtn = document.getElementById("uploadCsvBtn");
const downloadTemplateBtn = document.getElementById("downloadTemplateBtn");

const herbsCollection = collection(db, "herbs");
const CSV_HEADERS = ["name", "category", "benefits", "used_for", "forms", "dosage", "precautions"];
const BATCH_LIMIT = 450;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toArray(value) {
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitList(value) {
  const source = String(value || "").trim();
  if (!source) return [];
  const separator = source.includes("|") ? "|" : ",";
  return source.split(separator).map((item) => item.trim()).filter(Boolean);
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
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

async function uploadCsv() {
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
      statusLine.textContent = "Invalid CSV headers. Use: name,category,benefits,used_for,forms,dosage,precautions";
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
        dosage: row[5]?.trim(),
        precautions: splitList(row[6]),
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
    'Ashwagandha,Adaptogen,"Stress relief|Sleep support","Stress|Fatigue","Powder|Capsule",1 capsule daily,"Consult doctor if pregnant"'
  ].join("\n");

  const blob = new Blob([sample], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "herbs-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

herbForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    name: nameInput.value.trim(),
    category: categoryInput.value.trim(),
    benefits: toArray(benefitsInput.value),
    used_for: toArray(usedForInput.value),
    forms: toArray(formsInput.value),
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

const herbsQuery = query(herbsCollection, orderBy("createdAt", "desc"));
onSnapshot(herbsQuery, (snapshot) => {
  const entries = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  renderEntries(entries);
  statusLine.textContent = "Connected to Firestore.";
}, (error) => {
  console.error(error);
  statusLine.textContent = "Firestore connection failed. Check rules/config.";
});

if (uploadCsvBtn) uploadCsvBtn.addEventListener("click", uploadCsv);
if (downloadTemplateBtn) downloadTemplateBtn.addEventListener("click", downloadTemplate);
