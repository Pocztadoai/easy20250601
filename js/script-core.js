// Plik: EazyKoszt 0.6.1E-script-core.js
// Opis: Rdzeń aplikacji EazyKoszt.
// Wersja 0.6.1E: Poprawka TypeError w showNotification i upewnienie się o spójności.

// ==========================================================================
// SEKCJA 1: STAŁE GLOBALNE I KONFIGURACJA
// ==========================================================================
const STORAGE_KEYS = {
    APP_STATE: 'eazykoszt_appState_v0_3_0',
    ESTIMATE_STATE: 'eazykoszt_estimateState_v0_1_0',
    LAST_BRANCH_FILTER: 'eazykoszt_lastBranchFilter_v0_3_0',
    TEMPLATES: 'eazykoszt_templates_v0_1_0',
    APP_VERSION_LS: 'eazykoszt_appVersion_localStorage_v0_6_1E'
};
const APP_VERSION = "EazyKoszt 0.6.1E";
const MAX_HISTORY_SIZE = 20;
const MAX_ESTIMATE_VERSIONS = 30;
const AUTO_SAVE_PREFIX = "Autozapis - ";
const INDICATOR_ROW_ID = 'temp-insert-indicator';

const DEFAULT_WORKER_RATES_SETTINGS = {
    ogolnobudowlany: { name: "Pracownik Ogólnobudowlany", rate: 0.00, inputId: "rate-labor-ogolnobudowlany" },
    elektryk: { name: "Elektryk", rate: 0.00, inputId: "rate-labor-elektryk" },
    hydraulik: { name: "Hydraulik", rate: 0.00, inputId: "rate-labor-hydraulik" },
    stolarz: { name: "Stolarz", rate: 0.00, inputId: "rate-labor-stolarz" },
    klima_went: { name: "Monter Klima-Went.", rate: 0.00, inputId: "rate-labor-klima_went" },
    serwisant: { name: "Serwisant", rate: 0.00, inputId: "rate-labor-serwisant" },
    gazownik: { name: "Gazownik", rate: 0.00, inputId: "rate-labor-gazownik" }
};

const NOTIFICATION_ICONS = {
    success: '✔', error: '✖', warning: '⚠', info: 'ℹ'
};

const DEPARTMENT_COLOR_PALETTE = [
    '#FFDDC1', '#FFABAB', '#FFC3A0', '#FFD6A5', '#FDFFB6', '#CAFFBF',
    '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF', '#FFFFFC', '#FFFACD',
    '#F5F5F5', '#DCDCDC', '#BEBEBE'
];
const SUBDEPARTMENT_LIGHTEN_PERCENTAGES = [30, 45, 60, 75, 85];

const USER_IDLE_TIMEOUT_MS = 1 * 60 * 1000; // 1 minuta bezczynności
const IDLE_AUTOSAVE_INTERVAL_MINUTES = 10; // 10 minut dla autozapisu w trybie bezczynności

// ==========================================================================
// SEKCJA 2: ZMIENNE GLOBALNE APLIKACJI (ELEMENTY DOM I STAN UI)
// ==========================================================================
let costTableBody, grandTotalElement, addRowBtn, addDepartmentBtn, addSubDepartmentBtn, clearAllBtn,
    materialSummaryBody, materialGrandTotalElement, materialProfitGrandTotalElement,
    customTaskModal, closeModalBtn, saveModalBtn, cancelCustomTaskBtn, addMaterialNormBtn, customTaskMaterialsList,
    modalTitle, modalDescInput, modalUnitInput, modalNormRInput, modalWorkerCategorySelect,
    modalMaterialsSection, modalQuantityInput, modalQuantityDiv, materialSelectModal, closeMaterialModalBtn,
    materialSearchInput, materialSelectList, materialSelectNoResults, newMaterialNameInput,
    newMaterialUnitInput, newMaterialCategoryInput, addNewMaterialBtn, cancelMaterialSelectBtn,
    csvFileInput, loadCsvButton, saveEstimateBtn, loadEstimateBtn, loadEstimateFileInput,
    commonUnitsDatalist,
    originalModalTitle,
    undoBtn, redoBtn, fixedActionButtons, scrollToTopBtn, materialSummaryTable,
    useSameRateCheckbox, specialistRatesContainer,
    openPrintSelectionBtn, printSelectionModal, closePrintSelectionModalBtn,
    generateSelectedPrintsBtn, cancelPrintSelectionBtn, printOptionsContainer,
    previewEstimateDetailBtn, toggleStyleConfiguratorBtn, konfiguratorStyluContent,
    saveEstimateVersionBtn,
    editEstimateDetailsBtn, estimateDetailsModal, saveEstimateDetailsModalBtn, cancelEstimateDetailsModalBtn,
    modalEstimateTitleInput, modalInvestmentLocationInput, modalInvestorInfoInput, modalContractorInfoInput, modalVatRateSelect, // Poprawiono: usunięto duplikację
    estimateVersionsSelect, loadSelectedVersionBtn, deleteSelectedVersionBtn,
    customContextMenu,
    saveDepartmentTemplateBtn, saveEstimateTemplateBtn, openTemplatesModalBtn,
    templatesModal, closeTemplatesModalBtn, templateSelect, insertTemplateBtn, deleteTemplateBtn,
    branchSelectDropdown,
    tasksCatalogSearch, addNewTaskToCatalogBtn, tasksCatalogListContainer,
    materialsCatalogSearch, addNewMaterialToCatalogBtn, materialsCatalogListContainer,
    notesModal, notesModalTextarea, notesModalItemDesc, saveNotesModalBtn, cancelNotesModalBtn, closeNotesModalXBtn,
    notificationsContainer,
    confirmNotificationModal, confirmNotificationTitle, confirmNotificationMessage,
    confirmNotificationOkBtn, confirmNotificationCancelBtn, confirmNotificationCloseBtnX,
    colorPaletteDiv,
    autoSaveEnabledCheckbox, autoSaveIntervalSelect, autoSaveIntervalGroup;

let currentNotesTargetRow = null; // Zmieniono: to będzie teraz rowId, a nie element DOM
let selectedCsvFile = null;
let activeDropdown = null;
let activeSearchInput = null;
let currentEditContext = null;
let currentEditingRef = null;
let targetMaterialInputRow = null;
let draggedRow = null; // To jest element DOM wiersza, który jest przeciągany
let chapterSums = {}; // Pozostaje, bo to są dane pochodne wyświetlane w DOM
let historyStack = [];
let redoStack = [];
let isRestoringState = false;
let materialSortColumn = 'name';
let materialSortDirection = 'asc';
let lastClickedRow = null; // To jest element DOM ostatnio klikniętego wiersza
let contextMenuTargetRow = null; // To jest element DOM
let insertIndicator = null;
let dbEstimateVersions;
let currentConfirmCallback = null;
let currentCancelCallback = null;
// let departmentColors = {}; // USUNIĘTE: przeniesione do currentEstimateModel
let autoSaveTimerId = null;
let userIdleTimerId = null; // Timer do śledzenia bezczynności użytkownika
let isUserIdle = false; // Flaga wskazująca, czy użytkownik jest obecnie bezczynny

// NOWA ZMIENNA: Centralny model danych dla kosztorysu
let currentEstimateModel = {
    rows: [], // Tablica obiektów reprezentujących wiersze (zadania, działy, poddziały)
    departmentColors: {}, // Mapa kolorów dla działów/poddziałów (przeniesione z globalnej zmiennej)
    isHierarchical: false // Tryb hierarchiczny (przeniesione z appState.getState)
};

// ==========================================================================
// SEKCJA 3: FUNKCJE POMOCNICZE (OGÓLNE)
// ==========================================================================
// ... (bez zmian) ...
function saveToLocalStorage(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.error("Błąd zapisu do localStorage dla klucza:", key, e); } }
function loadFromLocalStorage(key, defaultValue = null) { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : defaultValue; } catch (e) { console.error("Błąd odczytu z localStorage dla klucza:", key, e); return defaultValue; } }
function debounce(func, delay) { let timeout; return function(...args) { const context = this; clearTimeout(timeout); timeout = setTimeout(() => func.apply(context, args), delay); };}
function formatCurrency(value, decimalPlaces = 2) { if (typeof value !== 'number' || isNaN(value)) { return Number(0).toFixed(decimalPlaces).replace('.', ','); } return value.toFixed(decimalPlaces).replace('.', ','); }
function setNumericInputValue(inputElement, numericValue, decimalPlaces = 2) { if (inputElement) { let parsedValue; if (typeof numericValue === 'number' && !isNaN(numericValue)) { parsedValue = numericValue; } else { const tempValue = parseFloat(String(numericValue).replace(',', '.')); parsedValue = isNaN(tempValue) ? 0 : tempValue; } inputElement.value = parsedValue.toFixed(decimalPlaces); } }
function evaluateMathExpression(expression) {
    if (typeof expression !== 'string') {
        const val = parseFloat(expression);
        return isNaN(val) ? 0 : val;
    }
    const originalExpressionForFallback = expression;
    try {
        let sanitizedExpression = expression.replace(/,/g, '.').replace(/\s+/g, '');
        sanitizedExpression = sanitizedExpression.replace(/[^0-9+\-*/().]/g, (match) => {
            return '';
        });
        if (!sanitizedExpression) return 0;
        if (/[^0-9+\-*/().]/.test(sanitizedExpression)) {
            console.warn("evaluateMathExpression: Wykryto potencjalnie niebezpieczne znaki po sanitacji, zwracam 0. Wyrażenie:", sanitizedExpression);
            return 0;
        }
        if (sanitizedExpression === "" || sanitizedExpression === ".") return 0;
        const result = new Function(`return ${sanitizedExpression}`)();
        const parsedResult = parseFloat(result);
        return isNaN(parsedResult) ? 0 : parsedResult;
    } catch (e) {
        console.warn("Błąd obliczania wyrażenia matematycznego:", originalExpressionForFallback, e.message);
        const fallbackValue = parseFloat(originalExpressionForFallback.replace(/,/g, '.').replace(/[^-0-9.]/g, ''));
        return isNaN(fallbackValue) ? 0 : fallbackValue;
    }
}
// ==========================================================================
// SEKCJA 3.1: FUNKCJE POMOCNICZE (KOLORY)
// ==========================================================================
// ... (bez zmian) ...
function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') return null;
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}
function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}
function lightenHexColor(hex, percent) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    const p = Math.min(100, Math.max(0, percent)) / 100;
    rgb.r = Math.min(255, Math.round(rgb.r * (1 - p) + 255 * p));
    rgb.g = Math.min(255, Math.round(rgb.g * (1 - p) + 255 * p));
    rgb.b = Math.min(255, Math.round(rgb.b * (1 - p) + 255 * p));
    return rgbToHex(rgb.r, rgb.g, rgb.b);
}
function getContrastTextColor(hexBackgroundColor) {
    if (!hexBackgroundColor || hexBackgroundColor.toLowerCase() === 'transparent' || hexBackgroundColor.toLowerCase() === 'inherit') {
        return 'var(--text-color)';
    }
    const rgb = hexToRgb(hexBackgroundColor);
    if (!rgb) return 'var(--text-color)';
    const sRGBtoLin = (colorChannel) => {
        colorChannel /= 255;
        return colorChannel <= 0.03928 ? colorChannel / 12.92 : Math.pow((colorChannel + 0.055) / 1.055, 2.4);
    };
    const lumR = sRGBtoLin(rgb.r);
    const lumG = sRGBtoLin(rgb.b);
    const lumB = sRGBtoLin(rgb.b);
    const luminance = 0.2126 * lumR + 0.7152 * lumG + 0.0722 * lumB;
    return luminance > 0.45 ? '#000000' : '#FFFFFF';
}

// USUNIĘTE FUNKCJE ZARZĄDZANIA KOLORAMI WIERSZY (przeniesione/zintegrowane z renderCostTable)
// function applyRowColor() { /* ... */ }
// function applyInheritedColors() { /* ... */ }
// function applyTaskColorsUnderParent() { /* ... */ }
// function reapplyAllRowColors() { /* ... */ }
// function getParentDepartmentRow() { /* ... */ }
// function getParentSubDepartmentRow() { /* ... */ }


