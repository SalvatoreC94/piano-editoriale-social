/* =========================================
   COSTANTI & STORAGE KEYS
========================================= */
const tipoOpzioni = ["Post singolo", "Carosello", "Reel", "Storia", "Live"];
const obiettivoOpzioni = ["Ispirare", "Informare", "Intrattenere", "Interagire", "Indirizzare"];
const statoOpzioni = ["Da creare", "In bozza", "Pronto", "Pubblicato"];

const DEFAULT_PROFILE = "principale";
const LS_PREFIX = "duckbyte_piano_";
const LS_DATA = (p) => `${LS_PREFIX}data_${p}`;
const LS_BRAND = (p) => `${LS_PREFIX}brand_${p}`;
const LS_PROFILES = `${LS_PREFIX}profiles`;
const LS_THEME = `${LS_PREFIX}theme`;

/* Colori “chip” per Tipo/Stato (solo dot a sinistra del select) */
const colorMap = {
    "Post singolo": "#f0f0f0",
    "Carosello": "#e3f2fd",
    "Reel": "#fce4ec",
    "Storia": "#ede7f6",
    "Live": "#fff3e0",
    "Da creare": "#f8d7da",
    "In bozza": "#fff3cd",
    "Pronto": "#d1ecf1",
    "Pubblicato": "#d4edda",
};

/* Stato runtime */
let currentProfile = DEFAULT_PROFILE;

/* =========================================
   UTILS
========================================= */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function nowTime() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function debounce(fn, delay = 300) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), delay);
    };
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

function uid() {
    return Math.random().toString(36).slice(2, 9);
}

function fieldId(fieldKey, rowId) {
    return `${fieldKey}__${rowId}`;
}

/* =========================================
   TEMA SCURO
========================================= */
function applyTheme() {
    const theme = localStorage.getItem(LS_THEME) || "light";
    document.body.classList.toggle("dark", theme === "dark");
    const btn = $("#themeToggleBtn");
    if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
}

function toggleTheme() {
    const next = localStorage.getItem(LS_THEME) === "dark" ? "light" : "dark";
    localStorage.setItem(LS_THEME, next);
    applyTheme();
}

/* =========================================
   BRAND PER PROFILO
========================================= */
function loadBrandName(profile = currentProfile) {
    const saved = localStorage.getItem(LS_BRAND(profile));
    const fallback = profile === DEFAULT_PROFILE ? "Duckbyte" : profile;
    const el = $("#editableBrand");
    if (el) el.textContent = saved || fallback;
}

function saveBrandName() {
    const el = $("#editableBrand");
    if (!el) return;
    const name = el.textContent.trim() || (currentProfile === DEFAULT_PROFILE ? "Salvatore C." : currentProfile);
    localStorage.setItem(LS_BRAND(currentProfile), name);
}

/* =========================================
   SELECT & INPUT (con ID/NAME + autosuggest)
========================================= */
function applySelectColor(select) {
    // Imposta il “dot” colorato nel wrapper
    const wrap = select.closest(".select-wrap");
    const col = colorMap[select.value] || "";
    if (wrap) wrap.style.setProperty("--dot-color", col || "transparent");
}

function createSelect(options, value = "", role = "", fieldKey = "", rowId = "") {
    // Wrapper con dot + chevron
    const wrap = document.createElement("div");
    wrap.className = "select-wrap";

    const dot = document.createElement("span");
    dot.className = "select-dot";
    wrap.appendChild(dot);

    const select = document.createElement("select");
    if (role) select.dataset.role = role;

    // Accessibilità + autofill
    if (fieldKey && rowId) {
        const fid = fieldId(fieldKey, rowId);
        select.id = fid;
        select.name = fid;
        select.setAttribute("aria-label", fieldKey);
        select.autocomplete = "off";
    }

    options.forEach((opt) => {
        const o = document.createElement("option");
        o.value = opt;
        o.textContent = opt;
        if (opt === value) o.selected = true;
        select.appendChild(o);
    });

    applySelectColor(select);

    select.addEventListener("change", () => {
        applySelectColor(select);
        saveTable();
        applyFiltersAndCounters();
    });

    const chev = document.createElement("span");
    chev.className = "select-chevron";
    chev.textContent = "▾";

    wrap.appendChild(select);
    wrap.appendChild(chev);
    return wrap;
}

