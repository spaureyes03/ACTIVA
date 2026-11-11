import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import cors from 'cors';
import dotenv from 'dotenv';
import { load } from 'cheerio';

import { GoogleGenAI } from '@google/genai';

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});


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



// Generar comentarios con inteligencia artificial
app.post('/api/generate-comments', async (req, res) => {
  try {
    const {
      description,
      mentions = [],
      hashtags = []
    } = req.body;

    const cleanDescription = String(description || '').trim();

    const prompt = cleanDescription
      ? `Genera exactamente 4 comentarios diferentes para interactuar
con una publicación institucional en redes sociales.

CONTENIDO DE LA PUBLICACIÓN:
${cleanDescription}

REGLAS:
- Relaciona los comentarios con el contenido proporcionado.
- Usa español natural, claro y cordial.
- Mantén un tono institucional, pero cercano.
- Evita frases repetitivas y comentarios exagerados.
- No inventes datos ni afirmes cosas que no aparecen en el contenido.
- Cada comentario debe tener una redacción diferente.
- No incluyas menciones ni hashtags; se agregarán después.
- Devuelve únicamente un arreglo JSON con 4 comentarios.`
      : `Genera exactamente 4 comentarios genéricos para una publicación institucional cuyo contenido no pudo recuperarse.

REGLAS:
- No inventes ni supongas de qué trata la publicación.
- Usa español natural, cordial e institucional.
- Evita repetir frases.
- No incluyas menciones ni hashtags.
- Devuelve únicamente un arreglo JSON con 4 comentarios.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'ARRAY',
          items: { type: 'STRING' }
        }
      }
    });

    const comments = JSON.parse(response.text);

    if (!Array.isArray(comments) || comments.length !== 4) {
      throw new Error('La IA no generó los 4 comentarios esperados.');
    }

    const mentionText = mentions
      .map(item => String(item).trim())
      .filter(Boolean)
      .map(item => item.startsWith('@') ? item : `@${item}`)
      .join(' ');

    const hashtagText = hashtags
      .map(item => String(item).trim())
      .filter(Boolean)
      .map(item => item.startsWith('#') ? item : `#${item}`)
      .join(' ');

    const suffix = [mentionText, hashtagText]
      .filter(Boolean)
      .join(' ');

    const finalComments = comments.map(comment =>
      [String(comment).trim(), suffix].filter(Boolean).join(' ')
    );

    res.json({
      success: true,
      comments: finalComments
    });

  } /*catch (error) {
    console.error('Error al generar comentarios:', error);

    res.status(500).json({
      error: 'No fue posible generar los comentarios con IA.'
    });
  }
});*/
  




catch (error) {
    console.error('Gemini no está disponible. Usando comentarios base:', error);

    const baseComments = [
      'Es importante mantenernos informados sobre las acciones e iniciativas que se realizan en beneficio de las y los poblanos.',
      'Gracias por compartir información de interés para la ciudadanía. Estar informados nos permite conocer lo que sucede en nuestro estado.',
      'Siempre es valioso conocer las actividades y proyectos que se impulsan en nuestro estado. ¡Gracias por mantenernos al tanto!',
      'Puebla cuenta con una gran diversidad de necesidades y oportunidades. Es importante conocer las acciones que se llevan a cabo en sus diferentes regiones.'
    ];

   const mentionText = (Array.isArray(req.body?.mentions) ? req.body.mentions : [])
      .map(item => String(item).trim())
      .filter(Boolean)
      .map(item => item.startsWith('@') ? item : `@${item}`)
      .join(' ');

    //const hashtagText = hashtags
    const hashtagText = (Array.isArray(req.body?.hashtags) ? req.body.hashtags : [])
      .map(item => String(item).trim())
      .filter(Boolean)
      .map(item => item.startsWith('#') ? item : `#${item}`)
      .join(' ');

    const suffix = [mentionText, hashtagText]
      .filter(Boolean)
      .join(' ');

    const finalComments = baseComments.map(comment =>
      [comment, suffix].filter(Boolean).join(' ')
    );

    res.json({
      success: true,
      fallback: true,
      comments: finalComments
    });
  }
});







app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`ACTIVA backend funcionando en http://localhost:${PORT}`);
});
