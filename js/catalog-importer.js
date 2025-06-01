// ==========================================================================
// Plik: js/catalog-importer.js
// Wersja: 0.6.1A (EazyKoszt)
// Opis: Moduł odpowiedzialny za import i aktualizację predefiniowanych
//       katalogów zadań (pozycji kosztorysowych) i materiałów do bazy 
//       danych IndexedDB. Działa przy pierwszym uruchomieniu lub aktualizacji wersji katalogów.
// Wymaga: js/database-schema.js, js/database-service.js (załadowane wcześniej)
// ==========================================================================

// ==========================================================================
// SEKCJA 1: DEFINICJA KLASY CatalogImporter
// ==========================================================================
class CatalogImporter {
    /**
     * Konstruktor importera katalogów.
     * @param {DatabaseService} dbServiceInstance Instancja serwisu bazy danych.
     */
    constructor(dbServiceInstance) {
        if (!dbServiceInstance || typeof dbServiceInstance.openDB !== 'function') {
            const errorMsg = "CatalogImporter: Wymagana jest poprawna instancja DatabaseService!";
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
        this.dbService = dbServiceInstance;
        console.log("CatalogImporter (Wersja 0.6.1A) zainicjalizowany.");
    }

    // ==========================================================================
    // SEKCJA 2: GŁÓWNA METODA SPRAWDZAJĄCA I IMPORTUJĄCA DANE
    // Opis: Metoda checkAndImportInitialData() sprawdza, czy konieczny jest import
    //       lub aktualizacja predefiniowanych danych katalogowych na podstawie
    //       zapisanej wersji katalogu i flagi importu.
    // ==========================================================================
    async checkAndImportInitialData() {
        console.log("CatalogImporter.checkAndImportInitialData: Rozpoczynam sprawdzanie potrzeby importu/aktualizacji danych katalogowych...");
        const importErrors = []; 

        try {
            await this.dbService.openDB(); // Upewnij się, że baza jest otwarta

            const catalogVersionRecord = await this.dbService.getItem(APP_CONFIG_STORE_NAME, 'predefinedCatalogVersion');
            const initialDataImportedRecord = await this.dbService.getItem(APP_CONFIG_STORE_NAME, 'initialDataImported');
            
            let tasksCount = 0, materialsCount = 0;
            try {
                tasksCount = await this.dbService.countItems(TASKS_CATALOG_STORE_NAME);
                materialsCount = await this.dbService.countItems(MATERIALS_CATALOG_STORE_NAME);
            } catch (countError) {
                console.warn("CatalogImporter.checkAndImportInitialData: Błąd podczas zliczania elementów katalogowych:", countError.message);
            }

            const currentAppCatalogVersion = (typeof PREDEFINED_CATALOG_VERSION !== 'undefined') ? PREDEFINED_CATALOG_VERSION : "0.0.0";
            const storedCatalogVersion = catalogVersionRecord ? catalogVersionRecord.value : null;

            const needsImportDueToVersion = storedCatalogVersion !== currentAppCatalogVersion;
            // Importuj jeśli katalogi są puste ORAZ nie ma flagi pełnego importu (lub jest false)
            const needsImportDueToEmptyAndNoFlag = (tasksCount === 0 && materialsCount === 0) && (!initialDataImportedRecord || initialDataImportedRecord.value !== true);
            // Importuj jeśli brakuje flagi (nawet jeśli katalogi nie są puste - mogło coś pójść nie tak poprzednio)
            const needsImportDueToMissingFlagForce = !initialDataImportedRecord || initialDataImportedRecord.value !== true;
            
            // Import jest potrzebny, jeśli:
            // 1. Wersja się zmieniła (najwyższy priorytet).
            // 2. Katalogi są puste i nie ma flagi (pierwszy import).
            // 3. Brakuje flagi (np. po nieudanym poprzednim imporcie, nawet jeśli coś jest w katalogach).
            const needsImport = needsImportDueToVersion || needsImportDueToEmptyAndNoFlag || (needsImportDueToMissingFlagForce && (tasksCount > 0 || materialsCount > 0) && !needsImportDueToVersion );

            console.log(`CatalogImporter.checkAndImportInitialData: Wersja katalogu w aplikacji: ${currentAppCatalogVersion}, Wersja w bazie: ${storedCatalogVersion}`);
            console.log(`CatalogImporter.checkAndImportInitialData: Liczba zadań: ${tasksCount}, Materiałów: ${materialsCount}, Flaga importu: ${initialDataImportedRecord?.value}`);
            console.log(`CatalogImporter.checkAndImportInitialData: Decyzja o imporcie: ${needsImport} (Wersja: ${needsImportDueToVersion}, Puste+BrakFlagi: ${needsImportDueToEmptyAndNoFlag}, BrakFlagiForce: ${needsImportDueToMissingFlagForce})`);

            if (needsImport) {
                console.log("CatalogImporter.checkAndImportInitialData: Wykryto potrzebę importu/aktualizacji predefiniowanych katalogów. Rozpoczynam proces...");

                // Czyszczenie jest potrzebne, jeśli aktualizujemy wersję LUB jeśli importujemy na siłę (brak flagi) na niepuste katalogi
                if (needsImportDueToVersion || (needsImportDueToMissingFlagForce && (tasksCount > 0 || materialsCount > 0) && !needsImportDueToEmptyAndNoFlag)) {
                    console.log("CatalogImporter.checkAndImportInitialData: Czyszczenie starych predefiniowanych danych katalogowych...");
                    await this.clearPredefinedCatalogData();
                    // Po wyczyszczeniu, zresetuj liczniki, aby logika poniżej działała poprawnie
                    tasksCount = await this.dbService.countItems(TASKS_CATALOG_STORE_NAME);
                    materialsCount = await this.dbService.countItems(MATERIALS_CATALOG_STORE_NAME);
                }

                // --- Import Materiałów ---
                const allImportedMaterialNamesToIds = {}; 
                let totalMaterialsSuccessfullyAdded = 0;

                if (typeof BRANCHES === 'undefined' || Object.keys(BRANCHES).length === 0) {
                    const errMsg = "CatalogImporter.checkAndImportInitialData: Stała BRANCHES nie jest zdefiniowana lub jest pusta. Nie można importować danych.";
                    console.error(errMsg);
                    importErrors.push(errMsg);
                } else {
                    // Najpierw zbierz wszystkie unikalne materiały ze wszystkich plików branżowych
                    const uniqueMaterialsToImport = new Map();
                    for (const branchKey in BRANCHES) {
                        if (BRANCHES.hasOwnProperty(branchKey)) {
                            const branch = BRANCHES[branchKey];
                            if (branch.materialsFile) {
                                console.log(`CatalogImporter.checkAndImportInitialData: Wstępne parsowanie materiałów dla branży "${branch.name}": ${branch.materialsFile}`);
                                try {
                                    const response = await fetch(branch.materialsFile);
                                    if (!response.ok) {
                                        const errorMsg = `Nie można załadować pliku materiałów ${branch.materialsFile}: ${response.status} ${response.statusText || '(Błąd serwera)'}`;
                                        console.error(`CatalogImporter.checkAndImportInitialData: ${errorMsg}`);
                                        importErrors.push(`Błąd pliku ${branch.materialsFile}: ${response.status}`);
                                        continue;
                                    }
                                    const materialsData = JSON.parse(await response.text());
                                    for (const mat of materialsData) {
                                        const materialNameTrimmed = mat.name?.trim();
                                        if (!materialNameTrimmed) {
                                            console.warn(`CatalogImporter.checkAndImportInitialData: Pusta nazwa materiału w pliku ${branch.materialsFile}, pozycja:`, mat);
                                            continue;
                                        }
                                        if (!uniqueMaterialsToImport.has(materialNameTrimmed)) {
                                            uniqueMaterialsToImport.set(materialNameTrimmed, {
                                                name: materialNameTrimmed,
                                                unit: mat.unit?.trim() || 'j.m.',
                                                categoryCode: mat.categoryCode?.trim() || mat.category?.trim() || 'IN',
                                                priceY: parseFloat(mat.priceY || mat.price) || 0,
                                                priceX: parseFloat(mat.priceX ?? (mat.priceY || mat.price)) || 0,
                                                isPredefined: true,
                                                createdAt: new Date().toISOString(),
                                                updatedAt: new Date().toISOString()
                                            });
                                        }
                                    }
                                } catch (e) { /* obsłużone poniżej */ }
                            }
                        }
                    }
                    
                    // Teraz dodaj unikalne materiały do bazy
                    for (const [name, materialData] of uniqueMaterialsToImport) {
                        try {
                            let existingMaterial = await this.dbService.getItemByIndex(MATERIALS_CATALOG_STORE_NAME, 'name', name);
                            if (!existingMaterial) {
                                const materialId = await this.dbService.addItem(MATERIALS_CATALOG_STORE_NAME, materialData);
                                allImportedMaterialNamesToIds[name] = materialId;
                                totalMaterialsSuccessfullyAdded++;
                            } else {
                                allImportedMaterialNamesToIds[name] = existingMaterial.id;
                                if (existingMaterial.isPredefined !== true) {
                                    console.warn(`CatalogImporter.checkAndImportInitialData: Materiał "${name}" istnieje już jako niepredefiniowany. Nie został nadpisany, użyto istniejącego ID.`);
                                } else {
                                    // Jeśli jest predefiniowany, ale z innej wersji (co clearPredefinedCatalogData powinno było usunąć)
                                    // Można by tu dodać logikę aktualizacji, jeśli wersje się różnią, ale clear jest prostsze.
                                }
                            }
                        } catch (dbError) {
                             const errorMsg = `Błąd bazy danych (materiał "${name}"): ${dbError.message}`; console.error(errorMsg, dbError); importErrors.push(errorMsg);
                        }
                    }
                }
                console.log(`CatalogImporter.checkAndImportInitialData: Import materiałów zakończony. Unikalnych w mapie: ${Object.keys(allImportedMaterialNamesToIds).length}, nowo dodanych: ${totalMaterialsSuccessfullyAdded}.`);

                // --- Import Zadań (Pozycji Kosztorysowych) ---
                let totalTasksSuccessfullyAdded = 0;
                if (typeof BRANCHES !== 'undefined' && Object.keys(BRANCHES).length > 0) {
                    for (const branchKey in BRANCHES) {
                        if (BRANCHES.hasOwnProperty(branchKey)) {
                            const branch = BRANCHES[branchKey];
                            if (branch.tasksFile) {
                                console.log(`CatalogImporter.checkAndImportInitialData: Przetwarzanie pliku pozycji dla branży "${branch.name}": ${branch.tasksFile}`);
                                try {
                                    const response = await fetch(branch.tasksFile);
                                    if (!response.ok) { /* ... obsługa błędu jak przy materiałach ... */ const errorMsg = `Nie można załadować pliku pozycji ${branch.tasksFile}: ${response.status} ${response.statusText || '(Błąd serwera)'}`; console.error(`CatalogImporter.checkAndImportInitialData: ${errorMsg}`); importErrors.push(`Błąd pliku ${branch.tasksFile}: ${response.status}`); continue; }
                                    const tasksData = JSON.parse(await response.text());
                                    for (const task of tasksData) {
                                        if (!task.description || !task.description.trim()) { /* ... obsługa błędu ... */ console.warn(`CatalogImporter.checkAndImportInitialData: Pusty opis pozycji w pliku ${branch.tasksFile}, pozycja:`, task); continue; }
                                        const normsM_withIds = [];
                                        if (task.norms && task.norms.M && Array.isArray(task.norms.M)) {
                                            for (const matNorm of task.norms.M) {
                                                if (!matNorm.name || !matNorm.name.trim()) { /* ... obsługa błędu ... */ console.warn(`CatalogImporter.checkAndImportInitialData: Pusta nazwa materiału w normie dla pozycji "${task.description}" (plik ${branch.tasksFile})`, matNorm); continue; }
                                                const materialNameTrimmed = matNorm.name.trim();
                                                const materialId = allImportedMaterialNamesToIds[materialNameTrimmed];
                                                if (materialId) { 
                                                    let normUnit = matNorm.unit?.trim(); 
                                                    if (!normUnit) { const matInfo = await this.dbService.getItem(MATERIALS_CATALOG_STORE_NAME, materialId); normUnit = matInfo?.unit || 'j.m.'; }
                                                    normsM_withIds.push({ materialId: materialId, quantity: parseFloat(matNorm.quantity) || 0, unit: normUnit }); 
                                                } else { console.warn(`CatalogImporter.checkAndImportInitialData: Nie znaleziono ID dla materiału "${materialNameTrimmed}" (pozycja: "${task.description}"). Pominięto w normie.`); importErrors.push(`Brak ID dla mat. "${materialNameTrimmed}" w normie dla "${task.description}"`); }
                                            }
                                        }
                                        const newTask = { branch: branch.code, department: task.department?.trim() || "Dział Ogólny", description: task.description.trim(), unit: task.unit?.trim() || 'j.m.', workerCategory: task.workerCategory?.trim() || 'ogolnobudowlany', norms: { R: parseFloat(task.norms?.R) || 0, M: normsM_withIds }, isPredefined: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
                                        await this.dbService.addItem(TASKS_CATALOG_STORE_NAME, newTask); 
                                        totalTasksSuccessfullyAdded++;
                                    }
                                    console.log(`CatalogImporter.checkAndImportInitialData: Pozycje dla branży "${branch.name}" przetworzone.`);
                                } catch (parseOrFetchError) { const errorMsg = `Błąd przetwarzania pozycji dla "${branch.name}" (${branch.tasksFile}): ${parseOrFetchError.message}`; console.error(`CatalogImporter.checkAndImportInitialData: ${errorMsg}`, parseOrFetchError); importErrors.push(errorMsg); }
                            }
                        }
                    }
                }
                console.log(`CatalogImporter.checkAndImportInitialData: Import pozycji zakończony. Dodano: ${totalTasksSuccessfullyAdded} pozycji.`);

                if (importErrors.length === 0) {
                    await this.dbService.updateItem(APP_CONFIG_STORE_NAME, { key: 'initialDataImported', value: true });
                    await this.dbService.updateItem(APP_CONFIG_STORE_NAME, { key: 'predefinedCatalogVersion', value: currentAppCatalogVersion });
                    console.log("CatalogImporter.checkAndImportInitialData: Import/aktualizacja predefiniowanych katalogów zakończona pomyślnie. Zaktualizowano flagi w konfiguracji.");
                    if (typeof showNotification === 'function' && notificationsContainer) showNotification("Katalogi predefiniowane zostały pomyślnie zaimportowane/zaktualizowane.", 'success');
                } else {
                    console.warn(`CatalogImporter.checkAndImportInitialData: Import zakończony z ${importErrors.length} błędami/ostrzeżeniami. Flagi konfiguracyjne NIE zostały w pełni zaktualizowane.`);
                    const errorSummary = `Wystąpiły problemy podczas importu danych katalogowych:\n- ${importErrors.slice(0, 5).join('\n- ')}${importErrors.length > 5 ? '\n- ... (więcej błędów w konsoli)' : ''}\n\nNiektóre dane mogły nie zostać zaimportowane poprawnie. Sprawdź konsolę (F12).`;
                    if (typeof showNotification === 'function' && notificationsContainer) showNotification(errorSummary.replace(/\n/g, "<br>"), 'warning', 15000);
                    else alert(errorSummary);
                }
            } else {
                console.log("CatalogImporter.checkAndImportInitialData: Predefiniowane katalogi są aktualne. Import/aktualizacja nie jest wymagana.");
            }
        } catch (error) {
            console.error("CatalogImporter.checkAndImportInitialData: Krytyczny błąd podczas głównego procesu sprawdzania/importu:", error);
            const criticalErrorMsg = `Wystąpił krytyczny błąd aplikacji podczas inicjalizacji katalogów: ${error.message}. Aplikacja może nie działa poprawnie.`;
            if (typeof showNotification === 'function' && notificationsContainer) showNotification(criticalErrorMsg, 'error', 0);
            else alert(criticalErrorMsg);
        }
    }

    // ==========================================================================
    // SEKCJA 3: METODA DO CZYSZCZENIA PREDEFINIOWANYCH DANYCH KATALOGOWYCH
    // Opis: Usuwa wszystkie elementy oznaczone jako 'isPredefined: true' 
    //       z magazynów zadań i materiałów. Niezbędne przed importem nowej wersji katalogów.
    // ==========================================================================
    async clearPredefinedCatalogData() {
        console.log("CatalogImporter.clearPredefinedCatalogData: Rozpoczynam czyszczenie predefiniowanych danych katalogowych...");
        try {
            const storesToClear = [TASKS_CATALOG_STORE_NAME, MATERIALS_CATALOG_STORE_NAME];
            for (const storeName of storesToClear) {
                let itemsDeletedCount = 0;
                // Używamy transakcji readwrite do usuwania
                const transaction = await this.dbService._getTransaction(storeName, "readwrite");
                const store = transaction.objectStore(storeName);
                const request = store.openCursor(); // Otwieramy kursor do iteracji

                await new Promise((resolve, reject) => {
                    request.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor) {
                            if (cursor.value.isPredefined === true) { // Sprawdzamy flagę
                                cursor.delete(); // Usuwamy element
                                itemsDeletedCount++;
                            }
                            cursor.continue(); // Przechodzimy do następnego elementu
                        } else {
                            resolve(); // Koniec danych w kursorze
                        }
                    };
                    request.onerror = (event) => {
                        console.error(`CatalogImporter.clearPredefinedCatalogData: Błąd otwierania kursora dla magazynu "${storeName}" podczas czyszczenia:`, event.target.error);
                        reject(event.target.error);
                    };
                    // Obsługa błędów i zakończenia transakcji
                    transaction.oncomplete = () => {
                        console.log(`CatalogImporter.clearPredefinedCatalogData: Transakcja czyszczenia dla "${storeName}" zakończona.`);
                        // Resolve już było wywołane, gdy cursor jest null
                    };
                    transaction.onerror = (event) => {
                        console.error(`CatalogImporter.clearPredefinedCatalogData: Błąd transakcji podczas czyszczenia "${storeName}":`, event.target.error);
                        reject(event.target.error); // Odrzuć główny Promise, jeśli transakcja się nie powiedzie
                    };
                });
                console.log(`CatalogImporter.clearPredefinedCatalogData: Usunięto ${itemsDeletedCount} predefiniowanych elementów z magazynu "${storeName}".`);
            }
            console.log("CatalogImporter.clearPredefinedCatalogData: Czyszczenie predefiniowanych danych katalogowych zakończone pomyślnie.");
        } catch (error) {
            console.error("CatalogImporter.clearPredefinedCatalogData: Błąd podczas czyszczenia predefiniowanych danych katalogowych:", error);
            throw error; // Rzuć błąd dalej, aby mógł być obsłużony
        }
    }
}

// ==========================================================================
// Logowanie załadowania pliku
// ==========================================================================
console.log("Plik js/catalog-importer.js (Wersja 0.6.1A) załadowany.");