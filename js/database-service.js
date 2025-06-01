// Plik: EazyKoszt 0.3.9-database-service.js
// Opis: Serwis do obsługi bazy danych IndexedDB dla aplikacji EazyKoszt.
// Wymaga: database-schema.js

// ==========================================================================
// SEKCJA 1: DEFINICJA KLASY DatabaseService
// ==========================================================================

class DatabaseService {
    constructor(dbName, dbVersion, storeSchemas) {
        this.dbName = dbName;
        this.dbVersion = dbVersion;
        this.storeSchemas = storeSchemas;
        this.db = null;
        console.log(`DatabaseService (EazyKoszt 0.3.9) zainicjalizowany dla bazy: ${dbName}, wersja: ${dbVersion}`);
    }

    // ==========================================================================
    // SEKCJA 2: POŁĄCZENIE Z BAZĄ DANYCH I AKTUALIZACJA SCHEMATU
    // ==========================================================================
    async openDB() {
        if (this.db) {
            return Promise.resolve(this.db);
        }
        return new Promise((resolve, reject) => {
            if (typeof this.dbName === 'undefined' || typeof this.dbVersion === 'undefined') {
                const errMsg = "DB_NAME lub DB_VERSION nie są zdefiniowane.";
                console.error(errMsg); reject(errMsg); return;
            }
            const request = indexedDB.open(this.dbName, this.dbVersion);
            request.onerror = (event) => { console.error(`Błąd otwierania bazy danych "${this.dbName}":`, event.target.error); reject(`Błąd otwierania bazy danych: ${event.target.error?.message || event.target.error}`); };
            request.onsuccess = (event) => { this.db = event.target.result; console.log(`Baza danych "${this.dbName}" otwarta pomyślnie (wersja: ${this.db.version}).`); resolve(this.db); };
            request.onupgradeneeded = (event) => {
                console.log(`Aktualizacja schematu bazy danych "${this.dbName}" z wersji ${event.oldVersion} do ${event.newVersion}...`);
                const dbInstance = event.target.result; const transaction = event.target.transaction;
                if (!transaction) { console.error("Brak transakcji w onupgradeneeded."); reject("Błąd transakcji podczas aktualizacji schematu."); return; }
                if (!this.storeSchemas || this.storeSchemas.length === 0) { console.warn("Brak zdefiniowanych schematów magazynów do utworzenia/aktualizacji."); }
                this.storeSchemas.forEach(schema => {
                    if (!dbInstance.objectStoreNames.contains(schema.name)) {
                        console.log(`Tworzenie magazynu obiektów: "${schema.name}"...`);
                        const objectStore = dbInstance.createObjectStore(schema.name, { keyPath: schema.keyPath, autoIncrement: schema.autoIncrement });
                        if (schema.indexes && Array.isArray(schema.indexes)) {
                            schema.indexes.forEach(idx => { objectStore.createIndex(idx.name, idx.keyPath, idx.options); console.log(`  Utworzono indeks "${idx.name}" dla magazynu "${schema.name}".`); });
                        }
                    } else {
                        console.log(`Magazyn obiektów "${schema.name}" już istnieje. Sprawdzanie indeksów...`);
                        const objectStore = transaction.objectStore(schema.name);
                         if (schema.indexes && Array.isArray(schema.indexes)) {
                            schema.indexes.forEach(idx => { if (!objectStore.indexNames.contains(idx.name)) { objectStore.createIndex(idx.name, idx.keyPath, idx.options); console.log(`  Dodano nowy indeks "${idx.name}" dla istniejącego magazynu "${schema.name}".`); } });
                        }
                    }
                });
                console.log(`Aktualizacja schematu bazy danych "${this.dbName}" zakończona.`);
            };
        });
    }

    // ==========================================================================
    // SEKCJA 3: METODY POMOCNICZE (WEWNĘTRZNE)
    // ==========================================================================
    async _getTransaction(storeName, mode = "readonly") {
        if (!this.db) { console.log("Baza danych nie jest otwarta. Próba otwarcia..."); await this.openDB(); if (!this.db) { throw new Error("Nie udało się otworzyć bazy danych do utworzenia transakcji."); } }
        try { return this.db.transaction(storeName, mode); } catch (e) { console.error(`Błąd tworzenia transakcji dla magazynu/ów "${storeName}" w trybie "${mode}":`, e.message); throw e; }
    }