/* Dropdown suggerimenti locale (Argomento/Hashtag) */
function buildSuggestList(input, list) {
    const wrap = input.parentElement; // .suggest-wrap
    if (!wrap) return;

    const old = wrap.querySelector(".suggest-list");
    if (old) old.remove();
    if (!list.length) return;

    const ul = document.createElement("div");
    ul.className = "suggest-list";

    list.slice(0, 20).forEach((val) => {
        const item = document.createElement("div");
        item.className = "suggest-item";
        item.textContent = val;
        item.onclick = () => {
            input.value = val;
            input.dispatchEvent(new Event("input"));
            ul.remove();
            input.focus();
        };
        ul.appendChild(item);
    });

    wrap.appendChild(ul);

    // Navigazione tastiera
    let active = -1;
    input.onkeydown = (e) => {
        const items = [...ul.querySelectorAll(".suggest-item")];
        if (!items.length) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            active = (active + 1) % items.length;
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            active = (active - 1 + items.length) % items.length;
        } else if (e.key === "Enter") {
            if (active >= 0) {
                e.preventDefault();
                items[active].click();
            }
        } else if (e.key === "Escape") {
            ul.remove();
            return;
        } else {
            return;
        }

        items.forEach((i) => i.classList.remove("active"));
        if (active >= 0) items[active].classList.add("active");
    };

    // Chiudi clic esterno
    document.addEventListener(
        "click",
        (e) => {
            if (!ul.contains(e.target) && e.target !== input) ul.remove();
        },
        { once: true }
    );
}

function getAllValuesFor(field) {
    const vals = new Set();
    $$("#tableBody tr").forEach((r) => {
        const d = getRowData(r);
        const v = (d[field] || "").trim();
        if (v) vals.add(v);
    });
    return [...vals];
}

function createInput(value = "", type = "text", withSuggest = false, suggestField = "", fieldKey = "", rowId = "") {
    const input = document.createElement("input");
    input.type = type;
    input.value = value;

    // Accessibilità + autofill
    if (fieldKey && rowId) {
        const fid = fieldId(fieldKey, rowId);
        input.id = fid;
        input.name = fid;
        input.setAttribute("aria-label", fieldKey);
        input.autocomplete = "off";
    }

    // Salvataggio debounced
    input.addEventListener(
        "input",
        debounce(() => {
            saveTable();
            applyFiltersAndCounters();
        }, 250)
    );

    // Nessun autosuggest richiesto
    if (!withSuggest || !suggestField) return input;

    // Autosuggest wrapper
    const wrap = document.createElement("div");
    wrap.className = "suggest-wrap";
    wrap.appendChild(input);

    input.addEventListener("input", () => {
        const q = input.value.trim().toLowerCase();
        const pool = getAllValuesFor(suggestField)
            .filter((v) => v.toLowerCase().includes(q) && v.toLowerCase() !== q)
            .sort((a, b) => a.localeCompare(b));
        buildSuggestList(input, pool);
    });

    return wrap;
}

