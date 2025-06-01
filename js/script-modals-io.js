// Plik: EazyKoszt 0.5.0-script-modals-io.js
// Opis: Logika obsługi okien modalnych, operacji importu/eksportu danych,
//       zarządzania szablonami, wersjami oraz interfejsem użytkownika katalogów.
// Wersja 0.5.0: Modyfikacje związane z przeniesieniem logiki wersji do script-core.js.

// ==========================================================================
// SEKCJA 1: INICJALIZACJA MODUŁU I GŁÓWNYCH LISTENERÓW
// ==========================================================================
async function initModalsAndIO() {
    console.log("Inicjalizacja modali i I/O (EazyKoszt 0.5.0-script-modals-io.js)...");

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeCustomTaskModal);
    else if (customTaskModal) console.warn("Przycisk closeModalBtn (w customTaskModal) nie znaleziony.");
    if (cancelCustomTaskBtn) cancelCustomTaskBtn.addEventListener('click', closeCustomTaskModal);
    else console.warn("Przycisk cancelCustomTaskBtn nie znaleziony.");
    if (addMaterialNormBtn) addMaterialNormBtn.addEventListener('click', async () => await addMaterialNormRow());
    else console.warn("Przycisk addMaterialNormBtn nie znaleziony.");
    if (saveModalBtn) saveModalBtn.addEventListener('click', async () => {
        // Zmieniono: saveModalData wywołuje updateModelAndRender, który zarządza historią
        await saveModalData();
    });
    else console.warn("Przycisk saveModalBtn (save-custom-task-btn) nie znaleziony.");

    if (closeMaterialModalBtn) closeMaterialModalBtn.addEventListener('click', closeMaterialSelectModal);
    else if (materialSelectModal) console.warn("Przycisk closeMaterialModalBtn (w materialSelectModal) nie znaleziony.");
    if (cancelMaterialSelectBtn) cancelMaterialSelectBtn.addEventListener('click', closeMaterialSelectModal);
    else console.warn("Przycisk cancelMaterialSelectBtn nie znaleziony.");
    if (materialSearchInput) { const debouncedRender = debounce(async (value) => await renderMaterialSelectList(value), 300); materialSearchInput.addEventListener('input', (e) => debouncedRender(e.target.value)); }
    else console.warn("Input materialSearchInput nie znaleziony.");
    if (addNewMaterialBtn) addNewMaterialBtn.addEventListener('click', handleAddNewMaterial);
    else console.warn("Przycisk addNewMaterialBtn (w modalu material-select) nie znaleziony.");

    if(editEstimateDetailsBtn) editEstimateDetailsBtn.addEventListener('click', openEstimateDetailsModal);
    else console.warn("Przycisk editEstimateDetailsBtn nie znaleziony.");
    const estimateDetailsModalCloseBtn = estimateDetailsModal?.querySelector('.close-modal-btn[data-modal-id="edit-estimate-details-modal"]');
    if(estimateDetailsModalCloseBtn) estimateDetailsModalCloseBtn.addEventListener('click', closeEstimateDetailsModal);
    else if (estimateDetailsModal) console.warn("Przycisk zamykania dla editEstimateDetailsModal nie znaleziony.");
    if(saveEstimateDetailsModalBtn) saveEstimateDetailsModalBtn.addEventListener('click', saveEstimateDetailsFromModal);
    else console.warn("Przycisk saveEstimateDetailsModalBtn nie znaleziony.");
    if(cancelEstimateDetailsModalBtn) cancelEstimateDetailsModalBtn.addEventListener('click', closeEstimateDetailsModal);
    else console.warn("Przycisk cancelEstimateDetailsModalBtn nie znaleziony.");

    if (openPrintSelectionBtn) openPrintSelectionBtn.addEventListener('click', openPrintSelectionModal);
    else console.warn("Przycisk openPrintSelectionBtn nie znaleziony.");
    const printSelectionModalCloseBtn = printSelectionModal?.querySelector('.close-modal-btn[data-modal-id="print-selection-modal"]');
    if (printSelectionModalCloseBtn) printSelectionModalCloseBtn.addEventListener('click', closePrintSelectionModal);
    else if (printSelectionModal) console.warn("Przycisk zamykania dla printSelectionModal (X) nie znaleziony.");
    if (generateSelectedPrintsBtn) generateSelectedPrintsBtn.addEventListener('click', handleGenerateSelectedPrints);
    else console.warn("Przycisk generateSelectedPrintsBtn nie znaleziony.");
    if (cancelPrintSelectionBtn) cancelPrintSelectionBtn.addEventListener('click', closePrintSelectionModal);
    else console.warn("Przycisk cancelPrintSelectionBtn nie znaleziony.");

    if (saveNotesModalBtn) saveNotesModalBtn.addEventListener('click', saveNotesFromModal); // saveNotesFromModal wywołuje updateModelAndRender
    else console.warn("Przycisk saveNotesModalBtn nie znaleziony.");
    if (cancelNotesModalBtn) cancelNotesModalBtn.addEventListener('click', closeNotesModal);
    else console.warn("Przycisk cancelNotesModalBtn nie znaleziony.");
    if (closeNotesModalXBtn) closeNotesModalXBtn.addEventListener('click', closeNotesModal);
    else if(notesModal) console.warn("Przycisk zamykania dla notesModal (X) nie znaleziony.");

    if (csvFileInput) csvFileInput.addEventListener('change', handleCsvFileLoad);
    else console.warn("Input csvFileInput nie znaleziony.");
    if (loadCsvButton) loadCsvButton.addEventListener('click', processCsvFile);
    else console.warn("Przycisk loadCsvButton nie znaleziony.");
    if (saveEstimateBtn) saveEstimateBtn.addEventListener('click', saveEstimateToFile);
    else console.warn("Przycisk saveEstimateBtn (w nagłówku) nie znaleziony.");
    if (loadEstimateBtn) loadEstimateBtn.addEventListener('click', () => loadEstimateFileInput?.click());
    else console.warn("Przycisk loadEstimateBtn (w nagłówku) nie znaleziony.");
    if (loadEstimateFileInput) loadEstimateFileInput.addEventListener('change', handleLoadEstimateFile);
    else console.warn("Input loadEstimateFileInput nie znaleziony.");

    // Przyciski zarządzania wersjami - wywołują funkcje z script-core.js
    if (saveEstimateVersionBtn) {
        saveEstimateVersionBtn.addEventListener('click', async () => {
            if (typeof _internalSaveCurrentEstimateAsVersion === 'function') {
                await _internalSaveCurrentEstimateAsVersion(false); // false oznacza manualny zapis
            } else {
                showNotification("Funkcja zapisu wersji jest niedostępna.", "error");
            }
        });
    } else { console.warn("Przycisk saveEstimateVersionBtn (na pasku akcji) nie znaleziony."); }

    if(loadSelectedVersionBtn) loadSelectedVersionBtn.addEventListener('click', loadSelectedVersion);
    else console.warn("Przycisk loadSelectedVersionBtn nie znaleziony.");
    if(deleteSelectedVersionBtn) deleteSelectedVersionBtn.addEventListener('click', deleteSelectedVersion);
    else console.warn("Przycisk deleteSelectedVersionBtn nie znaleziony.");
    if (estimateVersionsSelect) {
        estimateVersionsSelect.addEventListener('change', () => {
            const hasSelection = !!estimateVersionsSelect.value;
            if(loadSelectedVersionBtn) loadSelectedVersionBtn.disabled = !hasSelection;
            if(deleteSelectedVersionBtn) deleteSelectedVersionBtn.disabled = !hasSelection;
        });
    } else { console.warn("Element estimateVersionsSelect nie znaleziony.");}

    if (saveDepartmentTemplateBtn) saveDepartmentTemplateBtn.addEventListener('click', () => saveTemplate('department'));
    else console.warn("Przycisk saveDepartmentTemplateBtn nie znaleziony.");
    if (saveEstimateTemplateBtn) saveEstimateTemplateBtn.addEventListener('click', () => saveTemplate('estimate'));
    else console.warn("Przycisk saveEstimateTemplateBtn nie znaleziony.");
    if (openTemplatesModalBtn) openTemplatesModalBtn.addEventListener('click', openTemplatesModal);
    else console.warn("Przycisk openTemplatesModalBtn nie znaleziony.");
    const templatesModalCloseBtn = templatesModal?.querySelector('.close-modal-btn[data-modal-id="templates-modal"]') || document.getElementById('close-templates-modal-btn');
    if (templatesModalCloseBtn) templatesModalCloseBtn.addEventListener('click', closeTemplatesModal);
    else if (templatesModal) console.warn("Przycisk zamykania dla templatesModal nie znaleziony.");
    if (insertTemplateBtn) insertTemplateBtn.addEventListener('click', handleInsertTemplate);
    else console.warn("Przycisk insertTemplateBtn nie znaleziony.");
    if (deleteTemplateBtn) deleteTemplateBtn.addEventListener('click', handleDeleteTemplate);
    else console.warn("Przycisk deleteTemplateBtn nie znaleziony.");
    if (templateSelect) {
        templateSelect.addEventListener('change', () => { const hasSelection = !!templateSelect.value; if(insertTemplateBtn) insertTemplateBtn.disabled = !hasSelection; if(deleteTemplateBtn) deleteTemplateBtn.disabled = !hasSelection;});
        templateSelect.addEventListener('dblclick', handleInsertTemplate);
    } else { console.warn("Element templateSelect nie znaleziony.");}

    if (previewEstimateDetailBtn) previewEstimateDetailBtn.addEventListener('click', handlePreviewEstimateDetail);
    else console.warn("Przycisk previewEstimateDetailBtn nie znaleziony w initModalsAndIO.");

    console.log("Modale i operacje I/O zainicjalizowane (script-modals-io.js).");
}
async function initCatalogsUI() {
    console.log("Inicjalizacja UI Katalogów Własnych (script-modals-io.js)...");
    if (tasksCatalogSearch) tasksCatalogSearch.addEventListener('input', debounce(() => refreshTasksCatalogList(), 300));
    if (addNewTaskToCatalogBtn) addNewTaskToCatalogBtn.addEventListener('click', async () => await openModal('new_custom', null));
    if (materialsCatalogSearch) materialsCatalogSearch.addEventListener('input', debounce(() => refreshMaterialsCatalogList(), 300));
    if (addNewMaterialToCatalogBtn) addNewMaterialToCatalogBtn.addEventListener('click', () => {
        if(newMaterialNameInput) newMaterialNameInput.value = '';
        if(newMaterialUnitInput) newMaterialUnitInput.value = '';
        if(newMaterialCategoryInput) newMaterialCategoryInput.value = 'IN';
        targetMaterialInputRow = null;
        openMaterialSelectModal(null);
    });
    await refreshCatalogsUITab();
    console.log("UI Katalogów Własnych zainicjalizowane.");
}

// ==========================================================================
// SEKCJA 2: OBSŁUGA MODALA NOTATEK (bez zmian)
// ==========================================================================
// openNotesModal będzie teraz przyjmować ID wiersza z modelu, a nie element DOM
function openNotesModal(rowId) {
    // currentNotesTargetRow teraz będzie przechowywać rowId z modelu, a nie element DOM
    currentNotesTargetRow = rowId;

    if (!notesModal || !notesModalTextarea || !notesModalItemDesc) {
        console.warn("Nie można otworzyć modala notatek - brak elementów DOM.");
        return;
    }

    // Znajdź obiekt wiersza w modelu
    const rowObject = currentEstimateModel.rows.find(r => r.rowId === rowId);
    if (!rowObject) {
        console.error("openNotesModal: Nie znaleziono obiektu wiersza w modelu.");
        showNotification("Błąd: Nie można otworzyć notatek dla tego elementu.", 'error');
        return;
    }

    let itemDesc = "";
    const rowType = rowObject.rowType;
    if(rowType === 'task') {
        itemDesc = rowObject.localDesc || rowObject.description || "Wybrana pozycja";
    } else if (rowType === 'department' || rowType === 'subdepartment') {
        itemDesc = rowObject.text || "Wybrany dział/poddział";
    } else {
        itemDesc = "Wybrany element";
    }

    notesModalItemDesc.textContent = itemDesc.length > 70 ? itemDesc.substring(0, 67) + "..." : itemDesc;
    notesModalTextarea.value = rowObject.notes || "";
    notesModal.style.display = 'block';
    notesModalTextarea.focus();
}
function closeNotesModal() { if (notesModal) notesModal.style.display = 'none'; currentNotesTargetRow = null; }
async function saveNotesFromModal() { // Zmieniono na async
    if (!currentNotesTargetRow || !notesModalTextarea) return; // currentNotesTargetRow to teraz rowId

    const newNotes = notesModalTextarea.value.trim();
    const rowIdToUpdate = currentNotesTargetRow; // ID wiersza z modelu

    // Znajdź i zaktualizuj obiekt wiersza w modelu
    const rowIndex = currentEstimateModel.rows.findIndex(r => r.rowId === rowIdToUpdate);
    if (rowIndex === -1) {
        console.error("saveNotesFromModal: Nie znaleziono obiektu wiersza w modelu do aktualizacji.");
        showNotification("Błąd: Nie udało się zapisać notatki.", 'error');
        return;
    }

    const updatedRows = [...currentEstimateModel.rows]; // Kopia tablicy
    updatedRows[rowIndex] = { ...updatedRows[rowIndex], notes: newNotes }; // Kopia obiektu i aktualizacja notatki

    // Wywołaj updateModelAndRender, aby zaktualizować model i odświeżyć widok
    await updateModelAndRender({ rows: updatedRows }); // Zmieniono: teraz wywołujemy updateModelAndRender

    // Wizualna aktualizacja ikony notatek (będzie to zrobione przez renderCostTable, ale dla natychmiastowego feedbacku)
    // Dostęp do DOM elementu
    const domRow = costTableBody.querySelector(`tr[data-row-id="${rowIdToUpdate}"]`);
    if (domRow) {
        const notesIcon = domRow.querySelector('.notes-icon');
        const tooltip = domRow.querySelector('.notes-preview-tooltip');
        if (notesIcon) {
            if (newNotes) {
                notesIcon.classList.add('has-notes');
                notesIcon.innerHTML = '📝';
                if (tooltip) tooltip.textContent = newNotes;
            } else {
                notesIcon.classList.remove('has-notes');
                notesIcon.innerHTML = '🗒️';
                if (tooltip) tooltip.textContent = "Brak notatki";
            }
        }
    }

    closeNotesModal();
}