// ==========================================================================
// SEKCJA 3.2: SYSTEM POWIADOMIEŃ
// ==========================================================================
// ... (bez zmian) ...
function showNotification(message, type = 'info', duration = 5000) {
    if (!notificationsContainer) {
        console.warn("Kontener powiadomień nie istnieje. Powiadomienie: ", message);
        alert(`${type.toUpperCase()}: ${message}`);
        return;
    }
    const notification = document.createElement('div');
    notification.classList.add('notification', type);
    const iconSpan = document.createElement('span');
    iconSpan.classList.add('notification-icon');
    iconSpan.textContent = NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.info;
    notification.appendChild(iconSpan);
    const messageSpan = document.createElement('span'); // Poprawiono: document.createElement('span') zamiast document.classList.add
    messageSpan.classList.add('notification-message');
    messageSpan.innerHTML = message;
    notification.appendChild(messageSpan);
    const closeBtn = document.createElement('button');
    closeBtn.classList.add('notification-close-btn');
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('aria-label', 'Zamknij powiadomienie');
    closeBtn.onclick = () => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => notification.remove(), { once: true });
    };
    notification.appendChild(closeBtn);
    notificationsContainer.appendChild(notification);
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });
    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentElement) closeBtn.onclick();
        }, duration);
    }
}
function showConfirmNotification(message, onConfirm, onCancel = null, title = "Potwierdzenie") {
    if (!confirmNotificationModal || !confirmNotificationTitle || !confirmNotificationMessage || !confirmNotificationOkBtn || !confirmNotificationCancelBtn) {
        console.error("Elementy modala potwierdzenia nie zostały znalezione. Używam standardowego confirm().");
        if (confirm(message)) { if (onConfirm) onConfirm(); }
        else { if (onCancel) onCancel(); }
        return;
    }
    confirmNotificationTitle.textContent = title;
    confirmNotificationMessage.innerHTML = message;
    currentConfirmCallback = onConfirm;
    currentCancelCallback = onCancel;
    confirmNotificationModal.style.display = 'block';
}
function closeConfirmNotificationModal() { if (confirmNotificationModal) { confirmNotificationModal.style.display = 'none'; } currentConfirmCallback = null; currentCancelCallback = null; }

// ==========================================================================
// SEKCJA 3.3: ZARZĄDCA STANU APLIKACJI (appState)
// ==========================================================================
const appState = {
    _state: {
        estimateTitle: 'Nowy Kosztorys',
        investmentLocation: '',
        investorInfo: '',
        contractorInfo: '',
        vatRate: '23',
        currentVatDisplayValue: "23",
        workerRatesSettings: JSON.parse(JSON.stringify(DEFAULT_WORKER_RATES_SETTINGS)),
        useSameRateForAllSpecialists: true,
        isHierarchicalMode: false, // Zmieniono: Główna kontrola trybu hierarchicznego jest teraz w currentEstimateModel
        lastBranchFilter: '',
        defaultTaskRowBackgroundColor: null,
        autoSaveEnabled: true,
        autoSaveIntervalMinutes: 5,
    },
    _listeners: {},
    init() {
        const savedAppState = loadFromLocalStorage(STORAGE_KEYS.APP_STATE);
        if (savedAppState) {
            Object.keys(this._state).forEach(key => {
                if (savedAppState.hasOwnProperty(key)) {
                    if (key === 'workerRatesSettings' && typeof savedAppState[key] === 'object' && savedAppState[key] !== null) {
                        Object.keys(this._state.workerRatesSettings).forEach(catCode => {
                            if (savedAppState.workerRatesSettings[catCode] && savedAppState.workerRatesSettings[catCode].hasOwnProperty('rate')) {
                                this._state.workerRatesSettings[catCode].rate = parseFloat(savedAppState.workerRatesSettings[catCode].rate) || 0;
                            }
                            this._state.workerRatesSettings[catCode].name = this._state.workerRatesSettings[catCode].name || DEFAULT_WORKER_RATES_SETTINGS[catCode]?.name;
                            this._state.workerRatesSettings[catCode].inputId = this._state.workerRatesSettings[catCode].inputId || DEFAULT_WORKER_RATES_SETTINGS[catCode]?.inputId;
                        });
                    } else if (key === 'autoSaveIntervalMinutes') {
                        this._state[key] = parseInt(savedAppState[key], 10) || 5;
                    }
                     else {
                        this._state[key] = savedAppState[key];
                    }
                }
            });
            if (this._state.hasOwnProperty('vatRate')) {
                const storedVat = this._state.vatRate;
                if (storedVat === "zw") this._state.currentVatDisplayValue = "ZW";
                else this._state.currentVatDisplayValue = String(parseInt(storedVat, 10) || 23);
            }
        } else {
            this.saveState();
        }
        const savedStyles = loadFromLocalStorage(StyleConfiguratorModule.STORAGE_KEY_STYLES);
        if (savedStyles && savedStyles['--task-row-default-bg']) {
            this._state.defaultTaskRowBackgroundColor = savedStyles['--task-row-default-bg'];
        }

        // Zmieniono: isHierarchicalMode w appState powinno być zsynchronizowane z currentEstimateModel
        // Przy inicjalizacji appState, currentEstimateModel może jeszcze nie być w pełni załadowany/zsynchronizowany,
        // dlatego ta synchronizacja jest bardziej krytyczna podczas ładowania estimateState
        // Poniżej: appState.isHierarchicalMode będzie ustawiane przez restoreEstimateDisplayState
        // lub loadEstimateState na podstawie currentEstimateModel.isHierarchical
        if (typeof currentEstimateModel !== 'undefined') {
             this._state.isHierarchicalMode = currentEstimateModel.isHierarchical;
        }

        console.log("Zarządca stanu zainicjalizowany. Stan początkowy:", JSON.parse(JSON.stringify(this._state)));
    },
    saveState() { saveToLocalStorage(STORAGE_KEYS.APP_STATE, this._state); console.log("Stan aplikacji (APP_STATE) zapisany przez appState.saveState()"); },
    getState(key) { return this._state[key]; },
    setState(key, value, preventSave = false) {
        const oldValue = JSON.parse(JSON.stringify(this._state[key]));
        let valueChanged = false;
        if (typeof value === 'object' && value !== null && typeof oldValue === 'object' && oldValue !== null) {
            if (JSON.stringify(value) !== JSON.stringify(oldValue)) valueChanged = true;
        } else if (oldValue !== value) {
            valueChanged = true;
        }
        if (valueChanged) {
            this._state[key] = (typeof value === 'object' && value !== null) ? JSON.parse(JSON.stringify(value)) : value;
            console.log(`appState: Zmieniono stan '${key}' z`, oldValue, "na", this._state[key]);
            if (key === 'vatRate') {
                const currentVal = this._state.vatRate;
                if (currentVal === "zw") this._state.currentVatDisplayValue = "ZW";
                else this._state.currentVatDisplayValue = String(parseInt(currentVal, 10) || 0);
            }
            if (!preventSave) this.saveState();
            this.notify(key, this._state[key], oldValue);
        }
    },
    subscribe(key, listener) { if (!this._listeners[key]) this._listeners[key] = []; if (!this._listeners[key].includes(listener)) this._listeners[key].push(listener); },
    unsubscribe(key, listener) { if (this._listeners[key]) this._listeners[key] = this._listeners[key].filter(l => l !== listener); },
    notify(key, newValue, oldValue) { if (this._listeners[key]) this._listeners[key].forEach(listener => { try { listener(newValue, oldValue); } catch (e) { console.error(`Błąd w listenerze dla klucza '${key}':`, e); } }); }
};

// ==========================================================================
// NOWA FUNKCJA: CENTRALNA AKTUALIZACJA MODELU I RENDEROWANIE UI
// Opis: Ta funkcja jest punktem wejścia do modyfikacji stanu kosztorysu.
//       Aktualizuje currentEstimateModel, wywołuje renderowanie UI,
//       przelicza wartości i zapisuje stan.
// ==========================================================================
async function updateModelAndRender(newModelData) {
    // Zapobiegaj wyzwalaniu podczas przywracania stanu
    if (isRestoringState) return;

    let modelChanged = false;
    // Sprawdź, czy dane rows się zmieniły
    if (newModelData.rows !== undefined && JSON.stringify(currentEstimateModel.rows) !== JSON.stringify(newModelData.rows)) {
        currentEstimateModel.rows = JSON.parse(JSON.stringify(newModelData.rows)); // Głęboka kopia
        modelChanged = true;
    }
    // Sprawdź i zaktualizuj departmentColors
    if (newModelData.departmentColors !== undefined && JSON.stringify(currentEstimateModel.departmentColors) !== JSON.stringify(newModelData.departmentColors)) {
        currentEstimateModel.departmentColors = JSON.parse(JSON.stringify(newModelData.departmentColors));
        modelChanged = true;
    }
    // Sprawdź i zaktualizuj isHierarchical
    if (newModelData.isHierarchical !== undefined && currentEstimateModel.isHierarchical !== newModelData.isHierarchical) {
        currentEstimateModel.isHierarchical = newModelData.isHierarchical;
        // Upewnij się, że appState też jest zaktualizowane (jeśli jest to źródło prawdy dla innych miejsc w UI)
        appState.setState('isHierarchicalMode', currentEstimateModel.isHierarchical, true); // true, aby zapobiec pętli zapisu
        modelChanged = true;
    }

    if (modelChanged) {
        console.log("updateModelAndRender: Model kosztorysu zmieniony, ponowne renderowanie.");
        if (typeof renderCostTable === 'function') {
            await renderCostTable(currentEstimateModel); // Wywołaj renderowanie tabeli
        }

        // Upewnij się, że wszelkie obliczenia i zapisy są wywoływane po renderowaniu
        // Te funkcje też muszą być dostosowane do operowania na modelu, a nie na DOM
        await recalculateAllRowsAndTotals();
        await saveEstimateState(); // Zapisz zaktualizowany model do localStorage
        saveHistoryState(); // Zapisz aktualny stan do historii
    } else {
        console.log("updateModelAndRender: Model kosztorysu nie zmieniony.");
    }
}


// ==========================================================================
// SEKCJA 3.4: ZARZĄDZANIE KOLORAMI WIERSZY
// ==========================================================================
// USUNIĘTE: Funkcje applyRowColor, applyInheritedColors, applyTaskColorsUnderParent, reapplyAllRowColors
// Ich logika została zintegrowana w renderCostTable.
// Funkcje getParentDepartmentRow i getParentSubDepartmentRow również usunięto,
// ponieważ ich głównym zastosowaniem było wspieranie dziedziczenia kolorów w DOM,
// co teraz jest częścią logiki renderCostTable.

function openColorPalette(event, targetDomRow) { // Przyjmuje element DOM
    event.stopPropagation();
    if (colorPaletteDiv && colorPaletteDiv.parentElement) {
        colorPaletteDiv.remove();
    }

    colorPaletteDiv = document.createElement('div');
    colorPaletteDiv.className = 'color-palette';

    const rowId = targetDomRow.dataset.rowId;

    const noColorOption = document.createElement('div');
    noColorOption.className = 'color-palette-item no-color';
    noColorOption.title = 'Usuń własny kolor (styl domyślny)';
    noColorOption.addEventListener('click', async () => {
        // Zaktualizuj departmentColors w modelu
        const updatedDepartmentColors = { ...currentEstimateModel.departmentColors };
        delete updatedDepartmentColors[rowId]; // Usuń kolor

        // Wywołaj updateModelAndRender, aby odświeżyć całą tabelę z nowymi kolorami
        await updateModelAndRender({ departmentColors: updatedDepartmentColors });

        colorPaletteDiv.remove();
    });
    colorPaletteDiv.appendChild(noColorOption);

    DEPARTMENT_COLOR_PALETTE.forEach(hexColor => {
        const colorItem = document.createElement('div');
        colorItem.className = 'color-palette-item';
        colorItem.style.backgroundColor = hexColor;
        colorItem.dataset.color = hexColor;
        colorItem.title = hexColor;
        colorItem.addEventListener('click', async () => {
            // Zaktualizuj departmentColors w modelu
            const updatedDepartmentColors = { ...currentEstimateModel.departmentColors };
            updatedDepartmentColors[rowId] = hexColor;

            // Wywołaj updateModelAndRender, aby odświeżyć całą tabelę z nowymi kolorami
            await updateModelAndRender({ departmentColors: updatedDepartmentColors });

            colorPaletteDiv.remove();
        });
        colorPaletteDiv.appendChild(colorItem);
    });

    document.body.appendChild(colorPaletteDiv);
    const iconRect = event.currentTarget.getBoundingClientRect();
    const paletteRect = colorPaletteDiv.getBoundingClientRect();
    let top = iconRect.bottom + window.scrollY + 5;
    let left = iconRect.left + window.scrollX;
    if (left + paletteRect.width > window.innerWidth) {
        left = window.innerWidth - paletteRect.width - 10;
    }
    if (top + paletteRect.height > window.innerHeight) {
        top = iconRect.top + window.scrollY - paletteRect.height - 5;
    }
    if (top < 0) top = 10;
    if (left < 0) left = 10;
    colorPaletteDiv.style.top = `${top}px`;
    colorPaletteDiv.style.left = `${left}px`;
    colorPaletteDiv.style.display = 'flex';
    const closePaletteHandler = (e) => {
        if (colorPaletteDiv && !colorPaletteDiv.contains(e.target) && e.target !== event.currentTarget) {
            colorPaletteDiv.remove();
            document.removeEventListener('click', closePaletteHandler, true);
        }
    };
    setTimeout(() => document.addEventListener('click', closePaletteHandler, true), 0);
}

