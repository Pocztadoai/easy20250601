// Plik: EazyKoszt 0.4.2-script-estimate.js
// Opis: Logika związana z tabelą kosztorysu, w tym dodawanie wierszy,
//       obliczenia wartości, obsługa zdarzeń w tabeli, przeciąganie i upuszczanie,
//       oraz dynamiczne kolorowanie wierszy.
// Wersja 0.4.2: Zmiany w logice kolorowania wierszy - domyślnie bez koloru, dziedziczenie i odcienie.
//               Logika zapobiegania pustym pozycjom.
//               Ulepszenia UX przy edycji opisu pozycji z katalogu.

// ==========================================================================
// SEKCJA 0: Zmienne globalne specyficzne dla tego modułu
// ==========================================================================
let isDropdownInteraction = false;

// ==========================================================================
// SEKCJA 1: INICJALIZACJA MODUŁU
// ==========================================================================
async function initEstimateLogic() {
    console.log("Inicjalizacja logiki kosztorysu (EazyKoszt 0.4.2-script-estimate.js)...");

    if (addRowBtn) {
        addRowBtn.addEventListener('click', async () => {
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
        addRowBtn.addEventListener('mouseenter', () => { if(typeof showInsertIndicator === 'function') showInsertIndicator('task'); });
        addRowBtn.addEventListener('mouseleave', () => { if(typeof removeInsertIndicator === 'function') removeInsertIndicator(); });
    } else { console.warn("Przycisk addRowBtn nie znaleziony w initEstimateLogic."); }

    if (addDepartmentBtn) {
        addDepartmentBtn.addEventListener('click', () => {
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
            addSpecialRow('department', '', false, false, null, insertBeforeNode);
        });
        addDepartmentBtn.addEventListener('mouseenter', () => { if(typeof showInsertIndicator === 'function') showInsertIndicator('department'); });
        addDepartmentBtn.addEventListener('mouseleave', () => { if(typeof removeInsertIndicator === 'function') removeInsertIndicator(); });
    }  else { console.warn("Przycisk addDepartmentBtn nie znaleziony w initEstimateLogic."); }

    if (addSubDepartmentBtn) {
        addSubDepartmentBtn.addEventListener('click', () => {
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
            addSpecialRow('subdepartment', '', false, false, null, insertBeforeNode);
        });
        addSubDepartmentBtn.addEventListener('mouseenter', () => { if(typeof showInsertIndicator === 'function') showInsertIndicator('subdepartment'); });
        addSubDepartmentBtn.addEventListener('mouseleave', () => { if(typeof removeInsertIndicator === 'function') removeInsertIndicator(); });
    } else { console.warn("Przycisk addSubDepartmentBtn nie znaleziony w initEstimateLogic."); }

    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearEstimate); // clearEstimate wywołuje updateModelAndRender
    } else {
        console.warn("Przycisk clearAllBtn nie znaleziony w initEstimateLogic.");
    }

    if (costTableBody) {
        costTableBody.addEventListener('click', (event) => {
            const clickedRow = event.target.closest('tr');
            const indicatorId = typeof INDICATOR_ROW_ID !== 'undefined' ? INDICATOR_ROW_ID : 'temp-insert-indicator';
            if (clickedRow && costTableBody.contains(clickedRow) && !event.target.closest('.col-actions') && clickedRow.id !== indicatorId) {
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

    console.log("Logika kosztorysu (script-estimate.js) zainicjalizowana.");
}


// ==========================================================================
// SEKCJA 2: OBSŁUGA LIST ROZWIJANYCH (SUGESTII)
// ==========================================================================

const hideAllDropdowns = (preserveFocus = false) => {
    if (activeDropdown) {
        if (activeSearchInput && activeSearchInput._dropdownKeydownListener) {
            activeSearchInput.removeEventListener('keydown', activeSearchInput._dropdownKeydownListener);
            delete activeSearchInput._dropdownKeydownListener;
        }
        activeDropdown.style.display = 'none';
    }
    const suggestionsOverlay = document.getElementById('suggestions-overlay');
    if (suggestionsOverlay) suggestionsOverlay.style.display = 'none';

    document.removeEventListener('click', handleClickOutsideDropdown, true);

    if (!preserveFocus && activeSearchInput && document.body.contains(activeSearchInput)) {
    }
    activeDropdown = null;
};

const handleClickOutsideDropdown = (event) => {
    if (activeDropdown && activeDropdown.style.display === 'block') {
        const isClickInsideDropdown = activeDropdown.contains(event.target);
        const isClickInsideActiveInput = activeSearchInput && activeSearchInput.contains(event.target);
        const isClickOnOverlay = event.target.id === 'suggestions-overlay';


        if (!isClickInsideDropdown && !isClickInsideActiveInput && !isClickOnOverlay) {
            hideAllDropdowns();
        }
    }
};

function groupAndSortTasksByDepartmentLocal(tasks, includeBranchAsTopLevel = false, useOwnItemsCategoryNameIfNoDept = "Pozycje własne (bez działu)") {
    const grouped = {};
    tasks.forEach(task => {
        let departmentName = task.department;
        if (task.isPredefined === false && (!departmentName || departmentName.toLowerCase() === "dział ogólny")) {
            departmentName = useOwnItemsCategoryNameIfNoDept;
        } else if (!departmentName) {
            departmentName = "??. Brak Działu";
        }
        const topLevelKey = includeBranchAsTopLevel ? (task.branch || "INNA_BRANŻA") : departmentName;
        if (!grouped[topLevelKey]) {
            grouped[topLevelKey] = includeBranchAsTopLevel ? {} : [];
        }
        if (includeBranchAsTopLevel) {
            let deptKeyForBranchView = task.department;
            if (task.isPredefined === false && (!deptKeyForBranchView || deptKeyForBranchView.toLowerCase() === "dział ogólny")) {
                deptKeyForBranchView = useOwnItemsCategoryNameIfNoDept;
            } else if (!deptKeyForBranchView) {
                 deptKeyForBranchView = "??. Brak Działu";
            }
            if (!grouped[topLevelKey][deptKeyForBranchView]) {
                grouped[topLevelKey][deptKeyForBranchView] = [];
            }
            grouped[topLevelKey][deptKeyForBranchView].push(task);
        } else {
            grouped[topLevelKey].push(task);
        }
    });
    const sortedTopLevelKeys = Object.keys(grouped).sort((a, b) => {
        const aIsOwnCategory = a === useOwnItemsCategoryNameIfNoDept;
        const bIsOwnCategory = b === useOwnItemsCategoryNameIfNoDept;
        const aIsNoDept = a === "??. Brak Działu";
        const bIsNoDept = b === "??. Brak Działu";
        if (includeBranchAsTopLevel) {
            const aIsOtherBranch = a === "INNA_BRANŻA";
            const bIsOtherBranch = b === "INNA_BRANŻA";
            if (aIsOtherBranch && !bIsOtherBranch) return 1;
            if (!aIsOtherBranch && bIsOtherBranch) return -1;
             if (typeof BRANCHES !== 'undefined') {
                const nameA = BRANCHES[a] ? BRANCHES[a].name : a;
                const nameB = BRANCHES[b] ? BRANCHES[b].name : b;
                return nameA.localeCompare(nameB, 'pl');
            }
            return a.localeCompare(b, 'pl');
        } else {
            if (aIsOwnCategory && !bIsOwnCategory) return 1;
            if (!aIsOwnCategory && bIsOwnCategory) return -1;
            if (aIsNoDept && !bIsNoDept) return 1;
            if (!aIsNoDept && bIsNoDept) return -1;
            return a.localeCompare(b, 'pl');
        }
    });
    const sortedGrouped = {};
    sortedTopLevelKeys.forEach(topKey => {
        if (includeBranchAsTopLevel) {
            sortedGrouped[topKey] = {};
            const sortedDeptsInBranch = Object.keys(grouped[topKey]).sort((a,b) => {
                const aIsOwn = a === useOwnItemsCategoryNameIfNoDept;
                const bIsOwn = b === useOwnItemsCategoryNameIfNoDept;
                const aIsNoDept = a === "??. Brak Działu";
                const bIsNoDept = b === "??. Brak Działu";
                if (aIsOwn && !bIsOwn) return 1;
                if (!aIsOwn && bIsOwn) return -1;
                if (aIsNoDept && !bIsNoDept) return 1;
                if (!aIsNoDept && bIsNoDept) return -1;
                return a.localeCompare(b,'pl');
            });
            sortedDeptsInBranch.forEach(deptKey => {
                sortedGrouped[topKey][deptKey] = grouped[topKey][deptKey].sort((a, b) => a.description.localeCompare(b.description, 'pl'));
            });
        } else {
            sortedGrouped[topKey] = grouped[topKey].sort((a, b) => a.description.localeCompare(b.description, 'pl'));
        }
    });
    return sortedGrouped;
}

function filterTasksLocal(tasks, searchText, includeBranchInSearch = false) {
    const lowerSearchText = searchText.toLowerCase().trim();
    if (!lowerSearchText) return tasks;
    return tasks.filter(task => {
        const ownItemsCategoryNameIfNoDept = "Pozycje własne (bez działu)";
        let department = task.department;
        if (task.isPredefined === false && (!department || department.toLowerCase() === "dział ogólny")) {
            department = ownItemsCategoryNameIfNoDept;
        } else if (!department) {
            department = "??. Brak Działu";
        }
        let branchName = "";
        if (includeBranchInSearch && task.branch && typeof BRANCHES !== 'undefined') {
            branchName = BRANCHES[task.branch] ? BRANCHES[task.branch].name.toLowerCase() : task.branch.toLowerCase();
        }
        return task.description.toLowerCase().includes(lowerSearchText) ||
               department.toLowerCase().includes(lowerSearchText) ||
               (includeBranchInSearch && branchName.includes(lowerSearchText));
    });
}

async function renderDropdownOptions(container, mode = 'departments', selectedDept = null, filterText = '', currentBranchCode = null) {
    const dropdown = container.querySelector('.suggestions-dropdown');
    if (!dropdown) return;

    const closeBtnExisting = dropdown.querySelector('.suggestions-dropdown-close-btn');
    dropdown.innerHTML = '';
    if (closeBtnExisting) { dropdown.appendChild(closeBtnExisting); }
    else {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'suggestions-dropdown-close-btn';
        closeBtn.innerHTML = '×';
        closeBtn.title = 'Zamknij (Esc)';
        closeBtn.addEventListener('click', (e) => { e.stopPropagation(); hideAllDropdowns(); });
        dropdown.appendChild(closeBtn);
    }

    const mainUl = document.createElement('ul');
    const lowerFilter = filterText.toLowerCase().trim();
    container.dataset.currentMode = mode;
    container.dataset.selectedDept = selectedDept || '';
    container.dataset.currentBranch = currentBranchCode || '';
    const ownItemsCategoryName = "Pozycje własne";
    const ownItemsCategoryNameIfNoDept = "Pozycje własne (bez działu)";
    let tasksToProcess = [];
    if (mode === 'filter-tasks-all-branches') {
        tasksToProcess = await dbService.getAllItems(TASKS_CATALOG_STORE_NAME);
    } else if (currentBranchCode) {
        tasksToProcess = await dbService.getItemsByIndex(TASKS_CATALOG_STORE_NAME, 'branch', currentBranchCode);
    } else if (mode === 'departments' || (mode === 'tasks' && selectedDept === "__USER_DEFINED__")) {
        if (selectedDept === "__USER_DEFINED__") {
            tasksToProcess = (await dbService.getAllItems(TASKS_CATALOG_STORE_NAME)).filter(t => t.isPredefined === false);
        }
    }
    let foundAnyClickableItem = false;
    if (mode === 'departments') {
        const predefinedTasksForDisplay = tasksToProcess.filter(t => t.isPredefined !== false);
        const filteredPredefinedTasks = lowerFilter ? filterTasksLocal(predefinedTasksForDisplay, lowerFilter, !currentBranchCode) : predefinedTasksForDisplay;
        const groupedPredefined = groupAndSortTasksByDepartmentLocal(filteredPredefinedTasks, false, ownItemsCategoryNameIfNoDept);
        const departmentHeaders = Object.keys(groupedPredefined);
        departmentHeaders.forEach(dept => {
            if (dept !== ownItemsCategoryNameIfNoDept) {
                const li = document.createElement('li');
                li.classList.add('department-header');
                li.textContent = dept;
                li.dataset.department = dept;
                mainUl.appendChild(li);
                foundAnyClickableItem = true;
            }
        });
        const userDefinedMainHeader = `${ownItemsCategoryName}${currentBranchCode ? ' (branża: ' + (BRANCHES[currentBranchCode]?.name || currentBranchCode) + ')' : ' (wszystkie)'}`;
        if (!lowerFilter || userDefinedMainHeader.toLowerCase().includes(lowerFilter) || ownItemsCategoryName.toLowerCase().includes(lowerFilter)) {
            const liUser = document.createElement('li');
            liUser.classList.add('department-header', 'user-defined-main-header');
            liUser.textContent = userDefinedMainHeader;
            liUser.dataset.department = "__USER_DEFINED__";
            mainUl.appendChild(liUser);
            foundAnyClickableItem = true;
        }
        if (!foundAnyClickableItem && !lowerFilter && !currentBranchCode) {
            mainUl.innerHTML = `<li class="no-results" style="padding:10px; text-align:center;">Wybierz branżę, aby przeglądać katalog lub wpisz min. 2 znaki.</li>`;
        } else if (!foundAnyClickableItem && lowerFilter) {
             mainUl.innerHTML = `<li class="no-results" style="padding:10px; text-align:center;">Brak działów pasujących do filtra "${filterText}".</li>`;
        }
    } else if (mode === 'tasks' && selectedDept) {
        const backLi = document.createElement('li');
        backLi.classList.add('back-to-departments');
        backLi.textContent = '« Powrót do Działów';
        mainUl.appendChild(backLi);
        foundAnyClickableItem = true;
        let tasksForSelectedSection = [];
        let sectionTitleForDisplay = selectedDept;
        let isUserDefinedSection = false;
        if (selectedDept === "__USER_DEFINED__") {
            isUserDefinedSection = true;
            if (currentBranchCode) {
                tasksForSelectedSection = (await dbService.getItemsByIndex(TASKS_CATALOG_STORE_NAME, 'branch', currentBranchCode))
                                          .filter(t => t.isPredefined === false);
                sectionTitleForDisplay = `${ownItemsCategoryName} (branża: ${BRANCHES[currentBranchCode]?.name || currentBranchCode})`;
            } else {
                tasksForSelectedSection = (await dbService.getAllItems(TASKS_CATALOG_STORE_NAME))
                                          .filter(t => t.isPredefined === false);
                sectionTitleForDisplay = `Wszystkie ${ownItemsCategoryName}`;
            }
        } else {
            tasksForSelectedSection = tasksToProcess.filter(t => t.isPredefined !== false && t.department === selectedDept && (!currentBranchCode || t.branch === currentBranchCode) );
        }
        if (isUserDefinedSection) {
            const addNewUserTaskLi = document.createElement('li');
            addNewUserTaskLi.classList.add('task-item', 'add-new-user-task-item');
            addNewUserTaskLi.textContent = "+ Dodaj nową pozycję własną";
            addNewUserTaskLi.style.fontWeight = "bold";
            addNewUserTaskLi.style.color = "var(--secondary-color)";
            mainUl.appendChild(addNewUserTaskLi);
            foundAnyClickableItem = true;
        }
        const filteredTasksForSelected = lowerFilter ? filterTasksLocal(tasksForSelectedSection, filterText, selectedDept === "__USER_DEFINED__" && !currentBranchCode) : tasksForSelectedSection;
        const sortedTasks = filteredTasksForSelected.sort((a,b) => {
            if(selectedDept === "__USER_DEFINED__" && !currentBranchCode) {
                const deptA = (a.department && a.department.toLowerCase() !== "dział ogólny") ? a.department : ownItemsCategoryNameIfNoDept;
                const deptB = (b.department && b.department.toLowerCase() !== "dział ogólny") ? b.department : ownItemsCategoryNameIfNoDept;
                const branchA = a.branch && BRANCHES[a.branch] ? BRANCHES[a.branch].name : (a.branch || "ZZZ");
                const branchB = b.branch && BRANCHES[b.branch] ? BRANCHES[b.branch].name : (b.branch || "ZZZ");
                const branchComp = branchA.localeCompare(branchB, 'pl');
                if (branchComp !== 0) return branchComp;
                const deptComp = deptA.localeCompare(deptB, 'pl');
                if (deptComp !== 0) return deptComp;
            }
            return a.description.localeCompare(b.description, 'pl')
        });
        if (sortedTasks.length > 0) {
            let currentDisplayGroupKey = null;
            sortedTasks.forEach(task => {
                if(selectedDept === "__USER_DEFINED__" && !currentBranchCode) {
                    let taskDeptDisplay = (task.department && task.department.toLowerCase() !== "dział ogólny") ? task.department : ownItemsCategoryNameIfNoDept;
                    let taskBranchDisplay = task.branch && BRANCHES[task.branch] ? BRANCHES[task.branch].name : (task.branch || "Bez branży");
                    let groupKey = `${taskBranchDisplay} / ${taskDeptDisplay}`;
                    if(groupKey !== currentDisplayGroupKey) {
                        currentDisplayGroupKey = groupKey;
                        const groupHeaderLi = document.createElement('li');
                        groupHeaderLi.textContent = currentDisplayGroupKey;
                        groupHeaderLi.style.cssText = "padding: 5px 10px 5px 15px; background-color: #f0f0f0; font-style: italic; font-size: 0.9em; cursor:default;";
                        mainUl.appendChild(groupHeaderLi);
                    }
                }
                const li = document.createElement('li');
                li.classList.add('task-item');
                li.textContent = task.description;
                li.dataset.taskId = task.id;
                li.dataset.description = task.description;
                if (selectedDept === "__USER_DEFINED__" && !currentBranchCode && task.department && task.department.toLowerCase() !== "dział ogólny") {
                    li.style.paddingLeft = "30px";
                } else if (selectedDept === "__USER_DEFINED__" && !currentBranchCode) {
                     li.style.paddingLeft = "15px";
                }
                mainUl.appendChild(li);
                foundAnyClickableItem = true;
            });
        } else if (tasksForSelectedSection.length > 0 && lowerFilter) {
             mainUl.innerHTML += `<li class="no-results" style="padding:10px; text-align:center;">Brak pozycji pasujących do filtra "${filterText}" w "${sectionTitleForDisplay}".</li>`;
        } else if (selectedDept === "__USER_DEFINED__" && tasksForSelectedSection.length === 0 && isUserDefinedSection) {
             mainUl.innerHTML += `<li class="no-results" style="padding:10px; text-align:center;">Brak zdefiniowanych pozycji własnych ${currentBranchCode ? 'dla tej branży' : ''}.</li>`;
        } else if (!isUserDefinedSection && tasksForSelectedSection.length === 0) {
             mainUl.innerHTML += `<li class="no-results" style="padding:10px; text-align:center;">Brak pozycji w "${sectionTitleForDisplay}".</li>`;
        }
    } else if (mode === 'filter-tasks-all-branches') {
        const globallyFilteredTasks = filterTasksLocal(tasksToProcess, filterText, true);
        const globallyFilteredGrouped = groupAndSortTasksByDepartmentLocal(globallyFilteredTasks, true, ownItemsCategoryNameIfNoDept);
        const branchesWithResults = Object.keys(globallyFilteredGrouped);
        if (branchesWithResults.length === 0 && lowerFilter) {
            mainUl.innerHTML = `<li class="no-results" style="padding:10px; text-align:center;">Brak pasujących pozycji dla "${filterText}" w żadnej branży.</li>`;
        } else if (branchesWithResults.length === 0 && !lowerFilter) {
             mainUl.innerHTML = '<li class="no-results" style="padding:10px; text-align:center;">Wpisz co najmniej 2 znaki, aby wyszukać globalnie.</li>';
        } else {
            branchesWithResults.forEach(branchCode => {
                const branchName = (typeof BRANCHES !== 'undefined' && BRANCHES[branchCode]) ? BRANCHES[branchCode].name : (branchCode === "INNA_BRANŻA" ? "Inne / Bez przypisanej branży" : branchCode);
                const bhLi = document.createElement('li');
                bhLi.classList.add('department-header');
                bhLi.style.cursor = 'default';
                bhLi.style.backgroundColor = '#e9ecef';
                bhLi.textContent = branchName;
                mainUl.appendChild(bhLi);
                const departmentsInBranch = globallyFilteredGrouped[branchCode];
                Object.keys(departmentsInBranch).forEach(deptKeyInBranch => {
                    const deptDisplayName = deptKeyInBranch === ownItemsCategoryNameIfNoDept ? ownItemsCategoryName : (deptKeyInBranch === "??. Brak Działu" ? "Brak Działu (Katalog Predefiniowany)" : deptKeyInBranch);
                    const dhLi = document.createElement('li');
                    dhLi.classList.add('department-header');
                    dhLi.style.cursor = 'default';
                    dhLi.style.backgroundColor = '#f8f9fa';
                    dhLi.style.paddingLeft = "15px";
                    dhLi.textContent = deptDisplayName;
                    mainUl.appendChild(dhLi);
                    departmentsInBranch[deptKeyInBranch].forEach(task => {
                        const tLi = document.createElement('li');
                        tLi.classList.add('task-item');
                        tLi.style.paddingLeft = "30px";
                        tLi.textContent = task.description;
                        tLi.dataset.taskId = task.id;
                        tLi.dataset.description = task.description;
                        mainUl.appendChild(tLi);
                        foundAnyClickableItem = true;
                    });
                });
            });
        }
    }

    dropdown.appendChild(mainUl);

    const items = Array.from(mainUl.querySelectorAll('li:not(.no-results):not([style*="cursor: default"])'));
    let activeIndex = -1;

    const setActiveItem = (index) => {
        items.forEach(item => item.classList.remove('active'));
        if (index >= 0 && index < items.length) {
            items[index].classList.add('active');
            activeIndex = index;
        } else {
            activeIndex = -1;
        }
    };
    if (items.length > 0) setActiveItem(0);

    if (activeSearchInput && activeSearchInput._dropdownKeydownListener) {
        activeSearchInput.removeEventListener('keydown', activeSearchInput._dropdownKeydownListener);
    }
    const dropdownKeydownListener = (e) => {
        if (!dropdown || dropdown.style.display !== 'block' || !items.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveItem(activeIndex < items.length - 1 ? activeIndex + 1 : 0);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveItem(activeIndex > 0 ? activeIndex - 1 : items.length - 1);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex !== -1 && items[activeIndex]) {
                items[activeIndex].click();
            }
        }
    };
    if (activeSearchInput) {
        activeSearchInput.addEventListener('keydown', dropdownKeydownListener);
        activeSearchInput._dropdownKeydownListener = dropdownKeydownListener;
    }

    const clickableLis = mainUl.querySelectorAll('li:not(.no-results)');
    if (clickableLis.length === 0) {
        hideAllDropdowns();
    } else {
        const actualContentLis = mainUl.querySelectorAll('li.department-header, li.task-item');
        if (actualContentLis.length === 0) {
             const noResultsLi = mainUl.querySelector('li.no-results');
             if(noResultsLi && mainUl.children.length === (dropdown.querySelector('.suggestions-dropdown-close-btn') ? 2 : 1)) {
                 hideAllDropdowns();
             }
        }
    }
}


const showDropdown = async (inputElement) => {
    const container = inputElement.closest('.suggestions-container');
    if (!container) return;

    if (activeSearchInput && activeSearchInput !== inputElement && activeSearchInput._dropdownKeydownListener) {
        activeSearchInput.removeEventListener('keydown', activeSearchInput._dropdownKeydownListener);
        delete activeSearchInput._dropdownKeydownListener;
    }
    activeSearchInput = inputElement;

    const suggestionsOverlay = document.getElementById('suggestions-overlay');
    if (suggestionsOverlay) suggestionsOverlay.style.display = 'block';

    const dropdown = container.querySelector('.suggestions-dropdown');
    if (!dropdown) { console.error("Nie znaleziono elementu .suggestions-dropdown w kontenerze!"); return; }

    if (activeDropdown && activeDropdown !== dropdown) {
        hideAllDropdowns(true);
    }
    activeDropdown = dropdown;

    const filterText = inputElement.value;
    let currentMode = 'departments';
    const currentDept = null;
    let currentBranchCode = typeof branchSelectDropdown !== 'undefined' ? branchSelectDropdown.value : null;

    container.dataset.currentMode = currentMode;
    container.dataset.selectedDept = '';
    container.dataset.currentBranch = currentBranchCode || '';

    if (filterText.trim().length >= 2) {
        await renderDropdownOptions(container, 'filter-tasks-all-branches', null, filterText, null);
    } else {
        await renderDropdownOptions(container, 'departments', null, filterText, currentBranchCode);
    }
    if (dropdown.querySelectorAll('ul li:not(.no-results)').length > 0 || dropdown.querySelectorAll('ul li.department-header, ul li.task-item').length > 0) {
        dropdown.style.display = 'block';
        setTimeout(() => {
            document.addEventListener('click', handleClickOutsideDropdown, true);
        }, 0);
    } else {
        hideAllDropdowns();
    }
}

const handleGlobalEscapeKeyForDropdown = (event) => {
    if (event.key === 'Escape') {
        if (activeDropdown && activeDropdown.style.display === 'block') {
            event.preventDefault();
            hideAllDropdowns();
        }
    }
};

const handleDropdownClick = async (event) => {
    const target = event.target;
    const dropdown = target.closest('.suggestions-dropdown');
    if (!dropdown || !target.closest('li') || target.classList.contains('no-results') || target.style.cursor === 'default') return;
    event.stopPropagation();

    if (!activeSearchInput || !document.body.contains(activeSearchInput)) { hideAllDropdowns(); return; }

    const container = activeSearchInput.closest('.suggestions-container');
    const inputElement = activeSearchInput;
    const domRow = inputElement.closest('tr'); // Element DOM wiersza

    if (!container || !domRow || domRow.dataset.rowType === 'department' || domRow.dataset.rowType === 'subdepartment') { hideAllDropdowns(); return; }

    let currentBranchCode = container.dataset.currentBranch || (typeof branchSelectDropdown !== 'undefined' ? branchSelectDropdown.value : null);

    // Pobierz rowId DOM elementu wiersza
    const domRowId = domRow.dataset.rowId;

    if (target.matches('.department-header')) {
        const selectedDept = target.dataset.department;
        await renderDropdownOptions(container, 'tasks', selectedDept, '', currentBranchCode);
    } else if (target.matches('.task-item') && !target.classList.contains('add-new-user-task-item')) {
        const taskCatalogId = parseInt(target.dataset.taskId);
        const description = target.dataset.description;

        // Znajdź odpowiedni obiekt wiersza w modelu
        const rowIndex = currentEstimateModel.rows.findIndex(r => r.rowId === domRowId);
        if (rowIndex === -1) {
            console.error("handleDropdownClick: Nie znaleziono obiektu wiersza w modelu dla DOM elementu.", domRowId);
            hideAllDropdowns();
            return;
        }

        // Zaktualizuj obiekt wiersza w modelu
        const updatedRows = [...currentEstimateModel.rows];
        const updatedRow = { ...updatedRows[rowIndex] };

        // Ustawienie danych z katalogu
        updatedRow.taskCatalogId = taskCatalogId;
        updatedRow.description = description; // Użyj opisu z katalogu jako primary
        delete updatedRow.localDesc; // Usuń lokalny opis, jeśli istniał

        // Pobierz pełne dane z katalogu, aby zapisać oryginalny opis i normy
        const catalogTask = await dbService.getItem(TASKS_CATALOG_STORE_NAME, taskCatalogId);
        if (catalogTask) {
            updatedRow.originalCatalogDesc = catalogTask.description; // Zapisz oryginalny opis
            // Usuń lokalne normy, jeśli są, aby używać tych z katalogu
            delete updatedRow.localUnit;
            delete updatedRow.localNormR;
            delete updatedRow.localNormsM;
            delete updatedRow.localWorkerCategory;
        } else {
            console.warn(`handleDropdownClick: Nie znaleziono zadania w katalogu o ID: ${taskCatalogId}.`);
            // Jeśli nie znaleziono w katalogu, usuń taskCatalogId i traktuj jako lokalny
            delete updatedRow.taskCatalogId;
            updatedRow.originalCatalogDesc = null;
        }

        // Zaktualizuj model i wyrenderuj
        updatedRows[rowIndex] = updatedRow;
        await updateModelAndRender({ rows: updatedRows }); // Centralna funkcja aktualizacji

        hideAllDropdowns();
        inputElement.focus();

    } else if (target.matches('.add-new-user-task-item')) {
        hideAllDropdowns(true);
        if (typeof openModal === 'function') {
            await openModal('new_custom', null);
            const modalBranchSelect = document.getElementById('modal-task-branch-select');
            const globalSelectedBranch = (typeof branchSelectDropdown !== 'undefined' ? branchSelectDropdown.value : null);
            if (modalBranchSelect && globalSelectedBranch) {
                modalBranchSelect.value = globalSelectedBranch;
            }
        }
    } else if (target.matches('.back-to-departments')) {
        await renderDropdownOptions(container, 'departments', null, '', currentBranchCode);
    }
};


// ==========================================================================
// SEKCJA 3: LOGIKA WIERSZY KOSZTORYSU (OBLICZENIA, DODAWANIE, EDYCJA)
// ZMIANA: Modyfikacja funkcji addRow dla obsługi nowego UX edycji opisu.
// ==========================================================================

// ==========================================================================
// NOWA FUNKCJA: CENTRALNE RENDEROWANIE TABELI KOSZTORYSU Z MODELU
// Opis: Funkcja ta przyjmuje obiekt modelu kosztorysu i renderuje/aktualizuje
//       całą tabelę HTML na podstawie danych w tym modelu.
// ==========================================================================
async function renderCostTable(model) {
    if (!costTableBody) {
        console.error("renderCostTable: Element 'costTableBody' nie znaleziony.");
        return;
    }

    // Wyczyść całą zawartość tabeli
    costTableBody.innerHTML = '';
    // Jeśli używamy IndicatorRowId, upewnij się, że jest zdefiniowane
    const indicatorId = typeof INDICATOR_ROW_ID !== 'undefined' ? INDICATOR_ROW_ID : 'temp-insert-indicator';

    // Iteruj przez każdy obiekt wiersza w modelu
    for (const rowData of model.rows) {
        const newRow = document.createElement('tr');
        newRow.dataset.rowType = rowData.rowType;
        newRow.dataset.rowId = rowData.rowId; // Użyj istniejącego ID z modelu
        if (rowData.notes) newRow.dataset.notes = rowData.notes;


        // Obsługa kolorów wierszy (przeniesione z reapplyAllRowColors)
        let baseColorHex = model.departmentColors[rowData.rowId] || null;
        let finalRowColor = null;
        let finalTextColor = null;

        if (rowData.rowType === 'department') {
            finalRowColor = baseColorHex;
            finalTextColor = baseColorHex ? getContrastTextColor(baseColorHex) : '';
        } else if (rowData.rowType === 'subdepartment') {
            if (baseColorHex) { // Jeśli poddział ma własny kolor
                finalRowColor = baseColorHex;
            } else { // W przeciwnym razie, spróbuj odziedziczyć od działu nadrzędnego
                // Znajdź nadrzędny dział (dla dziedziczenia koloru)
                let parentDeptRowObject = null;
                const currentIndex = model.rows.findIndex(r => r.rowId === rowData.rowId);
                if (currentIndex > 0) {
                    let i = currentIndex - 1;
                    while(i >= 0) {
                        if (model.rows[i].rowType === 'department') {
                            parentDeptRowObject = model.rows[i];
                            break;
                        }
                        i--;
                    }
                }
                if (parentDeptRowObject && model.departmentColors[parentDeptRowObject.rowId]) {
                    const parentDeptColor = model.departmentColors[parentDeptRowObject.rowId];
                    // Oblicz index poddziału w ramach tego działu, aby uzyskać zróżnicowane odcienie
                    let subDeptCounter = 0;
                    let j = (parentDeptRowObject ? model.rows.findIndex(r => r.rowId === parentDeptRowObject.rowId) : -1) + 1;
                    while (j < currentIndex) {
                        if (model.rows[j].rowType === 'subdepartment') {
                            subDeptCounter++;
                        }
                        j++;
                    }
                    const lightenIndex = subDeptCounter % SUBDEPARTMENT_LIGHTEN_PERCENTAGES.length;
                    const lightenPercentage = SUBDEPARTMENT_LIGHTEN_PERCENTAGES[lightenIndex];
                    finalRowColor = lightenHexColor(parentDeptColor, lightenPercentage);
                }
            }
            finalTextColor = finalRowColor ? getContrastTextColor(finalRowColor) : '';
        } else if (rowData.rowType === 'task') {
            // Spróbuj odziedziczyć kolor od najbliższego działu/poddziału
            let parentSpecialRowObject = null;
            const currentIndex = model.rows.findIndex(r => r.rowId === rowData.rowId);
            if (currentIndex > 0) {
                let i = currentIndex - 1;
                while(i >= 0) {
                    if (model.rows[i].rowType === 'department' || model.rows[i].rowType === 'subdepartment') {
                        parentSpecialRowObject = model.rows[i];
                        break;
                    }
                    i--;
                }
            }

            if (parentSpecialRowObject) {
                const parentColorId = parentSpecialRowObject.rowId;
                const parentBaseColor = model.departmentColors[parentColorId] || null;
                // Jeśli nadrzędny dział/poddział ma własny kolor lub jest działem z odziedziczonym kolorem
                if (parentBaseColor) {
                    finalRowColor = lightenHexColor(parentBaseColor, 90); // Lekkie rozjaśnienie dla zadań
                } else if (parentSpecialRowObject.rowType === 'subdepartment') {
                    // Jeśli poddział nie miał własnego koloru, spróbuj odziedziczyć od jego działu
                    const parentDeptRowObject = model.rows.find(r => r.rowType === 'department' &&
                        model.rows.indexOf(r) < model.rows.indexOf(parentSpecialRowObject)
                        && model.rows.slice(model.rows.indexOf(r) + 1, model.rows.indexOf(parentSpecialRowObject)).every(sr => sr.rowType !== 'department')); // Znajdź nadrzędny dział
                    if (parentDeptRowObject && model.departmentColors[parentDeptRowObject.rowId]) {
                        const parentDeptColor = model.departmentColors[parentDeptRowObject.rowId];
                        let subDeptCounter = 0; // Ponownie oblicz indeks poddziału dla odcienia
                        let j = (parentDeptRowObject ? model.rows.findIndex(r => r.rowId === parentDeptRowObject.rowId) : -1) + 1;
                        while (j < model.rows.findIndex(r => r.rowId === parentSpecialRowObject.rowId)) {
                            if (model.rows[j].rowType === 'subdepartment') {
                                subDeptCounter++;
                            }
                            j++;
                        }
                        const lightenIndex = subDeptCounter % SUBDEPARTMENT_LIGHTEN_PERCENTAGES.length;
                        const lightenPercentage = SUBDEPARTMENT_LIGHTEN_PERCENTAGES[lightenIndex];
                        const inheritedSubDeptColor = lightenHexColor(parentDeptColor, lightenPercentage);
                        finalRowColor = lightenHexColor(inheritedSubDeptColor, 90);
                    }
                }
            }

            // Fallback na domyślny kolor zadania z konfiguratora, jeśli nie ma dziedziczenia
            if (!finalRowColor) {
                const defaultTaskBg = appState.getState('defaultTaskRowBackgroundColor');
                if (defaultTaskBg && defaultTaskBg !== 'transparent' && defaultTaskBg !== 'inherit') {
                    finalRowColor = defaultTaskBg;
                }
            }
            finalTextColor = finalRowColor ? getContrastTextColor(finalRowColor) : '';
        }

        if (finalRowColor) {
            newRow.style.setProperty('background-color', finalRowColor, 'important');
            newRow.style.setProperty('color', finalTextColor, 'important');
            const specialInput = newRow.querySelector('.special-row-input'); // For special rows
            const taskSearchInput = newRow.querySelector('.task-search-input'); // For task rows
            if(specialInput) specialInput.style.setProperty('color', finalTextColor, 'important');
            if(taskSearchInput) taskSearchInput.style.setProperty('color', finalTextColor, 'important');
            Array.from(newRow.cells).forEach(cell => cell.style.setProperty('color', finalTextColor, 'important'));

        } else {
            // Reset to default CSS styles (transparent or from theme)
            newRow.style.backgroundColor = '';
            newRow.style.color = '';
            const specialInput = newRow.querySelector('.special-row-input');
            const taskSearchInput = newRow.querySelector('.task-search-input');
            if(specialInput) specialInput.style.color = '';
            if(taskSearchInput) taskSearchInput.style.color = '';
            Array.from(newRow.cells).forEach(cell => cell.style.color = '');
        }


        // Obsługa zawartości wiersza w zależności od typu
        if (rowData.rowType === 'department' || rowData.rowType === 'subdepartment') {
            newRow.classList.add(rowData.rowType === 'department' ? 'department-row' : 'subdepartment-row');

            const tdDrag = newRow.insertCell(); tdDrag.className = 'col-drag print-hide';
            const dragHandle = document.createElement('span'); dragHandle.className = 'drag-handle'; dragHandle.title = 'Przeciągnij'; dragHandle.textContent = '↕'; dragHandle.draggable = true;
            dragHandle.addEventListener('dragstart', handleDragStart);
            dragHandle.addEventListener('dragend', handleDragEnd);
            tdDrag.appendChild(dragHandle);

            const tdLp = newRow.insertCell(); tdLp.className = 'col-lp'; tdLp.textContent = '?'; // LP będzie uzupełniane przez renumberRows
            const tdDesc = newRow.insertCell(); tdDesc.className = 'col-special-desc'; tdDesc.colSpan = 6;

            const descWrapperDiv = document.createElement('div');
            descWrapperDiv.style.cssText = 'display: flex; align-items: center; justify-content: space-between;';
            const inputField = document.createElement('input');
            inputField.type = 'text'; inputField.className = 'special-row-input'; inputField.value = rowData.text;
            inputField.placeholder = `Nazwa ${rowData.rowType === 'department' ? 'Działu' : 'Poddziału'}...`;
            // Listener: Aktualizuj model po zmianie inputa
            inputField.addEventListener('change', (e) => {
                const updatedRows = model.rows.map(row =>
                    row.rowId === rowData.rowId ? { ...row, text: e.target.value.trim() } : row
                );
                updateModelAndRender({ rows: updatedRows }); // Wywołaj globalną funkcję updateModelAndRender
            });
            descWrapperDiv.appendChild(inputField);

            const iconsContainer = document.createElement('span');
            iconsContainer.className = 'special-row-icons-container';

            // Notes Icon
            const notesIconWrapper = document.createElement('span'); notesIconWrapper.className = 'notes-icon-wrapper';
            const notesIconEl = document.createElement('span'); notesIconEl.className = 'notes-icon'; notesIconEl.title = 'Dodaj/Edytuj Notatkę'; notesIconEl.innerHTML = rowData.notes ? '📝' : '🗒️';
            if (rowData.notes) notesIconEl.classList.add('has-notes');
            const notesTooltip = document.createElement('span'); notesTooltip.className = 'notes-preview-tooltip';
            notesTooltip.textContent = rowData.notes || "Brak notatki";
            // Zmieniono: Przekazujemy rowId, a nie element DOM
            if(typeof openNotesModal === 'function') notesIconEl.addEventListener('click', () => openNotesModal(rowData.rowId));
            notesIconWrapper.appendChild(notesIconEl); notesIconWrapper.appendChild(notesTooltip);
            iconsContainer.appendChild(notesIconWrapper);

            // Color Picker Icon
            const colorPickerIcon = document.createElement('span');
            colorPickerIcon.className = 'color-picker-icon';
            colorPickerIcon.innerHTML = '🖌️';
            colorPickerIcon.title = 'Zmień kolor wiersza';
            colorPickerIcon.addEventListener('click', (event) => {
                // Ta funkcja musi wiedzieć, który wiersz i model aktualizować
                openColorPalette(event, newRow); // openColorPalette przyjmuje DOM element
            });
            iconsContainer.appendChild(colorPickerIcon);

            // Edit Special Row Icon
            const editSpecialRowIcon = document.createElement('span');
            editSpecialRowIcon.innerHTML = '⚙️';
            editSpecialRowIcon.className = 'edit-special-row-icon';
            editSpecialRowIcon.title = 'Edytuj szczegóły działu/poddziału';
            editSpecialRowIcon.style.cursor = 'pointer';
            editSpecialRowIcon.style.marginLeft = '5px';
            editSpecialRowIcon.addEventListener('click', (event) => {
                event.stopPropagation();
                showNotification(`TODO: Otwórz mini-modal edycji dla '${inputField.value}' (ID: ${rowData.rowId})`, 'info');
                console.log("Kliknięto edycję dla specjalnego wiersza:", rowData.rowId, inputField.value);
            });
            iconsContainer.appendChild(editSpecialRowIcon);

            descWrapperDiv.appendChild(iconsContainer);
            tdDesc.appendChild(descWrapperDiv);

            const tdValue = newRow.insertCell();
            tdValue.className = `col-value special-row-sum ${rowData.rowType === 'department' ? 'department-total-value' : 'subdepartment-total-value'}`;
            tdValue.style.cssText = 'font-weight:bold; text-align:right;';
            tdValue.textContent = '0.00'; // Będzie aktualizowane przez calculateAllTotals

        } else if (rowData.rowType === 'task') {
            // Task-specific attributes
            newRow.dataset.taskCatalogId = rowData.taskCatalogId || '';
            if (rowData.localDesc) newRow.dataset.localDesc = rowData.localDesc;
            if (rowData.localUnit) newRow.dataset.localUnit = rowData.localUnit;
            if (rowData.localNormR !== undefined) newRow.dataset.localNormR = rowData.localNormR.toString();
            if (rowData.localNormsM) newRow.dataset.localNormsM = JSON.stringify(rowData.localNormsM);
            if (rowData.localWorkerCategory) newRow.dataset.localWorkerCategory = rowData.localWorkerCategory;
            if (rowData.originalCatalogDesc) newRow.dataset.originalCatalogDesc = rowData.originalCatalogDesc;


            const tdDrag = newRow.insertCell(); tdDrag.className = 'col-drag print-hide';
            const dragHandle = document.createElement('span'); dragHandle.className = 'drag-handle'; dragHandle.title = 'Przeciągnij'; dragHandle.textContent = '↕'; dragHandle.draggable = true;
            dragHandle.addEventListener('dragstart', handleDragStart);
            dragHandle.addEventListener('dragend', handleDragEnd);
            tdDrag.appendChild(dragHandle);

            const tdLp = newRow.insertCell(); tdLp.className = 'col-lp'; tdLp.textContent = '?'; // LP będzie uzupełniane przez renumberRows
            const tdDesc = newRow.insertCell(); tdDesc.className = 'col-desc';

            const descFlexContainer = document.createElement('div');
            descFlexContainer.style.cssText = 'display: flex; align-items: center; justify-content: space-between;';
            const suggestionsContainer = document.createElement('div');
            suggestionsContainer.className = 'suggestions-container';
            suggestionsContainer.style.flexGrow = '1';
            const inputWrapper = document.createElement('div');
            inputWrapper.style.cssText = 'display: flex; align-items: center;';
            const searchInput = document.createElement('input');
            searchInput.type = 'text'; searchInput.className = 'task-search-input'; searchInput.placeholder = 'Wybierz/Wyszukaj...'; searchInput.autocomplete = 'off'; searchInput.style.flexGrow = '1';
            inputWrapper.appendChild(searchInput);

            // Set initial description value
            searchInput.value = rowData.localDesc || rowData.description || '';
            // Set readOnly based on whether it's a catalog task (and not locally modified)
            const isCatalogTask = rowData.taskCatalogId && !rowData.localDesc;
            searchInput.readOnly = isCatalogTask;
            searchInput.style.backgroundColor = isCatalogTask ? 'var(--light-gray)' : '';
            searchInput.style.cursor = isCatalogTask ? 'not-allowed' : '';


            const suggestionsDropdown = document.createElement('div');
            suggestionsDropdown.className = 'suggestions-dropdown';
            suggestionsDropdown.addEventListener('click', handleDropdownClick); // handleDropdownClick needs to be adapted

            suggestionsContainer.appendChild(inputWrapper);
            suggestionsContainer.appendChild(suggestionsDropdown);
            descFlexContainer.appendChild(suggestionsContainer);

            // Notes Icon for tasks
            const notesIconWrapper = document.createElement('span'); notesIconWrapper.className = 'notes-icon-wrapper';
            const notesIconEl = document.createElement('span'); notesIconEl.className = 'notes-icon'; notesIconEl.title = 'Dodaj/Edytuj Notatkę'; notesIconEl.innerHTML = rowData.notes ? '📝' : '🗒️';
            if (rowData.notes) notesIconEl.classList.add('has-notes');
            const notesTooltip = document.createElement('span'); notesTooltip.className = 'notes-preview-tooltip';
            notesTooltip.textContent = rowData.notes || "Brak notatki";
            // Zmieniono: Przekazujemy rowId, a nie element DOM
            if(typeof openNotesModal === 'function') notesIconEl.addEventListener('click', () => openNotesModal(rowData.rowId));
            notesIconWrapper.appendChild(notesIconEl); notesIconWrapper.appendChild(notesTooltip);
            descFlexContainer.appendChild(notesIconWrapper);

            const normsDisplayDiv = document.createElement('div'); normsDisplayDiv.className = 'norms-display'; normsDisplayDiv.style.display = 'none'; // Will be updated by calculateRowValues
            tdDesc.appendChild(descFlexContainer);
            tdDesc.appendChild(normsDisplayDiv);

            newRow.insertCell().className = 'col-unit'; // Unit will be updated by calculateRowValues

            const tdQty = newRow.insertCell(); tdQty.className = 'col-qty';
            const quantityInput = document.createElement('input');
            quantityInput.type = 'text'; quantityInput.className = 'quantity-input';
            quantityInput.value = (typeof rowData.quantity === 'number' ? rowData.quantity.toFixed(3) : "0.000").replace('.', ',');
            tdQty.appendChild(quantityInput);

            newRow.insertCell().className = 'col-price-r-unit'; // Will be updated by calculateRowValues
            newRow.insertCell().className = 'col-price-m-unit'; // Will be updated by calculateRowValues
            newRow.insertCell().className = 'col-price-total'; // Will be updated by calculateRowValues
            newRow.insertCell().className = 'col-value'; // Will be updated by calculateRowValues

            // Add event listeners for task rows
            searchInput.addEventListener('focus', (e) => {
                if (!searchInput.readOnly) {
                    if (typeof showDropdown === 'function') showDropdown(e.target);
                }
            });

            // Handle description input change
            const handleSearchInputChangeAndPotentialRemoval = async () => {
                // Now directly using the rowData from the outer loop and the current DOM state of searchInput
                // The `searchInput.readOnly` and `dataset.wasReadOnlyBeforeEdit` logic still applies to the DOM element.
                if (searchInput.readOnly) return;

                const newText = searchInput.value.trim();
                const wasReadOnly = searchInput.dataset.wasReadOnlyBeforeEdit === "true"; // Flag on DOM element
                const originalCatalogId = rowData.taskCatalogId; // From model
                const originalCatalogDesc = rowData.originalCatalogDesc || ""; // From model

                delete searchInput.dataset.wasReadOnlyBeforeEdit; // Clean up temporary flag on DOM element

                // Find index of the current row in the model to update it
                const rowIndex = model.rows.findIndex(r => r.rowId === rowData.rowId);
                if (rowIndex === -1) {
                    console.error("handleSearchInputChangeAndPotentialRemoval: Nie znaleziono obiektu wiersza w modelu.");
                    return;
                }
                let updatedRow = { ...model.rows[rowIndex] }; // Create a copy to modify

                if (wasReadOnly && originalCatalogId && newText !== originalCatalogDesc) {
                    showConfirmNotification(
                        `Zmieniono opis pozycji powiązanej z katalogiem ("${originalCatalogDesc || 'Poprzedni opis'}").<br><br><b>[OK]</b> = Utwórz nową pozycję własną na podstawie tych zmian.<br><b>[Anuluj]</b> = Zaktualizuj tylko opis lokalnie dla tego wiersza (pozostanie powiązany z katalogiem).`,
                        async () => { // OK: Create new custom task based on this row (break link to catalog)
                            updatedRow.localDesc = newText;
                            delete updatedRow.taskCatalogId; // Break link to catalog
                            delete updatedRow.originalCatalogDesc; // No longer applies
                            // Copy catalog norms to local if they weren't locally set
                            if (originalCatalogId) {
                                const baseTask = await dbService.getItem(TASKS_CATALOG_STORE_NAME, originalCatalogId);
                                if (baseTask) {
                                    if (!updatedRow.localUnit && baseTask.unit) updatedRow.localUnit = baseTask.unit;
                                    if (updatedRow.localNormR === undefined && baseTask.norms?.R !== undefined) updatedRow.localNormR = baseTask.norms.R;
                                    if (updatedRow.localNormsM === undefined && baseTask.norms?.M) updatedRow.localNormsM = JSON.parse(JSON.stringify(baseTask.norms.M)); // Deep copy
                                    if (!updatedRow.localWorkerCategory && baseTask.workerCategory) updatedRow.localWorkerCategory = baseTask.workerCategory;
                                }
                            }
                            updatedRow.description = newText; // Ensure description is the new one
                            const updatedRows = [...model.rows]; updatedRows[rowIndex] = updatedRow;
                            await updateModelAndRender({ rows: updatedRows }); // Trigger re-render
                            showNotification("Utworzono lokalną wersję pozycji z nowym opisem. Powiązanie z katalogiem zostało usunięte.", 'info');
                        },
                        async () => { // Cancel: Update description locally, keep catalog link
                            updatedRow.localDesc = newText;
                            // Keep taskCatalogId and originalCatalogDesc as is
                            updatedRow.description = newText; // This is only for display in model
                            const updatedRows = [...model.rows]; updatedRows[rowIndex] = updatedRow;
                            await updateModelAndRender({ rows: updatedRows }); // Trigger re-render
                            showNotification("Opis został zaktualizowany lokalnie dla tego wiersza.", 'info');
                        }
                    );
                } else {
                    // Scenario: User typing in a non-catalog or new task, or just a local description change
                    // Check if the row is "potentially empty" and now truly empty
                    if (updatedRow.isPotentiallyEmpty === true && !newText && !updatedRow.taskCatalogId && (updatedRow.quantity === 0 || isNaN(updatedRow.quantity))) {
                        // Remove empty row from model
                        const updatedRows = model.rows.filter(r => r.rowId !== rowData.rowId); // Filter out this row
                        await updateModelAndRender({ rows: updatedRows }); // Trigger re-render (which will also remove the DOM element)
                        // lastClickedRow update handled in renderCostTable after new lastClickedRow is set
                        return; // Exit as row is removed
                    } else {
                        // Update local description in model
                        updatedRow.localDesc = newText;
                        updatedRow.description = newText; // Set description to new local text
                        updatedRow.isPotentiallyEmpty = false; // It's no longer potentially empty
                        // If no catalog link, ensure taskCatalogId is null/undefined
                        if (!originalCatalogId) {
                             delete updatedRow.taskCatalogId;
                             delete updatedRow.originalCatalogDesc;
                        }
                        const updatedRows = [...model.rows]; updatedRows[rowIndex] = updatedRow;
                        await updateModelAndRender({ rows: updatedRows }); // Trigger re-render
                    }
                }
            };
            searchInput.addEventListener('change', handleSearchInputChangeAndPotentialRemoval); // On blur or Enter/Tab
            searchInput.addEventListener('blur', (e) => { // Handle blur to ensure input value is processed
                 if (activeDropdown && activeDropdown.style.display === 'block' && activeDropdown.contains(e.relatedTarget)) {
                    // If blur is due to clicking on dropdown, let handleDropdownClick manage it.
                    return;
                }
                // If it's not a catalog task and not readOnly, process the change
                if (!searchInput.readOnly) {
                    handleSearchInputChangeAndPotentialRemoval();
                }
            });


            // Handle dblclick to edit catalog task description
            descFlexContainer.addEventListener('dblclick', async (event) => {
                if (event.target.closest('.notes-icon-wrapper') || event.target.closest('.color-picker-icon') || event.target.closest('.edit-special-row-icon')) return;
                if (searchInput.readOnly) {
                    event.stopPropagation();
                    // Store flag that it was readOnly before edit
                    searchInput.dataset.wasReadOnlyBeforeEdit = "true";
                    // Remove readOnly, allowing typing
                    searchInput.readOnly = false;
                    searchInput.style.backgroundColor = '';
                    searchInput.style.cursor = '';
                    searchInput.focus();
                    searchInput.select();
                }
            });


            // Quantity input change
            const handleQuantityChange = async (e) => {
                const newQuantity = typeof evaluateMathExpression === 'function' ? evaluateMathExpression(e.target.value) : (parseFloat(e.target.value.replace(',', '.')) || 0);
                e.target.value = newQuantity.toFixed(3).replace('.', ','); // Format display in DOM

                // Find index of the current row in the model to update it
                const rowIndex = model.rows.findIndex(r => r.rowId === rowData.rowId);
                if (rowIndex === -1) {
                    console.error("handleQuantityChange: Nie znaleziono obiektu wiersza w modelu.");
                    return;
                }
                let updatedRow = { ...model.rows[rowIndex] }; // Create a copy to modify

                // Check for empty row (new logic based on model)
                if (updatedRow.isPotentiallyEmpty === true && newQuantity === 0 && !updatedRow.localDesc && !updatedRow.taskCatalogId) {
                    // Remove empty row from model
                    const updatedRows = model.rows.filter(r => r.rowId !== rowData.rowId); // Filter out this row
                    await updateModelAndRender({ rows: updatedRows }); // Trigger re-render
                    // lastClickedRow update handled in renderCostTable after new lastClickedRow is set
                    return; // Exit as row is removed
                } else {
                    // Update quantity in model
                    updatedRow.quantity = newQuantity;
                    updatedRow.isPotentiallyEmpty = false; // It's no longer potentially empty
                    const updatedRows = [...model.rows]; updatedRows[rowIndex] = updatedRow;
                    await updateModelAndRender({ rows: updatedRows }); // Trigger re-render
                }
            };
            quantityInput.addEventListener('input', (e) => handleQuantityInputChange(e.target)); // Debounced calculation for display
            quantityInput.addEventListener('change', handleQuantityChange);
            quantityInput.addEventListener('blur', handleQuantityChange);


        }

        // Add common event listeners for all row types (drag & drop, click for lastClickedRow)
        newRow.addEventListener('dragover', handleDragOver);
        newRow.addEventListener('dragleave', handleDragLeave);
        newRow.addEventListener('drop', handleDrop);
        newRow.addEventListener('click', () => {
            // Highlight the clicked row
            if (lastClickedRow && lastClickedRow !== newRow) {
                lastClickedRow.classList.remove('last-clicked-row-highlight');
            }
            lastClickedRow = newRow;
            newRow.classList.add('last-clicked-row-highlight');

            // Update saveDepartmentTemplateBtn state based on new lastClickedRow
            if (saveDepartmentTemplateBtn) {
                saveDepartmentTemplateBtn.disabled = !(lastClickedRow.dataset.rowType === 'department');
            }
        });

        costTableBody.appendChild(newRow);
    } // End of for...of loop for model.rows

    // Po zbudowaniu całej tabeli, wywołaj ponowne obliczenia i numerowanie
    await recalculateAllRowsAndTotals();
    renumberRows(); // renumberRows needs to update LP in DOM elements after re-rendering

    // Initial highlighting for the first row if table is not empty
    if (!lastClickedRow && costTableBody.rows.length > 0) {
        lastClickedRow = costTableBody.querySelector('tr:not(.insert-indicator-row)');
        if (lastClickedRow) {
             lastClickedRow.classList.add('last-clicked-row-highlight');
             if (saveDepartmentTemplateBtn) saveDepartmentTemplateBtn.disabled = !(lastClickedRow.dataset.rowType === 'department');
        }
    }
}


async function calculateRowValues(rowObject, domRowElement) { // Przyjmuje obiekt modelu i element DOM
    if (!rowObject || rowObject.rowType !== 'task') return 0; // Tylko dla zadań

    const searchInput = domRowElement.querySelector('.task-search-input');
    const quantityInput = domRowElement.querySelector('.quantity-input');
    const unitElement = domRowElement.cells[3];
    const priceRUnitElement = domRowElement.cells[5];
    const priceMUnitElement = domRowElement.cells[6];
    const priceTotalUnitElement = domRowElement.cells[7];
    const valueElement = domRowElement.cells[8];
    const normsDisplay = domRowElement.querySelector('.norms-display');

    // Odczytujemy dane bezpośrednio z rowObject
    const taskCatalogId = rowObject.taskCatalogId;
    let currentDescription = rowObject.localDesc || rowObject.description || '';
    const quantity = rowObject.quantity; // Ilość jest już w modelu
    let normR = rowObject.localNormR;
    let normsM_source = rowObject.localNormsM ? JSON.parse(JSON.stringify(rowObject.localNormsM)) : []; // Użyj głębokiej kopii
    let taskUnit = rowObject.localUnit || '';
    let workerCategory = rowObject.localWorkerCategory || 'ogolnobudowlany';

    let sourceTask = null;
    if (taskCatalogId) {
        sourceTask = await dbService.getItem(TASKS_CATALOG_STORE_NAME, taskCatalogId);
        if (sourceTask) {
            // Jeśli opis nie jest lokalnie nadpisany, użyj tego z katalogu
            if (!rowObject.localDesc) currentDescription = sourceTask.description;
            // Jeśli jednostka nie jest lokalnie nadpisana, użyj tej z katalogu
            if (!rowObject.localUnit) taskUnit = sourceTask.unit;
            // Jeśli normy R nie są lokalnie nadpisane, użyj tych z katalogu
            if (rowObject.localNormR === undefined && sourceTask.norms?.R !== undefined) normR = sourceTask.norms.R;
            // Jeśli normy M nie są lokalnie nadpisane, użyj tych z katalogu
            if (rowObject.localNormsM === undefined && sourceTask.norms?.M) normsM_source = JSON.parse(JSON.stringify(sourceTask.norms.M)); // Głęboka kopia
            // Jeśli kategoria pracownika nie jest lokalnie nadpisana, użyj tej z katalogu
            if (rowObject.localWorkerCategory === undefined && sourceTask.workerCategory) workerCategory = sourceTask.workerCategory;
        } else {
            console.warn(`Nie znaleziono zadania o ID ${taskCatalogId} w katalogu. Używam danych lokalnych lub domyślnych.`);
            if (!currentDescription) currentDescription = "Błąd: Brak zadania w katalogu";
        }
    }
    // Jeśli w rowObject.description jest jakiś opis, użyj go jako nadrzędny, gdy nie ma catalogId i localDesc
    if (!currentDescription && rowObject.description) currentDescription = rowObject.description;

    // Upewnij się, że input opisu jest aktualny
    if (searchInput) searchInput.value = currentDescription;

    if (!taskUnit) taskUnit = '?';
    if(unitElement) unitElement.textContent = taskUnit;

    let unitPriceR = 0;
    let unitPriceM = 0;
    let normsTextR = `<strong>R (${getWorkerCategoryName(workerCategory)}):</strong> -`;

    const laborRate = getLaborRateForWorkerCategory(workerCategory);
    if (typeof normR === 'number' && normR >= 0) {
        unitPriceR = normR * laborRate;
        normsTextR = `<strong>R (${getWorkerCategoryName(workerCategory)}):</strong> ${normR.toFixed(3)} ${taskUnit || 'j.m.'}`;
    }

    const materialNormsStrings = [];
    if (Array.isArray(normsM_source)) {
        for (const matNorm of normsM_source) {
            let materialName, materialUnitForDisplay;
            let materialMarketPrice = 0;
            if (matNorm.materialId) {
                const matFromDb = await dbService.getItem(MATERIALS_CATALOG_STORE_NAME, matNorm.materialId);
                if (matFromDb) {
                    materialName = matFromDb.name;
                    materialUnitForDisplay = matNorm.unit || matFromDb.unit || 'j.m.';
                    materialMarketPrice = matFromDb.priceY || 0;
                } else {
                    materialName = `Nieznany mat. (ID: ${matNorm.materialId})`;
                    materialUnitForDisplay = matNorm.unit || 'j.m.';
                }
            } else if (matNorm.name) { // Obsługa starszych norm bez materialId, tylko z name
                materialName = matNorm.name.trim();
                const matFromDbByName = await dbService.getItemByIndex(MATERIALS_CATALOG_STORE_NAME, 'name', matNorm.name.trim());
                if(matFromDbByName){
                    materialUnitForDisplay = matNorm.unit || matFromDbByName.unit || 'j.m.';
                    materialMarketPrice = matFromDbByName.priceY || 0;
                } else {
                    materialUnitForDisplay = matNorm.unit || (typeof getMaterialUnit === 'function' ? await getMaterialUnit(matNorm.name) : 'j.m.');
                    materialMarketPrice = typeof getMaterialPrice === 'function' ? await getMaterialPrice(matNorm.name) : 0;
                }
            } else { continue; } // Jeśli brak nazwy i ID, pomiń
            if (materialName && typeof matNorm.quantity === 'number' && matNorm.quantity > 0) {
                unitPriceM += matNorm.quantity * materialMarketPrice;
                materialNormsStrings.push(`${materialName}: ${matNorm.quantity.toFixed(3)} ${materialUnitForDisplay}`);
            }
        }
    }

    let finalNormsText = normsTextR;
    if (materialNormsStrings.length > 0) {
        finalNormsText += `<br><strong>M:</strong> ${materialNormsStrings.join('<br>   ')}`;
    } else {
        finalNormsText += `<br><strong>M:</strong> -`;
    }

    if(priceRUnitElement) priceRUnitElement.textContent = formatCurrency(unitPriceR);
    if(priceMUnitElement) priceMUnitElement.textContent = formatCurrency(unitPriceM);

    const unitPriceTotal = unitPriceR + unitPriceM;
    if(priceTotalUnitElement) priceTotalUnitElement.textContent = formatCurrency(unitPriceTotal);

    const totalValue = quantity * unitPriceTotal;
    if(valueElement) valueElement.textContent = formatCurrency(totalValue);

    if (normsDisplay) {
        const showNorms = (typeof normR === 'number' && normR > 0) || (materialNormsStrings.length > 0);
        normsDisplay.innerHTML = finalNormsText;
        normsDisplay.style.display = showNorms ? 'block' : 'none';
    }

    // Zwróć obliczoną wartość, będzie użyta w calculateAllTotals
    return totalValue;
}
async function calculateAllTotals() {
    let grandTotal = 0;
    chapterSums = {}; // Zresetuj sumy rozdziałów
    let currentDepartmentId = null;
    let currentSubDepartmentId = null;
    let currentDepartmentTotal = 0;
    let currentSubDepartmentTotal = 0;

    if (!costTableBody) {
        if (grandTotalElement) grandTotalElement.textContent = formatCurrency(0);
        return;
    }

    // W tym miejscu NIE potrzebujemy już iterować po `costTableBody.querySelectorAll('tr[data-row-type="task"]')`
    // i wywoływać `calculateRowValues`, ponieważ `renderCostTable` już to zrobiła dla wszystkich wierszy.
    // Zakładamy, że wartości w kolumnie "Wartość" (index 8) w DOM są już aktualne.

    // Iteruj po WIZUALNYCH WIERSZACH (DOM), aby odczytać aktualne wartości z komórek
    // To jest tymczasowe. Docelowo, te wartości (totalValue, etc.) powinny być przechowywane w modelu
    // po wywołaniu calculateRowValues, a tutaj po prostu sumowane z modelu.
    const allDomRows = Array.from(costTableBody.querySelectorAll('tr'));
    for (const domRow of allDomRows) {
        if (domRow.id === (typeof INDICATOR_ROW_ID !== 'undefined' ? INDICATOR_ROW_ID : 'temp-insert-indicator')) continue;

        const rowType = domRow.dataset.rowType;
        const rowId = domRow.dataset.rowId;

        if (rowType === 'department') {
            // Zapisz sumy dla poprzednich bloków, jeśli istnieją
            if (currentSubDepartmentId && chapterSums.hasOwnProperty(currentSubDepartmentId)) {
                const subDeptSumCell = costTableBody.querySelector(`tr[data-row-id="${currentSubDepartmentId}"] .subdepartment-total-value`);
                if(subDeptSumCell) subDeptSumCell.textContent = formatCurrency(currentSubDepartmentTotal);
                chapterSums[currentSubDepartmentId] = currentSubDepartmentTotal;
            }
            if (currentDepartmentId && chapterSums.hasOwnProperty(currentDepartmentId)) {
                const deptSumCell = costTableBody.querySelector(`tr[data-row-id="${currentDepartmentId}"] .department-total-value`);
                if(deptSumCell) deptSumCell.textContent = formatCurrency(currentDepartmentTotal);
                chapterSums[currentDepartmentId] = currentDepartmentTotal;
            }

            // Ustaw nowy dział
            currentDepartmentId = rowId;
            currentSubDepartmentId = null; // Resetuj poddział, gdy nowy dział
            currentDepartmentTotal = 0;
            currentSubDepartmentTotal = 0; // Resetuj sumę poddziału
            chapterSums[currentDepartmentId] = 0; // Inicjuj sumę dla nowego działu
            const deptSumCell = domRow.querySelector('.department-total-value');
            if(deptSumCell) deptSumCell.textContent = formatCurrency(0); // Wyzeruj wyświetlaną sumę
        } else if (rowType === 'subdepartment') {
            // Zapisz sumę dla poprzedniego poddziału, jeśli istnieje
            if (currentSubDepartmentId && chapterSums.hasOwnProperty(currentSubDepartmentId)) {
                const subDeptSumCell = costTableBody.querySelector(`tr[data-row-id="${currentSubDepartmentId}"] .subdepartment-total-value`);
                if(subDeptSumCell) subDeptSumCell.textContent = formatCurrency(currentSubDepartmentTotal);
                chapterSums[currentSubDepartmentId] = currentSubDepartmentTotal;
            }

            // Ustaw nowy poddział
            currentSubDepartmentId = rowId;
            currentSubDepartmentTotal = 0;
            chapterSums[currentSubDepartmentId] = 0; // Inicjuj sumę dla nowego poddziału
            const subDeptSumCell = domRow.querySelector('.subdepartment-total-value');
            if(subDeptSumCell) subDeptSumCell.textContent = formatCurrency(0); // Wyzeruj wyświetlaną sumę
        } else if (rowType === 'task') {
            const value = parseFloat(domRow.cells[8]?.textContent.replace(',', '.')) || 0;
            grandTotal += value;
            if (currentDepartmentId) currentDepartmentTotal += value;
            if (currentSubDepartmentId) currentSubDepartmentTotal += value;
        }
    }

    // Po zakończeniu pętli, zaktualizuj ostatnie sumy (działu i poddziału)
    if (currentSubDepartmentId && chapterSums.hasOwnProperty(currentSubDepartmentId)) {
        const subDeptSumCell = costTableBody.querySelector(`tr[data-row-id="${currentSubDepartmentId}"] .subdepartment-total-value`);
        if(subDeptSumCell) subDeptSumCell.textContent = formatCurrency(currentSubDepartmentTotal);
        chapterSums[currentSubDepartmentId] = currentSubDepartmentTotal;
    }
    if (currentDepartmentId && chapterSums.hasOwnProperty(currentDepartmentId)) {
        const deptSumCell = costTableBody.querySelector(`tr[data-row-id="${currentDepartmentId}"] .department-total-value`);
        if(deptSumCell) deptSumCell.textContent = formatCurrency(currentDepartmentTotal);
        chapterSums[currentDepartmentId] = currentDepartmentTotal;
    }

    if (grandTotalElement) grandTotalElement.textContent = formatCurrency(grandTotal);
}
async function recalculateAllRowsAndTotals() {
    await calculateAllTotals();
    if (typeof calculateMaterialSummary === 'function') await calculateMaterialSummary();
    if (typeof renumberRows === 'function') renumberRows();
    if (typeof updateDynamicSpecialistRatesVisibility === 'function' && document.getElementById('ustawienia')?.classList.contains('active')) {
        await updateDynamicSpecialistRatesVisibility();
    }
}
async function addSpecialRow(type, text = '', isLoadOperation = false, fromTemplate = false, fixedRowId = null, insertBeforeNode = null, notes = "") {
    if (!costTableBody) return null;

    // Sprawdzenie trybu hierarchicznego
    const currentIsHierarchical = currentEstimateModel.isHierarchical; // Odczyt z modelu
    if (!currentIsHierarchical && !fromTemplate && !isLoadOperation) {
        currentEstimateModel.isHierarchical = true; // Zaktualizuj model
        appState.setState('isHierarchicalMode', true); // Zaktualizuj też appState dla UI/ustawień
    } else if (currentIsHierarchical && type === 'subdepartment' && !currentEstimateModel.rows.some(r => r.rowType === 'department')) {
        // Sprawdź, czy są jakieś działy w modelu
        if (typeof showNotification === 'function') showNotification("Aby dodać poddział, najpierw musi istnieć dział w trybie hierarchicznym.", 'warning');
        else alert("Aby dodać poddział, najpierw musi istnieć dział w trybie hierarchicznym.");
        return null;
    }

    // Utwórz nowy obiekt wiersza dla modelu
    const newRowId = fixedRowId || `${type}-${Date.now()}-${Math.random().toString(36).substring(2,7)}`;
    const newRowData = {
        rowType: type,
        rowId: newRowId,
        text: text,
        notes: notes
    };

    // Określenie miejsca wstawienia nowego wiersza w modelu
    const currentRows = [...currentEstimateModel.rows];
    let insertIndex = -1;

    if (insertBeforeNode && costTableBody.contains(insertBeforeNode)) {
        const insertBeforeRowId = insertBeforeNode.dataset.rowId;
        insertIndex = currentRows.findIndex(row => row.rowId === insertBeforeRowId);
    } else if (lastClickedRow && costTableBody.contains(lastClickedRow)) {
        const lastClickedRowId = lastClickedRow.dataset.rowId;
        const clickedIndex = currentRows.findIndex(row => row.rowId === lastClickedRowId);
        if (clickedIndex !== -1) {
            if (type === 'department') {
                // Wstaw po bloku obecnego działu
                let tempIndex = clickedIndex;
                while (tempIndex < currentRows.length && (currentRows[tempIndex].rowType !== 'department' || tempIndex === clickedIndex)) {
                    tempIndex++;
                }
                insertIndex = tempIndex;
            } else if (type === 'subdepartment') {
                 let tempIndex = clickedIndex;
                if(currentRows[tempIndex].rowType === 'department') {
                     insertIndex = tempIndex + 1; // Bezpośrednio po dziale
                } else {
                    while (tempIndex < currentRows.length && (currentRows[tempIndex].rowType !== 'department' && currentRows[tempIndex].rowType !== 'subdepartment' || tempIndex === clickedIndex)) {
                        tempIndex++;
                    }
                    insertIndex = tempIndex;
                }
            } else {
                insertIndex = clickedIndex + 1; // Domyślnie po
            }
        }
    }

    // Dodaj nowy obiekt wiersza do modelu
    if (insertIndex > -1 && insertIndex <= currentRows.length) {
        currentRows.splice(insertIndex, 0, newRowData);
    } else {
        currentRows.push(newRowData);
    }

    // Zainicjuj kolor dla nowego działu/poddziału
    if (!currentEstimateModel.departmentColors.hasOwnProperty(newRowId)) {
        currentEstimateModel.departmentColors[newRowId] = null; // Domyślnie bez własnego koloru
    }

    // Aktualizuj model i wyrenderuj tabelę
    await updateModelAndRender({ rows: currentRows, departmentColors: currentEstimateModel.departmentColors, isHierarchical: currentEstimateModel.isHierarchical });

    // Dodatkowe akcje po renderowaniu (bezpośrednie ustawienie focusu)
    if (!isLoadOperation && !fromTemplate) {
        setTimeout(() => {
            const newDomRow = costTableBody.querySelector(`tr[data-row-id="${newRowId}"]`);
            if (newDomRow) {
                const inputField = newDomRow.querySelector('.special-row-input');
                if (inputField) {
                    inputField.focus();
                    inputField.select();
                }
            }
        }, 0);
    }
    return newRowData; // Zwróć obiekt modelu
}

async function addRow(initialData = null, isLoadOperation = false, insertBeforeNode = null) {
    if (!costTableBody) return null;

    // Utwórz nowy obiekt wiersza dla modelu
    const newRowId = `task-${Date.now()}-${Math.random().toString(36).substring(2,7)}`;
    let newRowData = {
        rowType: 'task',
        rowId: newRowId,
        notes: initialData?.notes || "",
        quantity: typeof initialData?.quantity === 'number' ? initialData.quantity : 1, // Default quantity 1
        isPotentiallyEmpty: (!isLoadOperation && !initialData) // Flag for newly added empty rows
    };

    if (initialData) {
        if (initialData.taskCatalogId) {
            newRowData.taskCatalogId = initialData.taskCatalogId;
            const catalogTask = await dbService.getItem(TASKS_CATALOG_STORE_NAME, initialData.taskCatalogId);
            newRowData.description = catalogTask ? catalogTask.description : "Błąd: Brak zadania w katalogu";
            if (catalogTask) newRowData.originalCatalogDesc = catalogTask.description; // Store original for future comparison
        } else if (initialData.localDesc) {
            newRowData.localDesc = initialData.localDesc;
            newRowData.description = initialData.localDesc;
        } else if (initialData.description) { // Fallback for old templates or general description
            newRowData.description = initialData.description;
            newRowData.localDesc = initialData.description; // Treat as local if no catalogId
        }

        if (initialData.localUnit) newRowData.localUnit = initialData.localUnit;
        if (initialData.localNormR !== undefined) newRowData.localNormR = initialData.localNormR;
        if (initialData.localNormsM !== undefined) newRowData.localNormsM = initialData.localNormsM;
        if (initialData.localWorkerCategory) newRowData.localWorkerCategory = initialData.localWorkerCategory;

    } else {
        newRowData.description = ''; // Start with empty description for new row
    }

    // Określenie miejsca wstawienia nowego wiersza w modelu
    const currentRows = [...currentEstimateModel.rows];
    let insertIndex = -1;

    if (insertBeforeNode && costTableBody.contains(insertBeforeNode)) {
        // Znajdź indeks w modelu odpowiadający insertBeforeNode
        const insertBeforeRowId = insertBeforeNode.dataset.rowId;
        insertIndex = currentRows.findIndex(row => row.rowId === insertBeforeRowId);
    } else if (lastClickedRow && costTableBody.contains(lastClickedRow)) {
        // Znajdź indeks ostatnio klikniętego wiersza w modelu
        const lastClickedRowId = lastClickedRow.dataset.rowId;
        const clickedIndex = currentRows.findIndex(row => row.rowId === lastClickedRowId);
        if (clickedIndex !== -1) {
            insertIndex = clickedIndex + 1; // Wstaw po ostatnio klikniętym wierszu
            // Specjalna logika dla hierarchii
            if (currentEstimateModel.isHierarchical) {
                const clickedRowType = currentRows[clickedIndex].rowType;
                if (clickedRowType === 'department') {
                    // Wstaw po wszystkich dzieciach działu, ale przed następnym działem
                    let tempIndex = clickedIndex + 1;
                    while (tempIndex < currentRows.length && currentRows[tempIndex].rowType !== 'department') {
                        tempIndex++;
                    }
                    insertIndex = tempIndex;
                } else if (clickedRowType === 'subdepartment') {
                    // Wstaw po wszystkich zadaniach w poddziale, ale przed następnym poddziałem lub działem
                    let tempIndex = clickedIndex + 1;
                    while (tempIndex < currentRows.length && currentRows[tempIndex].rowType === 'task') {
                         // Check if task belongs to the same parent subdepartment
                         // This is more complex, might need to track parentIds in model rows
                         // For now, simpler: assume tasks immediately follow subdepartment
                        tempIndex++;
                    }
                    insertIndex = tempIndex;
                }
            }
        }
    }

    // Dodaj nowy obiekt wiersza do modelu
    if (insertIndex > -1 && insertIndex <= currentRows.length) {
        currentRows.splice(insertIndex, 0, newRowData);
    } else {
        currentRows.push(newRowData);
    }

    // Upewnij się, że pierwszy wiersz to dział, jeśli tryb hierarchiczny i jest pusty
    if (!isLoadOperation && currentEstimateModel.isHierarchical && !currentRows.some(r => r.rowType === 'department')) {
        const firstDeptData = {
            rowType: 'department',
            rowId: `dept-${Date.now()}-auto`,
            text: 'Dział 1. (Ogólny)'
        };
        currentRows.unshift(firstDeptData); // Dodaj na początek
    }

    // Aktualizuj model i wyrenderuj tabelę
    await updateModelAndRender({ rows: currentRows, isHierarchical: currentEstimateModel.isHierarchical }); // Pass entire model for update, ensure isHierarchical is correct

    // Dodatkowe akcje po renderowaniu (bezpośrednie ustawienie focusu)
    if (!isLoadOperation) {
        setTimeout(() => {
            // Znajdź nowo utworzony element DOM w tabeli
            const newDomRow = costTableBody.querySelector(`tr[data-row-id="${newRowId}"]`);
            if (newDomRow) {
                const searchInput = newDomRow.querySelector('.task-search-input');
                if (searchInput) searchInput.focus();
            }
        }, 0);
    }
    return newRowData; // Zwróć obiekt modelu, a nie element DOM
}


async function handleEditEstimateRow(row) { if(typeof openModal === 'function') await openModal('edit_row', row); }
async function calculateMaterialSummary() {
    const materialMap = {};

    // Teraz iterujemy po currentEstimateModel.rows
    const allTaskRowsInModel = currentEstimateModel.rows.filter(r => r.rowType === 'task');

    for (const rowObject of allTaskRowsInModel) {
        const quantity = rowObject.quantity; // Ilość z modelu
        let normsM_source = null;

        // Określenie źródła norm materiałowych z obiektu w modelu
        if (rowObject.localNormsM) {
            normsM_source = JSON.parse(JSON.stringify(rowObject.localNormsM)); // Głęboka kopia
        } else if (rowObject.taskCatalogId) {
            const taskDef = await dbService.getItem(TASKS_CATALOG_STORE_NAME, rowObject.taskCatalogId);
            if (taskDef && taskDef.norms) normsM_source = JSON.parse(JSON.stringify(taskDef.norms.M)); // Głęboka kopia
        } else {
            // Special case: if task is not from catalog and has no local norms,
            // check if its description directly matches a material name.
            // This logic should probably be in addRow/saveModalData, not here.
            // For now, if no taskCatalogId and no localNormsM, skip.
            // (Previous code in old calculateMaterialSummary had this, consider if it's still needed)
            const desc = rowObject.description;
            if (desc) { // If description is directly a material name
                const materialFromDb = await dbService.getItemByIndex(MATERIALS_CATALOG_STORE_NAME, 'name', desc);
                if (materialFromDb) {
                    normsM_source = [{ materialId: materialFromDb.id, quantity: 1, unit: materialFromDb.unit }];
                }
            }
        }

        if (Array.isArray(normsM_source) && quantity > 0) {
            for (const matNorm of normsM_source) {
                let materialId, materialName, materialUnit, materialCategoryCode;

                if (matNorm.materialId) {
                    materialId = matNorm.materialId;
                    const matDb = await dbService.getItem(MATERIALS_CATALOG_STORE_NAME, materialId);
                    if (!matDb) { console.warn(`Nie znaleziono materiału o ID ${materialId} w katalogu.`); continue; }
                    materialName = matDb.name;
                    materialUnit = matNorm.unit || matDb.unit || 'j.m.';
                    materialCategoryCode = matDb.categoryCode || 'IN';
                } else if (matNorm.name) {
                    // Fallback for older data that might only have material name
                    const matDb = await dbService.getItemByIndex(MATERIALS_CATALOG_STORE_NAME, 'name', matNorm.name.trim());
                    if (!matDb) { console.warn(`Materiał "${matNorm.name}" (lokalny) nie znaleziony w katalogu.`); continue; }
                    materialId = matDb.id;
                    materialName = matDb.name;
                    materialUnit = matNorm.unit || matDb.unit || 'j.m.';
                    materialCategoryCode = matDb.categoryCode || 'IN';
                } else { continue; } // Jeśli brak nazwy i ID, pomiń

                if (materialId && typeof matNorm.quantity === 'number' && matNorm.quantity > 0) {
                    if (!materialMap[materialId]) {
                        materialMap[materialId] = { totalQuantity: 0, unit: materialUnit, categoryCode: materialCategoryCode, name: materialName };
                    }
                    materialMap[materialId].totalQuantity += matNorm.quantity * quantity;
                    if(matNorm.unit && matNorm.unit !== 'j.m.' && materialMap[materialId].unit === 'j.m.') materialMap[materialId].unit = matNorm.unit;
                }
            }
        }
    }

    const materialsArray = [];
    for (const materialId in materialMap) {
        const data = materialMap[materialId];
        const materialDbData = await dbService.getItem(MATERIALS_CATALOG_STORE_NAME, parseInt(materialId));
        if (!materialDbData) continue; // Should not happen if logic is consistent
        const marketPriceY = materialDbData.priceY || 0;
        const purchasePriceX = materialDbData.priceX ?? marketPriceY;
        const valueBasedOnMarketPrice = data.totalQuantity * marketPriceY;
        const unitProfit = marketPriceY - purchasePriceX;
        const totalProfit = unitProfit * data.totalQuantity;
        materialsArray.push({
            id: parseInt(materialId),
            name: data.name,
            totalQuantity: data.totalQuantity,
            unit: data.unit,
            category: data.categoryCode,
            categoryFullName: typeof getMaterialCategoryFullName === 'function' ? getMaterialCategoryFullName(data.categoryCode) : data.categoryCode,
            unitPriceY: marketPriceY,
            purchasePriceX: purchasePriceX,
            value: valueBasedOnMarketPrice,
            unitProfit: unitProfit,
            totalProfit: totalProfit
        });
    }

    // Sortowanie (pozostaje bez zmian)
    materialsArray.sort((a, b) => {
        let comparison = 0;
        const valA = materialSortColumn === 'category' ? a.categoryFullName : (materialSortColumn === 'profitValue' ? a.totalProfit : (materialSortColumn === 'purchasePriceX' ? a.purchasePriceX : a[materialSortColumn]));
        const valB = materialSortColumn === 'category' ? b.categoryFullName : (materialSortColumn === 'profitValue' ? b.totalProfit : (materialSortColumn === 'purchasePriceX' ? b.purchasePriceX :b[materialSortColumn]));
        if (typeof valA === 'string' && typeof valB === 'string') { comparison = valA.localeCompare(valB, 'pl', { sensitivity: 'base' }); }
        else if (typeof valA === 'number' && typeof valB === 'number') { comparison = valA - valB; }
        if (comparison === 0 && materialSortColumn !== 'name') comparison = a.name.localeCompare(b.name, 'pl', { sensitivity: 'base' });
        return materialSortDirection === 'asc' ? comparison : -comparison;
    });

    if (!materialSummaryBody) return;
    materialSummaryBody.innerHTML = ''; // Wyczyść body tabeli

    let totalMaterialValueBasedOnMarket = 0;
    let grandTotalMaterialProfit = 0;

    materialsArray.forEach(material => {
        totalMaterialValueBasedOnMarket += material.value;
        grandTotalMaterialProfit += material.totalProfit;

        const newRow = materialSummaryBody.insertRow();
        newRow.dataset.materialId = material.id;
        newRow.dataset.materialName = material.name;
        if (material.unitPriceY === 0) newRow.classList.add('zero-price');

        const priceYInput = `<input type="number" class="material-summary-price-input" min="0" step="0.01" value="${material.unitPriceY.toFixed(2)}">`;
        const priceXInput = `<input type="number" class="material-summary-purchase-price-input" min="0" step="0.01" value="${material.purchasePriceX.toFixed(2)}">`;

        const materialNameCell = newRow.insertCell();
        materialNameCell.classList.add('editable-material-name-cell');
        materialNameCell.textContent = material.name;
        materialNameCell.title = "Kliknij dwukrotnie, aby edytować nazwę";

        newRow.insertCell().outerHTML = `<td style="text-align: center;" title="${material.categoryFullName}">${material.category}</td>`;
        newRow.insertCell().outerHTML = `<td style="text-align: right;">${material.totalQuantity.toFixed(3)}</td>`;
        newRow.insertCell().outerHTML = `<td style="text-align: center;">${material.unit}</td>`;
        newRow.insertCell().outerHTML = `<td class="editable-price-cell">${priceYInput}</td>`;
        newRow.insertCell().outerHTML = `<td class="editable-price-cell print-hide-internal">${priceXInput}</td>`;
        newRow.insertCell().outerHTML = `<td class="print-hide-internal material-unit-profit" style="text-align: right;">${formatCurrency(material.unitProfit)}</td>`;
        newRow.insertCell().outerHTML = `<td class="material-summary-value" style="text-align: right;">${formatCurrency(material.value)}</td>`;
        newRow.insertCell().outerHTML = `<td class="print-hide-internal material-total-profit" style="text-align: right;">${formatCurrency(material.totalProfit)}</td>`;
    });

    if (materialGrandTotalElement) materialGrandTotalElement.textContent = formatCurrency(totalMaterialValueBasedOnMarket);
    if (materialProfitGrandTotalElement) materialProfitGrandTotalElement.textContent = formatCurrency(grandTotalMaterialProfit);

    updateMaterialSortIndicators(); // Zaktualizuj strzałki sortowania w nagłówkach
}
async function handleMaterialSummaryMarketPriceChange(input) {
    const row = input.closest('tr');
    const materialId = parseInt(row?.dataset.materialId);
    if (!materialId) return;
    const materialFromDb = await dbService.getItem(MATERIALS_CATALOG_STORE_NAME, materialId);
    if (!materialFromDb) return;
    const newMarketPriceY = parseFloat(input.value.replace(',', '.')) || 0;
    if (materialFromDb.priceY !== newMarketPriceY) {
        const oldPriceY = materialFromDb.priceY;
        materialFromDb.priceY = newMarketPriceY;
        if (materialFromDb.priceX === oldPriceY || materialFromDb.priceX === null || materialFromDb.priceX === undefined) materialFromDb.priceX = newMarketPriceY;
        materialFromDb.updatedAt = new Date().toISOString();
        await dbService.updateItem(MATERIALS_CATALOG_STORE_NAME, materialFromDb);
        const purchasePriceX = materialFromDb.priceX;
        const totalQuantity = parseFloat(row.cells[2]?.textContent.replace(',', '.')) || 0;
        const valueCell = row.querySelector('.material-summary-value');
        const unitProfitCell = row.querySelector('.material-unit-profit');
        const totalProfitCell = row.querySelector('.material-total-profit');
        const purchasePriceInput = row.querySelector('.material-summary-purchase-price-input');
        const newValueBasedOnMarket = totalQuantity * newMarketPriceY;
        const newUnitProfit = newMarketPriceY - purchasePriceX;
        const newTotalProfit = newUnitProfit * totalQuantity;
        if (valueCell) valueCell.textContent = formatCurrency(newValueBasedOnMarket);
        if (unitProfitCell) unitProfitCell.textContent = formatCurrency(newUnitProfit);
        if (totalProfitCell) totalProfitCell.textContent = formatCurrency(newTotalProfit);
        if (purchasePriceInput) setNumericInputValue(purchasePriceInput, purchasePriceX);
        let newGrandTotalValue = 0;
        let newGrandTotalProfit = 0;
        const summaryRows = Array.from(materialSummaryBody.querySelectorAll('tr'));
        for (const r of summaryRows) {
            const mId = parseInt(r.dataset.materialId);
            const matData = await dbService.getItem(MATERIALS_CATALOG_STORE_NAME, mId);
            if(matData){
                const priceY = matData.priceY || 0;
                const priceX = matData.priceX ?? priceY;
                const qty = parseFloat(r.cells[2]?.textContent.replace(',', '.')) || 0;
                newGrandTotalValue += qty * priceY;
                newGrandTotalProfit += (priceY - priceX) * qty;
            }
        }
        if (materialGrandTotalElement) materialGrandTotalElement.textContent = formatCurrency(newGrandTotalValue);
        if (materialProfitGrandTotalElement) materialProfitGrandTotalElement.textContent = formatCurrency(newGrandTotalProfit);
        if (newMarketPriceY === 0) row.classList.add('zero-price'); else row.classList.remove('zero-price');
        if(!isRestoringState && typeof appState !== 'undefined') appState.notify('estimateDataPotentiallyChanged');
    }
}
async function handleMaterialSummaryPurchasePriceChange(input) {
    const row = input.closest('tr');
    const materialId = parseInt(row?.dataset.materialId);
    if (!materialId) return;
    const materialFromDb = await dbService.getItem(MATERIALS_CATALOG_STORE_NAME, materialId);
    if (!materialFromDb) return;
    const newPurchasePriceX = parseFloat(input.value.replace(',', '.')) || 0;
    if ((materialFromDb.priceX ?? materialFromDb.priceY ?? 0) !== newPurchasePriceX) {
        materialFromDb.priceX = newPurchasePriceX;
        materialFromDb.updatedAt = new Date().toISOString();
        await dbService.updateItem(MATERIALS_CATALOG_STORE_NAME, materialFromDb);
        const marketPriceY = materialFromDb.priceY || 0;
        const totalQuantity = parseFloat(row.cells[2]?.textContent.replace(',', '.')) || 0;
        const unitProfitCell = row.querySelector('.material-unit-profit');
        const totalProfitCell = row.querySelector('.material-total-profit');
        const newUnitProfit = marketPriceY - newPurchasePriceX;
        const newTotalProfit = newUnitProfit * totalQuantity;
        if (unitProfitCell) unitProfitCell.textContent = formatCurrency(newUnitProfit);
        if (totalProfitCell) totalProfitCell.textContent = formatCurrency(newTotalProfit);
        let newGrandTotalProfit = 0;
        const summaryRows = Array.from(materialSummaryBody.querySelectorAll('tr'));
        for (const r of summaryRows) {
            const mId = parseInt(r.dataset.materialId);
            const matData = await dbService.getItem(MATERIALS_CATALOG_STORE_NAME, mId);
            if(matData){
                const priceY = matData.priceY || 0;
                const priceX = matData.priceX ?? priceY;
                const qty = parseFloat(r.cells[2]?.textContent.replace(',', '.')) || 0;
                newGrandTotalProfit += (priceY - priceX) * qty;
            }
        }
        if (materialProfitGrandTotalElement) materialProfitGrandTotalElement.textContent = formatCurrency(newGrandTotalProfit);
        if (document.getElementById('analiza')?.classList.contains('active') && typeof AnalysisModule !== 'undefined' && AnalysisModule.refreshAnalysis) AnalysisModule.refreshAnalysis();
        if(!isRestoringState && typeof appState !== 'undefined') appState.notify('materialCatalogChanged');
    }
}
function updateMaterialSortIndicators() {
    if (!materialSummaryTable) return;
    materialSummaryTable.querySelectorAll('thead th[data-sort-key]').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.sortKey === materialSortColumn) th.classList.add(materialSortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
    });
}
async function clearEstimate() {
    if (typeof showConfirmNotification === 'function') {
        showConfirmNotification("Czy na pewno chcesz wyczyścić cały kosztorys? Tej operacji nie można cofnąć.", async () => {
            if(typeof saveHistoryState === 'function' && !isRestoringState) saveHistoryState(); // Save current state before clearing

            // Zmieniono: Zresetuj model danych
            const newModel = {
                rows: [],
                departmentColors: {}, // Reset colors
                isHierarchical: false // Reset hierarchical mode
            };
            // appState.setState('isHierarchicalMode', false); // updateModelAndRender handles this

            // Wywołaj centralną funkcję aktualizującą model i renderującą
            await updateModelAndRender(newModel);

            // Dodatkowe czynności po wyczyszczeniu
            chapterSums = {}; // Reset chapter sums (now calculated based on model)
            // departmentColors = {}; // Already reset in newModel
            // saveEstimateState() and saveHistoryState() are called by updateModelAndRender
            if(typeof updateUndoRedoButtons === 'function') updateUndoRedoButtons();
            // reapplyAllRowColors() is now part of renderCostTable
            showNotification("Kosztorys wyczyszczony.", "success");
        });
    } else {
        // ... (standardowy alert fallback) ...
        if (confirm("Czy na pewno chcesz wyczyścić cały kosztorys? Tej operacji nie można cofnąć.")) {
            if(typeof saveHistoryState === 'function' && !isRestoringState) saveHistoryState();

            const newModel = {
                rows: [],
                departmentColors: {},
                isHierarchical: false
            };
            // appState.setState('isHierarchicalMode', false);

            await updateModelAndRender(newModel);

            chapterSums = {};
            // departmentColors = {};
            // saveEstimateState() and saveHistoryState() are called by updateModelAndRender
            if(typeof updateUndoRedoButtons === 'function') updateUndoRedoButtons();
            showNotification("Kosztorys wyczyszczony.", "success");}
    }
}
function ensureFirstRowIsDepartmentIfNeeded(isLoadOperation = false, forceAdd = false) {
    // Sprawdź, czy tryb hierarchiczny jest aktywny w modelu
    if (currentEstimateModel.isHierarchical) {
        // Sprawdź, czy w modelu istnieje już jakiś dział
        const hasDepartment = currentEstimateModel.rows.some(r => r.rowType === 'department');

        if (forceAdd || !hasDepartment) {
            // Jeśli nie ma działu lub wymuszamy dodanie
            const newDepartmentData = {
                rowType: 'department',
                rowId: `dept-${Date.now()}-auto`, // Generuj unikalne ID
                text: 'Dział 1. (Ogólny)'
            };

            // Dodaj nowy dział na początek listy wierszy w modelu
            const updatedRows = [...currentEstimateModel.rows];
            updatedRows.unshift(newDepartmentData); // Dodaj na początek

            // Zaktualizuj model i wyrenderuj. isHierarchical już jest true.
            updateModelAndRender({ rows: updatedRows });

            // lastClickedRow będzie ustawione przez renderCostTable
            return true;
        }
    }
    return false;
}
function activateHierarchicalMode(activate) {
    // Zmieniono: Zaktualizuj model. isHierarchical zostanie ustawione przez updateModelAndRender.
    // updateModelAndRender następnie zaktualizuje appState.isHierarchicalMode.
    updateModelAndRender({ isHierarchical: activate });
}
function handleQuantityInputChange(inputElement) {
    const value = inputElement.value;
    const row = inputElement.closest('tr');
    // Zmieniono: Właściwe obliczenie wartości w calculateRowValues odbywa się na modelu
    // To wywołanie debounce zapewnia tylko formatowanie displayu i odświeżenie total row values
    if(row && typeof calculateRowValues === 'function') {
        const rowObject = currentEstimateModel.rows.find(r => r.rowId === row.dataset.rowId);
        if (rowObject) calculateRowValues(rowObject, row);
    }
}

let draggedRow = null; // To jest element DOM wiersza, który jest przeciągany

function handleDragStart(e) {
    if (e.target.classList.contains('drag-handle')) {
        draggedRow = e.target.closest('tr');
        if (draggedRow) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedRow.dataset.rowId || '');
            draggedRow.classList.add('dragging');

            // Pobierz wszystkie DOM elementy, które stanowią blok do przeniesienia
            // To jest DOM-specyficzne, więc nie trzeba zmieniać na model
            const childrenDom = getDomDragAndDropBlock(draggedRow); // NOWA FUNKCJA POMOCNICZA
            childrenDom.forEach(child => {
                if (child !== draggedRow) child.classList.add('dragging-child');
            });
        }
    } else {
        e.preventDefault();
    }
}
// NOWA FUNKCJA POMOCNICZA do pobierania bloku DOM
function getDomDragAndDropBlock(startDomRow) {
    const block = [startDomRow];
    const startRowType = startDomRow.dataset.rowType;

    if (startRowType === 'department') {
        let currentRow = startDomRow.nextElementSibling;
        while (currentRow && currentRow.dataset.rowType !== 'department') {
            block.push(currentRow);
            currentRow = currentRow.nextElementSibling;
        }
    } else if (startRowType === 'subdepartment') {
        let currentRow = startDomRow.nextElementSibling;
        while (currentRow && currentRow.dataset.rowType === 'task') {
            // W trybie DOM, musimy sprawdzić, czy zadanie należy do bloku poddziału.
            // Najprościej: dopóki nie natrafimy na inny poddział/dział LUB koniec tabeli.
            // To może być mniej precyzyjne niż logika oparta na modelu, ale na potrzeby wizualnego bloku drag&drop jest OK.
            // Zmieniono: usunięto getParentSubDepartmentRow/getParentDepartmentRow,
            // ponieważ te funkcje zostały usunięte z core.js. Logika uproszczona.
            const modelRow = currentEstimateModel.rows.find(r => r.rowId === currentRow.dataset.rowId);
            const startModelRow = currentEstimateModel.rows.find(r => r.rowId === startDomRow.dataset.rowId);

            if (modelRow && startModelRow && (modelRow.rowType === 'task')) { // Upewnij się, że to zadanie
                const startIndex = currentEstimateModel.rows.indexOf(startModelRow);
                const modelRowIndex = currentEstimateModel.rows.indexOf(modelRow);

                let isChildOfStart = false;
                if (startModelRow.rowType === 'subdepartment') {
                    // Jeśli startRow to poddział, to szukamy zadań między nim a następnym sub/dept
                    let tempIndex = startIndex + 1;
                    while(tempIndex < currentEstimateModel.rows.length && currentEstimateModel.rows[tempIndex].rowId !== modelRow.rowId) {
                        if (currentEstimateModel.rows[tempIndex].rowType === 'subdepartment' || currentEstimateModel.rows[tempIndex].rowType === 'department') {
                            isChildOfStart = false; // Natrafiliśmy na inny poddział/dział przed bieżącym zadaniem
                            break;
                        }
                        tempIndex++;
                    }
                    if (tempIndex === modelRowIndex) isChildOfStart = true;
                } else if (startModelRow.rowType === 'department') {
                    // Jeśli startRow to dział, to szukamy zadań/poddziałów w jego bloku
                    let tempIndex = startIndex + 1;
                    while(tempIndex < currentEstimateModel.rows.length && currentEstimateModel.rows[tempIndex].rowId !== modelRow.rowId) {
                         if (currentEstimateModel.rows[tempIndex].rowType === 'department') {
                            isChildOfStart = false;
                            break;
                        }
                        tempIndex++;
                    }
                    if (tempIndex === modelRowIndex) isChildOfStart = true;
                }

                if (isChildOfStart) {
                    block.push(currentRow);
                } else {
                    break;
                }
            } else {
                break;
            }
            currentRow = currentRow.nextElementSibling;
        }
    }
    return block;
}

