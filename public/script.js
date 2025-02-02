const userLanguage = navigator.language || navigator.userLanguage;
console.log(`Erkannte Browsersprache: ${userLanguage}`);

const translations = {
    "de": {
        "gamePlaceholder": "Spielname eingeben...",
        "questionPlaceholder": "Frage eingeben...",
        "resetText": "Zurücksetzen",
        "deleteQuestion": "Frage löschen",
    },
    "en": {
        "gamePlaceholder": "Enter game name...",
        "questionPlaceholder": "Enter your question...",
        "resetText": "Reset",
        "deleteQuestion": "Clear Question",
    },
    "fr": {
        "gamePlaceholder": "Entrez le nom du jeu...",
        "questionPlaceholder": "Entrez votre question...",
        "resetText": "Réinitialiser",
        "deleteQuestion": "Effacer la question",
    },
    "es": {
        "gamePlaceholder": "Ingrese el nombre del juego...",
        "questionPlaceholder": "Ingrese su pregunta...",
        "resetText": "Restablecer",
        "deleteQuestion": "Borrar pregunta",
    }
};

// 🔹 Funktion zum Setzen der UI-Sprache
function setUILanguage(lang) {
    if (!translations[lang]) lang = "en"; // Fallback auf Englisch

    document.getElementById("gameInput").setAttribute("placeholder", translations[lang]["gamePlaceholder"]);
    document.getElementById("questionInput").setAttribute("placeholder", translations[lang]["questionPlaceholder"]);
    document.getElementById("resetButton").textContent = translations[lang]["resetText"];
    document.getElementById("clearQuestion").textContent = translations[lang]["deleteQuestion"];
}

// 🔹 Automatisch die Sprache setzen
setUILanguage(userLanguage.substring(0, 2));

const gameInput = document.getElementById('gameInput');
const startButton = document.getElementById('startButton');
const micButton = document.getElementById('micButton'); 
const resetButton = document.getElementById('resetButton'); 
const questionArea = document.getElementById('question-area');
const selectedGameElement = document.getElementById('selectedGame');
const askButton = document.getElementById('askButton');
const questionInput = document.getElementById('questionInput');
const micQuestionButton = document.getElementById('micQuestionButton');
const answerOutput = document.getElementById('answerOutput');
const speakButton = document.getElementById('speakButton');
const gameNotFoundDiv = document.getElementById('game-not-found'); 
const uploadButton = document.getElementById('uploadButton'); 
const logoImg = document.getElementById("logoImg"); 

let uploadedManual = null; 
let selectedGame = null; 

// 🔹 Map für Hersteller-Logos
const logoMap = {
    "Hasbro": "images/logoh.jpg",
    "Ravensburger": "images/logor.jpg",
    "Kosmos": "images/logok.jpg"
};

// 🔹 Funktion: Logo wechseln
function updateLogo(publisher) {
    if (logoImg) {
        const newLogo = logoMap[publisher] || "images/logo.jpg";
        console.log(`Setze Logo auf: ${newLogo}`);
        logoImg.src = newLogo;
    }
}

// 🔹 Funktion: Textfeldhöhe automatisch anpassen
const adjustTextareaHeight = (textarea) => {
    textarea.style.height = 'auto'; 
    textarea.style.height = `${textarea.scrollHeight}px`; 
};

