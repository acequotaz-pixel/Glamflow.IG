/**
 * GLAMFLOW — Pre-Deployment Connection Test
 * Run: node test-connection.js
 * Tests: Instagram API, Anthropic AI, Cloudinary, Token validity
 */

require('dotenv').config();
const axios     = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const CONFIG = {
  IG_USER_ID   : process.env.IG_USER_ID,
  IG_TOKEN     : process.env.IG_TOKEN,
  ANTHROPIC_KEY: process.env.ANTHROPIC_API_KEY,
  CLOUDINARY   : process.env.CLOUDINARY_CLOUD_NAME,
  API_VER      : 'v21.0',
};

const PASS = '✅';
const FAIL = '❌';
const WARN = '⚠️ ';

async function testInstagram() {
  process.stdout.write('Testing Instagram API... ');

  if (!CONFIG.IG_USER_ID || !CONFIG.IG_TOKEN) {
    console.log(`${WARN} SKIPPED — IG_USER_ID or IG_TOKEN not set in .env`);
    return false;
  }

  try {
    const res = await axios.get(
      `https://graph.facebook.com/${CONFIG.API_VER}/${CONFIG.IG_USER_ID}`,
      {
        params: {
          fields      : 'id,username,followers_count',
          access_token: CONFIG.IG_TOKEN,
        },
      }
    );
    console.log(`${PASS} Connected as @${res.data.username} (${res.data.followers_count} followers)`);
    return true;
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    console.log(`${FAIL} FAILED — ${msg}`);
    return false;
  }
}

async function testAnthropic() {
  process.stdout.write('Testing Anthropic Claude... ');

  if (!CONFIG.ANTHROPIC_KEY) {
    console.log(`${WARN} SKIPPED — ANTHROPIC_API_KEY not set in .env`);
    return false;
  }

  try {
    const client = new Anthropic({ apiKey: CONFIG.ANTHROPIC_KEY });
    const msg    = await client.messages.create({
      model    : 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages : [{ role: 'user', content: 'Reply with just: GLAMFLOW_OK' }],
    });
    const reply = msg.content[0]?.text || '';
    if (reply.includes('GLAMFLOW_OK')) {
      console.log(`${PASS} Claude API connected and responding`);
    } else {
      console.log(`${PASS} Claude API connected (response: ${reply.trim()})`);
    }
    return true;
  } catch (err) {
    console.log(`${FAIL} FAILED — ${err.message}`);
    return false;
  }
}

async function testTokenExpiry() {
  process.stdout.write('Checking token expiry... ');

  if (!CONFIG.IG_TOKEN) {
    console.log(`${WARN} SKIPPED — no token`);
    return;
  }

  try {
    const res = await axios.get('https://graph.facebook.com/debug_token', {
      params: {
        input_token : CONFIG.IG_TOKEN,
        access_token: `${process.env.IG_APP_ID}|${process.env.IG_APP_SECRET}`,
      },
    });
    const data       = res.data.data;
    const expiresAt  = data.expires_at ? new Date(data.expires_at * 1000) : null;
    const daysLeft   = expiresAt
      ? Math.round((expiresAt - Date.now()) / 86400000)
      : null;

    if (daysLeft !== null) {
      const icon = daysLeft < 7 ? FAIL : daysLeft < 14 ? WARN : PASS;
      console.log(`${icon} Token valid for ${daysLeft} more days (expires: ${expiresAt?.toDateString()})`);
    } else {
      console.log(`${WARN} Could not determine expiry (App ID/Secret may not be set)`);
    }
  } catch (_) {
    console.log(`${WARN} Could not check expiry — App ID/Secret not configured`);
  }
}

async function testCloudinary() {
  process.stdout.write('Testing Cloudinary... ');

  if (!CONFIG.CLOUDINARY) {
    console.log(`${WARN} SKIPPED — using default Unsplash images instead`);
    return false;
  }

  try {
    const res = await axios.get(
      `https://api.cloudinary.com/v1_1/${CONFIG.CLOUDINARY}/usage`,
      {
        auth: {
          username: process.env.CLOUDINARY_API_KEY,
          password: process.env.CLOUDINARY_API_SECRET,
        },
      }
    );
    const used = (res.data.storage?.usage / 1024 / 1024).toFixed(1);
    console.log(`${PASS} Cloudinary connected (${used}MB storage used)`);
    return true;
  } catch (err) {
    console.log(`${FAIL} FAILED — ${err.response?.data?.error?.message || err.message}`);
    return false;
  }
}

async function run() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   GLAMFLOW Pre-Deployment Connection Test   ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  const ig   = await testInstagram();
  const ai   = await testAnthropic();
  const cl   = await testCloudinary();
  await testTokenExpiry();

  console.log('\n──────────────────────────────────────────────');
  const allGood = ig && ai;
  if (allGood) {
    console.log(`${PASS} All critical connections OK — ready to deploy!\n`);
    console.log('Next steps:');
    console.log('  1. git add . && git commit -m "GLAMFLOW backend v2"');
    console.log('  2. git push origin main');
    console.log('  3. Connect repo to Render.com → New Web Service');
    console.log('  4. Add env vars in Render dashboard');
    console.log('  5. Add RENDER_BACKEND_URL secret to GitHub repo\n');
  } else {
    console.log(`${WARN} Some connections failed — check .env before deploying\n`);
    if (!ig) console.log('  → Fix: Set IG_USER_ID and IG_TOKEN in .env');
    if (!ai) console.log('  → Fix: Set ANTHROPIC_API_KEY in .env');
    if (!cl) console.log('  → Info: Cloudinary optional — default images will be used');
    console.log('');
  }
}

run().catch(console.error);
