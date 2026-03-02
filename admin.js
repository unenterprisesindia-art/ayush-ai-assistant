import {
  auth,
  db,
  addDoc,
  collection,
  deleteDoc,
  doc,
  onAuthStateChanged,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  signInWithEmailAndPassword,
  signOut,
  updateDoc,
  writeBatch
} from "./firebase-init.js";

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

const herbsCollection = collection(db, "herbs");
const ADMIN_EMAILS = ["unenterprisesindia@gmail.com"];
let unsubscribeHerbs = null;
let adminAuthorized = false;
let allHerbs = [];

function isAuthorizedAdmin(user) {
  const email = user?.email?.toLowerCase();
  return Boolean(email && ADMIN_EMAILS.includes(email));
}

function setAdminVisibility(isVisible) {
  if (isVisible) { adminContent.classList.add("show"); signOutBtn.hidden = false; }
  else { adminContent.classList.remove("show"); signOutBtn.hidden = true; }
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function toArray(text) { return text.split(",").map(v => v.trim()).filter(Boolean); }
function splitList(value = "") { return value.split("|").map(item => item.trim()).filter(Boolean); }

function renderEntries(items) {
  allHerbs = items;
  if (!items.length) { entryList.innerHTML = "<p style='opacity:0.7; text-align:center; padding:20px;'>No herbs added yet.</p>"; return; }

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
      </article>`;
  }).join("");
}

function startHerbListener() {
  const herbsQuery = query(herbsCollection, orderBy("createdAt", "desc"));
  unsubscribeHerbs = onSnapshot(herbsQuery, (snapshot) => {
    const entries = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    renderEntries(entries);
    statusLine.textContent = "Connected to Firestore.";
  }, (error) => { console.error(error); statusLine.textContent = "Firestore connection failed."; });
}

function stopHerbListener() { if (unsubscribeHerbs) unsubscribeHerbs(); }

function startEdit(id) {
  const herb = allHerbs.find(h => h.id === id);
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
  herbForm.reset(); editIdInput.value = ""; submitBtn.textContent = "Add Herb Details"; cancelEditBtn.hidden = true;
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    authMessage.textContent = "Signing in...";
    await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    passwordInput.value = "";
  } catch (error) {
    console.error(error);
    authMessage.textContent = "Sign in failed.";
  }
});

signOutBtn.addEventListener("click", async () => { await signOut(auth); });

onAuthStateChanged(auth, async (user) => {
  adminAuthorized = isAuthorizedAdmin(user);
  if (!user) { setAdminVisibility(false); stopHerbListener(); entryList.innerHTML = ""; statusLine.textContent = "Sign in to connect."; return; }
  if (!adminAuthorized) { setAdminVisibility(false); stopHerbListener(); entryList.innerHTML = ""; statusLine.textContent = "Access denied."; await signOut(auth); return; }
  setAdminVisibility(true);
  authMessage.textContent = `Signed in as ${user.email}`;
  statusLine.textContent = "Connecting to Firestore...";
  startHerbListener();
});

herbForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!adminAuthorized) return;
  const payload = {
    name: nameInput.value.trim(), category: categoryInput.value.trim(),
    benefits: toArray(benefitsInput.value), used_for: toArray(usedForInput.value),
    forms: toArray(formsInput.value), image_url: imageUrlInput.value.trim(),
    dosage: dosageInput.value.trim(), precautions: toArray(precautionsInput.value),
  };
  const editId = editIdInput.value;
  try {
    if (editId) {
      await updateDoc(doc(db, "herbs", editId), payload);
      statusLine.textContent = "Herb Updated!";
    } else {
      payload.createdAt = serverTimestamp();
      await addDoc(herbsCollection, payload);
      statusLine.textContent = "Herb Added!";
    }
    cancelEdit();
  } catch (error) { console.error(error); statusLine.textContent = "Failed to save."; }
});

entryList.addEventListener("click", async (event) => {
  if (!adminAuthorized) return;
  const target = event.target;
  const id = target.getAttribute("data-id");
  if (target.matches(".edit-btn")) { startEdit(id); }
  else if (target.matches(".danger-btn")) {
    if (!confirm("Delete this herb?")) return;
    try { await deleteDoc(doc(db, "herbs", id)); statusLine.textContent = "Herb Deleted."; } catch (err) { console.error(err); }
  }
});

if (cancelEditBtn) cancelEditBtn.addEventListener("click", cancelEdit);

uploadCsvBtn.addEventListener("click", async () => {
    if (!adminAuthorized) return;
    const file = csvInput?.files?.[0]; if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    const batch = writeBatch(db);
    let count = 0;
    lines.forEach((line, i) => {
        if(i === 0) return;
        const cols = line.split(",");
        if(cols.length > 1) {
            const ref = doc(herbsCollection);
            batch.set(ref, { name: cols[0], category: cols[1], benefits: splitList(cols[2] || ""), used_for: splitList(cols[3] || ""), forms: splitList(cols[4] || ""), image_url: cols[5] || "", dosage: cols[6] || "", precautions: splitList(cols[7] || ""), createdAt: serverTimestamp() });
            count++;
        }
    });
    await batch.commit();
    alert(`Uploaded ${count} herbs.`);
    csvInput.value = "";
});

downloadTemplateBtn.addEventListener("click", () => {
    const h = ["name","category","benefits","used_for","forms","image_url","dosage","precautions"];
    const row = ['Test,Ayurveda,"Benefit 1|Benefit 2","Use 1","Form 1",,1 tsp,"Prec 1"'];
    const blob = new Blob([h.join(",")+"\n"+row.join("\n")], {type: "text/csv"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "template.csv"; a.click();
});
