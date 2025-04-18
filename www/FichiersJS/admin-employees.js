// ----------------------------
// VARIABLES GLOBALES
// ----------------------------
let allEmployees = [];
let currentPage = 1;
const limit = 10; // Nombre d'éléments par page
let sortOrder = 'asc'; // Variable pour suivre l'ordre de tri

// ----------------------------
// INITIALISATION ET ÉVÉNEMENTS
// ----------------------------
window.onload = function () {
  loadEmployees();
  
  // Écouteurs d'événements pour les filtres
  document.getElementById("searchInput").addEventListener("input", applyFilters);
  document.getElementById("contractStatusFilter").addEventListener("change", applyFilters);
  document.getElementById("positionFilter").addEventListener("change", applyFilters);
  
  // Écouteurs d'événements pour les formulaires
  document.getElementById("addEmployeeForm").addEventListener("submit", addEmployee);
  document.getElementById("editEmployeeForm").addEventListener("submit", updateEmployee);
 
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
  
  // Gestion des clics en dehors des modals pour les fermer
  window.onclick = function(event) {
    if (event.target == document.getElementById("employeeDetailsModal")) {
      closeModal();
    }
    if (event.target == document.getElementById("addEmployeeModal")) {
      closeAddEmployeeModal();
    }
    if (event.target == document.getElementById("editEmployeeModal")) {
      closeEditEmployeeModal();
    }
  };
};

// ----------------------------
// GESTION DES ONGLETS
// ----------------------------
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

// ----------------------------
// CHARGEMENT ET FILTRAGE DES DONNÉES
// ----------------------------
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
    updatePositionFilter();
    updatePositionsSelect();
    applyFilters();
    updatePaginationControls();
  } catch (error) {
    console.error("Erreur de chargement des employés:", error);
  }
}

function updatePositionFilter() {
  const positionFilter = document.getElementById("positionFilter");
  const uniquePositions = new Set();

  allEmployees.forEach((employee) => {
    employee.positions.forEach((position) => {
      uniquePositions.add(position);
    });
  });

  positionFilter.innerHTML = '<option value="">Toutes les positions</option>';
  uniquePositions.forEach((position) => {
    const option = document.createElement("option");
    option.value = position;
    option.textContent = position;
    positionFilter.appendChild(option);
  });
}

function toggleSort(field) {
  sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
  applyFilters();
}

function applyFilters() {
  const searchQuery = document
    .getElementById("searchInput")
    .value.trim()
    .toLowerCase();
  const contractStatus = document.getElementById("contractStatusFilter").value;
  const position = document.getElementById("positionFilter").value;

  // Filtrer les employés selon les critères
  const filteredEmployees = allEmployees.filter((employee) => {
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

  // Stocker le résultat filtré dans une variable globale
  window.filteredEmployees = filteredEmployees;

  const startIndex = (currentPage - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

  displayEmployees(paginatedEmployees);
  updatePaginationControls(filteredEmployees.length);
}

// ----------------------------
// AFFICHAGE DES DONNÉES
// ----------------------------
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

// ----------------------------
// GESTION DE LA PAGINATION
// ----------------------------
function updatePaginationControls(filteredCount = null) {
  const pageInfo = document.getElementById("pageInfo");
  // Utilisez le nombre d'employés filtrés plutôt que tous les employés
  const count = filteredCount !== null ? filteredCount : (window.filteredEmployees ? window.filteredEmployees.length : allEmployees.length);
  const totalPages = Math.ceil(count / limit);
  
  // Assurer que currentPage ne dépasse pas le nombre total de pages
  if (currentPage > totalPages && totalPages > 0) {
    currentPage = totalPages;
  }
  
  pageInfo.innerHTML = `Page ${currentPage} sur ${totalPages}`;

  const paginationButtons = document.querySelectorAll(".pagination-controls .btn-secondary");
  paginationButtons[0].disabled = currentPage === 1; // First page
  paginationButtons[1].disabled = currentPage === 1; // Previous page
  paginationButtons[2].disabled = currentPage === totalPages || totalPages === 0; // Next page
  paginationButtons[3].disabled = currentPage === totalPages || totalPages === 0; // Last page
}

// Mettre à jour les fonctions de navigation pour utiliser les employés filtrés
function firstPage() {
  currentPage = 1;
  applyFilters();
}

function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    applyFilters();
  }
}

function nextPage() {
  const count = window.filteredEmployees ? window.filteredEmployees.length : allEmployees.length;
  const totalPages = Math.ceil(count / limit);
  
  if (currentPage < totalPages) {
    currentPage++;
    applyFilters();
  }
}

function lastPage() {
  const count = window.filteredEmployees ? window.filteredEmployees.length : allEmployees.length;
  currentPage = Math.ceil(count / limit);
  applyFilters();
}


// ----------------------------
// FORMATAGE DES DONNÉES
// ----------------------------
function formatDate(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Les mois sont indexés à partir de 0
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// ----------------------------
// GESTION DES DÉTAILS D'UN EMPLOYÉ
// ----------------------------

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

    await showPaymentHistory(employeeId);

    document.getElementById("employeeDetailsModal").style.display = "flex";
  } catch (error) {
    console.error("Erreur de chargement des détails:", error);
  }
}


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

function closeModal() {
  document.getElementById("employeeDetailsModal").style.display = "none";
}

// ----------------------------
// GESTION DES MODALS D'AJOUT D'EMPLOYÉ
// ----------------------------
function showAddEmployeeModal() {
  updatePositionsSelect();
  document.getElementById("addEmployeeModal").style.display = "flex";
  // Initialiser les champs de salaire en fonction de la valeur par défaut du type de salaire
  updateAddEmployeeSalaryFields(document.getElementById("salaryType").value);
}

function closeAddEmployeeModal() {
  document.getElementById("addEmployeeModal").style.display = "none";
  document.getElementById("addEmployeeForm").reset();
}

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

// ----------------------------
// GESTION DES MODALS DE MODIFICATION D'EMPLOYÉ
// ----------------------------

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

    document.getElementById("editEmployeeId").value = employee._id;
    document.getElementById("editLicenseNumber").value = employee.licenseNumber;
    document.getElementById("editEmail").value = employee.email;
    document.getElementById("editPhone").value = employee.phone;
    document.getElementById("editPositions").value = employee.positions.join(", ");
    document.getElementById("editContractStatus").value = employee.contractStatus;
    document.getElementById("editSalaryType").value = employee.salaryType;

    updateSalaryFields(employee.salaryType, employee.monthlySalary, employee.hourlyRate);

    // Afficher le modal
    document.getElementById("editEmployeeModal").style.display = "flex";
  } catch (error) {
    console.error("Erreur de chargement pour modification:", error);
    alert("Erreur lors du chargement des détails de l'employé");
  }
}


function closeEditEmployeeModal() {
  document.getElementById("editEmployeeModal").style.display = "none";
  document.getElementById("editEmployeeForm").reset();
}

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


async function updateEmployee(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const employeeData = Object.fromEntries(formData.entries());
  const employeeId = employeeData.id;
  delete employeeData.id;

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



// ----------------------------
// GESTION DE LA SUPPRESSION D'EMPLOYÉ
// ----------------------------
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







// ----------------------------
// GESTION D'AJOUT DE SALAIRE
// ----------------------------

//Fonction pour gerer le paiement du salaire
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

