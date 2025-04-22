/**
 * admin-actualites.js
 * Script principal pour la gestion des actualités
 * Ce fichier gère le chargement, l'ajout, la modification et la suppression des actualités
 * ainsi que le filtrage, la pagination et l'affichage des détails
 */

// ======================================
// VARIABLES GLOBALES
// ======================================
const API_BASE_URL = "https://backendestrappes.fr/actualites";
let token = localStorage.getItem("adminToken");
let currentPage = 1;
let totalPages = 1;
let currentNews = null;
let currentHashtags = [];

// ======================================
// INITIALISATION ET AUTHENTIFICATION
// ======================================

/**
 * Fonction exécutée au chargement de la page
 * Initialise tous les événements et vérifie l'authentification
 */
document.addEventListener("DOMContentLoaded", function () {
  if (checkAdminToken()) {
    document.querySelector(".container").style.display = "block";

    // Écouteur d'événements pour le filtre de statut
    document.getElementById("statusFilter").addEventListener("change", loadNews);

    // Écouteurs d'événements pour les formulaires
    document.getElementById("newsForm").addEventListener("submit", handleNewsSubmit);
    document.getElementById("logoutBtn").addEventListener("click", logout);

    // Prévisualisation de l'image lors du changement
    document.getElementById("image").addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          const imagePreview = document.getElementById("imagePreview");
          imagePreview.src = e.target.result;
          imagePreview.style.display = "block";
        };
        reader.readAsDataURL(file);
      }
    });

    // Gestion des hashtags
    document.getElementById("add-hashtag-button").addEventListener("click", addHashtag);
    document.getElementById("hashtag-input").addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        addHashtag();
      }
    });

    // Gestion des clics en dehors des modals pour les fermer
    window.onclick = function (event) {
      const modals = document.querySelectorAll(".modal");
      modals.forEach((modal) => {
        if (event.target === modal) {
          modal.style.display = "none";
        }
      });
    };

    loadNews();

    // Gestion des accès aux liens de la navbar
    setupNavbarAccess();
  }
});

/**
 * Vérifie si l'utilisateur est connecté avec un token d'administrateur valide
 * @return {boolean} true si le token est valide, false sinon
 */
function checkAdminToken() {
  const adminToken = localStorage.getItem("adminToken");
  if (!adminToken) {
    alert("Vous devez être connecté en tant qu'administrateur pour accéder à cette page.");
    window.location.href = "Admin.html";
    return false;
  }
  try {
    const decodedToken = jwt_decode(adminToken);
    const role = decodedToken.role;
    // On autorise les rôles admin, superadmin et adminCom
    if (role !== "superadmin" && role !== "adminCom") {
      alert("Accès refusé : rôle insuffisant.");
      window.location.href = "Admin.html";
      return false;
    }
    return true;
  } catch (error) {
    console.error("Erreur lors du décodage du token :", error);
    alert("Token invalide ou expiré.");
    window.location.href = "Admin.html";
    return false;
  }
}

/**
 * Déconnecte l'utilisateur en supprimant le token et redirigeant vers la page de connexion
 */
function logout() {
  localStorage.removeItem("adminToken");
  window.location.href = "Admin.html";
}

/**
 * Configure les accès aux liens de la navbar selon le rôle de l'utilisateur
 */
function setupNavbarAccess() {
  const token = localStorage.getItem("adminToken");
  const decoded = jwt_decode(token);
  const role = decoded.role;

  document.querySelectorAll(".restricted-link").forEach((link) => {
    const allowedRoles = link.getAttribute("data-roles");
    if (!allowedRoles) return; // pas de restriction

    const allowedList = allowedRoles.split(",").map((r) => r.trim());
    if (!allowedList.includes(role)) {
      link.classList.add("disabled-link");
      link.addEventListener("click", function (e) {
        e.preventDefault();
        alert("Accès réservé aux rôles : " + allowedList.join(", "));
      });
    }
  });
}

// ======================================
// GESTION DES HASHTAGS
// ======================================

/**
 * Ajoute un hashtag à la liste des hashtags courants
 */
