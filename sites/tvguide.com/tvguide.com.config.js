const axios = require('axios');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const HttpsProxyAgent = require('https-proxy-agent');

dayjs.extend(utc);
dayjs.extend(timezone);

const PROXY_URL = process.env.PROXY_URL; // Read the proxy URL from the environment variable
let requestCount = 0; // Global counter for the number of requests
let first403Encountered = false; // Flag to track if the first 403 error has been encountered
let startTime = dayjs(); // Start time for tracking duration

module.exports = {
  site: 'tvguide.com',
  delay: 2500,
  days: 1,
  url: function ({ date, channel }) {
    const [providerId, channelSourceIds] = channel.site_id.split('#');
    const url = `https://backend.tvguide.com/tvschedules/tvguide/${providerId}/web?start=${date
      .startOf('d')
      .unix()}&duration=12000&channelSourceIds=${channelSourceIds}`;

    return url;
  },
  request: {
    method: 'GET',
    headers: {
      'Referer': 'https://www.tvguide.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    }
  },
  async parser({ content }) {
    const programs = [];
    const items = parseItems(content);
    for (let item of items) {
      const details = await loadProgramDetails(item);
      programs.push({
        title: item.title,
        description: details.description,
        start: parseTime(item.startTime),
        stop: parseTime(item.endTime)
      });
    }
    return programs;
  },
  async channels() {
    const providers = [9133001044];

    let channels = [];
    for (let providerId of providers) {
      const data = await retryRequest(() => axios.get(
        `https://backend.tvguide.com/tvschedules/tvguide/serviceprovider/${providerId}/sources/web`
      ), 10, 15000); // Increased maxRetries and fixed delay of 15 seconds

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

async function loadProgramDetails(item) {
  const data = await retryRequest((useProxy) => createAxiosInstance(useProxy).get(item.programDetails), 10, 61000);
  if (!data || !data.data || !data.data.item) return {};
  return data.data.item;
}

function setHeaders() {
  return {
    'Referer': 'https://www.tvguide.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  };
}

async function retryRequest(requestFn, maxRetries, initialDelay) {
  let retries = 0;
  let useProxy = false;
  let delay = initialDelay;

  while (retries < maxRetries) {
    try {
      requestCount++; // Increment the request count
      const response = await requestFn(useProxy);
      const duration = dayjs().diff(startTime, 'seconds');
      console.log(`Successful request after ${requestCount} requests and ${duration} seconds.`);
      requestCount = 0; // Reset the request count
      startTime = dayjs(); // Reset the start time
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 403) {
        if (!first403Encountered) {
          const duration = dayjs().diff(startTime, 'seconds');
          console.log(`First 403 error encountered after ${requestCount} requests and ${duration} seconds.`);
          first403Encountered = true; // Set the flag to true
        }
        retries++;
        useProxy = !useProxy; // Toggle between using proxy and normal request
        console.log(`Retry ${retries}/${maxRetries}: Waiting for ${delay}ms, using proxy: ${useProxy}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, 60000); // Exponential backoff with a max delay of 60 seconds
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}

function createAxiosInstance(useProxy) {
  const instance = axios.create({
    headers: setHeaders(),
    httpsAgent: useProxy ? new HttpsProxyAgent(PROXY_URL) : undefined
  });
  return instance;
}
