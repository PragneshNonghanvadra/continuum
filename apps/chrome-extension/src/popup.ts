const statusEl = document.getElementById("status");

async function renderStatus() {
  try {
    const response = await fetch("http://127.0.0.1:5174/api/health");
    statusEl!.textContent = response.ok ? "Connected to Continuum." : "Continuum is not reachable.";
  } catch {
    statusEl!.textContent = "Continuum is not reachable.";
  }
}

renderStatus();
