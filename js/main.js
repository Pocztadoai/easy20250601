// Plik: main.js
// Opis: Główny skrypt dla index.html. Odpowiada za ochronę dostępu (sprawdzanie,
//       czy użytkownik jest zalogowany) i obsługę wylogowania. Inicjalizuje
//       główną logikę aplikacji dopiero po pomyślnym uwierzytelnieniu.
// Wersja aplikacji: EazyKoszt 0.25.06.05.1

document.addEventListener('DOMContentLoaded', () => {

    // Sprawdzenie, czy Firebase jest dostępny
    if (typeof firebase === 'undefined' || typeof firebaseAuth === 'undefined') {
        console.error("[Main] Firebase nie jest załadowany. Aplikacja nie może wystartować.");
        document.body.innerHTML = `<div style="padding: 20px; text-align: center; color: red;">Błąd krytyczny: Brak połączenia z usługami aplikacji. Proszę odświeżyć stronę.</div>`;
        return;
    }

    const userInfoContainer = document.getElementById('user-info-container');
    const userEmailDisplay = document.getElementById('user-email-display');
    const logoutBtn = document.getElementById('logout-btn');

    // --- SEKCJA 1: OCHRONA DOSTĘPU I INICJALIZACJA APLIKACJI ---

    firebaseAuth.onAuthStateChanged(user => {
        if (user) {
            // Użytkownik jest zalogowany
            console.log(`[Main] Użytkownik ${user.email} jest uwierzytelniony. Uruchamianie aplikacji...`);
            
            // Pokaż informacje o użytkowniku i przycisk wylogowania
            if (userInfoContainer && userEmailDisplay) {
                userEmailDisplay.textContent = user.email;
                userInfoContainer.style.display = 'flex';
            }

            // Uruchom główną logikę aplikacji EazyKoszt
            // Sprawdzamy, czy funkcja startApp istnieje, zanim ją wywołamy
            if (typeof startEazyKosztApp === 'function') {
                startEazyKosztApp();
            } else {
                console.error("[Main] Nie można uruchomić aplikacji - funkcja startEazyKosztApp() nie została znaleziona.");
            }

        } else {
            // Użytkownik nie jest zalogowany, przekieruj na stronę logowania
            console.log("[Main] Brak zalogowanego użytkownika. Przekierowanie do login.html...");
            window.location.href = 'login.html';
        }
    });

    // --- SEKCJA 2: OBSŁUGA WYLOGOWANIA ---

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            firebaseAuth.signOut()
                .then(() => {
                    console.log("[Main] Użytkownik pomyślnie wylogowany.");
                    // onAuthStateChanged zajmie się resztą (przekierowaniem)
                })
                .catch(error => {
                    console.error("[Main] Błąd podczas wylogowywania:", error);
                    // Można tu wyświetlić powiadomienie o błędzie, jeśli jest dostępne
                    if (typeof showNotification === 'function') {
                        showNotification("Wystąpił błąd podczas wylogowywania.", "error");
                    }
                });
        });
    }

});


/**
 * Główna funkcja inicjalizująca logikę aplikacji EazyKoszt.
 * Zostanie ona zdefiniowana i rozbudowana w script-core.js.
 * Wywoływana jest przez onAuthStateChanged tylko wtedy, gdy użytkownik jest zalogowany.
 */
async function startEazyKosztApp() {
    console.log("[Main] Wywołano startEazyKosztApp(). Rozpoczynanie inicjalizacji modułów EazyKoszt...");
    // Cała logika z oryginalnego DOMContentLoaded z script-core.js zostanie przeniesiona tutaj.
    // Na razie zostawiamy pustą, zaimplementujemy ją w następnym kroku.
    if(typeof initApp === 'function') {
        await initApp();
    } else {
        console.error("Błąd krytyczny: funkcja initApp() nie jest zdefiniowana w script-core.js!");
    }
}

console.log("Plik main.js (EazyKoszt 0.25.06.05.1) załadowany.");
