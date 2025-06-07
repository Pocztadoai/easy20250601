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
            } else if (typeof appState !== 'undefined' && appState.getState('isHierarchicalMode') && costTableBody && costTableBody.rows.length > 0 && !costTableBody.querySelector('tr[data-row-type="department"]')) {
                 insertBeforeNode = costTableBody.firstChild;
            }
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
            addSpecialRow('subdepartment', '', false, false, null, insertBeforeNode);
        });
        addSubDepartmentBtn.addEventListener('mouseenter', () => { if(typeof showInsertIndicator === 'function') showInsertIndicator('subdepartment'); });
        addSubDepartmentBtn.addEventListener('mouseleave', () => { if(typeof removeInsertIndicator === 'function') removeInsertIndicator(); });
    } else { console.warn("Przycisk addSubDepartmentBtn nie znaleziony w initEstimateLogic."); }

    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearEstimate);
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
        costTableBody.addEventListener('change', (event) => {
            if (event.target.classList.contains('special-row-input')) {
                if (typeof saveEstimateState === 'function' && !isRestoringState) saveEstimateState();
            }
        });
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
// ZMIANA: Poprawki definicji funkcji i zasięgu zmiennych.
// ==========================================================================

// ==========================================================================
// SEKCJA 2: OBSŁUGA LIST ROZWIJANYCH (SUGESTII)
// ZMIANA: Poprawki logiki zamykania dropdownu.
// ==========================================================================

// ==========================================================================
// SEKCJA 2: OBSŁUGA LIST ROZWIJANYCH (SUGESTII)
// ZMIANA: Poprawki logiki zamykania dropdownu.
// ==========================================================================

