/**
 * admin-employees.js
 * Script principal pour la gestion des employés
 * Ce fichier gère le chargement, l'ajout, la modification et la suppression des employés
 * ainsi que le filtrage, la pagination et l'affichage des détails
 */

// ======================================
// VARIABLES GLOBALES
// ======================================
let allEmployees = [];            // Stocke tous les employés récupérés du serveur
let currentPage = 1;              // Page actuelle pour la pagination
const limit = 10;                 // Nombre d'employés affichés par page
let sortOrder = 'asc';            // Ordre de tri (ascendant ou descendant)
let filteredEmployees = [];       // Stocke les employés après filtrage

// ======================================
// INITIALISATION ET AUTHENTIFICATION
// ======================================

/**
 * Fonction exécutée au chargement de la page
 * Initialise tous les événements et vérifie l'authentification
 */
window.onload = function () {
  // Vérifier l'authentification avant d'afficher le contenu
  if (checkAdminToken()) {
    document.querySelector(".container").style.display = "block";

    // Gestion du bouton de déconnexion
    document.getElementById("logoutBtn").addEventListener("click", logout);

    // Configuration des modals
    setupModals();

    // Gestion des accès aux liens de la navbar
    setupNavbarAccess();

    // Initialiser les écouteurs d'événements
    setupEventListeners();

    // Charger les employés
    loadEmployees();
  }
};

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
    if (role !== "admin" && role !== "superadmin") {
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
 * Configure les modals (fenêtres modales) pour la fermeture
 */
function setupModals() {
  const modals = document.querySelectorAll(".modal");
  modals.forEach((modal) => {
    const closeBtn = modal.querySelector(".close");
    closeBtn.onclick = () => {
      modal.style.display = "none";
    };
  });

  // Fermer les modals quand on clique en dehors
  window.onclick = function(event) {
    if (event.target.classList.contains("modal")) {
      event.target.style.display = "none";
    }
  };
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

/**
 * Initialise tous les écouteurs d'événements de la page
 */
function setupEventListeners() {
  // Écouteurs d'événements pour les filtres
  document.getElementById("searchInput").addEventListener("input", applyFilters);
  document.getElementById("contractStatusFilter").addEventListener("change", applyFilters);
  document.getElementById("positionFilter").addEventListener("change", applyFilters);

  // Écouteurs d'événements pour les formulaires
  document.getElementById("addEmployeeForm").addEventListener("submit", addEmployee);
  document.getElementById("editEmployeeForm").addEventListener("submit", updateEmployee);
  document.getElementById("recordSalaryForm").addEventListener("submit", recordSalary);

  // Écouteurs d'événements pour les champs de salaire
  document.getElementById("salaryType").addEventListener("change", function() {
    updateAddEmployeeSalaryFields(this.value);
  });

  document.getElementById("editSalaryType").addEventListener("change", function() {
    updateSalaryFields(this.value);
  });

  // Écouteurs pour les champs de salaire du formulaire d'édition
  document.getElementById("editMonthlySalary").addEventListener("input", function() {
    document.getElementById("editHourlyRate").value = "";
  });

  document.getElementById("editHourlyRate").addEventListener("input", function() {
    document.getElementById("editMonthlySalary").value = "";
  });
}

// ======================================
// GESTION DES ONGLETS
// ======================================

/**
 * Affiche un onglet et cache les autres
 * @param {string} tabId - L'ID de l'onglet à afficher
 */
function showTab(tabId) {
  // Cacher tous les onglets
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.add("hidden");
  });

  // Afficher l'onglet sélectionné
  document.getElementById(tabId).classList.remove("hidden");

  // Mettre à jour les boutons d'onglet
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.remove("active");
  });

  document.querySelector(`[onclick="showTab('${tabId}')"]`).classList.add("active");
}

// ======================================
// CHARGEMENT ET FILTRAGE DES DONNÉES
// ======================================

/**
 * Charge les employés depuis le serveur
 */
