// === Mobile Nav Toggle ===
const toggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');

if (toggle && navMenu) {
    toggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        toggle.classList.toggle('active');
    });
}

// === Smooth Scroll ===
document.querySelectorAll('a.nav-link[href^="#"]').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            window.scrollTo({
                top: target.offsetTop - 60,
                behavior: 'smooth'
            });
        }
    });
});

// === Active Link on Scroll ===
const sections = document.querySelectorAll("section[id]");
const navLinks = document.querySelectorAll(".nav-link");

window.addEventListener("scroll", () => {
    let current = "";

    sections.forEach(section => {
        const sectionTop = section.offsetTop - 70;
        if (pageYOffset >= sectionTop) {
            current = section.getAttribute("id");
        }
    });

    navLinks.forEach(link => {
        link.classList.remove("active");
        if (link.getAttribute("href") === `#${current}`) {
            link.classList.add("active");
        }
    });
});

// === Toast Close ===
document.querySelectorAll('.toast-close').forEach(button => {
    button.addEventListener('click', () => {
        const toast = button.closest('.toast');
        if (toast) toast.style.display = 'none';
    });
});

// === Hide toast after 4 seconds (optional fallback) ===
document.querySelectorAll('.toast').forEach(toast => {
    if (toast.style.display !== 'none') {
        setTimeout(() => {
            toast.style.display = 'none';
        }, 4000);
    }
});