const hideAllDropdowns = (preserveFocus = false) => {
    if (activeDropdown) {
        if (activeSearchInput && activeSearchInput._dropdownKeydownListener) {
            activeSearchInput.removeEventListener('keydown', activeSearchInput._dropdownKeydownListener);
            delete activeSearchInput._dropdownKeydownListener;
        }
        activeDropdown.style.display = 'none';
        // Nie czyścimy innerHTML tutaj, aby zachować stan na wypadek szybkiego ponownego otwarcia
        // activeDropdown.innerHTML = '';
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
    const row = inputElement.closest('tr');

    if (!container || !row || row.dataset.rowType === 'department' || row.dataset.rowType === 'subdepartment') { hideAllDropdowns(); return; }

    let currentBranchCode = container.dataset.currentBranch || (typeof branchSelectDropdown !== 'undefined' ? branchSelectDropdown.value : null);

    if (target.matches('.department-header')) {
        const selectedDept = target.dataset.department;
        await renderDropdownOptions(container, 'tasks', selectedDept, '', currentBranchCode);
    } else if (target.matches('.task-item') && !target.classList.contains('add-new-user-task-item')) {
        const taskCatalogId = target.dataset.taskId;
        const description = target.dataset.description;
        inputElement.value = description;
        row.dataset.taskCatalogId = taskCatalogId;
        
        // Dodano zapamiętanie oryginalnego opisu z katalogu
        const catalogTask = await dbService.getItem(TASKS_CATALOG_STORE_NAME, parseInt(taskCatalogId));
        row.dataset.originalCatalogDesc = catalogTask ? catalogTask.description : description;

        delete row.dataset.localDesc; delete row.dataset.localUnit; delete row.dataset.localNormR;
        delete row.dataset.localNormsM; delete row.dataset.localWorkerCategory;
        inputElement.readOnly = true;
        hideAllDropdowns(); 
        if(!isRestoringState && typeof appState !== 'undefined') appState.notify('estimateDataPotentiallyChanged');
        if(typeof saveEstimateState === 'function' && !isRestoringState) saveEstimateState();
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
async function calculateRowValues(row) { 
    if (!row || row.dataset.rowType === 'department' || row.dataset.rowType === 'subdepartment') return 0;
    const searchInput = row.querySelector('.task-search-input');
    const quantityInput = row.querySelector('.quantity-input');
    const unitElement = row.cells[3];
    const priceRUnitElement = row.cells[5];
    const priceMUnitElement = row.cells[6];
    const priceTotalUnitElement = row.cells[7];
    const valueElement = row.cells[8];
    const normsDisplay = row.querySelector('.norms-display');
    const taskCatalogId = row.dataset.taskCatalogId ? parseInt(row.dataset.taskCatalogId) : null;
    let currentDescription = row.dataset.localDesc || searchInput?.value.trim() || '';
    const quantity = typeof evaluateMathExpression === 'function' ? evaluateMathExpression(quantityInput?.value) : (parseFloat(quantityInput?.value.replace(',', '.')) || 0);
    let normR = null;
    let normsM_source = [];
    let taskUnit = row.dataset.localUnit || '';
    let workerCategory = row.dataset.localWorkerCategory || 'ogolnobudowlany';
    let sourceTask = null;
    if (taskCatalogId) {
        sourceTask = await dbService.getItem(TASKS_CATALOG_STORE_NAME, taskCatalogId);
        if (sourceTask) {
            if (!row.dataset.localDesc) currentDescription = sourceTask.description;
            if (!taskUnit && !row.dataset.localUnit) taskUnit = sourceTask.unit;
            if (row.dataset.localNormR === undefined && sourceTask.norms?.R !== undefined) normR = sourceTask.norms.R;
            if (row.dataset.localNormsM === undefined && sourceTask.norms?.M) normsM_source = sourceTask.norms.M;
            if (row.dataset.localWorkerCategory === undefined && sourceTask.workerCategory) workerCategory = sourceTask.workerCategory;
        } else {
            console.warn(`Nie znaleziono zadania o ID ${taskCatalogId} w katalogu. Używam danych lokalnych lub domyślnych.`);
            if (!currentDescription) currentDescription = "Błąd: Brak zadania w katalogu";
        }
    }
    if (row.dataset.localNormR !== undefined) normR = parseFloat(row.dataset.localNormR);
    if (row.dataset.localNormsM !== undefined) { try { normsM_source = JSON.parse(row.dataset.localNormsM); } catch (e) { console.warn("Błąd parsowania localNormsM dla wiersza:", row, e); normsM_source = []; } }
    if (row.dataset.localUnit) taskUnit = row.dataset.localUnit;
    if (row.dataset.localWorkerCategory) workerCategory = row.dataset.localWorkerCategory;
    if (searchInput) searchInput.value = currentDescription;
    if (!taskUnit) taskUnit = '?';
    if(unitElement) unitElement.textContent = taskUnit;
    let unitPriceR = 0;
    let unitPriceM = 0;
    let normsTextR = `<strong>R (${getWorkerCategoryName(workerCategory)}):</strong> -`;
    const materialNormsStrings = [];
    const laborRate = getLaborRateForWorkerCategory(workerCategory);
    if (typeof normR === 'number' && normR >= 0) {
        unitPriceR = normR * laborRate;
        normsTextR = `<strong>R (${getWorkerCategoryName(workerCategory)}):</strong> ${normR.toFixed(3)} ${taskUnit || 'j.m.'}`;
    }
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
            } else if (matNorm.name) {
                materialName = matNorm.name;
                const matFromDbByName = await dbService.getItemByIndex(MATERIALS_CATALOG_STORE_NAME, 'name', matNorm.name);
                if(matFromDbByName){
                    materialUnitForDisplay = matNorm.unit || matFromDbByName.unit || 'j.m.';
                    materialMarketPrice = matFromDbByName.priceY || 0;
                } else {
                    materialUnitForDisplay = matNorm.unit || (typeof getMaterialUnit === 'function' ? await getMaterialUnit(matNorm.name) : 'j.m.');
                    materialMarketPrice = typeof getMaterialPrice === 'function' ? await getMaterialPrice(matNorm.name) : 0;
                }
            } else { continue; }
            if (materialName && typeof matNorm.quantity === 'number' && matNorm.quantity > 0) {
                unitPriceM += matNorm.quantity * materialMarketPrice;
                materialNormsStrings.push(`${materialName}: ${matNorm.quantity.toFixed(3)} ${materialUnitForDisplay}`);
            }
        }
    }
    let finalNormsText = normsTextR;
    if (materialNormsStrings.length > 0) { finalNormsText += `<br><strong>M:</strong> ${materialNormsStrings.join('<br>   ')}`; }
    else { finalNormsText += `<br><strong>M:</strong> -`; }
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
    return totalValue;
}
async function calculateAllTotals() { 
    let grandTotal = 0;
    chapterSums = {};
    let currentDepartmentId = null;
    let currentSubDepartmentId = null;
    let currentDepartmentTotal = 0;
    let currentSubDepartmentTotal = 0;
    if (!costTableBody) {
        if (grandTotalElement) grandTotalElement.textContent = formatCurrency(0);
        return;
    }
    const taskRows = Array.from(costTableBody.querySelectorAll('tr[data-row-type="task"]'));
    for (const row of taskRows) await calculateRowValues(row);

    const allRows = Array.from(costTableBody.querySelectorAll('tr'));
    for (const row of allRows) {
        if (row.id === (typeof INDICATOR_ROW_ID !== 'undefined' ? INDICATOR_ROW_ID : 'temp-insert-indicator')) continue;
        const rowType = row.dataset.rowType;
        const rowId = row.dataset.rowId;

        if (rowType === 'department') {
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
            currentDepartmentId = rowId;
            currentSubDepartmentId = null;
            currentDepartmentTotal = 0;
            currentSubDepartmentTotal = 0;
            chapterSums[currentDepartmentId] = 0;
            const deptSumCell = row.querySelector('.department-total-value');
            if(deptSumCell) deptSumCell.textContent = formatCurrency(0);
        } else if (rowType === 'subdepartment') {
            if (currentSubDepartmentId && chapterSums.hasOwnProperty(currentSubDepartmentId)) {
                const subDeptSumCell = costTableBody.querySelector(`tr[data-row-id="${currentSubDepartmentId}"] .subdepartment-total-value`);
                if(subDeptSumCell) subDeptSumCell.textContent = formatCurrency(currentSubDepartmentTotal);
                chapterSums[currentSubDepartmentId] = currentSubDepartmentTotal;
            }
            currentSubDepartmentId = rowId;
            currentSubDepartmentTotal = 0;
            chapterSums[currentSubDepartmentId] = 0;
            const subDeptSumCell = row.querySelector('.subdepartment-total-value');
            if(subDeptSumCell) subDeptSumCell.textContent = formatCurrency(0);
        } else if (rowType === 'task') {
            const value = parseFloat(row.cells[8]?.textContent.replace(',', '.')) || 0;
            grandTotal += value;
            if (currentDepartmentId) currentDepartmentTotal += value;
            if (currentSubDepartmentId) currentSubDepartmentTotal += value;
        }
    }
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
    const currentIsHierarchical = typeof appState !== 'undefined' ? appState.getState('isHierarchicalMode') : false;
    if (!currentIsHierarchical && !fromTemplate && !isLoadOperation) {
        if (typeof appState !== 'undefined') appState.setState('isHierarchicalMode', true);
        else console.warn("appState nie jest zdefiniowany, nie można zmienić trybu na hierarchiczny.");
    } else if (currentIsHierarchical && type === 'subdepartment' && !costTableBody.querySelector('tr[data-row-type="department"]')) {
        if (typeof showNotification === 'function') showNotification("Aby dodać poddział, najpierw musi istnieć dział.", 'warning');
        else alert("Aby dodać poddział, najpierw musi istnieć dział.");
        return null;
    }

    const newRow = document.createElement('tr');
    newRow.dataset.rowType = type;
    const newRowId = fixedRowId || `special-${Date.now()}-${Math.random().toString(36).substring(2,7)}`;
    newRow.dataset.rowId = newRowId;

    const lpValue = "?";
    const sumDisplayClass = type === 'department' ? 'department-total-value' : 'subdepartment-total-value';

    const tdDrag = newRow.insertCell(); tdDrag.className = 'col-drag print-hide';
    const dragHandle = document.createElement('span'); dragHandle.className = 'drag-handle'; dragHandle.title = 'Przeciągnij'; dragHandle.textContent = '↕'; dragHandle.draggable = true;
    dragHandle.addEventListener('dragstart', handleDragStart); dragHandle.addEventListener('dragend', handleDragEnd);
    tdDrag.appendChild(dragHandle);

    const tdLp = newRow.insertCell(); tdLp.className = 'col-lp'; tdLp.textContent = lpValue;
    const tdDesc = newRow.insertCell(); tdDesc.className = 'col-special-desc'; tdDesc.colSpan = 6;

    const descWrapperDiv = document.createElement('div');
    descWrapperDiv.style.cssText = 'display: flex; align-items: center; justify-content: space-between;';
    const inputField = document.createElement('input');
    inputField.type = 'text'; inputField.className = 'special-row-input'; inputField.value = text;
    inputField.placeholder = `Nazwa ${type === 'department' ? 'Działu' : 'Poddziału'}...`;
    inputField.addEventListener('change', () => { if(typeof saveEstimateState === 'function' && !isRestoringState) saveEstimateState(); });
    descWrapperDiv.appendChild(inputField);

    const iconsContainer = document.createElement('span');
    iconsContainer.className = 'special-row-icons-container';

    const notesIconWrapper = document.createElement('span'); notesIconWrapper.className = 'notes-icon-wrapper';
    const notesIconEl = document.createElement('span'); notesIconEl.className = 'notes-icon'; notesIconEl.title = 'Dodaj/Edytuj Notatkę'; notesIconEl.innerHTML = '🗒️';
    const notesTooltip = document.createElement('span'); notesTooltip.className = 'notes-preview-tooltip';
    newRow.dataset.notes = notes || "";
    if (notes) { notesIconEl.classList.add('has-notes'); notesIconEl.innerHTML = '📝'; notesTooltip.textContent = notes; }
    else { notesTooltip.textContent = "Brak notatki"; }
    if(typeof openNotesModal === 'function') notesIconEl.addEventListener('click', () => openNotesModal(newRow));
    notesIconWrapper.appendChild(notesIconEl); notesIconWrapper.appendChild(notesTooltip);
    iconsContainer.appendChild(notesIconWrapper);

    const colorPickerIcon = document.createElement('span');
    colorPickerIcon.className = 'color-picker-icon';
    colorPickerIcon.innerHTML = '🖌️';
    colorPickerIcon.title = 'Zmień kolor wiersza';
    colorPickerIcon.addEventListener('click', (event) => {
        if (typeof openColorPalette === 'function') openColorPalette(event, newRow);
    });
    iconsContainer.appendChild(colorPickerIcon);

    const editSpecialRowIcon = document.createElement('span');
    editSpecialRowIcon.innerHTML = '⚙️'; 
    editSpecialRowIcon.className = 'edit-special-row-icon'; 
    editSpecialRowIcon.title = 'Edytuj szczegóły działu/poddziału';
    editSpecialRowIcon.style.cursor = 'pointer';
    editSpecialRowIcon.style.marginLeft = '5px';
    editSpecialRowIcon.addEventListener('click', (event) => {
        event.stopPropagation();
        showNotification(`TODO: Otwórz mini-modal edycji dla '${inputField.value}' (ID: ${newRowId})`, 'info');
        console.log("Kliknięto edycję dla specjalnego wiersza:", newRowId, inputField.value);
    });
    iconsContainer.appendChild(editSpecialRowIcon);

    descWrapperDiv.appendChild(iconsContainer);
    tdDesc.appendChild(descWrapperDiv);

    const tdValue = newRow.insertCell(); tdValue.className = `col-value special-row-sum ${sumDisplayClass}`;
    tdValue.style.cssText = 'font-weight:bold; text-align:right;'; tdValue.textContent = '0.00';

    newRow.classList.add(type === 'department' ? 'department-row' : 'subdepartment-row');

    if (insertBeforeNode && costTableBody.contains(insertBeforeNode)) costTableBody.insertBefore(newRow, insertBeforeNode);
    else if (lastClickedRow && lastClickedRow.parentNode === costTableBody && (insertBeforeNode === undefined || insertBeforeNode === null)) costTableBody.insertBefore(newRow, lastClickedRow.nextSibling);
    else costTableBody.appendChild(newRow);
    lastClickedRow = newRow;

    if (!isLoadOperation && !fromTemplate) {
        if (!departmentColors.hasOwnProperty(newRowId)) {
            departmentColors[newRowId] = null;
        }
        if (typeof reapplyAllRowColors === 'function') reapplyAllRowColors();
    }

    if (!isLoadOperation && !fromTemplate) setTimeout(() => { inputField.focus(); inputField.select(); }, 0);
    newRow.addEventListener('dragover', handleDragOver);
    newRow.addEventListener('dragleave', handleDragLeave);
    newRow.addEventListener('drop', handleDrop);
    newRow.addEventListener('click', () => {
        if (lastClickedRow && lastClickedRow !== newRow) lastClickedRow.classList.remove('last-clicked-row-highlight');
        lastClickedRow = newRow; newRow.classList.add('last-clicked-row-highlight');
        if (saveDepartmentTemplateBtn) saveDepartmentTemplateBtn.disabled = !(newRow.dataset.rowType === 'department');
    });

    if (!isLoadOperation) {
        if (typeof renumberRows === 'function') renumberRows();
        if (typeof appState !== 'undefined' && !isRestoringState) appState.notify('estimateDataPotentiallyChanged');
        if(typeof saveHistoryState === 'function' && !isRestoringState) saveHistoryState();
    }
    return newRow;
}

