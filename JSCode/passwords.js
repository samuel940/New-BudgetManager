const passwordField = document.getElementById("password");
const toggleButton = document.getElementById("togglePassword");

toggleButton.addEventListener("click", () => {
    if (passwordField.type === "password") {
    passwordField.type = "text";
    toggleButton.textContent = "Hide";
    } else {
    passwordField.type = "password";
    toggleButton.textContent = "Show";
    }
});