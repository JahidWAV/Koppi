const PRIVY_APP_ID = process.env.PRIVY_APP_ID;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, email, fullName } = req.body;
    if (!userId || !email) {
      return res.status(400).json({ error: 'userId et email requis' });
    }

    const basicAuth = Buffer.from(`${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`).toString('base64');

    const response = await fetch(`https://api.privy.io/v1/users/${userId}/fiat/kyc_link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'privy-app-id': PRIVY_APP_ID,
        Authorization: `Basic ${basicAuth}`
      },
      body: JSON.stringify({
        provider: 'bridge',
        email: email,
        full_name: fullName || email,
        type: 'individual'
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Erreur Privy KYC:', errText);
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    return res.status(200).json({
      kycLink: data.kyc_link,
      kycStatus: data.kyc_status,
      customerId: data.customer_id
    });
  } catch (error) {
    console.error('Erreur complète:', error);
    return res.status(500).json({ error: error.message });
  }
}