// ==========================================================================
// SEKCJA 3: OBSŁUGA MODALA DEFINICJI/EDYCJI POZYCJI (customTaskModal) (bez zmian)
// ==========================================================================
async function openModal(context, ref) { currentEditContext = context; currentEditingRef = ref; modalDescInput.readOnly = false; modalUnitInput.readOnly = false; modalNormRInput.readOnly = false; if(modalMaterialsSection) modalMaterialsSection.style.display = 'block'; if(addMaterialNormBtn) addMaterialNormBtn.style.display = 'block'; if(customTaskMaterialsList) { customTaskMaterialsList.querySelectorAll('input, button:not(.remove-material-btn)').forEach(el => el.disabled = false); customTaskMaterialsList.querySelectorAll('.select-material-btn, .remove-material-btn').forEach(el => el.style.display = ''); } if (modalQuantityDiv && modalQuantityDiv.parentNode) modalQuantityDiv.parentNode.removeChild(modalQuantityDiv); const modalTaskBranchSelect = document.getElementById('modal-task-branch-select'); const modalTaskDepartmentInput = document.getElementById('modal-task-department-input'); if(modalTaskBranchSelect) modalTaskBranchSelect.disabled = false; if(modalTaskDepartmentInput) modalTaskDepartmentInput.disabled = false; const currentWorkerRates = (typeof appState !== 'undefined' ? appState.getState('workerRatesSettings') : DEFAULT_WORKER_RATES_SETTINGS); if (modalWorkerCategorySelect && modalWorkerCategorySelect.options.length !== Object.keys(currentWorkerRates).length) { modalWorkerCategorySelect.innerHTML = ''; for (const catCode in currentWorkerRates) { const option = document.createElement('option'); option.value = catCode; option.textContent = currentWorkerRates[catCode].name; modalWorkerCategorySelect.appendChild(option); } } if(customTaskMaterialsList) customTaskMaterialsList.innerHTML = ''; if (context === 'new_custom') { if(modalTitle) modalTitle.textContent = "Zdefiniuj Nową Pozycję Katalogową"; modalDescInput.value = ''; modalUnitInput.value = ''; setNumericInputValue(modalNormRInput, 0, 3); if(modalWorkerCategorySelect) modalWorkerCategorySelect.value = 'ogolnobudowlany'; if(modalTaskBranchSelect) modalTaskBranchSelect.value = ''; if(modalTaskDepartmentInput) modalTaskDepartmentInput.value = ''; await addMaterialNormRow(); } else if (context === 'edit_custom') { const taskCatalogId = ref; const task = await dbService.getItem(TASKS_CATALOG_STORE_NAME, taskCatalogId); if(!task) { showNotification("Błąd: Nie znaleziono pozycji katalogowej do edycji.", 'error'); closeCustomTaskModal(); return; } if(modalTitle) modalTitle.textContent = "Edytuj Pozycję Katalogową"; modalDescInput.value = task.description; modalUnitInput.value = task.unit; setNumericInputValue(modalNormRInput, task.norms?.R, 3); if(modalWorkerCategorySelect) modalWorkerCategorySelect.value = task.workerCategory || 'ogolnobudowlany'; if(modalTaskBranchSelect) modalTaskBranchSelect.value = task.branch || ''; if(modalTaskDepartmentInput) modalTaskDepartmentInput.value = task.department || ''; if (task.norms?.M && task.norms.M.length > 0) { for (const matNorm of task.norms.M) { const material = await dbService.getItem(MATERIALS_CATALOG_STORE_NAME, matNorm.materialId); await addMaterialNormRow(material?.name, matNorm.quantity, matNorm.unit, matNorm.materialId); } } else { await addMaterialNormRow(); } } else if (context === 'edit_row') {
    // Zmieniono: ref jest teraz DOM elementem, z którego pobieramy rowId
    const domRow = ref;
    if (!domRow || domRow.dataset.rowType !== 'task') { console.error("Nieprawidłowy wiersz do edycji.", domRow); return; }

    const rowIdToEdit = domRow.dataset.rowId;
    // Znajdź obiekt wiersza w modelu
    const rowObject = currentEstimateModel.rows.find(r => r.rowId === rowIdToEdit);
    if (!rowObject) { console.error("openModal: Nie znaleziono obiektu wiersza w modelu do edycji."); return; }

    const taskCatalogId = rowObject.taskCatalogId;
    let baseTask = taskCatalogId ? await dbService.getItem(TASKS_CATALOG_STORE_NAME, taskCatalogId) : null;

    const currentDesc = rowObject.localDesc || (baseTask ? baseTask.description : rowObject.description) || '';
    const currentQty = rowObject.quantity; // Ilość z modelu
    const currentUnit = rowObject.localUnit || (baseTask ? baseTask.unit : rowObject.unit) || '';
    const currentNormR = rowObject.localNormR !== undefined ? rowObject.localNormR : (baseTask ? baseTask.norms?.R : null);
    const currentNormsM_source = rowObject.localNormsM ? JSON.parse(JSON.stringify(rowObject.localNormsM)) : (baseTask ? baseTask.norms?.M : null); // Głęboka kopia
    const currentWorkerCategory = rowObject.localWorkerCategory || (baseTask ? baseTask.workerCategory : 'ogolnobudowlany');

    if(modalTaskBranchSelect) { modalTaskBranchSelect.value = baseTask?.branch || ''; modalTaskBranchSelect.disabled = true; }
    if(modalTaskDepartmentInput) { modalTaskDepartmentInput.value = baseTask?.department || ''; modalTaskDepartmentInput.disabled = true; }

    if(modalTitle) modalTitle.textContent = "Edytuj Pozycję (Lokalnie w Kosztorysie)";
    modalDescInput.value = currentDesc;
    modalUnitInput.value = currentUnit;
    setNumericInputValue(modalNormRInput, currentNormR, 3);
    if(modalWorkerCategorySelect) modalWorkerCategorySelect.value = currentWorkerCategory;

    if (Array.isArray(currentNormsM_source) && currentNormsM_source.length > 0) {
        for (const matNorm of currentNormsM_source) {
            let matName = matNorm.name;
            let matId = matNorm.materialId;
            if (!matName && matId) {
                const material = await dbService.getItem(MATERIALS_CATALOG_STORE_NAME, matId);
                matName = material ? material.name : `Nieznany (ID: ${matId})`;
            }
            await addMaterialNormRow(matName, matNorm.quantity, matNorm.unit, matId);
        }
    } else { await addMaterialNormRow(); }

    const normRFormGroup = modalNormRInput.closest('.form-group');
    if (normRFormGroup) normRFormGroup.after(modalQuantityDiv);
    if(modalQuantityInput) setNumericInputValue(modalQuantityInput, currentQty, 3);

    modalDescInput.removeEventListener('change', handleModalDescChangeForRowEdit);
    modalDescInput.addEventListener('change', handleModalDescChangeForRowEdit);

} else { console.error("Nieznany kontekst otwarcia modala:", context); return; } if (customTaskModal) { customTaskModal.style.display = 'block'; modalDescInput.focus(); } }
async function handleModalDescChangeForRowEdit() { if (currentEditContext !== 'edit_row' || !modalDescInput) return; const newDesc = modalDescInput.value.trim(); if (!newDesc) return; const existingCatalogTask = await dbService.getItemByIndex(TASKS_CATALOG_STORE_NAME, 'description', newDesc); if (existingCatalogTask) { modalUnitInput.value = existingCatalogTask.unit || ''; setNumericInputValue(modalNormRInput, existingCatalogTask.norms?.R, 3); if(modalWorkerCategorySelect) modalWorkerCategorySelect.value = existingCatalogTask.workerCategory || 'ogolnobudowlany'; if(customTaskMaterialsList) customTaskMaterialsList.innerHTML = ''; if (existingCatalogTask.norms?.M && existingCatalogTask.norms.M.length > 0) { for (const matNorm of existingCatalogTask.norms.M) { const material = await dbService.getItem(MATERIALS_CATALOG_STORE_NAME, matNorm.materialId); await addMaterialNormRow(material ? material.name : `Nieznany (ID: ${matNorm.materialId})`, matNorm.quantity, matNorm.unit, matNorm.materialId); } } else { await addMaterialNormRow(); } } }
function closeCustomTaskModal() { modalDescInput.removeEventListener('change', handleModalDescChangeForRowEdit); currentEditContext = null; currentEditingRef = null; if(modalTitle && originalModalTitle) modalTitle.textContent = originalModalTitle; if (modalQuantityDiv && modalQuantityDiv.parentNode) modalQuantityDiv.parentNode.removeChild(modalQuantityDiv); const modalTaskBranchSelect = document.getElementById('modal-task-branch-select'); const modalTaskDepartmentInput = document.getElementById('modal-task-department-input'); if(modalTaskBranchSelect) modalTaskBranchSelect.disabled = false; if(modalTaskDepartmentInput) modalTaskDepartmentInput.disabled = false; if (customTaskModal) customTaskModal.style.display = 'none'; }
async function addMaterialNormRow(name = '', quantity = '', unit = '', materialId = null) { if (!customTaskMaterialsList) return null; const div = document.createElement('div'); div.classList.add('material-norm-group'); let effectiveUnit = unit; let materialNameToDisplay = name; let currentMaterialId = materialId; if (materialId && !name) { const material = await dbService.getItem(MATERIALS_CATALOG_STORE_NAME, materialId); if (material) { materialNameToDisplay = material.name; if (!unit) effectiveUnit = material.unit || 'j.m.'; } else { materialNameToDisplay = `Błąd: Mat. ID ${materialId} nieznany`; } } else if (name && !materialId) { const material = await dbService.getItemByIndex(MATERIALS_CATALOG_STORE_NAME, 'name', name); if (material) { currentMaterialId = material.id; if (!unit) effectiveUnit = material.unit || 'j.m.';} } if (!effectiveUnit) effectiveUnit = 'j.m.'; const quantityForInput = (typeof quantity === 'number' && !isNaN(quantity)) ? quantity.toFixed(3) : (quantity || ""); div.innerHTML = ` <div class="material-input-wrapper"> <input type="text" class="custom-mat-name" placeholder="Kliknij lupę lub wpisz..." value="${materialNameToDisplay}" data-material-id="${currentMaterialId || ''}" ${currentMaterialId ? 'readonly' : ''}> <button type="button" class="select-material-btn secondary small-action-btn" title="Wybierz materiał z katalogu" style="padding: 5px 8px; line-height: 1;">&#128269;</button> </div> <input type="number" class="custom-mat-qty" min="0" step="0.001" value="${quantityForInput.replace('.',',')}"> <input type="text" list="commonUnitsData" class="custom-mat-unit" value="${effectiveUnit}" ${currentMaterialId ? 'readonly' : ''}> <button type="button" class="remove-material-btn danger small-action-btn">Usuń</button>`; const nameInputEl = div.querySelector('.custom-mat-name'); nameInputEl.addEventListener('change', async (e) => { const newName = e.target.value.trim(); if (newName) { const matFromDb = await dbService.getItemByIndex(MATERIALS_CATALOG_STORE_NAME, 'name', newName); if (matFromDb) { e.target.dataset.materialId = matFromDb.id; div.querySelector('.custom-mat-unit').value = matFromDb.unit || 'j.m.'; e.target.readOnly = true; } else { e.target.dataset.materialId = ''; div.querySelector('.custom-mat-unit').readOnly = false; } } else { e.target.dataset.materialId = ''; div.querySelector('.custom-mat-unit').readOnly = false;} }); div.querySelector('.select-material-btn').addEventListener('click', (e) => { openMaterialSelectModal(e.target.closest('.material-norm-group')); }); div.querySelector('.remove-material-btn').addEventListener('click', removeMaterialNormRow); customTaskMaterialsList.appendChild(div); return div; }
function removeMaterialNormRow(event) { const materialGroup = event.target.closest('.material-norm-group'); if (materialGroup) { if (customTaskMaterialsList.children.length > 1) { materialGroup.remove(); } else { materialGroup.querySelector('.custom-mat-name').value = ''; materialGroup.querySelector('.custom-mat-name').dataset.materialId = ''; materialGroup.querySelector('.custom-mat-name').readOnly = false; materialGroup.querySelector('.custom-mat-qty').value = ''; materialGroup.querySelector('.custom-mat-unit').value = 'j.m.'; materialGroup.querySelector('.custom-mat-unit').readOnly = false; } } }

