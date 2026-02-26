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
const remedyForm = document.getElementById("remedyForm");
const titleInput = document.getElementById("titleInput");
const descriptionInput = document.getElementById("descriptionInput");
const entryList = document.getElementById("entryList");

const remediesCollection = collection(db, "remedies");

function renderEntries(items) {
  if (!items.length) {
    entryList.innerHTML = "<p>No remedies added yet.</p>";
    return;
  }

  entryList.innerHTML = items.map((item) => `
    <article class="entry-item">
      <div>
        <h3>${item.title}</h3>
        <p>${item.description}</p>
      </div>
      <button class="danger-btn" data-id="${item.id}">Delete</button>
    </article>
  `).join("");
}

remedyForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();

  if (!title || !description) {
    statusLine.textContent = "Please provide both title and details.";
    return;
  }

  try {
    await addDoc(remediesCollection, {
      title,
      description,
      createdAt: serverTimestamp()
    });
    titleInput.value = "";
    descriptionInput.value = "";
    statusLine.textContent = "Remedy added to Firestore.";
  } catch (error) {
    console.error(error);
    statusLine.textContent = "Failed to add remedy.";
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
    await deleteDoc(doc(db, "remedies", id));
    statusLine.textContent = "Remedy deleted.";
  } catch (error) {
    console.error(error);
    statusLine.textContent = "Failed to delete remedy.";
  }
});

const remediesQuery = query(remediesCollection, orderBy("createdAt", "desc"));
onSnapshot(remediesQuery, (snapshot) => {
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
