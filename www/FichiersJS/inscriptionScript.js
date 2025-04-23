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
    document.getElementById("errorMessage").textContent = 
      "Les adresses email avec les domaines suivants ne sont pas autorisées : " + 
      restrictedDomains.join(", ");
    document.getElementById("errorMessage").style.display = "block";
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Ajout du défilement vers le haut
    return;
  }

  // Vérification de l'email du tuteur si nécessaire
  const tutorEmailInput = document.getElementById("tutorEmail").value;
  const tutorGroupDisplayed = document.querySelector('.tutor-group').style.display !== 'none';
  
  if (tutorGroupDisplayed && isEmailRestricted(tutorEmailInput)) {
    document.getElementById("errorMessage").textContent = 
      "Les adresses email avec les domaines suivants ne sont pas autorisées pour les tuteurs : " + 
      restrictedDomains.join(", ");
    document.getElementById("errorMessage").style.display = "block";
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Ajout du défilement vers le haut
    return;
  }

  // Fonction pour compresser et convertir les images en base64
  const compressAndConvertToBase64 = async (file) => {
    if (!file) return null;
    if (!file.type.startsWith('image/')) {
      // Si ce n'est pas une image (ex: PDF), on le convertit directement
      return await getFileBase64(file);
    }
    
    return new Promise((resolve) => {
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
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedDataUrl);
        };
      };
    });
  };

  // Fonction originale pour les fichiers non-images
  const getFileBase64 = (file) => {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const carteIdentiteFile = document.getElementById("carteIdentite").files[0];
  const justificatifDomicileFile = document.getElementById("justificatifDomicile").files[0];
  const certificatMedicalFile = document.getElementById("certificatMedical").files[0];

  try {
    const [
      carteIdentiteBase64,
      justificatifDomicileBase64,
      certificatMedicalBase64,
    ] = await Promise.all([
      compressAndConvertToBase64(carteIdentiteFile),
      compressAndConvertToBase64(justificatifDomicileFile),
      compressAndConvertToBase64(certificatMedicalFile),
    ]);

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


if (!response.ok) {
  const errorData = await response.json();
  if (errorData.message && errorData.message.includes("email")) {
    document.getElementById("errorMessage").textContent =
      "Une inscription avec cet email et nom existe déjà.";
    document.getElementById("errorMessage").style.display = "block";
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Ajout du défilement vers le haut
  } else {
    throw new Error("Erreur lors de l'inscription");
  }
} else {
  document.getElementById("errorMessage").style.display = "none";
  alert("Inscription soumise avec succès ! Elle est en attente de validation.");
  document.getElementById("registrationForm").reset();
}

window.scrollTo(0, 0);
} catch (error) {
console.error("Erreur:", error);
alert("Une erreur est survenue lors de l'inscription. Veuillez réessayer.");
window.scrollTo({ top: 0, behavior: 'smooth' }); // Ajout du défilement vers le haut en cas d'erreur
}
});

// Le code pour la gestion de l'âge reste inchangé
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