// === TOAST ===
function showToast(type, message) {
    const toast = document.getElementById(`${type}Toast`);
    if (!toast) return;

    toast.querySelector('.toast-message').textContent = message;
    toast.style.display = 'flex';

    // Auto close after 4s
    setTimeout(() => toast.style.display = 'none', 4000);
}

// === LOADING OVERLAY ===
function showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;

    overlay.style.display = 'flex';
    overlay.querySelector('p').textContent = message;
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;

    overlay.style.display = 'none';
}

// === REDIRECT ===
function redirectAfter(ms, path) {
    setTimeout(() => {
        window.location.href = path;
    }, ms);
}

// === SESSION USER ===
async function getUserSession(supabase) {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
        console.error('Error getting session:', error.message);
        return null;
    }
    return data?.session?.user ?? null;
}

// === CAPITALIZE NAMES ===
function capitalizeWords(str) {
    return str.replace(/\b\w/g, char => char.toUpperCase());
}

// === TEXT TRUNCATE ===
function truncate(text, maxLength = 50) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}