/* =========================================
   GESTIONE RIGHE
========================================= */
function addRow(data = {}) {
    const tr = document.createElement("tr");
    const rowId = `r_${Date.now()}_${uid()}`;
    tr.dataset.rowId = rowId;

    // Colonna handle (drag)
    const tdHandle = document.createElement("td");
    tdHandle.className = "handle";
    tdHandle.setAttribute("data-label", "≡");

    const handle = document.createElement("span");
    handle.className = "drag-handle";
    handle.textContent = "⠿";
    handle.setAttribute("draggable", "true");

    tdHandle.appendChild(handle);
    tr.appendChild(tdHandle);

    // Celle editabili
    const headers = ["Data", "Giorno", "Tipo", "Argomento", "Obiettivo", "Caption", "Hashtag", "Stato", "Note"];
    const cells = [
        createInput(data.data || "", "date", false, "", "data", rowId),
        createInput(data.giorno || "", "text", false, "", "giorno", rowId),
        createSelect(tipoOpzioni, data.tipo, "tipo", "tipo", rowId),
        createInput(data.argomento || "", "text", true, "argomento", "argomento", rowId),
        createSelect(obiettivoOpzioni, data.obiettivo, "", "obiettivo", rowId),
        createInput(data.caption || "", "text", false, "", "caption", rowId),
        createInput(data.hashtag || "", "text", true, "hashtag", "hashtag", rowId),
        createSelect(statoOpzioni, data.stato, "stato", "stato", rowId),
        createInput(data.note || "", "text", false, "", "note", rowId),
    ];

    cells.forEach((el, i) => {
        const td = document.createElement("td");
        td.setAttribute("data-label", headers[i]);
        td.appendChild(el);
        tr.appendChild(td);
    });

    // Azioni riga
    const actionsTd = document.createElement("td");
    actionsTd.setAttribute("data-label", "Azioni");

    const actions = document.createElement("div");
    actions.className = "row-actions";

    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-danger";
    delBtn.textContent = "❌ Elimina";
    delBtn.addEventListener("click", () => {
        showConfirm("Vuoi davvero eliminare questa riga?", () => {
            tr.remove();
            saveTable();
            applyFiltersAndCounters();
        });
    });

    const dupBtn = document.createElement("button");
    dupBtn.className = "btn btn-secondary";
    dupBtn.textContent = "📄 Duplica";
    dupBtn.addEventListener("click", () => {
        addRow(getRowData(tr));
        applyFiltersAndCounters();
    });

    actions.appendChild(delBtn);
    actions.appendChild(dupBtn);
    actionsTd.appendChild(actions);
    tr.appendChild(actionsTd);

    // Inserimento
    const tbody = $("#tableBody");
    if (!tbody) return console.error("tbody #tableBody non trovato");

    tbody.appendChild(tr);
    saveTable();
    applyFiltersAndCounters();
}

/* Lettura/scrittura riga */
function getRowData(tr) {
    const c = tr.querySelectorAll("td");
    return {
        data: c[1].querySelector("input").value,
        giorno: c[2].querySelector("input").value,
        tipo: c[3].querySelector("select").value,
        argomento: c[4].querySelector("input").value,
        obiettivo: c[5].querySelector("select").value,
        caption: c[6].querySelector("input").value,
        hashtag: c[7].querySelector("input").value,
        stato: c[8].querySelector("select").value,
        note: c[9].querySelector("input").value,
    };
}

function saveTable() {
    const rows = $$("#tableBody tr");
    const data = [];
    const giorni = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

    rows.forEach((row) => {
        const c = row.querySelectorAll("td");
        const dateInput = c[1].querySelector("input");
        const giornoInput = c[2].querySelector("input");
        if (dateInput.value) {
            giornoInput.value = giorni[new Date(dateInput.value).getDay()];
        }
        data.push(getRowData(row));
    });

    localStorage.setItem(LS_DATA(currentProfile), JSON.stringify(data));

    const ind = $("#saveIndicator");
    if (ind) ind.textContent = `💾 Salvato alle ${nowTime()}`;
}

