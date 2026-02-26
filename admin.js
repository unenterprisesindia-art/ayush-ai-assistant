import { db } from "./firebase-init.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
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

const herbsCollection = collection(db, "herbs");

function toArray(value) {
  return value
    .split(",")
    .map((item) => item.trim())
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
        <h3>${item.name}</h3>
        <p><strong>Category:</strong> ${item.category}</p>
        <p><strong>Benefits:</strong> ${(item.benefits || []).join(", ")}</p>
        <p><strong>Used for:</strong> ${(item.used_for || []).join(", ")}</p>
        <p><strong>Forms:</strong> ${(item.forms || []).join(", ")}</p>
        <p><strong>Dosage:</strong> ${item.dosage || "-"}</p>
        <p><strong>Precautions:</strong> ${(item.precautions || []).join(", ")}</p>
      </div>
      <button class="danger-btn" data-id="${item.id}">Delete</button>
    </article>
  `).join("");
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
    statusLine.textContent = "Failed to add herb details."
  }
});

entryList.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement) || !target.matches(".danger-btn")) {
    return;
  }

  const id = target.getAttribute("data-id");
  if (!id) return;

  try {
    await deleteDoc(doc(db, "herbs", id));
    statusLine.textContent = "Herb deleted."
  } catch (error) {
    console.error(error);
   statusLine.textContent = "Failed to delete herb.";
  }
});

const herbsQuery = query(herbsCollection, orderBy("createdAt", "desc"));
onSnapshot(herbsQuery, (snapshot) => {
  const entries = snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data()
  }));
  
  renderEntries(entries);
  statusLine.textContent = "Connected to Firestore.";
}, (error) => {
  console.error(error);
  statusLine.textContent = "Firestore connection failed. Check rules/config.";
});
