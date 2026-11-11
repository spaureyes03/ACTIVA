import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import cors from 'cors';
import dotenv from 'dotenv';
import { load } from 'cheerio';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
//const PORT = 3001;
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

const allowedDomains = [
  'facebook.com',
  'fb.watch',
  'instagram.com',
  'tiktok.com',
  'x.com',
  'twitter.com',
  'youtube.com',
  'youtu.be'
];
/*
app.get('/', (req, res) => {
  res.json({
    message: 'ACTIVA: servidor funcionando correctamente 🚀'
  });
});*/

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Analizar un enlace de publicación
app.post('/api/analyze-link', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'Debes proporcionar un enlace.'
      });
    }

    const parsedUrl = new URL(url);

    const validDomain = allowedDomains.some(domain =>
      parsedUrl.hostname === domain ||
      parsedUrl.hostname.endsWith(`.${domain}`)
    );

    if (
      parsedUrl.protocol !== 'https:' ||
      !validDomain ||
      parsedUrl.username ||
      parsedUrl.password
    ) {
      return res.status(400).json({
        error: 'El enlace no pertenece a una plataforma compatible.'
      });
    }

   let currentUrl = url;
let response;
let redirectCount = 0;

while (redirectCount <= 5) {
  response = await fetch(currentUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ACTIVA/1.0)'
    },
    redirect: 'manual',
    signal: AbortSignal.timeout(10000)
  });

  if ([301, 302, 303, 307, 308].includes(response.status)) {
    const location = response.headers.get('location');

    if (!location || redirectCount === 5) {
      return res.status(422).json({
        error: 'No fue posible completar la redirección.'
      });
    }

    const nextUrl = new URL(location, currentUrl);

    const validRedirect = allowedDomains.some(domain =>
      nextUrl.hostname === domain ||
      nextUrl.hostname.endsWith(`.${domain}`)
    );

    if (
      nextUrl.protocol !== 'https:' ||
      !validRedirect ||
      nextUrl.username ||
      nextUrl.password
    ) {
      return res.status(422).json({
        error: 'Facebook redirigió a una dirección no permitida.'
      });
    }

    currentUrl = nextUrl.href;
    redirectCount++;
    continue;
  }

  break;
}

if (!response.ok) {
  return res.status(422).json({
    error: 'No fue posible acceder a la publicación.',
    status: response.status
  });
}
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('text/html')) {
      return res.status(422).json({
        error: 'La página no proporcionó contenido HTML.'
      });
    }

    const html = await response.text();
    const $ = load(html);

    const title =
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text() ||
      '';

    const description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      '';

    const image =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      '';

    res.json({
      success: true,
      platform: parsedUrl.hostname,
      url,
      title,
      description,
      image,
      message: title || description
        ? 'Información recuperada correctamente.'
        : 'No se encontró información pública de la publicación.'
    });

  } catch (error) {
    res.status(500).json({
      error: 'Ocurrió un problema al analizar el enlace.',
      details: error.message
    });
  }
});


app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`ACTIVA backend funcionando en http://localhost:${PORT}`);
});
