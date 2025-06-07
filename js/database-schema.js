// Plik: database-schema.js
// Opis: Definiuje schemat bazy danych dla EazyKoszt.
//       Przygotowuje strukturę pod migrację do modelu SaaS z Firestore.
// Wersja aplikacji, z którą ten schemat jest powiązany: EazyKoszt 0.25.06.05.1

// ==========================================================================
// PRZYSZŁA STRUKTURA BAZY DANYCH (FIRESTORE)
//
// /users/{userId} -> (USER_PROFILE_SCHEMA)
//   - email: string
//   - stripeCustomerId: string
//   - subscriptionStatus: 'active' | 'inactive' | 'trial'
//
// /projects/{projectId} -> (PROJECT_SCHEMA)
//   - userId: string (dla reguł bezpieczeństwa)
//   - name: string (nazwa kosztorysu)
//   - estimateData: object (główny obiekt z wierszami, ustawieniami itp.)
//   - createdAt: timestamp
//   - updatedAt: timestamp
//
// /catalog_tasks/{taskId} -> (TASKS_CATALOG_SCHEMA)
//   - isPredefined: boolean
//   - createdByUserId: string | null (dla pozycji własnych użytkowników)
//   - ... (reszta pól)
//
// /catalog_materials/{materialId} -> (MATERIALS_CATALOG_SCHEMA)
//   - isPredefined: boolean
//   - createdByUserId: string | null (dla materiałów własnych użytkowników)
//   - ... (reszta pól)
//
// ==========================================================================

// --- Konfiguracja dla lokalnej bazy IndexedDB (w okresie przejściowym) ---

const DB_NAME = 'EazyKosztDB_v0_3_0';
const DB_VERSION = 1;

// Nazwy magazynów obiektów (Object Stores)
const APP_CONFIG_STORE_NAME = 'appConfig';
const TASKS_CATALOG_STORE_NAME = 'tasksCatalog';
const MATERIALS_CATALOG_STORE_NAME = 'materialsCatalog';

// --- Definicje Schematów ---

// Schemat profilu użytkownika (dla przyszłej implementacji w Firestore)
const USER_PROFILE_SCHEMA = {
    // collectionName: 'users'
    // id: userId (z Firebase Auth)
    email: 'string',
    stripeCustomerId: 'string | null',
    subscriptionStatus: 'string', // np. 'active', 'trial', 'past_due', 'canceled'
    createdAt: 'timestamp'
};

// Schemat projektu/kosztorysu (dla przyszłej implementacji w Firestore)
const PROJECT_SCHEMA = {
    // collectionName: 'projects'
    // id: auto-generowane
    userId: 'string', // ID właściciela z Firebase Auth
    name: 'string',
    estimateData: 'object', // Cała struktura obecnego kosztorysu
    createdAt: 'timestamp',
    updatedAt: 'timestamp'
};

// Schematy magazynów obiektów dla lokalnej bazy danych IndexedDB
const ALL_STORES_SCHEMAS = [
    {
        name: APP_CONFIG_STORE_NAME,
        keyPath: 'key',
        autoIncrement: false,
        indexes: []
    },
    {
        name: TASKS_CATALOG_STORE_NAME,
        keyPath: 'id',
        autoIncrement: true,
        // W Firestore 'createdByUserId' będzie używane do filtrowania pozycji własnych użytkownika
        indexes: [
            { name: 'branch', keyPath: 'branch', options: { unique: false } },
            { name: 'department', keyPath: 'department', options: { unique: false } },
            { name: 'description', keyPath: 'description', options: { unique: false } }
        ]
    },
    {
        name: MATERIALS_CATALOG_STORE_NAME,
        keyPath: 'id',
        autoIncrement: true,
        // W Firestore 'createdByUserId' będzie używane do filtrowania materiałów własnych użytkownika
        indexes: [
            { name: 'name', keyPath: 'name', options: { unique: true } },
            { name: 'categoryCode', keyPath: 'categoryCode', options: { unique: false } }
        ]
    }
];

// Definicje dla lokalnej bazy danych wersji kosztorysu (docelowo do usunięcia)
const ESTIMATE_VERSIONS_DB_NAME = "EazyKosztDB_EstimateVersions_v0_1_1";
const ESTIMATE_VERSIONS_DB_VERSION = 2;
const VERSION_STORE_NAME = "estimateVersions";
const VERSION_STORE_SCHEMA = {
    name: VERSION_STORE_NAME,
    keyPath: "id",
    autoIncrement: true,
    indexes: [
        { name: "timestamp", keyPath: "timestamp", options: { unique: false } },
        { name: "name", keyPath: "name", options: { unique: false } },
        { name: "isAuto", keyPath: "isAuto", options: { unique: false } }
    ]
};


// Definicje Branż (pozostają bez zmian)
const BRANCHES = {
    OG: { code: "OG", name: "Ogólnobudowlane", tasksFile: "data/tasks-ogolnobudowlane.json", materialsFile: "data/materials-ogolnobudowlane.json" },
    EL: { code: "EL", name: "Elektryczne", tasksFile: "data/tasks-elektryczne.json", materialsFile: "data/materials-elektryczne.json" },
    SA: { code: "SA", name: "Sanitarne i C.O.", tasksFile: "data/tasks-sanitarne.json", materialsFile: "data/materials-sanitarne.json" },
    ZF: { code: "ZF", name: "Roboty Ziemne i Fundamentowe", tasksFile: "data/tasks-ziemne-fundamentowe.json", materialsFile: "data/materials-ziemne-fundamentowe.json" },
};

// Mapa Kategorii Materiałów (pozostaje bez zmian)
const MATERIAL_CATEGORIES_MAP = {
    "IN": "Inne / Ogólne", "BU": "Budowlane Główne", "EL": "Elektryczne", "SA": "Sanitarne i Grzewcze",
    "WY": "Wykończeniowe", "DR": "Drewno i Płyty", "ME": "Metalowe i Stalowe", "CH": "Chemia Budowlana",
    "IZ": "Izolacje", "KO": "Kostka i Galanteria Betonowa", "OG": "Ogrodowe i Zieleń"
};

// Wersja predefiniowanych danych katalogowych
const PREDEFINED_CATALOG_VERSION = "1.0.3";

console.log("Plik database-schema.js (EazyKoszt 0.25.06.05.1) załadowany.");
