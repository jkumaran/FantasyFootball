const { fetchPlayerNews } = require('../services/serpapi');

(async () => {
  console.log('🏈 Fetching real-time NFL player news via SerpAPI...');
  const result = await fetchPlayerNews('NFL fantasy player injury target share sleepers 2026');
  console.log(`✅ Sync completed. Fetched ${result.articles.length} news articles.`);
  if (result.articles.length > 0) {
    console.log('\nTop Headline:');
    console.log(`- ${result.articles[0].title} (${result.articles[0].source})`);
  }
  process.exit(0);
})();
