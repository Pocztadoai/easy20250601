// Plik: style-configurator.js
// Opis: Moduł konfiguratora stylów dla EazyKoszt.
// Wersja aplikacji, z którą ten plik jest powiązany: EazyKoszt 0.25.06.05.1

const StyleConfiguratorModule = {
    STORAGE_KEY_STYLES: 'eazykoszt_userStyles_v0_3_0',
    configuratorTabContent: null,
    applyBtn: null,
    resetBtn: null,
    styleInputs: [],
    defaultStyles: {
        '--primary-color': '#2c3e50', '--secondary-color': '#3498db', '--accent-color': '#e74c3c',
        '--light-gray': '#f5f7fa', '--medium-gray': '#e1e5eb', '--dark-gray': '#7f8c8d',
        '--text-color': '#333333', '--table-header-bg': '#2c3e50', '--table-header-text-color': '#ffffff',
        '--table-row-hover-bg': '#f1f9ff',
        '--task-row-default-bg': 'transparent',
        'body_fontSize_px': '13',
        'print_print-style-font-family': 'Arial, sans-serif', 'print_print-style-font-size': '10',
        'print_print-style-line-height': '1.3', 'print_print-style-text-color': '#000000',
        'print_print-style-h1-color': '#000000', 'print_print-style-h1-font-size': '16',
        'print_print-style-h-border-color': '#cccccc', 'print_print-style-table-header-bg': '#e8e8e8',
        'print_print-style-table-header-text-color': '#000000', 'print_print-style-table-border-color': '#bbbbbb',
        'print_print-style-table-font-size': '9',
    },

    init: function() {
        this.configuratorTabContent = document.getElementById('konfigurator-stylu-content');
        if (!this.configuratorTabContent) {
            console.warn("[StyleConfiguratorModule] Element 'konfigurator-stylu-content' nie znaleziony.");
            return;
        }
        const configuratorSection = document.getElementById('style-configurator-section');
        if (!configuratorSection) {
            console.warn("[StyleConfiguratorModule] Sekcja 'style-configurator-section' nie znaleziona.");
            return;
        }
        this.applyBtn = document.getElementById('style-config-apply-btn');
        this.resetBtn = document.getElementById('style-config-reset-btn');
        this.styleInputs = Array.from(configuratorSection.querySelectorAll('input[type="color"], input[type="number"], select'));

        if (this.applyBtn) this.applyBtn.addEventListener('click', () => this.saveStyles());
        if (this.resetBtn) this.resetBtn.addEventListener('click', () => this.resetStyles());

        this.loadStyles();
        console.log("[StyleConfiguratorModule] Moduł został zainicjalizowany.");
    },

    generateKeyForInput: function(input) {
        if (!input) return null;
        if (input.dataset.cssVar) {
            return input.dataset.cssVar;
        }
        if (input.dataset.cssTarget && input.dataset.cssProperty) {
            return `${input.dataset.cssTarget}_${input.dataset.cssProperty}_${input.dataset.cssUnit || 'none'}`;
        }
        if (input.id && (input.dataset.printSelector || input.dataset.printTarget)) {
            return `print_${input.id}`;
        }
        return null;
    },

    applyStylesToDOM: function(stylesToApply) {
        Object.keys(stylesToApply).forEach(key => {
            if (key.startsWith('--')) {
                document.documentElement.style.setProperty(key, stylesToApply[key]);
                if (key === '--task-row-default-bg' && typeof appState !== 'undefined') {
                    appState.setState('defaultTaskRowBackgroundColor', stylesToApply[key]);
                }
            }
        });

        if (this.styleInputs && this.styleInputs.length > 0) {
            this.styleInputs.forEach(input => {
                if (input.dataset.cssTarget && input.dataset.cssProperty) {
                    const elements = document.querySelectorAll(input.dataset.cssTarget);
                    const unit = input.dataset.cssUnit || '';
                    const generatedKey = this.generateKeyForInput(input);
                    const value = stylesToApply[generatedKey];
                    if (value !== undefined && value !== null && value !== "") {
                        elements.forEach(el => {
                            if (input.dataset.cssProperty === 'fontSize' || input.dataset.cssProperty === 'font-size') {
                                el.style.setProperty('font-size', value + unit, 'important');
                            } else {
                                el.style[input.dataset.cssProperty] = value + unit;
                            }
                        });
                    }
                }
            });
        }
    },

    loadStyles: function() {
        const savedStyles = JSON.parse(localStorage.getItem(this.STORAGE_KEY_STYLES)) || {};
        const activeStyles = { ...this.defaultStyles, ...savedStyles };

        if (this.styleInputs && this.styleInputs.length > 0) {
            this.styleInputs.forEach(input => {
                const key = this.generateKeyForInput(input);
                if (key && activeStyles[key] !== undefined) {
                    input.value = activeStyles[key];
                } else if (key && this.defaultStyles[key] !== undefined) {
                    input.value = this.defaultStyles[key];
                }
            });
        }
        this.applyStylesToDOM(activeStyles);
    },

    saveStyles: function() {
        const currentStyles = {};
        if (this.styleInputs && this.styleInputs.length > 0) {
            this.styleInputs.forEach(input => {
                const key = this.generateKeyForInput(input);
                if (key) {
                    currentStyles[key] = input.value;
                }
            });
        }
        localStorage.setItem(this.STORAGE_KEY_STYLES, JSON.stringify(currentStyles));
        this.applyStylesToDOM(currentStyles);

        if (typeof showNotification === 'function') {
            showNotification("Style wyglądu zostały zapisane!", 'success');
        } else {
            alert("Style wyglądu zostały zapisane!");
        }
    },

    resetStyles: function() {
        const performReset = () => {
            localStorage.removeItem(this.STORAGE_KEY_STYLES);
            if (this.styleInputs && this.styleInputs.length > 0) {
                this.styleInputs.forEach(input => {
                     const key = this.generateKeyForInput(input);
                     if (key && this.defaultStyles[key] !== undefined) {
                         input.value = this.defaultStyles[key];
                     }
                });
            }
            this.applyStylesToDOM(this.defaultStyles);
            if (typeof showNotification === 'function') {
                showNotification("Style domyślne przywrócone.", 'info');
            } else {
                alert("Style domyślne przywrócone.");
            }
        };

        if (typeof showConfirmNotification === 'function') {
            showConfirmNotification("Przywrócić domyślne ustawienia wyglądu?", performReset);
        } else {
            if (confirm("Przywrócić domyślne ustawienia wyglądu?")) {
                performReset();
            }
        }
    },

    getUserPrintStylesCss: function() {
        const savedStyles = JSON.parse(localStorage.getItem(this.STORAGE_KEY_STYLES)) || {};
        const activeStyles = { ...this.defaultStyles, ...savedStyles };
        let printCss = "\n/* --- Style użytkownika (wydruk) --- */\n";
        let addedRules = false;

        if (!this.styleInputs || this.styleInputs.length === 0) {
            console.warn("[StyleConfiguratorModule] styleInputs nie jest zainicjowane podczas wywołania getUserPrintStylesCss.");
            return "";
        }
        
        const taskRowBg = activeStyles['--task-row-default-bg'];
        if (taskRowBg && taskRowBg !== 'transparent') {
            const taskRowTextColor = typeof getContrastTextColor === 'function' ? getContrastTextColor(taskRowBg) : '#000';
            printCss += `#cost-table-body tr[data-row-type="task"] > td { background-color: ${taskRowBg} !important; color: ${taskRowTextColor} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }\n`;
            addedRules = true;
        }

        this.styleInputs.forEach(input => {
            const key = this.generateKeyForInput(input);
            if (!key || !key.startsWith('print_')) return;
            
            const value = activeStyles[key];
            const isDifferentOrDefaultMissing = this.defaultStyles[key] === undefined || (value && value !== this.defaultStyles[key]);
            const isSignificantColor = input.type === 'color' && value && value.toLowerCase() !== '#000000' && value.toLowerCase() !== '#ffffff' && value.toLowerCase() !== 'transparent';
            
            if (value && (isDifferentOrDefaultMissing || isSignificantColor)) {
                let selector, property, unit = '';
                if (input.dataset.printSelector && input.dataset.printProperty) {
                    selector = input.dataset.printSelector;
                    property = input.dataset.printProperty;
                    unit = input.dataset.printUnit || '';
                } else if (input.dataset.printTarget && input.dataset.printProperty) {
                    selector = input.dataset.printTarget;
                    property = input.dataset.printProperty;
                    unit = input.dataset.printUnit || '';
                }
                
                if (selector && property) {
                    if (key.includes('dept-row-bg') || key.includes('subdept-row-bg')) return;

                    if (property.toLowerCase().includes('background-color')) {
                        printCss += `${selector} { ${property}: ${value}${unit} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }\n`;
                    } else {
                        printCss += `${selector} { ${property}: ${value}${unit}; }\n`;
                    }
                    addedRules = true;
                }
            }
        });
        return addedRules ? printCss : "";
    },

    applyUserStylesFromObject: function(stylesToApply) {
        if (!this.configuratorTabContent) {
            // Inicjalizacja "w locie", jeśli moduł nie był w pełni załadowany
            this.configuratorTabContent = document.getElementById('konfigurator-stylu-content');
            const configuratorSection = document.getElementById('style-configurator-section');
            if (configuratorSection) {
                this.styleInputs = Array.from(configuratorSection.querySelectorAll('input[type="color"], input[type="number"], select'));
            }
        }
        const mergedStyles = { ...this.defaultStyles, ...stylesToApply };
        this.applyStylesToDOM(mergedStyles);

        if (this.styleInputs && this.styleInputs.length > 0) {
            this.styleInputs.forEach(input => {
                const key = this.generateKeyForInput(input);
                if (key && mergedStyles[key] !== undefined) {
                    input.value = mergedStyles[key];
                }
            });
        }
        console.log("[StyleConfiguratorModule] Style użytkownika (z obiektu) zostały zastosowane.");
    }
};

if (typeof window.StyleConfiguratorModule === 'undefined') {
    window.StyleConfiguratorModule = StyleConfiguratorModule;
}

console.log("Plik style-configurator.js (EazyKoszt 0.25.06.05.1) załadowany.");
