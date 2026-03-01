const toggleBtn = document.getElementById("themeToggle");

// Check local storage on load
if (localStorage.getItem("theme") === "light") {
  document.body.classList.add("light");
}

function syncThemeIcon() {
  if (!toggleBtn) return;
  const isLight = document.body.classList.contains("light");
  toggleBtn.textContent = isLight ? "☀️" : "🌙";
  toggleBtn.setAttribute("aria-label", isLight ? "Switch to dark mode" : "Switch to light mode");
}

// Set initial icon
syncThemeIcon();

// Toggle event
toggleBtn?.addEventListener("click", () => {
  document.body.classList.toggle("light");
  localStorage.setItem("theme", document.body.classList.contains("light") ? "light" : "dark");
  syncThemeIcon();
});
