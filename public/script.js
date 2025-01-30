const gameInput = document.getElementById('gameInput');
const startButton = document.getElementById('startButton');
const micButton = document.getElementById('micButton'); // Mikrofon-Button für Spielauswahl
const resetButton = document.getElementById('resetButton'); // Zurücksetzen-Button
const questionArea = document.getElementById('question-area');
const selectedGameElement = document.getElementById('selectedGame');
const askButton = document.getElementById('askButton');
const questionInput = document.getElementById('questionInput');
const micQuestionButton = document.getElementById('micQuestionButton'); // Mikrofon-Button für Fragen
const answerOutput = document.getElementById('answerOutput');
const speakButton = document.getElementById('speakButton'); // Lautsprecher-Button
const gameNotFoundDiv = document.getElementById('game-not-found'); // Bereich für "Spiel nicht gefunden"
const uploadButton = document.getElementById('uploadButton'); // Button zum Hochladen
let uploadedManual = null; // Temporäre Anleitung
let selectedGame = null; // Merkt sich das aktuell ausgewählte Spiel

// Funktion: Textfeldhöhe automatisch anpassen
const adjustTextareaHeight = (textarea) => {
  textarea.style.height = 'auto'; // Setze die Höhe zurück, um die Scrollhöhe korrekt zu berechnen
  textarea.style.height = `${textarea.scrollHeight}px`; // Setze die Höhe auf die Scrollhöhe
};

// Logik für den Absendepfeil bei der Spielauswahl
gameInput.addEventListener('input', () => {
  if (gameInput.value.trim() !== '') {
    micButton.classList.add('hidden'); // Verstecke Mikrofon
    startButton.classList.remove('hidden'); // Zeige Absendepfeil
  } else {
    micButton.classList.remove('hidden'); // Zeige Mikrofon
    startButton.classList.add('hidden'); // Verstecke Absendepfeil
  }
  adjustTextareaHeight(gameInput); // Passe die Höhe des Eingabefelds an
});

// Logik für den Absendepfeil bei der Frageingabe
questionInput.addEventListener('input', () => {
  if (questionInput.value.trim() !== '') {
    micQuestionButton.classList.add('hidden'); // Verstecke Mikrofon
    askButton.classList.remove('hidden'); // Zeige Absendepfeil
  } else {
    micQuestionButton.classList.remove('hidden'); // Zeige Mikrofon
    askButton.classList.add('hidden'); // Verstecke Absendepfeil
  }
  adjustTextareaHeight(questionInput); // Passe die Höhe des Fragefelds an
});

// Spiel auswählen
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
          selectedGameElement.classList.remove('hidden'); // Zeige "Spiel"
          resetButton.classList.remove('hidden'); // Zeige Zurücksetzen-Button
          questionArea.style.display = 'block'; // Zeige den Fragebereich
          gameNotFoundDiv.classList.add('hidden'); // Verstecke den Upload-Bereich
          gameInput.disabled = true; // Deaktiviere die Spielauswahl
          startButton.disabled = true;
        } else {
          gameNotFoundDiv.classList.remove('hidden'); // Zeige den Upload-Bereich
        }
      })
      .catch((error) => {
        console.error('Fehler bei der Spielauswahl:', error);
      });
  } else {
    alert('Bitte gib einen gültigen Spielnamen ein.');
  }
});

const suggestionsList = document.createElement('ul'); // Liste für Vorschläge
suggestionsList.id = 'suggestions';
suggestionsList.className = 'absolute bg-white border border-gray-300 rounded shadow-md mt-1 w-full z-10';
suggestionsList.style.display = 'none'; // Standardmäßig ausblenden
gameInput.parentNode.appendChild(suggestionsList); // Füge die Liste unter dem Eingabefeld hinzu