async function loadEmployees() {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append(
      "contractStatus",
      document.getElementById("contractStatusFilter").value
    );
    queryParams.append(
      "position",
      document.getElementById("positionFilter").value
    );

    const response = await fetch(
      `https://backendestrappes.fr/protected/employees?${queryParams}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
      }
    );

    if (!response.ok) throw new Error("Erreur lors du chargement des employés");

    allEmployees = await response.json();
    updatePositionFilter();    // Mettre à jour les options du filtre de position
    updatePositionsSelect();   // Mettre à jour les options du select de positions
    applyFilters();            // Appliquer les filtres par défaut
    updatePaginationControls(); // Mettre à jour les contrôles de pagination
  } catch (error) {
    console.error("Erreur de chargement des employés:", error);
    alert("Impossible de charger la liste des employés");
  }
}

/**
 * Met à jour le filtre de position avec les positions disponibles
 */
function updatePositionFilter() {
  const positionFilter = document.getElementById("positionFilter");
  const uniquePositions = new Set();

  // Collecter toutes les positions uniques
  allEmployees.forEach((employee) => {
    employee.positions.forEach((position) => {
      uniquePositions.add(position);
    });
  });

  // Mettre à jour les options du select
  positionFilter.innerHTML = '<option value="">Toutes les positions</option>';
  uniquePositions.forEach((position) => {
    const option = document.createElement("option");
    option.value = position;
    option.textContent = position;
    positionFilter.appendChild(option);
  });
}

/**
 * Change l'ordre de tri et applique les filtres
 * @param {string} field - Le champ sur lequel trier
 */
function toggleSort(field) {
  sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
  applyFilters();
}

/**
 * Applique les filtres aux employés et met à jour l'affichage
 */
function applyFilters() {
  const searchQuery = document
    .getElementById("searchInput")
    .value.trim()
    .toLowerCase();
  const contractStatus = document.getElementById("contractStatusFilter").value;
  const position = document.getElementById("positionFilter").value;

  // Filtrer les employés selon les critères
  filteredEmployees = allEmployees.filter((employee) => {
    const matchesSearch =
      !searchQuery ||
      employee.firstName.toLowerCase().includes(searchQuery) ||
      employee.lastName.toLowerCase().includes(searchQuery);
    const matchesContractStatus =
      !contractStatus || employee.contractStatus === contractStatus;
    const matchesPosition =
      !position ||
      employee.positions.some((pos) => pos.toLowerCase().includes(position.toLowerCase()));

    return matchesSearch && matchesContractStatus && matchesPosition;
  });

  // Trier les employés par nom
  filteredEmployees.sort((a, b) => {
    if (sortOrder === 'asc') {
      return a.lastName.localeCompare(b.lastName);
    } else {
      return b.lastName.localeCompare(a.lastName);
    }
  });

  // Paginer les résultats
  const startIndex = (currentPage - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

  // Afficher les employés et mettre à jour la pagination
  displayEmployees(paginatedEmployees);
  updatePaginationControls(filteredEmployees.length);
}

// ======================================
// AFFICHAGE DES DONNÉES
// ======================================

/**
 * Affiche les employés dans le tableau
 * @param {Array} employees - Liste des employés à afficher
 */
function displayEmployees(employees) {
  const tbody = document.getElementById("employeesTableBody");
  tbody.innerHTML = "";

  employees.forEach((employee) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${employee.lastName}</td>
      <td>${employee.firstName}</td>
      <td>${employee.contractStatus}</td>
      <td>${employee.positions.join(", ")}</td>
      <td class="action-buttons">
        <button onclick="paySalary('${employee._id}')" class="btn btn-success">Enregistrer un salaire</button>
        <button onclick="showEmployeeDetails('${employee._id}')" class="btn btn-info">Détails</button>
        <button onclick="editEmployee('${employee._id}')" class="btn btn-primary">Modifier</button>
        <button onclick="deleteEmployee('${employee._id}')" class="btn btn-danger">Supprimer</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ======================================
// GESTION DE LA PAGINATION
// ======================================

/**
 * Met à jour les contrôles de pagination
 * @param {number} filteredCount - Nombre d'employés filtrés
 */
function updatePaginationControls(filteredCount = null) {
  const pageInfo = document.getElementById("pageInfo");
  // Utiliser le nombre d'employés filtrés
  const count = filteredCount !== null ? filteredCount : filteredEmployees.length;
  const totalPages = Math.ceil(count / limit);

  // Assurer que currentPage ne dépasse pas le nombre total de pages
  if (currentPage > totalPages && totalPages > 0) {
    currentPage = totalPages;
  }

  pageInfo.innerHTML = `Page ${currentPage} sur ${totalPages}`;

  // Mettre à jour l'état des boutons
  const paginationButtons = document.querySelectorAll(".pagination-controls .btn-secondary");
  paginationButtons[0].disabled = currentPage === 1;                        // First page
  paginationButtons[1].disabled = currentPage === 1;                        // Previous page
  paginationButtons[2].disabled = currentPage === totalPages || totalPages === 0; // Next page
  paginationButtons[3].disabled = currentPage === totalPages || totalPages === 0; // Last page
}

/**
 * Aller à la première page
 */
function firstPage() {
  currentPage = 1;
  applyFilters();
}

/**
 * Aller à la page précédente
 */
function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    applyFilters();
  }
}

/**
 * Aller à la page suivante
 */
function nextPage() {
  const totalPages = Math.ceil(filteredEmployees.length / limit);

  if (currentPage < totalPages) {
    currentPage++;
    applyFilters();
  }
}

/**
 * Aller à la dernière page
 */
function lastPage() {
  currentPage = Math.ceil(filteredEmployees.length / limit);
  applyFilters();
}

// ======================================
// FORMATAGE DES DONNÉES
// ======================================

/**
 * Formate une date au format JJ/MM/AAAA
 * @param {string} dateString - Date à formater
 * @return {string} Date formatée
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// ======================================
// GESTION DES DÉTAILS D'UN EMPLOYÉ
// ======================================

/**
 * Affiche les détails d'un employé
 * @param {string} employeeId - ID de l'employé
 */
async function showEmployeeDetails(employeeId) {
  try {
    const response = await fetch(
      `https://backendestrappes.fr/protected/employees/${employeeId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
      }
    );

    if (!response.ok) throw new Error("Erreur lors du chargement des détails");

    const employee = await response.json();

    const content = document.getElementById("employeeDetailsContent");
    content.innerHTML = `
      <div><strong>Numéro de licence:</strong> ${employee.licenseNumber}</div>
      <div><strong>Prénom:</strong> ${employee.firstName}</div>
      <div><strong>Nom:</strong> ${employee.lastName}</div>
      <div><strong>Email:</strong> ${employee.email}</div>
      <div><strong>Téléphone:</strong> ${employee.phone}</div>
      <div><strong>Date de naissance:</strong> ${employee.birthDate}</div>
      <div><strong>Genre:</strong> ${employee.gender}</div>
      <div><strong>Positions:</strong> ${employee.positions.join(", ")}</div>
      <div><strong>Statut:</strong> ${employee.contractStatus}</div>
      <div><strong>Âge:</strong> ${employee.age}</div>
      ${employee.monthlySalary ? `<div><strong>Salaire mensuel:</strong> ${employee.monthlySalary}</div>` : ""}
      ${employee.hourlyRate ? `<div><strong>Taux horaire:</strong> ${employee.hourlyRate}</div>` : ""}
      <div><strong>Type de salaire:</strong> ${employee.salaryType ? employee.salaryType : "Non défini"}</div>
    `;

    // Charger l'historique des paiements
    await showPaymentHistory(employeeId);

    // Afficher le modal
    document.getElementById("employeeDetailsModal").style.display = "flex";
  } catch (error) {
    console.error("Erreur de chargement des détails:", error);
    alert("Impossible de charger les détails de l'employé");
  }
}