// ==========================================================================
// SEKCJA 4: FUNKCJE POMOCNICZE (DANE KATALOGOWE I KOSZTORYSOWE)
// ==========================================================================
async function getMaterialUnit(materialNameOrId) { try { let material; if (typeof materialNameOrId === 'number') material = await dbService.getItem(MATERIALS_CATALOG_STORE_NAME, materialNameOrId); else material = await dbService.getItemByIndex(MATERIALS_CATALOG_STORE_NAME, 'name', materialNameOrId); return material ? (material.unit || 'j.m.') : 'j.m.'; } catch (e) { console.error("Błąd pobierania jednostki materiału:", materialNameOrId, e); return 'j.m.'; } }
async function getMaterialPrice(materialNameOrId) { try { let material; if (typeof materialNameOrId === 'number') material = await dbService.getItem(MATERIALS_CATALOG_STORE_NAME, materialNameOrId); else material = await dbService.getItemByIndex(MATERIALS_CATALOG_STORE_NAME, 'name', materialNameOrId); return material ? (material.priceY || 0) : 0; } catch (e) { console.error("Błąd pobierania ceny materiału:", materialNameOrId, e); return 0; } }
async function getMaterialPurchasePrice(materialNameOrId) { try { let material; if (typeof materialNameOrId === 'number') material = await dbService.getItem(MATERIALS_CATALOG_STORE_NAME, materialNameOrId); else material = await dbService.getItemByIndex(MATERIALS_CATALOG_STORE_NAME, 'name', materialNameOrId); return material ? (material.priceX ?? material.priceY ?? 0) : 0; } catch (e) { console.error("Błąd pobierania ceny zakupu materiału:", materialNameOrId, e); return 0; } }
async function getMaterialCategory(materialNameOrId) { try { let material; if (typeof materialNameOrId === 'number') material = await dbService.getItem(MATERIALS_CATALOG_STORE_NAME, materialNameOrId); else material = await dbService.getItemByIndex(MATERIALS_CATALOG_STORE_NAME, 'name', materialNameOrId); return material ? (material.categoryCode || 'IN') : 'IN'; } catch (e) { console.error("Błąd pobierania kategorii materiału:", materialNameOrId, e); return 'IN'; } }
function getMaterialCategoryFullName(categoryCode) { return typeof MATERIAL_CATEGORIES_MAP !== 'undefined' ? (MATERIAL_CATEGORIES_MAP[categoryCode] || "Nieskategoryzowane") : "Nieskategoryzowane (Brak mapy kategorii)"; }
function getLaborRateForWorkerCategory(categoryCode) { const currentRatesSettings = appState.getState('workerRatesSettings'); if (!currentRatesSettings || !currentRatesSettings[categoryCode]) { return currentRatesSettings?.ogolnobudowlany?.rate || 0; } if (appState.getState('useSameRateForAllSpecialists') && categoryCode !== 'ogolnobudowlany') { return currentRatesSettings.ogolnobudowlany?.rate || 0; } return currentRatesSettings[categoryCode]?.rate || currentRatesSettings.ogolnobudowlany?.rate || 0; }
function getWorkerCategoryName(categoryCode) { const currentRatesSettings = appState.getState('workerRatesSettings'); return currentRatesSettings?.[categoryCode]?.name || categoryCode; }
// ==========================================================================
// SEKCJA 5: ZARZĄDZANIE WSKAŹNIKIEM WSTAWIANIA WIERSZA
// ==========================================================================
const removeInsertIndicator = () => { if (insertIndicator && insertIndicator.parentNode) { insertIndicator.parentNode.removeChild(insertIndicator); } insertIndicator = null; };
const getTableColumnCount = () => { const header = document.querySelector('#cost-table thead tr'); return header ? header.cells.length : 9; };
const showInsertIndicator = (type) => { removeInsertIndicator(); if (!costTableBody) return; if (type === 'subdepartment' && !currentEstimateModel.isHierarchical) return; insertIndicator = document.createElement('tr'); insertIndicator.id = INDICATOR_ROW_ID; insertIndicator.classList.add('insert-indicator-row'); insertIndicator.setAttribute('aria-hidden', 'true'); const cell = insertIndicator.insertCell(); cell.colSpan = getTableColumnCount(); cell.classList.add('insert-indicator-cell'); let calculatedInsertBeforeNode = null; if (!lastClickedRow || !costTableBody.contains(lastClickedRow)) { if (type === 'department' && currentEstimateModel.isHierarchical) calculatedInsertBeforeNode = costTableBody.firstChild; else calculatedInsertBeforeNode = null; } else { const refType = lastClickedRow.dataset.rowType; if (type === 'department') { let currentDeptBlockStart = lastClickedRow; if (refType !== 'department') { let prev = lastClickedRow.previousElementSibling; while (prev) { if (prev.dataset.rowType === 'department') { currentDeptBlockStart = prev; break; } prev = prev.previousElementSibling; } if (currentDeptBlockStart === lastClickedRow || !currentDeptBlockStart || currentDeptBlockStart.dataset.rowType !== 'department') currentDeptBlockStart = null; } if (currentDeptBlockStart) { calculatedInsertBeforeNode = currentDeptBlockStart.nextElementSibling; while (calculatedInsertBeforeNode && calculatedInsertBeforeNode.dataset.rowType !== 'department') calculatedInsertBeforeNode = calculatedInsertBeforeNode.nextElementSibling; } else calculatedInsertBeforeNode = costTableBody.firstChild; } else if (type === 'subdepartment') { if (refType === 'department') calculatedInsertBeforeNode = lastClickedRow.nextElementSibling; else if (refType === 'subdepartment') { calculatedInsertBeforeNode = lastClickedRow.nextElementSibling; while (calculatedInsertBeforeNode && calculatedInsertBeforeNode.dataset.rowType === 'task') calculatedInsertBeforeNode = calculatedInsertBeforeNode.nextElementSibling; } else if (refType === 'task') calculatedInsertBeforeNode = lastClickedRow.nextElementSibling; else calculatedInsertBeforeNode = lastClickedRow.nextElementSibling; } else if (type === 'task') { if(currentEstimateModel.isHierarchical && costTableBody.rows.length === 0 && !costTableBody.querySelector('tr[data-row-type="department"]')) calculatedInsertBeforeNode = costTableBody.firstChild; else calculatedInsertBeforeNode = lastClickedRow.nextElementSibling; } } costTableBody.insertBefore(insertIndicator, calculatedInsertBeforeNode);};