/* =========================================
   FILTRI + RICERCA + CONTATORI
========================================= */
function applyFiltersAndCounters() {
    const fTipo = ($("#filterTipo")?.value || "").trim();
    const fStato = ($("#filterStato")?.value || "").trim();
    const q = ($("#searchInput")?.value || "").trim().toLowerCase();

    let tot = 0;
    let pub = 0;

    $$("#tableBody tr").forEach((row) => {
        const d = getRowData(row);

        const passTipo = !fTipo || d.tipo === fTipo;
        const passStato = !fStato || d.stato === fStato;
        const hay = [d.argomento, d.caption, d.hashtag].join(" ").toLowerCase();
        const passQ = !q || hay.includes(q);

        const show = passTipo && passStato && passQ;
        row.style.display = show ? "" : "none";

        if (show) {
            tot++;
            if (d.stato === "Pubblicato") pub++;
        }
    });

    const ct = $("#countTot");
    const cp = $("#countPub");
    if (ct) ct.textContent = tot;
    if (cp) cp.textContent = pub;
}

/* =========================================
   EXPORT / IMPORT
========================================= */
function exportToCSV() {
    const headers = ["Data", "Giorno", "Tipo", "Argomento", "Obiettivo", "Caption", "Hashtag", "Stato", "Note"];
    const csv = [headers.join(",")];

    $$("#tableBody tr").forEach((r) => {
        const d = getRowData(r);
        const vals = [
            d.data,
            d.giorno,
            d.tipo,
            d.argomento,
            d.obiettivo,
            d.caption,
            d.hashtag,
            d.stato,
            d.note,
        ].map((v) => {
            let val = (v || "").replace(/"/g, '""');
            if (/,|\n/.test(val)) val = `"${val}"`;
            return val;
        });
        csv.push(vals.join(","));
    });

    downloadFile(csv.join("\n"), `piano-editoriale_${currentProfile}.csv`, "text/csv;charset=utf-8");
}

function exportToJSON() {
    const rows = Array.from($$("#tableBody tr")).map(getRowData);
    downloadFile(JSON.stringify(rows, null, 2), `piano-editoriale_${currentProfile}.json`, "application/json");
}

function importFromJSON(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const rows = JSON.parse(e.target.result);
            const tbody = $("#tableBody");
            if (!tbody) return;
            tbody.innerHTML = "";
            rows.forEach((r) => addRow(r));
            saveTable();
            applyFiltersAndCounters();
        } catch {
            alert("File JSON non valido.");
        }
    };
    reader.readAsText(file);
}

/* =========================================
   PROFILI
========================================= */
function ensureProfiles() {
    if (!localStorage.getItem(LS_PROFILES)) {
        localStorage.setItem(LS_PROFILES, JSON.stringify([DEFAULT_PROFILE]));
        if (!localStorage.getItem(LS_BRAND(DEFAULT_PROFILE))) {
            localStorage.setItem(LS_BRAND(DEFAULT_PROFILE), "Duckbyte");
        }
    }
}

function loadProfilesList() {
    let profiles = [];
    try {
        profiles = JSON.parse(localStorage.getItem(LS_PROFILES)) || [DEFAULT_PROFILE];
    } catch {
        profiles = [DEFAULT_PROFILE];
    }

    const sel = $("#profileSelect");
    if (!sel) return;

    sel.innerHTML = "";
    profiles.forEach((p) => {
        sel.append(new Option(`Profilo: ${p}`, p, false, p === currentProfile));
    });

    // Garantisce l’esistenza di “principale”
    if (!profiles.includes(DEFAULT_PROFILE)) {
        profiles.unshift(DEFAULT_PROFILE);
        localStorage.setItem(LS_PROFILES, JSON.stringify([...new Set(profiles)]));
        loadProfilesList();
    }
}

function switchProfile(p) {
    currentProfile = p;
    loadBrandName(p);
    loadTable(p);
    applyFiltersAndCounters();
}

function saveCurrentToProfile() {
    saveTable();
    showToast("Profilo salvato");
}

function createNewProfile(name) {
    // Validazione semplice
    if (!name || !name.trim()) return { ok: false, err: "Inserisci un nome valido." };

    name = name.trim();
    const list = JSON.parse(localStorage.getItem(LS_PROFILES)) || [];
    if (list.includes(name)) return { ok: false, err: "Esiste già un profilo con questo nome." };

    localStorage.setItem(LS_PROFILES, JSON.stringify([...list, name]));
    localStorage.setItem(LS_BRAND(name), name);

    currentProfile = name;
    loadProfilesList();
    switchProfile(name);

    return { ok: true };
}

