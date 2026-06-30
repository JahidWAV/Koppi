export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

  try {
    // Configuration de la session Stripe
    // On précise 'base' dans les réseaux autorisés et par défaut
    const params = new URLSearchParams({
      'allowed_destination_networks[]': 'base',
      'transaction_details[destination_currency]': 'usdc',
      'transaction_details[destination_network]': 'base'
    });

    const response = await fetch('https://api.stripe.com/v1/crypto/onramp_sessions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`, 
        'Content-Type': 'application/x-www-form-urlencoded' 
      },
      body: params.toString()
    });

    const data = await response.json();
    
    if (data.client_secret) {
      return res.status(200).json({ clientSecret: data.client_secret });
    } else {
      console.error("Erreur API Stripe:", data);
      return res.status(500).json({ error: data.error?.message || "Erreur lors de la création de la session" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
