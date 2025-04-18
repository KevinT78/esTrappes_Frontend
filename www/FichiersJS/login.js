async function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const errorMessage = document.getElementById("errorMessage");

    errorMessage.textContent = ""; // Réinitialisation du message d'erreur

    try {
        const response = await fetch("https://backendestrappes.fr/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Erreur de connexion");
        }

        localStorage.setItem("adminToken", data.token); // Stocke le token
        // window.location.href = "admin-registrations.html"; 

        // Décodage du token pour vérifier le rôle
        const decodedToken = jwt_decode(data.token);
        const role = decodedToken.role;

        // Redirige en fonction du rôle
        if (role === "adminCom" || role === "superadmin") {
            window.location.href = "ActualitesAdmin.html"; // Redirige vers la page des actualités pour le rôle "Com"
        } else if (role === "admin") {
            window.location.href = "admin-registrations.html"; // Redirige vers la page d'administration pour le rôle "admin"
  
        } else {
            alert("Rôle non reconnu ou accès refusé.");
            window.location.href = "Admin.html"; // Redirige vers la page de connexion si le rôle n'est pas autorisé
        }

    } catch (error) {
        errorMessage.textContent = error.message;
    }
}
