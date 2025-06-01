// Plik: database-schema.js
// Opis: Definiuje schemat bazy danych IndexedDB, stałe nazwy magazynów,
//       wersję bazy oraz predefiniowane dane (np. branże, kategorie).
// Wersja aplikacji, z którą ten schemat jest powiązany: EazyKoszt 0.4.2

const DB_NAME = 'EazyKosztDB_v0_3_0';
const DB_VERSION = 1; // Pozostaje 1, jeśli struktura głównych magazynów się nie zmienia

// Nazwy magazynów obiektów (Object Stores)
const APP_CONFIG_STORE_NAME = 'appConfig';
const TASKS_CATALOG_STORE_NAME = 'tasksCatalog';
const MATERIALS_CATALOG_STORE_NAME = 'materialsCatalog';

// Schematy magazynów obiektów dla głównej bazy danych
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
        indexes: [
            { name: 'name', keyPath: 'name', options: { unique: true } },
            { name: 'categoryCode', keyPath: 'categoryCode', options: { unique: false } }
        ]
    }
];

// Definicje dla bazy danych wersji kosztorysu
const ESTIMATE_VERSIONS_DB_NAME = "EazyKosztDB_EstimateVersions_v0_1_1"; // Zwiększona wersja dla nowego indeksu
const ESTIMATE_VERSIONS_DB_VERSION = 2; // Zwiększona wersja dla nowego indeksu
const VERSION_STORE_NAME = "estimateVersions";
const VERSION_STORE_SCHEMA = { // Schemat dla magazynu wersji, używany w script-core.js
    name: VERSION_STORE_NAME,
    keyPath: "id",
    autoIncrement: true,
    indexes: [
        { name: "timestamp", keyPath: "timestamp", options: { unique: false } },
        { name: "name", keyPath: "name", options: { unique: false } },
        { name: "isAuto", keyPath: "isAuto", options: { unique: false } } // Nowy indeks
    ]
};


// Definicje Branż
const BRANCHES = {
    OG: { code: "OG", name: "Ogólnobudowlane", tasksFile: "data/tasks-ogolnobudowlane.json", materialsFile: "data/materials-ogolnobudowlane.json" },
    EL: { code: "EL", name: "Elektryczne", tasksFile: "data/tasks-elektryczne.json", materialsFile: "data/materials-elektryczne.json" },
    SA: { code: "SA", name: "Sanitarne i C.O.", tasksFile: "data/tasks-sanitarne.json", materialsFile: "data/materials-sanitarne.json" },
    ZF: { code: "ZF", name: "Roboty Ziemne i Fundamentowe", tasksFile: "data/tasks-ziemne-fundamentowe.json", materialsFile: "data/materials-ziemne-fundamentowe.json" },
};

// Mapa Kategorii Materiałów
const MATERIAL_CATEGORIES_MAP = {
    "IN": "Inne / Ogólne", "BU": "Budowlane Główne", "EL": "Elektryczne", "SA": "Sanitarne i Grzewcze",
    "WY": "Wykończeniowe", "DR": "Drewno i Płyty", "ME": "Metalowe i Stalowe", "CH": "Chemia Budowlana",
    "IZ": "Izolacje", "KO": "Kostka i Galanteria Betonowa", "OG": "Ogrodowe i Zieleń"
};

const PREDEFINED_CATALOG_VERSION = "1.0.3"; // Wersja predefiniowanych danych

console.log("Plik database-schema.js (EazyKoszt 0.4.2) załadowany.");