    // ==========================================================================
    // SEKCJA 4: OPERACJE CRUD (Create, Read, Update, Delete)
    // ==========================================================================
    async addItem(storeName, item) { return new Promise(async (resolve, reject) => { try { const transaction = await this._getTransaction(storeName, "readwrite"); const objectStore = transaction.objectStore(storeName); const request = objectStore.add(item); request.onsuccess = (event) => resolve(event.target.result); request.onerror = (event) => { console.error(`Błąd dodawania elementu do "${storeName}":`, item, event.target.error); reject(event.target.error); }; } catch (error) { console.error(`Wyjątek podczas próby dodania elementu do "${storeName}":`, error); reject(error); } }); }
    async getItem(storeName, key) { return new Promise(async (resolve, reject) => { try { const transaction = await this._getTransaction(storeName, "readonly"); const objectStore = transaction.objectStore(storeName); const request = objectStore.get(key); request.onsuccess = (event) => resolve(event.target.result); request.onerror = (event) => { console.error(`Błąd pobierania elementu z "${storeName}" (klucz: ${key}):`, event.target.error); reject(event.target.error); }; } catch (error) { console.error(`Wyjątek podczas próby pobrania elementu z "${storeName}" (klucz: ${key}):`, error); reject(error); } }); }
    async getAllItems(storeName) { return new Promise(async (resolve, reject) => { try { const transaction = await this._getTransaction(storeName, "readonly"); const objectStore = transaction.objectStore(storeName); const request = objectStore.getAll(); request.onsuccess = (event) => resolve(event.target.result); request.onerror = (event) => { console.error(`Błąd pobierania wszystkich elementów z "${storeName}":`, event.target.error); reject(event.target.error); }; } catch (error) { console.error(`Wyjątek podczas próby pobrania wszystkich elementów z "${storeName}":`, error); reject(error); } }); }
    async updateItem(storeName, item) { return new Promise(async (resolve, reject) => { try { const transaction = await this._getTransaction(storeName, "readwrite"); const objectStore = transaction.objectStore(storeName); const request = objectStore.put(item); request.onsuccess = (event) => resolve(event.target.result); request.onerror = (event) => { console.error(`Błąd aktualizacji elementu w "${storeName}":`, item, event.target.error); reject(event.target.error); }; } catch (error) { console.error(`Wyjątek podczas próby aktualizacji elementu w "${storeName}":`, error); reject(error); } }); }
    async deleteItem(storeName, key) { return new Promise(async (resolve, reject) => { try { const transaction = await this._getTransaction(storeName, "readwrite"); const objectStore = transaction.objectStore(storeName); const request = objectStore.delete(key); request.onsuccess = () => resolve(true); request.onerror = (event) => { console.error(`Błąd usuwania elementu z "${storeName}" (klucz: ${key}):`, event.target.error); reject(event.target.error); }; } catch (error) { console.error(`Wyjątek podczas próby usunięcia elementu z "${storeName}" (klucz: ${key}):`, error); reject(error); } }); }

