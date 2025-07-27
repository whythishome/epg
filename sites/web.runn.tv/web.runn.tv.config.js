const axios = require('axios');
const dayjs = require('dayjs');
const plugins = ['utc', 'timezone', 'customParseFormat'];

// —–––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
// Axios interceptors for logging
// —–––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
axios.interceptors.request.use(
  config => {
    console.log('→ Request URL:', config.url);
    console.log('→ Request Headers:', JSON.stringify(config.headers, null, 2));
    return config;
  },
  error => Promise.reject(error)
);

axios.interceptors.response.use(
  response => {
    // response.data might be an object or string
    const text = typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data, null, 2);
    console.log('← Response Text:', text);
    return response;
  },
  error => {
    if (error.response) {
      const text = typeof error.response.data === 'string'
        ? error.response.data
        : JSON.stringify(error.response.data, null, 2);
      console.error('← Error Response Text:', text);
    } else {
      console.error('← Network/Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// —–––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
// Your scraper module
// —–––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
require('dayjs/plugin/utc');
require('dayjs/plugin/timezone');
require('dayjs/plugin/customParseFormat');
dayjs.extend(require('dayjs/plugin/utc'));
dayjs.extend(require('dayjs/plugin/timezone'));
dayjs.extend(require('dayjs/plugin/customParseFormat'));

module.exports = {
  site: 'web.runn.tv',
  days: 1,

  url({ channel }) {
    return `https://prod-epg.runn.tv/runtv/v1/schedule/getChannelEpg/${channel.site_id}`;
  },

  request: {
    method: 'GET',
    headers: {
      userid: '0D-62-2D-15-FD-CE',
      'User-Agent': 'PostmanRuntime/7.44.1',
      Accept: 'application/json, text/plain, */*'
    }
  },

  parser: ({ channel, content }) => {
    const programs = [];
    const items = parseItems(content);

    items.forEach(item => {
      const startMs = item.startTimeEpoch ?? item.startTime;
      const endMs = startMs + item.durationSeconds * 1000;

      programs.push({
        title:       item.programName,
        description: item.description,
        icon:        item.infoImages.web,
        start:       parseTime(startMs),
        stop:        parseTime(endMs)
      });
    });

    return programs;
  }
};

function parseTime(epochOrString) {
  if (typeof epochOrString === 'number') {
    return dayjs(epochOrString).tz('Asia/Kolkata').format();
  }
  return dayjs.tz(epochOrString, 'YYYY-MM-DDTHH:mm:ss', 'Asia/Kolkata').format();
}

function parseItems(content) {
  try {
    const data = JSON.parse(content);
    return Array.isArray(data.schedules) ? data.schedules : [];
  } catch (error) {
    console.error('Error parsing content:', error.message);
    return [];
  }
}