// ==========================================================================
// SEKCJA 4: OBSŁUGA MODALA WYBORU/DODAWANIA MATERIAŁU (materialSelectModal) (bez zmian)
// ==========================================================================
async function openMaterialSelectModal(targetNormRow) { targetMaterialInputRow = targetNormRow; if(materialSearchInput) materialSearchInput.value = ''; if(newMaterialNameInput) newMaterialNameInput.value = ''; if(newMaterialUnitInput) newMaterialUnitInput.value = ''; if(newMaterialCategoryInput) newMaterialCategoryInput.value = 'IN'; await renderMaterialSelectList(''); if (materialSelectModal) { materialSelectModal.style.display = 'block'; if(materialSearchInput) materialSearchInput.focus(); } }
function closeMaterialSelectModal() { if(materialSelectModal) materialSelectModal.style.display = 'none'; targetMaterialInputRow = null; }
async function renderMaterialSelectList(filterText) { if (!materialSelectList || !materialSelectNoResults) return; materialSelectList.innerHTML = ''; const lowerFilter = filterText.toLowerCase().trim(); let visibleCount = 0; const allMaterialsFromDb = await dbService.getAllItems(MATERIALS_CATALOG_STORE_NAME); const sortedMaterials = allMaterialsFromDb.sort((a, b) => a.name.localeCompare(b.name, 'pl')); sortedMaterials.forEach(material => { if (!lowerFilter || material.name.toLowerCase().includes(lowerFilter)) { const li = document.createElement('li'); li.dataset.materialId = material.id; li.dataset.name = material.name; li.dataset.unit = material.unit || 'j.m.'; li.style.cssText = 'cursor:pointer; padding:6px 10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center; font-size:0.9em;'; const nameSpan = document.createElement('span'); nameSpan.textContent = material.name; const detailsSpan = document.createElement('span'); detailsSpan.style.cssText = 'font-size:0.85em; color:#555; text-align:right; margin-left:10px; white-space:nowrap;'; detailsSpan.textContent = `(${(typeof getMaterialCategoryFullName === 'function' ? getMaterialCategoryFullName(material.categoryCode) : material.categoryCode) || '?'}, ${material.unit || '?'}, ${formatCurrency(material.priceY || 0)} zł)`; li.appendChild(nameSpan); li.appendChild(detailsSpan); li.addEventListener('click', handleMaterialSelect); li.addEventListener('mouseenter', () => li.style.backgroundColor = '#f0f0f0'); li.addEventListener('mouseleave', () => li.style.backgroundColor = ''); materialSelectList.appendChild(li); visibleCount++; } }); materialSelectNoResults.style.display = visibleCount === 0 ? 'block' : 'none'; }
function handleMaterialSelect(event) { const li = event.currentTarget; const materialId = li.dataset.materialId; const name = li.dataset.name; const unit = li.dataset.unit; if (targetMaterialInputRow) { const nameInput = targetMaterialInputRow.querySelector('.custom-mat-name'); const unitInput = targetMaterialInputRow.querySelector('.custom-mat-unit'); if (nameInput && unitInput) { nameInput.value = name; nameInput.dataset.materialId = materialId; nameInput.readOnly = true; unitInput.value = unit; unitInput.readOnly = true; } } closeMaterialSelectModal(); }
async function handleAddNewMaterial() {
    const newName = newMaterialNameInput.value.trim(); const newUnit = newMaterialUnitInput.value.trim(); const newCategoryCode = newMaterialCategoryInput.value;
    if (!newName || !newUnit) { showNotification("Nazwa i jednostka nowego materiału są wymagane.", 'warning'); return; }
    const existingMaterial = await dbService.getItemByIndex(MATERIALS_CATALOG_STORE_NAME, 'name', newName);
    if (existingMaterial) {
        showConfirmNotification(`Materiał "${newName}" już istnieje w katalogu. Czy chcesz go wybrać?`, () => {
            if (targetMaterialInputRow) {
                const nameInput = targetMaterialInputRow.querySelector('.custom-mat-name');
                const unitInput = targetMaterialInputRow.querySelector('.custom-mat-unit');
                if (nameInput && unitInput) {
                    nameInput.value = existingMaterial.name;
                    nameInput.dataset.materialId = existingMaterial.id;
                    nameInput.readOnly = true;
                    unitInput.value = existingMaterial.unit;
                    unitInput.readOnly = true;
                }
            }
            closeMaterialSelectModal();
        });
        return;
    }
    const newMaterialData = { name: newName, unit: newUnit, categoryCode: newCategoryCode, priceY: 0, priceX: 0, isPredefined: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    try {
        const newMaterialId = await dbService.addItem(MATERIALS_CATALOG_STORE_NAME, newMaterialData);
        if (!isRestoringState && typeof appState !== 'undefined') appState.notify('materialCatalogChanged');
        if (targetMaterialInputRow) { const nameInput = targetMaterialInputRow.querySelector('.custom-mat-name'); const unitInput = targetMaterialInputRow.querySelector('.custom-mat-unit'); if (nameInput && unitInput) { nameInput.value = newName; nameInput.dataset.materialId = newMaterialId; nameInput.readOnly = true; unitInput.value = newUnit; unitInput.readOnly = true; } }
        closeMaterialSelectModal();
        showNotification(`Dodano nowy materiał: "${newName}" (${newUnit}, Kat: ${getMaterialCategoryFullName(newCategoryCode)}). Możesz edytować jego cenę.`, 'success', 7000);
    } catch (error) { console.error("Błąd dodawania nowego materiału:", error); showNotification("Wystąpił błąd podczas dodawania nowego materiału.", 'error'); }
}

// ==========================================================================
// SEKCJA 5: ZAPIS DANYCH Z GŁÓWNEGO MODALA (POZYCJE KATALOGOWE / WIERSZE) (bez zmian od ostatniej iteracji)
// ==========================================================================
async function _saveOrUpdateCatalogTask(isEditing, editingCatalogTaskId) {
    const desc = modalDescInput.value.trim();
    const unit = modalUnitInput.value.trim();
    const normRText = modalNormRInput.value.replace(',', '.');
    const normR = normRText === '' ? 0 : (parseFloat(normRText) || 0);
    const workerCat = modalWorkerCategorySelect.value || 'ogolnobudowlany';
    const branchCode = document.getElementById('modal-task-branch-select')?.value;
    let departmentName = document.getElementById('modal-task-department-input')?.value.trim();
    if (!departmentName) { departmentName = "Pozycje własne"; }

    if (!desc) { showNotification("Opis pozycji katalogowej nie może być pusty.", 'error'); modalDescInput.focus(); return false; }
    if (!unit) { showNotification("Jednostka pozycji katalogowej nie może być pusta.", 'error'); modalUnitInput.focus(); return false; }
    if (normR < 0) { showNotification("Norma R nie może być ujemna.", 'error'); modalNormRInput.focus(); return false; }
    if (!branchCode) { showNotification("Wybierz branżę dla pozycji katalogowej.", 'error'); document.getElementById('modal-task-branch-select')?.focus(); return false; }

    let originalDescription = null;
    if (isEditing) {
        const ot = await dbService.getItem(TASKS_CATALOG_STORE_NAME, editingCatalogTaskId);
        if(ot) originalDescription = ot.description;
    }

    if (!isEditing || (isEditing && desc !== originalDescription)) {
        const tasksInBranch = await dbService.getItemsByIndex(TASKS_CATALOG_STORE_NAME, 'branch', branchCode);
        const conflict = tasksInBranch.find(t => t.description === desc && t.department === departmentName && t.id !== editingCatalogTaskId);
        if (conflict) {
            showNotification(`Pozycja katalogowa o opisie "${desc}" już istnieje w branży "${(typeof BRANCHES !== 'undefined' && BRANCHES[branchCode]) ? BRANCHES[branchCode].name : branchCode}" i dziale "${departmentName}". Zmień opis lub dział.`, 'warning', 7000);
            modalDescInput.focus();
            return false;
        }
    }

    const materialNorms_withIds = [];
    const materialRows = customTaskMaterialsList.querySelectorAll('.material-norm-group');
    for (const row of materialRows) {
        const nameInput = row.querySelector('.custom-mat-name');
        let matId = nameInput.dataset.materialId ? parseInt(nameInput.dataset.materialId) : null;
        const matName = nameInput.value.trim();
        const qtyInput = row.querySelector('.custom-mat-qty');
        const unitInput = row.querySelector('.custom-mat-unit');
        const quantity = parseFloat(qtyInput.value.replace(',', '.')) || 0;
        const matUnit = unitInput.value.trim();

        if (matName && quantity > 0) {
            if (!matId) {
                const materialFromDb = await dbService.getItemByIndex(MATERIALS_CATALOG_STORE_NAME, 'name', matName);
                if (materialFromDb) matId = materialFromDb.id;
                else {
                    showNotification(`Materiał "${matName}" nie został znaleziony w katalogu. Dodaj go najpierw lub wybierz istniejący.`, 'error');
                    nameInput.focus();
                    return false;
                }
            }
            if (materialNorms_withIds.some(mn => mn.materialId === matId)) {
                showNotification(`Materiał "${matName}" jest już dodany do tej pozycji. Usuń duplikat lub zmodyfikuj istniejącą normę.`, 'warning');
                nameInput.focus();
                return false;
            }
            materialNorms_withIds.push({ materialId: matId, quantity: quantity, unit: matUnit || (await getMaterialUnit(matId)) });
        }
    }

    const taskData = {
        description: desc,
        unit: unit,
        workerCategory: workerCat,
        branch: branchCode,
        department: departmentName,
        norms: { R: normR, M: materialNorms_withIds },
        isPredefined: false,
        updatedAt: new Date().toISOString()
    };

    let actionMessage = "";
    if (isEditing) {
        taskData.id = editingCatalogTaskId;
        const originalTask = await dbService.getItem(TASKS_CATALOG_STORE_NAME, editingCatalogTaskId);
        taskData.createdAt = originalTask.createdAt || new Date().toISOString();
        await dbService.updateItem(TASKS_CATALOG_STORE_NAME, taskData);
        actionMessage = `Pozycja katalogowa "${desc}" zaktualizowana.`;

        // TUTAJ ZAKTUALIZUJEMY WIERSZE KOSZTORYSU W MODELU
        // Iterujemy przez currentEstimateModel.rows i szukamy pozycji z tym taskCatalogId
        const updatedEstimateRows = currentEstimateModel.rows.map(row => {
            if (row.rowType === 'task' && row.taskCatalogId === editingCatalogTaskId && !row.localDesc) {
                // Jeśli wiersz używa tej pozycji katalogowej i nie ma lokalnego nadpisania opisu
                return {
                    ...row,
                    description: desc, // Zaktualizuj opis
                    originalCatalogDesc: desc // Zaktualizuj oryginalny opis katalogowy
                    // Inne dane (normy, jednostka) będą zaciągnięte przy ponownym renderowaniu przez calculateRowValues
                };
            }
            return row;
        });

        // Wywołaj updateModelAndRender, aby odświeżyć UI i przeliczyć
        await updateModelAndRender({ rows: updatedEstimateRows });

    } else {
        taskData.createdAt = new Date().toISOString();
        await dbService.addItem(TASKS_CATALOG_STORE_NAME, taskData);
        actionMessage = `Nowa pozycja katalogowa "${desc}" zapisana.`;
    }

    if (!isRestoringState && typeof appState !== 'undefined') {
        appState.notify('taskCatalogChanged'); // Odświeża UI katalogów
        // appState.notify('estimateDataPotentiallyChanged'); // Wywołane przez updateModelAndRender
    }

    // Odśwież dropdown, jeśli jest otwarty
    if (activeDropdown && activeDropdown.style.display === 'block' && activeSearchInput) {
        const container = activeSearchInput.closest('.suggestions-container');
        if (container) {
            await renderDropdownOptions(
                container,
                container.dataset.currentMode || 'departments',
                container.dataset.selectedDept,
                activeSearchInput.value,
                container.dataset.currentBranch
            );
        }
    }

    showNotification(actionMessage, 'success');
    closeCustomTaskModal();
    return true;
}
async function _updateEstimateRowFromModal(domRowElement) { // Przyjmuje element DOM
    const newDesc = modalDescInput.value.trim();
    const newQtyText = modalQuantityInput?.value.replace(',', '.') || '0';
    const newQty = typeof evaluateMathExpression === 'function' ? evaluateMathExpression(newQtyText) : (parseFloat(newQtyText) || 0);
    const newUnit = modalUnitInput.value.trim();
    const newNormRText = modalNormRInput.value.replace(',', '.');
    const newNormR = newNormRText === '' ? null : (parseFloat(newNormRText));
    const newWorkerCategory = modalWorkerCategorySelect.value || 'ogolnobudowlany';
    const newNormsM_forLocalSave = [];

    if (newQty <= 0) { showNotification("Obmiar musi być większy od zera.", 'error'); modalQuantityInput?.focus(); return false; }
    if (!newDesc) { showNotification("Opis pozycji nie może być pusty.", 'error'); modalDescInput.focus(); return false; }

    const materialRows = customTaskMaterialsList.querySelectorAll('.material-norm-group');
    const materialNamesInThisTask = new Set();
    for (const matRow of materialRows) {
        const nameInput = matRow.querySelector('.custom-mat-name');
        const name = nameInput.value.trim();
        const qtyInput = matRow.querySelector('.custom-mat-qty');
        const unitInput = matRow.querySelector('.custom-mat-unit');
        const quantity = parseFloat(qtyInput.value.replace(',', '.')) || 0;
        const matUnit = unitInput.value.trim();

        if (name && quantity > 0) {
            if (materialNamesInThisTask.has(name)) { showNotification(`Materiał "${name}" jest już dodany do tej pozycji (lokalnie). Usuń duplikat.`, 'warning'); nameInput.focus(); return false; }
            newNormsM_forLocalSave.push({ name: name, quantity: quantity, unit: matUnit || (typeof getMaterialUnit === 'function' ? await getMaterialUnit(name) : 'j.m.') });
            materialNamesInThisTask.add(name);
        } else if (name && quantity <= 0) {} else if (!name && quantity > 0) { showNotification(`Podaj nazwę materiału dla normy z ilością ${quantity}.`, 'error'); nameInput.focus(); return false; }
    }

    // Znajdź indeks wiersza w modelu na podstawie DOM elementu
    const rowIndex = currentEstimateModel.rows.findIndex(r => r.rowId === domRowElement.dataset.rowId);
    if (rowIndex === -1) {
        console.error("_updateEstimateRowFromModal: Nie znaleziono obiektu wiersza w modelu do aktualizacji.");
        showNotification("Błąd wewnętrzny: Nie znaleziono wiersza do aktualizacji.", 'error');
        return false;
    }

    let updatedRow = { ...currentEstimateModel.rows[rowIndex] }; // Kopia obiektu z modelu

    let baseCatalogTask = null;
    const taskCatalogId = updatedRow.taskCatalogId; // Z modelu
    if (taskCatalogId) baseCatalogTask = await dbService.getItem(TASKS_CATALOG_STORE_NAME, taskCatalogId);

    let saveToCatalogInstead = false;
    if (baseCatalogTask) {
        const dataChanged = newDesc !== baseCatalogTask.description ||
                            newUnit !== baseCatalogTask.unit ||
                            (newNormR ?? (baseCatalogTask.norms?.R ?? 0)) !== (baseCatalogTask.norms?.R ?? 0) ||
                            newWorkerCategory !== (baseCatalogTask.workerCategory || 'ogolnobudowlany') ||
                            await compareMaterialNorms(newNormsM_forLocalSave, baseCatalogTask.norms?.M);
        if (dataChanged) {
            let confirmedAction = false;
            await new Promise(resolve => {
                showConfirmNotification(`Dane pozycji "${newDesc}" różnią się od pozycji katalogowej "${baseCatalogTask.description}".<br><br><b>[OK]</b> = Zapisz zmiany jako NOWĄ pozycję w katalogu (lub zaktualizuj istniejącą o tym samym opisie, jeśli jest Twoja).<br><b>[Anuluj]</b> = Zapisz zmiany tylko dla TEGO WIERSZA w kosztorysie (jako modyfikacja lokalna).`,
                () => { saveToCatalogInstead = true; confirmedAction = true; resolve(); },
                () => { saveToCatalogInstead = false; confirmedAction = true; resolve(); }
                );
            });
            if (!confirmedAction && !saveToCatalogInstead) return false;
        }
    } else if (newDesc) { // Jeśli nie jest z katalogu i jest nowy opis
        let confirmedAction = false;
        await new Promise(resolve => {
            showConfirmNotification(`Opis "${newDesc}" nie pasuje do żadnej znanej pozycji katalogowej lub jest to nowa pozycja lokalna.<br><br><b>[OK]</b> = Zapisz jako NOWĄ pozycję w katalogu.<br><b>[Anuluj]</b> = Zapisz zmiany tylko dla TEGO WIERSZA w kosztorysie.`,
            () => { saveToCatalogInstead = true; confirmedAction = true; resolve(); },
            () => { saveToCatalogInstead = false; confirmedAction = true; resolve(); }
            );
        });
        if (!confirmedAction && !saveToCatalogInstead) return false;
    }

    if (saveToCatalogInstead) {
        // Logika zapisu do katalogu - prawie bez zmian, poza tym, co jest potrzebne do zaciągnięcia danych.
        const modalTaskBranchSelect = document.getElementById('modal-task-branch-select');
        const modalTaskDepartmentInput = document.getElementById('modal-task-department-input');
        const branchCodeForNew = baseCatalogTask?.branch || modalTaskBranchSelect?.value || prompt("Podaj kod branży (np. OG, EL) dla nowej/zaktualizowanej pozycji katalogowej:", baseCatalogTask?.branch || "");
        let departmentForNew = baseCatalogTask?.department || modalTaskDepartmentInput?.value.trim();
        if (!departmentForNew) { departmentForNew = "Pozycje własne"; }

        if (!branchCodeForNew) {
            showNotification("Branża jest wymagana do zapisania pozycji w katalogu.", 'error'); return false;
        }

        const catalogTaskData = {
            description: newDesc, unit: newUnit, workerCategory: newWorkerCategory,
            branch: branchCodeForNew, department: departmentForNew,
            norms: { R: newNormR ?? 0, M: [] },
            isPredefined: false, updatedAt: new Date().toISOString()
        };

        for(const localNorm of newNormsM_forLocalSave){
            const mat = await dbService.getItemByIndex(MATERIALS_CATALOG_STORE_NAME, 'name', localNorm.name);
            if(mat) {
                catalogTaskData.norms.M.push({materialId: mat.id, quantity: localNorm.quantity, unit: localNorm.unit});
            } else {
                showNotification(`Nie można zapisać do katalogu: Materiał "${localNorm.name}" nie istnieje w bazie. Dodaj go najpierw.`, 'error');
                return false;
            }
        }

        const tasksInBranch = await dbService.getItemsByIndex(TASKS_CATALOG_STORE_NAME, 'branch', branchCodeForNew);
        const existingWithSameDesc = tasksInBranch.find(t => t.description === newDesc && t.department === departmentForNew);
        let newOrUpdatedCatalogTaskId;

        if (existingWithSameDesc) {
            let confirmedOverwrite = false;
            await new Promise(resolveConfirm => {
                const confirmMessage = existingWithSameDesc.isPredefined
                    ? `Pozycja katalogowa "${newDesc}" jest predefiniowana. Czy na pewno chcesz ją NADPISAĆ własnymi danymi? Zmiany będą widoczne we wszystkich miejscach jej użycia.`
                    : `Pozycja katalogowa "${newDesc}" (Twoja własna) już istnieje w tej branży i dziale. Nadpisać ją nowymi danymi?`;
                showConfirmNotification(confirmMessage,
                    () => { confirmedOverwrite = true; resolveConfirm(true); },
                    () => { resolveConfirm(false); }
                );
            });
            if (!confirmedOverwrite) return false;

            catalogTaskData.id = existingWithSameDesc.id;
            catalogTaskData.createdAt = existingWithSameDesc.createdAt || new Date().toISOString();
            await dbService.updateItem(TASKS_CATALOG_STORE_NAME, catalogTaskData);
            newOrUpdatedCatalogTaskId = existingWithSameDesc.id;
            showNotification(`Pozycja "${newDesc}" została zaktualizowana w katalogu.`, 'success');
        } else {
            catalogTaskData.createdAt = new Date().toISOString();
            newOrUpdatedCatalogTaskId = await dbService.addItem(TASKS_CATALOG_STORE_NAME, catalogTaskData);
            showNotification(`Pozycja "${newDesc}" została dodana do katalogu.`, 'success');
        }

        // Zaktualizuj model (NIE DOM) wiersza kosztorysu, aby wskazywał na nowy/zaktualizowany wpis katalogowy
        updatedRow.taskCatalogId = newOrUpdatedCatalogTaskId;
        updatedRow.description = newDesc; // Upewnij się, że opis w modelu jest zgodny
        updatedRow.originalCatalogDesc = newDesc; // Ustaw oryginalny opis
        delete updatedRow.localDesc; // Usuń lokalny opis
        delete updatedRow.localUnit; // Usuń lokalne normy, jeśli są
        delete updatedRow.localNormR;
        delete updatedRow.localNormsM;
        delete updatedRow.localWorkerCategory;

        // Ta aktualizacja (domRowElement.querySelector('.task-search-input').value = newDesc; ) zostanie zrobiona przez updateModelAndRender
        // domRowElement.querySelector('.task-search-input').readOnly = true; // To też zrobi renderCostTable
        if (!isRestoringState && typeof appState !== 'undefined') appState.notify('taskCatalogChanged');

    } else { // Zapisz zmiany tylko lokalnie dla tego wiersza
        updatedRow.localDesc = newDesc;
        updatedRow.localUnit = newUnit;
        updatedRow.localWorkerCategory = newWorkerCategory;
        if (newNormR !== null) updatedRow.localNormR = newNormR; else delete updatedRow.localNormR;
        updatedRow.localNormsM = newNormsM_forLocalSave; // Now already an array of objects
        updatedRow.description = newDesc; // Upewnij się, że opis w modelu jest zgodny z lokalnym

        // Sprawdź, czy lokalnie zmieniony opis pasuje do katalogowej pozycji
        // Jeśli tak, ale to nie ta sama ID lub była to lokalna modyfikacja innej pozycji,
        // to nadal traktuj jako lokalną, ale usuń taskCatalogId.
        const matchedCatalogTask = newDesc ? await dbService.getItemByIndex(TASKS_CATALOG_STORE_NAME, 'description', newDesc) : null;
        if (matchedCatalogTask && matchedCatalogTask.id === taskCatalogId && !updatedRow.localDesc) {
            // Wiersz nadal jest powiązany z katalogiem i nie ma lokalnego nadpisania opisu (co jest OK)
        } else {
            // Jeśli opis się zmienił i nie pasuje do oryginalnej pozycji katalogowej
            // lub jest to zupełnie nowa lokalna pozycja
            delete updatedRow.taskCatalogId;
            delete updatedRow.originalCatalogDesc;
        }

        showNotification(`Pozycja "${newDesc || ''}" w tym wierszu kosztorysu została zaktualizowana (zmiany lokalne).`, 'info');
    }

    updatedRow.quantity = newQty; // Ilość zawsze z modala

    // Aktualizuj cały model i wyrenderuj tabelę. To zajmie się odświeżeniem DOM.
    const updatedRowsArray = [...currentEstimateModel.rows];
    updatedRowsArray[rowIndex] = updatedRow;
    await updateModelAndRender({ rows: updatedRowsArray });

    closeCustomTaskModal();
    return true;
}
async function saveModalData() { if (!currentEditContext) { console.error("Brak kontekstu edycji przy próbie zapisu modala."); return false; } let success = false; if (currentEditContext === 'new_custom' || currentEditContext === 'edit_custom') { success = await _saveOrUpdateCatalogTask(currentEditContext === 'edit_custom', currentEditingRef); } else if (currentEditContext === 'edit_row') { success = await _updateEstimateRowFromModal(currentEditingRef); } else { showNotification("Błąd zapisu. Nieznany kontekst edycji.", 'error'); return false; } // Zmieniono: updateModelAndRender jest już wywoływane w _saveOrUpdateCatalogTask i _updateEstimateRowFromModal
    return success; }
async function compareMaterialNorms(localNormsWithName, catalogNormsWithId) { if (!Array.isArray(localNormsWithName) && !Array.isArray(catalogNormsWithId)) return localNormsWithName === catalogNormsWithId; if (!Array.isArray(localNormsWithName) || !Array.isArray(catalogNormsWithId)) return true; if (localNormsWithName.length !== catalogNormsWithId.length) return true; if (localNormsWithName.length === 0 && catalogNormsWithId.length === 0) return false; const localNormsProcessed = []; for (const ln of localNormsWithName) { if (!ln.name) return true; const mat = await dbService.getItemByIndex(MATERIALS_CATALOG_STORE_NAME, 'name', ln.name); if (!mat) return true; localNormsProcessed.push({ materialId: mat.id, quantity: ln.quantity, unit: ln.unit || mat.unit }); } const sortedLocal = [...localNormsProcessed].sort((a, b) => a.materialId - b.materialId); const sortedCatalog = [...catalogNormsWithId].sort((a, b) => a.materialId - b.materialId); for (let i = 0; i < sortedLocal.length; i++) { if (sortedLocal[i].materialId !== sortedCatalog[i].materialId || sortedLocal[i].quantity !== sortedCatalog[i].quantity || (sortedLocal[i].unit || 'j.m.') !== (sortedCatalog[i].unit || 'j.m.')) return true; } return false; }

// ==========================================================================
// SEKCJA 6: OBSŁUGA MODALA DANYCH OGÓLNYCH KOSZTORYSU (bez zmian)
// ==========================================================================
function openEstimateDetailsModal() { if (!estimateDetailsModal || !modalEstimateTitleInput || !modalInvestmentLocationInput || !modalInvestorInfoInput || !modalContractorInfoInput || !modalVatRateSelect) { console.error("Brak wymaganych elementów DOM dla modala danych ogólnych."); return; } if (typeof appState === 'undefined') { console.error("appState nie jest zdefiniowany. Nie można otworzyć modala danych ogólnych."); return; } modalEstimateTitleInput.value = appState.getState('estimateTitle') || ''; modalInvestmentLocationInput.value = appState.getState('investmentLocation') || ''; modalInvestorInfoInput.value = appState.getState('investorInfo') || ''; modalContractorInfoInput.value = appState.getState('contractorInfo') || ''; modalVatRateSelect.value = appState.getState('vatRate') || '23'; if(estimateDetailsModal) estimateDetailsModal.style.display = 'block'; }
function closeEstimateDetailsModal() { if(estimateDetailsModal) estimateDetailsModal.style.display = 'none'; }
function saveEstimateDetailsFromModal() { if (!modalEstimateTitleInput || !modalInvestmentLocationInput || !modalInvestorInfoInput || !modalContractorInfoInput || !modalVatRateSelect) { showNotification("Błąd wewnętrzny: Brak elementów formularza danych ogólnych.", 'error'); return; } if (typeof appState === 'undefined') { console.error("appState nie jest zdefiniowany. Nie można zapisać danych ogólnych."); return; } appState.setState('estimateTitle', modalEstimateTitleInput.value.trim()); appState.setState('investmentLocation', modalInvestmentLocationInput.value.trim()); appState.setState('investorInfo', modalInvestorInfoInput.value.trim()); appState.setState('contractorInfo', modalContractorInfoInput.value.trim()); appState.setState('vatRate', modalVatRateSelect.value); showNotification("Dane ogólne kosztorysu zaktualizowane.", 'success'); closeEstimateDetailsModal(); if (typeof saveHistoryState === 'function' && !isRestoringState) saveHistoryState(); }

// ==========================================================================
// SEKCJA 7: OBSŁUGA SZABLONÓW (bez zmian)
// ==========================================================================
function loadTemplates() { return loadFromLocalStorage(STORAGE_KEYS.TEMPLATES, {}); }
function saveTemplates(templates) { saveToLocalStorage(STORAGE_KEYS.TEMPLATES, templates); }
function renderTemplatesList() { if (!templateSelect) return; const templates = loadTemplates(); templateSelect.innerHTML = ''; const templateNames = Object.keys(templates).sort((a, b) => a.localeCompare(b, 'pl')); if (templateNames.length === 0) { templateSelect.innerHTML = '<option value="" disabled>Brak zapisanych szablonów.</option>'; if (insertTemplateBtn) insertTemplateBtn.disabled = true; if (deleteTemplateBtn) deleteTemplateBtn.disabled = true; return; } templateNames.forEach(name => { const option = document.createElement('option'); option.value = name; option.textContent = name; if (templates[name].type === 'department') { option.classList.add('department-template'); option.textContent += " (Dział)"; } else { option.classList.add('estimate-template'); option.textContent += " (Kosztorys)"; } templateSelect.appendChild(option); }); const hasSelection = !!templateSelect.value; if (insertTemplateBtn) insertTemplateBtn.disabled = !hasSelection; if (deleteTemplateBtn) deleteTemplateBtn.disabled = !hasSelection; }
function openTemplatesModal() { if (templatesModal) { renderTemplatesList(); templatesModal.style.display = 'block'; }}
function closeTemplatesModal() { if (templatesModal) { templatesModal.style.display = 'none'; }}
async function handleInsertTemplate() {
    if (!templateSelect || !templateSelect.value) { showNotification("Wybierz szablon z listy.", 'warning'); return; }
    const templateName = templateSelect.value; const templates = loadTemplates(); const template = templates[templateName];
    if (!template || !Array.isArray(template.data)) { showNotification("Błąd: Nie można wczytać danych szablonu.", 'error'); return; }
    showConfirmNotification(`Wstawić szablon "${templateName}"${lastClickedRow ? ' po zaznaczonym wierszu' : ' na końcu kosztorysu'}?`, async () => {
        if(typeof saveHistoryState === 'function' && !isRestoringState) saveHistoryState(); isRestoringState = true;
        let insertAfterNode = lastClickedRow;

        // Przygotuj tablicę dla nowych wierszy, które mają zostać dodane do modelu
        let rowsToAdd = [];
        // Zmieniono: Jeśli tryb hierarchiczny nie jest aktywny, aktywuj go
        if (template.type === 'department' && !currentEstimateModel.isHierarchical) {
            currentEstimateModel.isHierarchical = true; // Zaktualizuj model
            appState.setState('isHierarchicalMode', true, true); // Zaktualizuj appState bez zapisu
        }
        // Upewnij się, że pierwszy wiersz to dział, jeśli tryb hierarchiczny
        if (currentEstimateModel.isHierarchical && !currentEstimateModel.rows.some(r => r.rowType === 'department')) {
             rowsToAdd.push({
                 rowType: 'department',
                 rowId: `dept-${Date.now()}-auto`,
                 text: 'Dział 1. (Ogólny)'
             });
        }


        for (const rowData of template.data) {
            let newRowDataForModel; // Będzie to obiekt dla modelu

            if (rowData.rowType === 'department' || rowData.rowType === 'subdepartment') {
                newRowDataForModel = {
                    rowType: rowData.rowType,
                    rowId: rowData.rowId || `${rowData.rowType}-${Date.now()}-${Math.random().toString(36).substring(2,7)}`, // Użyj istniejącego ID lub wygeneruj nowe
                    text: rowData.text || '',
                    notes: rowData.notes || ""
                };
                // Zainicjuj kolor w modelu dla nowo dodanego działu/poddziału
                if (!currentEstimateModel.departmentColors.hasOwnProperty(newRowDataForModel.rowId)) {
                    currentEstimateModel.departmentColors[newRowDataForModel.rowId] = null;
                }
            } else if (rowData.rowType === 'task'){
                // Przygotuj obiekt zadania dla modelu
                newRowDataForModel = {
                    rowType: 'task',
                    rowId: rowData.rowId || `task-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
                    quantity: rowData.quantity || 1,
                    notes: rowData.notes || ""
                };
                if (rowData.taskCatalogId) { // Jest powiązanie z katalogiem
                    newRowDataForModel.taskCatalogId = rowData.taskCatalogId;
                    const catalogTask = await dbService.getItem(TASKS_CATALOG_STORE_NAME, rowData.taskCatalogId);
                    newRowDataForModel.description = catalogTask ? catalogTask.description : "Błąd: Brak zadania w katalogu";
                    if (catalogTask) newRowDataForModel.originalCatalogDesc = catalogTask.description;
                } else { // Lokalna pozycja
                    newRowDataForModel.localDesc = rowData.description || '';
                    newRowDataForModel.description = rowData.description || '';
                }
                if (rowData.localUnit) newRowDataForModel.localUnit = rowData.localUnit;
                if (rowData.localNormR !== undefined) newRowDataForModel.localNormR = rowData.localNormR;
                if (rowData.localNormsM) newRowDataForModel.localNormsM = JSON.parse(JSON.stringify(rowData.localNormsM)); // Głęboka kopia
                if (rowData.localWorkerCategory) newRowDataForModel.localWorkerCategory = rowData.localWorkerCategory;
            }
            if (newRowDataForModel) {
                rowsToAdd.push(newRowDataForModel);
            }
        }

        let updatedRows = [...currentEstimateModel.rows];
        let insertIndex = -1;

        if (insertAfterNode && costTableBody.contains(insertAfterNode)) {
            const insertAfterRowId = insertAfterNode.dataset.rowId;
            insertIndex = updatedRows.findIndex(r => r.rowId === insertAfterRowId);
            if (insertIndex !== -1) insertIndex++; // Wstaw po tym wierszu
        } else {
            insertIndex = updatedRows.length; // Na koniec
        }

        if (insertIndex > -1 && insertIndex <= updatedRows.length) {
            updatedRows.splice(insertIndex, 0, ...rowsToAdd);
        } else {
            updatedRows.push(...rowsToAdd);
        }

        // Zmieniono: Wywołaj updateModelAndRender z pełnym zaktualizowanym modelem
        await updateModelAndRender({
            rows: updatedRows,
            departmentColors: currentEstimateModel.departmentColors, // Przekaż zaktualizowane kolory
            isHierarchical: currentEstimateModel.isHierarchical // Przekaż aktualny tryb hierarchiczny
        });

        isRestoringState = false; // Reset flag
        showNotification(`Szablon "${templateName}" został wstawiony.`, 'success');
        closeTemplatesModal();
    });
}
function handleDeleteTemplate() {
    if (!templateSelect || !templateSelect.value) { showNotification("Wybierz szablon do usunięcia.", 'warning'); return; }
    const templateName = templateSelect.value;
    showConfirmNotification(`Czy na pewno chcesz usunąć szablon "${templateName}"? Tej operacji nie można cofnąć.`, () => {
        const templates = loadTemplates();
        if (templates[templateName]) {
            delete templates[templateName]; saveTemplates(templates); renderTemplatesList();
            showNotification(`Szablon "${templateName}" został usunięty.`, 'info');
        } else { showNotification("Nie znaleziono szablonu do usunięcia.", 'error'); }
    });
}
async function saveTemplate(type) {
    let templateData = [];
    let defaultName = "";

    if (type === 'department') {
        if (!lastClickedRow || lastClickedRow.dataset.rowType !== 'department') {
            showNotification("Kliknij na nagłówek działu, który chcesz zapisać jako szablon.", 'warning');
            return;
        }
        const startRowId = lastClickedRow.dataset.rowId;
        const startIndex = currentEstimateModel.rows.findIndex(r => r.rowId === startRowId);
        if (startIndex === -1) {
            showNotification("Błąd: Nie znaleziono zaznaczonego działu w modelu.", 'error');
            return;
        }

        // Pobierz dane z modelu
        const departmentRowObject = currentEstimateModel.rows[startIndex];
        defaultName = departmentRowObject.text || `Szablon działu ${new Date().toLocaleDateString()}`;
        templateData.push(JSON.parse(JSON.stringify(departmentRowObject))); // Głęboka kopia

        // Pobierz dzieci działu z modelu
        let currentIndex = startIndex + 1;
        while (currentIndex < currentEstimateModel.rows.length && currentEstimateModel.rows[currentIndex].rowType !== 'department') {
            templateData.push(JSON.parse(JSON.stringify(currentEstimateModel.rows[currentIndex]))); // Głęboka kopia
            currentIndex++;
        }
    } else { // type === 'estimate'
        defaultName = (typeof appState !== 'undefined' ? appState.getState('estimateTitle') : 'Kosztorys') || `Szablon kosztorysu ${new Date().toLocaleDateString('pl-PL')}`;
        // Zmieniono: Pobierz wszystkie wiersze bezpośrednio z currentEstimateModel
        templateData = JSON.parse(JSON.stringify(currentEstimateModel.rows)); // Głęboka kopia
    }

    if (templateData.length === 0) {
        showNotification("Brak pozycji do zapisania w szablonie.", 'info');
        return;
    }

    const templateName = prompt(`Podaj nazwę dla szablonu (${type === 'department' ? 'Dział' : 'Kosztorys'}):`, defaultName);
    if (!templateName || templateName.trim() === "") {
        showNotification("Nazwa szablonu nie może być pusta.", 'warning');
        return;
    }

    const templates = loadTemplates();
    if (templates[templateName.trim()]) {
        showConfirmNotification(`Szablon "${templateName.trim()}" już istnieje. Nadpisać?`, () => {
            templates[templateName.trim()] = { type: type, data: templateData, savedAt: new Date().toISOString() };
            saveTemplates(templates);
            showNotification(`Szablon "${templateName.trim()}" został nadpisany.`, 'success');
            if (templatesModal && templatesModal.style.display === 'block') renderTemplatesList();
        });
    } else {
        templates[templateName.trim()] = { type: type, data: templateData, savedAt: new Date().toISOString() };
        saveTemplates(templates);
        showNotification(`Szablon "${templateName.trim()}" został zapisany.`, 'success');
        if (templatesModal && templatesModal.style.display === 'block') renderTemplatesList();
    }
}

// ==========================================================================
// SEKCJA 8: OPERACJE WEJŚCIA/WYJŚCIA (PLIKI KOSZTORYSU, CSV)
// ==========================================================================
async function loadFullState(loadedData) {
    if(!costTableBody) { console.error("Tabela kosztorysu nie istnieje, nie można wczytać stanu."); return; }
    // Zmieniono: Czysto logiczne czyszczenie DOM i modelu.
    costTableBody.innerHTML = '';
    chapterSums = {};
    isRestoringState = true;

    // Zmieniono: Aktualizujemy currentEstimateModel
    currentEstimateModel.rows = Array.isArray(loadedData.estimateRows) ? JSON.parse(JSON.stringify(loadedData.estimateRows)) : [];
    currentEstimateModel.departmentColors = loadedData.departmentColors ? JSON.parse(JSON.stringify(loadedData.departmentColors)) : {};
    currentEstimateModel.isHierarchical = loadedData.isHierarchicalMode === undefined ? false : loadedData.isHierarchicalMode;


    if (typeof appState !== 'undefined') {
        appState.setState('estimateTitle', loadedData.estimateTitle || 'Kosztorys bez tytułu', true);
        appState.setState('investmentLocation', loadedData.investmentLocation || '', true);
        appState.setState('investorInfo', loadedData.investorInfo || '', true);
        appState.setState('contractorInfo', loadedData.contractorInfo || '', true);
        appState.setState('vatRate', loadedData.vatRate !== undefined ? loadedData.vatRate : '23', true);
        // isHierarchicalMode w appState jest teraz ustawiane przez updateModelAndRender, gdy currentEstimateModel.isHierarchical się zmienia.
        // appState.setState('isHierarchicalMode', loadedData.isHierarchicalMode === undefined ? false : loadedData.isHierarchicalMode, true);
        appState.setState('useSameRateForAllSpecialists', loadedData.useSameRateForAllSpecialists === undefined ? true : loadedData.useSameRateForAllSpecialists, true);
        if (loadedData.workerRatesSettings) appState.setState('workerRatesSettings', loadedData.workerRatesSettings, true);
        else if (loadedData.laborRates) {
            const newRates = JSON.parse(JSON.stringify(appState.getState('workerRatesSettings') || DEFAULT_WORKER_RATES_SETTINGS));
            Object.keys(loadedData.laborRates).forEach(catCode => {
                if (newRates[catCode] && loadedData.laborRates[catCode].hasOwnProperty('rate')) newRates[catCode].rate = parseFloat(loadedData.laborRates[catCode].rate) || 0;
            });
            appState.setState('workerRatesSettings', newRates, true);
        }
        // Wczytaj ustawienia autozapisu, jeśli istnieją w pliku
        if (loadedData.hasOwnProperty('autoSaveEnabled')) {
            appState.setState('autoSaveEnabled', loadedData.autoSaveEnabled, true);
        }
        if (loadedData.hasOwnProperty('autoSaveIntervalMinutes')) {
            appState.setState('autoSaveIntervalMinutes', parseInt(loadedData.autoSaveIntervalMinutes, 10) || 5, true);
        }

        appState.saveState();
    }

    if (modalEstimateTitleInput && typeof appState !== 'undefined') modalEstimateTitleInput.value = appState.getState('estimateTitle');
    const vatDisplay = document.getElementById('modal-vat-rate-display');
    if(vatDisplay && typeof appState !== 'undefined') vatDisplay.value = appState.getState('currentVatDisplayValue');
    if(useSameRateCheckbox && typeof appState !== 'undefined') useSameRateCheckbox.checked = appState.getState('useSameRateForAllSpecialists');
    const ogolnobudowlanyRateInput = document.getElementById('rate-labor-ogolnobudowlany');
    if (ogolnobudowlanyRateInput && typeof appState !== 'undefined') setNumericInputValue(ogolnobudowlanyRateInput, appState.getState('workerRatesSettings').ogolnobudowlany?.rate || 0);
    // Zmieniono: activateHierarchicalMode jest wywoływana przez updateModelAndRender
    // if (typeof activateHierarchicalMode === 'function' && typeof appState !== 'undefined') activateHierarchicalMode(appState.getState('isHierarchicalMode'));

    // Odśwież kontrolki autozapisu
    if (autoSaveEnabledCheckbox) autoSaveEnabledCheckbox.checked = appState.getState('autoSaveEnabled');
    if (autoSaveIntervalSelect) autoSaveIntervalSelect.value = appState.getState('autoSaveIntervalMinutes').toString();
    if (autoSaveIntervalGroup) autoSaveIntervalGroup.style.display = appState.getState('autoSaveEnabled') ? 'block' : 'none';
    if (typeof startAutoSaveTimer === 'function') startAutoSaveTimer(); // Zrestartuj timer autozapisu

    if (loadedData.tasksCatalog && Array.isArray(loadedData.tasksCatalog)) {
        await dbService.clearStore(TASKS_CATALOG_STORE_NAME);
        for (const task of loadedData.tasksCatalog) { delete task.id; await dbService.addItem(TASKS_CATALOG_STORE_NAME, task); }
        if(!isRestoringState && typeof appState !== 'undefined') appState.notify('taskCatalogChanged');
    }
    if (loadedData.materialsCatalog && Array.isArray(loadedData.materialsCatalog)) {
        await dbService.clearStore(MATERIALS_CATALOG_STORE_NAME);
        for (const material of loadedData.materialsCatalog) { delete material.id; await dbService.addItem(MATERIALS_CATALOG_STORE_NAME, material); }
        if(!isRestoringState && typeof appState !== 'undefined') appState.notify('materialCatalogChanged');
    }
    if (typeof StyleConfiguratorModule !== 'undefined' && StyleConfiguratorModule.applyUserStylesFromObject && loadedData.userStyles) {
        StyleConfiguratorModule.applyUserStylesFromObject(loadedData.userStyles);
    }

    // Zmieniono: Wywołujemy renderCostTable dla zaktualizowanego currentEstimateModel
    if (typeof renderCostTable === 'function') {
        await renderCostTable(currentEstimateModel);
    }

    isRestoringState = false; // Musi być false przed wywołaniem updateModelAndRender, aby historia działała poprawnie
    // Zmieniono: updateModelAndRender zostanie wywołane, ponieważ currentEstimateModel został zmieniony
    // i isRestoringState jest teraz false, co w triggerze appState.setState('isHierarchicalMode')
    // powinno wywołać updateModelAndRender.
    // Jeśli nie, dodaj tu jawne wywołanie:
    // await updateModelAndRender({ rows: currentEstimateModel.rows, departmentColors: currentEstimateModel.departmentColors, isHierarchical: currentEstimateModel.isHierarchical });


    // Ponieważ isRestoringState zmienia się na false, a currentEstimateModel został zmieniony,
    // updateModelAndRender zostanie automatycznie wywołane, co spowoduje zapis historii i localStorage.

    if (typeof updateDynamicSpecialistRatesVisibility === 'function') await updateDynamicSpecialistRatesVisibility();

    showNotification("Kosztorys i jego dane zostały wczytane z pliku.", 'success');
}

async function saveEstimateToFile() {
    const currentEstimateTitle = typeof appState !== 'undefined' ? appState.getState('estimateTitle') : 'kosztorys';
    const safeEstimateTitle = currentEstimateTitle ? currentEstimateTitle.replace(/[^\wąćęłńóśźżĄĆĘŁŃÓŚŻŹ\s.-]/gi, '').replace(/\s+/g, '_') : 'kosztorys_eazykoszt';
    const defaultFileName = `${safeEstimateTitle}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.eazykoszt`;
    const fileName = prompt("Podaj nazwę pliku (.eazykoszt):", defaultFileName);
    if (!fileName) return;
    const finalFileName = fileName.toLowerCase().endsWith('.eazykoszt') ? fileName : `${fileName.replace(/\.json$|\.kpdef$|\.polkoszt$|\.kosztpol$/i, '')}.eazykoszt`;

    // Zmieniono: Pobieramy dane z currentEstimateModel
    const currentFullEstimateState = getCurrentEstimateDisplayState(); // Pobiera z currentEstimateModel
    const userStyles = (typeof StyleConfiguratorModule !== 'undefined' && StyleConfiguratorModule.STORAGE_KEY_STYLES) ? JSON.parse(localStorage.getItem(StyleConfiguratorModule.STORAGE_KEY_STYLES) || '{}') : {};
    const tasksCatalogToSave = await dbService.getAllItems(TASKS_CATALOG_STORE_NAME);
    const materialsCatalogToSave = await dbService.getAllItems(MATERIALS_CATALOG_STORE_NAME);

    const dataToSave = {
        appVersion: typeof APP_VERSION !== 'undefined' ? APP_VERSION : "EazyKoszt_Unknown",
        savedAt: new Date().toISOString(),
        estimateTitle: appState.getState('estimateTitle'),
        investmentLocation: appState.getState('investmentLocation'),
        investorInfo: appState.getState('investorInfo'),
        contractorInfo: appState.getState('contractorInfo'),
        vatRate: appState.getState('vatRate'),
        isHierarchicalMode: appState.getState('isHierarchicalMode'),
        useSameRateForAllSpecialists: appState.getState('useSameRateForAllSpecialists'),
        workerRatesSettings: appState.getState('workerRatesSettings'),
        autoSaveEnabled: appState.getState('autoSaveEnabled'), // Dodano
        autoSaveIntervalMinutes: appState.getState('autoSaveIntervalMinutes'), // Dodano
        departmentColors: currentFullEstimateState.departmentColors,
        userStyles: userStyles,
        estimateRows: currentFullEstimateState.rows,
        tasksCatalog: tasksCatalogToSave,
        materialsCatalog: materialsCatalogToSave
    };
    try {
        const dataStr = JSON.stringify(dataToSave, null, 2);
        const blob = new Blob([dataStr], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = finalFileName;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        showNotification(`Kosztorys zapisany do pliku: ${finalFileName}`, 'success');
    } catch (error) {
        console.error("Błąd podczas tworzenia pliku do zapisu:", error);
        showNotification("Wystąpił błąd podczas przygotowywania pliku do zapisu.", 'error');
    }
}
function handleLoadEstimateFile(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const loadedData = JSON.parse(e.target.result);
            if(!loadedData.appVersion || (!loadedData.appVersion.startsWith("KOSZTPOL") && !loadedData.appVersion.startsWith("EazyKoszt"))) {
                showNotification("To nie jest prawidłowy plik KOSZTPOL/EazyKoszt lub jest z niekompatybilnej wersji.", 'error', 7000);
                if (loadEstimateFileInput) loadEstimateFileInput.value = null; return;
            }
            showConfirmNotification(`Wczytać plik "${file.name}"?<br>Obecny stan kosztorysu, ustawień oraz katalogów (jeśli są w pliku) zostanie nadpisany.`, async () => {
                await loadFullState(loadedData);
            }, () => {
                if (loadEstimateFileInput) loadEstimateFileInput.value = null;
            });
        } catch (error) {
            console.error("Błąd wczytywania pliku kosztorysu:", error);
            showNotification(`Błąd wczytywania pliku: ${error.message}.\nUpewnij się, że plik jest poprawnym plikiem JSON aplikacji.`, 'error', 7000);
        } finally {
        }
    };
    reader.onerror = () => { showNotification("Błąd odczytu pliku. Spróbuj ponownie.", 'error'); if (loadEstimateFileInput) loadEstimateFileInput.value = null; };
    reader.readAsText(file);
}
function handleCsvFileLoad(event) { selectedCsvFile = event.target.files[0]; if(loadCsvButton) loadCsvButton.disabled = !selectedCsvFile; }
async function processCsvFile() { if (!selectedCsvFile) { showNotification("Wybierz plik CSV/TXT z cenami materiałów.", 'warning'); return; } const reader = new FileReader(); reader.onload = async (e) => { const csvText = e.target.result; const lines = csvText.split(/\r\n|\n/); let updatedCount = 0, skippedCount = 0; for (const line of lines) { if (!line.trim()) { skippedCount++; continue; } const columns = line.split(/[,;\t]/); if (columns.length >= 2) { const name = columns[0].trim(); const priceString = columns[1].trim().replace(',', '.'); const price = parseFloat(priceString); if (name && !isNaN(price) && price >= 0) { const existingMaterial = await dbService.getItemByIndex(MATERIALS_CATALOG_STORE_NAME, 'name', name); if (existingMaterial) { const oldPriceY = existingMaterial.priceY; existingMaterial.priceY = price; if (existingMaterial.priceX === oldPriceY || existingMaterial.priceX === null || existingMaterial.priceX === undefined) existingMaterial.priceX = price; existingMaterial.updatedAt = new Date().toISOString(); await dbService.updateItem(MATERIALS_CATALOG_STORE_NAME, existingMaterial); updatedCount++; } else { console.log(`Materiał "${name}" z CSV nie znaleziony w katalogu. Pomijam.`); skippedCount++; } } else { console.warn(`Pominięto linię z CSV (nieprawidłowa nazwa lub cena): "${line}"`); skippedCount++; } } else { console.warn(`Pominięto linię z CSV (za mało kolumn): "${line}"`); skippedCount++; } } if (updatedCount > 0) { if (!isRestoringState && typeof appState !== 'undefined') appState.notify('materialPricesImported'); showNotification(`Zaimportowano ceny z pliku.\nZaktualizowano: ${updatedCount}\nPominięto linii: ${skippedCount}.`, 'success', 7000); } else { showNotification(`Nie zaktualizowano żadnych cen z pliku CSV. Sprawdź format pliku i nazwy materiałów.\nPominięto linii: ${skippedCount}.`, 'warning', 7000); } if (csvFileInput) csvFileInput.value = null; selectedCsvFile = null; if (loadCsvButton) loadCsvButton.disabled = true; }; reader.onerror = () => { showNotification("Błąd odczytu pliku CSV/TXT.", 'error'); if (csvFileInput) csvFileInput.value = null; selectedCsvFile = null; if (loadCsvButton) loadCsvButton.disabled = true; }; reader.readAsText(selectedCsvFile, 'UTF-8'); }

// ==========================================================================
// SEKCJA 9: OBSŁUGA WYDRUKÓW (bez zmian)
// ==========================================================================
// ==========================================================================
// SEKCJA 9: OBSŁUGA WYDRUKÓW (bez zmian)
// ==========================================================================
function openPrintSelectionModal() { if(printSelectionModal) printSelectionModal.style.display = 'block'; }
function closePrintSelectionModal() { if(printSelectionModal) printSelectionModal.style.display = 'none'; }
function generatePrintWindow(title, combinedContent, extraCss = "") {
    const printWindow = window.open('', '_blank', 'width=1000,height=700,scrollbars=yes,resizable=yes');
    if (!printWindow) {
        showNotification("Nie można otworzyć okna wydruku. Sprawdź, czy blokada wyskakujących okienek jest wyłączona.", 'error', 7000);
        return;
    }
    const printDoc = printWindow.document;
    printDoc.open();
    printDoc.write(`<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8"><title>${title}</title><link rel="stylesheet" href="print-style.css" media="all"><style>${(typeof StyleConfiguratorModule !== 'undefined' && StyleConfiguratorModule.getUserPrintStylesCss) ? StyleConfiguratorModule.getUserPrintStylesCss() : ''}${extraCss}</style></head><body>${combinedContent}</body></html>`);
    printDoc.close();
    const printButton = printWindow.document.createElement('button');
    printButton.textContent = 'DRUKUJ';
    printButton.className = 'print-button-print-view'; 
    printButton.style.cssText = `position: fixed; top: 10px; right: 10px; padding: 8px 15px; background-color: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; z-index: 10000; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 14px;`;
    printButton.onclick = () => printWindow.print();
    printWindow.document.body.insertBefore(printButton, printWindow.document.body.firstChild);
}
function getCoverPageContent() { const today = new Date().toLocaleDateString('pl-PL'); const titleVal = (typeof appState !== 'undefined' ? appState.getState('estimateTitle') : 'Kosztorys'); const locationVal = (typeof appState !== 'undefined' ? appState.getState('investmentLocation') : '_'); const investorVal = (typeof appState !== 'undefined' ? appState.getState('investorInfo') : '_'); const contractorVal = (typeof appState !== 'undefined' ? appState.getState('contractorInfo') : '_'); return `<div class="container print-page"><h1>${titleVal}</h1><div class="section details" style="margin-top:30mm;"><h2>Dane Ogólne</h2><p><strong>Tytuł opracowania:</strong> ${titleVal}</p><p><strong>Miejsce inwestycji:</strong> ${locationVal}</p><p><strong>Inwestor:</strong> ${investorVal}</p><p><strong>Wykonawca:</strong> ${contractorVal}</p><p><strong>Data sporządzenia:</strong> ${today}</p></div><div class="signatures" style="margin-top:50mm;"><div style="float:left;width:40%;text-align:center;"><p>........................................</p><p>(Podpis Inwestora)</p></div><div style="float:right;width:40%;text-align:center;"><p>........................................</p><p>(Podpis Wykonawcy)</p></div><div style="clear:both;"></div></div></div>`; }
async function getEstimateDetailContent() {
    let tableRowsHtml = '';
    let grandTotalVal = 0;
    let currentDepartmentTitle = null;
    let currentDepartmentId = null;
    let departmentRowsBuffer = [];
    let simpleRowCounter = 0;

    const shouldPrintNotes = document.getElementById('print-notes-detail')?.checked;

    // Pobieramy dane bezpośrednio z modelu
    const modelRows = currentEstimateModel.rows;
    const isHierarchical = currentEstimateModel.isHierarchical;

    for (const rowObject of modelRows) { // Iterujemy po obiekcie, a nie DOM
        const rowType = rowObject.rowType;
        const rowId = rowObject.rowId;
        const notes = rowObject.notes || "";

        // Kolorowanie wierszy dla wydruku - pobieramy z modelu
        const rowBgColor = currentEstimateModel.departmentColors[rowId] || null;
        let effectiveBgColor = '';
        let effectiveTextColor = '';

        // Ta logika `finalRowColor` i `finalTextColor` jest taka sama, jak w `renderCostTable` w `script-estimate.js`
        // Aby zapewnić spójność kolorowania w wydrukach.
        if (rowBgColor) {
            effectiveBgColor = rowBgColor;
            effectiveTextColor = getContrastTextColor(rowBgColor);
        } else if (rowType === 'task') {
            const defaultTaskBg = appState.getState('defaultTaskRowBackgroundColor');
            if (defaultTaskBg && defaultTaskBg !== 'transparent' && defaultTaskBg !== 'inherit') {
                effectiveBgColor = defaultTaskBg;
                effectiveTextColor = getContrastTextColor(defaultTaskBg);
            }
        } else if (rowType === 'subdepartment') {
            let parentDeptRowObject = null;
            const currentIndex = modelRows.findIndex(r => r.rowId === rowId);
            if (currentIndex > 0) {
                let i = currentIndex - 1;
                while(i >= 0) {
                    if (modelRows[i].rowType === 'department') {
                        parentDeptRowObject = modelRows[i];
                        break;
                    }
                    i--;
                }
            }
            if (parentDeptRowObject && currentEstimateModel.departmentColors[parentDeptRowObject.rowId]) {
                const parentDeptColor = currentEstimateModel.departmentColors[parentDeptRowObject.rowId];
                let subDeptCounter = 0;
                let j = (parentDeptRowObject ? modelRows.findIndex(r => r.rowId === parentDeptRowObject.rowId) : -1) + 1;
                while (j < currentIndex) {
                    if (modelRows[j].rowType === 'subdepartment') {
                        subDeptCounter++;
                    }
                    j++;
                }
                const lightenIndex = subDeptCounter % SUBDEPARTMENT_LIGHTEN_PERCENTAGES.length;
                const lightenPercentage = SUBDEPARTMENT_LIGHTEN_PERCENTAGES[lightenIndex];
                effectiveBgColor = lightenHexColor(parentDeptColor, lightenPercentage);
            }
            effectiveTextColor = effectiveBgColor ? getContrastTextColor(effectiveBgColor) : '';
        }

        const styleAttr = effectiveBgColor ? `style="background-color: ${effectiveBgColor} !important; color: ${effectiveTextColor} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;"` : "";

        let lp = '?'; // LP zostanie uzupełnione przez nową logikę
        const domRowRef = costTableBody.querySelector(`tr[data-row-id="${rowId}"]`); // Pobierz DOM, aby odczytać LP
        if (domRowRef) lp = domRowRef.cells[1]?.textContent || '?'; // Tymczasowo odczytujemy LP z DOM

        if (!isHierarchical && rowType === 'task') {
            simpleRowCounter++;
            lp = `${simpleRowCounter}.`;
        }

        if (rowType === 'department' && isHierarchical) {
            if(currentDepartmentTitle !== null && departmentRowsBuffer.length > 0) {
                // Suma działu będzie pobierana z `chapterSums`
                const deptSum = chapterSums[currentDepartmentId] !== undefined ? formatCurrency(chapterSums[currentDepartmentId]) : '0.00';
                tableRowsHtml += departmentRowsBuffer.join('');
                tableRowsHtml += `<tr class="department-summary-print"><td colspan="7">PODSUMOWANIE DZIAŁU: ${currentDepartmentTitle}</td><td style="text-align:right;">${deptSum}</td></tr>`;
                departmentRowsBuffer = [];
            }
            currentDepartmentTitle = rowObject.text || `Dział ${lp}`;
            currentDepartmentId = rowId;
            tableRowsHtml += `<tr class="department-row-print" ${styleAttr}><td colspan="7">${lp} ${currentDepartmentTitle}</td><td class="department-total-value" style="text-align:right;">${chapterSums[currentDepartmentId] !== undefined ? formatCurrency(chapterSums[currentDepartmentId]) : '0.00'}</td></tr>`;
            if (shouldPrintNotes && notes) {
                tableRowsHtml += `<tr><td colspan="8"><div class="print-notes" style="padding-left:15px;">Notatka do działu: ${notes.replace(/\n/g, '<br>')}</div></td></tr>`;
            }
        } else if (rowType === 'subdepartment' && isHierarchical) {
            const subDeptTitle = rowObject.text || `Poddział ${lp}`;
            tableRowsHtml += `<tr class="subdepartment-row-print" ${styleAttr}><td colspan="7" style="padding-left:15px;">${lp} ${subDeptTitle}</td><td class="subdepartment-total-value" style="text-align:right;">${chapterSums[rowId] !== undefined ? formatCurrency(chapterSums[rowId]) : '0.00'}</td></tr>`;
            if (shouldPrintNotes && notes) {
                tableRowsHtml += `<tr><td colspan="8"><div class="print-notes" style="padding-left:30px;">Notatka do poddziału: ${notes.replace(/\n/g, '<br>')}</div></td></tr>`;
            }
        } else if (rowType === 'task') {
            const taskCatalogId = rowObject.taskCatalogId;
            let baseTask = taskCatalogId ? await dbService.getItem(TASKS_CATALOG_STORE_NAME, taskCatalogId) : null;

            const description = rowObject.localDesc || (baseTask ? baseTask.description : rowObject.description) || ''; // description z modelu jest już primary
            const unit = rowObject.localUnit || (baseTask ? baseTask.unit : rowObject.unit) || '?';
            const quantityVal = rowObject.quantity; // Ilość z modelu
            const quantity = formatCurrency(quantityVal, 3);

            // Musimy obliczyć ceny jednostkowe R i M, oraz wartość, bo nie są one przechowywane w modelu wiersza
            // Pobieramy normy z rowObject lub z katalogu
            let normRVal = rowObject.localNormR !== undefined ? rowObject.localNormR : (baseTask?.norms?.R);
            let normsM_source_print = rowObject.localNormsM ? JSON.parse(JSON.stringify(rowObject.localNormsM)) : (baseTask?.norms?.M);
            let workerCat = rowObject.localWorkerCategory || (baseTask?.workerCategory || 'ogolnobudowlany');

            const laborRate = getLaborRateForWorkerCategory(workerCat);
            let unitPriceR = 0;
            if (typeof normRVal === 'number' && normRVal >= 0) unitPriceR = normRVal * laborRate;

            let unitPriceM = 0;
            const materialNormsStrings_print = [];
            if (Array.isArray(normsM_source_print)) {
                for (const matNorm of normsM_source_print) {
                    let matNameForPrint, matUnitForPrint;
                    let materialMarketPrice = 0;
                    if (matNorm.materialId) {
                        const matFromDb = await dbService.getItem(MATERIALS_CATALOG_STORE_NAME, matNorm.materialId);
                        matNameForPrint = matFromDb ? matFromDb.name : `Nieznany (ID: ${matNorm.materialId})`;
                        matUnitForPrint = matNorm.unit || (matFromDb ? matFromDb.unit : 'j.m.');
                        materialMarketPrice = matFromDb ? (matFromDb.priceY || 0) : 0;
                    } else if (matNorm.name) {
                        matNameForPrint = matNorm.name;
                        const matFromDbByName = await dbService.getItemByIndex(MATERIALS_CATALOG_STORE_NAME, 'name', matNorm.name.trim());
                        if (matFromDbByName) {
                            materialMarketPrice = matFromDbByName.priceY || 0;
                            matUnitForPrint = matNorm.unit || matFromDbByName.unit || 'j.m.';
                        } else {
                            matUnitForPrint = matNorm.unit || 'j.m.';
                            materialMarketPrice = 0;
                        }
                    } else { continue; }
                    if (matNameForPrint && typeof matNorm.quantity === 'number' && matNorm.quantity > 0) {
                        unitPriceM += matNorm.quantity * materialMarketPrice;
                        materialNormsStrings_print.push(`${matNameForPrint}: ${matNorm.quantity.toFixed(3)} ${matUnitForPrint}`);
                    }
                }
            }

            const priceR = formatCurrency(unitPriceR);
            const priceM = formatCurrency(unitPriceM);
            const unitPriceTotal = unitPriceR + unitPriceM;
            const priceTotal = formatCurrency(unitPriceTotal);
            const value = formatCurrency(quantityVal * unitPriceTotal);
            grandTotalVal += quantityVal * unitPriceTotal; // Aktualizuj sumę całkowitą

            let normsTextR_print = `<strong>R (${getWorkerCategoryName(workerCat)}):</strong> -`;
            if (typeof normRVal === 'number' && normRVal >= 0) {
                normsTextR_print = `<strong>R (${getWorkerCategoryName(workerCat)}):</strong> ${normRVal.toFixed(3)} ${unit || 'j.m.'}`;
            }

            let finalNormsText_print = normsTextR_print;
            if (materialNormsStrings_print.length > 0) {
                finalNormsText_print += `<br><strong>M:</strong> ${materialNormsStrings_print.join('<br>   ')}`;
            } else {
                finalNormsText_print += `<br><strong>M:</strong> -`;
            }
            const showNorms_print = (typeof normRVal === 'number' && normRVal > 0) || (materialNormsStrings_print.length > 0);
            const normsHtml = showNorms_print ? `<div class="norms-display">${finalNormsText_print}</div>` : "";

            const taskNotesHtml = (shouldPrintNotes && notes) ? `<div class="print-notes">${notes.replace(/\n/g, '<br>')}</div>` : "";

            const rowContent = `<tr ${styleAttr}><td>${lp}</td><td>${description}${normsHtml}${taskNotesHtml}</td><td style="text-align:center;">${unit}</td><td style="text-align:right;">${quantity}</td><td style="text-align:right;">${priceR}</td><td style="text-align:right;">${priceM}</td><td style="text-align:right;">${priceTotal}</td><td style="text-align:right;">${value}</td></tr>`;
            if (isHierarchical) departmentRowsBuffer.push(rowContent);
            else tableRowsHtml += rowContent;
        }
    }

    if (isHierarchical && currentDepartmentTitle !== null && departmentRowsBuffer.length > 0) {
        const deptSum = chapterSums[currentDepartmentId] !== undefined ? formatCurrency(chapterSums[currentDepartmentId]) : '0.00';
        tableRowsHtml += departmentRowsBuffer.join('');
        tableRowsHtml += `<tr class="department-summary-print"><td colspan="7">PODSUMOWANIE DZIAŁU: ${currentDepartmentTitle}</td><td style="text-align:right;">${deptSum}</td></tr>`;
    } else if (isHierarchical && departmentRowsBuffer.length > 0) { // Jeśli były jakieś poddziały/zadania bez nadrzędnego działu
        tableRowsHtml += departmentRowsBuffer.join('');
    }

    return `<div class="print-page"><h1>Kosztorys Szczegółowy</h1><hr><table><thead><tr><th>L.p.</th><th>Pozycja/Normy/Notatki</th><th style="text-align:center;">j.m.</th><th style="text-align:right;">Obmiar</th><th style="text-align:right;">Cena jedn. R</th><th style="text-align:right;">Cena jedn. M</th><th style="text-align:right;">Cena jedn.</th><th style="text-align:right;">Wartość</th></tr></thead><tbody>${tableRowsHtml}</tbody><tfoot><tr><td colspan="7" style="text-align:right;font-weight:bold;">SUMA NETTO:</td><td style="text-align:right;font-weight:bold;">${formatCurrency(grandTotalVal)}</td></tr></tfoot></table></div>`;
}
async function getEstimatePositionsContent() {
    let tableRowsHtml = '';
    let grandTotalVal = 0;
    let currentDepartmentTitle = null;
    let currentDepartmentId = null;
    let departmentRowsBuffer = [];
    let simpleRowCounter = 0;

    // Pobieramy dane bezpośrednio z modelu
    const modelRows = currentEstimateModel.rows;
    const isHierarchical = currentEstimateModel.isHierarchical;

    for(const rowObject of modelRows){ // Iterujemy po obiekcie, a nie DOM
        const rowType = rowObject.rowType;
        const rowId = rowObject.rowId;

        // Kolorowanie wierszy dla wydruku (podobna logika jak w getEstimateDetailContent)
        const rowBgColor = currentEstimateModel.departmentColors[rowId] || null;
        let effectiveBgColor = '';
        let effectiveTextColor = '';
        if (rowBgColor) {
            effectiveBgColor = rowBgColor;
            effectiveTextColor = getContrastTextColor(rowBgColor);
        } else if (rowType === 'task') {
            const defaultTaskBg = appState.getState('defaultTaskRowBackgroundColor');
            if (defaultTaskBg && defaultTaskBg !== 'transparent' && defaultTaskBg !== 'inherit') {
                effectiveBgColor = defaultTaskBg;
                effectiveTextColor = getContrastTextColor(defaultTaskBg);
            }
        } else if (rowType === 'subdepartment') {
            let parentDeptRowObject = null;
            const currentIndex = modelRows.findIndex(r => r.rowId === rowId);
            if (currentIndex > 0) {
                let i = currentIndex - 1;
                while(i >= 0) {
                    if (modelRows[i].rowType === 'department') {
                        parentDeptRowObject = modelRows[i];
                        break;
                    }
                    i--;
                }
            }
            if (parentDeptRowObject && currentEstimateModel.departmentColors[parentDeptRowObject.rowId]) {
                const parentDeptColor = currentEstimateModel.departmentColors[parentDeptRowObject.rowId];
                let subDeptCounter = 0;
                let j = (parentDeptRowObject ? modelRows.findIndex(r => r.rowId === parentDeptRowObject.rowId) : -1) + 1;
                while (j < currentIndex) {
                    if (modelRows[j].rowType === 'subdepartment') {
                        subDeptCounter++;
                    }
                    j++;
                }
                const lightenIndex = subDeptCounter % SUBDEPARTMENT_LIGHTEN_PERCENTAGES.length;
                const lightenPercentage = SUBDEPARTMENT_LIGHTEN_PERCENTAGES[lightenIndex];
                effectiveBgColor = lightenHexColor(parentDeptColor, lightenPercentage);
            }
            effectiveTextColor = effectiveBgColor ? getContrastTextColor(effectiveBgColor) : '';
        }
        const styleAttr = effectiveBgColor ? `style="background-color: ${effectiveBgColor} !important; color: ${effectiveTextColor} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;"` : "";

        let lp = '?';
        const domRowRef = costTableBody.querySelector(`tr[data-row-id="${rowId}"]`);
        if (domRowRef) lp = domRowRef.cells[1]?.textContent || '?';

        if (!isHierarchical && rowType === 'task') {
            simpleRowCounter++;
            lp = `${simpleRowCounter}.`;
        }

        if (rowType === 'department' && isHierarchical) {
            if(currentDepartmentTitle !== null && departmentRowsBuffer.length > 0) {
                tableRowsHtml += departmentRowsBuffer.join('');
                departmentRowsBuffer = [];
            }
            currentDepartmentTitle = rowObject.text || `Dział ${lp}`;
            currentDepartmentId = rowId;
            tableRowsHtml += `<tr class="department-row-print" ${styleAttr}><td colspan="4">${lp} ${currentDepartmentTitle}</td><td class="department-total-value" style="text-align:right;">${chapterSums[currentDepartmentId] !== undefined ? formatCurrency(chapterSums[currentDepartmentId]) : '0.00'}</td></tr>`;
        } else if (rowType === 'subdepartment' && isHierarchical) {
            const subDeptTitle = rowObject.text || `Poddział ${lp}`;
            tableRowsHtml += `<tr class="subdepartment-row-print" ${styleAttr}><td colspan="4" style="padding-left:15px;">${lp} ${subDeptTitle}</td><td class="subdepartment-total-value" style="text-align:right;">${chapterSums[rowId] !== undefined ? formatCurrency(chapterSums[rowId]) : '0.00'}</td></tr>`;
        } else if (rowType === 'task') {
            const taskCatalogId = rowObject.taskCatalogId;
            let baseTaskDesc = "";
            if (taskCatalogId) {
                const task = await dbService.getItem(TASKS_CATALOG_STORE_NAME, taskCatalogId);
                if(task) baseTaskDesc = task.description;
            }
            const description = rowObject.localDesc || baseTaskDesc || rowObject.description || 'Brak opisu';
            const unit = rowObject.localUnit || (taskCatalogId ? (await dbService.getItem(TASKS_CATALOG_STORE_NAME, taskCatalogId))?.unit : rowObject.unit) || '?';
            const quantityVal = rowObject.quantity; // Ilość z modelu
            const quantity = formatCurrency(quantityVal, 3);

            // Oblicz wartość na podstawie modelu
            let taskValue = 0;
            let normRVal = rowObject.localNormR !== undefined ? rowObject.localNormR : (await dbService.getItem(TASKS_CATALOG_STORE_NAME, taskCatalogId))?.norms?.R;
            let normsM_source_print = rowObject.localNormsM ? JSON.parse(JSON.stringify(rowObject.localNormsM)) : (await dbService.getItem(TASKS_CATALOG_STORE_NAME, taskCatalogId))?.norms?.M;
            let workerCat = rowObject.localWorkerCategory || (await dbService.getItem(TASKS_CATALOG_STORE_NAME, taskCatalogId))?.workerCategory || 'ogolnobudowlany';

            const laborRate = getLaborRateForWorkerCategory(workerCat);
            let unitPriceR = 0;
            if (typeof normRVal === 'number' && normRVal >= 0) unitPriceR = normRVal * laborRate;
            let unitPriceM = 0;
            if (Array.isArray(normsM_source_print)) {
                for (const matNorm of normsM_source_print) {
                    let materialMarketPrice = 0;
                    if (matNorm.materialId) {
                        const matFromDb = await dbService.getItem(MATERIALS_CATALOG_STORE_NAME, matNorm.materialId);
                        materialMarketPrice = matFromDb ? (matFromDb.priceY || 0) : 0;
                    } else if (matNorm.name) {
                        const matFromDbByName = await dbService.getItemByIndex(MATERIALS_CATALOG_STORE_NAME, 'name', matNorm.name.trim());
                        materialMarketPrice = matFromDbByName ? (matFromDbByName.priceY || 0) : 0;
                    }
                    if (typeof matNorm.quantity === 'number' && matNorm.quantity > 0) {
                        unitPriceM += matNorm.quantity * materialMarketPrice;
                    }
                }
            }
            taskValue = quantityVal * (unitPriceR + unitPriceM);
            const value = formatCurrency(taskValue);
            grandTotalVal += taskValue;

            const rowContent = `<tr ${styleAttr}><td>${lp}</td><td>${description}</td><td style="text-align:center;">${unit}</td><td style="text-align:right;">${quantity}</td><td style="text-align:right;">${value}</td></tr>`;
            if (isHierarchical) departmentRowsBuffer.push(rowContent);
            else tableRowsHtml += rowContent;
        }
    }

    if (isHierarchical && currentDepartmentTitle !== null && departmentRowsBuffer.length > 0) {
        tableRowsHtml += departmentRowsBuffer.join('');
    }
    return `<div class="print-page"><h1>Zestawienie Pozycji</h1><hr><table><thead><tr><th>L.p.</th><th>Opis</th><th style="text-align:center;">j.m.</th><th style="text-align:right;">Obmiar</th><th style="text-align:right;">Wartość</th></tr></thead><tbody>${tableRowsHtml}</tbody><tfoot><tr><td colspan="4" style="text-align:right;font-weight:bold;">SUMA NETTO:</td><td style="text-align:right;font-weight:bold;">${formatCurrency(grandTotalVal)}</td></tr></tfoot></table></div>`;
}
async function getOfferContent() {
    let positionsHtml = '';
    let grandTotalVal = 0;
    let simpleRowCounter = 0;

    // Pobieramy dane bezpośrednio z modelu
    const modelRows = currentEstimateModel.rows;
    const isHierarchical = currentEstimateModel.isHierarchical;

    for(const rowObject of modelRows){ // Iterujemy po obiekcie, a nie DOM
        const rowType = rowObject.rowType;
        const rowId = rowObject.rowId;

        // Kolorowanie wierszy dla wydruku (podobna logika jak w getEstimateDetailContent)
        const rowBgColor = currentEstimateModel.departmentColors[rowId] || null;
        let effectiveBgColor = '';
        let effectiveTextColor = '';
        if (rowBgColor) {
            effectiveBgColor = rowBgColor;
            effectiveTextColor = getContrastTextColor(rowBgColor);
        } else if (rowType === 'task') {
            const defaultTaskBg = appState.getState('defaultTaskRowBackgroundColor');
            if (defaultTaskBg && defaultTaskBg !== 'transparent' && defaultTaskBg !== 'inherit') {
                effectiveBgColor = defaultTaskBg;
                effectiveTextColor = getContrastTextColor(defaultTaskBg);
            }
        } else if (rowType === 'subdepartment') {
            let parentDeptRowObject = null;
            const currentIndex = modelRows.findIndex(r => r.rowId === rowId);
            if (currentIndex > 0) {
                let i = currentIndex - 1;
                while(i >= 0) {
                    if (modelRows[i].rowType === 'department') {
                        parentDeptRowObject = modelRows[i];
                        break;
                    }
                    i--;
                }
            }
            if (parentDeptRowObject && currentEstimateModel.departmentColors[parentDeptRowObject.rowId]) {
                const parentDeptColor = currentEstimateModel.departmentColors[parentDeptRowObject.rowId];
                let subDeptCounter = 0;
                let j = (parentDeptRowObject ? modelRows.findIndex(r => r.rowId === parentDeptRowObject.rowId) : -1) + 1;
                while (j < currentIndex) {
                    if (modelRows[j].rowType === 'subdepartment') {
                        subDeptCounter++;
                    }
                    j++;
                }
                const lightenIndex = subDeptCounter % SUBDEPARTMENT_LIGHTEN_PERCENTAGES.length;
                const lightenPercentage = SUBDEPARTMENT_LIGHTEN_PERCENTAGES[lightenIndex];
                effectiveBgColor = lightenHexColor(parentDeptColor, lightenPercentage);
            }
            effectiveTextColor = effectiveBgColor ? getContrastTextColor(effectiveBgColor) : '';
        }
        const styleAttr = effectiveBgColor ? `style="background-color: ${effectiveBgColor} !important; color: ${effectiveTextColor} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;"` : "";

        let lp = '?';
        const domRowRef = costTableBody.querySelector(`tr[data-row-id="${rowId}"]`);
        if (domRowRef) lp = domRowRef.cells[1]?.textContent || '?';

        if (!isHierarchical && rowType === 'task') {
            simpleRowCounter++;
            lp = `${simpleRowCounter}.`;
        }

        if (rowType === 'department' && isHierarchical) {
            const deptTitle = rowObject.text || `Dział ${lp}`;
            positionsHtml += `<tr class="department-row-print" ${styleAttr}><td colspan="4">${lp} ${deptTitle}</td><td class="department-total-value" style="text-align:right;">${chapterSums[rowId] !== undefined ? formatCurrency(chapterSums[rowId]) : '0.00'}</td></tr>`;
        } else if (rowType === 'subdepartment' && isHierarchical) {
            const subDeptTitle = rowObject.text || `Poddział ${lp}`;
            positionsHtml += `<tr class="subdepartment-row-print" ${styleAttr}><td colspan="4" style="padding-left:15px;">${lp} ${subDeptTitle}</td><td class="subdepartment-total-value" style="text-align:right;">${chapterSums[rowId] !== undefined ? formatCurrency(chapterSums[rowId]) : '0.00'}</td></tr>`;
        } else if (rowType === 'task') {
            const taskCatalogId = rowObject.taskCatalogId;
            let baseTaskDesc = "";
            if (taskCatalogId) {
                const task = await dbService.getItem(TASKS_CATALOG_STORE_NAME, taskCatalogId);
                if(task) baseTaskDesc = task.description;
            }
            const description = rowObject.localDesc || baseTaskDesc || rowObject.description || '';
            const unit = rowObject.localUnit || (taskCatalogId ? (await dbService.getItem(TASKS_CATALOG_STORE_NAME, taskCatalogId))?.unit : rowObject.unit) || '?';
            const quantityVal = rowObject.quantity; // Ilość z modelu
            const quantity = formatCurrency(quantityVal, 3);

            // Oblicz wartość na podstawie modelu
            let taskValue = 0;
            let normRVal = rowObject.localNormR !== undefined ? rowObject.localNormR : (await dbService.getItem(TASKS_CATALOG_STORE_NAME, taskCatalogId))?.norms?.R;
            let normsM_source_print = rowObject.localNormsM ? JSON.parse(JSON.stringify(rowObject.localNormsM)) : (await dbService.getItem(TASKS_CATALOG_STORE_NAME, taskCatalogId))?.norms?.M;
            let workerCat = rowObject.localWorkerCategory || (await dbService.getItem(TASKS_CATALOG_STORE_NAME, taskCatalogId))?.workerCategory || 'ogolnobudowlany';

            const laborRate = getLaborRateForWorkerCategory(workerCat);
            let unitPriceR = 0;
            if (typeof normRVal === 'number' && normRVal >= 0) unitPriceR = normRVal * laborRate;
            let unitPriceM = 0;
            if (Array.isArray(normsM_source_print)) {
                for (const matNorm of normsM_source_print) {
                    let materialMarketPrice = 0;
                    if (matNorm.materialId) {
                        const matFromDb = await dbService.getItem(MATERIALS_CATALOG_STORE_NAME, matNorm.materialId);
                        materialMarketPrice = matFromDb ? (matFromDb.priceY || 0) : 0;
                    } else if (matNorm.name) {
                        const matFromDbByName = await dbService.getItemByIndex(MATERIALS_CATALOG_STORE_NAME, 'name', matNorm.name.trim());
                        materialMarketPrice = matFromDbByName ? (matFromDbByName.priceY || 0) : 0;
                    }
                    if (typeof matNorm.quantity === 'number' && matNorm.quantity > 0) {
                        unitPriceM += matNorm.quantity * materialMarketPrice;
                    }
                }
            }
            taskValue = quantityVal * (unitPriceR + unitPriceM);
            const value = formatCurrency(taskValue);
            grandTotalVal += taskValue;

            positionsHtml += `<tr ${styleAttr}><td>${lp}</td><td>${description}</td><td style="text-align:center;">${unit}</td><td style="text-align:right;">${quantity}</td><td style="text-align:right;">${value}</td></tr>`;
        }
    }

    const netTotal = grandTotalVal;
    const currentVatSetting = typeof appState !== 'undefined' ? appState.getState('vatRate') : '23';
    const currentVatRateVal = currentVatSetting === "zw" ? 0 : (parseInt(currentVatSetting, 10) || 0);
    const vatAmount = netTotal * (currentVatRateVal / 100);
    const grossTotal = netTotal + vatAmount;

    const netTotalWords = typeof liczbaSlownie === 'function' ? liczbaSlownie(netTotal) : '';
    const grossTotalWords = typeof liczbaSlownie === 'function' ? liczbaSlownie(grossTotal) : '';

    const today = new Date().toLocaleDateString('pl-PL');
    const titleVal = (typeof appState !== 'undefined' ? appState.getState('estimateTitle') : 'Kosztorys') || 'Prace Budowlano-Remontowe';
    const locationVal = (typeof appState !== 'undefined' ? appState.getState('investmentLocation') : '_');
    const investorVal = (typeof appState !== 'undefined' ? appState.getState('investorInfo') : '_');
    const contractorVal = (typeof appState !== 'undefined' ? appState.getState('contractorInfo') : '_');
    const vatDisplayString = (typeof appState !== 'undefined' ? appState.getState('currentVatDisplayValue') : '23') + (currentVatSetting === "zw" ? "" : "%");

    return `<div class="container print-page"><h1>Oferta Kosztorysowa: ${titleVal}</h1><div class="section details"><h2>Dane Ogólne</h2><p><strong>Miejsce inwestycji:</strong> ${locationVal}</p><p><strong>Inwestor:</strong> ${investorVal}</p><p><strong>Wykonawca:</strong> ${contractorVal}</p><p><strong>Data oferty:</strong> ${today}</p></div><h2>Zestawienie Prac</h2><table><thead><tr><th>L.p.</th><th>Opis pozycji</th><th style="text-align:center;">j.m.</th><th style="text-align:right;">Obmiar</th><th style="text-align:right;">Wartość Netto (zł)</th></tr></thead><tbody>${positionsHtml}</tbody></table><div class="section summary" style="margin-top: 20px;"><h2>Podsumowanie Wartości</h2><p><strong>Wartość prac netto:</strong> ${formatCurrency(netTotal)} zł</p><p><i>Słownie netto:</i> ${netTotalWords}</p><p><strong>Podatek VAT (${vatDisplayString}):</strong> ${formatCurrency(vatAmount)} zł</p><p><strong>Wartość prac brutto:</strong> ${formatCurrency(grossTotal)} zł</p><p><i>Słownie brutto:</i> ${grossTotalWords}</p></div><div class="section terms" style="margin-top: 20px;"><p><strong>Warunki oferty:</strong> [ miejsce na warunki ]</p></div><div class="signatures" style="margin-top:30mm;"><div class="signature-box" style="float:right;width:40%;text-align:center;"><p>........................................</p><p>(Wykonawca)</p></div><div style="clear:both;"></div></div></div>`;
}
async function getMaterialListContent(forProfitReport = false) {
    const materialMap = {};

    // Pobieramy dane bezpośrednio z modelu
    const allTaskRowsInModel = currentEstimateModel.rows.filter(r => r.rowType === 'task');

    for(const rowObject of allTaskRowsInModel){ // Iterujemy po obiekcie, a nie DOM
        const quantity = rowObject.quantity; // Ilość z modelu
        let normsM_source = null;

        if (rowObject.localNormsM) {
            normsM_source = JSON.parse(JSON.stringify(rowObject.localNormsM));
        } else if (rowObject.taskCatalogId) {
            const task = await dbService.getItem(TASKS_CATALOG_STORE_NAME, rowObject.taskCatalogId);
            normsM_source = task?.norms?.M ? JSON.parse(JSON.stringify(task.norms.M)) : null;
        } else {
            const desc = rowObject.description; // Pobierz opis z modelu
            if (desc) {
                const matDb = await dbService.getItemByIndex(MATERIALS_CATALOG_STORE_NAME, 'name', desc);
                if(matDb) normsM_source = [{ materialId: matDb.id, quantity: 1, unit: matDb.unit }];
            }
        }

        if (Array.isArray(normsM_source) && quantity > 0) {
            for (const matNorm of normsM_source) {
                let matId;
                if(matNorm.materialId) matId = matNorm.materialId;
                else if (matNorm.name) {
                    const m = await dbService.getItemByIndex(MATERIALS_CATALOG_STORE_NAME, 'name', matNorm.name.trim());
                    if(m) matId = m.id; else continue;
                } else continue;

                if (matId && typeof matNorm.quantity === 'number' && matNorm.quantity > 0) {
                    if (!materialMap[matId]) {
                        const matDb = await dbService.getItem(MATERIALS_CATALOG_STORE_NAME, matId);
                        if (!matDb) continue;
                        materialMap[matId] = { totalQuantity: 0, unit: matNorm.unit || matDb.unit || 'j.m.', category: matDb.categoryCode || 'IN', priceY: matDb.priceY || 0, priceX: matDb.priceX ?? (matDb.priceY || 0), name: matDb.name };
                    }
                    materialMap[matId].totalQuantity += matNorm.quantity * quantity;
                    if(matNorm.unit && matNorm.unit !== 'j.m.' && materialMap[matId].unit === 'j.m.') materialMap[matId].unit = matNorm.unit;
                }
            }
        }
    }

    let grandTotalValueMarket = 0;
    let grandTotalProfitFromPurchase = 0;
    const materialsArray = [];
    for(const matId in materialMap){
        const data = materialMap[matId];
        const valueBasedOnMarketPrice = data.totalQuantity * data.priceY;
        const unitProfit = data.priceY - data.priceX;
        const totalProfit = unitProfit * data.totalQuantity;
        grandTotalValueMarket += valueBasedOnMarketPrice;
        grandTotalProfitFromPurchase += totalProfit;
        materialsArray.push({ ...data, id: parseInt(matId), value: valueBasedOnMarketPrice, unitProfit, totalProfit });
    }

    materialsArray.sort((a, b) => a.name.localeCompare(b.name, 'pl'));

    let tableRowsHtml = '';
    if (materialsArray.length > 0) {
        materialsArray.forEach(material => {
            tableRowsHtml += `<tr${material.priceY === 0 ? ' class="zero-price"' : ''}><td>${material.name}</td><td style="text-align: center;" title="${getMaterialCategoryFullName(material.category)}">${material.category}</td><td style="text-align: right;">${material.totalQuantity.toFixed(3)}</td><td style="text-align: center;">${material.unit}</td><td style="text-align: right;">${formatCurrency(material.priceY)}</td>`;
            if (forProfitReport) {
                tableRowsHtml += `<td style="text-align: right;">${formatCurrency(material.priceX)}</td><td style="text-align: right;">${formatCurrency(material.unitProfit)}</td>`;
            }
            tableRowsHtml += `<td style="text-align: right;">${formatCurrency(material.value)}</td>`;
            if (forProfitReport) {
                tableRowsHtml += `<td style="text-align: right;">${formatCurrency(material.totalProfit)}</td>`;
            }
            tableRowsHtml += `</tr>`;
        });
    } else {
        tableRowsHtml = `<tr><td colspan="${forProfitReport ? '9' : '6'}" style="text-align:center;">Brak materiałów.</td></tr>`;
    }

    let legendHtml = '';
    if (!forProfitReport && typeof MATERIAL_CATEGORIES_MAP !== 'undefined') {
        legendHtml = '<div class="material-categories-legend print-only" style="margin-top:10px; font-size:8pt;"><strong>Legenda kategorii:</strong> ';
        const legendItems = [];
        for (const catCode in MATERIAL_CATEGORIES_MAP) {
            legendItems.push(`${catCode} - ${MATERIAL_CATEGORIES_MAP[catCode]}`);
        }
        legendHtml += legendItems.join(', ') + '.</div>`;
    }

    const headerCols = forProfitReport ? `<th>Materiał</th><th style="text-align: center;">Kat.</th><th style="text-align: right;">Ilość</th><th style="text-align: center;">j.m.</th><th style="text-align: right;">Cena Rynk. (Y)</th><th style="text-align: right;">Cena Zakupu (X)</th><th style="text-align: right;">Zysk/Strata Jedn.</th><th style="text-align: right;">Wartość (Y)</th><th style="text-align: right;">Zysk/Strata Sum.</th>` : `<th>Materiał</th><th style="text-align: center;">Kat.</th><th style="text-align: right;">Ilość</th><th style="text-align: center;">j.m.</th><th style="text-align: right;">Cena jedn. (Y)</th><th style="text-align: right;">Wartość (Y)</th>`;
    let footerHtml = `<tr><td colspan="${forProfitReport ? '7' : '5'}" style="text-align: right; font-weight: bold;">SUMA (wg cen rynkowych Y):</td><td style="text-align: right; font-weight: bold;">${formatCurrency(grandTotalValueMarket)}</td>${forProfitReport ? `<td style="text-align: right; font-weight: bold;">${formatCurrency(grandTotalProfitFromPurchase)}</td>` : ''}</tr>`;
    if (forProfitReport) {
        footerHtml = `<tr><td colspan="8" style="text-align: right; font-weight: bold;">SUMA ZYSKU/STRATY Z ZAKUPU MATERIAŁÓW:</td><td style="text-align: right; font-weight: bold;">${formatCurrency(grandTotalProfitFromPurchase)}</td></tr>` + footerHtml;
    }
    const tableTitle = forProfitReport ? "Raport Zysku/Straty z Materiałów" : "Wykaz Materiałów";

    return `<div class="print-page"><h1>${tableTitle}</h1><hr><table><thead><tr>${headerCols}</tr></thead><tbody>${tableRowsHtml}</tbody><tfoot>${footerHtml}</tfoot></table>${legendHtml}</div>`;
}
async function handleGenerateSelectedPrints() { const selectedOptions = []; if (printOptionsContainer) { printOptionsContainer.querySelectorAll('input[name="printSelection"]:checked').forEach(checkbox => { selectedOptions.push(checkbox.value); }); } if (selectedOptions.length === 0) { showNotification("Wybierz przynajmniej jeden dokument do wydrukowania.", 'warning'); return; } let combinedHtmlContent = ""; let firstDoc = true; let documentTitle = (typeof appState !== 'undefined' ? appState.getState('estimateTitle') : 'Kosztorys') ? `Kosztorys: ${(typeof appState !== 'undefined' ? appState.getState('estimateTitle') : 'Kosztorys')}` : "Wydruk Zbiorczy - EazyKoszt"; let specificCss = ""; for (const option of selectedOptions) { if (!firstDoc && option !== 'schedule') { combinedHtmlContent += '<div style="page-break-before: always;"></div>'; } let contentForThisOption = ""; switch (option) { case 'coverPage': contentForThisOption = getCoverPageContent(); break; case 'estimateDetail': contentForThisOption = await getEstimateDetailContent(); break; case 'estimatePositions': contentForThisOption = await getEstimatePositionsContent(); break; case 'offer': contentForThisOption = await getOfferContent(); break; case 'materialList': contentForThisOption = await getMaterialListContent(false); break; case 'analysisDeptCharts': if (AnalysisModule && typeof AnalysisModule.getAnalysisDeptChartsContent === 'function') contentForThisOption = await AnalysisModule.getAnalysisDeptChartsContent(); else console.warn("Funkcja getAnalysisDeptChartsContent niedostępna"); break; case 'analysisWorkerDistChart': if (AnalysisModule && typeof AnalysisModule.getAnalysisWorkerDistChartContent === 'function') contentForThisOption = await AnalysisModule.getAnalysisWorkerDistChartContent(); else console.warn("Funkcja getAnalysisWorkerDistChartContent niedostępna"); break; case 'analysisLaborTable': if (AnalysisModule && typeof AnalysisModule.getAnalysisLaborTableContent === 'function') { contentForThisOption = await AnalysisModule.getAnalysisLaborTableContent(); specificCss += ".labor-analysis-table { font-size: 8pt; } .labor-analysis-table th, .labor-analysis-table td { padding: 3px 4px; }"; } else console.warn("Funkcja getAnalysisLaborTableContent niedostępna"); break; case 'analysisMaterialByDept': if (AnalysisModule && typeof AnalysisModule.getAnalysisMaterialByDeptContent === 'function') { contentForThisOption = await AnalysisModule.getAnalysisMaterialByDeptContent(); specificCss += ".material-analysis-table { font-size: 8pt; } .material-analysis-table th, .material-analysis-table td { padding: 3px 4px; }"; } else console.warn("Funkcja getAnalysisMaterialByDeptContent niedostępna"); break; case 'analysisMaterialByCat': if (AnalysisModule && typeof AnalysisModule.getAnalysisMaterialByCatContent === 'function') { contentForThisOption = await AnalysisModule.getAnalysisMaterialByCatContent(); specificCss += ".material-analysis-table { font-size: 8pt; } .material-analysis-table th, .material-analysis-table td { padding: 3px 4px; }"; } else console.warn("Funkcja getAnalysisMaterialByCatContent niedostępna"); break; case 'analysisMaterialProfit': if (AnalysisModule && typeof AnalysisModule.getAnalysisMaterialProfitContent === 'function') { contentForThisOption = await AnalysisModule.getAnalysisMaterialProfitContent(); specificCss += ".material-analysis-table { font-size: 8pt; } .material-analysis-table th, .material-analysis-table td { padding: 3px 4px; }"; } else console.warn("Funkcja getAnalysisMaterialProfitContent niedostępna"); break; case 'schedule': if (AnalysisModule && AnalysisModule.openScheduleWindow) { AnalysisModule.openScheduleWindow(); if (selectedOptions.length === 1) { closePrintSelectionModal(); return; } } firstDoc = true; break; default: console.warn("Nieznana opcja wydruku:", option); } if (contentForThisOption) { combinedHtmlContent += contentForThisOption; firstDoc = false; } } if (combinedHtmlContent) { generatePrintWindow(documentTitle, combinedHtmlContent, specificCss); } closePrintSelectionModal(); }
async function handlePreviewEstimateDetail() { const content = await getEstimateDetailContent(); if (content) { generatePrintWindow(`Podgląd - Kosztorys Szczegółowy (${(typeof appState !== 'undefined' ? appState.getState('estimateTitle') : 'Kosztorys') || ''})`, content); } else { showNotification("Nie można wygenerować podglądu - brak treści kosztorysu.", 'warning'); } }
// ==========================================================================
// SEKCJA 10: ZARZĄDZANIE WERSJAMI KOSZTORYSU (UI)
// ZMIANA: Funkcje UI dla wersji, wywołujące logikę z script-core.js
// ==========================================================================
async function displayEstimateVersions() {
    if (!estimateVersionsSelect) return;
    estimateVersionsSelect.innerHTML = '';
    try {
        const versions = await getAllEstimateVersionsFromDB(); // Funkcja z script-core.js
        if (versions.length === 0) {
            estimateVersionsSelect.innerHTML = '<option value="" disabled>Brak zapisanych wersji.</option>';
            if (loadSelectedVersionBtn) loadSelectedVersionBtn.disabled = true;
            if (deleteSelectedVersionBtn) deleteSelectedVersionBtn.disabled = true;
            return;
        }
        versions.forEach(version => {
            const option = document.createElement('option');
            option.value = version.id;
            option.textContent = `${version.name} (z ${new Date(version.timestamp).toLocaleString('pl-PL', {dateStyle: 'short', timeStyle: 'short'})})`;
            if (version.isAuto) {
                option.textContent += " [Autozapis]";
                option.style.fontStyle = "italic";
                option.style.color = "#555";
            }
            estimateVersionsSelect.appendChild(option);
        });
        if (loadSelectedVersionBtn) loadSelectedVersionBtn.disabled = false;
        if (deleteSelectedVersionBtn) deleteSelectedVersionBtn.disabled = false;
    } catch (error) {
        console.error("Błąd odczytu wersji:", error);
        estimateVersionsSelect.innerHTML = '<option value="" disabled>Błąd wczytywania wersji.</option>';
    }
}

async function loadSelectedVersion() {
    const selectedId = estimateVersionsSelect.value;
    if (!selectedId) {
        showNotification("Proszę wybrać wersję z listy.", 'warning');
        return;
    }
    try {
        const versionRecord = await getEstimateVersionFromDB(parseInt(selectedId, 10)); // Funkcja z script-core.js
        if (versionRecord) {
            await loadEstimateFromVersionRecord(versionRecord); // Funkcja z script-core.js
        } else {
            showNotification("Nie znaleziono wybranej wersji.", 'error');
        }
    } catch (error) {
        showNotification("Błąd wczytywania wersji.", 'error');
    }
}

async function deleteSelectedVersion() {
    if (!estimateVersionsSelect || !estimateVersionsSelect.value) {
        showNotification("Wybierz wersję do usunięcia.", 'warning');
        return;
    }
    const versionId = parseInt(estimateVersionsSelect.value, 10);
    const versionName = estimateVersionsSelect.options[estimateVersionsSelect.selectedIndex].text;
    showConfirmNotification(`Czy na pewno chcesz usunąć wersję "${versionName}"? Tej operacji nie można cofnąć.`, async () => {
        try {
            await deleteEstimateVersionFromDB(versionId); // Funkcja z script-core.js
            await displayEstimateVersions(); // Odśwież listę UI
        } catch (error) {
            showNotification("Błąd usuwania wersji.", 'error');
        }
    });
}

// ==========================================================================
// SEKCJA 11: OBSŁUGA UI KATALOGÓW (TERAZ "KATALOGI WŁASNE") (bez zmian)
// ==========================================================================
async function refreshCatalogsUITab() {
    if (document.getElementById('katalogi-wlasne')?.classList.contains('active')) {
        await refreshTasksCatalogList();
        await refreshMaterialsCatalogList();
    }
}
async function refreshTasksCatalogList() {
    if (!tasksCatalogListContainer) { console.warn("Kontener listy zadań katalogowych nie znaleziony."); return; }
    tasksCatalogListContainer.innerHTML = '<p>Ładowanie katalogu własnych pozycji...</p>';
    const searchTerm = tasksCatalogSearch?.value.toLowerCase().trim() || '';

    try {
        let allTasks = await dbService.getAllItems(TASKS_CATALOG_STORE_NAME);
        let userTasks = allTasks.filter(task => task.isPredefined === false);

        if (searchTerm) {
            userTasks = userTasks.filter(task =>
                task.description.toLowerCase().includes(searchTerm) ||
                (task.department && task.department.toLowerCase().includes(searchTerm)) ||
                (task.branch && ((typeof BRANCHES !== 'undefined' && BRANCHES[task.branch]?.name.toLowerCase().includes(searchTerm)) || task.branch.toLowerCase().includes(searchTerm)))
            );
        }

        if (userTasks.length === 0) {
            tasksCatalogListContainer.innerHTML = '<p>Brak własnych pozycji kosztorysowych spełniających kryteria. Dodaj nowe, aby je tu zobaczyć.</p>';
            return;
        }

        userTasks.sort((a, b) => {
            const branchCompare = ((typeof BRANCHES !== 'undefined' && BRANCHES[a.branch]?.name) || a.branch || '').localeCompare(((typeof BRANCHES !== 'undefined' && BRANCHES[b.branch]?.name) || b.branch || ''), 'pl');
            if (branchCompare !== 0) return branchCompare;
            const deptCompare = (a.department || '').localeCompare(b.department || '', 'pl');
            if (deptCompare !== 0) return deptCompare;
            return a.description.localeCompare(b.description, 'pl');
        });

        let html = '<ul class="catalog-items-list">';
        let currentBranchDisplay = null;
        let currentDepartmentDisplay = null;

        userTasks.forEach(task => {
            const taskBranchName = (typeof BRANCHES !== 'undefined' && BRANCHES[task.branch]?.name) || task.branch || 'Brak Branży';
            if (taskBranchName !== currentBranchDisplay) {
                currentBranchDisplay = taskBranchName;
                html += `<li class="catalog-branch-header">${currentBranchDisplay}</li>`;
                currentDepartmentDisplay = null;
            }
            if (task.department !== currentDepartmentDisplay) {
                currentDepartmentDisplay = task.department;
                html += `<li class="catalog-department-header">${currentDepartmentDisplay || 'Dział Ogólny'}</li>`;
            }

            html += `<li class="catalog-item task-item" data-task-id="${task.id}">
                        <div class="item-info">
                            <span class="item-description">${task.description}</span>
                            <span class="item-details">
                                (j.m.: ${task.unit || '?'}), Norma R: ${task.norms?.R !== undefined ? task.norms.R.toFixed(3) : '-'}, Materiały: ${task.norms?.M?.length || 0}
                                <span class="user-defined-tag">(Własne)</span>
                            </span>
                        </div>
                        <div class="item-actions">
                            <button class="edit-catalog-item-btn small-action-btn secondary" data-id="${task.id}" title="Edytuj pozycję katalogową">Edytuj</button>
                            <button class="delete-catalog-item-btn small-action-btn danger" data-id="${task.id}" title="Usuń pozycję z katalogu">Usuń</button>
                        </div>
                    </li>`;
        });
        html += '</ul>';
        tasksCatalogListContainer.innerHTML = html;

        tasksCatalogListContainer.querySelectorAll('.edit-catalog-item-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => await openModal('edit_custom', parseInt(e.target.dataset.id)));
        });
        tasksCatalogListContainer.querySelectorAll('.delete-catalog-item-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const taskId = parseInt(e.target.dataset.id);
                const task = await dbService.getItem(TASKS_CATALOG_STORE_NAME, taskId);
                if (task) {
                    showConfirmNotification(`Czy na pewno chcesz usunąć własną pozycję katalogową "${task.description}"? Tej operacji nie można cofnąć.`, async () => {
                        await dbService.deleteItem(TASKS_CATALOG_STORE_NAME, taskId);
                        if (!isRestoringState && typeof appState !== 'undefined') appState.notify('taskCatalogChanged');
                        showNotification("Własna pozycja katalogowa usunięta.", 'info');
                    });
                }
            });
        });

    } catch (error) {
        console.error("Błąd ładowania katalogu własnych pozycji:", error);
        tasksCatalogListContainer.innerHTML = '<p style="color:red;">Wystąpił błąd podczas ładowania katalogu własnych pozycji.</p>';
        showNotification("Błąd ładowania katalogu własnych pozycji.", 'error');
    }
}
async function refreshMaterialsCatalogList() {
    if (!materialsCatalogListContainer) { console.warn("Kontener listy materiałów katalogowych nie znaleziony."); return; }
    materialsCatalogListContainer.innerHTML = '<p>Ładowanie katalogu własnych materiałów...</p>';
    const searchTerm = materialsCatalogSearch?.value.toLowerCase().trim() || '';

    try {
        let allMaterials = await dbService.getAllItems(MATERIALS_CATALOG_STORE_NAME);
        let userMaterials = allMaterials.filter(mat => mat.isPredefined === false);

        if (searchTerm) {
            userMaterials = userMaterials.filter(mat => mat.name.toLowerCase().includes(searchTerm));
        }

        if (userMaterials.length === 0) {
            materialsCatalogListContainer.innerHTML = '<p>Brak własnych materiałów spełniających kryteria. Dodaj nowe, aby je tu zobaczyć.</p>';
            return;
        }

        userMaterials.sort((a, b) => {
            const catCompare = (getMaterialCategoryFullName(a.categoryCode) || a.categoryCode || '').localeCompare(getMaterialCategoryFullName(b.categoryCode) || b.categoryCode || '', 'pl');
            if (catCompare !== 0) return catCompare;
            return a.name.localeCompare(b.name, 'pl');
        });

        let html = '<ul class="catalog-items-list">';
        let currentCategoryDisplay = null;

        userMaterials.forEach(mat => {
            const categoryFullName = getMaterialCategoryFullName(mat.categoryCode) || mat.categoryCode || 'Brak Kategorii';
            if (categoryFullName !== currentCategoryDisplay) {
                currentCategoryDisplay = categoryFullName;
                html += `<li class="catalog-category-header">${currentCategoryDisplay} (${mat.categoryCode || '?'})</li>`;
            }
            html += `<li class="catalog-item material-item" data-material-id="${mat.id}">
                        <div class="item-info">
                            <span class="item-name">${mat.name}</span>
                            <span class="item-details">
                                (j.m.: ${mat.unit || '?'}), Cena R: ${formatCurrency(mat.priceY || 0)} zł, Cena Z: ${formatCurrency(mat.priceX ?? (mat.priceY || 0))} zł
                                <span class="user-defined-tag">(Własne)</span>
                            </span>
                        </div>
                        <div class="item-actions">
                            <button class="edit-catalog-item-btn small-action-btn secondary" data-id="${mat.id}" data-type="material" title="Edytuj materiał w katalogu">Edytuj</button>
                            <button class="delete-catalog-item-btn small-action-btn danger" data-id="${mat.id}" data-type="material" title="Usuń materiał z katalogu">Usuń</button>
                        </div>
                    </li>`;
        });
        html += '</ul>';
        materialsCatalogListContainer.innerHTML = html;

        materialsCatalogListContainer.querySelectorAll('.edit-catalog-item-btn[data-type="material"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const materialId = parseInt(e.target.dataset.id);
                const material = await dbService.getItem(MATERIALS_CATALOG_STORE_NAME, materialId);
                if(material){
                    if(newMaterialNameInput) newMaterialNameInput.value = material.name;
                    if(newMaterialUnitInput) newMaterialUnitInput.value = material.unit;
                    if(newMaterialCategoryInput) newMaterialCategoryInput.value = material.categoryCode || 'IN';
                    showNotification(`Aby edytować materiał "${material.name}", zmień jego ceny w zakładce "Wykaz Materiałów" lub nazwę przez dwuklik. Zaawansowana edycja (np. kategoria) wymagałaby dedykowanego formularza.`, 'info', 10000);
                }
            });
        });
        materialsCatalogListContainer.querySelectorAll('.delete-catalog-item-btn[data-type="material"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const materialId = parseInt(e.target.dataset.id);
                const material = await dbService.getItem(MATERIALS_CATALOG_STORE_NAME, materialId);
                if (material) {
                    showConfirmNotification(`Czy na pewno chcesz usunąć własny materiał "${material.name}" z katalogu? Tej operacji nie można cofnąć.`, async () => {
                        await dbService.deleteItem(MATERIALS_CATALOG_STORE_NAME, materialId);
                        if (!isRestoringState && typeof appState !== 'undefined') appState.notify('materialCatalogChanged');
                        showNotification("Własny materiał usunięty z katalogu.", 'info');
                    });
                }
            });
        });
    } catch (error) {
        console.error("Błąd ładowania katalogu własnych materiałów:", error);
        materialsCatalogListContainer.innerHTML = '<p style="color:red;">Wystąpił błąd podczas ładowania katalogu własnych materiałów.</p>';
        showNotification("Błąd ładowania katalogu własnych materiałów.", 'error');
    }
}
async function updateMaterialNameInCatalog(materialId, newName, oldName) { if (!newName) { showNotification("Nazwa materiału nie może być pusta.", 'warning'); return false; } const existingMaterialWithNewName = await dbService.getItemByIndex(MATERIALS_CATALOG_STORE_NAME, 'name', newName); if (existingMaterialWithNewName && existingMaterialWithNewName.id !== materialId) { showNotification(`Materiał o nazwie "${newName}" już istnieje w katalogu. Wybierz inną nazwę.`, 'warning', 7000); return false; } try { const materialToUpdate = await dbService.getItem(MATERIALS_CATALOG_STORE_NAME, materialId); if (!materialToUpdate) { showNotification("Nie znaleziono materiału do aktualizacji.", 'error'); return false; } materialToUpdate.name = newName; materialToUpdate.updatedAt = new Date().toISOString(); await dbService.updateItem(MATERIALS_CATALOG_STORE_NAME, materialToUpdate); console.log(`Zaktualizowano nazwę materiału ID ${materialId} z "${oldName}" na "${newName}".`); if (!isRestoringState && typeof appState !== 'undefined') { appState.notify('materialCatalogChanged'); appState.notify('estimateDataPotentiallyChanged'); } showNotification(`Nazwa materiału zaktualizowana z "${oldName}" na "${newName}".`, 'success'); return true; } catch (error) { console.error("Błąd podczas aktualizacji nazwy materiału w katalogu:", error); showNotification("Wystąpił błąd podczas aktualizacji nazwy materiału.", 'error'); return false; } }