// ==========================================================================
// SEKCJA 6: LOGIKA ZAKŁADEK I NAWIGACJI
// ==========================================================================
const activateTab = (tabId) => { document.querySelectorAll('.tab').forEach(t => t.classList.remove('active')); document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active')); const tabButton = document.querySelector(`.tab[data-tab="${tabId}"]`); const tabContent = document.getElementById(tabId); if (tabButton && tabContent) { tabButton.classList.add('active'); tabContent.classList.add('active'); if (fixedActionButtons) fixedActionButtons.style.display = (tabId === 'kosztorys') ? 'flex' : 'none'; if (tabId === 'analiza' && typeof AnalysisModule !== 'undefined' && AnalysisModule.refreshAnalysis) AnalysisModule.refreshAnalysis(); if (tabId === 'ustawienia') { if (typeof displayEstimateVersions === 'function') displayEstimateVersions(); updateDynamicSpecialistRatesVisibility(); } if (tabId === 'katalogi-wlasne' && typeof refreshCatalogsUITab === 'function') refreshCatalogsUITab(); } else { const defaultTabButton = document.querySelector('.tab[data-tab="kosztorys"]'); const defaultTabContent = document.getElementById('kosztorys'); if(defaultTabButton) defaultTabButton.classList.add('active'); if(defaultTabContent) defaultTabContent.classList.add('active'); if (fixedActionButtons) fixedActionButtons.style.display = 'flex'; console.warn(`Nie znaleziono zakładki o ID: ${tabId}. Aktywowano domyślną.`); }};
const setupTabs = () => { document.querySelectorAll('.tab').forEach(tab => { tab.addEventListener('click', () => { activateTab(tab.dataset.tab); }); }); activateTab('kosztorys'); };

// ==========================================================================
// SEKCJA 7: FUNKCJE ZARZĄDZANIA KOSZTORYSEM (LICZBA SŁOWNIE, HISTORIA, STAWKI)
// ==========================================================================
const liczbaSlownie = (liczba) => {
    if(typeof liczba !== 'number' || isNaN(liczba)) return "nieprawidłowa liczba";

    const _j = ["", "jeden", "dwa", "trzy", "cztery", "pięć", "sześć", "siedem", "osiem", "dziewięć"];
    const _n = ["dziesięć", "jedenaście", "dwanaście", "trzynaście", "czternaście", "piętnaście", "szesnaście", "siedemnaście", "osiemnaście", "dziewiętnaście"];
    const _d = ["", "dziesięć", "dwadzieścia", "trzydzieści", "czterdzieści", "pięćdziesiąt", "sześćdziesiąt", "siedemdziesiąt", "osiemdziesiąt", "dziewięćdziesiąt"];
    const _s = ["", "sto", "dwieście", "trzysta", "czterysta", "pięćset", "sześćset", "siedemset", "osiemset", "dziewięćset"];
    const _g = [
        ["", "", ""],
        ["tysiąc", "tysiące", "tysięcy"],
        ["milion", "miliony", "milionów"],
        ["miliard", "miliardy", "miliardów"],
        ["bilion", "biliony", "bilionów"],
        ["biliard", "biliardy", "biliardów"],
        ["trylion", "tryliony", "trylionów"]
    ];

    liczba = Math.round(liczba * 100) / 100;
    const [zlI, grI] = String(liczba.toFixed(2)).split('.').map(Number);

    if (zlI === 0 && grI === 0) return "zero złotych zero groszy";

    let r = [];
    if (zlI !== 0) {
        let gg = 0;
        let l = zlI;
        while (l > 0) {
            let s = Math.floor((l % 1000) / 100);
            let d = Math.floor((l % 100) / 10);
            let j = Math.floor(l % 10);
            let k = l % 100;

            if (d === 1 && j > 0) d = 0; // Obsługa 10-19
            else k = 0; // Jeśli nie 10-19, to k nie jest używane dla dziesiątek

            let o = 2; // Domyślnie końcówka "ów"
            if (j === 1 && s === 0 && d === 0 && k === 0) o = 0; // "tysiąc", "milion"
            else if (j >= 2 && j <= 4 && !(k >= 12 && k <= 14)) o = 1; // "tysiące", "miliony"

            let c = [];
            if (s > 0) c.push(_s[s]);
            if (k > 0) c.push(_n[k % 10]);
            if (d > 0) c.push(_d[d]);
            if (j > 0 && k === 0) c.push(_j[j]);

            if (c.length > 0) {
                if (gg > 0) {
                    if (gg === 1 && o === 0 && c.length === 1 && c[0] === 'jeden') c = []; // "jeden tysiąc" -> "tysiąc"
                    c.push(_g[gg][o]);
                }
                r.unshift(c.join(" "));
            }
            l = Math.floor(l / 1000);
            gg++;
        }
    }

    let zlS = r.join(" ");
    let zlF;
    const ldZ = zlI % 10;
    const ld2Z = zlI % 100;
    if (zlI === 1) zlF = "złoty";
    else if (ldZ >= 2 && ldZ <= 4 && !(ld2Z >= 12 && ld2Z <= 14)) zlF = "złote";
    else zlF = "złotych";
    if (zlS === "") zlS = "zero";

    let grS = "";
    if (grI > 0) {
        let gj = grI % 10;
        let gd = Math.floor(grI / 10);
        let cg = [];
        if (gd > 0) cg.push(_d[gd]);
        if (gj > 0) cg.push(_j[gj]);
        grS = cg.join(" ");
    } else {
        grS = "zero";
    }

    let grF;
    const ldG = grI % 10;
    const ld2G = grI % 100;
    if (grI === 1) grF = "grosz";
    else if (ldG >= 2 && ldG <= 4 && !(ld2G >= 12 && ld2G <= 14)) grF = "grosze";
    else grF = "groszy";

    return `${zlS} ${zlF} ${grS} ${grF}`;
};

// PRZENIESIONE FUNKCJE HISTORII I STANU KOSZTORYSU
const updateUndoRedoButtons = () => { if (undoBtn) undoBtn.disabled = historyStack.length === 0; if (redoBtn) redoBtn.disabled = redoStack.length === 0; };

const getCurrentEstimateDisplayState = () => {
    // Zmieniono: Zwracamy głęboką kopię aktualnego modelu kosztorysu.
    // Model jest teraz jedynym źródłem prawdy dla stanu wyświetlania.
    return JSON.parse(JSON.stringify(currentEstimateModel));
};

const restoreEstimateDisplayState = async (state) => {
    if (!state || !state.rows) {
        console.warn("Próba odtworzenia stanu z nieprawidłowych danych:", state);
        return;
    }
    isRestoringState = true;
    try {
        // Ustawienie globalnego obiektu modelu
        currentEstimateModel.rows = state.rows ? JSON.parse(JSON.stringify(state.rows)) : [];
        currentEstimateModel.departmentColors = state.departmentColors ? JSON.parse(JSON.stringify(state.departmentColors)) : {};
        currentEstimateModel.isHierarchical = state.isHierarchical === undefined ? false : state.isHierarchical;

        // Zmieniono: Aktualizacja appState.isHierarchicalMode, aby pozostałe części UI były spójne
        appState.setState('isHierarchicalMode', currentEstimateModel.isHierarchical, true);

        // Wywołaj nową funkcję do renderowania całej tabeli na podstawie zaktualizowanego modelu
        if (typeof renderCostTable === 'function') {
            await renderCostTable(currentEstimateModel);
        } else {
            console.warn("renderCostTable nie jest jeszcze zdefiniowany. Częściowe odtworzenie stanu.");
            if (costTableBody) costTableBody.innerHTML = '';
        }

        // Poniższe wywołania pozostają (operują na DOM, ale ich celem nie jest samo renderowanie wierszy)
        if (typeof renumberRows === 'function') renumberRows();
        if (typeof recalculateAllRowsAndTotals === 'function') await recalculateAllRowsAndTotals();
        // USUNIĘTO: reapplyAllRowColors() - teraz jest częścią renderCostTable
        // USUNIĘTO: Pętla iterująca po rows i dodająca wiersze do DOM - zastąpiona przez renderCostTable

    } catch (error) {
        console.error("Błąd przywracania stanu wyświetlania kosztorysu:", error);
    } finally {
        isRestoringState = false;
        appState.saveState(); // Zapisz zaktualizowany appState
        // saveEstimateState() jest teraz wywoływane przez updateModelAndRender,
        // które z kolei jest wywoływane przez restoreEstimateDisplayState
        // (przez to, że setting isRestoringState = false i potem currentEstimateModel się 'zmienia')
        // Dzieje się tak, ponieważ currentEstimateModel zostaje zaktualizowany na początku restoreEstimateDisplayState,
        // a to powoduje, że updateModelAndRender zostanie wywołane po wyjściu z isRestoringState = true.
        // Jeśli nie chcemy, aby restoreEstimateDisplayState wywoływało saveEstimateState,
        // to updateModelAndRender powinno mieć dodatkową flagę `preventSaveHistory`.
        // Na razie zostawiamy, zakłada to, że wczytanie stanu powinno zapisać go jako najnowszy.
    }
};

const saveHistoryState = () => {
    if (isRestoringState) return;
    const currentState = getCurrentEstimateDisplayState(); // Pobiera z currentEstimateModel
    if (historyStack.length > 0) {
        const previousState = historyStack[historyStack.length - 1];
        if (JSON.stringify(previousState) === JSON.stringify(currentState)) return;
    }
    historyStack.push(currentState);
    if (historyStack.length > MAX_HISTORY_SIZE) historyStack.shift();
    redoStack = [];
    updateUndoRedoButtons();
};
const undo = async () => { if (historyStack.length > 0) { const currentState = getCurrentEstimateDisplayState(); redoStack.push(currentState); const previousState = historyStack.pop(); await restoreEstimateDisplayState(previousState); updateUndoRedoButtons(); }};
const redo = async () => { if (redoStack.length > 0) { const currentState = getCurrentEstimateDisplayState(); historyStack.push(currentState); if (historyStack.length > MAX_HISTORY_SIZE) historyStack.shift(); const nextState = redoStack.pop(); await restoreEstimateDisplayState(nextState); updateUndoRedoButtons(); }};


async function updateDynamicSpecialistRatesVisibility() {
    if (!specialistRatesContainer) return;
    specialistRatesContainer.innerHTML = '';
    const currentWorkerRatesSettings = appState.getState('workerRatesSettings');

    if (appState.getState('useSameRateForAllSpecialists')) {
        specialistRatesContainer.style.display = 'none';
        return;
    }
    const usedCategories = new Set();
    // Zmieniono: Iterujemy po currentEstimateModel.rows
    const allTaskRowsInModel = currentEstimateModel.rows.filter(r => r.rowType === 'task');
    const taskIdsToFetchDetails = new Set();
    const rowDetails = [];
    for (const rowObject of allTaskRowsInModel) { // Iterujemy po modelu
        const localCat = rowObject.localWorkerCategory;
        const catId = rowObject.taskCatalogId;
        rowDetails.push({ localCat, catId });
        if (!localCat && catId) taskIdsToFetchDetails.add(catId);
    }
    const taskDefinitions = {};
    if (taskIdsToFetchDetails.size > 0) {
        const tasksFromDb = await dbService.getItemsByIds(TASKS_CATALOG_STORE_NAME, Array.from(taskIdsToFetchDetails));
        tasksFromDb.forEach(taskDef => { if(taskDef) taskDefinitions[taskDef.id] = taskDef; });
    }
    for (const detail of rowDetails) {
        let workerCat = detail.localCat;
        if (!workerCat && detail.catId) {
            const taskDef = taskDefinitions[detail.catId];
            workerCat = taskDef?.workerCategory || 'ogolnobudowlany';
        } else if (!workerCat) workerCat = 'ogolnobudowlany';
        if (workerCat && workerCat !== 'ogolnobudowlany') usedCategories.add(workerCat);
    }

    let visibleSpecialists = 0;
    Object.keys(currentWorkerRatesSettings).forEach(catCode => {
        if (catCode === 'ogolnobudowlany') return;
        if (usedCategories.has(catCode)) {
            const category = currentWorkerRatesSettings[catCode];
            const formGroup = document.createElement('div');
            formGroup.classList.add('form-group');
            formGroup.innerHTML = `<label for="${category.inputId}">${category.name}:</label><input type="number" id="${category.inputId}" class="worker-rate-input specialist-rate-input" data-worker-category="${catCode}" min="0" step="0.01" placeholder="0.00">`;
            const inputEl = formGroup.querySelector('input');
            setNumericInputValue(inputEl, category.rate);
            inputEl.addEventListener('input', debounce(handleLaborRateChange, 300));
            inputEl.addEventListener('change', (e) => {
                setNumericInputValue(e.target, parseFloat(e.target.value.replace(',', '.')) || 0.00);
                if(!isRestoringState && typeof saveHistoryState === 'function') saveHistoryState();
            });
            specialistRatesContainer.appendChild(formGroup);
            visibleSpecialists++;
        }
    });
    specialistRatesContainer.style.display = (visibleSpecialists > 0) ? 'grid' : 'none';
}
async function handleLaborRateChange(event) {
    const input = event.target;
    const categoryCode = input.dataset.workerCategory;
    const newRate = parseFloat(input.value.replace(',', '.')) || 0.00;
    const currentRatesSettings = JSON.parse(JSON.stringify(appState.getState('workerRatesSettings')));

    if (currentRatesSettings[categoryCode]) {
        currentRatesSettings[categoryCode].rate = newRate;
        if (categoryCode === 'ogolnobudowlany' && appState.getState('useSameRateForAllSpecialists')) {
            Object.keys(currentRatesSettings).forEach(catCodeKey => {
                if (catCodeKey !== 'ogolnobudowlany') {
                    currentRatesSettings[catCodeKey].rate = newRate;
                }
            });
        }
    }
    appState.setState('workerRatesSettings', currentRatesSettings);
}
async function handleUseSameRateChange() {
    const newUseSameRate = useSameRateCheckbox.checked;
    appState.setState('useSameRateForAllSpecialists', newUseSameRate);
}

// ==========================================================================
// SEKCJA 7.1: ZARZĄDZANIE WERSJAMI KOSZTORYSU (IndexedDB)
// ==========================================================================
async function initDBEstimateVersions() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(ESTIMATE_VERSIONS_DB_NAME, ESTIMATE_VERSIONS_DB_VERSION);
        request.onerror = (event) => {
            console.error("Błąd otwierania IndexedDB (wersje):", event.target.error);
            showNotification("Błąd otwierania bazy danych dla wersji.", 'error');
            reject("Błąd otwierania bazy danych dla wersji.");
        };
        request.onsuccess = (event) => {
            dbEstimateVersions = event.target.result;
            console.log("Baza danych IndexedDB (wersje) otwarta pomyślnie.");
            resolve(dbEstimateVersions);
        };
        request.onupgradeneeded = (event) => {
            const dbInstance = event.target.result;
            if (event.oldVersion < ESTIMATE_VERSIONS_DB_VERSION) {
                if (!dbInstance.objectStoreNames.contains(VERSION_STORE_NAME)) {
                    const store = dbInstance.createObjectStore(VERSION_STORE_NAME, { keyPath: VERSION_STORE_SCHEMA.keyPath, autoIncrement: VERSION_STORE_SCHEMA.autoIncrement });
                     console.log(`Magazyn obiektów "${VERSION_STORE_NAME}" utworzony w IndexedDB (wersje).`);
                     VERSION_STORE_SCHEMA.indexes.forEach(idx => {
                        if (!store.indexNames.contains(idx.name)) {
                           store.createIndex(idx.name, idx.keyPath, idx.options);
                           console.log(`  Utworzono indeks "${idx.name}" dla magazynu "${VERSION_STORE_NAME}".`);
                        }
                    });
                } else {
                    const transaction = event.target.transaction;
                    const store = transaction.objectStore(VERSION_STORE_NAME);
                     VERSION_STORE_SCHEMA.indexes.forEach(idx => {
                        if (!store.indexNames.contains(idx.name)) {
                           store.createIndex(idx.name, idx.keyPath, idx.options);
                           console.log(`  Dodano nowy indeks "${idx.name}" do istniejącego magazynu "${VERSION_STORE_NAME}".`);
                        }
                    });
                }
            }
        };
    });
}

async function _internalSaveCurrentEstimateAsVersion(isAutoSave = false) {
    let versionName;
    if (isAutoSave) {
        versionName = `${AUTO_SAVE_PREFIX}${new Date().toLocaleString('pl-PL', {dateStyle: 'short', timeStyle: 'medium'})}`;
    } else {
        const currentEstimateTitle = appState.getState('estimateTitle') || 'Wersja';
        const versionBaseName = currentEstimateTitle ? `Wersja dla "${currentEstimateTitle}"` : 'Wersja kosztorysu';
        const defaultName = `${versionBaseName} z ${new Date().toLocaleString('pl-PL', {dateStyle: 'short', timeStyle: 'short'})}`;
        versionName = prompt("Podaj nazwę dla tej wersji kosztorysu (opcjonalnie):", defaultName);
        if (versionName === null) return null;
    }

    if (!dbEstimateVersions) {
        showNotification("Baza danych wersji nie jest gotowa. Spróbuj ponownie za chwilę.", 'error');
        return null;
    }

    const currentFullEstimateState = getCurrentEstimateDisplayState(); // Pobiera z currentEstimateModel
    const estimateDataForVersion = {
        rows: currentFullEstimateState.rows,
        departmentColors: currentFullEstimateState.departmentColors,
        estimateTitle: appState.getState('estimateTitle'),
        investmentLocation: appState.getState('investmentLocation'),
        investorInfo: appState.getState('investorInfo'),
        contractorInfo: appState.getState('contractorInfo'),
        vatRate: appState.getState('vatRate'),
        isHierarchicalMode: appState.getState('isHierarchicalMode'),
        useSameRateForAllSpecialists: appState.getState('useSameRateForAllSpecialists'),
        workerRatesSettings: appState.getState('workerRatesSettings'),
        userStyles: (typeof StyleConfiguratorModule !== 'undefined' && StyleConfiguratorModule.STORAGE_KEY_STYLES) ? JSON.parse(localStorage.getItem(StyleConfiguratorModule.STORAGE_KEY_STYLES) || '{}') : {}
    };

    const versionRecord = {
        name: versionName.trim() || `Wersja ${new Date().getTime()}`,
        timestamp: new Date().getTime(),
        estimateData: estimateDataForVersion,
        isAuto: isAutoSave
    };

    return new Promise((resolve, reject) => {
        const transaction = dbEstimateVersions.transaction([VERSION_STORE_NAME], "readwrite");
        const store = transaction.objectStore(VERSION_STORE_NAME);
        const addRequest = store.add(versionRecord);

        transaction.oncomplete = async () => {
            try {
                const countTrans = dbEstimateVersions.transaction([VERSION_STORE_NAME], "readonly");
                const countStore = countTrans.objectStore(VERSION_STORE_NAME);
                const allVersionsReq = countStore.getAll();

                allVersionsReq.onsuccess = async () => {
                    const allVersions = allVersionsReq.result;
                    if (allVersions.length > MAX_ESTIMATE_VERSIONS) {
                        allVersions.sort((a, b) => a.timestamp - b.timestamp);

                        let numToDelete = allVersions.length - MAX_ESTIMATE_VERSIONS;
                        const idsToDelete = [];

                        const autoVersions = allVersions.filter(v => v.isAuto);
                        for (const autoVersion of autoVersions) {
                            if (numToDelete <= 0) break;
                            idsToDelete.push(autoVersion.id);
                            numToDelete--;
                        }

                        if (numToDelete > 0) {
                             const manualVersions = allVersions.filter(v => !v.isAuto);
                             for (const manualVersion of manualVersions) {
                                if (numToDelete <= 0) break;
                                if (!idsToDelete.includes(manualVersion.id)) {
                                   idsToDelete.push(manualVersion.id);
                                   numToDelete--;
                                }
                             }
                        }

                        if (numToDelete > 0) {
                            for(const version of allVersions) {
                                if (numToDelete <= 0) break;
                                if (!idsToDelete.includes(version.id)) {
                                   idsToDelete.push(version.id);
                                   numToDelete--;
                                }
                            }
                        }

                        if (idsToDelete.length > 0) {
                            const deleteTransaction = dbEstimateVersions.transaction([VERSION_STORE_NAME], "readwrite");
                            const deleteStoreInstance = deleteTransaction.objectStore(VERSION_STORE_NAME);
                            idsToDelete.forEach(id => deleteStoreInstance.delete(id));
                            await new Promise(res => deleteTransaction.oncomplete = res);
                            console.log(`Usunięto ${idsToDelete.length} najstarszych wersji, aby zachować limit ${MAX_ESTIMATE_VERSIONS}.`);
                        }
                    }
                    if (typeof displayEstimateVersions === 'function') await displayEstimateVersions();
                    if (isAutoSave) {
                        showNotification("Kosztorys zapisany automatycznie.", 'info', 2500);
                    } else {
                        showNotification(`Wersja "${versionRecord.name}" została zapisana.`, 'success');
                    }
                    resolve(addRequest.result);
                };
                allVersionsReq.onerror = (e) => {
                    console.error("Błąd pobierania wszystkich wersji do ograniczenia liczby:", e.target.error);
                    reject(e.target.error);
                };

            } catch (err) {
                console.error("Błąd podczas ograniczania liczby wersji:", err);
                reject(err);
            }
        };
        addRequest.onerror = (event) => {
            console.error("Błąd zapisu wersji:", event.target.error);
            showNotification("Błąd zapisu wersji.", 'error');
            reject(event.target.error);
        };
        transaction.onerror = (event) => {
            console.error("Błąd transakcji zapisu wersji:", event.target.error);
            showNotification("Błąd transakcji zapisu wersji.", 'error');
            reject(event.target.error);
        };
    });
}

