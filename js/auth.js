// Plik: auth.js
// Opis: Logika uwierzytelniania dla strony login.html.
//       Obsługuje logowanie, rejestrację i przekierowanie do aplikacji.
// Wersja aplikacji: EazyKoszt 0.25.06.05.1

document.addEventListener('DOMContentLoaded', () => {

    // Sprawdzenie, czy Firebase jest dostępny
    if (typeof firebase === 'undefined' || typeof firebaseAuth === 'undefined') {
        console.error("[Auth] Firebase nie jest załadowany. Strona nie będzie działać poprawnie.");
        displayAuthError("Błąd krytyczny: Nie można połączyć się z usługą uwierzytelniania.");
        return;
    }

    // --- SEKCJA 1: POBIERANIE ELEMENTÓW DOM ---
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const authErrorMessage = document.getElementById('auth-error-message');

    if (!loginForm || !registerForm || !showRegisterLink || !showLoginLink || !authErrorMessage) {
        console.error("[Auth] Nie znaleziono wszystkich wymaganych elementów formularza w DOM.");
        return;
    }

    // --- SEKCJA 2: FUNKCJE POMOCNICZE ---

    /**
     * Wyświetla komunikat o błędzie w dedykowanym kontenerze.
     * @param {string} message Komunikat do wyświetlenia.
     */
    const displayAuthError = (message) => {
        authErrorMessage.textContent = message;
        authErrorMessage.style.display = 'block';
    };

    /**
     * Ukrywa komunikat o błędzie.
     */
    const hideAuthError = () => {
        authErrorMessage.textContent = '';
        authErrorMessage.style.display = 'none';
    };

    /**
     * Tłumaczy kody błędów Firebase na zrozumiałe komunikaty.
     * @param {string} errorCode Kod błędu z Firebase.
     * @returns {string} Komunikat dla użytkownika.
     */
    const translateFirebaseErrorCode = (errorCode) => {
        switch (errorCode) {
            case 'auth/user-not-found':
                return 'Nie znaleziono użytkownika o podanym adresie email.';
            case 'auth/wrong-password':
                return 'Nieprawidłowe hasło. Spróbuj ponownie.';
            case 'auth/invalid-email':
                return 'Podany adres email jest nieprawidłowy.';
            case 'auth/email-already-in-use':
                return 'Ten adres email jest już zarejestrowany. Spróbuj się zalogować.';
            case 'auth/weak-password':
                return 'Hasło jest zbyt słabe. Musi zawierać co najmniej 6 znaków.';
            default:
                console.warn(`[Auth] Nieznany kod błędu Firebase: ${errorCode}`);
                return 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.';
        }
    };

    // --- SEKCJA 3: LOGIKA UWIERZYTELNIANIA ---

    // Główny listener sprawdzający stan zalogowania
    firebaseAuth.onAuthStateChanged(user => {
        if (user) {
            // Jeśli użytkownik jest zalogowany, przekieruj go do głównej aplikacji
            console.log(`[Auth] Użytkownik ${user.email} jest zalogowany. Przekierowanie do index.html...`);
            window.location.href = 'index.html';
        } else {
            // Jeśli użytkownik nie jest zalogowany, upewnij się, że jest na stronie logowania
            console.log("[Auth] Brak zalogowanego użytkownika.");
        }
    });

    // Obsługa formularza logowania
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        hideAuthError();

        const email = loginForm['login-email'].value;
        const password = loginForm['login-password'].value;

        firebaseAuth.signInWithEmailAndPassword(email, password)
            .then(userCredential => {
                console.log(`[Auth] Pomyślnie zalogowano jako: ${userCredential.user.email}`);
                // Przekierowanie nastąpi automatycznie dzięki onAuthStateChanged
            })
            .catch(error => {
                console.error("[Auth] Błąd logowania:", error.code, error.message);
                displayAuthError(translateFirebaseErrorCode(error.code));
            });
    });

    // Obsługa formularza rejestracji
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        hideAuthError();

        const email = registerForm['register-email'].value;
        const password = registerForm['register-password'].value;
        const passwordConfirm = registerForm['register-password-confirm'].value;

        if (password !== passwordConfirm) {
            displayAuthError('Hasła nie są identyczne.');
            return;
        }

        firebaseAuth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                console.log(`[Auth] Pomyślnie zarejestrowano i zalogowano jako: ${userCredential.user.email}`);
                // Przekierowanie nastąpi automatycznie dzięki onAuthStateChanged
            })
            .catch(error => {
                console.error("[Auth] Błąd rejestracji:", error.code, error.message);
                displayAuthError(translateFirebaseErrorCode(error.code));
            });
    });

    // --- SEKCJA 4: PRZEŁĄCZANIE WIDOKÓW FORMULARZA ---

    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        hideAuthError();
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        hideAuthError();
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
    });

});

console.log("Plik auth.js (EazyKoszt 0.25.06.05.1) załadowany.");
