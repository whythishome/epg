const axios = require('axios');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const PROXY_URL_1 = process.env.PROXY_URL_1;
const PROXY_URL_2 = process.env.PROXY_URL_2;
let useProxy = false; // Toggle flag to alternate requests per channel

module.exports = {
  site: 'tvguide.com',
  delay: 3000,
  days: 1,
  url: function ({ date, channel }) {
    const [providerId, channelSourceIds] = channel.site_id.split('#');
    const requestDomain = useProxy ? PROXY_URL_1 : PROXY_URL_2;
    const url = `https://${requestDomain}/tvschedules/tvguide/${providerId}/web?start=${date
      .startOf('d')
      .unix()}&duration=10240&channelSourceIds=${channelSourceIds}&apiKey=DI9elXhZ3bU6ujsA2gXEKOANyncXGUGc`;
    return url;
  },
  request: {
    method: 'GET',
    timeout: 3000,
    cache: { ttl: 60 * 60 * 1000 },
    headers: function() {
      return setHeaders();
    }
  },
  async parser({ content, channel }) {
    const programs = [];
    const items = parseItems(content);

    if (items.length > 0) {
      useProxy = !useProxy;
    }
    
    for (let item of items) {
      const details = await loadProgramDetails(item); // Fetch details
    
      // Extract necessary properties
      const episodeTitle = details?.episodeTitle || '';
      const description = details?.description || '';
      const seasonNumber = details?.seasonNumber || '';
      const episodeNumber = details?.episodeNumber || '';
      const releaseYear = details?.releaseYear || '';
      const tvRating = details?.tvRating || '';
      const firstGenre = details?.genres?.[0]?.name || '';
      const secondGenre = details?.genres?.[1]?.name || '';
      const episodeAirDate = details?.episodeAirDate || '';
      
      // Extract the timestamp and convert it to a Date object
      const timestamp = episodeAirDate.match(/\/Date\((\d+)\)\//);
      const airDate = timestamp ? new Date(parseInt(timestamp[1])) : null;
    
      // Format the date if it exists
      const formattedDate = airDate ? airDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : '';

      // Create the new description variable conditionally
      let newDescription = '';
      if (episodeTitle) newDescription += `${episodeTitle}`;
      if (seasonNumber && episodeNumber) newDescription += ` - S${seasonNumber}E${episodeNumber}.`;
      newDescription += ` ${description}`;
      // if (tvRating) newDescription += ` ${tvRating}.`;
      // if (firstGenre) newDescription += ` ${firstGenre}`;
      // if (secondGenre) newDescription += `/${secondGenre}`;
      if (formattedDate) newDescription += ` (${formattedDate})`;

      if (details.type == 'movie') {
        newDescription = description;
        // if (tvRating) newDescription += ` ${tvRating}.`;
        // if (firstGenre) newDescription += ` ${firstGenre}`;
        // if (secondGenre) newDescription += `/${secondGenre}`;
        if (releaseYear) newDescription += ` (${releaseYear})`;
      }
    
      programs.push({
        title: item.title,
        description: newDescription.trim(), // Trim any leading/trailing whitespace
        start: parseTime(item.startTime),
        stop: parseTime(item.endTime)
      });
    }
    return programs;
  },
  async channels() {
    const providers = [9100002976];

    let channels = [];
    for (let providerId of providers) {
      const data = await axios
        .get(
          `https://backend.tvguide.com/tvschedules/tvguide/serviceprovider/${providerId}/sources/web`
        )
        .then(r => r.data)
        .catch(console.log);
      data.data.items.forEach(item => {
        channels.push({
          lang: 'en',
          site_id: `${providerId}#${item.sourceId}`,
          name: item.fullName,
          logo: item.logo ? `https://www.tvguide.com/a/img/catalog${item.logo}` : null
        });
      });
    }

    return channels;
  }
};

async function loadProgramDetails(item) {
  const programDetailsUrl = item.programDetails;

  const axiosInstance = axios.create({
    headers: setHeaders()
  });

  const requestUrl = useProxy
    ? `${programDetailsUrl.replace(PROXY_URL_2, PROXY_URL_1)}?apiKey=DI9elXhZ3bU6ujsA2gXEKOANyncXGUGc` // Replce domain with proxy and append apiKey
    : `${programDetailsUrl.replace(PROXY_URL_1, PROXY_URL_2)}?apiKey=DI9elXhZ3bU6ujsA2gXEKOANyncXGUGc`;
  const data = await axiosInstance
    .get(requestUrl, { timeout: 5000 })
    .then(r => r.data)
    .catch(err => {
      console.log(`Error fetching program details: ${err.message}`);
      return null; // Handle failed request gracefully
    });
  if (!data || !data.data || !data.data.item) return {};

  return data.data.item;
}

function parseRating(item) {
  return item.rating ? { system: 'MPA', value: item.rating } : null;
}

function parseCategories(details) {
  return Array.isArray(details.genres) ? details.genres.map(g => g.name) : [];
}

function parseTime(timestamp) {
  return dayjs.unix(timestamp);
}

function parseItems(content) {
  const data = JSON.parse(content);
  if (!data.data || !Array.isArray(data.data.items) || !data.data.items.length) return [];

  return data.data.items[0].programSchedules;
}

function setHeaders() {
  return {
    'Referer': 'https://www.tvguide.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  };
}
