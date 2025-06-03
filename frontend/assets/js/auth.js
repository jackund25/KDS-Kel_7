// File: assets/js/auth.js

// Ganti dengan URL dan anon key dari proyek Supabase kamu
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper: tampilkan loading
function showLoading(message) {
    document.getElementById('loadingOverlay').style.display = 'flex';
    document.querySelector('#loadingOverlay p').textContent = message;
}

// Helper: sembunyikan loading
function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// Helper: tampilkan notifikasi
function showToast(type, message) {
    const toast = document.getElementById(`${type}Toast`);
    toast.querySelector('.toast-message').textContent = message;
    toast.style.display = 'flex';
    setTimeout(() => toast.style.display = 'none', 4000);
}

// === LOGIN LOGIC ===
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading('Signing you in...');
        const email = loginForm.email.value;
        const password = loginForm.password.value;

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        hideLoading();

        if (error) {
            showToast('error', error.message);
        } else {
            showToast('success', 'Login successful!');
            setTimeout(() => window.location.href = 'upload.html', 1500);
        }
    });
}

// === REGISTER LOGIC ===
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading('Creating your account...');

        const email = registerForm.email.value;
        const password = registerForm.password.value;
        const confirmPassword = registerForm.confirmPassword.value;

        if (password !== confirmPassword) {
            hideLoading();
            showToast('error', 'Passwords do not match!');
            return;
        }

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    first_name: registerForm.firstName.value,
                    last_name: registerForm.lastName.value,
                    institution: registerForm.institution.value || null
                }
            }
        });

        hideLoading();

        if (error) {
            showToast('error', error.message);
        } else {
            showToast('success', 'Registration successful! Please check your email.');
            setTimeout(() => window.location.href = 'login.html', 2000);
        }
    });
}

// === Toggle Password Visibility ===
document.querySelectorAll('.password-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
        const input = toggle.previousElementSibling;
        input.type = input.type === 'password' ? 'text' : 'password';
        toggle.innerHTML = `<i class="fas fa-${input.type === 'password' ? 'eye' : 'eye-slash'}"></i>`;
    });
});