// 🔹 Logik für den Absendepfeil bei der Spielauswahl
gameInput.addEventListener('input', () => {
  const query = gameInput.value.trim();
  if (query.length < 3) {
      suggestionsList.style.display = 'none';
      updateLogo(null);
      return;
  }

  fetch(`/autocomplete?q=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((data) => {
          console.log("Autovervollständigungs-Ergebnisse:", data);
          showSuggestions(data);

          // Prüfe, ob die exakte Eingabe einem Spiel entspricht
          const selectedGame = data.find(game => game.name.toLowerCase() === query.toLowerCase());
          if (selectedGame && selectedGame.publisher) {
              updateLogo(selectedGame.publisher);
          } else {
              updateLogo(null);
          }
      })
      .catch((error) => console.error("Fehler bei der Autovervollständigung:", error));
});


// 🔹 Logik für den Absendepfeil bei der Frageingabe
questionInput.addEventListener('input', () => {
    if (questionInput.value.trim() !== '') {
        micQuestionButton.classList.add('hidden'); 
        askButton.classList.remove('hidden'); 
    } else {
        micQuestionButton.classList.remove('hidden'); 
        askButton.classList.add('hidden'); 
    }
    adjustTextareaHeight(questionInput); 
});

// 🔹 Enter-Taste sendet die Frage & verhindert Zeilenumbruch
questionInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) { // Shift + Enter erlaubt Zeilenumbruch
        event.preventDefault(); // Verhindert Zeilenumbruch
        askButton.click(); // Simuliere Klick auf "Frage stellen"
    }
});


const clearQuestionButton = document.getElementById("clearQuestion");

askButton.addEventListener("click", () => {
    const question = questionInput.value.trim();

    // Falls keine Frage eingegeben wurde, nichts tun
    if (!question) return;

    // 🔹 Zeige den "Frage löschen"-Button an
    clearQuestionButton.classList.remove("hidden");
});

clearQuestionButton.addEventListener("click", (event) => {
  event.preventDefault(); // Verhindert unerwünschtes Verhalten
  questionInput.value = ""; // 🔹 Fragefeld leeren
  answerOutput.value = ""; // 🔹 Antwortfeld leeren

  // 🔹 Verstecke den Button wieder, da keine Frage mehr im Feld ist
  clearQuestionButton.classList.add("hidden");
});



// 🔹 Spiel auswählen
startButton.addEventListener('click', () => {
    const gameName = gameInput.value.trim();
    if (gameName) {
        fetch('/select-game', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ game: gameName }),
        })
        .then((res) => res.json())
        .then((data) => {
            if (data.message.includes('ausgewählt')) {
                selectedGame = gameName;
                document.getElementById('gameName').textContent = gameName;
                selectedGameElement.classList.remove('hidden');
                resetButton.classList.remove('hidden'); 
                questionArea.style.display = 'block'; 
                gameNotFoundDiv.classList.add('hidden'); 
                gameInput.disabled = true; 
                startButton.disabled = true;
            } else {
                gameNotFoundDiv.classList.remove('hidden'); 
            }
        })
        .catch((error) => {
            console.error('Fehler bei der Spielauswahl:', error);
        });
    } else {
        alert('Bitte gib einen gültigen Spielnamen ein.');
    }
});

// 🔹 Vorschlagsliste für Autovervollständigung
const suggestionsList = document.createElement('ul');
suggestionsList.id = 'suggestions';
suggestionsList.className = 'absolute bg-white border border-gray-300 rounded shadow-md mt-1 w-full z-10';
suggestionsList.style.display = 'none';
suggestionsList.style.position = 'absolute'; // Positioniere Liste absolut
suggestionsList.style.top = `${gameInput.offsetHeight + 5}px`; // Setze sie direkt unter das Eingabefeld
suggestionsList.style.left = '0';
suggestionsList.style.width = '100%'; 
suggestionsList.style.maxHeight = '200px'; // Falls zu viele Ergebnisse, scrollbar machen
suggestionsList.style.overflowY = 'auto';
gameInput.parentNode.style.position = 'relative'; // Eltern-Element muss relativ sein
gameInput.parentNode.appendChild(suggestionsList);


// 🔹 Funktion: Vorschläge anzeigen
function showSuggestions(suggestions) {
    suggestionsList.innerHTML = '';
    if (suggestions.length === 0) {
        suggestionsList.style.display = 'none';
        return;
    }

    suggestions.forEach((game) => {
        const listItem = document.createElement('li');
        listItem.textContent = game.name;
        listItem.className = 'p-2 cursor-pointer hover:bg-gray-100';
        listItem.addEventListener('click', () => {
          gameInput.value = game.name;
          suggestionsList.style.display = 'none';
          updateLogo(game.publisher);
      
          // 🔹 Automatisch das Spiel laden
          startButton.click();
      });
      
        suggestionsList.appendChild(listItem);
    });

    suggestionsList.style.display = 'block';
}

// 🔹 Event: Eingabe im Spielefeld
gameInput.addEventListener('input', () => {
    const query = gameInput.value.trim();

    // 🔹 Falls ein neues Spiel eingegeben wird, lösche die temporäre PDF
    if (uploadedManual) {
        uploadedManual = null;
        console.log("Temporäre PDF wurde gelöscht.");
    }

    if (query.length < 3) {
        suggestionsList.style.display = 'none';
        updateLogo(null);
        return;
    }

    fetch(`/autocomplete?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => {
            console.log("Autovervollständigungs-Ergebnisse:", data);
            showSuggestions(data);
        })
        .catch((error) => console.error("Fehler bei der Autovervollständigung:", error));
});