async function addRow(initialData = null, isLoadOperation = false, insertBeforeNode = null) {
    if (!costTableBody) return null;

    if (!isLoadOperation && lastClickedRow && (lastClickedRow.dataset.rowType === 'department' || lastClickedRow.dataset.rowType === 'subdepartment') && insertBeforeNode === null) {
        insertBeforeNode = lastClickedRow.nextElementSibling;
        if (lastClickedRow.dataset.rowType === 'department' && insertBeforeNode && insertBeforeNode.dataset.rowType === 'subdepartment') {
            // Bez zmian - wstawia po dziale, przed poddziałem
        } else {
             while(insertBeforeNode && insertBeforeNode.dataset.rowType === 'task'){
                 let currentParentCheck = (lastClickedRow.dataset.rowType === 'department') ? getParentDepartmentRow(insertBeforeNode) : getParentSubDepartmentRow(insertBeforeNode);
                 if (currentParentCheck !== lastClickedRow) break;
                 insertBeforeNode = insertBeforeNode.nextElementSibling;
            }
        }
    } else if (!isLoadOperation && (typeof appState !== 'undefined' && appState.getState('isHierarchicalMode')) && !costTableBody.querySelector('tr[data-row-type="department"]')) {
        if (typeof ensureFirstRowIsDepartmentIfNeeded === 'function' && ensureFirstRowIsDepartmentIfNeeded(isLoadOperation, true)) {
            const firstDept = costTableBody.querySelector('tr[data-row-type="department"]');
            insertBeforeNode = firstDept ? firstDept.nextElementSibling : (lastClickedRow ? lastClickedRow.nextElementSibling : null);
        }
    }

    const newRow = document.createElement('tr'); newRow.dataset.rowType = 'task'; 
    if (!isLoadOperation && !initialData) { // Tylko dla zupełnie nowych, pustych wierszy
        newRow.dataset.isPotentiallyEmpty = "true";
    }
    const lpValue = "?"; const tdDrag = newRow.insertCell(); tdDrag.className = 'col-drag print-hide'; const dragHandle = document.createElement('span'); dragHandle.className = 'drag-handle'; dragHandle.title = 'Przeciągnij'; dragHandle.textContent = '↕'; dragHandle.draggable = true; dragHandle.addEventListener('dragstart', handleDragStart); dragHandle.addEventListener('dragend', handleDragEnd); tdDrag.appendChild(dragHandle); const tdLp = newRow.insertCell(); tdLp.className = 'col-lp'; tdLp.textContent = lpValue; const tdDesc = newRow.insertCell(); tdDesc.className = 'col-desc'; const descFlexContainer = document.createElement('div'); descFlexContainer.style.cssText = 'display: flex; align-items: center; justify-content: space-between;'; const suggestionsContainer = document.createElement('div'); suggestionsContainer.className = 'suggestions-container'; suggestionsContainer.style.flexGrow = '1'; const inputWrapper = document.createElement('div'); inputWrapper.style.cssText = 'display: flex; align-items: center;'; const searchInput = document.createElement('input'); searchInput.type = 'text'; searchInput.className = 'task-search-input'; searchInput.placeholder = 'Wybierz/Wyszukaj...'; searchInput.autocomplete = 'off'; searchInput.style.flexGrow = '1'; inputWrapper.appendChild(searchInput);
    const suggestionsDropdown = document.createElement('div'); suggestionsDropdown.className = 'suggestions-dropdown'; suggestionsDropdown.addEventListener('click', handleDropdownClick);
    suggestionsContainer.appendChild(inputWrapper); suggestionsContainer.appendChild(suggestionsDropdown);
    descFlexContainer.appendChild(suggestionsContainer); const notesIconWrapper = document.createElement('span'); notesIconWrapper.className = 'notes-icon-wrapper'; const notesIconEl = document.createElement('span'); notesIconEl.className = 'notes-icon'; notesIconEl.title = 'Dodaj/Edytuj Notatkę'; const notesTooltip = document.createElement('span'); notesTooltip.className = 'notes-preview-tooltip'; newRow.dataset.notes = initialData?.notes || ""; if (initialData?.notes) { notesIconEl.classList.add('has-notes'); notesIconEl.innerHTML = '📝'; notesTooltip.textContent = initialData.notes;} else { notesIconEl.innerHTML = '🗒️'; notesTooltip.textContent = "Brak notatki"; } if(typeof openNotesModal === 'function') notesIconEl.addEventListener('click', () => openNotesModal(newRow)); notesIconWrapper.appendChild(notesIconEl); notesIconWrapper.appendChild(notesTooltip); descFlexContainer.appendChild(notesIconWrapper); const normsDisplayDiv = document.createElement('div'); normsDisplayDiv.className = 'norms-display'; normsDisplayDiv.style.display = 'none'; tdDesc.appendChild(descFlexContainer); tdDesc.appendChild(normsDisplayDiv); newRow.insertCell().className = 'col-unit'; const tdQty = newRow.insertCell(); tdQty.className = 'col-qty'; const quantityInput = document.createElement('input'); quantityInput.type = 'text'; quantityInput.className = 'quantity-input'; tdQty.appendChild(quantityInput); newRow.insertCell().className = 'col-price-r-unit'; newRow.insertCell().className = 'col-price-m-unit'; newRow.insertCell().className = 'col-price-total'; newRow.insertCell().className = 'col-value';

    if (insertBeforeNode && costTableBody.contains(insertBeforeNode)) {
        costTableBody.insertBefore(newRow, insertBeforeNode);
    } else if (lastClickedRow && lastClickedRow.parentNode === costTableBody && (insertBeforeNode === undefined || insertBeforeNode === null) ) {
        costTableBody.insertBefore(newRow, lastClickedRow.nextSibling);
    } else {
        costTableBody.appendChild(newRow);
    }
    lastClickedRow = newRow;

    const setInputAsSelectedTask = (isTaskSelected) => {
        searchInput.readOnly = isTaskSelected;
        searchInput.style.backgroundColor = isTaskSelected ? 'var(--light-gray)' : '';
        searchInput.style.cursor = isTaskSelected ? 'not-allowed' : '';
    };

    if (initialData) {
        if (initialData.taskCatalogId) {
            const catalogTask = await dbService.getItem(TASKS_CATALOG_STORE_NAME, initialData.taskCatalogId);
            newRow.dataset.originalCatalogDesc = catalogTask ? catalogTask.description : ""; 
            searchInput.value = initialData.localDesc || (catalogTask ? catalogTask.description : "Błąd: Brak zadania w katalogu");
            newRow.dataset.taskCatalogId = initialData.taskCatalogId;
            setInputAsSelectedTask(true);
        } else {
            searchInput.value = initialData.localDesc || initialData.description || '';
            setInputAsSelectedTask(false);
        }
        quantityInput.value = (typeof initialData.quantity === 'number' ? initialData.quantity.toFixed(3) : "0.000").replace('.',',');
        if (initialData.localDesc) newRow.dataset.localDesc = initialData.localDesc;
        if (initialData.localUnit) newRow.dataset.localUnit = initialData.localUnit;
        if (initialData.localNormR !== undefined) newRow.dataset.localNormR = initialData.localNormR.toString();
        if (initialData.localNormsM !== undefined) newRow.dataset.localNormsM = JSON.stringify(initialData.localNormsM);
        if (initialData.localWorkerCategory) newRow.dataset.localWorkerCategory = initialData.localWorkerCategory;
    } else {
        quantityInput.value = "1,000";
        setInputAsSelectedTask(false);
        if (!isLoadOperation) setTimeout(() => searchInput.focus(),0);
    }

    searchInput.addEventListener('focus', (e) => {
        if (!searchInput.readOnly) {
            if (typeof showDropdown === 'function') showDropdown(e.target);
        }
    });
    
    const handleSearchInputChangeAndPotentialRemoval = async () => {
        if (searchInput.readOnly) return;

        const newText = searchInput.value.trim();
        const wasReadOnly = searchInput.dataset.wasReadOnlyBeforeEdit === "true";
        const originalCatalogId = newRow.dataset.taskCatalogId ? parseInt(newRow.dataset.taskCatalogId) : null;
        const originalCatalogDesc = newRow.dataset.originalCatalogDesc || "";

        delete searchInput.dataset.wasReadOnlyBeforeEdit; 

        if (wasReadOnly && originalCatalogId && newText !== originalCatalogDesc) {
            showConfirmNotification(
                `Zmieniono opis pozycji powiązanej z katalogiem ("${originalCatalogDesc || 'Poprzedni opis'}").<br><br><b>[OK]</b> = Utwórz nową pozycję własną na podstawie tych zmian.<br><b>[Anuluj]</b> = Zaktualizuj tylko opis lokalnie dla tego wiersza (pozostanie powiązany z katalogiem).`,
                async () => { 
                    newRow.dataset.localDesc = newText;
                    delete newRow.dataset.taskCatalogId; 
                    newRow.removeAttribute('data-original-catalog-desc');

                    if (originalCatalogId) {
                        const baseTask = await dbService.getItem(TASKS_CATALOG_STORE_NAME, originalCatalogId);
                        if (baseTask) {
                            if (!newRow.dataset.localUnit) newRow.dataset.localUnit = baseTask.unit;
                            if (newRow.dataset.localNormR === undefined && baseTask.norms?.R !== undefined) newRow.dataset.localNormR = baseTask.norms.R.toString();
                            if (newRow.dataset.localNormsM === undefined && baseTask.norms?.M) newRow.dataset.localNormsM = JSON.stringify(baseTask.norms.M);
                            if (!newRow.dataset.localWorkerCategory && baseTask.workerCategory) newRow.dataset.localWorkerCategory = baseTask.workerCategory;
                        }
                    }
                    setInputAsSelectedTask(false); 
                    showNotification("Utworzono lokalną wersję pozycji z nowym opisem. Powiązanie z katalogiem zostało usunięte.", 'info');
                    await finalizeChange();
                },
                async () => { 
                    newRow.dataset.localDesc = newText;
                    setInputAsSelectedTask(true); 
                    showNotification("Opis został zaktualizowany lokalnie dla tego wiersza.", 'info');
                    await finalizeChange();
                }
            );
        } else { 
            // Sprawdzenie, czy wiersz jest "potencjalnie pusty" i czy faktycznie jest pusty
            if (newRow.dataset.isPotentiallyEmpty === "true" && !newText && !originalCatalogId && (quantityInput.value === "0,000" || quantityInput.value === "" || parseFloat(quantityInput.value.replace(',','.')) === 0) ) {
                 if (newRow.parentNode) {
                    if (lastClickedRow === newRow) {
                        lastClickedRow = newRow.previousElementSibling || newRow.nextElementSibling || null;
                        if (lastClickedRow && saveDepartmentTemplateBtn) {
                             saveDepartmentTemplateBtn.disabled = !(lastClickedRow.dataset.rowType === 'department');
                        } else if (saveDepartmentTemplateBtn) {
                             saveDepartmentTemplateBtn.disabled = true;
                        }
                    }
                    newRow.remove();
                    if (typeof renumberRows === 'function') renumberRows();
                    if (typeof calculateAllTotals === 'function') await calculateAllTotals();
                    return; 
                }
            } else {
                 delete newRow.dataset.isPotentiallyEmpty; 
            }
            newRow.dataset.localDesc = newText;
            if (!originalCatalogId) { 
                 delete newRow.dataset.taskCatalogId; 
                 setInputAsSelectedTask(false); 
            }
            await finalizeChange();
        }

        async function finalizeChange() {
            await calculateRowValues(newRow);
            if (!isRestoringState && typeof appState !== 'undefined') appState.notify('estimateDataPotentiallyChanged');
            if (!isLoadOperation && typeof saveHistoryState === 'function' && !isRestoringState) saveHistoryState();
        }
    };

    searchInput.addEventListener('input', debounce(async (e) => {
        if (!searchInput.readOnly) {
            if (typeof showDropdown === 'function') {
                await showDropdown(e.target);
            }
        }
    }, 300));

    searchInput.addEventListener('change', handleSearchInputChangeAndPotentialRemoval);
    searchInput.addEventListener('blur', (e) => {
        if (activeDropdown && activeDropdown.style.display === 'block' && activeDropdown.contains(e.relatedTarget)) {
            return;
        }
        if (!searchInput.readOnly) {
            handleSearchInputChangeAndPotentialRemoval();
        }
    });

    descFlexContainer.addEventListener('dblclick', async (event) => {
        if (event.target.closest('.notes-icon-wrapper') || event.target.closest('.color-picker-icon') || event.target.closest('.edit-special-row-icon')) return;
        if (searchInput.readOnly) {
            event.stopPropagation();
            searchInput.dataset.wasReadOnlyBeforeEdit = "true";
            const originalId = newRow.dataset.taskCatalogId;
            if(originalId) {
                const catalogTask = await dbService.getItem(TASKS_CATALOG_STORE_NAME, parseInt(originalId));
                newRow.dataset.originalCatalogDesc = catalogTask ? catalogTask.description : searchInput.value;
            } else {
                newRow.dataset.originalCatalogDesc = searchInput.value; 
            }
            setInputAsSelectedTask(false);
            searchInput.focus();
            searchInput.select();
        }
    });

    quantityInput.addEventListener('input', (e) => handleQuantityInputChange(e.target));
    const quantityChangeHandler = async (e) => { 
        const numericValue = typeof evaluateMathExpression === 'function' ? evaluateMathExpression(e.target.value) : (parseFloat(e.target.value.replace(',', '.')) || 0); 
        e.target.value = numericValue.toFixed(3).replace('.',','); 
        if (newRow.dataset.isPotentiallyEmpty === "true" && numericValue === 0 && !searchInput.value.trim() && !newRow.dataset.taskCatalogId) {
            if (newRow.parentNode) {
                if (lastClickedRow === newRow) {
                    lastClickedRow = newRow.previousElementSibling || newRow.nextElementSibling || null;
                     if(lastClickedRow && saveDepartmentTemplateBtn) saveDepartmentTemplateBtn.disabled = !(lastClickedRow.dataset.rowType === 'department');
                     else if (saveDepartmentTemplateBtn) saveDepartmentTemplateBtn.disabled = true;
                }
                newRow.remove();
                if (typeof renumberRows === 'function') renumberRows();
                if (typeof calculateAllTotals === 'function') await calculateAllTotals();
                return;
            }
        } else {
            delete newRow.dataset.isPotentiallyEmpty;
        }
        await calculateRowValues(newRow); 
        if (!isRestoringState && typeof appState !== 'undefined') appState.notify('estimateDataPotentiallyChanged'); 
        if (!isLoadOperation && typeof saveHistoryState === 'function' && !isRestoringState) saveHistoryState(); 
    };
    quantityInput.addEventListener('change', quantityChangeHandler); 
    quantityInput.addEventListener('blur', quantityChangeHandler);
    newRow.addEventListener('dragover', handleDragOver); newRow.addEventListener('dragleave', handleDragLeave); newRow.addEventListener('drop', handleDrop);
    newRow.addEventListener('click', () => { if (lastClickedRow && lastClickedRow !== newRow) lastClickedRow.classList.remove('last-clicked-row-highlight'); lastClickedRow = newRow; newRow.classList.add('last-clicked-row-highlight'); if(saveDepartmentTemplateBtn) saveDepartmentTemplateBtn.disabled = true; });
    
    if (!isLoadOperation) {
        if (typeof reapplyAllRowColors === 'function') reapplyAllRowColors();
    }

    await calculateRowValues(newRow);
    if (!isLoadOperation) { if (!isRestoringState && typeof appState !== 'undefined') appState.notify('estimateDataPotentiallyChanged'); if (typeof saveHistoryState === 'function' && !isRestoringState) saveHistoryState(); }
    return newRow;
}