// Funktion: Vorschläge anzeigen
const showSuggestions = (suggestions) => {
  suggestionsList.innerHTML = ''; // Liste zurücksetzen
  if (suggestions.length === 0) {
    suggestionsList.style.display = 'none'; // Verstecke die Liste
    return;
  }

  suggestions.forEach((game) => {
    const listItem = document.createElement('li');
    listItem.textContent = game;
    listItem.className = 'p-2 cursor-pointer hover:bg-gray-100';
    listItem.addEventListener('click', () => {
      gameInput.value = game; // Setze den gewählten Spielnamen
      suggestionsList.style.display = 'none'; // Verstecke die Liste
      startButton.click(); // Simuliere Klick auf den Start-Button
    });
    suggestionsList.appendChild(listItem);
  });

  suggestionsList.style.display = 'block'; // Zeige die Liste an
};

// Event: Eingabe im Spielefeld
gameInput.addEventListener('input', () => {
  const query = gameInput.value.trim();
  if (query.length < 3) {
    suggestionsList.style.display = 'none'; // Verstecke die Liste, wenn weniger als 3 Zeichen
    return;
  }

  // Anfrage an den Server
  fetch(`/autocomplete?q=${encodeURIComponent(query)}`)
    .then((res) => res.json())
    .then((data) => showSuggestions(data))
    .catch((error) => console.error('Fehler bei der Autovervollständigung:', error));
});

// Event: Verstecke Vorschläge bei Klick außerhalb
document.addEventListener('click', (event) => {
  if (!gameInput.contains(event.target) && !suggestionsList.contains(event.target)) {
    suggestionsList.style.display = 'none';
  }
});


// Frage stellen
askButton.addEventListener('click', () => {
  const question = questionInput.value.trim();
  if (question) {
    fetch('/ask-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game: selectedGame,
        question,
        manual: uploadedManual, // Übergebe die temporäre Anleitung (Base64)
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        answerOutput.value = data.answer || 'Keine Antwort erhalten.';
        adjustTextareaHeight(answerOutput); // Passe die Höhe des Antwortfelds an
      })
      .catch((error) => {
        console.error('Fehler bei der Anfrage:', error);
        answerOutput.value = 'Es gab ein Problem bei der Anfrage.';
        adjustTextareaHeight(answerOutput); // Passe die Höhe des Antwortfelds an
      });
  } else {
    alert('Bitte gib eine Frage ein.');
  }
});

// Enter-Funktion für Spiel auswählen
gameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault(); // Verhindert Zeilenumbruch
    startButton.click(); // Simuliere Klick auf "Start"
  }
});

// Enter-Funktion für Frage stellen
questionInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault(); // Verhindert Zeilenumbruch
    askButton.click(); // Simuliere Klick auf "Frage stellen"
  }
});

// Datei hochladen
uploadButton.addEventListener('click', () => {
  const uploadInput = document.createElement('input');
  uploadInput.type = 'file';
  uploadInput.accept = 'application/pdf';

  uploadInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        uploadedManual = btoa(reader.result); // Speichere Anleitung als Base64
        alert('Die Anleitung wurde erfolgreich hochgeladen.');
        gameNotFoundDiv.classList.add('hidden'); // Verstecke den Upload-Bereich
        questionArea.style.display = 'block'; // Zeige den Fragebereich
      };
      reader.readAsBinaryString(file);
    }
  });

  uploadInput.click();
});

resetButton.addEventListener('click', () => {
  selectedGame = null;
  uploadedManual = null; // Temporäre Anleitung zurücksetzen
  gameInput.value = '';
  questionInput.value = '';
  answerOutput.value = '';
  selectedGameElement.classList.add('hidden'); // Verstecke "Spiel"
  resetButton.classList.add('hidden'); // Verstecke Zurücksetzen-Button
  questionArea.style.display = 'none'; // Verstecke den Fragebereich
  gameNotFoundDiv.classList.add('hidden'); // Verstecke Upload-Bereich
  gameInput.disabled = false;
  startButton.disabled = false;
  micButton.classList.remove('hidden'); // Zeige Mikrofon
  startButton.classList.add('hidden'); // Verstecke Absendepfeil
  micQuestionButton.classList.remove('hidden'); // Zeige Mikrofon
  askButton.classList.add('hidden'); // Verstecke Absendepfeil
});
