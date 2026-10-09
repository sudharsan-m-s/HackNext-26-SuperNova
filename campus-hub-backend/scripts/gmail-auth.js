// One-time helper that prints a Gmail refresh token. Usage: npm run gmail:auth
// Needs GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET (OAuth client of type "Desktop app") in .env
import 'dotenv/config';
import http from 'node:http';
import { auth } from '@googleapis/gmail';

const { GMAIL_CLIENT_ID: id, GMAIL_CLIENT_SECRET: secret } = process.env;
if (!id || !secret) { console.error('Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env first.'); process.exit(1); }

const PORT = 53682;
const redirect = `http://localhost:${PORT}/oauth2callback`;
const client = new auth.OAuth2(id, secret, redirect);
const url = client.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: ['https://www.googleapis.com/auth/gmail.readonly'] });

const server = http.createServer(async (req, res) => {
  const code = new URL(req.url, redirect).searchParams.get('code');
  if (!code) { res.end('Waiting for Google...'); return; }
  try {
    const { tokens } = await client.getToken(code);
    res.end('Done. You can close this tab and go back to the terminal.');
    console.log('\nAdd this to your .env:\n\nGMAIL_MODE=gmail\nGMAIL_REFRESH_TOKEN=' + tokens.refresh_token + '\n');
  } catch (err) {
    res.end('Token exchange failed: ' + err.message);
    console.error(err.message);
  }
  server.close();
});
server.listen(PORT, () => console.log('Open this URL in your browser and approve access:\n\n' + url + '\n'));
