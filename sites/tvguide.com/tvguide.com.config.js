const axios = require('axios');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const PROXY_URL = process.env.PROXY_URL;
let useProxy = false; // Toggle flag to alternate requests per channel

module.exports = {
  site: 'tvguide.com',
  delay: 3000,
  days: 1,
  url: function ({ date, channel }) {
    const [providerId, channelSourceIds] = channel.site_id.split('#');
    const url = `https://backend.tvguide.com/tvschedules/tvguide/${providerId}/web?start=${date
      .startOf('d')
      .unix()}&duration=120&channelSourceIds=${channelSourceIds}&apiKey=DI9elXhZ3bU6ujsA2gXEKOANyncXGUGc`;

    return url;
  },
  request: {
    method: 'GET',
    headers: function() {
      return setHeaders();
    }
  },
  async parser({ content, channel }) {
    const programs = [];
    const items = parseItems(content);

    // Set proxy toggle based on channel
    useProxy = !useProxy;
    for (let item of items) {
      const details = await loadProgramDetails(item); // Fetch details
      programs.push({
        title: item.title,
        sub_title: details?.episodeTitle || null,
        description: details?.description || null,
        season: details?.seasonNumber || null,
        episode: details?.episodeNumber || null,
        rating: parseRating(item),
        categories: parseCategories(details || {}),
        start: parseTime(item.startTime),
        stop: parseTime(item.endTime)
      });
    }

    return programs;
  },
  async channels() {
    const providers = [9100001138];

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
    ? `${programDetailsUrl.replace('backend.tvguide.com', PROXY_URL)}?apiKey=DI9elXhZ3bU6ujsA2gXEKOANyncXGUGc` // Replace domain with proxy and append apiKey
    : `${programDetailsUrl}?apiKey=DI9elXhZ3bU6ujsA2gXEKOANyncXGUGc`;
  
  console.log(requestUrl);
  
  const data = await axiosInstance
    .get(requestUrl)
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