function addHashtag() {
  const hashtagInput = document.getElementById("hashtag-input");
  const hashtag = hashtagInput.value.trim();

  if (hashtag && !currentHashtags.includes(hashtag)) {
    currentHashtags.push(hashtag);
    renderHashtags();
    hashtagInput.value = "";
  }

  // Mettre à jour le champ caché pour le formulaire
  document.getElementById("hashtags").value = JSON.stringify(currentHashtags);
}

/**
 * Supprime un hashtag de la liste des hashtags courants
 * @param {number} index - Index du hashtag à supprimer
 */
function removeHashtag(index) {
  currentHashtags.splice(index, 1);
  renderHashtags();

  // Mettre à jour le champ caché pour le formulaire
  document.getElementById("hashtags").value = JSON.stringify(currentHashtags);
}

/**
 * Affiche les hashtags courants dans le conteneur des hashtags
 */
function renderHashtags() {
  const container = document.getElementById("hashtags-container");
  container.innerHTML = "";

  currentHashtags.forEach((hashtag, index) => {
    const hashtagElement = document.createElement("span");
    hashtagElement.className = "hashtag";
    hashtagElement.textContent = `#${hashtag}`;

    // Ajouter le bouton de suppression
    const removeButton = document.createElement("span");
    removeButton.textContent = " ×";
    removeButton.style.cursor = "pointer";
    removeButton.style.marginLeft = "3px";
    removeButton.onclick = () => removeHashtag(index);

    hashtagElement.appendChild(removeButton);
    container.appendChild(hashtagElement);
  });
}

// ======================================
// CHARGEMENT ET FILTRAGE DES DONNÉES
// ======================================

/**
 * Charge les actualités depuis le serveur
 */
async function loadNews() {
  if (!token) return;

  showLoading(true);

  try {
    const statusFilter = document.getElementById("statusFilter").value;
    const url = new URL(`${API_BASE_URL}/api/news`);

    if (statusFilter) {
      url.searchParams.append('status', statusFilter);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      // Token expiré ou invalide
      localStorage.removeItem("adminToken");
      token = null;
      window.location.href = "Admin.html";
      return;
    }

    const data = await response.json();

    if (response.ok) {
      // Vérifier la structure de la réponse et adapter en conséquence
      const newsList = Array.isArray(data) ? data : data.news || [];

      renderNews(newsList);

      // Si la pagination est fournie dans la réponse
      if (data.total && data.limit) {
        totalPages = Math.ceil(data.total / data.limit);
      } else {
        // Sinon, on utilise une seule page
        totalPages = 1;
      }

      renderPagination();
    } else {
      showAlert(data.message || "Erreur lors du chargement des actualités", "error");
    }
  } catch (error) {
    console.error("Erreur de chargement:", error);
    showAlert("Erreur de connexion au serveur", "error");
  } finally {
    showLoading(false);
  }
}

// ======================================
// AFFICHAGE DES DONNÉES
// ======================================

/**
 * Affiche les actualités dans le tableau
 * @param {Array} newsList - Liste des actualités à afficher
 */
