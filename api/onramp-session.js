export default async function handler(req, res) {
  // On met un log pour voir si Vercel appelle bien cette fonction
  console.log("API ONRAMP APPELÉE");

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Pour tester, on envoie une réponse bidon juste pour voir si le 404 disparaît
    return res.status(200).json({ clientSecret: "test_secret_123" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
