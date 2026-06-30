export default async function handler(req, res) {
  // Vérification de la méthode
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { walletAddress } = req.body;
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

  // Vérification de sécurité pour l'adresse du wallet
  if (!walletAddress) {
    return res.status(400).json({ error: "L'adresse du wallet est manquante" });
  }

  try {
    // Structure du body attendue par l'API Stripe
    const body = {
      'wallet_addresses': {
        'base': walletAddress
      },
      'destination_networks': ['base']
    };

    const response = await fetch('https://api.stripe.com/v1/crypto/onramp_sessions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    
    // Vérification du résultat de l'appel
    if (data.client_secret) {
      return res.status(200).json({ clientSecret: data.client_secret });
    } else {
      console.error("Erreur Stripe:", data);
      return res.status(500).json({ error: data.error?.message || "Erreur lors de la création de la session" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
