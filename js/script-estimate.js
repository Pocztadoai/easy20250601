// Plik: EazyKoszt 0.6.1C-script-estimate.js
// Opis: Logika związana z tabelą kosztorysu, w tym dodawanie wierszy,
//       obliczenia wartości, obsługa zdarzeń w tabeli, przeciąganie i upuszczanie,
//       oraz dynamiczne kolorowanie wierszy.
// Wersja 0.6.1C: Upewnienie się, że 'draggedRow' nie jest ponownie deklarowane.
//               Poprawki błędów w funkcji `getDomDragAndDropBlock`.
//               Dodano console.log do inicjalizacji przycisków w initEstimateLogic.

// ==========================================================================
// SEKCJA 0: Zmienne globalne specyficzne dla tego modułu
// ==========================================================================
let isDropdownInteraction = false;
// draggedRow jest już zadeklarowane globalnie w script-core.js i używane jako zmienna globalna

// ==========================================================================
// SEKCJA 1: INICJALIZACJA MODUŁU
// ==========================================================================
async function initEstimateLogic() {
    console.log("Inicjalizacja logiki kosztorysu (EazyKoszt 0.6.1C-script-estimate.js)...");
    console.log("DEBUG: initEstimateLogic - Start."); // <-- DODANO

    if (addRowBtn) {
        addRowBtn.addEventListener('click', async () => {
            console.log("DEBUG: addRowBtn kliknięty!"); // <-- DODANO
            if (typeof removeInsertIndicator === 'function') removeInsertIndicator();
            let insertBeforeNode = null;
            if (lastClickedRow && costTableBody && costTableBody.contains(lastClickedRow)) {
                insertBeforeNode = lastClickedRow.nextElementSibling;
            } else if (typeof currentEstimateModel !== 'undefined' && currentEstimateModel.isHierarchical && costTableBody && costTableBody.rows.length > 0 && !costTableBody.querySelector('tr[data-row-type="department"]')) {
                 insertBeforeNode = costTableBody.firstChild;
            }
            // Zmieniono: addRow teraz modyfikuje model i wywołuje renderCostTable
            await addRow(null, false, insertBeforeNode);
        });
        console.log("DEBUG: addRowBtn listener przypisany."); // <-- DODANO
    } else { console.warn("Przycisk addRowBtn nie znaleziony w initEstimateLogic."); }

    if (addDepartmentBtn) {
        addDepartmentBtn.addEventListener('click', async () => { // Dodano async
            console.log("DEBUG: addDepartmentBtn kliknięty!"); // <-- DODANO
            if (typeof removeInsertIndicator === 'function') removeInsertIndicator();
            let insertBeforeNode = null;
            if (lastClickedRow && costTableBody && costTableBody.contains(lastClickedRow)) {
                let currentDeptBlockStart = lastClickedRow;
                if (lastClickedRow.dataset.rowType !== 'department') {
                    let prev = lastClickedRow.previousElementSibling;
                    while(prev) { if (prev.dataset.rowType === 'department') { currentDeptBlockStart = prev; break; } prev = prev.previousElementSibling; }
                    if (currentDeptBlockStart === lastClickedRow || !currentDeptBlockStart || currentDeptBlockStart.dataset.rowType !== 'department') currentDeptBlockStart = null;
                }
                if (currentDeptBlockStart) {
                    insertBeforeNode = currentDeptBlockStart.nextElementSibling;
                    while (insertBeforeNode && insertBeforeNode.dataset.rowType !== 'department') insertBeforeNode = insertBeforeNode.nextElementSibling;
                } else insertBeforeNode = costTableBody.firstChild;
            } else insertBeforeNode = costTableBody.firstChild;
            // Zmieniono: addSpecialRow teraz modyfikuje model i wywołuje renderCostTable
            await addSpecialRow('department', '', false, false, null, insertBeforeNode); // Dodano await
        });
        console.log("DEBUG: addDepartmentBtn listener przypisany."); // <-- DODANO
        addDepartmentBtn.addEventListener('mouseenter', () => { if(typeof showInsertIndicator === 'function') showInsertIndicator('department'); });
        addDepartmentBtn.addEventListener('mouseleave', () => { if(typeof removeInsertIndicator === 'function') removeInsertIndicator(); });
    }  else { console.warn("Przycisk addDepartmentBtn nie znaleziony w initEstimateLogic."); }

    if (addSubDepartmentBtn) {
        addSubDepartmentBtn.addEventListener('click', async () => { // Dodano async
            console.log("DEBUG: addSubDepartmentBtn kliknięty!"); // <-- DODANO
            if (typeof removeInsertIndicator === 'function') removeInsertIndicator();
            let insertBeforeNode = null;
             if(lastClickedRow && costTableBody && costTableBody.contains(lastClickedRow)) {
                 const refType = lastClickedRow.dataset.rowType;
                 if (refType === 'department' || refType === 'subdepartment') {
                     insertBeforeNode = lastClickedRow.nextElementSibling;
                     if(refType === 'subdepartment'){
                         while (insertBeforeNode && insertBeforeNode.dataset.rowType === 'task') insertBeforeNode = insertBeforeNode.nextElementSibling;
                     }
                 } else if (refType === 'task') insertBeforeNode = lastClickedRow.nextElementSibling;
                 else insertBeforeNode = lastClickedRow.nextElementSibling;
             } else if (costTableBody) {
                 const lastDeptOrSub = Array.from(costTableBody.querySelectorAll('tr[data-row-type="department"], tr[data-row-type="subdepartment"]')).pop();
                 if (lastDeptOrSub) {
                    insertBeforeNode = lastDeptOrSub.nextElementSibling;
                    if(lastDeptOrSub.dataset.rowType === 'subdepartment'){
                         while(insertBeforeNode && insertBeforeNode.dataset.rowType === 'task') insertBeforeNode = insertBeforeNode.nextElementSibling;
                    }
                 } else {
                     // Zmieniono: Odwołanie do currentEstimateModel.isHierarchical
                     if(typeof ensureFirstRowIsDepartmentIfNeeded === 'function' && ensureFirstRowIsDepartmentIfNeeded(false, true)) {
                         const firstDept = costTableBody.querySelector('tr[data-row-type="department"]');
                         insertBeforeNode = firstDept ? firstDept.nextElementSibling : null;
                     } else {
                         if (typeof showNotification === 'function') showNotification("Aby dodać poddział, najpierw musi istnieć dział w trybie hierarchicznym.", 'warning');
                         else alert("Aby dodać poddział, najpierw musi istnieć dział w trybie hierarchicznym.");
                         return;
                     }
                 }
             }
            // Zmieniono: addSpecialRow teraz modyfikuje model i wywołuje renderCostTable
            await addSpecialRow('subdepartment', '', false, false, null, insertBeforeNode); // Dodano await
        });
        console.log("DEBUG: addSubDepartmentBtn listener przypisany."); // <-- DODANO
        addSubDepartmentBtn.addEventListener('mouseenter', () => { if(typeof showInsertIndicator === 'function') showInsertIndicator('subdepartment'); });
        addSubDepartmentBtn.addEventListener('mouseleave', () => { if(typeof removeInsertIndicator === 'function') removeInsertIndicator(); });
    } else { console.warn("Przycisk addSubDepartmentBtn nie znaleziony w initEstimateLogic."); }

    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearEstimate); // clearEstimate wywołuje updateModelAndRender
        console.log("DEBUG: clearAllBtn listener przypisany."); // <-- DODANO
    } else {
        console.warn("Przycisk clearAllBtn nie znaleziony w initEstimateLogic.");
    }

    if (costTableBody) {
        costTableBody.addEventListener('click', (event) => {
            const clickedRow = event.target.closest('tr');
            const indicatorId = typeof INDICATOR_ROW_ID !== 'undefined' ? INDICATOR_ROW_ID : 'temp-insert-indicator';
            if (clickedRow && costTableBody && costTableBody.contains(clickedRow) && !event.target.closest('.col-actions') && clickedRow.id !== indicatorId) {
                if (lastClickedRow && lastClickedRow !== clickedRow) {
                    lastClickedRow.classList.remove('last-clicked-row-highlight');
                }
                lastClickedRow = clickedRow;
                lastClickedRow.classList.add('last-clicked-row-highlight');
                if (saveDepartmentTemplateBtn) {
                    saveDepartmentTemplateBtn.disabled = !(lastClickedRow.dataset.rowType === 'department');
                }
            }
        });
        // Zmieniono: event listener 'change' na inputach specjalnych jest teraz dodawany w renderCostTable
        // costTableBody.addEventListener('change', (event) => {
        //     if (event.target.classList.contains('special-row-input')) {
        //         if (typeof saveEstimateState === 'function' && !isRestoringState) saveEstimateState();
        //     }
        // });
        costTableBody.addEventListener('mouseleave', (e) => {
             const relatedIsAddButton = addRowBtn?.contains(e.relatedTarget) || addDepartmentBtn?.contains(e.relatedTarget) || addSubDepartmentBtn?.contains(e.relatedTarget);
             const indicatorId = typeof INDICATOR_ROW_ID !== 'undefined' ? INDICATOR_ROW_ID : 'temp-insert-indicator';
             if (fixedActionButtons && !fixedActionButtons.contains(e.relatedTarget) && !relatedIsAddButton && e.target.id !== indicatorId) {
                if (typeof removeInsertIndicator === 'function') removeInsertIndicator();
             }
        });
    } else { console.warn("Element costTableBody nie znaleziony w initEstimateLogic.");}

    const suggestionsOverlay = document.getElementById('suggestions-overlay');
    if (suggestionsOverlay) {
        suggestionsOverlay.addEventListener('click', () => {
            if (activeDropdown && activeDropdown.style.display === 'block') {
                hideAllDropdowns();
            }
        });
    } else {
        console.warn("Element 'suggestions-overlay' nie znaleziony.");
    }

    if (materialSummaryBody) {
        materialSummaryBody.addEventListener('change', async (event) => {
            if (event.target.classList.contains('material-summary-price-input')) await handleMaterialSummaryMarketPriceChange(event.target);
            else if (event.target.classList.contains('material-summary-purchase-price-input')) await handleMaterialSummaryPurchasePriceChange(event.target);
        });
        materialSummaryBody.addEventListener('focusout', (event) => { if (event.target.classList.contains('material-summary-price-input') || event.target.classList.contains('material-summary-purchase-price-input')) { const numericValue = parseFloat(event.target.value.replace(',', '.')) || 0; if(typeof setNumericInputValue === 'function') setNumericInputValue(event.target, numericValue); } });
        materialSummaryBody.addEventListener('dblclick', async (event) => { const targetCell = event.target.closest('td.editable-material-name-cell'); if (!targetCell || (event.target !== targetCell && !targetCell.contains(event.target))) return; const row = targetCell.closest('tr'); const materialId = parseInt(row?.dataset.materialId); if (!materialId || targetCell.querySelector('input')) return; const currentName = targetCell.textContent.trim(); const input = document.createElement('input'); input.type = 'text'; input.value = currentName; input.style.width = 'calc(100% - 4px)'; input.style.boxSizing = 'border-box'; targetCell.innerHTML = ''; targetCell.appendChild(input); input.focus(); input.select(); const saveOrRevertName = async (isSaving) => { const newName = input.value.trim(); input.removeEventListener('blur', handleBlur); input.removeEventListener('keydown', handleKeyDown); if (isSaving && newName && newName !== currentName) { if (typeof updateMaterialNameInCatalog === 'function') { const success = await updateMaterialNameInCatalog(materialId, newName, currentName); if (success) { targetCell.textContent = newName; row.dataset.materialName = newName; if (typeof appState !== 'undefined' && !isRestoringState) appState.notify('estimateDataPotentiallyChanged'); if (typeof AnalysisModule !== 'undefined' && AnalysisModule.refreshAnalysis) AnalysisModule.refreshAnalysis(); } else targetCell.textContent = currentName; } else { console.error("Funkcja updateMaterialNameInCatalog nie jest zdefiniowana."); targetCell.textContent = currentName; } } else targetCell.textContent = currentName; }; const handleBlur = () => saveOrRevertName(true); const handleKeyDown = (e) => { if (e.key === 'Enter') input.blur(); else if (e.key === 'Escape') saveOrRevertName(false); }; input.addEventListener('blur', handleBlur); input.addEventListener('keydown', handleKeyDown); });
    } else { console.warn("Element materialSummaryBody nie znaleziony w initEstimateLogic.");}

    if (materialSummaryTable) {
        const headers = materialSummaryTable.querySelectorAll('thead th[data-sort-key]');
        headers.forEach(th => { th.addEventListener('click', async () => { const sortKey = th.dataset.sortKey; if (!sortKey) return; if (materialSortColumn === sortKey) materialSortDirection = materialSortDirection === 'asc' ? 'desc' : 'asc'; else { materialSortColumn = sortKey; materialSortDirection = 'asc'; } await calculateMaterialSummary(); }); });
    } else { console.warn("Tabela materialSummaryTable nie znaleziona w initEstimateLogic.");}

    console.log("DEBUG: initEstimateLogic - Koniec."); // <-- DODANO
}