// 🔹 Event: Vorschlagsliste ausblenden, wenn außerhalb geklickt wird
document.addEventListener('click', (event) => {
    if (!gameInput.contains(event.target) && !suggestionsList.contains(event.target)) {
        suggestionsList.style.display = 'none';
    }
});

// 🔹 Enter-Funktion für Spiel auswählen
gameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        startButton.click();
    }
});

// 🔹 Enter-Funktion für Frage stellen
uploadButton.addEventListener('click', () => {
    const uploadInput = document.createElement('input');
    uploadInput.type = 'file';
    uploadInput.accept = 'application/pdf';

    uploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                uploadedManual = btoa(reader.result); 
                selectedGame = gameInput.value.trim(); // 🔹 Setzt das Spiel aus dem Eingabefeld!
                alert(`Die Anleitung für "${selectedGame}" wurde erfolgreich hochgeladen.`);
                gameNotFoundDiv.classList.add('hidden');
                questionArea.style.display = 'block'; 
            };
            reader.readAsBinaryString(file);
        }
    });

    uploadInput.click();
});

uploadButton.addEventListener

// 🔹 Spiel zurücksetzen
resetButton.addEventListener('click', () => {
    selectedGame = null;
    updateLogo(null); // Setzt das Standard-Logo
    uploadedManual = null;
    gameInput.value = '';
    questionInput.value = '';
    answerOutput.value = '';
    selectedGameElement.classList.add('hidden');
    resetButton.classList.add('hidden');
    questionArea.style.display = 'none';
    gameNotFoundDiv.classList.add('hidden');
    gameInput.disabled = false;
    startButton.disabled = false;
    micButton.classList.remove('hidden');
    startButton.classList.add('hidden');
    micQuestionButton.classList.remove('hidden');
    askButton.classList.add('hidden');
});


askButton.addEventListener('click', () => {
    const question = questionInput.value.trim();

    // 🔹 Falls kein Spiel ausgewählt wurde und keine temporäre PDF vorhanden ist, abbrechen
    if (!selectedGame && !uploadedManual) {
        alert("Bitte wähle zuerst ein Spiel aus.");
        return;
    }

    if (question) {
        fetch('/ask-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                game: selectedGame || gameInput.value.trim(), // 🔹 Falls `selectedGame` leer ist, verwende das Eingabefeld
                question,
                manual: uploadedManual, 
            }),
        })
        .then((res) => res.json())
        .then((data) => {
            answerOutput.value = data.answer || 'Keine Antwort erhalten.';
            adjustTextareaHeight(answerOutput);
        })
        .catch((error) => {
            console.error('Fehler bei der Anfrage:', error);
            answerOutput.value = 'Es gab ein Problem bei der Anfrage.';
            adjustTextareaHeight(answerOutput);
        });
    } else {
        alert('Bitte gib eine Frage ein.');
    }
});

