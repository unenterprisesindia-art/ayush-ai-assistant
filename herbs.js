// herbs.js

const herbGrid = document.getElementById("herbGrid");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const resultsCount = document.getElementById("resultsCount");
const emptyState = document.getElementById("emptyState");
const totalCount = document.getElementById("totalCount");
const loader = document.getElementById("loader");

let herbalEncyclopedia = [];
let isInitialLoad = true;

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function hideLoader() {
  if (loader) {
    loader.classList.add("hidden");
  }
}

function render(herbs) {
  herbGrid.innerHTML = herbs.map((herb) => `
    <article class="card">
      ${herb.image_url ? `<img src="${escapeHtml(herb.image_url)}" alt="${escapeHtml(herb.name || "Herb image")}" loading="lazy" style="width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 12px; margin-bottom: 12px; border: 1px solid var(--border);">` : ""}
      <h3>${escapeHtml(herb.name || "Unknown Herb")}</h3>
      <span class="category">${escapeHtml(herb.category || "Uncategorized")}</span>
      <p><span class="label">Benefits:</span> ${escapeHtml(asArray(herb.benefits).join(", ") || "Not provided")}</p>
      <p><span class="label">Used for:</span> ${escapeHtml(asArray(herb.used_for).join(", ") || "Not provided")}</p>
      <p><span class="label">Dosage:</span> ${escapeHtml(herb.dosage || "Not provided")}</p>
      <p><span class="label">Precautions:</span> ${escapeHtml(asArray(herb.precautions).join("; ") || "Not provided")}</p>
      <div class="chips">${asArray(herb.forms).map((form) => `<span class="chip">${escapeHtml(form)}</span>`).join("")}</div>
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

// --- NEW DATABASE CONNECTION LOGIC ---
async function loadHerbsFromDatabase() {
  totalCount.textContent = "Loading from local database...";
  
  try {
    // Fetch data from your local Node.js server
    const response = await fetch('http://localhost:3000/api/herbs');
    
    if (!response.ok) {
      throw new Error("Failed to connect to database");
    }

    herbalEncyclopedia = await response.json();
    
    totalCount.textContent = `${herbalEncyclopedia.length} AYUSH herbs`;
    populateCategories();
    filterHerbs();

    if (isInitialLoad) {
      hideLoader();
      isInitialLoad = false;
    }

  } catch (error) {
    console.error(error);
    totalCount.textContent = "Error connecting to database";
    resultsCount.textContent = "Could not load data. Is server.js running?";
    hideLoader();
  }
}

searchInput.addEventListener("input", filterHerbs);
categoryFilter.addEventListener("change", filterHerbs);

// Load data when page opens
loadHerbsFromDatabase();
