const https = require('node:https');
const db = require('./db');

let secrets = {};
try {
  secrets = require('../config/secrets.json');
} catch (e) {
  // Ignore missing secrets file
}

/**
 * Fetch real-time NFL player news via SerpAPI
 */
async function fetchPlayerNews(query = 'NFL fantasy news player injuries sleeper 2026') {
  const apiKey = process.env.SERPAPI_KEY || secrets.serpapi_key;
  if (!apiKey) {
    console.warn('SERPAPI_KEY missing. Skipping live SerpAPI request.');
    return { articles: [], status: 'no_key' };
  }

  const url = `https://serpapi.com/search.json?engine=google_news&q=${encodeURIComponent(query)}&hl=en&gl=us&api_key=${apiKey}`;

  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', async () => {
        try {
          const parsed = JSON.parse(data);
          const newsResults = parsed.news_results || [];

          // Map top news articles
          const articles = newsResults.slice(0, 10).map(item => ({
            title: item.title,
            snippet: item.snippet,
            link: item.link,
            source: item.source ? item.source.name : 'NFL News',
            date: item.date || new Date().toISOString()
          }));

          // Log sync event in Turso DB
          await db.logNewsSync(query, articles.length, 'success');

          resolve({ articles, status: 'success' });
        } catch (err) {
          console.error('Error parsing SerpAPI response:', err);
          resolve({ articles: [], status: 'parse_error' });
        }
      });
    }).on('error', (err) => {
      console.error('SerpAPI HTTP request error:', err);
      resolve({ articles: [], status: 'http_error' });
    });
  });
}

module.exports = {
  fetchPlayerNews
};
