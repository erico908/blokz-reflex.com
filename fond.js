// Prix pour débloquer la personnalisation du fond
const prixFondPerso = 50;

// Récupérer le nombre de trophées (à adapter selon ton système)
let trophees = parseInt(localStorage.getItem('trophees')) || 0;

// Récupérer si l'utilisateur a débloqué le fond perso
let fondPersoDebloque = localStorage.getItem('fondPersoDebloque') === 'true';

// Référence aux éléments HTML (à créer dans ta page)
const btnAcheterFond = document.getElementById('acheterFondPerso');
const btnUploaderFond = document.getElementById('uploadFondPerso');
const inputUpload = document.getElementById('inputUploadFond');

// Met à jour l’état des boutons
function majBoutons() {
  if (fondPersoDebloque) {
    btnAcheterFond.disabled = true;
    btnAcheterFond.textContent = 'Fond personnalisé débloqué';
    btnUploaderFond.disabled = false;
  } else {
    btnAcheterFond.disabled = trophees < prixFondPerso;
    btnAcheterFond.textContent = `Acheter fond perso (${prixFondPerso} 🏆)`;
    btnUploaderFond.disabled = true;
  }
}
majBoutons();

// Acheter la possibilité d'utiliser un fond perso
btnAcheterFond.addEventListener('click', () => {
  if (trophees >= prixFondPerso) {
    trophees -= prixFondPerso;
    localStorage.setItem('trophees', trophees);
    fondPersoDebloque = true;
    localStorage.setItem('fondPersoDebloque', 'true');
    majBoutons();
    alert('Félicitations, tu peux maintenant uploader un fond personnalisé !');
  } else {
    alert('Pas assez de trophées !');
  }
});

// Uploader une image et l’enregistrer en fond
inputUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Limite taille max 2Mo par exemple
  if (file.size > 2 * 1024 * 1024) {
    alert('Image trop grosse, max 2Mo !');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const imgDataUrl = reader.result;
    // Sauvegarder dans localStorage
    localStorage.setItem('fondPersoImage', imgDataUrl);
    // Appliquer en fond
    document.body.style.backgroundImage = `url(${imgDataUrl})`;
    alert('Fond personnalisé appliqué !');
  };
  reader.readAsDataURL(file);
});

// Permet de déclencher l’input fichier au clic sur le bouton
btnUploaderFond.addEventListener('click', () => {
  inputUpload.click();
});

// Au chargement, appliquer le fond perso s’il existe
window.addEventListener('load', () => {
  if (fondPersoDebloque) {
    const fondPersoImage = localStorage.getItem('fondPersoImage');
    if (fondPersoImage) {
      document.body.style.backgroundImage = `url(${fondPersoImage})`;
    }
  }
});
