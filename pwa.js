// ─── webmcu-ai pwa06 shared client script ────────────────────────────────────
// Loaded by every repo's index.html via:
//   <script src="https://webmcu-ai.github.io/pwa06/pwa.js"></script>
// Each repo also needs its own sw.js (same-origin requirement).
// ─────────────────────────────────────────────────────────────────────────────

const myPwa06HubUrl   = "https://webmcu-ai.github.io/pwa/";
const myPwa06Salt     = "webmcu_pwa06_2026";
const myPwa06RepoName = (function() {
    // Derive repo name from current page URL
    // e.g. https://webmcu-ai.github.io/torchjs/ → "torchjs"
    const myPath = window.location.pathname.split('/').filter(Boolean);
    return myPath[0] || "";
})();

let myPwa06DeferredPrompt = null;

// ─── Token helpers ────────────────────────────────────────────────────────────

function myPwa06TokenKey() {
    return `_pwa06_paid_${myPwa06RepoName}`;
}

function myPwa06IsPaid() {
    try {
        const myVal = localStorage.getItem(myPwa06TokenKey());
        if (!myVal) return false;
        return atob(myVal).includes(`_${myPwa06Salt}`);
    } catch(e) { return false; }
}

function myPwa06StorePaidToken(token) {
    // token comes from hub via ?pwa_token= param; store it locally
    localStorage.setItem(myPwa06TokenKey(), token);
}

// ─── Handle return from hub (pwa_token in URL) ────────────────────────────────

function myPwa06HandleReturn() {
    const myParams = new URLSearchParams(window.location.search);
    const myToken  = myParams.get('pwa_token');
    if (!myToken) return false;

    myPwa06StorePaidToken(myToken);
    // Clean the URL without reloading
    const myClean = window.location.pathname;
    window.history.replaceState({}, document.title, myClean);
    return true;
}

// ─── Button logic ─────────────────────────────────────────────────────────────

function myPwa06UpdateBtn() {
    const myBtn = document.getElementById('myAppBtn');
    if (!myBtn) return;

    const myIsStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (myIsStandalone) {
        // Running as installed PWA — hide the button entirely
        myBtn.style.display = 'none';
        return;
    }

    myBtn.style.display = 'block';

    if (!myPwa06IsPaid()) {
        myBtn.textContent = "Install App ($6) →";
    } else if (myPwa06DeferredPrompt) {
        myBtn.textContent = "Install App ↓";
    } else {
        // Paid but install prompt not available (already dismissed, or not eligible)
        myBtn.textContent = "App Purchased ✓";
        myBtn.style.opacity = "0.6";
        myBtn.style.cursor  = "default";
    }
}

// Called by onclick="myHandleAppAction()" in each repo's index.html
async function myHandleAppAction() {
    if (!myPwa06IsPaid()) {
        // Send user to the hub, passing this page's URL as origin
        const myOrigin = encodeURIComponent(window.location.href.split('?')[0]);
        window.location.href = `${myPwa06HubUrl}?origin=${myOrigin}`;
        return;
    }

    if (myPwa06DeferredPrompt) {
        myPwa06DeferredPrompt.prompt();
        const { outcome } = await myPwa06DeferredPrompt.userChoice;
        myPwa06DeferredPrompt = null;
        if (outcome === 'accepted') {
            myPwa06UpdateBtn();
        }
    }
}

// ─── Service worker registration ──────────────────────────────────────────────

function myPwa06RegisterSW() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
            .catch(err => console.warn('pwa06: SW registration failed', err));
    }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    myPwa06DeferredPrompt = e;
    myPwa06UpdateBtn();
});

window.addEventListener('appinstalled', () => {
    myPwa06DeferredPrompt = null;
    myPwa06UpdateBtn();
});

window.addEventListener('load', () => {
    // Check for token returned from hub
    const myJustPaid = myPwa06HandleReturn();

    myPwa06UpdateBtn();
    myPwa06RegisterSW();

    if (myJustPaid) {
        // Small delay so SW can register before prompt fires
        setTimeout(() => myPwa06UpdateBtn(), 500);
    }
});