async function getAllEstimateVersionsFromDB() {
    if (!dbEstimateVersions) return [];
    return new Promise((resolve, reject) => {
        const transaction = dbEstimateVersions.transaction([VERSION_STORE_NAME], "readonly");
        const store = transaction.objectStore(VERSION_STORE_NAME);
        const getAllRequest = store.index("timestamp").getAll();
        getAllRequest.onsuccess = () => resolve(getAllRequest.result.reverse());
        getAllRequest.onerror = (event) => {
            console.error("Błąd odczytu wersji:", event.target.error);
            reject(event.target.error);
        };
    });
}

async function getEstimateVersionFromDB(versionId) {
    if (!dbEstimateVersions) return null;
    return new Promise((resolve, reject) => {
        const transaction = dbEstimateVersions.transaction([VERSION_STORE_NAME], "readonly");
        const store = transaction.objectStore(VERSION_STORE_NAME);
        const getRequest = store.get(versionId);
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = (event) => {
            console.error("Błąd wczytywania wersji z DB:", event.target.error);
            reject(event.target.error);
        };
    });
}

async function deleteEstimateVersionFromDB(versionId) {
    if (!dbEstimateVersions) return false;
    return new Promise((resolve, reject) => {
        const transaction = dbEstimateVersions.transaction([VERSION_STORE_NAME], "readwrite");
        const store = transaction.objectStore(VERSION_STORE_NAME);
        const deleteRequest = store.delete(versionId);
        deleteRequest.onsuccess = () => resolve(true);
        deleteRequest.onerror = (event) => {
            console.error("Błąd usuwania wersji:", event.target.error);
            reject(event.target.error);
        };
    });
}

async function loadEstimateFromVersionRecord(versionRecord) {
    if (!versionRecord || !versionRecord.estimateData) {
        showNotification("Nieprawidłowe dane wersji do wczytania.", 'error');
        return;
    }

    showConfirmNotification(`Wczytać wersję "${versionRecord.name}"?<br>Obecny kosztorys i jego ustawienia zostaną nadpisane.<br>Katalogi główne pozostaną bez zmian.`, async () => {
        if (typeof saveHistoryState === 'function' && !isRestoringState) saveHistoryState();
        isRestoringState = true;

        const estimateData = versionRecord.estimateData;

        // Zmieniono: Ustawiamy currentEstimateModel na podstawie wczytanych danych
        currentEstimateModel.rows = estimateData.rows ? JSON.parse(JSON.stringify(estimateData.rows)) : [];
        currentEstimateModel.departmentColors = estimateData.departmentColors ? JSON.parse(JSON.stringify(estimateData.departmentColors)) : {};
        currentEstimateModel.isHierarchical = estimateData.isHierarchicalMode === undefined ? false : estimateData.isHierarchicalMode;


        appState.setState('estimateTitle', estimateData.estimateTitle || '', true);
        appState.setState('investmentLocation', estimateData.investmentLocation || '', true);
        appState.setState('investorInfo', estimateData.investorInfo || '', true);
        appState.setState('contractorInfo', estimateData.contractorInfo || '', true);
        appState.setState('vatRate', estimateData.vatRate !== undefined ? estimateData.vatRate : '23', true);
        // isHierarchicalMode w appState jest teraz ustawiane przez updateModelAndRender, gdy currentEstimateModel.isHierarchical się zmienia
        // appState.setState('isHierarchicalMode', estimateData.isHierarchicalMode === undefined ? false : estimateData.isHierarchicalMode, true);
        appState.setState('useSameRateForAllSpecialists', estimateData.useSameRateForAllSpecialists === undefined ? true : estimateData.useSameRateForAllSpecialists, true);
        if (estimateData.workerRatesSettings) appState.setState('workerRatesSettings', estimateData.workerRatesSettings, true);
        else if (estimateData.laborRates) {
            const newRates = JSON.parse(JSON.stringify(appState.getState('workerRatesSettings') || DEFAULT_WORKER_RATES_SETTINGS));
            Object.keys(estimateData.laborRates).forEach(catCode => {
                if (newRates[catCode] && estimateData.laborRates[catCode].hasOwnProperty('rate')) newRates[catCode].rate = parseFloat(estimateData.laborRates[catCode].rate) || 0;
            });
            appState.setState('workerRatesSettings', newRates, true);
        }
        appState.saveState(); // Zapisuje zaktualizowany appState

        if (modalEstimateTitleInput) modalEstimateTitleInput.value = appState.getState('estimateTitle');
        const vatDisplay = document.getElementById('modal-vat-rate-display');
        if (vatDisplay) vatDisplay.value = appState.getState('currentVatDisplayValue');
        if (useSameRateCheckbox) useSameRateCheckbox.checked = appState.getState('useSameRateForAllSpecialists');
        const ogolnobudowlanyRateInput = document.getElementById('rate-labor-ogolnobudowlany');
        if (ogolnobudowlanyRateInput) setNumericInputValue(ogolnobudowlanyRateInput, appState.getState('workerRatesSettings').ogolnobudowlany?.rate || 0);
        // activateHierarchicalMode(appState.getState('isHierarchicalMode')); // Ta funkcja już jest wywoływana przez updateModelAndRender
        if (typeof StyleConfiguratorModule !== 'undefined' && StyleConfiguratorModule.applyUserStylesFromObject && estimateData.userStyles) {
            StyleConfiguratorModule.applyUserStylesFromObject(estimateData.userStyles);
        }

        // Zmieniono: Wywołujemy renderCostTable dla zaktualizowanego currentEstimateModel
        if (typeof renderCostTable === 'function') {
             await renderCostTable(currentEstimateModel);
        }

        if (typeof updateDynamicSpecialistRatesVisibility === 'function') await updateDynamicSpecialistRatesVisibility();
        isRestoringState = false;
        showNotification(`Wersja "${versionRecord.name}" kosztorysu została wczytana.`, 'info');
        if (typeof activateTab === 'function') activateTab('kosztorys');

        // Ponieważ isRestoringState zmienia się na false, a currentEstimateModel został zmieniony,
        // updateModelAndRender zostanie automatycznie wywołane, co spowoduje zapis historii i localStorage.
    });
}

// ==========================================================================
// SEKCJA 7.2: LOGIKA AUTOZAPISU
// ==========================================================================
async function performAutoSave() {
    if (!appState.getState('autoSaveEnabled') || isRestoringState) {
        console.log("Autozapis pominięty (wyłączony lub trwa przywracanie stanu).");
        return;
    }
    console.log("Rozpoczynam autozapis...");
    try {
        await _internalSaveCurrentEstimateAsVersion(true);
    } catch (error) {
        console.error("Błąd podczas autozapisu:", error);
        showNotification("Wystąpił błąd podczas automatycznego zapisu.", 'error');
    }
}

function startAutoSaveTimer() {
    stopAutoSaveTimer();
    if (appState.getState('autoSaveEnabled')) {
        const intervalMinutes = isUserIdle ? IDLE_AUTOSAVE_INTERVAL_MINUTES : parseInt(appState.getState('autoSaveIntervalMinutes'), 10);
        if (intervalMinutes > 0) {
            const status = isUserIdle ? "bezczynności" : "aktywności";
            console.log(`Autozapis (${status}) uruchomiony. Interwał: ${intervalMinutes} minut.`);
            autoSaveTimerId = setTimeout(async () => {
                await performAutoSave();
                startAutoSaveTimer(); // Zaplanuj następny, uwzględniając aktualny stan isUserIdle
            }, intervalMinutes * 60 * 1000);
        } else {
            console.log("Autozapis włączony, ale interwał ustawiony na 0 - timer nie uruchomiony.");
        }
    } else {
        console.log("Autozapis jest wyłączony.");
    }
}

function stopAutoSaveTimer() {
    if (autoSaveTimerId) {
        clearTimeout(autoSaveTimerId);
        autoSaveTimerId = null;
        console.log("Timer autozapisu zatrzymany.");
    }
}

function resetUserIdleTimer() {
    if (userIdleTimerId) {
        clearTimeout(userIdleTimerId);
    }
    if (isUserIdle) { // Jeśli użytkownik był bezczynny i teraz jest aktywny
        isUserIdle = false;
        console.log("Użytkownik ponownie aktywny. Przełączam na aktywny interwał autozapisu.");
        startAutoSaveTimer(); // Zrestartuj timer autozapisu z aktywnym interwałem
    }
    userIdleTimerId = setTimeout(() => {
        isUserIdle = true;
        console.log(`Użytkownik nieaktywny przez ${USER_IDLE_TIMEOUT_MS / 60000} min. Przełączam na bezczynny interwał autozapisu.`);
        startAutoSaveTimer(); // Zrestartuj timer autozapisu z bezczynnym interwałem
    }, USER_IDLE_TIMEOUT_MS);
}

function initUserActivityListeners() {
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(eventType => {
        document.addEventListener(eventType, resetUserIdleTimer, { passive: true });
    });
    resetUserIdleTimer(); // Uruchom licznik bezczynności od razu
}

function initAutoSaveSettingsControls() {
    autoSaveEnabledCheckbox = document.getElementById('auto-save-enabled-checkbox');
    autoSaveIntervalSelect = document.getElementById('auto-save-interval-select');
    autoSaveIntervalGroup = document.getElementById('auto-save-interval-group');

    if (!autoSaveEnabledCheckbox || !autoSaveIntervalSelect || !autoSaveIntervalGroup) {
        console.warn("Elementy UI autozapisu nie znalezione. Funkcjonalność autozapisu z UI nie będzie dostępna.");
        return;
    }

    autoSaveEnabledCheckbox.checked = appState.getState('autoSaveEnabled');
    autoSaveIntervalSelect.value = appState.getState('autoSaveIntervalMinutes').toString();
    autoSaveIntervalGroup.style.display = appState.getState('autoSaveEnabled') ? 'block' : 'none';

    autoSaveEnabledCheckbox.addEventListener('change', () => {
        const isEnabled = autoSaveEnabledCheckbox.checked;
        appState.setState('autoSaveEnabled', isEnabled);
        autoSaveIntervalGroup.style.display = isEnabled ? 'block' : 'none';
        if (isEnabled) {
            resetUserIdleTimer(); // Zresetuj stan bezczynności i uruchom odpowiedni timer
            startAutoSaveTimer();
        } else {
            stopAutoSaveTimer();
            if (userIdleTimerId) clearTimeout(userIdleTimerId); // Zatrzymaj też licznik bezczynności
        }
    });

    autoSaveIntervalSelect.addEventListener('change', () => {
        appState.setState('autoSaveIntervalMinutes', parseInt(autoSaveIntervalSelect.value, 10));
        if (appState.getState('autoSaveEnabled')) {
            isUserIdle = false; // Zakładamy, że zmiana ustawień to aktywność
            resetUserIdleTimer();
            startAutoSaveTimer();
        }
    });
}

