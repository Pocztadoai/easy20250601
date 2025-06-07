/ Plik: analysis.js
// Opis: Moduł odpowiedzialny za generowanie analizy kosztorysu.
// Wersja aplikacji: EazyKoszt 0.25.06.05.1
// ZMIANA v0.6.1: Całkowita przebudowa interfejsu analizy na podstawie nowego projektu.
//                Wprowadzono 4 główne wykresy w układzie siatki i 3 pola podsumowania.

console.log("[AnalysisModule] Moduł Analizy (v0.6.1) jest ładowany...");

const DEFAULT_NON_HIERARCHICAL_DEPT_NAME_ANALYSIS = "Kosztorys Ogółem";
const DEFAULT_UNASSIGNED_DEPT_NAME_ANALYSIS = "Dział (Pozycje nieprzypisane)";

const AnalysisModule = {
    // --- Właściwości modułu ---
    chartInstances: {}, // JEDEN obiekt do śledzenia WSZYSTKICH instancji wykresów
    isRefreshing: false, // Flaga zapobiegająca jednoczesnemu odświeżaniu

    // Dostęp do elementów DOM
    summaryLaborEl: null,
    summaryMaterialsEl: null,
    summaryProfitEl: null,

    // --- Konfiguracja ---
    CHART_COLORS: [
        '#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6', '#34495e',
        '#1abc9c', '#e67e22', '#ecf0f1', '#7f8c8d', '#2980b9', '#27ae60'
    ],
    PROFIT_CHART_TOP_N: 10, // Ile materiałów pokazać na wykresie zysku

    // --- Warstwa dostępu do danych (Data Access Layer) ---
    dataAccess: {
        getCostTableBody: () => (typeof costTableBody !== 'undefined' ? costTableBody : null),
        isHierarchical: () => (typeof appState !== 'undefined' ? appState.getState('isHierarchicalMode') : false),
        formatCurrency: (val, places = 2) => (typeof formatCurrency === 'function' ? formatCurrency(val, places) : String(val)),
        evaluateMathExpression: (expr) => (typeof evaluateMathExpression === 'function' ? evaluateMathExpression(expr) : 0),
        getLaborRate: (categoryCode) => (typeof getLaborRateForWorkerCategory === 'function' ? getLaborRateForWorkerCategory(categoryCode) : 0),
        getMaterialData: async (id) => (typeof dbService !== 'undefined' ? await dbService.getItem(MATERIALS_CATALOG_STORE_NAME, id) : null),
        getTaskData: async (id) => (typeof dbService !== 'undefined' ? await dbService.getItem(TASKS_CATALOG_STORE_NAME, id) : null),
        getMaterialCategoryName: (code) => (typeof getMaterialCategoryFullName === 'function' ? getMaterialCategoryFullName(code) : code)
    },

    init: function() {
        this.summaryLaborEl = document.getElementById('summary-labor');
        this.summaryMaterialsEl = document.getElementById('summary-materials');
        this.summaryProfitEl = document.getElementById('summary-profit');

        if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
            try { Chart.register(ChartDataLabels); }
            catch (e) { console.warn("[AnalysisModule] Nie udało się zarejestrować ChartDataLabels.", e); }
        } else { console.warn('[AnalysisModule] Chart.js lub ChartDataLabels nie jest załadowany.'); }
        
        console.log("[AnalysisModule] Moduł Analizy (v0.6.1) został zainicjalizowany.");
    },

    destroyAllCharts: function() {
        Object.keys(this.chartInstances).forEach(key => {
            if (this.chartInstances[key]) {
                this.chartInstances[key].destroy();
            }
        });
        this.chartInstances = {};
    },

    refreshAnalysis: async function() {
        if (this.isRefreshing) {
            console.warn("[AnalysisModule] Próba odświeżenia analizy podczas trwającego już odświeżania. Anulowano.");
            return;
        }
        this.isRefreshing = true;
        console.log("[AnalysisModule] Rozpoczynanie odświeżania analizy (v0.6.1)...");

        this.destroyAllCharts();

        try {
            const aggregatedData = await this._aggregateAllCosts();
            this.renderDepartmentCostChart(aggregatedData.byDepartment);
            this.renderCostTypesChart(aggregatedData.totals);
            this.renderMaterialCategoryChart(aggregatedData.byMaterialCategory);
            this.renderMaterialProfitChart(aggregatedData.byMaterialProfit);
            this.renderSummaryBoxes(aggregatedData.totals);
        } catch (error) {
            console.error("[AnalysisModule] Wystąpił błąd podczas odświeżania analizy:", error);
        } finally {
            this.isRefreshing = false;
            console.log("[AnalysisModule] Zakończono odświeżanie analizy.");
        }
    },
    
    _renderChart: function(canvasId, chartType, data, options) {
        const canvasElement = document.getElementById(canvasId);
        if (!canvasElement) {
            console.error(`[AnalysisModule] Canvas element #${canvasId} not found.`);
            return;
        }

        const ctx = canvasElement.getContext('2d');
        this.chartInstances[canvasId] = new Chart(ctx, {
            type: chartType,
            data: data,
            options: options
        });
    },

    _aggregateAllCosts: async function() {
        const costTableBody = this.dataAccess.getCostTableBody();
        if (!costTableBody) return { byDepartment: {}, totals: {}, byMaterialCategory: {}, byMaterialProfit: [] };

        const byDepartment = {};
        const byMaterialCategory = {};
        const byMaterialProfit = {};
        const totals = { labor: 0, material: 0, total: 0, profit: 0 };
        
        let currentDepartmentName = this.dataAccess.isHierarchical() ? DEFAULT_UNASSIGNED_DEPT_NAME_ANALYSIS : DEFAULT_NON_HIERARCHICAL_DEPT_NAME_ANALYSIS;

        const rows = Array.from(costTableBody.querySelectorAll('tr'));
        for (const row of rows) {
            const rowType = row.dataset.rowType;

            if (this.dataAccess.isHierarchical() && rowType === 'department') {
                currentDepartmentName = row.querySelector('.special-row-input')?.value.trim() || `Dział ${row.cells[1]?.textContent || '?'}`;
            } else if (rowType === 'task') {
                const quantity = this.dataAccess.evaluateMathExpression(row.querySelector('.quantity-input')?.value);
                if (quantity <= 0) continue;

                const taskCatalogId = row.dataset.taskCatalogId ? parseInt(row.dataset.taskCatalogId) : null;
                const baseTask = taskCatalogId ? await this.dataAccess.getTaskData(taskCatalogId) : null;

                const normR = row.dataset.localNormR !== undefined ? parseFloat(row.dataset.localNormR) : (baseTask?.norms?.R ?? 0);
                const workerCat = row.dataset.localWorkerCategory || baseTask?.workerCategory || 'ogolnobudowlany';
                const laborRate = this.dataAccess.getLaborRate(workerCat);
                const taskLaborCost = normR * laborRate * quantity;

                let taskMaterialCost = 0;
                let taskPurchaseCost = 0;
                
                const normsM = row.dataset.localNormsM ? JSON.parse(row.dataset.localNormsM) : (baseTask?.norms?.M || []);

                for (const matNorm of normsM) {
                    const materialData = await this.dataAccess.getMaterialData(matNorm.materialId);
                    if (materialData) {
                        const matTotalQty = matNorm.quantity * quantity;
                        const priceY = materialData.priceY || 0;
                        const priceX = materialData.priceX ?? priceY;

                        taskMaterialCost += matTotalQty * priceY;
                        taskPurchaseCost += matTotalQty * priceX;

                        const categoryName = this.dataAccess.getMaterialCategoryName(materialData.categoryCode);
                        byMaterialCategory[categoryName] = (byMaterialCategory[categoryName] || 0) + (matTotalQty * priceY);
                        
                        byMaterialProfit[materialData.name] = (byMaterialProfit[materialData.name] || 0) + (matTotalQty * (priceY - priceX));
                    }
                }
                
                const taskTotalCost = taskLaborCost + taskMaterialCost;
                
                byDepartment[currentDepartmentName] = (byDepartment[currentDepartmentName] || 0) + taskTotalCost;
                totals.labor += taskLaborCost;
                totals.material += taskMaterialCost;
                totals.total += taskTotalCost;
                totals.profit += (taskMaterialCost - taskPurchaseCost);
            }
        }
        
        const sortedProfit = Object.entries(byMaterialProfit).sort(([,a],[,b]) => b - a).slice(0, this.PROFIT_CHART_TOP_N);

        return { byDepartment, totals, byMaterialCategory, byMaterialProfit: sortedProfit };
    },

    renderDepartmentCostChart: function(data) {
        const labels = Object.keys(data);
        const values = Object.values(data);

        this._renderChart('chart-departments', 'pie', {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: this.CHART_COLORS,
            }]
        }, {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' },
                title: { display: false },
                datalabels: {
                    formatter: (value, ctx) => {
                        let sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                        let percentage = (value * 100 / sum).toFixed(1) + "%";
                        return percentage;
                    },
                    color: '#fff',
                }
            }
        });
    },

    renderCostTypesChart: function(data) {
        this._renderChart('chart-cost-types', 'doughnut', {
            labels: ['Robocizna', 'Materiały'],
            datasets: [{
                data: [data.labor, data.material],
                backgroundColor: [this.CHART_COLORS[0], this.CHART_COLORS[1]],
            }]
        }, {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' },
                title: { display: false },
                datalabels: {
                    formatter: (value, ctx) => {
                        let sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                        let percentage = (value * 100 / sum).toFixed(1) + "%";
                        return `${this.dataAccess.formatCurrency(value)} zł\n(${percentage})`;
                    },
                    color: '#fff',
                    font: { weight: 'bold' }
                }
            }
        });
    },

    renderMaterialCategoryChart: function(data) {
        const labels = Object.keys(data);
        const values = Object.values(data);

        this._renderChart('chart-materials', 'bar', {
            labels: labels,
            datasets: [{
                label: 'Wartość materiałów',
                data: values,
                backgroundColor: this.CHART_COLORS[1],
            }]
        }, {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        });
    },

    renderMaterialProfitChart: function(data) {
        const labels = data.map(item => item[0]);
        const values = data.map(item => item[1]);

        this._renderChart('chart-profit', 'bar', {
            labels: labels,
            datasets: [{
                label: 'Zysk z materiałów',
                data: values,
                backgroundColor: this.CHART_COLORS[4],
            }]
        }, {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        });
    },

    renderSummaryBoxes: function(data) {
        if (this.summaryLaborEl) this.summaryLaborEl.textContent = `${this.dataAccess.formatCurrency(data.labor)} zł`;
        if (this.summaryMaterialsEl) this.summaryMaterialsEl.textContent = `${this.dataAccess.formatCurrency(data.material)} zł`;
        if (this.summaryProfitEl) this.summaryProfitEl.textContent = `${this.dataAccess.formatCurrency(data.profit)} zł`;
    }
};

console.log("Moduł Analizy (v0.6.1) EazyKoszt zdefiniowany.");