/**
 * Affiche l'historique des paiements d'un employé
 * @param {string} employeeId - ID de l'employé
 */
async function showPaymentHistory(employeeId) {
  const paymentHistoryBody = document.getElementById("paymentHistoryBody");
  paymentHistoryBody.innerHTML = "";

  try {
    const response = await fetch(
      `https://backendestrappes.fr/protected/employees/${employeeId}/salary`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
      }
    );

    if (!response.ok)
      throw new Error("Erreur lors du chargement de l'historique des paiements");

    const paymentHistory = await response.json();

    if (Array.isArray(paymentHistory) && paymentHistory.length > 0) {
      paymentHistory.forEach((payment) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${payment.amount}€</td>
          <td>${payment.hoursWorked} heures</td>
          <td>${new Date(payment.date).toLocaleDateString()}</td>
        `;
        paymentHistoryBody.appendChild(tr);
      });
    } else {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="3">Aucun historique de paiement disponible</td>`;
      paymentHistoryBody.appendChild(tr);
    }
  } catch (error) {
    console.error("Erreur lors de la récupération de l'historique des paiements", error);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="3">Erreur lors du chargement des paiements</td>`;
    paymentHistoryBody.appendChild(tr);
  }
}

/**
 * Ferme le modal des détails d'un employé
 */
function closeModal() {
  document.getElementById("employeeDetailsModal").style.display = "none";
}

// ======================================
// GESTION DES MODALS D'AJOUT D'EMPLOYÉ
// ======================================

/**
 * Affiche le modal d'ajout d'un employé
 */
function showAddEmployeeModal() {
  updatePositionsSelect();
  document.getElementById("addEmployeeModal").style.display = "flex";
  // Initialiser les champs de salaire en fonction du type de salaire par défaut
  updateAddEmployeeSalaryFields(document.getElementById("salaryType").value);
}

/**
 * Ferme le modal d'ajout d'un employé
 */
function closeAddEmployeeModal() {
  document.getElementById("addEmployeeModal").style.display = "none";
  document.getElementById("addEmployeeForm").reset();
}

/**
 * Met à jour les champs de salaire en fonction du type de salaire choisi
 * @param {string} salaryType - Type de salaire (Mensuel ou Horaire)
 */
function updateAddEmployeeSalaryFields(salaryType) {
  const monthlySalaryField = document.getElementById("monthlySalary");
  const hourlyRateField = document.getElementById("hourlyRate");

  if (salaryType === "Mensuel") {
    monthlySalaryField.parentElement.style.display = "block";
    hourlyRateField.parentElement.style.display = "none";
    hourlyRateField.value = "";
  } else if (salaryType === "Horaire") {
    hourlyRateField.parentElement.style.display = "block";
    monthlySalaryField.parentElement.style.display = "none";
    monthlySalaryField.value = "";
  } else {
    // Si aucun type de salaire n'est sélectionné, cacher les deux champs
    monthlySalaryField.parentElement.style.display = "none";
    hourlyRateField.parentElement.style.display = "none";
    monthlySalaryField.value = "";
    hourlyRateField.value = "";
  }
}

/**
 * Met à jour les options du select de positions
 */
function updatePositionsSelect() {
  const positionsSelect = document.getElementById("positions");
  const uniquePositions = new Set();

  // Collecter toutes les positions uniques des employés existants
  allEmployees.forEach((employee) => {
    employee.positions.forEach((position) => {
      uniquePositions.add(position);
    });
  });

  // Ajouter les positions par défaut si elles n'existent pas déjà
  const defaultPositions = ["Entraineur", "Administratif", "Technicien"];
  defaultPositions.forEach(pos => uniquePositions.add(pos));

  // Vider le select et ajouter les options
  positionsSelect.innerHTML = '';
  uniquePositions.forEach((position) => {
    const option = document.createElement("option");
    option.value = position;
    option.textContent = position;
    positionsSelect.appendChild(option);
  });
}

/**
 * Ajoute un nouvel employé
 * @param {Event} event - Événement du formulaire
 */
async function addEmployee(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const employeeData = Object.fromEntries(formData.entries());

  // Formater la date de naissance
  if (employeeData.birthDate) {
    employeeData.birthDate = formatDate(employeeData.birthDate);
  }

  try {
    const response = await fetch("https://backendestrappes.fr/protected/employees", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
      body: JSON.stringify(employeeData),
    });

    if (!response.ok) {
      // Essayer de récupérer le message d'erreur du serveur
      const errorData = await response.json().catch(() => null);
      if (errorData && errorData.message) {
        throw new Error(errorData.message);
      } else if (response.status === 409) {
        throw new Error("Un employé avec ces informations existe déjà.");
      } else {
        throw new Error("Erreur lors de l'ajout de l'employé");
      }
    }

    alert("Employé ajouté avec succès");
    closeAddEmployeeModal();
    loadEmployees();
  } catch (error) {
    console.error("Erreur d'ajout:", error);
    alert(error.message);
  }
}

// ======================================
// GESTION DES MODALS DE MODIFICATION D'EMPLOYÉ
// ======================================

/**
 * Affiche le modal de modification d'un employé
 * @param {string} employeeId - ID de l'employé à modifier
 */
async function editEmployee(employeeId) {
  try {
    const response = await fetch(`https://backendestrappes.fr/protected/employees/${employeeId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    });

    if (!response.ok) throw new Error("Erreur lors du chargement des détails");

    const employee = await response.json();

    // Remplir le formulaire avec les données de l'employé
    document.getElementById("editEmployeeId").value = employee._id;
    document.getElementById("editLicenseNumber").value = employee.licenseNumber;
    document.getElementById("editEmail").value = employee.email;
    document.getElementById("editPhone").value = employee.phone;
    document.getElementById("editPositions").value = employee.positions.join(", ");
    document.getElementById("editContractStatus").value = employee.contractStatus;
    document.getElementById("editSalaryType").value = employee.salaryType;

    // Mettre à jour les champs de salaire
    updateSalaryFields(employee.salaryType, employee.monthlySalary, employee.hourlyRate);

    // Afficher le modal
    document.getElementById("editEmployeeModal").style.display = "flex";
  } catch (error) {
    console.error("Erreur de chargement pour modification:", error);
    alert("Erreur lors du chargement des détails de l'employé");
  }
}

