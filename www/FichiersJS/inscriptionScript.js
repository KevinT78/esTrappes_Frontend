// Fonction d'affichage des erreurs
function afficherErreur(message, type = 'error') {
  const errorContainer = document.getElementById("errorMessage");
  errorContainer.textContent = message;
  errorContainer.className = type === 'error' ? 'alert alert-danger' : 'alert alert-warning';
  errorContainer.style.display = "block";
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Fonction pour gérer les retours d'information utilisateur
function gererValidationFichier(input) {
  const maxSizeImage = 5 * 1024 * 1024; // 5 Mo
  const maxSizePDF = 1 * 1024 * 1024;   // 1 Mo
  const fileTypes = {
    'carteIdentite': ['image/jpeg', 'image/png', 'application/pdf'],
    'justificatifDomicile': ['image/jpeg', 'image/png', 'application/pdf'],
    'certificatMedical': ['image/jpeg', 'image/png', 'application/pdf']
  };

  input.addEventListener('change', function () {
    const file = this.files[0];
    const fileTypeErrorMsg = document.getElementById(`${this.id}-type-error`);
    const fileSizeErrorMsg = document.getElementById(`${this.id}-size-error`);

    // Réinitialisation des messages
    fileTypeErrorMsg.style.display = 'none';
    fileSizeErrorMsg.style.display = 'none';

    if (file) {
      // Vérification du type de fichier
      if (!fileTypes[this.id].includes(file.type)) {
        fileTypeErrorMsg.style.display = 'block';
        fileTypeErrorMsg.textContent = `Format invalide. Formats acceptés: JPG, PNG, PDF`;
        this.value = ''; // Réinitialiser l'input
      }

      // Détermination de la taille maximale selon le type
      const isPDF = file.type === 'application/pdf';
      const sizeLimit = isPDF ? maxSizePDF : maxSizeImage;

      if (file.size > sizeLimit) {
        fileSizeErrorMsg.style.display = 'block';
        fileSizeErrorMsg.textContent = `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(2)} Mo). Maximum: ${isPDF ? '1' : '5'} Mo`;
        this.value = ''; // Réinitialiser l'input
      }
    }
  });
}


// Initialisation des validateurs de fichiers lors du chargement de la page
document.addEventListener('DOMContentLoaded', function() {
  // Création des éléments d'erreur pour chaque champ de fichier
  const fileInputs = ['carteIdentite', 'justificatifDomicile', 'certificatMedical'];
  fileInputs.forEach(inputId => {
    const input = document.getElementById(inputId);
    const parent = input.parentElement;
    // Création des messages d'erreur
    const typeError = document.createElement('div');
    typeError.id = `${inputId}-type-error`;
    typeError.className = 'text-danger mt-1';
    typeError.style.display = 'none';
    const sizeError = document.createElement('div');
    sizeError.id = `${inputId}-size-error`;
    sizeError.className = 'text-danger mt-1';
    sizeError.style.display = 'none';
    // Ajout des messages après l'input
    parent.appendChild(typeError);
    parent.appendChild(sizeError);
    // Initialisation du validateur
    gererValidationFichier(input);
  });

  // Message global expliquant les limitations
  const formInfoMessage = document.createElement('div');
  formInfoMessage.className = 'alert alert-info mb-4';
  formInfoMessage.innerHTML = `<h5>Informations sur les documents</h5>
   <ul>
    <li>Formats acceptés: JPG, PNG, PDF</li>
    <li>Taille maximale par fichier: 5 Mo pour les fichiers JPG et PNG, <strong>1 Mo pour les PDF</strong></li>
    <li>Note : La taille maximale des fichiers imposée peut ne pas suffire. Il est donc recommandé de réduire la taille de vos fichiers si vous rencontrez des problèmes lors de la soumission du formulaire.</li>
    <li>Pour réduire la taille de vos images, vous pouvez utiliser un service comme <a href="https://tinypng.com/" target="_blank">TinyPNG</a></li>
    <li>Pour compresser les PDF volumineux, vous pouvez les réduire via <a href="https://smallpdf.com/fr/compresser-pdf" target="_blank">SmallPDF</a></li>
  </ul>
`;
  // Insérer au début du formulaire
  const form = document.getElementById('registrationForm');
  form.insertBefore(formInfoMessage, form.firstChild);
});

// Listener pour le formulaire d'inscription
document.getElementById("registrationForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  // Liste des domaines email interdits
  const restrictedDomains = [
    "@estrappes.com",
  ];

  // Fonction pour vérifier si un email est interdit
  const isEmailRestricted = (email) => {
    if (!email) return false;
    const emailLower = email.toLowerCase();
    return restrictedDomains.some(domain => emailLower.endsWith(domain));
  };

  // Vérification de l'email principal
  const emailInput = document.getElementById("email").value;
  if (isEmailRestricted(emailInput)) {
    afficherErreur("Les adresses email avec les domaines suivants ne sont pas autorisées : " + restrictedDomains.join(", "));
    return;
  }

  // Vérification de l'email du tuteur si nécessaire
  const tutorEmailInput = document.getElementById("tutorEmail").value;
  const tutorGroupDisplayed = document.querySelector('.tutor-group').style.display !== 'none';
  if (tutorGroupDisplayed && isEmailRestricted(tutorEmailInput)) {
    afficherErreur("Les adresses email avec les domaines suivants ne sont pas autorisées pour les tuteurs : " + restrictedDomains.join(", "));
    return;
  }

  const carteIdentiteFile = document.getElementById("carteIdentite").files[0];
  const justificatifDomicileFile = document.getElementById("justificatifDomicile").files[0];
  const certificatMedicalFile = document.getElementById("certificatMedical").files[0];

  // Log des tailles de fichiers
  console.log("Taille de carteIdentiteFile:", carteIdentiteFile ? carteIdentiteFile.size : "Aucun fichier sélectionné");
  console.log("Taille de justificatifDomicileFile:", justificatifDomicileFile ? justificatifDomicileFile.size : "Aucun fichier sélectionné");
  console.log("Taille de certificatMedicalFile:", certificatMedicalFile ? certificatMedicalFile.size : "Aucun fichier sélectionné");

  // Limite de taille maximale (5 Mo)
  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  // Vérification de la taille des fichiers
  if ((carteIdentiteFile && carteIdentiteFile.size > MAX_FILE_SIZE) ||
      (justificatifDomicileFile && justificatifDomicileFile.size > MAX_FILE_SIZE) ||
      (certificatMedicalFile && certificatMedicalFile.size > MAX_FILE_SIZE)) {
    afficherErreur("Un ou plusieurs fichiers dépassent la taille maximale de 10 Mo. Veuillez compresser vos fichiers avant de les télécharger.");
    return;
  }

  // Fonction pour traiter les fichiers PDF de manière plus sécurisée
  const processPdf = async (file) => {
    if (!file) return null;
    try {
      const arrayBuffer = await file.arrayBuffer();
      // Utilisation d'une méthode plus simple pour le PDF
      return `data:application/pdf;base64,${arrayBufferToBase64(arrayBuffer)}`;
    } catch (error) {
      console.error("Erreur lors du traitement du PDF:", error);
      throw new Error("Erreur lors du traitement du fichier PDF");
    }
  };

  // Convertir ArrayBuffer en Base64 de manière sécurisée
  const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Fonction pour compresser les images
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          // Réduire la taille de l'image à max 800x800px
          let width = img.width;
          let height = img.height;
          if (width > height && width > 800) {
            height = Math.round((height * 800) / width);
            width = 800;
          } else if (height > 800) {
            width = Math.round((width * 800) / height);
            height = 800;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          // Compression qualité 70%
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  // Fonction améliorée pour compresser et convertir les fichiers
  const processFile = async (file) => {
    if (!file) return null;
    try {
      // Traitement selon le type de fichier
      if (file.type === 'application/pdf') {
        console.log("Traitement du PDF:", file.name);
        return await processPdf(file);
      } else if (file.type.startsWith('image/')) {
        console.log("Compression de l'image:", file.name);
        return await compressImage(file);
      } else {
        // Pour les autres types de fichiers
        const buffer = await file.arrayBuffer();
        return `data:${file.type};base64,${arrayBufferToBase64(buffer)}`;
      }
    } catch (error) {
      console.error("Erreur lors du traitement du fichier:", error);
      throw new Error(`Erreur lors du traitement du fichier: ${file.name}`);
    }
  };

  try {
    // Montrer un indicateur de chargement
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'loadingIndicator';
    loadingIndicator.className = 'alert alert-info text-center';
    loadingIndicator.innerHTML = '<strong>Traitement en cours...</strong><br>Compression et envoi des fichiers. Veuillez patienter.';
    document.querySelector('#errorMessage').after(loadingIndicator);

    // Traiter les fichiers en parallèle avec une gestion d'erreur améliorée
    const results = await Promise.allSettled([
      processFile(carteIdentiteFile),
      processFile(justificatifDomicileFile),
      processFile(certificatMedicalFile)
    ]);

    // Vérifier si tous les fichiers ont été traités avec succès
    const errors = results.filter(r => r.status === 'rejected').map(r => r.reason);
    if (errors.length > 0) {
      throw new Error(`Erreur de traitement des fichiers: ${errors.join(', ')}`);
    }

    const [
      carteIdentiteBase64,
      justificatifDomicileBase64,
      certificatMedicalBase64,
    ] = results.map(r => r.value);

    const formData = {
      typeInscription: document.getElementById("typeInscription").value,
      firstName: document.getElementById("firstName").value,
      lastName: document.getElementById("lastName").value,
      birthDate: document.getElementById("birthDate").value,
      gender: document.getElementById("gender").value,
      contact: {
        phone: document.getElementById("phone").value,
        email: document.getElementById("email").value,
      },
      tutor: {
        name: document.getElementById("tutorName").value,
        phone: document.getElementById("tutorPhone").value,
        email: document.getElementById("tutorEmail").value,
      },
      address: {
        city: document.getElementById("city").value,
        postalCode: document.getElementById("postalCode").value,
        fullAddress: document.getElementById("fullAddress").value,
      },
      documents: {
        carteIdentite: carteIdentiteBase64,
        justificatifDomicile: justificatifDomicileBase64,
        certificatMedical: certificatMedicalBase64,
      },
      droitImage: document.querySelector('input[name="droitImage"]:checked').value,
      status: "attente",
    };

    const response = await fetch("https://backendestrappes.fr/registration", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    // Supprimer l'indicateur de chargement
    if (document.getElementById("loadingIndicator")) {
      document.getElementById("loadingIndicator").remove();
    }

    if (!response.ok) {
      const errorData = await response.json();
      if (errorData.message && errorData.message.includes("email")) {
        afficherErreur("Une inscription avec cet email et nom existe déjà.");
      } else {
        throw new Error("Erreur lors de l'inscription: " + (errorData.message || "Veuillez réessayer"));
      }
    } else {
      document.getElementById("errorMessage").style.display = "none";
      // Créer un message de succès
      const successMessage = document.createElement('div');
      successMessage.id = 'successMessage';
      successMessage.className = 'alert alert-success';
      successMessage.textContent = "Inscription soumise avec succès ! Elle est en attente de validation.";
      // Insérer le message de succès au début du formulaire
      const form = document.getElementById('registrationForm');
      form.insertBefore(successMessage, form.firstChild);
      // Réinitialiser le formulaire
      document.getElementById("registrationForm").reset();
      // Faire défiler jusqu'au message de succès
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Supprimer le message de succès après 5 secondes
      setTimeout(() => {
        if (document.getElementById('successMessage')) {
          document.getElementById('successMessage').remove();
        }
      }, 5000);
    }
  } catch (error) {
    // Supprimer l'indicateur de chargement en cas d'erreur
    if (document.getElementById("loadingIndicator")) {
      document.getElementById("loadingIndicator").remove();
    }
    console.error("Erreur:", error);
    afficherErreur("Une erreur est survenue lors de l'inscription: " + error.message);
  }
});

// Le code pour la gestion de l'âge
document.getElementById('birthDate').addEventListener('change', (e) => {
  const birthDate = new Date(e.target.value);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const tutorGroup = document.querySelector('.tutor-group');
  if (age < 18) {
    tutorGroup.style.display = 'block';
    document.getElementById('tutorName').required = true;
    document.getElementById('tutorPhone').required = true;
    document.getElementById('tutorEmail').required = true;
  } else {
    tutorGroup.style.display = 'none';
    document.getElementById('tutorName').required = false;
    document.getElementById('tutorPhone').required = false;
    document.getElementById('tutorEmail').required = false;
  }
});