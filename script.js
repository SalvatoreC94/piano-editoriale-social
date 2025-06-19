// Dropdown options
const tipoOpzioni = ["Post singolo", "Carosello", "Reel", "Storia", "Live"];
const obiettivoOpzioni = ["Ispirare", "Informare", "Intrattenere", "Interagire", "Indirizzare"];
const statoOpzioni = ["Da creare", "In bozza", "Pronto", "Pubblicato"];

// Colori associati a valori selezionati
const colorMap = {
    "Post singolo": "#f0f0f0",
    "Carosello": "#e3f2fd",
    "Reel": "#fce4ec",
    "Storia": "#ede7f6",
    "Live": "#fff3e0",

    "Ispirare": "#e0f7fa",
    "Informare": "#e3fcef",
    "Intrattenere": "#f3e5f5",
    "Interagire": "#fff9c4",
    "Indirizzare": "#ffe0b2",

    "Da creare": "#f8d7da",     // rosso chiaro
    "In bozza": "#fff3cd",      // giallo tenue
    "Pronto": "#d1ecf1",        // azzurro
    "Pubblicato": "#d4edda"     // verde chiaro
};

// Applica il colore visivo al <select>
function applySelectColor(select) {
    const val = select.value;
    select.style.backgroundColor = colorMap[val] || "white";
}

// Crea un <select> con opzioni
function createSelect(options, value = "") {
    const select = document.createElement("select");

    options.forEach(opt => {
        const option = document.createElement("option");
        option.value = opt;
        option.textContent = opt;
        if (opt === value) option.selected = true;
        select.appendChild(option);
    });

    applySelectColor(select);

    select.addEventListener("change", () => {
        applySelectColor(select);
        saveTable();
    });

    return select;
}

// Crea input testuale
function createInput(value = "", type = "text") {
    const input = document.createElement("input");
    input.type = type;
    input.value = value;
    return input;
}

// Aggiunge una riga alla tabella
function addRow(data = {}) {
    const tr = document.createElement("tr");

    const rowData = [
        createInput(data.data || "", "date"),
        createInput(data.giorno || ""),
        createSelect(tipoOpzioni, data.tipo),
        createInput(data.argomento || ""),
        createSelect(obiettivoOpzioni, data.obiettivo),
        createInput(data.caption || ""),
        createInput(data.hashtag || ""),
        createSelect(statoOpzioni, data.stato),
        createInput(data.note || "")
    ];

    rowData.forEach(el => {
        const td = document.createElement("td");
        td.appendChild(el);
        tr.appendChild(td);
    });

    document.getElementById("tableBody").appendChild(tr);
    saveTable();
}

// Salva i dati della tabella in localStorage
function saveTable() {
    const rows = document.querySelectorAll("#tableBody tr");
    const data = [];

    rows.forEach(row => {
        const cells = row.querySelectorAll("td");
        data.push({
            data: cells[0].querySelector("input").value,
            giorno: cells[1].querySelector("input").value,
            tipo: cells[2].querySelector("select").value,
            argomento: cells[3].querySelector("input").value,
            obiettivo: cells[4].querySelector("select").value,
            caption: cells[5].querySelector("input").value,
            hashtag: cells[6].querySelector("input").value,
            stato: cells[7].querySelector("select").value,
            note: cells[8].querySelector("input").value
        });
    });

    localStorage.setItem("duckbyte_piano_editoriale", JSON.stringify(data));
}

// Carica i dati della tabella
function loadTable() {
    const saved = localStorage.getItem("duckbyte_piano_editoriale");
    if (saved) {
        const rows = JSON.parse(saved);
        rows.forEach(row => addRow(row));
    } else {
        addRow();
    }
}

// ✅ BRAND NAME - Caricamento e salvataggio nome modificabile
function loadBrandName() {
    const saved = localStorage.getItem("duckbyte_brand_name") || "Duckbyte";
    document.getElementById("editableBrand").textContent = saved;
}

function saveBrandName() {
    const name = document.getElementById("editableBrand").textContent.trim();
    localStorage.setItem("duckbyte_brand_name", name || "Duckbyte");
}

// Avvio al caricamento
window.onload = () => {
    loadBrandName();
    loadTable();
};

// Auto-save su modifica tabella
document.addEventListener("input", saveTable);