    // ==========================================================================
    // SEKCJA 5: OPERACJE NA INDEKSACH I ZLICZANIE
    // ==========================================================================
    async countItems(storeName) { return new Promise(async (resolve, reject) => { try { const transaction = await this._getTransaction(storeName, "readonly"); const objectStore = transaction.objectStore(storeName); const request = objectStore.count(); request.onsuccess = (event) => resolve(event.target.result); request.onerror = (event) => { console.error(`Błąd zliczania elementów w "${storeName}":`, event.target.error); reject(event.target.error); }; } catch (error) { console.error(`Wyjątek podczas próby zliczenia elementów w "${storeName}":`, error); reject(error); } }); }
    async getItemsByIndex(storeName, indexName, query) { return new Promise(async (resolve, reject) => { try { const transaction = await this._getTransaction(storeName, "readonly"); const objectStore = transaction.objectStore(storeName); const index = objectStore.index(indexName); const request = index.getAll(query); request.onsuccess = (event) => resolve(event.target.result); request.onerror = (event) => { console.error(`Błąd pobierania elementów przez indeks "${indexName}" z "${storeName}" (query: ${query}):`, event.target.error); reject(event.target.error); }; } catch (error) { console.error(`Wyjątek podczas próby pobrania elementów przez indeks "${indexName}" z "${storeName}":`, error); reject(error); } }); }
    async getItemByIndex(storeName, indexName, query) { return new Promise(async (resolve, reject) => { try { const transaction = await this._getTransaction(storeName, "readonly"); const objectStore = transaction.objectStore(storeName); const index = objectStore.index(indexName); const request = index.get(query); request.onsuccess = (event) => resolve(event.target.result); request.onerror = (event) => { console.error(`Błąd pobierania pojedynczego elementu przez indeks "${indexName}" z "${storeName}" (query: ${query}):`, event.target.error); reject(event.target.error); }; } catch (error) { console.error(`Wyjątek podczas próby pobrania pojedynczego elementu przez indeks "${indexName}" z "${storeName}":`, error); reject(error); } }); }
    async getItemsByIds(storeName, ids) { return new Promise(async (resolve, reject) => { if (!Array.isArray(ids) || ids.length === 0) { resolve([]); return; } try { const transaction = await this._getTransaction(storeName, "readonly"); const objectStore = transaction.objectStore(storeName); const results = []; let completedRequests = 0; const uniqueIds = [...new Set(ids)]; if (uniqueIds.length === 0) { resolve([]); return; } uniqueIds.forEach(id => { const request = objectStore.get(id); request.onsuccess = (event) => { if (event.target.result) results.push(event.target.result); completedRequests++; if (completedRequests === uniqueIds.length) resolve(results); }; request.onerror = (event) => { console.error(`Błąd pobierania elementu o ID ${id} z "${storeName}":`, event.target.error); completedRequests++; if (completedRequests === uniqueIds.length) resolve(results); }; }); transaction.oncomplete = () => { if (completedRequests < uniqueIds.length) { console.warn(`Transakcja zakończona, ale nie wszystkie żądania getItemByIds dla "${storeName}" zostały przetworzone.`); resolve(results); } }; transaction.onerror = (event) => { console.error(`Błąd transakcji podczas getItemsByIds dla "${storeName}":`, event.target.error); reject(event.target.error); }; } catch (error) { console.error(`Wyjątek podczas próby pobrania elementów przez IDs z "${storeName}":`, error); reject(error); } }); }

    // ==========================================================================
    // SEKCJA 6: OPERACJE ADMINISTRACYJNE NA MAGAZYNACH
    // ==========================================================================
    async clearStore(storeName) { return new Promise(async (resolve, reject) => { try { const transaction = await this._getTransaction(storeName, "readwrite"); const objectStore = transaction.objectStore(storeName); const request = objectStore.clear(); request.onsuccess = () => { console.log(`Magazyn "${storeName}" został wyczyszczony.`); resolve(true); }; request.onerror = (event) => { console.error(`Błąd czyszczenia magazynu "${storeName}":`, event.target.error); reject(event.target.error); }; } catch (error) { console.error(`Wyjątek podczas próby wyczyszczenia magazynu "${storeName}":`, error); reject(error); } }); }
}

// ==========================================================================
// SEKCJA 7: INSTANCJA SERWISU BAZY DANYCH
// ==========================================================================
let dbService;
if (typeof DB_NAME !== 'undefined' && typeof DB_VERSION !== 'undefined' && typeof ALL_STORES_SCHEMAS !== 'undefined') {
    dbService = new DatabaseService(DB_NAME, DB_VERSION, ALL_STORES_SCHEMAS);
} else {
    console.error("Krytyczny błąd: Nie można utworzyć instancji dbService, ponieważ stałe DB_NAME, DB_VERSION lub ALL_STORES_SCHEMAS nie są zdefiniowane.");
}

console.log("Plik EazyKoszt 0.3.9-database-service.js załadowany.");