async function handleEditEstimateRow(row) { if(typeof openModal === 'function') await openModal('edit_row', row); }
async function calculateMaterialSummary() { 
    const materialMap = {};
    if (!costTableBody) return;
    const rows = Array.from(costTableBody.querySelectorAll('tr[data-row-type="task"]'));
    for (const row of rows) {
        const quantity = typeof evaluateMathExpression === 'function' ? evaluateMathExpression(row.querySelector('.quantity-input')?.value) : (parseFloat(row.querySelector('.quantity-input')?.value.replace(',', '.')) || 0);
        let normsM_source = null;
        const taskCatalogId = row.dataset.taskCatalogId ? parseInt(row.dataset.taskCatalogId) : null;
        if (row.dataset.localNormsM) { try { normsM_source = JSON.parse(row.dataset.localNormsM); } catch (e) {} }
        else if (taskCatalogId) { const taskDef = await dbService.getItem(TASKS_CATALOG_STORE_NAME, taskCatalogId); if (taskDef && taskDef.norms) normsM_source = taskDef.norms.M; }
        else { const desc = row.querySelector('.task-search-input')?.value.trim(); if (desc) { const materialFromDb = await dbService.getItemByIndex(MATERIALS_CATALOG_STORE_NAME, 'name', desc); if (materialFromDb) normsM_source = [{ materialId: materialFromDb.id, quantity: 1, unit: materialFromDb.unit }]; } }
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
                    const matDb = await dbService.getItemByIndex(MATERIALS_CATALOG_STORE_NAME, 'name', matNorm.name.trim());
                    if (!matDb) { console.warn(`Materiał "${matNorm.name}" (lokalny) nie znaleziony w katalogu.`); continue; }
                    materialId = matDb.id;
                    materialName = matDb.name;
                    materialUnit = matNorm.unit || matDb.unit || 'j.m.';
                    materialCategoryCode = matDb.categoryCode || 'IN';
                } else continue;
                if (materialId && typeof matNorm.quantity === 'number' && matNorm.quantity > 0) {
                    if (!materialMap[materialId]) materialMap[materialId] = { totalQuantity: 0, unit: materialUnit, categoryCode: materialCategoryCode, name: materialName };
                    materialMap[materialId].totalQuantity += matNorm.quantity * quantity;
                    if(materialUnit !== 'j.m.' && materialMap[materialId].unit === 'j.m.') materialMap[materialId].unit = materialUnit;
                }
            }
        }
    }
    const materialsArray = [];
    for (const materialId in materialMap) {
        const data = materialMap[materialId];
        const materialDbData = await dbService.getItem(MATERIALS_CATALOG_STORE_NAME, parseInt(materialId));
        if (!materialDbData) continue;
        const marketPriceY = materialDbData.priceY || 0;
        const purchasePriceX = materialDbData.priceX ?? marketPriceY;
        const valueBasedOnMarketPrice = data.totalQuantity * marketPriceY;
        const unitProfit = marketPriceY - purchasePriceX;
        const totalProfit = unitProfit * data.totalQuantity;
        materialsArray.push({ id: parseInt(materialId), name: data.name, totalQuantity: data.totalQuantity, unit: data.unit, category: data.categoryCode, categoryFullName: typeof getMaterialCategoryFullName === 'function' ? getMaterialCategoryFullName(data.categoryCode) : data.categoryCode, unitPriceY: marketPriceY, purchasePriceX: purchasePriceX, value: valueBasedOnMarketPrice, unitProfit: unitProfit, totalProfit: totalProfit });
    }
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
    materialSummaryBody.innerHTML = '';
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
        const materialNameCell = newRow.insertCell(); materialNameCell.classList.add('editable-material-name-cell'); materialNameCell.textContent = material.name; materialNameCell.title = "Kliknij dwukrotnie, aby edytować nazwę";
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
    updateMaterialSortIndicators();
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
            if(typeof saveHistoryState === 'function' && !isRestoringState) saveHistoryState();
            if (costTableBody) costTableBody.innerHTML = '';
            chapterSums = {};
            departmentColors = {};
            if (typeof appState !== 'undefined') appState.setState('isHierarchicalMode', false);
            if(typeof saveEstimateState === 'function' && !isRestoringState) await saveEstimateState();
            if(typeof updateUndoRedoButtons === 'function') updateUndoRedoButtons();
            if(typeof reapplyAllRowColors === 'function') reapplyAllRowColors();
            showNotification("Kosztorys wyczyszczony.", "success");
        });
    } else { 
        if (confirm("Czy na pewno chcesz wyczyścić cały kosztorys? Tej operacji nie można cofnąć.")) {
            if(typeof saveHistoryState === 'function' && !isRestoringState) saveHistoryState();
            if (costTableBody) costTableBody.innerHTML = '';
            chapterSums = {};
            departmentColors = {};
            if (typeof appState !== 'undefined') appState.setState('isHierarchicalMode', false);
            if(typeof saveEstimateState === 'function' && !isRestoringState) await saveEstimateState();
            if(typeof updateUndoRedoButtons === 'function') updateUndoRedoButtons();
            if(typeof reapplyAllRowColors === 'function') reapplyAllRowColors();
            showNotification("Kosztorys wyczyszczony.", "success");}
    }
}
function ensureFirstRowIsDepartmentIfNeeded(isLoadOperation = false, forceAdd = false) { 
    if (typeof appState !== 'undefined' && appState.getState('isHierarchicalMode') && costTableBody) {
        const firstRealRow = costTableBody.querySelector('tr:not(.insert-indicator-row)');
        if (forceAdd || !firstRealRow || firstRealRow.dataset.rowType !== 'department') {
            if (!costTableBody.querySelector('tr[data-row-type="department"]:not(.insert-indicator-row)')) {
                if (typeof addSpecialRow === 'function') {
                    const firstDept = addSpecialRow('department', 'Dział 1. (Ogólny)', isLoadOperation, true, null, costTableBody.firstChild);
                    if(!isLoadOperation && !lastClickedRow && firstDept) {
                        lastClickedRow = firstDept;
                        lastClickedRow.classList.add('last-clicked-row-highlight');
                    }
                    return true;
                }
            }
        }
    }
    return false;
}
function activateHierarchicalMode(activate) { 
    if (typeof appState !== 'undefined') appState.setState('isHierarchicalMode', activate);
    else console.error("appState is not defined. Cannot activate hierarchical mode.");
}
function handleQuantityInputChange(inputElement) { 
    const value = inputElement.value;
    const row = inputElement.closest('tr');
    if(row && typeof calculateRowValues === 'function') calculateRowValues(row);
}

