
    

    // -------------------------------
    // COLLAPSIBLE SECTIONS
    // -------------------------------
    document.querySelectorAll(".group-title").forEach(title => {
        title.addEventListener("click", () => {
            const content = title.nextElementSibling;
            if(content.style.display === "flex") {
                content.style.display = "none";
            } else {
                content.style.display = "flex";
            }
        });
    });

    // -------------------------------
    // HELPER FUNCTION
    // -------------------------------
    function updateProfile(data) {
        fetch(`/api/user/profile/${userId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        })
        .then(res => res.json())
        .then(res => alert(res.message));
    }

    // -------------------------------
    // 1. PROFILE SETTINGS
    // -------------------------------
    document.getElementById("edit-name")?.addEventListener("click", () => {
        const newName = prompt("Enter new name:");
        if(newName) updateProfile({ fullname: newName });
    });

    document.getElementById("edit-email")?.addEventListener("click", () => {
        const newEmail = prompt("Enter new email:");
        if(newEmail) updateProfile({ gmail: newEmail });
    });

    document.getElementById("edit-phone")?.addEventListener("click", () => {
        const newMobile = prompt("Enter new phone number:");
        if(newMobile) updateProfile({ mobile: newMobile });
    });

    document.getElementById("change-password")?.addEventListener("click", () => {
        const oldPass = prompt("Enter old password:");
        const newPass = prompt("Enter new password:");
        if(oldPass && newPass){
            fetch(`/api/user/change-password/${userId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ old_password: oldPass, new_password: newPass })
            }).then(res => res.json()).then(res => alert(res.message));
        }
    });

    document.getElementById("change-profile-picture")?.addEventListener("click", () => {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.onchange = () => {
            const file = fileInput.files[0];
            const formData = new FormData();
            formData.append("profile_picture", file);

            fetch(`/api/user/profile-picture/${userId}`, {
                method: "POST",
                body: formData
            }).then(res => res.json()).then(res => alert(res.message));
        };
        fileInput.click();
    });

    // -------------------------------
    // 2. NOTIFICATION SETTINGS
    // -------------------------------
    document.getElementById("enable-notifications")?.addEventListener("change", e => {
        updateProfile({ enable_notifications: e.target.checked });
    });
    document.getElementById("fire-alerts")?.addEventListener("change", e => {
        updateProfile({ fire_alerts: e.target.checked });
    });
    document.getElementById("sms-alerts")?.addEventListener("change", e => {
        updateProfile({ sms_alerts: e.target.checked });
    });
    document.getElementById("sound-vibration")?.addEventListener("change", e => {
        updateProfile({ sound_vibration: e.target.checked });
    });

    // -------------------------------
    // 3. LOCATION SETTINGS
    // -------------------------------
    document.getElementById("allow-gps")?.addEventListener("change", e => {
        if(e.target.checked){
            navigator.geolocation.getCurrentPosition(pos => {
                updateProfile({ gps_enabled: true, coords: { lat: pos.coords.latitude, lng: pos.coords.longitude }});
            });
        } else {
            updateProfile({ gps_enabled: false });
        }
    });

    document.getElementById("set-home-address")?.addEventListener("click", () => {
        const address = prompt("Enter your home address:");
        if(address) updateProfile({ home_address: address });
    });

    document.getElementById("set-default-location")?.addEventListener("click", () => {
        const address = prompt("Enter default map location:");
        if(address) updateProfile({ default_map_location: address });
    });

    // -------------------------------
    // 4. APPEARANCE SETTINGS
    // -------------------------------
    document.getElementById("dark-mode")?.addEventListener("change", e => {
        document.body.classList.toggle("dark-mode", e.target.checked);
    });

    document.getElementById("font-size")?.addEventListener("click", () => {
        const size = prompt("Enter font size (px):");
        if(size) document.body.style.fontSize = size + "px";
    });

    document.getElementById("high-contrast")?.addEventListener("change", e => {
        document.body.classList.toggle("high-contrast", e.target.checked);
    });

    // -------------------------------
    // 5. PRIVACY & SECURITY
    // -------------------------------
    document.getElementById("clear-history")?.addEventListener("click", () => {
        fetch(`/api/alerts/user/${userId}`, { method: "DELETE" }).then(()=>alert("History cleared"));
    });
    document.getElementById("logout")?.addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "login.html";
    });
    document.getElementById("delete-account")?.addEventListener("click", () => {
        if(confirm("Are you sure you want to delete your account?")){
            fetch(`/api/user/${userId}`, { method: "DELETE" }).then(()=>window.location.href="login.html");
        }
    });

    // -------------------------------
    // 6. HELP & SUPPORT
    // -------------------------------
    document.getElementById("app-version")?.addEventListener("click", () => alert("S.U.N.O.G v1.0"));
    document.getElementById("contact-support")?.addEventListener("click", () => window.location.href="mailto:support@sunogapp.com");
    document.getElementById("faq")?.addEventListener("click", () => window.location.href="faq.html");
    document.getElementById("about")?.addEventListener("click", () => alert("S.U.N.O.G - Fire Incident Reporting System"));

    // -------------------------------
    // 7. FIRE SAFETY TOOLS
    // -------------------------------
    document.getElementById("download-contacts")?.addEventListener("click", () => {
        fetch(`/api/fire/contacts/pdf`).then(res => res.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = "contacts.pdf"; a.click();
        });
    });
    document.getElementById("emergency-numbers")?.addEventListener("click", () => alert("Call 911 or local emergency numbers"));
    document.getElementById("fire-safety-tips")?.addEventListener("click", () => alert("1. Don't panic\n2. Alert neighbors\n3. Call authorities"));
    document.getElementById("family-group")?.addEventListener("click", () => alert("Open Family Emergency Group"));
    document.getElementById("favorite-stations")?.addEventListener("click", () => alert("Show Favorite Fire Stations"));