// ==========================================================================
// SEKCJA 8: INICJALIZACJA I ZARZĄDZANIE STANEM KOSZTORYSU
// ==========================================================================
const populateCommonUnitsDatalist = () => { if(!commonUnitsDatalist) return; commonUnitsDatalist.innerHTML = ''; const units = ["m2", "m3", "mb", "szt.", "kpl.", "kg", "t", "l", "rg", "mg", "godz.", "pkt", "moduł", "obwód", "cykl", "puszka"]; units.forEach(unit => { const option = document.createElement('option'); option.value = unit; commonUnitsDatalist.appendChild(option); }); };
// renumberRows przeniesiono do script-estimate.js
const saveEstimateState = async () => {
    if (isRestoringState) return;
    // Zmieniono: Zapisujemy currentEstimateModel bezpośrednio
    saveToLocalStorage(STORAGE_KEYS.ESTIMATE_STATE, currentEstimateModel);
};
const loadEstimateState = async () => {
    const savedEstimateState = loadFromLocalStorage(STORAGE_KEYS.ESTIMATE_STATE);
    if (savedEstimateState && savedEstimateState.rows) {
        // Zmieniono: Wczytujemy do currentEstimateModel
        currentEstimateModel.rows = savedEstimateState.rows;
        currentEstimateModel.departmentColors = savedEstimateState.departmentColors || {};
        currentEstimateModel.isHierarchical = savedEstimateState.isHierarchical === undefined ? false : savedEstimateState.isHierarchical;

        // Zmieniono: Aktualizujemy appState, aby jego wartości były spójne z modelem i UI
        appState.setState('isHierarchicalMode', currentEstimateModel.isHierarchical, true);

        // Zmieniono: Wywołujemy renderCostTable, aby zaktualizować DOM na podstawie modelu
        if (typeof renderCostTable === 'function') {
            await renderCostTable(currentEstimateModel);
        } else {
            if (costTableBody) costTableBody.innerHTML = ''; // Wyczyść DOM jeśli renderCostTable nie jest dostępne
        }

        console.log("Wczytano stan kosztorysu (ESTIMATE_STATE), w tym departmentColors i isHierarchical.");
    } else {
        // Zmieniono: Jeśli brak zapisanego stanu, zainicjuj pusty model i domyślne ustawienia
        currentEstimateModel.rows = [];
        currentEstimateModel.departmentColors = {};
        currentEstimateModel.isHierarchical = false; // Domyślnie niehierarchiczny

        appState.setState('isHierarchicalMode', false, true); // Zaktualizuj appState

        if (currentEstimateModel.isHierarchical && typeof ensureFirstRowIsDepartmentIfNeeded === 'function') {
            ensureFirstRowIsDepartmentIfNeeded(false, true); // Ta funkcja zaktualizuje model
        }

        // Zmieniono: Wywołaj renderCostTable dla początkowego, pustego/domyślnego stanu
        if (typeof renderCostTable === 'function') {
            await renderCostTable(currentEstimateModel);
        } else {
            if (costTableBody) costTableBody.innerHTML = '';
        }

        if (typeof recalculateAllRowsAndTotals === 'function') {
            await recalculateAllRowsAndTotals();
        }
        console.log("Brak zapisanego stanu (ESTIMATE_STATE), zainicjalizowano domyślny.");
    }
    saveHistoryState(); // Przeniesione tutaj, aby było zdefiniowane i zawsze zapisywało stan początkowy
};


