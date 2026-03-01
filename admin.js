// admin.js

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
const editIdInput = document.getElementById("editIdInput");

const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const csvInput = document.getElementById("csvInput");
const uploadCsvBtn = document.getElementById("uploadCsvBtn");
const downloadTemplateBtn = document.getElementById("downloadTemplateBtn");

const API_URL = 'http://localhost:3000/api/herbs';
let allHerbs = [];

// --- UI Logic (No Auth required for local version) ---
adminContent.classList.add("show");
statusLine.textContent = "Connected to Local Database.";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toArray(text) {
  return text.split(",").map(v => v.trim()).filter(Boolean);
}

function renderEntries(items) {
  allHerbs = items;
  
  if (!items.length) {
    entryList.innerHTML = "<p style='opacity:0.7; text-align:center; padding:20px;'>No herbs added yet.</p>";
    return;
  }

  entryList.innerHTML = items.map((item, index) => {
    const imgHtml = item.image_url 
      ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}" class="entry-thumb" loading="lazy">`
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

async function loadHerbs() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    renderEntries(data);
    statusLine.textContent = "Connected to Local Database.";
  } catch (err) {
    statusLine.textContent = "Error: Server not running?";
    console.error(err);
  }
}

function startEdit(id) {
  const herb = allHerbs.find(h => h.id == id); // SQLite ID is integer, match loosely
  if (!herb) return;

  nameInput.value = herb.name || "";
  categoryInput.value = herb.category || "";
  benefitsInput.value = (herb.benefits || []).join(", ");
  usedForInput.value = (herb.used_for || []).join(", ");
  formsInput.value = (herb.forms || []).join(", ");
  imageUrlInput.value = herb.image_url || "";
  dosageInput.value = herb.dosage || "";
  precautionsInput.value = (herb.precautions || []).join(", ");
  
  editIdInput.value = id;
  submitBtn.textContent = "Update Herb";
  cancelEditBtn.hidden = false;
  herbForm.scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
  herbForm.reset();
  editIdInput.value = "";
  submitBtn.textContent = "Add Herb Details";
  cancelEditBtn.hidden = true;
}

// --- FORM SUBMIT (ADD / UPDATE) ---
herbForm.addEventListener("submit", async (event) => {
  event.preventDefault();

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

  const editId = editIdInput.value;
  const method = editId ? 'PUT' : 'POST';
  const url = editId ? `${API_URL}/${editId}` : API_URL;

  try {
    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      statusLine.textContent = editId ? "Herb Updated!" : "Herb Added!";
      cancelEdit();
      loadHerbs();
    } else {
      throw new Error("Server error");
    }
  } catch (err) {
    statusLine.textContent = "Failed to save data.";
    console.error(err);
  }
});

// --- DELETE & EDIT BUTTONS ---
entryList.addEventListener("click", async (event) => {
  const target = event.target;
  const id = target.getAttribute("data-id");

  if (target.matches(".edit-btn")) {
    startEdit(id);
  } else if (target.matches(".danger-btn")) {
    if (!confirm("Delete this herb?")) return;
    
    try {
        const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if(response.ok) {
            target.closest('.entry-item').style.opacity = 0;
            loadHerbs();
        }
    } catch (err) {
        console.error(err);
    }
  }
});

if (cancelEditBtn) cancelEditBtn.addEventListener("click", cancelEdit);

// --- CSV UPLOAD (Simulated for now, requires multipart parsing on server) ---
// Note: Multipart handling on Node requires 'multer' library. 
// For now, this button will just log a message. 
uploadCsvBtn.addEventListener('click', () => alert('CSV upload requires additional server setup. Use manual entry for now.'));

// Initial Load
loadHerbs();
