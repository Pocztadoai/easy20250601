// Plik: EazyKoszt 0.4.2-script-modals-io.js
// Opis: Logika obsługi okien modalnych, operacji importu/eksportu danych,
//       zarządzania szablonami, wersjami oraz interfejsem użytkownika katalogów.
// Wersja 0.4.2: Modyfikacje związane z przeniesieniem logiki wersji do script-core.js.

// ==========================================================================
// SEKCJA 1: INICJALIZACJA MODUŁU I GŁÓWNYCH LISTENERÓW
// ==========================================================================
async function initModalsAndIO() {
    console.log("Inicjalizacja modali i I/O (EazyKoszt 0.4.2-script-modals-io.js)...");

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
    await updateModelAndRender({ rows: updatedRows });

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
async function renderMaterialSelectList(filterText) { if (!materialSelectList || !materialSelectNoResults) return; materialSelectList.innerHTML = ''; const lowerFilter = filterText.toLowerCase().trim(); let visibleCount = 0; const allMaterialsFromDb = await dbService.getAllItems(MATERIALS_CATALOG_STORE_NAME); const sortedMaterials = allMaterialsFromDb.sort((a, b) => a.name.localeCompare(b.name, 'pl')); sortedMaterials.forEach(material => { if (!lowerFilter || material.name.toLowerCase().includes(lowerFilter)) { const li = document.createElement('li'); li.dataset.materialId = material.id; li.dataset.name = material.name; li.dataset.unit = material.unit || 'j.m.'; li.style.cssText = 'cursor:pointer; padding:6px 10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center; font-size:0.9em;'; const nameSpan = document.createElement('span'); nameSpan.textContent = material.name; const detailsSpan = document.createElement('span'); detailsSpan.style.cssText = 'font-size:0.85em; color:#555; text-align:right; margin-left:10px; white-space:nowrap;'; detailsSpan.textContent = `(${(typeof getMaterialCategoryFullName === 'function' ? getMaterialCategoryFullName(material.categoryCode) : material.categoryCode) || '?'}, ${formatCurrency(material.priceY || 0)} zł)`; li.appendChild(nameSpan); li.appendChild(detailsSpan); li.addEventListener('click', handleMaterialSelect); li.addEventListener('mouseenter', () => li.style.backgroundColor = '#f0f0f0'); li.addEventListener('mouseleave', () => li.style.backgroundColor = ''); materialSelectList.appendChild(li); visibleCount++; } }); materialSelectNoResults.style.display = visibleCount === 0 ? 'block' : 'none'; }
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

    if (modalEstimateTitleInput) modalEstimateTitleInput.value = appState.getState('estimateTitle');
    const vatDisplay = document.getElementById('modal-vat-rate-display');
    if(vatDisplay) vatDisplay.value = appState.getState('currentVatDisplayValue');
    if(useSameRateCheckbox) useSameRateCheckbox.checked = appState.getState('useSameRateForAllSpecialists');
    const ogolnobudowlanyRateInput = document.getElementById('rate-labor-ogolnobudowlany');
    if (ogolnobudowlanyRateInput) setNumericInputValue(ogolnobudowlanyRateInput, appState.getState('workerRatesSettings').ogolnobudowlany?.rate || 0);
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
    reader.onerror = () => { showNotification("Błąd odczytu pliku. Spróbuj ponownie.", 'error'); if (csvFileInput) csvFileInput.value = null; selectedCsvFile = null; if (loadCsvButton) loadCsvButton.disabled = true; };
    reader.readAsText(file);
}
function handleCsvFileLoad(event) { selectedCsvFile = event.target.files[0]; if(loadCsvButton) loadCsvButton.disabled = !selectedCsvFile; }
async function processCsvFile() { if (!selectedCsvFile) { showNotification("Wybierz plik CSV/TXT z cenami materiałów.", 'warning'); return; } const reader = new FileReader(); reader.onload = async (e) => { const csvText = e.target.result; const lines = csvText.split(/\r\n|\n/); let updatedCount = 0, skippedCount = 0; for (const line of lines) { if (!line.trim()) { skippedCount++; continue; } const columns = line.split(/[,;\t]/); if (columns.length >= 2) { const name = columns[0].trim(); const priceString = columns[1].trim().replace(',', '.'); const price = parseFloat(priceString); if (name && !isNaN(price) && price >= 0) { const existingMaterial = await dbService.getItemByIndex(MATERIALS_CATALOG_STORE_NAME, 'name', name); if (existingMaterial) { const oldPriceY = existingMaterial.priceY; existingMaterial.priceY = price; if (existingMaterial.priceX === oldPriceY || existingMaterial.priceX === null || existingMaterial.priceX === undefined) existingMaterial.priceX = price; existingMaterial.updatedAt = new Date().toISOString(); await dbService.updateItem(MATERIALS_CATALOG_STORE_NAME, existingMaterial); updatedCount++; } else { console.log(`Materiał "${name}" z CSV nie znaleziony w katalogu. Pomijam.`); skippedCount++; } } else { console.warn(`Pominięto linię z CSV (nieprawidłowa nazwa lub cena): "${line}"`); skippedCount++; } } else { console.warn(`Pominięto linię z CSV (za mało kolumn): "${line}"`); skippedCount++; } } if (updatedCount > 0) { if (!isRestoringState && typeof appState !== 'undefined') appState.notify('materialPricesImported'); showNotification(`Zaimportowano ceny z pliku.\nZaktualizowano: ${updatedCount}\nPominięto linii: ${skippedCount}.`, 'success', 7000); } else { showNotification(`Nie zaktualizowano żadnych cen z pliku CSV. Sprawdź format pliku i nazwy materiałów.\nPominięto linii: ${skippedCount}.`, 'warning', 7000); } if (csvFileInput) csvFileInput.value = null; selectedCsvFile = null; if (loadCsvButton) loadCsvButton.disabled = true; }; reader.onerror = () => { showNotification("Błąd odczytu pliku CSV/TXT.", 'error'); if (csvFileInput) csvFileInput.value = null; selectedCsvFile = null; if (loadCsvButton) loadCsvButton.disabled = true; }; reader.readAsText(selectedCsvFile, 'UTF-8'); }

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
                    showNotification("Błąd: Nie udało się usunąć wiersza z modelu.", "error");
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
    // departmentColors = {}; // USUNIĘTE: przeniesione do currentEstimateModel

    try { // <-- TUTAJ ZACZYNA SIĘ BLOK TRY DLA CAŁEJ FUNKCJI
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

        const fillBranchSelectors = () => { const selectors = [branchSelectDropdown, document.getElementById('modal-task-branch-select')]; if (typeof BRANCHES === 'undefined') { console.error("Zmienna BRANCHES nie jest zdefiniowana!"); return; } selectors.forEach(selector => { if (selector) { const firstOptionValue = selector.options[0]?.value; const firstOptionText = selector.options[0]?.textContent; selector.innerHTML = ''; if (firstOptionValue === "" && firstOptionText) { const defaultOpt = document.createElement('option'); defaultOpt.value = ""; defaultOpt.textContent = firstOptionText; selector.appendChild(defaultOpt); } for (const branchKey in BRANCHES) { const option = document.createElement('option'); option.value = BRANCHES[branchKey].code; option.textContent = BRANCHES[branchKey].name; selector.appendChild(option); } } }); }; fillBranchSelectors();
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

console.log("Plik EazyKoszt 0.4.2-script-core.js załadowany.")