function renderNews(newsList) {
  const tableBody = document.getElementById("newsTableBody");
  tableBody.innerHTML = "";

  // S'assurer que newsList est un tableau
  if (!Array.isArray(newsList)) {
    console.error("La liste des actualités n'est pas un tableau:", newsList);
    newsList = [];
  }

  if (newsList.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="8" style="text-align: center;">Aucune actualité trouvée</td>';
    tableBody.appendChild(row);
    return;
  }

  newsList.forEach((news) => {
    const row = document.createElement("tr");
    const newsId = news._id || news.id; // Accepter les deux formats d'ID
    row.dataset.id = newsId;

    // Formater la date (utiliser une valeur par défaut si undefined)
    const createdDate = news.createdAt
      ? new Date(news.createdAt).toLocaleDateString("fr-FR")
      : "Date inconnue";

    // Gestion des statuts (utiliser une valeur par défaut si undefined)
    const status = news.status || "attente";
    const statusClass = `status-${status.toLowerCase()}`;

    // Gestion des hashtags
    const hashtagsHTML =
      Array.isArray(news.hashtags) && news.hashtags.length > 0
        ? news.hashtags
            .map((tag) => `<span class="hashtag">#${tag}</span>`)
            .join("")
        : "<span>Aucun hashtag</span>";

    row.innerHTML = `
      <td>${news.title}</td>
      <td>
          ${
            news.image && (news.image.data || news.image)
              ? `<img src="${API_BASE_URL}/api/news/${newsId}/image" alt="Image" class="thumbnail">`
              : "<span>Aucune image</span>"
          }
      </td>
      <td class="description-cell" title="${news.description}">${news.description}</td>
      <td class="hashtags-cell">${hashtagsHTML}</td>
      <td><span class="status-badge ${statusClass}">${status}</span></td>
      <td>${createdDate}</td>
      <td>${news.mediaUrl || "<span>Aucune URL</span>"}</td> <!-- Colonne pour le mediaUrl -->
      <td>
          <button onclick="editNews('${newsId}')" class="btn btn-warning">Modifier</button>
          <button onclick="deleteNews('${newsId}')" class="btn btn-danger">Supprimer</button>
      </td>
    `;

    tableBody.appendChild(row);
  });
}

// ======================================
// GESTION DE LA PAGINATION
// ======================================

/**
 * Crée la pagination
 */
function renderPagination() {
  const paginationContainer = document.getElementById("pagination");
  paginationContainer.innerHTML = "";

  // N'afficher la pagination que s'il y a plus d'une page
  if (totalPages <= 1) {
    return;
  }

  // Bouton précédent
  const prevButton = document.createElement("button");
  prevButton.innerText = "«";
  prevButton.disabled = currentPage === 1;
  prevButton.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      loadNews();
    }
  };
  paginationContainer.appendChild(prevButton);

  // Pages
  for (let i = 1; i <= totalPages; i++) {
    const pageButton = document.createElement("button");
    pageButton.innerText = i;
    pageButton.className = currentPage === i ? "active" : "";
    pageButton.onclick = () => {
      currentPage = i;
      loadNews();
    };
    paginationContainer.appendChild(pageButton);
  }

  // Bouton suivant
  const nextButton = document.createElement("button");
  nextButton.innerText = "»";
  nextButton.disabled = currentPage === totalPages;
  nextButton.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadNews();
    }
  };
  paginationContainer.appendChild(nextButton);
}

// ======================================
// GESTION DES MODALS D'AJOUT/MODIFICATION D'ACTUALITÉ
// ======================================

/**
 * Affiche la modale d'ajout/modification d'actualité
 */
function showAddNewsModal() {
  document.getElementById("modalTitle").textContent = "Ajouter une actualité";
  document.getElementById("newsForm").reset();
  document.getElementById("newsId").value = "";
  document.getElementById("imagePreview").style.display = "none";
  currentHashtags = [];
  renderHashtags();
  document.getElementById("hashtags").value = JSON.stringify(currentHashtags);
  currentNews = null;
  document.getElementById("newsModal").style.display = "block";
}

/**
 * Ferme la modale d'actualité
 */
function closeNewsModal() {
  document.getElementById("newsModal").style.display = "none";
}

/**
 * Modifie une actualité
 * @param {string} id - ID de l'actualité à modifier
 */
async function editNews(id) {
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/news/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const news = await response.json();
      currentNews = news;

      document.getElementById("modalTitle").textContent = "Modifier une actualité";
      document.getElementById("newsId").value = news._id || news.id;
      document.getElementById("title").value = news.title || "";
      document.getElementById("description").value = news.description || "";
      document.getElementById("mediaUrl").value = news.mediaUrl || "";
      document.getElementById("status").value = news.status || "attente";

      // Correction ici pour les hashtags
      if (Array.isArray(news.hashtags)) {
        currentHashtags = [...news.hashtags];
      } else if (typeof news.hashtags === 'string') {
        try {
          // Au cas où les hashtags seraient stockés comme une chaîne JSON
          currentHashtags = JSON.parse(news.hashtags);
        } catch (e) {
          // Si ce n'est pas un JSON valide, considérer comme un tableau avec un seul élément
          currentHashtags = [news.hashtags];
        }
      } else {
        currentHashtags = [];
      }

      renderHashtags();
      document.getElementById("hashtags").value = JSON.stringify(currentHashtags);

      // Prévisualiser l'image si elle existe
      if (news.image && (news.image.data || news.image)) {
        const imagePreview = document.getElementById("imagePreview");
        imagePreview.src = `${API_BASE_URL}/api/news/${id}/image`;
        imagePreview.style.display = "block";
      } else {
        document.getElementById("imagePreview").style.display = "none";
      }

      document.getElementById("newsModal").style.display = "block";
    } else {
      const error = await response.json();
      showAlert(error.message || "Erreur lors du chargement de l'actualité", "error");
    }
  } catch (error) {
    console.error("Erreur:", error);
    showAlert("Erreur de connexion au serveur", "error");
  }
}

