const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const IG_USER_ID = process.env.IG_USER_ID;
const IG_TOKEN   = process.env.IG_TOKEN;
const API_VER    = 'v21.0';

// STEP 1: Create media container
app.post('/api/create-container', async (req, res) => {
  const { imageUrl, caption } = req.body;
  try {
    const r = await axios.post(
      `https://graph.facebook.com/${API_VER}/${IG_USER_ID}/media`,
      { image_url: imageUrl, caption, access_token: IG_TOKEN }
    );
    res.json({ creation_id: r.data.id });
  } catch (e) {
    res.status(500).json({ error: e.response?.data || e.message });
  }
});

// STEP 2: Publish container
app.post('/api/publish', async (req, res) => {
  const { creation_id } = req.body;
  try {
    const r = await axios.post(
      `https://graph.facebook.com/${API_VER}/${IG_USER_ID}/media_publish`,
      { creation_id, access_token: IG_TOKEN }
    );
    res.json({ post_id: r.data.id });
  } catch (e) {
    res.status(500).json({ error: e.response?.data || e.message });
  }
});

app.listen(3000, () => console.log('GLAMFLOW backend running'));