/**
 * Ferme le modal de modification d'un employé
 */
function closeEditEmployeeModal() {
  document.getElementById("editEmployeeModal").style.display = "none";
  document.getElementById("editEmployeeForm").reset();
}

/**
 * Met à jour les champs de salaire dans le formulaire d'édition
 * @param {string} salaryType - Type de salaire (Mensuel ou Horaire)
 * @param {number} monthlySalary - Salaire mensuel (optionnel)
 * @param {number} hourlyRate - Taux horaire (optionnel)
 */
function updateSalaryFields(salaryType, monthlySalary = "", hourlyRate = "") {
  const monthlySalaryField = document.getElementById("editMonthlySalary");
  const hourlyRateField = document.getElementById("editHourlyRate");

  if (salaryType === "Mensuel") {
    monthlySalaryField.value = monthlySalary || "";
    hourlyRateField.value = "";
    monthlySalaryField.parentElement.style.display = "block";
    hourlyRateField.parentElement.style.display = "none";
  } else if (salaryType === "Horaire") {
    hourlyRateField.value = hourlyRate || "";
    monthlySalaryField.value = "";
    hourlyRateField.parentElement.style.display = "block";
    monthlySalaryField.parentElement.style.display = "none";
  }
}

/**
 * Met à jour un employé
 * @param {Event} event - Événement du formulaire
 */