function deleteProfile() {
    if (currentProfile === DEFAULT_PROFILE) {
        alert("Non puoi eliminare il profilo principale.");
        return;
    }

    showConfirm(`Eliminare il profilo "${currentProfile}"?`, () => {
        const list = JSON.parse(localStorage.getItem(LS_PROFILES)) || [];
        localStorage.setItem(LS_PROFILES, JSON.stringify(list.filter((p) => p !== currentProfile)));
        localStorage.removeItem(LS_DATA(currentProfile));
        localStorage.removeItem(LS_BRAND(currentProfile));

        currentProfile = DEFAULT_PROFILE;
        loadProfilesList();
        switchProfile(DEFAULT_PROFILE);
        showToast("Profilo eliminato");
    });
}

/* =========================================
   TOAST & CONFIRM (leggeri)
========================================= */
function showToast(msg = "Fatto") {
    const t = document.createElement("div");
    t.className = "confirm-modal";
    t.innerHTML = `
    <p>${msg}</p>
    <div class="confirm-actions">
      <button class="btn btn-secondary cancel">OK</button>
    </div>
  `;
    document.body.appendChild(t);

    t.querySelector(".cancel").onclick = () => t.remove();

    setTimeout(() => {
        if (document.body.contains(t)) t.remove();
    }, 2200);
}

function showConfirm(message, onConfirm) {
    const modal = document.createElement("div");
    modal.className = "confirm-modal";
    modal.innerHTML = `
    <p>⚠️ ${message}</p>
    <div class="confirm-actions">
      <button class="btn btn-secondary cancel">Annulla</button>
      <button class="btn btn-danger confirm">Conferma</button>
    </div>
  `;
    document.body.appendChild(modal);

    modal.querySelector(".cancel").onclick = () => modal.remove();
    modal.querySelector(".confirm").onclick = () => {
        modal.remove();
        onConfirm();
    };
}

/* =========================================
   DRAG & DROP (handle ⠿)
========================================= */
function initDragAndDrop() {
    const tbody = $("#tableBody");
    if (!tbody) return;

    let dragged = null;

    tbody.addEventListener("dragstart", (e) => {
        const handle = e.target.closest(".drag-handle");
        if (!handle) {
            e.preventDefault();
            return;
        }
        dragged = handle.closest("tr");
        dragged.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
    });

    tbody.addEventListener("dragend", () => {
        if (dragged) dragged.classList.remove("dragging");
        dragged = null;
        saveTable();
    });

    tbody.addEventListener("dragover", (e) => {
        if (!dragged) return;
        e.preventDefault();

        // Inserisce prima della riga “after” calcolata
        const after = [...tbody.querySelectorAll("tr")].find((row) => {
            const rect = row.getBoundingClientRect();
            return e.clientY < rect.top + rect.height / 2;
        });

        if (after) tbody.insertBefore(dragged, after);
        else tbody.appendChild(dragged);
    });
}

