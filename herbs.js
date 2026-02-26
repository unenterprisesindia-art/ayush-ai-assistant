import { db } from "./firebase-init.js";
import {
  collection,
  getDocs,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const herbGrid = document.getElementById("herbGrid");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const resultsCount = document.getElementById("resultsCount");
const emptyState = document.getElementById("emptyState");
const totalCount = document.getElementById("totalCount");

let herbalEncyclopedia = [];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function render(herbs) {
  herbGrid.innerHTML = herbs.map((herb) => `
    <article class="card">
      <h3>${herb.name || "Unknown Herb"}</h3>
      <span class="category">${herb.category || "Uncategorized"}</span>
      <p><span class="label">Benefits:</span> ${asArray(herb.benefits).join(", ") || "Not provided"}</p>
      <p><span class="label">Used for:</span> ${asArray(herb.used_for).join(", ") || "Not provided"}</p>
      <p><span class="label">Dosage:</span> ${herb.dosage || "Not provided"}</p>
      <p><span class="label">Precautions:</span> ${asArray(herb.precautions).join("; ") || "Not provided"}</p>
      <div class="chips">${asArray(herb.forms).map((form) => `<span class="chip">${form}</span>`).join("")}</div>
    </article>
  `).join("");

  resultsCount.textContent = `Showing ${herbs.length} of ${herbalEncyclopedia.length} herbs`;
  emptyState.hidden = herbs.length !== 0;
}

function populateCategories() {
  categoryFilter.innerHTML = '<option value="">All categories</option>';

  const categories = [...new Set(
    herbalEncyclopedia
      .map((herb) => herb.category)
      .filter(Boolean)
  )].sort();

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });
}

function filterHerbs() {
  const userQuery = searchInput.value.trim().toLowerCase();
  const selectedCategory = categoryFilter.value;

  const filtered = herbalEncyclopedia.filter((herb) => {
    const haystack = [
      herb.name,
      herb.category,
      ...asArray(herb.benefits),
      ...asArray(herb.used_for),
      ...asArray(herb.forms),
      herb.dosage,
      ...asArray(herb.precautions)
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesQuery = !userQuery || haystack.includes(userQuery);
    const matchesCategory = !selectedCategory || herb.category === selectedCategory;

    return matchesQuery && matchesCategory;
  });

  render(filtered);
}

async function loadHerbs() {
  try {
    const herbsQuery = query(collection(db, "herbs"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(herbsQuery);

    herbalEncyclopedia = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));

    totalCount.textContent = `${herbalEncyclopedia.length} AYUSH herbs`;
    populateCategories();
    filterHerbs();
  } catch (error) {
    console.error(error);
    totalCount.textContent = "Could not load herbs";
    resultsCount.textContent = "Firestore connection failed. Please check Firebase config and rules.";
    herbGrid.innerHTML = "";
    emptyState.hidden = false;
  }
}

searchInput.addEventListener("input", filterHerbs);
categoryFilter.addEventListener("change", filterHerbs);

loadHerbs();
