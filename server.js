require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const multer = require('multer');

const app = express();
const port = 3000;



// Middleware erweitern, um größere Payloads zu verarbeiten
const bodyParser = require('body-parser');


app.use(bodyParser.json({ limit: '50mb' })); // JSON-Payload auf 50 MB erhöhen
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true })); // URL-encoded Daten auf 50 MB erhöhen

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Funktion: Verfügbare Spiele aus dem Upload-Verzeichnis abrufen
const getAvailableGames = () => {
  const uploadsDir = path.join(__dirname, 'public', 'uploads');
  const publishers = ['Hasbro', 'Ravensburger', 'Kosmos', 'Sonstige'];

  let games = [];

  // Hauptverzeichnis durchsuchen
  fs.readdirSync(uploadsDir).forEach((file) => {
    if (file.endsWith('.pdf')) {
      games.push({ name: path.basename(file, '.pdf'), publisher: null });
    }
  });

  // Unterordner durchsuchen
  publishers.forEach((publisher) => {
    const publisherDir = path.join(uploadsDir, publisher);
    if (fs.existsSync(publisherDir) && fs.lstatSync(publisherDir).isDirectory()) {
      fs.readdirSync(publisherDir).forEach((file) => {
        if (file.endsWith('.pdf')) {
          games.push({ name: path.basename(file, '.pdf'), publisher });
        }
      });
    }
  });

  return games;
};



module.exports = getAvailableGames;

// Route: Spielauswahl
app.post('/select-game', (req, res) => {
  const { game } = req.body;
  const availableGames = getAvailableGames();

  // Spiel suchen
  const selectedGame = availableGames.find(g => g.name.toLowerCase() === game.toLowerCase());

  if (selectedGame) {
    res.json({ message: `Das Spiel "${game}" wurde ausgewählt. Du kannst jetzt Fragen zu den Regeln stellen.` });
  } else {
    res.status(404).json({ message: `Die Anleitung für "${game}" ist nicht verfügbar.` });
  }
});


// Route: Autovervollständigung
app.get('/autocomplete', (req, res) => {
  const query = req.query.q?.toLowerCase(); // Hole den Suchtext aus der Anfrage
  if (!query || query.length < 3) {
    return res.json([]); // Gib eine leere Liste zurück, wenn weniger als 3 Zeichen eingegeben wurden
  }

  const availableGames = getAvailableGames(); // Hole alle verfügbaren Spiele
  const filteredGames = availableGames
  .filter(game => game && game.name && typeof game.name === "string") // Absicherung gegen undefined
  .filter(game => game.name.toLowerCase().includes(query));

  // Filtere Spiele basierend auf dem Suchtext

  res.json(filteredGames); // Sende die gefilterte Liste zurück
});

// Route: Frage stellen und Antwort generieren
app.post('/ask-question', async (req, res) => {
  const { game, question, manual } = req.body;
  console.log(`[ASK-QUESTION] Spiel: ${game}, Frage: ${question}`);

  try {
    let pdfText = '';

    if (manual) {
      // Temporäre Anleitung verwenden
      const pdfBuffer = Buffer.from(manual, 'base64');
      const pdfParse = require('pdf-parse');
      const pdfData = await pdfParse(pdfBuffer);
      pdfText = pdfData.text;
    } else {
      // Anleitung aus dem Upload-Verzeichnis laden
      const publishers = ['Hasbro', 'Ravensburger', 'Kosmos', 'Sonstige'];
      let pdfPath = path.join(__dirname, 'public', 'uploads', `${game}.pdf`);
      
      // 🔹 Falls die Datei im Hauptordner nicht gefunden wird, prüfe Unterordner
      if (!fs.existsSync(pdfPath)) {
          for (const publisher of publishers) {
              const altPath = path.join(__dirname, 'public', 'uploads', publisher, `${game}.pdf`);
              if (fs.existsSync(altPath)) {
                  pdfPath = altPath;
                  break;
              }
          }
      }
      
      // 🔹 Falls die Datei immer noch nicht gefunden wird, Fehlermeldung senden
      if (!fs.existsSync(pdfPath)) {
          return res.status(404).json({ answer: `Die Anleitung für "${game}" wurde nicht gefunden.` });
      }
      

      const pdfBuffer = fs.readFileSync(pdfPath);
      const pdfParse = require('pdf-parse');
      const pdfData = await pdfParse(pdfBuffer);
      pdfText = pdfData.text;
    }

    // Anfrage an OpenAI senden
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: `Du bist ein Bot, der Fragen zu Spielanleitungen beantwortet. Antworte in der Sprache der gestellten Frage.` },
          { role: 'user', content: `Das folgende ist die Anleitung für das Spiel ${game}:\n${pdfText}\n\nBeantworte die folgende Frage in der gleichen Sprache: "${question}"` },
      ],
      
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const answer = response.data.choices[0].message.content || 'Keine Antwort erhalten.';
    console.log(`[ASK-QUESTION] Antwort von OpenAI: ${answer}`);

    res.json({ answer });
  } catch (error) {
    console.error('[ASK-QUESTION] Fehler bei der Verarbeitung der Frage:', error.message);
    res.status(500).json({ answer: 'Es gab ein Problem bei der Verarbeitung der Frage.' });
  }
});



// Route: Temporäre Anleitung hochladen
const upload = multer({ storage: multer.memoryStorage() });

app.post('/upload-manual', upload.single('manual'), (req, res) => {
  console.log('Upload-Route aufgerufen.');
  console.log('Body:', req.body);
  console.log('Datei:', req.file);

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Keine Datei hochgeladen.' });
  }

  const { game, question, manual } = req.body;

// 🔹 Sprache der Frage automatisch erkennen
const detectLanguage = require('langdetect').detect;
const questionLanguage = detectLanguage(question);
console.log(`Erkannte Sprache: ${questionLanguage}`);

  const manualBuffer = req.file.buffer;

  if (game && manualBuffer) {
    req.session = req.session || {};
    req.session.tempManuals = req.session.tempManuals || {};
    req.session.tempManuals[game.toLowerCase()] = manualBuffer;

    console.log('Anleitung erfolgreich gespeichert.');
    res.json({ success: true });
  } else {
    console.log('Ungültige Anfrage.');
    res.status(400).json({ success: false, message: 'Ungültige Anfrage.' });
  }
});

// Fehlerbehandlung für nicht gefundene Routen
app.use((req, res) => {
  res.status(404).json({ error: 'Endpunkt nicht gefunden.' });
});

// Server starten
app.listen(port, () => {
  console.log(`Server läuft auf http://localhost:${port}`);
});





app.use(bodyParser.json({ limit: '50mb' })); // JSON-Payload auf 50 MB erhöhen
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true })); // URL-encoded Daten auf 50 MB erhöhen