function handleDragStart(e) {
    if (e.target.classList.contains('drag-handle')) {
        draggedRow = e.target.closest('tr');
        if (draggedRow) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedRow.dataset.rowId || ''); 
            draggedRow.classList.add('dragging');

            const children = getDragAndDropBlock(draggedRow);
            children.forEach(child => {
                if (child !== draggedRow) child.classList.add('dragging-child');
            });
        }
    } else {
        e.preventDefault();
    }
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

    const draggedBlock = getDragAndDropBlock(draggedRow);

    if (draggedBlock.includes(dropTargetRow)) {
        console.warn("Nie można upuścić elementu nadrzędnego na jego element podrzędny.");
        showNotification("Nie można przenieść działu/poddziału do jego wnętrza.", "warning");
        handleDragEnd();
        return;
    }

    const fragment = document.createDocumentFragment();
    draggedBlock.forEach(row => fragment.appendChild(row));
    dropTargetRow.parentNode.insertBefore(fragment, dropTargetRow);

    handleDragEnd(); 

    if(typeof renumberRows === 'function') renumberRows();
    if(typeof reapplyAllRowColors === 'function') reapplyAllRowColors();
    if(!isRestoringState && typeof appState !== 'undefined') {
        appState.notify('estimateDataPotentiallyChanged');
        appState.notify('estimateRowsStructureChanged');
        if(typeof saveHistoryState === 'function') saveHistoryState();
    }
}

function getDragAndDropBlock(startRow) {
    const block = [startRow];
    const startRowType = startRow.dataset.rowType;

    if (startRowType === 'department') {
        let currentRow = startRow.nextElementSibling;
        while (currentRow && currentRow.dataset.rowType !== 'department') {
            block.push(currentRow);
            currentRow = currentRow.nextElementSibling;
        }
    } else if (startRowType === 'subdepartment') {
        let currentRow = startRow.nextElementSibling;
        while (currentRow && currentRow.dataset.rowType === 'task') {
            const taskParentDept = getParentDepartmentRow(currentRow);
            const subDeptParentDept = getParentDepartmentRow(startRow);
            if (taskParentDept === subDeptParentDept) {
                block.push(currentRow);
            } else {
                break; 
            }
            currentRow = currentRow.nextElementSibling;
        }
    }
    return block;
}

console.log("Moduł logiki kosztorysu (EazyKoszt 0.4.2-script-estimate.js - Ulepszenia UX) załadowany.");