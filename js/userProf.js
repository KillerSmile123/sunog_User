document.addEventListener("DOMContentLoaded", function () {
    const name = localStorage.getItem("fullName") || "Guest User";
    const address = localStorage.getItem("address") || "No address provided";
    const gmail = localStorage.getItem("gmail") || "No email provided";
    const mobile = localStorage.getItem("mobile") || "No mobile number";

    document.getElementById("profileName").textContent = name;
    document.getElementById("profileAddress").textContent = address;
    document.getElementById("profileGmail").textContent = gmail;
    document.getElementById("profileMobile").textContent = mobile;

    // Back to dashboard button
    document.getElementById("backBtn").addEventListener("click", () => {
        window.location.href = "userDashboard.html";
    });
});