function handleDragEnd() {
    if (draggedRow) {
        draggedRow.classList.remove('dragging');
        const children = Array.from(costTableBody.querySelectorAll('.dragging-child'));
        children.forEach(child => child.classList.remove('dragging-child'));
    }
    draggedRow = null;
    document.querySelectorAll('.drag-over').forEach(ind => ind.classList.remove('drag-over'));
}

function handleDragOver(e) {
    e.preventDefault();
    const targetRow = e.target.closest('tr');
    const indicatorId = typeof INDICATOR_ROW_ID !== 'undefined' ? INDICATOR_ROW_ID : 'temp-insert-indicator';
    if (targetRow && targetRow !== draggedRow && targetRow.id !== indicatorId && targetRow.parentElement === costTableBody) {
        targetRow.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    const targetRow = e.target.closest('tr');
    if (targetRow) {
        targetRow.classList.remove('drag-over');
    }
}

async function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const dropTargetRow = e.target.closest('tr');
    dropTargetRow?.classList.remove('drag-over');

    if (!draggedRow || !dropTargetRow || draggedRow === dropTargetRow || dropTargetRow.parentElement !== costTableBody) {
        handleDragEnd();
        return;
    }

    const draggedBlockObjects = getDragAndDropBlock(draggedRow); // Pobierz obiekty z modelu
    const draggedBlockIds = draggedBlockObjects.map(obj => obj.rowId); // ID obiektów do przeniesienia

    // Znajdź docelowy wiersz w modelu
    const dropTargetRowId = dropTargetRow.dataset.rowId;
    const dropTargetIndex = currentEstimateModel.rows.findIndex(r => r.rowId === dropTargetRowId);

    if (dropTargetIndex === -1) {
        console.error("handleDrop: Nie znaleziono docelowego wiersza w modelu.");
        handleDragEnd();
        return;
    }

    // Sprawdź, czy przenoszony blok zawiera cel upuszczenia
    if (draggedBlockIds.includes(dropTargetRowId)) {
        console.warn("Nie można upuścić elementu nadrzędnego na jego element podrzędny (w ramach tego samego bloku).");
        showNotification("Nie można przenieść działu/poddziału do jego wnętrza.", "warning");
        handleDragEnd();
        return;
    }

    // Skopiuj aktualną tablicę wierszy z modelu
    let updatedRows = [...currentEstimateModel.rows];

    // Najpierw usuń przenoszone elementy z ich obecnych pozycji
    const rowsToRemove = [];
    for (const id of draggedBlockIds) {
        const idx = updatedRows.findIndex(r => r.rowId === id);
        if (idx !== -1) {
            rowsToRemove.push(updatedRows[idx]); // Zachowaj referencje do obiektów
            updatedRows.splice(idx, 1); // Usuń je
        }
    }

    // Ponownie znajdź indeks docelowy, ponieważ tablica `updatedRows` mogła się zmienić po usunięciu
    let finalDropIndex = updatedRows.findIndex(r => r.rowId === dropTargetRowId);
    if (finalDropIndex === -1) {
        // Jeśli docelowy wiersz został usunięty (bo był częścią przenoszonego bloku, co jest sprawdzane, ale dla pewności),
        // lub z jakiegoś powodu nie znaleziono, upuść na koniec.
        finalDropIndex = updatedRows.length;
    }

    // Wstaw przeniesione elementy do nowej pozycji
    updatedRows.splice(finalDropIndex, 0, ...rowsToRemove);

    // Wywołaj centralną funkcję aktualizującą model i renderującą
    await updateModelAndRender({ rows: updatedRows });

    handleDragEnd(); // Czyści klasy CSS
}