// ==========================================================================
// SEKCJA 9: NIESTANDARDOWE MENU KONTEKSTOWE
// ==========================================================================
const showCustomContextMenu = (event) => {
    event.preventDefault();
    if (!customContextMenu) return;

    const targetRow = event.target.closest('tr');
    contextMenuTargetRow = (targetRow && costTableBody && costTableBody.contains(targetRow) && targetRow.id !== INDICATOR_ROW_ID) ? targetRow : null;
    const isRowSelected = !!contextMenuTargetRow;

    customContextMenu.querySelector('[data-action="edit"]').classList.toggle('disabled', !isRowSelected);
    customContextMenu.querySelector('[data-action="edit-notes"]').classList.toggle('disabled', !isRowSelected);
    customContextMenu.querySelector('[data-action="delete"]').classList.toggle('disabled', !isRowSelected);

    customContextMenu.style.top = `-9999px`;
    customContextMenu.style.left = `-9999px`;
    customContextMenu.style.display = 'block';

    const menuWidth = customContextMenu.offsetWidth;
    const menuHeight = customContextMenu.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let topPosition = event.clientY;
    let leftPosition = event.clientX;

    if (topPosition + menuHeight > windowHeight) {
        topPosition = windowHeight - menuHeight - 5;
        if (topPosition < 0) topPosition = 5;
    }
    if (leftPosition + menuWidth > windowWidth) {
        leftPosition = windowWidth - menuWidth - 5;
        if (leftPosition < 0) leftPosition = 5;
    }
    if (topPosition < 0) topPosition = 5;
    if (leftPosition < 0) leftPosition = 5;

    customContextMenu.style.top = `${topPosition}px`;
    customContextMenu.style.left = `${leftPosition}px`;
};
const hideCustomContextMenu = () => {
    if (customContextMenu) customContextMenu.style.display = 'none';
    contextMenuTargetRow = null;
};
const handleContextMenuAction = async (event) => {
    if (!event.target.matches('#custom-context-menu li') || event.target.classList.contains('disabled')) return;
    const action = event.target.dataset.action;
    hideCustomContextMenu();
    const targetDomRow = contextMenuTargetRow || lastClickedRow; // Element DOM wiersza

    switch (action) {
        case 'edit':
            if (targetDomRow) {
                if (targetDomRow.dataset.rowType === 'task' && typeof handleEditEstimateRow === 'function') await handleEditEstimateRow(targetDomRow);
                else if (targetDomRow.dataset.rowType === 'department' || targetDomRow.dataset.rowType === 'subdepartment') {
                    const inputField = targetDomRow.querySelector('.special-row-input');
                    if (inputField) inputField.focus();
                }
            }
            break;
        case 'edit-notes':
            // Zmieniono: openNotesModal przyjmuje ID wiersza, a nie DOM element
            if (targetDomRow && typeof openNotesModal === 'function') openNotesModal(targetDomRow.dataset.rowId);
            break;
        case 'delete':
            // Użyj targetDomRow do znalezienia odpowiedniego obiektu w modelu
            if (!targetDomRow || !costTableBody || !costTableBody.contains(targetDomRow)) {
                console.warn("handleContextMenuAction: Brak docelowego wiersza do usunięcia.");
                return;
            }
            const targetRowId = targetDomRow.dataset.rowId;
            const targetRowType = targetDomRow.dataset.rowType;

            let confirmText = "Czy na pewno chcesz usunąć ten wiersz?";
            if (targetRowType === 'department') confirmText = "Czy na pewno chcesz usunąć ten DZIAŁ i wszystkie jego poddziały oraz pozycje?";
            else if (targetRowType === 'subdepartment') confirmText = "Czy na pewno chcesz usunąć ten PODDZIAŁ i wszystkie jego pozycje?";

            showConfirmNotification(confirmText, async () => {
                // Zapisz stan przed usunięciem (dla undo)
                if(!isRestoringState && typeof saveHistoryState === 'function') saveHistoryState();

                // Znajdź indeks wiersza w modelu
                const rowIndexToDelete = currentEstimateModel.rows.findIndex(r => r.rowId === targetRowId);
                if (rowIndexToDelete === -1) {
                    console.error("handleContextMenuAction: Nie znaleziono wiersza w modelu do usunięcia.");
                    showNotification("Błąd: Nie udało się usunąć wiersza z modelu.", 'error');
                    return;
                }

                let updatedRows = [...currentEstimateModel.rows];
                let deletedRowIds = [targetRowId]; // Śledź usunięte ID

                if (targetRowType === 'department') {
                    // Usuń dział i wszystkie jego dzieci z modelu
                    const newRowsAfterDeletion = [];
                    let inDeletionBlock = false;
                    for (let i = 0; i < updatedRows.length; i++) {
                        const row = updatedRows[i];
                        if (row.rowId === targetRowId) {
                            inDeletionBlock = true; // Rozpocznij blok usuwania
                            // Ten wiersz zostanie pominięty
                        } else if (inDeletionBlock && row.rowType === 'department') {
                            inDeletionBlock = false; // Zakończ blok usuwania, jeśli natrafisz na nowy dział
                            newRowsAfterDeletion.push(row);
                        } else if (inDeletionBlock) {
                            // Ten wiersz zostanie pominięty
                            deletedRowIds.push(row.rowId);
                        } else {
                            newRowsAfterDeletion.push(row); // Dodaj wiersz do nowej listy
                        }
                    }
                    updatedRows = newRowsAfterDeletion;

                } else if (targetRowType === 'subdepartment') {
                    // Usuń poddział i wszystkie jego zadania (do następnego poddziału/działu) z modelu
                    const newRowsAfterDeletion = [];
                    let inDeletionBlock = false;
                    for (let i = 0; i < updatedRows.length; i++) {
                        const row = updatedRows[i];
                        if (row.rowId === targetRowId) {
                            inDeletionBlock = true;
                        } else if (inDeletionBlock && (row.rowType === 'subdepartment' || row.rowType === 'department')) {
                            inDeletionBlock = false;
                            newRowsAfterDeletion.push(row);
                        } else if (inDeletionBlock) {
                            deletedRowIds.push(row.rowId);
                        } else {
                            newRowsAfterDeletion.push(row);
                        }
                    }
                    updatedRows = newRowsAfterDeletion;
                } else { // Typ 'task'
                    updatedRows.splice(rowIndexToDelete, 1); // Usuń tylko ten wiersz
                }

                // Usuń kolory z modelu dla usuniętych wierszy
                const updatedDepartmentColors = { ...currentEstimateModel.departmentColors };
                deletedRowIds.forEach(id => {
                    if (updatedDepartmentColors[id]) {
                        delete updatedDepartmentColors[id];
                    }
                });

                // Zaktualizuj model i wyrenderuj tabelę
                await updateModelAndRender({
                    rows: updatedRows,
                    departmentColors: updatedDepartmentColors
                });

                // Zaktualizuj lastClickedRow po usunięciu
                if (lastClickedRow === targetDomRow) {
                    // Próba ustawienia lastClickedRow na poprzedni lub następny wiersz DOM
                    let newLastClickedRow = targetDomRow.previousElementSibling || targetDomRow.nextElementSibling;
                    // Jeśli nowy lastClickedRow jest wskaźnikiem insertIndicator, przesuń dalej
                    const indicatorId = typeof INDICATOR_ROW_ID !== 'undefined' ? INDICATOR_ROW_ID : 'temp-insert-indicator';
                    if (newLastClickedRow && newLastClickedRow.id === indicatorId) {
                        newLastClickedRow = newLastClickedRow.previousElementSibling || newLastClickedRow.nextElementSibling;
                    }
                    if (lastClickedRow) lastClickedRow.classList.remove('last-clicked-row-highlight'); // Usuń podświetlenie z starego
                    lastClickedRow = newLastClickedRow;
                    if (lastClickedRow) lastClickedRow.classList.add('last-clicked-row-highlight');
                }
                // lastClickedRow i saveDepartmentTemplateBtn są obsługiwane przez renderCostTable
                // i event listener 'click' na wierszach

                showNotification("Wiersz(e) usunięte.", "success");
            });
            break;
        case 'save-version': if (typeof _internalSaveCurrentEstimateAsVersion === 'function') await _internalSaveCurrentEstimateAsVersion(false); break;
        case 'save-estimate': if (typeof saveEstimateToFile === 'function') await saveEstimateToFile(); break;
        case 'go-to-settings': activateTab('ustawienia'); break;
        case 'print': if (typeof openPrintSelectionModal === 'function') openPrintSelectionModal(); break;
    }
};
// ==========================================================================
// SEKCIA 10: GŁÓWNA INICJALIZACJA APLIKACJI (initApp)
// ==========================================================================
async function initApp() {
    console.log(`%cInicjalizacja ${APP_VERSION}...`, "color: blue; font-weight: bold;");
    console.log("DEBUG: initApp - Start."); // <-- DODANO

    try { // <-- TUTAJ ZACZYNA SIĘ BLOK TRY DLA CAŁEJ FUNKCJI
        console.log("DEBUG: initApp - Wewnątrz bloku try."); // <-- DODANO

        costTableBody = document.getElementById('cost-table-body'); if (!costTableBody) throw new Error("Krytyczny błąd: Element 'cost-table-body' nie został znaleziony w DOM.");
        grandTotalElement = document.getElementById('grand-total'); if (!grandTotalElement) throw new Error("Krytyczny błąd: Element 'grand-total' nie został znaleziony w DOM.");
        notificationsContainer = document.getElementById('notifications-container'); if (!notificationsContainer) console.warn("Element 'notifications-container' nie znaleziony. Powiadomienia będą używać alert().");
        addRowBtn = document.getElementById('add-row-btn'); addDepartmentBtn = document.getElementById('add-department-btn'); addSubDepartmentBtn = document.getElementById('add-subdepartment-btn'); clearAllBtn = document.getElementById('clear-all-btn'); saveEstimateVersionBtn = document.getElementById('save-estimate-version-btn'); previewEstimateDetailBtn = document.getElementById('preview-estimate-detail-btn'); materialSummaryBody = document.getElementById('material-summary-body'); materialGrandTotalElement = document.getElementById('material-grand-total'); materialProfitGrandTotalElement = document.getElementById('material-profit-grand-total'); materialSummaryTable = document.getElementById('material-summary-table'); customTaskModal = document.getElementById('custom-task-modal'); if (!customTaskModal) throw new Error("Krytyczny błąd: Modal 'custom-task-modal' nie znaleziony."); closeModalBtn = customTaskModal.querySelector('.close-modal-btn[data-modal-id="custom-task-modal"]'); saveModalBtn = document.getElementById('save-custom-task-btn'); cancelCustomTaskBtn = document.getElementById('cancel-custom-task-btn'); addMaterialNormBtn = document.getElementById('add-material-norm-btn'); customTaskMaterialsList = document.getElementById('custom-task-materials-list'); modalTitle = customTaskModal.querySelector('h2'); originalModalTitle = modalTitle ? modalTitle.textContent : "Zdefiniuj/Edytuj Pozycję Katalogową"; modalDescInput = document.getElementById('custom-task-desc'); modalUnitInput = document.getElementById('custom-task-unit'); modalNormRInput = document.getElementById('custom-task-norm-r'); modalWorkerCategorySelect = document.getElementById('custom-task-worker-category'); modalMaterialsSection = customTaskModal.querySelector('#modal-materials-section'); modalQuantityDiv = document.createElement('div'); modalQuantityDiv.classList.add('form-group'); modalQuantityDiv.innerHTML = `<label for="modal-task-quantity">Obmiar dla tej pozycji:</label><input type="text" id="modal-task-quantity" value="1,000">`; modalQuantityInput = modalQuantityDiv.querySelector('#modal-task-quantity'); materialSelectModal = document.getElementById('material-select-modal'); if (!materialSelectModal) throw new Error("Krytyczny błąd: Modal 'material-select-modal' nie znaleziony."); closeMaterialModalBtn = materialSelectModal.querySelector('.close-modal-btn[data-modal-id="material-select-modal"]'); materialSearchInput = document.getElementById('material-search-input'); materialSelectList = document.getElementById('material-select-list'); materialSelectNoResults = document.getElementById('material-select-no-results'); newMaterialNameInput = document.getElementById('new-material-name-input'); newMaterialUnitInput = document.getElementById('new-material-unit-input'); newMaterialCategoryInput = document.getElementById('new-material-category-input'); addNewMaterialBtn = document.getElementById('add-new-material-btn'); cancelMaterialSelectBtn = document.getElementById('cancel-material-select-btn'); csvFileInput = document.getElementById('csv-file-input'); loadCsvButton = document.getElementById('load-csv-button'); saveEstimateBtn = document.getElementById('save-estimate-btn'); loadEstimateBtn = document.getElementById('load-estimate-btn'); loadEstimateFileInput = document.getElementById('load-estimate-file-input'); commonUnitsDatalist = document.getElementById('commonUnitsData'); undoBtn = document.getElementById('undo-btn'); redoBtn = document.getElementById('redo-btn'); fixedActionButtons = document.getElementById('fixed-action-buttons'); scrollToTopBtn = document.getElementById('scroll-to-top-btn'); useSameRateCheckbox = document.getElementById('use-same-rate-for-all'); specialistRatesContainer = document.getElementById('specialist-rates-container'); openPrintSelectionBtn = document.getElementById('open-print-selection-btn'); printSelectionModal = document.getElementById('print-selection-modal'); if (!printSelectionModal) throw new Error("Krytyczny błąd: Modal 'print-selection-modal' nie znaleziony."); closePrintSelectionModalBtn = printSelectionModal.querySelector('.close-modal-btn[data-modal-id="print-selection-modal"]'); generateSelectedPrintsBtn = document.getElementById('generate-selected-prints-btn'); cancelPrintSelectionBtn = document.getElementById('cancel-print-selection-btn'); printOptionsContainer = document.getElementById('print-options-container'); toggleStyleConfiguratorBtn = document.getElementById('toggle-style-configurator-btn'); konfiguratorStyluContent = document.getElementById('konfigurator-stylu-content'); editEstimateDetailsBtn = document.getElementById('edit-estimate-details-btn'); estimateDetailsModal = document.getElementById('edit-estimate-details-modal'); if (!estimateDetailsModal) throw new Error("Krytyczny błąd: Modal 'edit-estimate-details-modal' nie znaleziony."); saveEstimateDetailsModalBtn = document.getElementById('save-estimate-details-modal-btn'); cancelEstimateDetailsModalBtn = document.getElementById('cancel-estimate-details-modal-btn'); modalEstimateTitleInput = document.getElementById('modal-estimate-title'); modalInvestmentLocationInput = document.getElementById('modal-investment-location'); modalInvestorInfoInput = document.getElementById('modal-investor-info'); modalContractorInfoInput = document.getElementById('modal-contractor-info'); modalVatRateSelect = document.getElementById('modal-vat-rate'); estimateVersionsSelect = document.getElementById('estimate-versions-select'); loadSelectedVersionBtn = document.getElementById('load-selected-version-btn'); deleteSelectedVersionBtn = document.getElementById('delete-selected-version-btn'); customContextMenu = document.getElementById('custom-context-menu'); saveDepartmentTemplateBtn = document.getElementById('save-department-as-template-btn'); saveEstimateTemplateBtn = document.getElementById('save-estimate-as-template-btn'); openTemplatesModalBtn = document.getElementById('open-templates-modal-btn'); templatesModal = document.getElementById('templates-modal'); if(!templatesModal) throw new Error("Krytyczny błąd: Modal 'templates-modal' nie znaleziony."); closeTemplatesModalBtn = document.getElementById('close-templates-modal-btn'); templateSelect = document.getElementById('template-select'); insertTemplateBtn = document.getElementById('insert-template-btn'); deleteTemplateBtn = document.getElementById('delete-template-btn'); branchSelectDropdown = document.getElementById('global-branch-filter');
        tasksCatalogSearch = document.getElementById('tasks-catalog-search'); tasksCatalogListContainer = document.getElementById('tasks-catalog-list-container'); addNewTaskToCatalogBtn = document.getElementById('add-new-task-to-catalog-btn');
        materialsCatalogSearch = document.getElementById('materials-catalog-search'); materialsCatalogListContainer = document.getElementById('materials-catalog-list-container'); addNewMaterialToCatalogBtn = document.getElementById('add-new-material-to-catalog-btn'); notesModal = document.getElementById('notes-modal'); if (!notesModal) throw new Error("Krytyczny błąd: Modal 'notes-modal' nie znaleziony."); notesModalTextarea = document.getElementById('notes-modal-textarea'); notesModalItemDesc = document.getElementById('notes-modal-item-desc'); saveNotesModalBtn = document.getElementById('save-notes-modal-btn'); cancelNotesModalBtn = document.getElementById('cancel-notes-modal-btn'); closeNotesModalXBtn = notesModal.querySelector('.close-modal-btn[data-modal-id="notes-modal"]');
        confirmNotificationModal = document.getElementById('confirm-notification-modal');
        if (confirmNotificationModal) {
            confirmNotificationTitle = document.getElementById('confirm-notification-title');
            confirmNotificationMessage = document.getElementById('confirm-notification-message');
            confirmNotificationOkBtn = document.getElementById('confirm-notification-ok-btn');
            confirmNotificationCancelBtn = document.getElementById('confirm-notification-cancel-btn');
            confirmNotificationCloseBtnX = confirmNotificationModal.querySelector('.close-modal-btn[data-modal-id="confirm-notification-modal"]');

            if(confirmNotificationOkBtn) confirmNotificationOkBtn.addEventListener('click', () => { if (currentConfirmCallback) currentConfirmCallback(); closeConfirmNotificationModal(); });
            if(confirmNotificationCancelBtn) confirmNotificationCancelBtn.addEventListener('click', () => { if (currentCancelCallback) currentCancelCallback(); closeConfirmNotificationModal(); });
            if(confirmNotificationCloseBtnX) confirmNotificationCloseBtnX.addEventListener('click', () => { if (currentCancelCallback) currentCancelCallback(); closeConfirmNotificationModal(); });
        } else {
            console.warn("Modal potwierdzenia ('confirm-notification-modal') nie znaleziony.");
        }
        console.log("Wszystkie elementy DOM przypisane.");

        console.log("DEBUG: initApp - Przed fillBranchSelectors."); // <-- DODANO
        const fillBranchSelectors = () => { const selectors = [branchSelectDropdown, document.getElementById('modal-task-branch-select')]; if (typeof BRANCHES === 'undefined') { console.error("Zmienna BRANCHES nie jest zdefiniowana!"); return; } selectors.forEach(selector => { if (selector) { const firstOptionValue = selector.options[0]?.value; const firstOptionText = selector.options[0]?.textContent; selector.innerHTML = ''; if (firstOptionValue === "" && firstOptionText) { const defaultOpt = document.createElement('option'); defaultOpt.value = ""; defaultOpt.textContent = firstOptionText; selector.appendChild(defaultOpt); } for (const branchKey in BRANCHES) { const option = document.createElement('option'); option.value = BRANCHES[branchKey].code; option.textContent = BRANCHES[branchKey].name; selector.appendChild(option); } } }); }; fillBranchSelectors();
        console.log("DEBUG: initApp - Po fillBranchSelectors."); // <-- DODANO

        if (modalWorkerCategorySelect) {
            modalWorkerCategorySelect.innerHTML = '';
            const currentWorkerRates = appState.getState('workerRatesSettings');
            for (const catCode in currentWorkerRates) {
                const option = document.createElement('option');
                option.value = catCode; option.textContent = currentWorkerRates[catCode].name;
                modalWorkerCategorySelect.appendChild(option);
            }
        } else console.warn("Selektor modalWorkerCategorySelect nie znaleziony.");

        if(modalEstimateTitleInput) modalEstimateTitleInput.value = appState.getState('estimateTitle');
        if(modalInvestmentLocationInput) modalInvestmentLocationInput.value = appState.getState('investmentLocation');
        if(modalInvestorInfoInput) modalInvestorInfoInput.value = appState.getState('investorInfo');
        if(modalContractorInfoInput) modalContractorInfoInput.value = appState.getState('contractorInfo');
        if(modalVatRateSelect) modalVatRateSelect.value = appState.getState('vatRate');
        const vatDisplay = document.getElementById('modal-vat-rate-display');
        if(vatDisplay) vatDisplay.value = appState.getState('currentVatDisplayValue');

        if(useSameRateCheckbox) useSameRateCheckbox.checked = appState.getState('useSameRateForAllSpecialists');
        const ogolnobudowlanyRateInput = document.getElementById('rate-labor-ogolnobudowlany');
        if (ogolnobudowlanyRateInput) {
             const ratesSettings = appState.getState('workerRatesSettings');
             setNumericInputValue(ogolnobudowlanyRateInput, ratesSettings.ogolnobudowlany?.rate || 0);
             ogolnobudowlanyRateInput.addEventListener('input', debounce(handleLaborRateChange, 300));
             ogolnobudowlanyRateInput.addEventListener('change', (e) => {
                setNumericInputValue(e.target, parseFloat(e.target.value.replace(',', '.')) || 0.00);
                if(!isRestoringState && typeof saveHistoryState === 'function') saveHistoryState();
            });
        }
        await updateDynamicSpecialistRatesVisibility();
        if(useSameRateCheckbox) useSameRateCheckbox.addEventListener('change', handleUseSameRateChange);

        if (branchSelectDropdown) {
            branchSelectDropdown.value = appState.getState('lastBranchFilter') || "";
            branchSelectDropdown.addEventListener('change', (e) => {
                appState.setState('lastBranchFilter', e.target.value);
            });
        }

        appState.subscribe('estimateTitle', (newTitle) => { document.title = `${newTitle} - ${APP_VERSION}`; if (modalEstimateTitleInput && document.getElementById('edit-estimate-details-modal')?.style.display === 'block') modalEstimateTitleInput.value = newTitle; });
        appState.subscribe('vatRate', async (newVatSetting) => { if (isRestoringState) return; const vatDisplayEl = document.getElementById('modal-vat-rate-display'); if (vatDisplayEl) vatDisplayEl.value = appState.getState('currentVatDisplayValue'); if (modalVatRateSelect && document.getElementById('edit-estimate-details-modal')?.style.display === 'block') modalVatRateSelect.value = newVatSetting; if (typeof recalculateAllRowsAndTotals === 'function') await recalculateAllRowsAndTotals(); if (typeof saveHistoryState === 'function' && !isRestoringState) saveHistoryState(); });
        appState.subscribe('useSameRateForAllSpecialists', async (newValue, oldValue) => { if (isRestoringState || newValue === oldValue) return; await updateDynamicSpecialistRatesVisibility(); if (newValue) { const rates = appState.getState('workerRatesSettings'); const ogolnobudowlanyRate = rates.ogolnobudowlany?.rate || 0; const newRatesSettings = JSON.parse(JSON.stringify(rates)); Object.keys(newRatesSettings).forEach(cat => { if (cat !== 'ogolnobudowlany') newRatesSettings[cat].rate = ogolnobudowlanyRate; }); appState.setState('workerRatesSettings', newRatesSettings); } else { appState.notify('workerRatesSettingsChangedByToggle');} });
        appState.subscribe('workerRatesSettings', async (newRates, oldRates) => { if (isRestoringState) return; if (JSON.stringify(newRates) === JSON.stringify(oldRates) && !appState.getState('useSameRateForAllSpecialists')) return; await updateDynamicSpecialistRatesVisibility(); if (typeof recalculateAllRowsAndTotals === 'function') await recalculateAllRowsAndTotals(); if (typeof saveHistoryState === 'function' && !isRestoringState) saveHistoryState(); });
        appState.subscribe('workerRatesSettingsChangedByToggle', async () => { if (isRestoringState) return; await updateDynamicSpecialistRatesVisibility(); });
        appState.subscribe('isHierarchicalMode', async (newValue, oldValue) => {
            // Zmieniono: Ta subskrypcja jest wywoływana przez appState.setState('isHierarchicalMode')
            // co jest ustawiane przez updateModelAndRender, gdy currentEstimateModel.isHierarchical się zmienia.
            // Tutaj tylko reagujemy na zmianę flagi w appState (dla UI poza tabelą)
            if (isRestoringState || newValue === oldValue) return;
            document.body.classList.toggle('hierarchical-mode-active', newValue);
            if(addDepartmentBtn) addDepartmentBtn.style.display = newValue ? 'inline-block' : 'none';
            if(addSubDepartmentBtn) addSubDepartmentBtn.style.display = newValue ? 'inline-block' : 'none';
            if(saveDepartmentTemplateBtn) { saveDepartmentTemplateBtn.style.display = newValue ? 'inline-block' : 'none'; if(!newValue) saveDepartmentTemplateBtn.disabled = true; }
            if (newValue && typeof ensureFirstRowIsDepartmentIfNeeded === 'function') ensureFirstRowIsDepartmentIfNeeded(false, true); // Ta funkcja już aktualizuje model
            // Poniższe są już wywoływane przez updateModelAndRender:
            // if(typeof renumberRows === 'function') renumberRows();
            // if(typeof recalculateAllRowsAndTotals === 'function') await recalculateAllRowsAndTotals();
            // if(typeof saveEstimateState === 'function' && !isRestoringState) saveEstimateState();
            // if(typeof saveHistoryState === 'function' && !isRestoringState) saveHistoryState();
            // if(typeof reapplyAllRowColors === 'function') reapplyAllRowColors();
        });
        appState.subscribe('estimateDataPotentiallyChanged', async () => {
            // Zmieniono: Ta subskrypcja jest wywoływana przez updateModelAndRender,
            // więc jej działanie (recalculate, save) jest już pokryte.
            // Można ją usunąć lub zostawić na wypadek, gdyby inne moduły potrzebowały tego sygnału
            // i nie wywoływały updateModelAndRender bezpośrednio.
            if (isRestoringState) return;
            // if (typeof recalculateAllRowsAndTotals === 'function') await recalculateAllRowsAndTotals();
            // if (typeof saveEstimateState === 'function' && !isRestoringState) saveEstimateState();
        });
        appState.subscribe('estimateRowsStructureChanged', () => {
            // Zmieniono: Ta subskrypcja jest wywoływana przez updateModelAndRender,
            // jej działanie jest już pokryte.
            if (isRestoringState) return;
            // if (typeof renumberRows === 'function') renumberRows();
            // if (typeof reapplyAllRowColors === 'function') reapplyAllRowColors();
        });
        appState.subscribe('taskCatalogChanged', async () => { if (isRestoringState) return; if (typeof refreshCatalogsUITab === 'function' && document.getElementById('katalogi-wlasne')?.classList.contains('active')) await refreshCatalogsUITab(); if (typeof recalculateAllRowsAndTotals === 'function') await recalculateAllRowsAndTotals(); });
        appState.subscribe('materialCatalogChanged', async () => { if (isRestoringState) return; if (typeof refreshCatalogsUITab === 'function' && document.getElementById('katalogi-wlasne')?.classList.contains('active')) await refreshCatalogsUITab(); if (typeof calculateMaterialSummary === 'function' && document.getElementById('materialy')?.classList.contains('active')) await calculateMaterialSummary(); if (typeof recalculateAllRowsAndTotals === 'function') await recalculateAllRowsAndTotals(); });
        appState.subscribe('materialPricesImported', async () => { if (isRestoringState) return; if (typeof recalculateAllRowsAndTotals === 'function') await recalculateAllRowsAndTotals(); if (typeof saveHistoryState === 'function' && !isRestoringState) saveHistoryState(); });
        appState.subscribe('estimateDataLoaded', async () => {
            // Zmieniono: Ta subskrypcja jest wywoływana przez loadFullState,
            // a ta funkcja już wywołuje updateModelAndRender, co pokrywa poniższe.
            if (isRestoringState) return;
            // if (typeof recalculateAllRowsAndTotals === 'function') await recalculateAllRowsAndTotals();
            // if (typeof updateDynamicSpecialistRatesVisibility === 'function') await updateDynamicSpecialistRatesVisibility();
            // if (typeof reapplyAllRowColors === 'function') reapplyAllRowColors();
        });
        appState.subscribe('defaultTaskRowBackgroundColor', () => {
            // Zmieniono: To jest teraz obsługiwane przez renderCostTable, która pobiera kolor z appState
            if (!isRestoringState && typeof renderCostTable === 'function') {
                renderCostTable(currentEstimateModel);
            }
        });


        populateCommonUnitsDatalist(); setupTabs();
        await loadEstimateState(); // Zmieniono: Ta funkcja ładuje dane do modelu i wywołuje renderCostTable
        console.log("Stan kosztorysu wczytany.");

        if (typeof AnalysisModule !== 'undefined' && AnalysisModule.init) { AnalysisModule.init(); console.log("Moduł Analizy zainicjalizowany."); } else console.warn("AnalysisModule nie został znaleziony.");
        if (typeof StyleConfiguratorModule !== 'undefined' && StyleConfiguratorModule.init) { try { StyleConfiguratorModule.init(); console.log("Moduł Konfiguratora Stylu zainicjalizowany."); } catch (styleError) { console.warn("Błąd podczas inicjalizacji StyleConfiguratorModule z initApp:", styleError); } } else console.warn("StyleConfiguratorModule nie jest dostępny.");
        if (toggleStyleConfiguratorBtn && konfiguratorStyluContent) { toggleStyleConfiguratorBtn.addEventListener('click', () => { const isVisible = konfiguratorStyluContent.style.display === 'block'; konfiguratorStyluContent.style.display = isVisible ? 'none' : 'block'; toggleStyleConfiguratorBtn.textContent = isVisible ? 'Pokaż Konfigurator Wyglądu' : 'Ukryj Konfigurator Wyglądu'; }); }
        if(undoBtn) undoBtn.addEventListener('click', undo); if(redoBtn) redoBtn.addEventListener('click', redo);
        if (scrollToTopBtn) { scrollToTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); }); }
        document.addEventListener('keydown', (e) => { if (e.ctrlKey || e.metaKey) { if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); if(undoBtn && !undoBtn.disabled) undo(); } else if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); if(redoBtn && !redoBtn.disabled) redo(); } } });
        if (customContextMenu) { document.addEventListener('contextmenu', showCustomContextMenu); customContextMenu.addEventListener('click', handleContextMenuAction); }
        document.addEventListener('click', (event) => { if (customContextMenu && customContextMenu.style.display === 'block' && !customContextMenu.contains(event.target)) hideCustomContextMenu(); if (activeDropdown && activeSearchInput && !activeSearchInput.contains(event.target) && !activeDropdown.contains(event.target) && !event.target.closest('.suggestions-dropdown')) if(typeof hideAllDropdowns === 'function') hideAllDropdowns(); const isAddButton = event.target.closest('#add-row-btn') || event.target.closest('#add-department-btn') || event.target.closest('#add-subdepartment-btn'); const isIndicator = event.target.closest(`#${INDICATOR_ROW_ID}`); if (!isAddButton && !isIndicator) removeInsertIndicator(); if(colorPaletteDiv && colorPaletteDiv.style.display === 'flex' && !colorPaletteDiv.contains(event.target) && !event.target.classList.contains('color-picker-icon')) { colorPaletteDiv.remove();} });
        window.addEventListener('keydown', (event) => { if (event.key === 'Escape') { if (activeDropdown && typeof hideAllDropdowns === 'function') hideAllDropdowns(); if (customContextMenu && customContextMenu.style.display === 'block') hideCustomContextMenu(); removeInsertIndicator(); if(notesModal && notesModal.style.display === 'block' && typeof closeNotesModal === 'function') closeNotesModal(); if(customTaskModal && customTaskModal.style.display === 'block' && typeof closeCustomTaskModal === 'function') closeCustomTaskModal(); if(materialSelectModal && materialSelectModal.style.display === 'block' && typeof closeMaterialSelectModal === 'function') closeMaterialSelectModal(); if(printSelectionModal && printSelectionModal.style.display === 'block' && typeof closePrintSelectionModal === 'function') closePrintSelectionModal(); if(estimateDetailsModal && estimateDetailsModal.style.display === 'block' && typeof closeEstimateDetailsModal === 'function') closeEstimateDetailsModal(); if(templatesModal && templatesModal.style.display === 'block' && typeof closeTemplatesModal === 'function') closeTemplatesModal(); if(confirmNotificationModal && confirmNotificationModal.style.display === 'block') { if (currentCancelCallback) currentCancelCallback(); closeConfirmNotificationModal(); } if(colorPaletteDiv && colorPaletteDiv.style.display === 'flex') { colorPaletteDiv.remove(); } } });

        await initDBEstimateVersions();
        initAutoSaveSettingsControls();
        initUserActivityListeners(); // Rozpocznij śledzenie aktywności
        startAutoSaveTimer(); // Uruchom timer autozapisu (uwzględni stan bezczynności)

        if (document.querySelector('.tab.active[data-tab="ustawienia"]')) {
            if (typeof displayEstimateVersions === 'function') await displayEstimateVersions();
        }

        updateUndoRedoButtons();
        // if(typeof reapplyAllRowColors === 'function') reapplyAllRowColors(); // USUNIĘTE: Teraz renderCostTable to robi
        console.log(`%cPełna inicjalizacja ${APP_VERSION} zakończona.`, "color: green; font-weight: bold;");
        saveToLocalStorage(STORAGE_KEYS.APP_VERSION_LS, APP_VERSION);
    } catch (error) {
        console.error("KRYTYCZNY BŁĄD INICJALIZACJI APLIKACJI:", error);
        let errorMessageToUser = `Wystąpił krytyczny błąd: ${error.message}. Aplikacja może nie działa.`;
        if (error.message) { if (error.message.toLowerCase().includes("json")) errorMessageToUser += "\n\nMożliwy problem z formatem plików JSON. Sprawdź konsolę (F12)."; else if (error.message.toLowerCase().includes("dbservice") || error.message.toLowerCase().includes("catalogimporter") || error.message.toLowerCase().includes("indexeddb")) errorMessageToUser += "\n\nMożliwy problem z inicjalizacją bazy danych lub katalogów. Sprawdź konsolę (F12) i kolejność skryptów."; else if (error.message.toLowerCase().includes("dom") || error.message.toLowerCase().includes("getelementbyid") || error.message.toLowerCase().includes("not found in dom")) errorMessageToUser += "\n\nMożliwy problem ze znalezieniem elementu HTML. Sprawdź index.html i konsolę (F12)."; else if (error.message.toLowerCase().includes("is not defined")) errorMessageToUser += `\n\nProblem z dostępnością funkcji lub zmiennej (${error.message.split(' ')[0]}). Sprawdź konsolę (F12) i kolejność skryptów.`; } errorMessageToUser += "\n\nSprawdź konsolę (F12) po szczegóły.";
        if (typeof showNotification === 'function' && notificationsContainer) { showNotification(errorMessageToUser.replace(/\n/g, "<br>"), 'error', 0); } else { alert(errorMessageToUser.replace(/\n\n/g, '\n')); }
        if (document.body) { document.body.innerHTML = `<div style="padding: 20px; text-align: left; font-family: Arial, sans-serif; background-color: #ffebee; border: 2px solid #c62828; margin: 20px auto; max-width: 800px; border-radius: 8px;"><h1 style="color: #c62828;">Błąd Krytyczny Aplikacji EazyKoszt</h1><p>${errorMessageToUser.replace(/\n/g, "<br>")}</p></div>`;}
    }
} // <-- TUTAJ KOŃCZY SIĘ FUNKCJA initApp

console.log("Plik EazyKoszt 0.6.1A-script-core.js załadowany.");