/**
 * Supprime une actualité
 * @param {string} id - ID de l'actualité à supprimer
 */
async function deleteNews(id) {
  if (!token) return;

  if (!confirm("Êtes-vous sûr de vouloir supprimer cette actualité ?")) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/news/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      showAlert("Actualité supprimée avec succès", "success");
      loadNews();
    } else {
      const error = await response.json();
      showAlert(error.message || "Erreur lors de la suppression", "error");
    }
  } catch (error) {
    console.error("Erreur:", error);
    showAlert("Erreur de connexion au serveur", "error");
  }
}

// ======================================
// GESTION DE LA SOUMISSION DU FORMULAIRE D'ACTUALITÉ
// ======================================

/**
 * Gère la soumission du formulaire d'actualité
 * @param {Event} e - Événement de soumission du formulaire
 */
async function handleNewsSubmit(e) {
  e.preventDefault();

  if (!token) return;

  const formData = new FormData();
  const newsId = document.getElementById("newsId").value;
  const isEditing = newsId !== "";

  formData.append("title", document.getElementById("title").value);
  formData.append("description", document.getElementById("description").value);
  formData.append("mediaUrl", document.getElementById("mediaUrl").value);
  formData.append("status", document.getElementById("status").value);

  // S'assurer que les hashtags sont bien un tableau avant de les sérialiser
  formData.append("hashtags", JSON.stringify(currentHashtags));

  const imageFile = document.getElementById("image").files[0];
  if (imageFile) {
    formData.append("image", imageFile);
  }

  try {
    const url = isEditing
      ? `${API_BASE_URL}/api/admin/news/${newsId}`
      : `${API_BASE_URL}/api/admin/news`;

    const method = isEditing ? "PUT" : "POST";

    const response = await fetch(url, {
      method: method,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (response.ok) {
      showAlert(`Actualité ${isEditing ? "modifiée" : "ajoutée"} avec succès`, "success");
      closeNewsModal();
      loadNews();
    } else {
      const error = await response.json();
      showAlert(error.message || `Erreur lors de ${isEditing ? "la modification" : "l'ajout"} de l'actualité`, "error");
    }
  } catch (error) {
    console.error("Erreur:", error);
    showAlert("Erreur de connexion au serveur", "error");
  }
}

// ======================================
// GESTION DES ALERTES
// ======================================

/**
 * Affiche une alerte
 * @param {string} message - Message de l'alerte
 * @param {string} type - Type d'alerte (success ou error)
 */
function showAlert(message, type) {
  const alertSuccess = document.getElementById("alertSuccess");
  const alertError = document.getElementById("alertError");

  if (type === "success") {
    alertSuccess.textContent = message;
    alertSuccess.style.display = "block";
    setTimeout(() => {
      alertSuccess.style.display = "none";
    }, 3000);
  } else {
    alertError.textContent = message;
    alertError.style.display = "block";
    setTimeout(() => {
      alertError.style.display = "none";
    }, 3000);
  }
}

// ======================================
// GESTION DE L'AFFICHAGE/MASQUAGE DU CHARGEMENT
// ======================================

/**
 * Affiche ou masque l'indicateur de chargement
 * @param {boolean} show - True pour afficher, false pour masquer
 */
function showLoading(show) {
  document.getElementById("loading").style.display = show ? "block" : "none";
}
