const tipoOpzioni = ["Post singolo", "Carosello", "Reel", "Storia", "Live"];
const obiettivoOpzioni = ["Ispirare", "Informare", "Intrattenere", "Interagire", "Indirizzare"];
const statoOpzioni = ["Da creare", "In bozza", "Pronto", "Pubblicato"];

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

    "Da creare": "#f8d7da",
    "In bozza": "#fff3cd",
    "Pronto": "#d1ecf1",
    "Pubblicato": "#d4edda"
};

function applySelectColor(select) {
    const val = select.value;
    select.style.backgroundColor = colorMap[val] || "white";
}

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

function createInput(value = "", type = "text") {
    const input = document.createElement("input");
    input.type = type;
    input.value = value;
    return input;
}

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

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.className = "delete-btn";
    deleteBtn.onclick = () => {
        tr.remove();
        saveTable();
    };

    const actionTd = document.createElement("td");
    actionTd.appendChild(deleteBtn);
    tr.appendChild(actionTd);

    document.getElementById("tableBody").appendChild(tr);
    saveTable();
}

function saveTable() {
    const rows = document.querySelectorAll("#tableBody tr");
    const data = [];

    rows.forEach(row => {
        const cells = row.querySelectorAll("td");
        const dateInput = cells[0].querySelector("input");
        const giornoInput = cells[1].querySelector("input");

        const dateValue = dateInput.value;

        // Calcola giorno della settimana da data
        if (dateValue) {
            const giorni = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
            const date = new Date(dateValue);
            giornoInput.value = giorni[date.getDay()];
        }

        data.push({
            data: dateInput.value,
            giorno: giornoInput.value,
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
    showToast("Salvato");
}

function loadTable() {
    const saved = localStorage.getItem("duckbyte_piano_editoriale");
    if (saved) {
        const rows = JSON.parse(saved);
        rows.forEach(row => addRow(row));
    } else {
        addRow();
    }
}

function loadBrandName() {
    const saved = localStorage.getItem("duckbyte_brand_name") || "Duckbyte";
    document.getElementById("editableBrand").textContent = saved;
}

function saveBrandName() {
    const name = document.getElementById("editableBrand").textContent.trim();
    localStorage.setItem("duckbyte_brand_name", name || "Duckbyte");
}

function showToast(message = "Salvato") {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 50);

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}


window.onload = () => {
    loadBrandName();
    loadTable();
};

document.getElementById("exportCsvBtn").addEventListener("click", exportToCSV);

document.addEventListener("input", saveTable);


function exportToCSV() {
    const rows = document.querySelectorAll("#tableBody tr");
    const headers = ["Data", "Giorno", "Tipo", "Argomento", "Obiettivo", "Caption", "Hashtag", "Stato", "Note"];
    const csv = [headers.join(",")];

    rows.forEach(row => {
        const cells = row.querySelectorAll("td");
        const values = Array.from(cells).slice(0, 9).map(cell => {
            const el = cell.querySelector("input, select");
            let val = el ? el.value : "";
            // Escape virgolette
            val = val.replace(/"/g, '""');
            // Se contiene virgole o ritorni a capo, racchiudi tra doppi apici
            if (/,|\n/.test(val)) {
                val = `"${val}"`;
            }
            return val;
        });
        csv.push(values.join(","));
    });

    const blob = new Blob([csv.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "piano-editoriale.csv";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