// Zmieniono: Funkcja getDragAndDropBlock przyjmuje element DOM, ale zwraca obiekty z MODELU
function getDragAndDropBlock(startDomRow) {
    const block = [];
    const startRowId = startDomRow.dataset.rowId;
    const startRowType = startDomRow.dataset.rowType;

    const startIndex = currentEstimateModel.rows.findIndex(r => r.rowId === startRowId);
    if (startIndex === -1) return []; // Should not happen

    block.push(currentEstimateModel.rows[startIndex]);

    if (startRowType === 'department') {
        let currentIndex = startIndex + 1;
        while (currentIndex < currentEstimateModel.rows.length && currentEstimateModel.rows[currentIndex].rowType !== 'department') {
            block.push(currentEstimateModel.rows[currentIndex]);
            currentIndex++;
        }
    } else if (startRowType === 'subdepartment') {
        let currentIndex = startIndex + 1;
        while (currentIndex < currentEstimateModel.rows.length && currentEstimateModel.rows[currentIndex].rowType === 'task') {
            // Aby upewnić się, że zadanie należy do TEGO poddziału, musielibyśmy mieć parentId w modelu
            // Na razie: zakładamy, że zadania podrzędne są zaraz po poddziale i nie ma innych poddziałów/działów
            // Bardziej precyzyjnie: sprawdź, czy następny element jest nadal "dzieckiem" tego samego poziomu hierarchii.
            // Będzie to wymagać przejścia przez model, aby upewnić się, że nie natrafiamy na inny poddział/dział wyższego poziomu
            const nextRowInModel = currentEstimateModel.rows[currentIndex];
            if (nextRowInModel.rowType === 'task') {
                 // Sprawdź, czy to zadanie należy do tego samego bloku działu/poddziału
                 let currentBlockParent = null;
                 let tempIdx = currentIndex -1;
                 while(tempIdx >=0) {
                     if (currentEstimateModel.rows[tempIdx].rowType === 'department' || currentEstimateModel.rows[tempIdx].rowType === 'subdepartment') {
                         currentBlockParent = currentEstimateModel.rows[tempIdx];
                         break;
                     }
                     tempIdx--;
                 }

                 if (currentBlockParent && currentBlockParent.rowId === startRowId) {
                     block.push(nextRowInModel);
                     currentIndex++;
                 } else {
                     break; // Zadanie należy do innego bloku (np. wyższego poziomu lub następnego poddziału)
                 }

            } else {
                break; // Natrafiliśmy na dział lub poddział
            }
        }
    }
    return block; // Zwracamy tablicę obiektów z modelu
}

console.log("Moduł logiki kosztorysu (EazyKoszt 0.4.2-script-estimate.js - Ulepszenia UX) załadowany.");