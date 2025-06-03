const results = [
    {
        name: "Soil Sample A",
        date: "2025-06-03",
        status: "Completed",
        file: "soil_a.fasta"
    },
    {
        name: "Ocean Sample B",
        date: "2025-06-01",
        status: "Completed",
        file: "ocean_b.fasta"
    }
];

const container = document.getElementById("resultsContainer");
const modal = document.getElementById("modalOverlay");
const closeBtn = document.getElementById("modalClose");

results.forEach(result => {
    const card = document.createElement("div");
    card.className = "result-card";
    card.innerHTML = `
        <div>
            <h3 class="result-title">${result.name}</h3>
            <p class="result-meta">Uploaded: ${result.date}</p>
            <p class="result-meta">Status: ${result.status}</p>
        </div>
        <div class="result-actions">
            <button class="btn btn-secondary" onclick="showPreview()">Preview</button>
            <button class="btn btn-outline" onclick="downloadResult('${result.file}')">Download</button>
        </div>
    `;
    container.appendChild(card);
});

function showPreview() {
    modal.classList.remove("hidden");
}

function downloadResult(filename) {
    alert("Download initiated for: " + filename);
    // Implement real download here
}

closeBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
});