async function updateEmployee(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const employeeData = Object.fromEntries(formData.entries());
  const employeeId = employeeData.id;
  delete employeeData.id;

  // Convertir la chaîne de positions en tableau
  employeeData.positions = employeeData.positions.split(",").map((position) => position.trim());

  // Réinitialiser les champs de salaire en fonction du type de salaire sélectionné
  if (employeeData.salaryType === "Mensuel") {
    employeeData.hourlyRate = ""; // Réinitialiser le taux horaire
  } else if (employeeData.salaryType === "Horaire") {
    employeeData.monthlySalary = ""; // Réinitialiser le salaire mensuel
  }

  try {
    const response = await fetch(`https://backendestrappes.fr/protected/employees/${employeeId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
      body: JSON.stringify(employeeData),
    });

    if (!response.ok) throw new Error("Erreur lors de la mise à jour de l'employé");

    alert("Employé mis à jour avec succès");
    closeEditEmployeeModal();
    loadEmployees();
  } catch (error) {
    console.error("Erreur de mise à jour:", error);
    alert("Erreur lors de la mise à jour de l'employé");
  }
}

/**
 * Fonction pour enregistrer un salaire (utilisée par le formulaire)
 * @param {Event} event - Événement du formulaire
 */
function recordSalary(event) {
  event.preventDefault();
  // Implémentation si nécessaire
}

// ======================================
// GESTION DE LA SUPPRESSION D'EMPLOYÉ
// ======================================

/**
 * Supprime un employé
 * @param {string} employeeId - ID de l'employé à supprimer
 */
async function deleteEmployee(employeeId) {
  if (confirm("Êtes-vous sûr de vouloir supprimer cet employé ?")) {
    try {
      const response = await fetch(
        `https://backendestrappes.fr/protected/employees/${employeeId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
          },
        }
      );

      if (!response.ok)
        throw new Error("Erreur lors de la suppression de l'employé");

      alert("Employé supprimé avec succès");
      loadEmployees();
    } catch (error) {
      console.error("Erreur de suppression:", error);
      alert("Erreur lors de la suppression de l'employé");
    }
  }
}