/* =========================================
   MODALE: NUOVO PROFILO (semplice + focus trap)
========================================= */
function openProfileModal() {
    const modal = $("#profileModal");
    if (!modal) return;

    const nameInput = $("#pm-name");
    const err = $("#pm-error");

    modal.setAttribute("aria-hidden", "false");
    if (err) err.textContent = "";
    if (nameInput) {
        nameInput.value = "";
        nameInput.focus();
    }

    // ESC per chiudere
    function onEsc(e) {
        if (e.key === "Escape") closeProfileModal();
    }

    // Focus trap minimale
    function trapTab(e) {
        if (e.key !== "Tab") return;
        const fcs = modal.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
        if (!fcs.length) return;
        const first = fcs[0];
        const last = fcs[fcs.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    modal.addEventListener("keydown", trapTab);
    document.addEventListener("keydown", onEsc, { once: true });

    // Flag per riconoscere l’attivazione del trap
    modal.dataset.trap = "1";
}

function closeProfileModal() {
    const modal = $("#profileModal");
    if (!modal) return;

    modal.setAttribute("aria-hidden", "true");

    // Rimuove i listener del focus-trap ricreando il nodo
    const clone = modal.cloneNode(true);
    modal.replaceWith(clone);
    clone.id = "profileModal";
    document.body.appendChild(clone);
}

/* =========================================
   CARICAMENTO DATI
========================================= */
function loadTable(profile = currentProfile) {
    const tbody = $("#tableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    const saved = localStorage.getItem(LS_DATA(profile));
    if (saved) {
        JSON.parse(saved).forEach((row) => addRow(row));
    } else {
        addRow();
    }

    const ind = $("#saveIndicator");
    if (ind) ind.textContent = `💾 Salvato alle ${nowTime()}`;
}

/* =========================================
   INIT
========================================= */
document.addEventListener("DOMContentLoaded", () => {
    applyTheme();

    /* Filtri + ricerca */
    const selTipo = $("#filterTipo");
    const selStato = $("#filterStato");

    if (selTipo) tipoOpzioni.forEach((o) => selTipo.append(new Option(o, o)));
    if (selStato) statoOpzioni.forEach((o) => selStato.append(new Option(o, o)));

    selTipo?.addEventListener("change", applyFiltersAndCounters);
    selStato?.addEventListener("change", applyFiltersAndCounters);
    $("#searchInput")?.addEventListener("input", debounce(applyFiltersAndCounters, 200));

    /* Profili */
    ensureProfiles();
    loadProfilesList();

    $("#profileSelect")?.addEventListener("change", (e) => switchProfile(e.target.value));
    $("#saveProfileBtn")?.addEventListener("click", saveCurrentToProfile);
    $("#newProfileBtn")?.addEventListener("click", openProfileModal);
    $("#deleteProfileBtn")?.addEventListener("click", deleteProfile);

    // Modale: chiusura e conferma
    document.body.addEventListener("click", (e) => {
        if (e.target.matches("[data-close-modal]")) {
            closeProfileModal();
        }
        if (e.target.id === "pm-confirm") {
            const name = $("#pm-name")?.value || "";
            const out = createNewProfile(name);
            const err = $("#pm-error");
            if (!out.ok) {
                if (err) err.textContent = out.err;
                return;
            }
            closeProfileModal();
            showToast("Profilo creato");
        }
    });

    /* Bottoni principali */
    const addBtn = $("#addRowBtn");
    addBtn?.addEventListener("click", () => {
        // Protezione anti-doppio click: una riga per volta
        if (addBtn.dataset.busy === "1") return;
        addBtn.dataset.busy = "1";
        addRow();
        setTimeout(() => {
            addBtn.dataset.busy = "";
        }, 120);
    });

    $("#clearTableBtn")?.addEventListener("click", () =>
        showConfirm("Vuoi davvero cancellare tutta la tabella?", () => {
            const tbody = $("#tableBody");
            if (!tbody) return;
            tbody.innerHTML = "";
            saveTable();
            addRow();
            applyFiltersAndCounters();
        })
    );

    $("#exportCsvBtn")?.addEventListener("click", exportToCSV);
    $("#exportJsonBtn")?.addEventListener("click", exportToJSON);
    $("#importJsonBtn")?.addEventListener("click", () => $("#importJsonInput")?.click());
    $("#importJsonInput")?.addEventListener("change", (e) => {
        if (e.target.files?.[0]) importFromJSON(e.target.files[0]);
    });

    /* Tema */
    $("#themeToggleBtn")?.addEventListener("click", toggleTheme);

    /* Drag & drop righe */
    initDragAndDrop();

    /* Brand + tabella iniziali */
    switchProfile(DEFAULT_PROFILE);
});

/* Espone funzioni richiamate inline */
window.saveBrandName = saveBrandName;
