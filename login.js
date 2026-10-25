// Login Page Logic
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    const alertDiv = document.getElementById("loginAlert");
    const loginBtn = document.getElementById("loginBtn");

    // If already logged in, redirect to main page
    fetch("/api/me")
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                window.location.href = "/index.html";
            }
        })
        .catch(() => {});

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        alertDiv.innerHTML = "";

        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;

        if (!username || !password) {
            alertDiv.innerHTML = `
                <div class="alert alert-warning">
                    <span class="material-symbols-outlined">warning</span>
                    <span>Please enter both username and password.</span>
                </div>
            `;
            return;
        }

        // Disable button during request
        loginBtn.disabled = true;
        loginBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:1.1rem;">hourglass_empty</span> Signing in...`;

        try {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });
            const result = await res.json();

            if (!result.success) {
                alertDiv.innerHTML = `
                    <div class="alert alert-error">
                        <span class="material-symbols-outlined">error</span>
                        <span>${result.error || "Login failed."}</span>
                    </div>
                `;
                loginBtn.disabled = false;
                loginBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:1.1rem;">login</span> Sign In`;
                return;
            }

            alertDiv.innerHTML = `
                <div class="alert alert-success">
                    <span class="material-symbols-outlined">check_circle</span>
                    <span>${result.message} Redirecting...</span>
                </div>
            `;

            setTimeout(() => {
                window.location.href = "/index.html";
            }, 800);

        } catch (err) {
            alertDiv.innerHTML = `
                <div class="alert alert-error">
                    <span class="material-symbols-outlined">error</span>
                    <span>Server error: ${err.message}</span>
                </div>
            `;
            loginBtn.disabled = false;
            loginBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:1.1rem;">login</span> Sign In`;
        }
    });
});