console.log("Moduł modali i I/O (EazyKoszt 0.5.0-script-modals-io.js) załadowany.");

/*
Notatki dotyczące zmian w `js/script-modals-io.js`:

1.  **`openNotesModal(rowId)`**:
    *   Zmieniono sygnaturę, aby przyjmowała `rowId` (ID wiersza z modelu) zamiast elementu DOM (`targetRow`).
    *   Teraz pobiera notatki (`rowObject.notes`) bezpośrednio z `currentEstimateModel.rows` na podstawie `rowId`.
    *   `currentNotesTargetRow` teraz przechowuje `rowId`.

2.  **`saveNotesFromModal()`**:
    *   Zmieniono, aby używała `currentNotesTargetRow` (czyli `rowId`) do znalezienia i zaktualizowania odpowiedniego obiektu wiersza w `currentEstimateModel.rows`.
    *   Wywołuje `updateModelAndRender({ rows: updatedRows })` w celu zaktualizowania modelu i ponownego renderowania tabeli (co odświeży też ikonę notatek).
    *   Dodano tymczasową wizualną aktualizację ikony notatek bezpośrednio na DOM, aby zapewnić natychmiastowy feedback, zanim `renderCostTable` przerysuje cały wiersz. Docelowo ta część mogłaby zostać usunięta, gdyby `renderCostTable` była na tyle szybka, że feedback jest natychmiastowy.

3.  **`openModal(context, ref)`**:
    *   W kontekście `'edit_row'`, `ref` nadal jest DOM elementem wiersza. Funkcja pobiera `rowId` z tego elementu i używa go do znalezienia odpowiedniego obiektu wiersza w `currentEstimateModel.rows`.
    *   Wszystkie dane do wypełnienia modala są teraz pobierane z tego obiektu w modelu.

4.  **`_updateEstimateRowFromModal(domRowElement)`**:
    *   Ta funkcja jest wywoływana po zapisaniu danych z modala dla lokalnie edytowanego wiersza (nie katalogowego).
    *   Zmieniono, aby znajdowała odpowiedni obiekt wiersza w `currentEstimateModel.rows` (na podstawie `domRowElement.dataset.rowId`).
    *   Wszystkie zmiany danych (opis, ilość, normy lokalne, linki katalogowe) są wykonywane na **kopii tego obiektu w modelu (`updatedRow`)**.
    *   Wywołuje `updateModelAndRender({ rows: updatedRowsArray })` w celu zaktualizowania modelu i ponownego renderowania tabeli.

5.  **`_saveOrUpdateCatalogTask(isEditing, editingCatalogTaskId)`**:
    *   Ta funkcja odpowiada za edycję/tworzenie pozycji w katalogu.
    *   Jeśli pozycja katalogowa jest edytowana (`isEditing` jest `true`), po zapisaniu zmian do IndexedDB, funkcja **iteruje przez `currentEstimateModel.rows`**.
    *   Wszystkie wiersze w kosztorysie, które korzystają z tej zaktualizowanej pozycji katalogowej (poprzez `taskCatalogId` i nie mają lokalnego nadpisania opisu), są aktualizowane w modelu (zmieniony opis, `originalCatalogDesc`).
    *   Następnie wywoływane jest `updateModelAndRender` z zaktualizowanymi wierszami.

6.  **`handleInsertTemplate()`**:
    *   Zmieniono, aby pobierała dane z `currentEstimateModel.rows` (jeśli ma dodać dział jako pierwszy).
    *   Szablony są teraz wstawiane poprzez tworzenie obiektów dla `rowsToAdd` i dodawanie ich do `currentEstimateModel.rows`.
    *   Wywołuje `updateModelAndRender`.

7.  **`saveTemplate()`**:
    *   W przypadku zapisu szablonu działu, funkcja teraz pobiera dane z `currentEstimateModel.rows` (blok działu).
    *   W przypadku zapisu szablonu całego kosztorysu, funkcja po prostu pobiera `currentEstimateModel.rows` jako `templateData`.

8.  **`loadFullState(loadedData)`**:
    *   Zmieniono, aby wczytywała dane bezpośrednio do `currentEstimateModel` (rows, departmentColors, isHierarchical).
    *   Wywołuje `renderCostTable` po wczytaniu, aby przerysować tabelę.
    *   `appState` jest również synchronizowane z danymi z pliku.

9.  **`saveEstimateToFile()`**:
    *   Zmieniono, aby pobierała dane `estimateRows` i `departmentColors` bezpośrednio z `getCurrentEstimateDisplayState()` (która teraz zwraca `currentEstimateModel`).

10. **Pozostałe funkcje wydruku (`getEstimateDetailContent`, `getEstimatePositionsContent`, `getOfferContent`, `getMaterialListContent`)**:
    *   **Kluczowa zmiana**: Zamiast iterować po elementach DOM tabeli (`costTableBody.querySelectorAll('tr')`), teraz iterują po obiektach w `currentEstimateModel.rows`.
    *   Wszystkie dane tekstowe, liczbowe, notatki, normy są pobierane z `rowObject` w modelu.
    *   Dane katalogowe (jeśli pozycja jest powiązana z katalogiem) są nadal pobierane asynchronicznie z IndexedDB za pomocą `dbService.getItem()`, ponieważ model przechowuje tylko `taskCatalogId`, a nie całe dane katalogowe.
    *   **LP**: LP jest nadal odczytywane z DOM w tych funkcjach (`domRowRef.cells[1]?.textContent`). Jest to tymczasowe i wymagałoby dalszej refaktoryzacji `renumberRows` (aby zapisywało LP do modelu) w celu pełnej niezależności od DOM.
    *   **Kolory**: Kolory dla wydruków są teraz również odczytywane z `currentEstimateModel.departmentColors`.

*/
