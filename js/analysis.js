// Opis: Moduł odpowiedzialny za generowanie analizy kosztorysu.
// Wersja 0.5.0: Uwzględnienie departmentColors w tabelach analizy.

// ==========================================================================
// SEKCJA 1: DEFINICJA MODUŁU AnalysisModule
// ==========================================================================

console.log("Moduł Analizy EazyKoszt 0.5.0 ładowany...");

const DEFAULT_NON_HIERARCHICAL_DEPT_NAME_ANALYSIS = "Kosztorys Ogółem";
const DEFAULT_UNASSIGNED_DEPT_NAME_ANALYSIS = "Dział (Pozycje nieprzypisane)";


const AnalysisModule = {
    // --- Elementy DOM ---
    chartDepartmentsContainer: null,
    detailedMaterialCostsContainer: null,
    materialProfitDetailsContainer: null,
    materialViewSelect: null,
    scheduleContainer: null,
    generateScheduleBtn: null,
    laborAnalysisContainer: null,
    scheduleWindow: null,

    // --- Instancje wykresów Chart.js ---
    departmentChartInstances: { total: null, labor: null, material: null },
    workerCategoryDistributionChartInstance: null,

    // --- Konfiguracja ---
    PREDEFINED_COLORS: [ // Używane jako fallback lub dla kategorii, nie dla działów
        'rgba(255, 99, 132, 0.8)', 'rgba(54, 162, 235, 0.8)', 'rgba(255, 206, 86, 0.8)',
        'rgba(75, 192, 192, 0.8)', 'rgba(153, 102, 255, 0.8)', 'rgba(255, 159, 64, 0.8)',
        'rgba(233, 30, 99, 0.8)',  'rgba(3, 169, 244, 0.8)',  'rgba(255, 193, 7, 0.8)',
        'rgba(0, 150, 136, 0.8)',  'rgba(103, 58, 183, 0.8)','rgba(255, 87, 34, 0.8)',
        'rgba(63, 81, 181, 0.8)',  'rgba(121, 85, 72, 0.8)',  'rgba(205, 220, 57, 0.8)',
        'rgba(156, 39, 176, 0.8)','rgba(0, 188, 212, 0.8)',  'rgba(244, 67, 54, 0.8)',
        'rgba(76, 175, 80, 0.8)',  'rgba(139, 195, 74, 0.8)','rgba(96, 125, 139, 0.8)',
        'rgba(255, 235, 59, 0.8)','rgba(230, 81, 0, 0.8)',  'rgba(0, 121, 107, 0.8)',
        'rgba(67, 160, 71, 0.8)', 'rgba(251, 192, 45, 0.8)'
    ],

    dataAccess: {
        // Zmieniono: getCostTableBody na getCostTableRows, zwraca wiersze z modelu
        getCostTableRows: () => (typeof currentEstimateModel !== 'undefined' ? currentEstimateModel.rows : []),
        // Zmieniono: isHierarchical odczytuje z currentEstimateModel
        isHierarchical: () => (typeof currentEstimateModel !== 'undefined' ? currentEstimateModel.isHierarchical : false),
        getEstimateTitle: () => (typeof appState !== 'undefined' ? appState.getState('estimateTitle') : 'Kosztorys'),
        getChapterSums: () => (typeof chapterSums !== 'undefined' ? chapterSums : {}),
        getLaborRateForWorkerCategory: (categoryCode) => (typeof getLaborRateForWorkerCategory === 'function' ? getLaborRateForWorkerCategory(categoryCode) : 0),
        getWorkerCategoryName: (categoryCode) => (typeof getWorkerCategoryName === 'function' ? getWorkerCategoryName(categoryCode) : categoryCode),
        getWorkerCategories: () => (typeof appState !== 'undefined' ? appState.getState('workerRatesSettings') : {}),
        getMaterialPrice: async (nameOrId) => (typeof getMaterialPrice === 'function' ? await getMaterialPrice(nameOrId) : 0),
        getMaterialPurchasePrice: async (nameOrId) => (typeof getMaterialPurchasePrice === 'function' ? await getMaterialPurchasePrice(nameOrId) : 0),
        getMaterialUnit: async (nameOrId) => (typeof getMaterialUnit === 'function' ? await getMaterialUnit(nameOrId) : 'j.m.'),
        getMaterialCategory: async (nameOrId) => (typeof getMaterialCategory === 'function' ? await getMaterialCategory(nameOrId) : 'IN'),
        getMaterialCategoryFullName: (code) => (typeof getMaterialCategoryFullName === 'function' ? getMaterialCategoryFullName(code) : 'N/A'),
        getAllAvailableTasks: async () => (typeof dbService !== 'undefined' ? await dbService.getAllItems(TASKS_CATALOG_STORE_NAME) : []),
        getAllMaterialsData: async () => {
            if (typeof dbService === 'undefined') return {};
            const materials = await dbService.getAllItems(MATERIALS_CATALOG_STORE_NAME);
            const data = {};
            materials.forEach(m => {
                if(m && m.name) {
                    data[m.name] = {
                        id: m.id, price: m.priceY, purchasePrice: m.priceX ?? m.priceY ?? 0,
                        unit: m.unit, category: m.categoryCode
                    };
                }
            });
            return data;
        },
        formatCurrency: (val, places = 2) => (typeof formatCurrency === 'function' ? formatCurrency(val, places) : String(val)),
        evaluateMathExpression: (expr) => (typeof evaluateMathExpression === 'function' ? evaluateMathExpression(expr) : 0),
        // Zmieniono: getDepartmentColors odczytuje z currentEstimateModel
        getDepartmentColors: () => (typeof currentEstimateModel !== 'undefined' ? currentEstimateModel.departmentColors : {}),
        getContrastTextColor: (hex) => (typeof getContrastTextColor === 'function' ? getContrastTextColor(hex) : '#000'),
        getNextDefaultDepartmentColor: () => (typeof getNextDefaultDepartmentColor === 'function' ? getNextDefaultDepartmentColor() : '#CCCCCC'),
        lightenHexColor: (hex, percent) => (typeof lightenHexColor === 'function' ? lightenHexColor(hex, percent) : hex),
    },

    init: function(dataAccessMethods) {
        if (dataAccessMethods) {
            this.dataAccess = { ...this.dataAccess, ...dataAccessMethods };
        }
        this.chartDepartmentsContainer = document.getElementById('analysis-chart-departments');
        this.detailedMaterialCostsContainer = document.getElementById('analysis-detailed-material-costs');
        this.materialProfitDetailsContainer = document.getElementById('material-profit-details');
        this.materialViewSelect = document.getElementById('material-analysis-view-select');
        this.scheduleContainer = document.getElementById('analysis-schedule-output');
        this.generateScheduleBtn = document.getElementById('generate-schedule-btn');
        this.laborAnalysisContainer = document.getElementById('analysis-labor-costs');

        if (this.generateScheduleBtn) this.generateScheduleBtn.addEventListener('click', () => this.openScheduleWindow());
        if (this.materialViewSelect) this.materialViewSelect.addEventListener('change', () => this.renderDetailedMaterialCosts());
        if (this.scheduleContainer) this.scheduleContainer.innerHTML = '<p>Kliknij "Generuj Harmonogram", aby otworzyć go w nowym oknie.</p>';

        if (!this.laborAnalysisContainer) console.warn("AnalysisModule: Kontener 'analysis-labor-costs' nie znaleziony.");
        if (!this.materialProfitDetailsContainer) console.warn("AnalysisModule: Kontener 'material-profit-details' nie znaleziony.");

        if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
            try { Chart.register(ChartDataLabels); }
            catch (e) { console.warn("AnalysisModule: Nie udało się zarejestrować ChartDataLabels.", e); }
        } else { console.warn('AnalysisModule: Chart.js lub ChartDataLabels nie jest załadowany.'); }
        console.log("Moduł Analizy (EazyKoszt 0.4.2) zainicjalizowany.");
    },

    refreshAnalysis: async function() {
        console.log("AnalysisModule: Odświeżanie analizy...");
        if (this.chartDepartmentsContainer && this.detailedMaterialCostsContainer) {
            await this.renderDepartmentCharts();
            await this.renderDetailedMaterialCosts();
        } else console.warn("AnalysisModule: Kontenery analizy działów lub materiałów nie są dostępne.");
        if (this.laborAnalysisContainer) await this.renderLaborAnalysis();
        else console.warn("AnalysisModule: Kontener analizy robocizny nie jest dostępny.");
        if (this.materialProfitDetailsContainer) await this.renderMaterialProfitAnalysis();
        else console.warn("AnalysisModule: Kontener analizy zysku materiałowego nie jest dostępny.");
        if (this.scheduleContainer) this.scheduleContainer.innerHTML = '<p>Kliknij "Generuj Harmonogram", aby otworzyć go w nowym oknie.</p>';
    },

    _aggregateDepartmentCostsAndLabor: async function() {
        const departmentData = {};
        const costTableRows = this.dataAccess.getCostTableRows(); // Pobierz wiersze z modelu
        const isHierarchical = this.dataAccess.isHierarchical(); // Odczyt z modelu
        const allAvailableTasks = await this.dataAccess.getAllAvailableTasks(); // To nadal to samo
        const currentDepartmentColors = this.dataAccess.getDepartmentColors(); // Odczyt z modelu

        let tempColorIndex = 0;
        if (!costTableRows || costTableRows.length === 0) { console.warn("AnalysisModule: Brak danych kosztorysu do agregacji."); return departmentData; }

        const currentDefaultNonHierarchicalDeptName = DEFAULT_NON_HIERARCHICAL_DEPT_NAME_ANALYSIS;
        const currentDefaultUnassignedDeptName = DEFAULT_UNASSIGNED_DEPT_NAME_ANALYSIS;
        let currentDepartmentAggregates = null;
        let currentDeptRowIdForColor = null; // Do zapamiętania rowId aktualnego działu dla koloru
        let lastDeptColor = this.dataAccess.getNextDefaultDepartmentColor(); // Kolor dla pierwszego działu, jeśli nie ma przypisanego

        if (!isHierarchical) {
            // W trybie niehierarchicznym, cała suma idzie do jednego "działu"
            const defaultColor = currentDepartmentColors[currentDefaultNonHierarchicalDeptName] || this.dataAccess.getNextDefaultDepartmentColor();
            departmentData[currentDefaultNonHierarchicalDeptName] = { name: currentDefaultNonHierarchicalDeptName, labor: 0, material: 0, total: 0, laborByWorker: {}, color: defaultColor, textColor: this.dataAccess.getContrastTextColor(defaultColor), rowId: currentDefaultNonHierarchicalDeptName };
            currentDepartmentAggregates = departmentData[currentDefaultNonHIerarchicalDeptName];
        }

        for (const rowObject of costTableRows) { // Iterujemy po obiektach z modelu
            const rowType = rowObject.rowType;
            const rowId = rowObject.rowId;

            if (isHierarchical && rowType === 'department') {
                const deptName = rowObject.text?.trim() || `Dział ${this.dataAccess.getChapterSums()[rowId]?.lp || '?'}`; // Użyj tekstu z modelu
                currentDeptRowIdForColor = rowId; // Zapamiętaj rowId działu
                const deptColor = currentDepartmentColors[rowId] || this.PREDEFINED_COLORS[tempColorIndex++ % this.PREDEFINED_COLORS.length];
                lastDeptColor = deptColor;
                const deptTextColor = this.dataAccess.getContrastTextColor(deptColor);

                if (!departmentData[deptName]) departmentData[deptName] = { name: deptName, labor: 0, material: 0, total: 0, laborByWorker: {}, color: deptColor, textColor: deptTextColor, rowId: rowId };
                currentDepartmentAggregates = departmentData[deptName];
            } else if (rowType === 'task') {
                // Jeśli jest tryb hierarchiczny i jeszcze nie ma aktywnego działu, przypisz do "nieprzypisanych"
                if (isHierarchical && !currentDepartmentAggregates) {
                    if (!departmentData[currentDefaultUnassignedDeptName]) {
                        const unassignedColor = this.PREDEFINED_COLORS[tempColorIndex++ % this.PREDEFINED_COLORS.length];
                        departmentData[currentDefaultUnassignedDeptName] = { name: currentDefaultUnassignedDeptName, labor: 0, material: 0, total: 0, laborByWorker: {}, color: unassignedColor, textColor: this.dataAccess.getContrastTextColor(unassignedColor) };
                    }
                    currentDepartmentAggregates = departmentData[currentDefaultUnassignedDeptName];
                }

                if (currentDepartmentAggregates) {
                    const taskQuantity = rowObject.quantity; // Ilość z modelu
                    if (taskQuantity > 0) {
                        let normR = rowObject.localNormR; // Normy z modelu
                        let normsM = rowObject.localNormsM ? JSON.parse(JSON.stringify(rowObject.localNormsM)) : []; // Normy z modelu (głęboka kopia)
                        let workerCategory = rowObject.localWorkerCategory || 'ogolnobudowlany';

                        const taskCatalogId = rowObject.taskCatalogId; // ID katalogowe z modelu
                        if (taskCatalogId && (normR === undefined || normsM.length === 0 || !rowObject.localWorkerCategory)) {
                            const baseTask = allAvailableTasks.find(t => t.id === taskCatalogId);
                            if (baseTask) {
                                if (normR === undefined && baseTask.norms?.R !== undefined) normR = baseTask.norms.R;
                                if (normsM.length === 0 && baseTask.norms?.M) normsM = JSON.parse(JSON.stringify(baseTask.norms.M)); // Głęboka kopia
                                if (!rowObject.localWorkerCategory && baseTask.workerCategory) workerCategory = baseTask.workerCategory;
                            }
                        }

                        const laborRateForTask = this.dataAccess.getLaborRateForWorkerCategory(workerCategory);
                        const taskLaborRg = (typeof normR === 'number' && normR >= 0) ? (taskQuantity * normR) : 0;
                        const taskLaborCost = taskLaborRg * laborRateForTask;

                        let taskMaterialCost = 0;
                        if (Array.isArray(normsM)) {
                            for (const mat of normsM) {
                                let matPrice = 0;
                                if (mat.materialId) matPrice = await this.dataAccess.getMaterialPrice(mat.materialId);
                                else if (mat.name) matPrice = await this.dataAccess.getMaterialPrice(mat.name); // Fallback for older data
                                if (typeof mat.quantity === 'number' && mat.quantity > 0) taskMaterialCost += taskQuantity * mat.quantity * matPrice;
                            }
                        }

                        currentDepartmentAggregates.labor += taskLaborCost;
                        currentDepartmentAggregates.material += taskMaterialCost;
                        currentDepartmentAggregates.total += (taskLaborCost + taskMaterialCost);

                        if (!currentDepartmentAggregates.laborByWorker[workerCategory]) currentDepartmentAggregates.laborByWorker[workerCategory] = { rg: 0, cost: 0 };
                        currentDepartmentAggregates.laborByWorker[workerCategory].rg += taskLaborRg;
                        currentDepartmentAggregates.laborByWorker[workerCategory].cost += taskLaborCost;
                    }
                }
            }
            // Logic for subdepartments is missing here if you want separate sums for them in analysis,
            // but the current structure only aggregates by top-level department.
        }
        return departmentData;
    },

    _renderSingleDoughnutChart: function(canvasElement, chartTitle, labels, dataValues, colorMap, legendPosition = 'bottom', showDataLabels = true, dataLabelFontSize = 10) { if (!canvasElement) return null; const chartData = { labels: [], datasets: [{ label: chartTitle.substring(0, chartTitle.indexOf('(') -1 || chartTitle.length).trim() || 'Koszt', data: [], backgroundColor: [], borderColor: '#fff', borderWidth: 2 }]}; let hasData = false; labels.forEach((label, index) => { if (dataValues[index] > 0.005) { chartData.labels.push(label); chartData.datasets[0].data.push(parseFloat(dataValues[index].toFixed(2))); chartData.datasets[0].backgroundColor.push(colorMap[label] || this.PREDEFINED_COLORS[index % this.PREDEFINED_COLORS.length]); hasData = true; } }); const parentWrapper = canvasElement.parentElement; if (!hasData) { if (parentWrapper) { if (!parentWrapper.querySelector('h4')) { const titleEl = document.createElement('h4'); titleEl.style.textAlign = 'center'; titleEl.textContent = chartTitle; parentWrapper.insertBefore(titleEl, canvasElement); } const noDataP = parentWrapper.querySelector('p.no-data-message') || document.createElement('p'); noDataP.className = 'no-data-message'; noDataP.style.cssText = 'text-align:center; padding:20px; color:#777;'; noDataP.textContent = 'Brak danych do wyświetlenia.'; if (!parentWrapper.contains(noDataP)) parentWrapper.appendChild(noDataP); canvasElement.style.display = 'none'; } return null; } if (parentWrapper && parentWrapper.querySelector('p.no-data-message')) parentWrapper.querySelector('p.no-data-message').remove(); canvasElement.style.display = ''; if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') { const ctx = canvasElement.getContext('2d'); const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: legendPosition, align: 'center', labels: { font: { size: legendPosition === 'bottom' ? 10 : 9 }, boxWidth: 12, padding: 10 } }, title: { display: false }, tooltip: { callbacks: { label: (context) => { let label = context.label || ''; if (label) { label += ': '; } const value = context.parsed; const sum = context.dataset.data.reduce((a, b) => a + b, 0); const percentage = sum > 0 ? ((value / sum) * 100).toFixed(1) + '%' : '0.0%'; label += `${this.dataAccess.formatCurrency(value)} zł (${percentage})`; return label; } } }, datalabels: { display: showDataLabels, formatter: (value, ctx) => { const sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0); const percentage = sum > 0 ? (value * 100 / sum).toFixed(1) + "%" : ""; return `${this.dataAccess.formatCurrency(value)}\n(${percentage})`; }, color: (context) => { const bgColor = context.dataset.backgroundColor[context.dataIndex]; let r, g, b; if (typeof bgColor === 'string' && bgColor.startsWith('rgba(')) { [r,g,b] = bgColor.slice(5, -1).split(',').map(Number); } else if (typeof bgColor === 'string' && bgColor.startsWith('#')) { r = parseInt(bgColor.slice(1,3),16); g = parseInt(bgColor.slice(3,5),16); b = parseInt(bgColor.slice(5,7),16); } else { return '#444';} const brightness = Math.round(((r * 299) + (g * 587) + (b * 114)) / 1000); return brightness > 125 ? '#444' : '#fff'; }, font: { weight: 'bold', size: dataLabelFontSize }, align: 'center', anchor: 'center', textAlign: 'center', padding: 0, display: (context) => { const sum = context.chart.data.datasets[0].data.reduce((a,b) => a + b, 0); return sum > 0 ? (context.dataset.data[context.dataIndex] * 100 / sum) > 2 : false; } } } }; return new Chart(ctx, { type: 'doughnut', data: chartData, options: chartOptions }); } else { if (parentWrapper) { let htmlList = `<ul>`; chartData.labels.forEach((label, index) => { htmlList += `<li>${label}: ${this.dataAccess.formatCurrency(chartData.datasets[0].data[index])} zł</li>`; }); htmlList += '</ul>'; parentWrapper.innerHTML = `<h4 style="text-align:center;">${chartTitle} (Chart.js niezaładowany)</h4>${htmlList}`; } return null; } },
    async renderDepartmentCharts() {
        if (!this.chartDepartmentsContainer) return;
        Object.values(this.departmentChartInstances).forEach(instance => instance?.destroy());
        this.departmentChartInstances = { total: null, labor: null, material: null };
        this.chartDepartmentsContainer.innerHTML = '';

        const aggregatedData = await this._aggregateDepartmentCostsAndLabor();
        const departmentNames = Object.keys(aggregatedData);

        if (departmentNames.length === 0 ) {
            this.chartDepartmentsContainer.innerHTML = '<p style="text-align:center; width:100%;">Brak danych do wykresów działów.</p>';
            return;
        }

        const departmentColorMap = {};
        departmentNames.forEach(name => {
            departmentColorMap[name] = aggregatedData[name].color;
        });

        const chartConfigs = [
            { idSuffix: 'Total', title: 'Całkowity Koszt wg Działów (Netto)', dataType: 'total' },
            { idSuffix: 'Labor', title: 'Koszt Robocizny wg Działów (Netto)', dataType: 'labor' },
            { idSuffix: 'Material', title: 'Koszt Materiałów wg Działów (Netto)', dataType: 'material' }
        ];

        chartConfigs.forEach(config => {
            const wrapper = document.createElement('div');
            wrapper.className = 'department-chart-wrapper';
            const titleEl = document.createElement('h4');
            titleEl.textContent = config.title;
            wrapper.appendChild(titleEl);
            const canvas = document.createElement('canvas');
            wrapper.appendChild(canvas);
            this.chartDepartmentsContainer.appendChild(wrapper);

            const chartLabels = departmentNames;
            const chartDataValues = chartLabels.map(name => aggregatedData[name] ? (aggregatedData[name][config.dataType] || 0) : 0);
            this.departmentChartInstances[config.dataType] = this._renderSingleDoughnutChart(
                canvas, config.title, chartLabels, chartDataValues, departmentColorMap, 'bottom', true, 9
            );
        });
    },
    async renderLaborAnalysis() { if (!this.laborAnalysisContainer) return; this.laborAnalysisContainer.innerHTML = ''; const flexContainer = document.createElement('div'); flexContainer.style.display = 'flex'; flexContainer.style.flexWrap = 'wrap'; flexContainer.style.gap = '20px'; this.laborAnalysisContainer.appendChild(flexContainer); const chartWrapper = document.createElement('div'); chartWrapper.className = 'labor-analysis-chart-wrapper big-chart-wrapper'; const chartTitleEl = document.createElement('h4'); chartTitleEl.textContent = "Udział Kosztów Robocizny wg Typu Pracownika (Netto)"; chartTitleEl.style.textAlign = 'center'; const chartCanvas = document.createElement('canvas'); chartWrapper.appendChild(chartTitleEl); chartWrapper.appendChild(chartCanvas); flexContainer.appendChild(chartWrapper); await this.renderWorkerCategoryDistributionChart(chartCanvas); const tableWrapper = document.createElement('div'); tableWrapper.className = 'labor-analysis-table-wrapper'; tableWrapper.style.flex = '1 1 100%'; tableWrapper.style.marginTop = '20px'; flexContainer.appendChild(tableWrapper); await this.renderLaborCostsByDepartmentAndWorkerTable(tableWrapper); },
    async renderWorkerCategoryDistributionChart(canvasElement) { if (this.workerCategoryDistributionChartInstance) this.workerCategoryDistributionChartInstance.destroy(); const aggregatedData = await this._aggregateDepartmentCostsAndLabor(); const workerLaborTotals = {}; Object.values(aggregatedData).forEach(dept => { Object.entries(dept.laborByWorker).forEach(([workerCat, data]) => { if (!workerLaborTotals[workerCat]) workerLaborTotals[workerCat] = 0; workerLaborTotals[workerCat] += data.cost; }); }); const labels = Object.keys(workerLaborTotals).map(catCode => this.dataAccess.getWorkerCategoryName(catCode)); const dataValues = Object.values(workerLaborTotals); const workerColorMap = {}; Object.keys(workerLaborTotals).forEach((catCode, index) => { workerColorMap[this.dataAccess.getWorkerCategoryName(catCode)] = this.PREDEFINED_COLORS[index % this.PREDEFINED_COLORS.length]; }); this.workerCategoryDistributionChartInstance = this._renderSingleDoughnutChart( canvasElement, "Udział Kosztów Robocizny wg Typu Pracownika", labels, dataValues, workerColorMap, 'bottom', true, 11 );},
    async renderLaborCostsByDepartmentAndWorkerTable(containerElement) {
        containerElement.innerHTML = '';
        const tableTitleEl = document.createElement('h4');
        tableTitleEl.textContent = "Robocizna wg Działów i Typu Pracownika (Netto)";
        containerElement.appendChild(tableTitleEl);
        const aggregatedData = await this._aggregateDepartmentCostsAndLabor();
        if (Object.keys(aggregatedData).length === 0) { containerElement.innerHTML += '<p>Brak danych robocizny do wyświetlenia w tabeli.</p>'; return; }

        let tableHtml = `<table class="labor-analysis-table"><thead><tr><th>Dział</th><th>Typ Pracownika</th><th style="text-align:right;">Suma RG</th><th style="text-align:right;">Koszt (zł)</th></tr></thead><tbody>`;
        let grandTotalRg = 0; let grandTotalLaborCost = 0;
        const currentDefaultNonHierarchicalDeptName = DEFAULT_NON_HIERARCHICAL_DEPT_NAME_ANALYSIS;
        const currentDefaultUnassignedDeptName = DEFAULT_UNASSIGNED_DEPT_NAME_ANALYSIS;

        const sortedDepartmentNames = Object.keys(aggregatedData).sort((a, b) => {
            const deptA = aggregatedData[a];
            const deptB = aggregatedData[b];
            if ((deptA.name === currentDefaultNonHIerarchicalDeptName || deptA.name === currentDefaultUnassignedDeptName) &&
                !(deptB.name === currentDefaultNonHierarchicalDeptName || deptB.name === currentDefaultUnassignedDeptName)) return 1;
            if (!(deptA.name === currentDefaultNonHierarchicalDeptName || deptA.name === currentDefaultUnassignedDeptName) &&
                (deptB.name === currentDefaultNonHierarchicalDeptName || deptB.name === currentDefaultUnassignedDeptName)) return -1;

            const numPartA = deptA.name.match(/^(\d+(\.\d+)*)/); const numPartB = deptB.name.match(/^(\d+(\.\d+)*)/);
            if (numPartA && numPartB) { const partsA = numPartA[1].split('.').map(Number); const partsB = numPartB[1].split('.').map(Number); for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) { if (partsA[i] !== partsB[i]) return partsA[i] - partsB[i]; } return partsA.length - partsB.length; }
            return deptA.name.localeCompare(deptB.name, 'pl');
        });

        sortedDepartmentNames.forEach(deptKey => { // deptKey to oryginalna nazwa działu z agregacji
            const dept = aggregatedData[deptKey];
            let firstRowForDept = true; let deptTotalRg = 0; let deptTotalLaborCost = 0; let hasLaborInDept = false;
            const deptStyle = `background-color: ${dept.color || 'transparent'} !important; color: ${dept.textColor || '#000'} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;`;
            const sortedWorkerCategoriesInDept = Object.keys(dept.laborByWorker).sort((a,b) => this.dataAccess.getWorkerCategoryName(a).localeCompare(this.dataAccess.getWorkerCategoryName(b), 'pl'));

            if (sortedWorkerCategoriesInDept.length > 0) {
                sortedWorkerCategoriesInDept.forEach(workerCatCode => {
                    const laborData = dept.laborByWorker[workerCatCode];
                    if (laborData.rg > 0.001 || laborData.cost > 0.001) {
                        hasLaborInDept = true;
                        tableHtml += `<tr>`;
                        if (firstRowForDept) {
                            const rowspanCount = sortedWorkerCategoriesInDept.filter(wc => (dept.laborByWorker[wc].rg > 0.001 || dept.laborByWorker[wc].cost > 0.001)).length;
                            tableHtml += `<td rowspan="${rowspanCount > 0 ? rowspanCount : 1}" style="${deptStyle}">${dept.name}</td>`;
                            firstRowForDept = false;
                        }
                        tableHtml += `<td style="${deptStyle}">${this.dataAccess.getWorkerCategoryName(workerCatCode)}</td>
                                      <td style="text-align:right; ${deptStyle}">${laborData.rg.toFixed(2)}</td>
                                      <td style="text-align:right; ${deptStyle}">${this.dataAccess.formatCurrency(laborData.cost)}</td></tr>`;
                        deptTotalRg += laborData.rg; deptTotalLaborCost += laborData.cost;
                    }
                });
            }
            if (hasLaborInDept) {
                const summaryStyle = `background-color: ${this.dataAccess.lightenHexColor(dept.color, 80)} !important; color: ${this.dataAccess.getContrastTextColor(this.dataAccess.lightenHexColor(dept.color, 80))} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-weight:bold;`;
                tableHtml += `<tr class="department-summary-labor" style="${summaryStyle}"><td colspan="2" style="text-align:right;">Suma dla ${dept.name}:</td><td style="text-align:right;">${deptTotalRg.toFixed(2)}</td><td style="text-align:right;">${this.dataAccess.formatCurrency(deptTotalLaborCost)}</td></tr>`;
                grandTotalRg += deptTotalRg; grandTotalLaborCost += deptTotalLaborCost;
            } else if (this.dataAccess.isHierarchical() && dept.name !== currentDefaultNonHierarchicalDeptName && dept.name !== currentDefaultUnassignedDeptName) {
                tableHtml += `<tr style="${deptStyle}"><td>${dept.name}</td><td>-</td><td style="text-align:right;">0.00</td><td style="text-align:right;">0.00</td></tr>`;
            }
        });
        tableHtml += `</tbody><tfoot><tr><td colspan="2" style="text-align:right; font-weight:bold;">SUMA ROBOCIZNY:</td><td style="text-align:right; font-weight:bold;">${grandTotalRg.toFixed(2)}</td><td style="text-align:right; font-weight:bold;">${this.dataAccess.formatCurrency(grandTotalLaborCost)}</td></tr></tfoot></table>`;
        containerElement.innerHTML += tableHtml;
    },
    async renderDetailedMaterialCosts() { if (!this.detailedMaterialCostsContainer || !this.materialViewSelect) return; const selectedView = this.materialViewSelect.value; if (selectedView === 'by_category') { await this.renderDetailedMaterialCostsByCat(); } else { await this.renderDetailedMaterialCostsByDept(); } },
    async renderDetailedMaterialCostsByCat() {
        if (!this.detailedMaterialCostsContainer) return;
        this.detailedMaterialCostsContainer.innerHTML = '';

        const costTableRows = this.dataAccess.getCostTableRows(); // Pobierz wiersze z modelu
        if (!costTableRows || costTableRows.length === 0) {
            this.detailedMaterialCostsContainer.innerHTML = '<p>Brak danych kosztorysu.</p>';
            return;
        }

        const materialsByCategoryAndDepartment = {};
        let currentDepartmentNameForTable = this.dataAccess.isHierarchical() ? DEFAULT_UNASSIGNED_DEPT_NAME_ANALYSIS : DEFAULT_NON_HIERARCHICAL_DEPT_NAME_ANALYSIS;
        // Kolor będzie teraz pobierany z modelu dla aktualnego działu, jeśli jest hierarchiczny
        let currentDepartmentColorForCatView = null; // Będzie aktualizowany z departmentColors
        const isHierarchicalView = this.dataAccess.isHierarchical();
        const allTasks = await this.dataAccess.getAllAvailableTasks();
        const allMaterialsDbData = await this.dataAccess.getAllMaterialsData();
        const departmentColorsMap = this.dataAccess.getDepartmentColors(); // Pobierz mapę kolorów z modelu

        for (const rowObject of costTableRows) { // Iteruj po obiektach z modelu
            const rowType = rowObject.rowType;
            const rowId = rowObject.rowId;

            if (isHierarchicalView && rowType === 'department') {
                // LP działu będzie musiał być pobrany z DOM, lub uzupełniony w modelu
                const domRowRef = costTableBody.querySelector(`tr[data-row-id="${rowId}"]`);
                const lp = domRowRef?.cells[1]?.textContent || "";
                currentDepartmentNameForTable = `${lp} ${rowObject.text || '(Dział bez nazwy)'}`;
                currentDepartmentColorForCatView = departmentColorsMap[rowId] || this.dataAccess.getNextDefaultDepartmentColor();
            } else if (rowType === 'task') {
                const quantity = rowObject.quantity; // Ilość z modelu
                let normsM = [];
                const taskCatalogId = rowObject.taskCatalogId; // ID katalogowe z modelu

                if (rowObject.localNormsM) {
                    normsM = JSON.parse(JSON.stringify(rowObject.localNormsM)); // Głęboka kopia z modelu
                } else if (taskCatalogId) {
                    const task = allTasks.find(t => t.id === taskCatalogId);
                    if(task) normsM = JSON.parse(JSON.stringify(task.norms?.M || [])); // Głęboka kopia z katalogu
                } else {
                    // Fallback for descriptions that are directly material names
                    const desc = rowObject.description?.trim(); // Opis z modelu
                    const materialInfo = desc ? allMaterialsDbData[desc] : null;
                    if(materialInfo) normsM = [{materialId: materialInfo.id, quantity: 1, unit: materialInfo.unit}];
                }

                if (Array.isArray(normsM) && quantity > 0) {
                    for (const mat of normsM) {
                        let matName, matUnit, matCatCode, matPrice;
                        if(mat.materialId) {
                            const dbMatEntry = Object.entries(allMaterialsDbData).find(([name, data]) => data.id === mat.materialId);
                            const dbMat = dbMatEntry ? { name: dbMatEntry[0], ...dbMatEntry[1] } : null;
                            if(!dbMat) {console.warn(`Materiał o ID ${mat.materialId} nie znaleziony w getAllMaterialsData.`); continue;}
                            matName = dbMat.name;
                            matUnit = mat.unit || dbMat.unit || 'j.m.';
                            matCatCode = dbMat.category;
                            matPrice = dbMat.price;
                        } else if (mat.name?.trim()) { // Fallback for older data that might only have material name
                            matName = mat.name.trim();
                            const matInfo = allMaterialsDbData[matName];
                            if(matInfo){matUnit = mat.unit || matInfo.unit || 'j.m.'; matCatCode = matInfo.category; matPrice = matInfo.price;}
                            else {matUnit = mat.unit || 'j.m.'; matCatCode = 'IN'; matPrice = 0; console.warn(`Material ${matName} not found in allMaterialsDbData`);}
                        } else { continue; }

                        if (typeof mat.quantity === 'number' && mat.quantity > 0) {
                            const value = mat.quantity * quantity * matPrice;
                            const calculatedQuantity = mat.quantity * quantity;

                            if (!materialsByCategoryAndDepartment[matCatCode]) materialsByCategoryAndDepartment[matCatCode] = {};
                            const departmentKeyForCat = isHierarchicalView ? currentDepartmentNameForTable : DEFAULT_NON_HIERARCHICAL_DEPT_NAME_ANALYSIS;

                            if (!materialsByCategoryAndDepartment[matCatCode][departmentKeyForCat]) {
                                // Użyj koloru bieżącego działu z kontekstu hierarchicznego, jeśli dostępny
                                let colorToAssign = currentDepartmentColorForCatView;
                                if (!isHierarchicalView) { // W trybie niehierarchicznym jest stały kolor
                                    colorToAssign = departmentColorsMap[DEFAULT_NON_HIERARCHICAL_DEPT_NAME_ANALYSIS] || this.dataAccess.getNextDefaultDepartmentColor();
                                }
                                materialsByCategoryAndDepartment[matCatCode][departmentKeyForCat] = { materials: {}, color: colorToAssign };
                            }

                            if (!materialsByCategoryAndDepartment[matCatCode][departmentKeyForCat].materials[matName]) {
                                materialsByCategoryAndDepartment[matCatCode][departmentKeyForCat].materials[matName] = { quantity: 0, unit: matUnit, totalValue: 0, price: matPrice };
                            }
                            materialsByCategoryAndDepartment[matCatCode][departmentKeyForCat].materials[matName].quantity += calculatedQuantity;
                            materialsByCategoryAndDepartment[matCatCode][departmentKeyForCat].materials[matName].totalValue += value;
                            if(matUnit !== 'j.m.' && materialsByCategoryAndDepartment[matCatCode][departmentKeyForCat].materials[matName].unit === 'j.m.'){
                                materialsByCategoryAndDepartment[matCatCode][departmentKeyForCat].materials[matName].unit = matUnit;
                            }
                        }
                    }
                }
            }
        }

        if (Object.keys(materialsByCategoryAndDepartment).length === 0) { this.detailedMaterialCostsContainer.innerHTML = '<p>Brak materiałów do wyświetlenia.</p>'; return; } let html = '<div class="material-analysis-table-wrapper"><table class="material-analysis-table"><thead><tr><th>Materiał</th><th style="text-align:right;">Ilość</th><th style="text-align:center;">j.m.</th><th style="text-align:right;">Cena jedn.</th><th style="text-align:right;">Wartość Sum.</th></tr></thead><tbody>'; let grandTotalAllCategoriesValue = 0; const sortedCategoryCodes = Object.keys(materialsByCategoryAndDepartment).sort((a, b) => this.dataAccess.getMaterialCategoryFullName(a).localeCompare(this.dataAccess.getMaterialCategoryFullName(b), 'pl')); for (const categoryCode of sortedCategoryCodes) { const categoryFullName = this.dataAccess.getMaterialCategoryFullName(categoryCode); html += `<tr class="category-header-analysis"><td colspan="5">${categoryFullName} (${categoryCode})</td></tr>`; let categoryTotalValue = 0; const departmentsInCategory = materialsByCategoryAndDepartment[categoryCode]; const sortedDepartmentNamesForCatTable = Object.keys(departmentsInCategory).sort((a,b) => a.localeCompare(b,'pl')); for (const deptName of sortedDepartmentNamesForCatTable) { if (Object.keys(departmentsInCategory[deptName].materials).length > 0) { const deptColor = departmentsInCategory[deptName].color; const deptTextColor = this.dataAccess.getContrastTextColor(deptColor); const deptHeaderStyle = `background-color: ${deptColor} !important; color: ${deptTextColor} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-style:italic;`; if (isHierarchicalView && deptName !== DEFAULT_NON_HIERARCHICAL_DEPT_NAME_ANALYSIS && deptName !== DEFAULT_UNASSIGNED_DEPT_NAME_ANALYSIS) { html += `<tr class="department-header-analysis" style="${deptHeaderStyle}"><td colspan="5" style="padding-left:15px;">Dział: ${deptName}</td></tr>`; } let departmentMaterialTotalForCategory = 0; const materialsInDept = departmentsInCategory[deptName].materials; const sortedMaterialNames = Object.keys(materialsInDept).sort((a,b) => a.localeCompare(b, 'pl')); const materialRowStyle = `background-color: ${this.dataAccess.lightenHexColor(deptColor, 90)} !important; color: ${this.dataAccess.getContrastTextColor(this.dataAccess.lightenHexColor(deptColor, 90))} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;`; for (const materialName of sortedMaterialNames) { const matData = materialsInDept[materialName]; departmentMaterialTotalForCategory += matData.totalValue; const paddingLeft = (isHierarchicalView && deptName !== DEFAULT_NON_HIERARCHICAL_DEPT_NAME_ANALYSIS && deptName !== DEFAULT_UNASSIGNED_DEPT_NAME_ANALYSIS) ? '30px' : '5px'; html += `<tr style="${materialRowStyle}"><td class="mat-name-cell" style="padding-left:${paddingLeft};">${materialName}</td><td class="num-cell">${matData.quantity.toFixed(3)}</td><td class="unit-cell">${matData.unit}</td><td class="num-cell">${this.dataAccess.formatCurrency(matData.price)}</td><td class="num-cell">${this.dataAccess.formatCurrency(matData.totalValue)}</td></tr>`; } if (isHierarchicalView && deptName !== DEFAULT_NON_HIERARCHICAL_DEPT_NAME_ANALYSIS && deptName !== DEFAULT_UNASSIGNED_DEPT_NAME_ANALYSIS && departmentMaterialTotalForCategory > 0.001) { const summaryStyle = `background-color: ${this.dataAccess.lightenHexColor(deptColor, 80)} !important; color: ${this.dataAccess.getContrastTextColor(this.dataAccess.lightenHexColor(deptColor, 80))} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-weight:bold;`; html += `<tr class="department-summary-analysis" style="${summaryStyle}"><td colspan="4" class="summary-label" style="padding-left:15px;">Suma dla działu (${deptName}) w kat. ${categoryCode}:</td><td class="num-cell summary-value">${this.dataAccess.formatCurrency(departmentMaterialTotalForCategory)}</td></tr>`; } categoryTotalValue += departmentMaterialTotalForCategory; } } html += `<tr class="category-summary-analysis"><td colspan="4" class="summary-label">SUMA KATEGORII (${categoryFullName}):</td><td class="num-cell summary-value">${this.dataAccess.formatCurrency(categoryTotalValue)}</td></tr>`; grandTotalAllCategoriesValue += categoryTotalValue; } html += `</tbody><tfoot><tr><td colspan="4" class="grand-total-label">SUMA MATERIAŁÓW:</td><td class="num-cell grand-total-value">${this.dataAccess.formatCurrency(grandTotalAllCategoriesValue)}</td></tr></tfoot></table></div>`; this.detailedMaterialCostsContainer.innerHTML = html; },
    async renderDetailedMaterialCostsByDept() {
        if (!this.detailedMaterialCostsContainer) return;
        this.detailedMaterialCostsContainer.innerHTML = '';

        const costTableRows = this.dataAccess.getCostTableRows(); // Pobierz wiersze z modelu
        if (!costTableRows || costTableRows.length === 0) {
            this.detailedMaterialCostsContainer.innerHTML = '<p>Brak danych kosztorysu.</p>';
            return;
        }

        const materialsByDepartment = {};
        let currentDepartmentNameForTable = this.dataAccess.isHierarchical() ? DEFAULT_UNASSIGNED_DEPT_NAME_ANALYSIS : DEFAULT_NON_HIERARCHICAL_DEPT_NAME_ANALYSIS;
        let currentDeptRowIdForColorDeptView = null; // Do pobrania koloru z modelu
        const isHierarchicalView = this.dataAccess.isHierarchical();

        if (!isHierarchicalView) { // W trybie niehierarchicznym, inicjalizuj główny "dział"
            materialsByDepartment[currentDepartmentNameForTable] = {materials: {}, color: this.dataAccess.getDepartmentColors()[currentDepartmentNameForTable] || this.dataAccess.getNextDefaultDepartmentColor() };
        }

        const allTasks = await this.dataAccess.getAllAvailableTasks();
        const allMaterialsDbData = await this.dataAccess.getAllMaterialsData();
        const departmentColorsMap = this.dataAccess.getDepartmentColors(); // Pobierz mapę kolorów z modelu

        for (const rowObject of costTableRows) { // Iteruj po obiektach z modelu
            const rowType = rowObject.rowType;
            const rowId = rowObject.rowId;

            if (isHierarchicalView && rowType === 'department') {
                // LP działu będzie musiał być pobrany z DOM, lub uzupełniony w modelu
                const domRowRef = costTableBody.querySelector(`tr[data-row-id="${rowId}"]`);
                const lp = domRowRef?.cells[1]?.textContent || "";
                currentDepartmentNameForTable = `${lp} ${rowObject.text || '(Dział bez nazwy)'}`;
                currentDeptRowIdForColorDeptView = rowId; // Zapamiętaj ID działu
                // W tym momencie tworzymy wpis dla działu w `materialsByDepartment`, ale dopiero przy dodawaniu materiałów do niego.
                // Kolor zostanie zaciągnięty z departmentColorsMap.
            } else if (rowType === 'task') {
                const quantity = rowObject.quantity; // Ilość z modelu
                let normsM = [];
                const taskCatalogId = rowObject.taskCatalogId; // ID katalogowe z modelu

                if (rowObject.localNormsM) {
                    normsM = JSON.parse(JSON.stringify(rowObject.localNormsM)); // Głęboka kopia z modelu
                } else if (taskCatalogId) {
                    const task = allTasks.find(t => t.id === taskCatalogId);
                    if(task) normsM = JSON.parse(JSON.stringify(task.norms?.M || [])); // Głęboka kopia z katalogu
                } else {
                    const desc = rowObject.description?.trim(); // Opis z modelu
                    const materialInfo = desc ? allMaterialsDbData[desc] : null;
                    if(materialInfo) normsM = [{materialId: materialInfo.id, quantity: 1, unit: materialInfo.unit}];
                }

                if (Array.isArray(normsM) && quantity > 0) {
                    const targetDepartmentKey = isHierarchicalView ? currentDepartmentNameForTable : DEFAULT_NON_HIERARCHICAL_DEPT_NAME_ANALYSIS;

                    if (!materialsByDepartment[targetDepartmentKey]) {
                        // Inicjalizuj wpis dla działu, jeśli jeszcze nie istnieje
                        const targetDeptColor = isHierarchicalView ? (departmentColorsMap[currentDeptRowIdForColorDeptView] || this.dataAccess.getNextDefaultDepartmentColor()) : this.dataAccess.getNextDefaultDepartmentColor();
                        materialsByDepartment[targetDepartmentKey] = {materials: {}, color: targetDeptColor};
                    }

                    for (const mat of normsM) {
                        let matName, matUnit, matPrice;
                        if(mat.materialId) {
                            const dbMatEntry = Object.entries(allMaterialsDbData).find(([name, data]) => data.id === mat.materialId);
                            const dbMat = dbMatEntry ? { name: dbMatEntry[0], ...dbMatEntry[1] } : null;
                            if(!dbMat) continue;
                            matName = dbMat.name; matUnit = mat.unit || dbMat.unit || 'j.m.'; matPrice = dbMat.price;
                        } else if (mat.name?.trim()) {
                            matName = mat.name.trim();
                            const matInfo = allMaterialsDbData[matName];
                            if(matInfo){matUnit = mat.unit || matInfo.unit || 'j.m.'; matPrice = matInfo.price;}
                            else {matUnit = mat.unit || 'j.m.'; matPrice = 0;}
                        } else { continue; }

                        if (typeof mat.quantity === 'number' && mat.quantity > 0) {
                            const value = mat.quantity * quantity * matPrice;
                            const calculatedQuantity = mat.quantity * quantity;

                            if (!materialsByDepartment[targetDepartmentKey].materials[matName]) {
                                materialsByDepartment[targetDepartmentKey].materials[matName] = { quantity: 0, unit: matUnit, totalValue: 0, price: matPrice };
                            }
                            materialsByDepartment[targetDepartmentKey].materials[matName].quantity += calculatedQuantity;
                            materialsByDepartment[targetDepartmentKey].materials[matName].totalValue += value;
                            if(matUnit !== 'j.m.' && materialsByDepartment[targetDepartmentKey].materials[matName].unit === 'j.m.'){
                                materialsByDepartment[targetDepartmentKey].materials[matName].unit = matUnit;
                            }
                        }
                    }
                }
            }
        }
        if (Object.keys(materialsByDepartment).every(dept => Object.keys(materialsByDepartment[dept].materials).length === 0)) { this.detailedMaterialCostsContainer.innerHTML = '<p>Brak materiałów do wyświetlenia.</p>'; return; } let html = '<div class="material-analysis-table-wrapper"><table class="material-analysis-table"><thead><tr><th>Materiał</th><th style="text-align:right;">Ilość</th><th style="text-align:center;">j.m.</th><th style="text-align:right;">Cena jedn.</th><th style="text-align:right;">Wartość Sum.</th></tr></thead><tbody>'; let grandTotalValue = 0; const sortedDepartmentNamesForTable = Object.keys(materialsByDepartment).sort((a,b) => { if (a.startsWith("Materiały ogólne") || a.startsWith(DEFAULT_NON_HIERARCHICAL_DEPT_NAME_ANALYSIS) || a.startsWith(DEFAULT_UNASSIGNED_DEPT_NAME_ANALYSIS)) return 1; if (b.startsWith("Materiały ogólne") || b.startsWith(DEFAULT_NON_HIERARCHICAL_DEPT_NAME_ANALYSIS) || b.startsWith(DEFAULT_UNASSIGNED_DEPT_NAME_ANALYSIS)) return -1; const numA = parseFloat(a.split(' ')[0]); const numB = parseFloat(b.split(' ')[0]); if (!isNaN(numA) && !isNaN(numB)) return numA - numB; return a.localeCompare(b, 'pl'); }); for (const deptName of sortedDepartmentNamesForTable) { if (Object.keys(materialsByDepartment[deptName].materials).length > 0) { const deptColor = materialsByDepartment[deptName].color; const deptTextColor = this.dataAccess.getContrastTextColor(deptColor); const deptHeaderStyle = `background-color: ${deptColor} !important; color: ${deptTextColor} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;`; html += `<tr class="department-header-analysis" style="${deptHeaderStyle}"><td colspan="5">${deptName}</td></tr>`; let departmentTotal = 0; const materialsInDept = materialsByDepartment[deptName].materials; const sortedMaterialNames = Object.keys(materialsInDept).sort((a,b) => a.localeCompare(b, 'pl')); const materialRowStyle = `background-color: ${this.dataAccess.lightenHexColor(deptColor, 90)} !important; color: ${this.dataAccess.getContrastTextColor(this.dataAccess.lightenHexColor(deptColor, 90))} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;`; for (const materialName of sortedMaterialNames) { const matData = materialsInDept[materialName]; departmentTotal += matData.totalValue; html += `<tr style="${materialRowStyle}"><td class="mat-name-cell">${materialName}</td><td class="num-cell">${matData.quantity.toFixed(3)}</td><td class="unit-cell">${matData.unit}</td><td class="num-cell">${this.dataAccess.formatCurrency(matData.price)}</td><td class="num-cell">${this.dataAccess.formatCurrency(matData.totalValue)}</td></tr>`; } const summaryStyle = `background-color: ${this.dataAccess.lightenHexColor(deptColor, 80)} !important; color: ${this.dataAccess.getContrastTextColor(this.dataAccess.lightenHexColor(deptColor, 80))} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-weight:bold;`; html += `<tr class="department-summary-analysis" style="${summaryStyle}"><td colspan="4" class="summary-label">Suma dla ${deptName.includes('Dział') || deptName.includes('Ogólne') ? (deptName.includes('Ogólne') ? 'grupy' : 'działu') : deptName}:</td><td class="num-cell summary-value">${this.dataAccess.formatCurrency(departmentTotal)}</td></tr>`; grandTotalValue += departmentTotal; } } html += `</tbody><tfoot><tr><td colspan="4" class="grand-total-label">SUMA MATERIAŁÓW:</td><td class="num-cell grand-total-value">${this.dataAccess.formatCurrency(grandTotalValue)}</td></tr></tfoot></table></div>`; this.detailedMaterialCostsContainer.innerHTML = html; },
    async renderMaterialProfitAnalysis() {
        if (!this.materialProfitDetailsContainer) { console.warn("AnalysisModule: Kontener analizy zysku materiałowego nie znaleziony."); return; }
        this.materialProfitDetailsContainer.innerHTML = '<h4>Analiza Zysku/Straty z Zakupu Materiałów</h4>';

        const allTaskRowsInModel = this.dataAccess.getCostTableRows().filter(r => r.rowType === 'task'); // Pobierz wiersze zadań z modelu
        if (!allTaskRowsInModel || allTaskRowsInModel.length === 0) {
            this.materialProfitDetailsContainer.innerHTML += '<p>Brak danych kosztorysu.</p>';
            return;
        }

        const materialAggregatedData = {};
        const allTasks = await this.dataAccess.getAllAvailableTasks();
        const allMaterialsDbData = await this.dataAccess.getAllMaterialsData();

        for (const rowObject of allTaskRowsInModel) { // Iteruj po obiektach z modelu
            const quantity = rowObject.quantity; // Ilość z modelu
            let normsM = [];
            const taskCatalogId = rowObject.taskCatalogId; // ID katalogowe z modelu

            if (rowObject.localNormsM) {
                normsM = JSON.parse(JSON.stringify(rowObject.localNormsM)); // Głęboka kopia z modelu
            } else if (taskCatalogId) {
                const task = allTasks.find(t => t.id === taskCatalogId);
                if(task) normsM = JSON.parse(JSON.stringify(task.norms?.M || [])); // Głęboka kopia z katalogu
            } else {
                const desc = rowObject.description?.trim(); // Opis z modelu
                const materialInfo = desc ? allMaterialsDbData[desc] : null;
                if(materialInfo) normsM = [{materialId: materialInfo.id, quantity: 1, unit: materialInfo.unit}];
            }

            if (Array.isArray(normsM) && quantity > 0) {
                for (const mat of normsM) {
                    let matNameForAggregation;
                    let materialInfoFromCatalog = null;

                    if(mat.materialId) {
                        const tempMat = await dbService.getItem(MATERIALS_CATALOG_STORE_NAME, mat.materialId);
                        if(tempMat) { matNameForAggregation = tempMat.name; materialInfoFromCatalog = allMaterialsDbData[matNameForAggregation]; }
                    } else if (mat.name?.trim()) { // Fallback
                        matNameForAggregation = mat.name.trim(); materialInfoFromCatalog = allMaterialsDbData[matNameForAggregation];
                    }

                    if (!matNameForAggregation || !materialInfoFromCatalog) continue;

                    if (typeof mat.quantity === 'number' && mat.quantity > 0) {
                        if (!materialAggregatedData[matNameForAggregation]) {
                            materialAggregatedData[matNameForAggregation] = {
                                totalQuantity: 0,
                                priceY: materialInfoFromCatalog.price,
                                priceX: materialInfoFromCatalog.purchasePrice,
                                unit: mat.unit || materialInfoFromCatalog.unit || 'j.m.',
                                category: materialInfoFromCatalog.category
                            };
                        }
                        materialAggregatedData[matNameForAggregation].totalQuantity += mat.quantity * quantity;
                        if((mat.unit || materialInfoFromCatalog.unit) && (mat.unit || materialInfoFromCatalog.unit) !== 'j.m.' && materialAggregatedData[matNameForAggregation].unit === 'j.m.') {
                            materialAggregatedData[matNameForAggregation].unit = mat.unit || materialInfoFromCatalog.unit;
                        }
                    }
                }
            }
        }
        if (Object.keys(materialAggregatedData).length === 0) { this.materialProfitDetailsContainer.innerHTML += '<p>Brak materiałów do analizy zysku.</p>'; return; } let grandTotalProfit = 0; const materialsArrayForProfitAnalysis = Object.entries(materialAggregatedData).map(([name, data]) => { const unitProfit = data.priceY - data.priceX; const totalProfit = unitProfit * data.totalQuantity; grandTotalProfit += totalProfit; return { name, ...data, unitProfit, totalProfit }; }); materialsArrayForProfitAnalysis.sort((a, b) => b.totalProfit - a.totalProfit); let tableHtml = `<div class="material-analysis-table-wrapper"><table class="material-analysis-table"><thead><tr><th>Materiał</th><th style="text-align:center;">Kat.</th><th style="text-align:right;">Ilość</th><th style="text-align:center;">j.m.</th><th style="text-align:right;">Cena Rynk. (Y)</th><th style="text-align:right;">Cena Zakupu (X)</th><th style="text-align:right;">Zysk/Strata Jedn.</th><th style="text-align:right;">Zysk/Strata Sum.</th></tr></thead><tbody>`; materialsArrayForProfitAnalysis.forEach(mat => { tableHtml += `<tr><td>${mat.name}</td><td style="text-align:center;" title="${this.dataAccess.getMaterialCategoryFullName(mat.category)}">${mat.category}</td><td style="text-align:right;">${mat.totalQuantity.toFixed(3)}</td><td style="text-align:center;">${mat.unit}</td><td style="text-align:right;">${this.dataAccess.formatCurrency(mat.priceY)}</td><td style="text-align:right;">${this.dataAccess.formatCurrency(mat.priceX)}</td><td style="text-align:right;">${this.dataAccess.formatCurrency(mat.unitProfit)}</td><td style="text-align:right;">${this.dataAccess.formatCurrency(mat.totalProfit)}</td></tr>`; }); tableHtml += `</tbody><tfoot><tr><td colspan="7" style="text-align:right; font-weight:bold;">SUMA ZYSKU/STRATY Z ZAKUPU MATERIAŁÓW:</td><td style="text-align:right; font-weight:bold;">${this.dataAccess.formatCurrency(grandTotalProfit)}</td></tr></tfoot></table></div>`; this.materialProfitDetailsContainer.innerHTML += tableHtml; },
    openScheduleWindow: function() { if (this.scheduleWindow && !this.scheduleWindow.closed) { this.scheduleWindow.focus(); this.ensureGanttIsReadyAndRender(this.scheduleWindow); return; } this.scheduleWindow = window.open('', 'EazyKosztSchedule', 'width=1200,height=700,scrollbars=yes,resizable=yes'); if (!this.scheduleWindow) { if (typeof showNotification === 'function') { showNotification("Nie można otworzyć okna harmonogramu. Sprawdź, czy blokada wyskakujących okienek jest wyłączona.", 'error', 7000); } else { alert("Nie można otworzyć okna harmonogramu. Sprawdź, czy blokada wyskakujących okienek jest wyłączona."); } return; } const scheduleDoc = this.scheduleWindow.document; scheduleDoc.open(); scheduleDoc.write(`<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8"><title>EazyKoszt - Harmonogram Robót</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/frappe-gantt@0.6.1/dist/frappe-gantt.css"><link rel="stylesheet" href="print-style.css" media="all"><style>body{font-family:Arial,sans-serif;margin:0;padding:15px;background-color:#f9f9f9;font-size:12px;}h1{text-align:center;color:#2c3e50;margin-bottom:15px;font-size:1.5em;}.gantt-container{width:100%;height:calc(100vh - 120px);border:1px solid #ddd;background-color:#fff;}.print-button-schedule{position:fixed;top:10px;right:10px;padding:8px 15px;background-color:#3498db;color:white;border:none;border-radius:5px;cursor:pointer;z-index:1000;}.info-text{margin-bottom:15px;font-style:italic;color:#555;}.gantt .bar-label{font-size:10px !important;fill:#333 !important;}.gantt .grid-header .gantt-upper-timeline,.gantt .grid-header .gantt-lower-timeline{font-size:11px !important;}@media print{.print-button-schedule,.info-text{display:none !important;}body{margin:10mm !important;padding:0 !important;font-size:9pt !important;background-color:#fff !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}h1{font-size:14pt !important;}.gantt-container{height:auto !important;overflow:visible !important;border:none !important;}.gantt .bar-label{font-size:8px !important;}.gantt .grid-header{display:none !important;}.gantt .bar-wrapper{stroke-width:0.5 !important;}}</style></head><body><h1>Harmonogram Robót</h1><p class="info-text"><em>Uwaga: Wygenerowany harmonogram jest propozycją. Daty, zależności i czas trwania mogą wymagać indywidualnego dostosowania.</em></p><div class="gantt-container"><svg id="gantt"></svg></div><script src="https://cdn.jsdelivr.net/npm/frappe-gantt@0.6.1/dist/frappe-gantt.min.js"><\/script></body></html>`); scheduleDoc.close(); this.scheduleWindow.onload = () => { this.addPrintButtonToScheduleWindow(this.scheduleWindow); this.ensureGanttIsReadyAndRender(this.scheduleWindow); }; },
    addPrintButtonToScheduleWindow: function(targetWindow) { if (!targetWindow || targetWindow.closed || !targetWindow.document.body) { return; } if (targetWindow.document.getElementById('printScheduleButton')) { return; } const printButton = targetWindow.document.createElement('button'); printButton.id = 'printScheduleButton'; printButton.className = 'print-button-schedule print-hide'; printButton.textContent = 'Drukuj Harmonogram'; printButton.onclick = function() { targetWindow.print(); }; targetWindow.document.body.insertBefore(printButton, targetWindow.document.body.firstChild); },
    ensureGanttIsReadyAndRender: function(targetWindow) { if (!targetWindow || targetWindow.closed) return; let attempts = 0; const maxAttempts = 50; const interval = 100; const checkAndRender = () => { attempts++; if (targetWindow.Gantt) { console.log("Frappe Gantt gotowy, renderowanie harmonogramu."); this.generateGanttChart(targetWindow); } else if (attempts < maxAttempts) { console.log(`Oczekiwanie na Frappe Gantt... próba ${attempts}`); targetWindow.setTimeout(checkAndRender, interval); } else { console.error("Nie udało się załadować Frappe Gantt w oknie harmonogramu po maksymalnej liczbie prób."); const ganttContainer = targetWindow.document.getElementById('gantt'); if (ganttContainer) { ganttContainer.innerHTML = '<text x="10" y="20" style="font-size:14px; fill:red;">Błąd: Nie udało się załadować biblioteki harmonogramu (Frappe Gantt).</text>'; } } }; checkAndRender(); },
    generateGanttChart: async function(targetWindow) {
        if (!targetWindow || targetWindow.closed || !targetWindow.document || !targetWindow.document.body) { console.error("Okno docelowe dla harmonogramu jest nieprawidłowe lub zamknięte."); return; }
        const ganttSvgElement = targetWindow.document.getElementById('gantt');
        if (!ganttSvgElement) { console.error("Nie znaleziono elementu SVG (<svg id='gantt'>) w oknie harmonogramu."); return; }
        while (ganttSvgElement.firstChild) { ganttSvgElement.removeChild(ganttSvgElement.firstChild); }
        targetWindow.ganttInitialized = true;

        const costTableRows = this.dataAccess.getCostTableRows(); // Pobierz wiersze z modelu
        if (!costTableRows || costTableRows.length === 0) {
            ganttSvgElement.innerHTML = '<text x="10" y="20" style="font-size:14px; fill:red;">Błąd: Brak danych kosztorysu do wygenerowania harmonogramu.</text>';
            return;
        }

        const tasksForGantt = [];
        let currentDate = new Date();
        let taskIdCounter = 1;
        let currentChapterNameForGantt = this.dataAccess.isHierarchical() ? "Prace Ogólne (bez działu)" : "Kosztorys";
        let lastTaskEndDate = null;
        let taskNumberInChapter = 0;
        const allAvailableTasksFromCatalog = await this.dataAccess.getAllAvailableTasks();

        for (const rowObject of costTableRows) { // Iterujemy po obiektach z modelu
            const rowType = rowObject.rowType;
            // Aby pobrać LP, musimy się odwołać do DOM (ponieważ LP są dynamicznie nadawane w renderCostTable)
            // lub zrefaktoryzować renumberRows tak, aby zapisywał LP do modelu.
            // Na razie: pobierz LP z DOM dla tej pozycji
            const domRowRef = costTableBody.querySelector(`tr[data-row-id="${rowObject.rowId}"]`);
            let lpForGantt = domRowRef?.cells[1]?.textContent.replace(/\.$/,'') || '?';


            if (this.dataAccess.isHierarchical() && (rowType === 'department' || rowType === 'subdepartment')) {
                currentChapterNameForGantt = `${lpForGantt} ${rowObject.text || (rowType === 'department' ? 'Dział' : 'Poddział')}`;
                taskNumberInChapter = 0;
            } else if (rowType === 'task') {
                taskNumberInChapter++;
                const quantity = rowObject.quantity; // Ilość z modelu
                let normR = rowObject.localNormR; // Norma R z modelu

                const taskCatalogId = rowObject.taskCatalogId; // ID katalogowe z modelu
                if (taskCatalogId && normR === undefined) { // Jeśli norma R nie jest lokalnie nadpisana
                    const taskDef = allAvailableTasksFromCatalog.find(t => t.id === taskCatalogId);
                    if (taskDef && taskDef.norms?.R !== undefined) {
                        normR = taskDef.norms.R;
                    }
                } else if (normR === undefined) { // Jeśli nie ma normy R lokalnie ani z katalogu, spróbuj z opisu
                    const desc = rowObject.description?.trim();
                    const taskDef = desc ? allAvailableTasksFromCatalog.find(t => t.description === desc) : null;
                    if (taskDef && taskDef.norms?.R !== undefined) {
                        normR = taskDef.norms.R;
                    }
                }

                if (isNaN(normR) || normR === null) normR = 0;

                if (normR > 0 && quantity > 0) {
                    const totalRg = quantity * normR;
                    const estimatedDays = Math.max(1, Math.ceil(totalRg / 8)); // 8 godzin pracy dziennie

                    const description = rowObject.localDesc || rowObject.description || 'Zadanie bez opisu'; // Opis z modelu
                    const taskDisplayName = this.dataAccess.isHierarchical() ? `[${lpForGantt}] ${description} (Dział: ${currentChapterNameForGantt.split(' ')[0]})` : `[${lpForGantt}] ${description}`;

                    let startDate;
                    if (lastTaskEndDate) {
                        startDate = new Date(lastTaskEndDate);
                        startDate.setDate(startDate.getDate() + 1); // Start next day
                    } else {
                        startDate = new Date(currentDate);
                    }

                    // Skip weekends
                    let tempStartDate = new Date(startDate);
                    while (tempStartDate.getDay() === 0 || tempStartDate.getDay() === 6) { // 0 = Sunday, 6 = Saturday
                        tempStartDate.setDate(tempStartDate.getDate() + 1);
                    }
                    startDate = tempStartDate;

                    const endDate = new Date(startDate);
                    let workDaysToAdd = estimatedDays -1;
                    while (workDaysToAdd > 0) {
                        endDate.setDate(endDate.getDate() + 1);
                        if (endDate.getDay() !== 0 && endDate.getDay() !== 6) { // Not Sunday or Saturday
                            workDaysToAdd--;
                        }
                    }
                    lastTaskEndDate = new Date(endDate);
                    currentDate = new Date(lastTaskEndDate);

                    tasksForGantt.push({
                        id: `task_${taskIdCounter++}`,
                        name: taskDisplayName,
                        start: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`,
                        end: `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`,
                        progress: 0, // Domyślnie 0, brak obsługi postępu w tej aplikacji
                    });
                }
            }
        }
        if (tasksForGantt.length === 0) { ganttSvgElement.innerHTML = '<text x="10" y="30" style="font-size:14px; fill:#555;">Brak zadań z normą robocizny > 0 do wyświetlenia w harmonogramie.</text>'; return; } try { new targetWindow.Gantt(ganttSvgElement, tasksForGantt, { header_height: 50, column_width: 30, step: 24, view_modes: ['Day', 'Week', 'Month'], bar_height: 20, bar_corner_radius: 3, arrow_curve: 5, padding: 18, view_mode: 'Week', date_format: 'YYYY-MM-DD', language: 'pl', custom_popup_html: task => `<div class="details-container" style="padding:10px; font-size:12px; background:#fff; border:1px solid #ccc; border-radius:4px; box-shadow:0 2px 5px rgba(0,0,0,0.1);"><h5 style="margin:0 0 8px 0; color:#333; font-size:13px;">${task.name}</h5><p style="margin:3px 0;color:#555;">Start: ${task.start}</p><p style="margin:3px 0;color:#555;">Koniec: ${task.end}</p></div>` }); } catch (e) { ganttSvgElement.innerHTML = `<text x="10" y="30" style="font-size:14px; fill:red;">Błąd generowania wykresu Gantta: ${e.message}. Sprawdź konsolę okna harmonogramu.</text>`; console.error("Błąd generowania wykresu Gantta w oknie harmonogramu:", e); targetWindow.console.error("Błąd generowania wykresu Gantta:", e); } },
    getAnalysisDeptChartsContent: async function() { if (!this.chartDepartmentsContainer) return "<div class='print-page'><h1>Analiza: Wykresy Działów</h1><hr><p>Moduł analizy lub wykresy działów niedostępne.</p></div>"; let tempContainer; if (!Object.values(this.departmentChartInstances).some(inst => inst && inst.canvas && inst.canvas.offsetParent !== null)) { console.log("AnalysisModule (print): Wykresy działów nie były renderowane na aktywnej zakładce. Próba renderowania."); tempContainer = document.createElement('div'); tempContainer.style.cssText = "position:absolute; left: -9999px; top: -9999px; width:1200px; display:flex; gap:20px;"; document.body.appendChild(tempContainer); const chartConfigs = [ { key: 'total', title: 'Całkowity Koszt wg Działów (Netto)'}, { key: 'labor', title: 'Koszt Robocizny wg Działów (Netto)'}, { key: 'material', title: 'Koszt Materiałów wg Działów (Netto)'} ]; chartConfigs.forEach(config => { const wrapper = document.createElement('div'); wrapper.className = 'department-chart-wrapper'; const titleEl = document.createElement('h4'); titleEl.textContent = config.title; wrapper.appendChild(titleEl); const canvas = document.createElement('canvas'); wrapper.appendChild(canvas); tempContainer.appendChild(wrapper); }); await this.renderDepartmentCharts(); await new Promise(resolve => setTimeout(resolve, 200)); } let chartsHtml = "<div class='print-page'><h1>Analiza: Podział Kosztów wg Działów</h1><hr>"; let chartsFound = false; const chartConfigsToPrint = [ { key: 'total', title: 'Całkowity Koszt wg Działów (Netto)'}, { key: 'labor', title: 'Koszt Robocizny wg Działów (Netto)'}, { key: 'material', title: 'Koszt Materiałów wg Działów (Netto)'} ]; for (const config of chartConfigsToPrint) { const chartInstance = this.departmentChartInstances[config.key]; if (chartInstance && chartInstance.canvas) { try { const image = chartInstance.toBase64Image('image/png', 1.0); if (image && image.length > 100 && image !== 'data:,') { chartsHtml += `<div class="analysis-print-section"><h3>${config.title}</h3><img src="${image}" alt="${config.title}" style="max-width:90%;height:auto;display:block;margin:10px auto;border:1px solid #ccc;"></div>`; chartsFound = true; } else { chartsHtml += `<p style="color:red;">Błąd: Wykres "${config.title}" nie mógł zostać poprawnie wygenerowany jako obraz (pusty lub niepoprawny base64).</p>`; console.error(`Błąd generowania obrazu dla wykresu ${config.key}: pusty lub niepoprawny base64. Dane obrazu: ${image ? image.substring(0,50) + '...' : 'brak'}`); } } catch (e) { chartsHtml += `<p style="color:red;">Błąd konwersji wykresu ${config.key} na obraz: ${e.message}</p>`; console.error(`Błąd konwersji wykresu ${config.key}:`, e); } } else { console.warn(`AnalysisModule (print): Instancja wykresu dla klucza ${config.key} lub jej canvas nie istnieje.`); } } if (tempContainer) document.body.removeChild(tempContainer); if (!chartsFound) chartsHtml += "<p>Brak danych do wygenerowania wykresów działów.</p>"; chartsHtml += "</div>"; return chartsHtml; },
    getAnalysisWorkerDistChartContent: async function() { let chartHtml = "<div class='print-page'><h1>Analiza: Udział Kosztów Robocizny wg Typu Pracownika</h1><hr>"; if (!this.laborAnalysisContainer && !this.workerCategoryDistributionChartInstance?.canvas) { return chartHtml + "<p>Moduł analizy robocizny niedostępny lub wykres nie został jeszcze wyrenderowany.</p></div>"; } let tempCanvasWrapper; let mustRemoveTempCanvasWrapper = false; let canvasToUse; if (!this.workerCategoryDistributionChartInstance || !this.workerCategoryDistributionChartInstance.canvas || this.workerCategoryDistributionChartInstance.canvas.offsetParent === null) { console.log("AnalysisModule (print): Wykres udziału robocizny nie był renderowany na aktywnej zakładce. Próba renderowania na tymczasowym canvasie."); tempCanvasWrapper = document.createElement('div'); tempCanvasWrapper.className = 'labor-analysis-chart-wrapper big-chart-wrapper'; tempCanvasWrapper.style.cssText = "position:absolute; left: -9999px; top: -9999px; width:600px; height:450px;"; const tempTitleEl = document.createElement('h4'); tempTitleEl.textContent = "Udział Kosztów Robocizny..."; tempCanvasWrapper.appendChild(tempTitleEl); canvasToUse = document.createElement('canvas'); tempCanvasWrapper.appendChild(canvasToUse); document.body.appendChild(tempCanvasWrapper); mustRemoveTempCanvasWrapper = true; await this.renderWorkerCategoryDistributionChart(canvasToUse); await new Promise(resolve => setTimeout(resolve, 200)); } else { canvasToUse = this.workerCategoryDistributionChartInstance.canvas; } const chartInstance = Chart.getChart(canvasToUse); if (chartInstance && chartInstance.canvas) { const chartTitle = chartInstance.data?.datasets[0]?.label || "Udział Robocizny wg Typu Pracownika"; try { const image = chartInstance.toBase64Image('image/png', 1.0); if (image && image.length > 100 && image !== 'data:,') { chartHtml += `<div class="analysis-print-section"><h3>${chartTitle}</h3><img src="${image}" alt="${chartTitle}" style="max-width:80%; height:auto; display:block; margin:10px auto; border:1px solid #ccc;"></div>`; } else { chartHtml += `<p style="color:red;">Błąd: Wykres udziału robocizny nie mógł zostać poprawnie wygenerowany jako obraz (pusty lub niepoprawny base64).</p>`; console.error(`Błąd generowania obrazu dla wykresu udziału robocizny: pusty lub niepoprawny base64. Dane obrazu: ${image ? image.substring(0,50) + '...' : 'brak'}`); } } catch (e) { chartHtml += `<p style="color:red;">Błąd konwersji wykresu udziału robocizny na obraz: ${e.message}</p>`; console.error("Błąd konwersji wykresu udziału robocizny:", e); } } else { chartHtml += "<p>Wykres udziału robocizny nie jest dostępny do wydruku lub nie udało się go wyrenderować.</p>"; console.warn("AnalysisModule (print): Nie udało się uzyskać instancji wykresu udziału robocizny."); } if (mustRemoveTempCanvasWrapper && tempCanvasWrapper) { document.body.removeChild(tempCanvasWrapper); } chartHtml += "</div>"; return chartHtml; },
    getAnalysisLaborTableContent: async function() { const title = "Analiza: Robocizna wg Działów i Typu Pracownika"; if (!this.laborAnalysisContainer) return `<div class='print-page'><h1>${title}</h1><hr><p>Moduł analizy robocizny niedostępny.</p></div>`; let tableContainer = this.laborAnalysisContainer.querySelector('.labor-analysis-table-wrapper'); if (!tableContainer) { tableContainer = document.createElement('div'); await this.renderLaborCostsByDepartmentAndWorkerTable(tableContainer); } else if (!tableContainer.querySelector('table')) { await this.renderLaborCostsByDepartmentAndWorkerTable(tableContainer); } const tableHtml = tableContainer.innerHTML; return `<div class='print-page'><h1>${title}</h1><hr>${tableHtml}</div>`; },
    getAnalysisMaterialByDeptContent: async function() { const title = "Analiza: Materiały wg Działów"; if (!this.detailedMaterialCostsContainer) return `<div class='print-page'><h1>${title}</h1><hr><p>Moduł analizy materiałów niedostępny.</p></div>`; if(this.materialViewSelect) this.materialViewSelect.value = 'by_department'; await this.renderDetailedMaterialCostsByDept(); const tableHtml = this.detailedMaterialCostsContainer.innerHTML; return `<div class='print-page'><h1>${title}</h1><hr>${tableHtml}</div>`; },
    getAnalysisMaterialByCatContent: async function() { const title = "Analiza: Materiały wg Kategorii"; if (!this.detailedMaterialCostsContainer) return `<div class='print-page'><h1>${title}</h1><hr><p>Moduł analizy materiałów niedostępny.</p></div>`; if(this.materialViewSelect) this.materialViewSelect.value = 'by_category'; await this.renderDetailedMaterialCostsByCat(); const tableHtml = this.detailedMaterialCostsContainer.innerHTML; return `<div class='print-page'><h1>${title}</h1><hr>${tableHtml}</div>`; },
    getAnalysisMaterialProfitContent: async function() { const title = "Analiza Zysku/Straty z Zakupu Materiałów"; if (!this.materialProfitDetailsContainer) return `<div class='print-page'><h1>${title}</h1><hr><p>Moduł analizy zysku materiałowego niedostępny.</p></div>`; if (!this.materialProfitDetailsContainer.querySelector('table')) { await this.renderMaterialProfitAnalysis(); } const tableContent = this.materialProfitDetailsContainer.querySelector('.material-analysis-table-wrapper')?.innerHTML || "<p>Brak danych do raportu zysku z materiałów.</p>"; return `<div class='print-page'><h1>${title}</h1><hr>${tableContent}</div>`; }
};

console.log("Moduł Analizy EazyKoszt 0.5.0 zdefiniowany.");