// ======================================
// GESTION D'AJOUT DE SALAIRE
// ======================================

/**
 * Enregistre le paiement du salaire d'un employé
 * @param {string} employeeId - ID de l'employé
 */
async function paySalary(employeeId) {
  try {
    // Récupérer d'abord les détails de l'employé pour déterminer le type de salaire
    const response = await fetch(
      `https://backendestrappes.fr/protected/employees/${employeeId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
      }
    );

    if (!response.ok) throw new Error("Erreur lors du chargement des détails de l'employé");

    const employee = await response.json();

    // Vérifier que les informations nécessaires sont présentes
    if (!employee.salaryType) {
      alert("Type de salaire de l'employé manquant.");
      return;
    }

    if (employee.salaryType === 'Horaire' && employee.hourlyRate === undefined) {
      alert("Taux horaire de l'employé manquant.");
      return;
    }

    if (employee.salaryType === 'Mensuel' && employee.monthlySalary === undefined) {
      alert("Salaire mensuel de l'employé manquant.");
      return;
    }

    // Demander le nombre d'heures travaillées si le salaire est horaire
    let hoursWorked;
    if (employee.salaryType === 'Horaire') {
      hoursWorked = prompt("Entrez le nombre d'heures travaillées :");

      // Valider l'entrée des heures
      if (hoursWorked === null) return; // L'utilisateur a annulé

      hoursWorked = parseFloat(hoursWorked);

      if (isNaN(hoursWorked) || hoursWorked <= 0) {
        alert("Veuillez entrer un nombre d'heures valide.");
        return;
      }
    }

    // Envoyer la requête de paiement du salaire
    const paymentResponse = await fetch(
      "https://backendestrappes.fr/protected/employees/salary",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
        body: JSON.stringify({
          employeeId: employeeId,
          ...(hoursWorked !== undefined && { hoursWorked: hoursWorked })
        }),
      }
    );

    if (!paymentResponse.ok) throw new Error("Erreur lors du paiement du salaire");

    alert("Salaire payé avec succès");

    // Rafraîchir l'historique des paiements dans la modale des détails si elle est ouverte
    if (document.getElementById("employeeDetailsModal").style.display === "flex") {
      await showPaymentHistory(employeeId);
    }
  } catch (error) {
    console.error("Erreur de paiement:", error);
    alert("Erreur lors du paiement du salaire");
  }
}
