const express = require('express');
const cors = require('cors'); // Indispensable pour éviter les erreurs de blocage entre ton front et ton back
require('dotenv').config(); // Pour charger ton STRIPE_SECRET_KEY depuis un fichier .env

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors()); // Autorise ton frontend à appeler ton API
app.use(express.json());

// Routes
app.use('/api/onramp', require('./routes/onramp'));

// Test simple
app.get('/', (req, res) => res.send('Koppi API is running'));

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
