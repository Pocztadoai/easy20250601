// Plik: firebase-init.js
// Opis: Inicjalizuje i konfiguruje Firebase SDK.
//       W tym pliku należy wkleić konfigurację własnego projektu Firebase.
// Wersja aplikacji, z którą ten plik jest powiązany: EazyKoszt 0.25.06.05.1

// WAŻNE: Wklej tutaj konfigurację swojego projektu Firebase
// Możesz ją znaleźć w konsoli Firebase -> Ustawienia projektu -> Aplikacje internetowe
const firebaseConfig = {
  apiKey: "AIzaSyB_t4MyM4ysFbhVDcXh2nLO6bxULpb2O1I",
  authDomain: "eazykoszt-app.firebaseapp.com",
  projectId: "eazykoszt-app",
  storageBucket: "eazykoszt-app.firebasestorage.app",
  messagingSenderId: "966777312085",
  appId: "1:966777312085:web:7c217d7a8a6e4ed816d5dc",
  measurementId: "G-5D1B9X1K2X"
};

// Inicjalizacja Firebase
let firebaseApp;
let firebaseAuth;
let firestoreDB;

try {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    firebaseAuth = firebase.auth();
    firestoreDB = firebase.firestore();
    console.log("[FirebaseInit] Firebase został pomyślnie zainicjalizowany.");
} catch (error) {
    console.error("[FirebaseInit] Krytyczny błąd podczas inicjalizacji Firebase:", error);
    // Wstrzymaj działanie aplikacji lub wyświetl komunikat o błędzie na całą stronę
    document.body.innerHTML = `<div style="padding: 20px; text-align: center; color: red;">Błąd krytyczny: Nie można połączyć się z usługami aplikacji. Sprawdź konfigurację Firebase.</div>`;
}

// Eksportujemy instancje, aby były dostępne w innych plikach
// (W tym momencie, w czystym JS, są one dostępne globalnie przez `firebaseAuth` i `firestoreDB`)
// W przyszłości przy użyciu modułów ES6, użyjemy `export { firebaseApp, firebaseAuth, firestoreDB };`
