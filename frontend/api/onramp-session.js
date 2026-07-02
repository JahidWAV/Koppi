import { SignJWT, importPKCS8 } from 'jose';

const CDP_API_KEY_ID = process.env.CDP_API_KEY_ID;
const CDP_API_KEY_SECRET = process.env.CDP_API_KEY_SECRET.replace(/\\n/g, '\n');
const REQUEST_HOST = 'api.developer.coinbase.com';
const REQUEST_PATH = '/onramp/v1/token';

async function generateJWT() {
  const key = await importPKCS8(CDP_API_KEY_SECRET, 'ES256');
  const uri = `POST ${REQUEST_HOST}${REQUEST_PATH}`;

  const jwt = await new SignJWT({
    sub: CDP_API_KEY_ID,
    iss: 'cdp',
    aud: [REQUEST_HOST],
    uris: [uri]
  })
    .setProtectedHeader({ alg: 'ES256', kid: CDP_API_KEY_ID, typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('2m')
    .setNotBefore(new Date())
    .sign(key);

  return jwt;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress requis' });
    }

    const clientIp = req.headers['x-real-ip'] || req.socket.remoteAddress || '0.0.0.0';

    const jwt = await generateJWT();

    const response = await fetch(`https://${REQUEST_HOST}${REQUEST_PATH}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        addresses: [
          { address: walletAddress, blockchains: ['base'] }
        ],
        assets: ['USDC'],
        clientIp
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    return res.status(200).json({ sessionToken: data.token });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
