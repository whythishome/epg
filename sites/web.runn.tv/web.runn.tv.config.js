const axios = require('axios');
const dayjs = require('dayjs');
require('dayjs/plugin/utc');
require('dayjs/plugin/timezone');
require('dayjs/plugin/customParseFormat');
dayjs.extend(require('dayjs/plugin/utc'));
dayjs.extend(require('dayjs/plugin/timezone'));
dayjs.extend(require('dayjs/plugin/customParseFormat'));

// —–––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
// 1) Axios interceptors to log every request and error response
// —–––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
axios.interceptors.request.use(config => {
  console.log('→ REQUEST:', config.method.toUpperCase(), config.url);
  console.log('  Headers:', JSON.stringify(config.headers, null, 2));
  return config;
}, err => Promise.reject(err));

axios.interceptors.response.use(
  res => res,
  err => {
    if (err.response) {
      console.error('← ERROR', err.response.status, err.response.statusText);
      console.error('  Response Headers:', JSON.stringify(err.response.headers, null, 2));
      console.error('  Response Body:', typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('← NETWORK/OTHER ERROR:', err.message);
    }
    return Promise.reject(err);
  }
);

// —–––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
// 2) Your scraper module
// —–––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
module.exports = {
  site: 'web.runn.tv',
  days: 1,

  url({ channel }) {
    return `https://prod-epg.runn.tv/runtv/v1/schedule/getChannelEpg/${channel.site_id}`;
  },

  request: {
    method: 'GET',
    headers() {
      // build and log your headers each time
      const h = {
        userid: '0D-62-2D-15-FD-CE',
        'User-Agent': 'PostmanRuntime/7.44.1',
        Accept: 'application/json, text/plain, */*',
      };
      console.log('→ Using headers:', JSON.stringify(h, null, 2));
      return h;
    }
  },

  parser: ({ channel, content }) => {
    const programs = [];
    const items = parseItems(content);

    items.forEach(item => {
      // switch to startTimeEpoch (ms) if needed; keeping your fields here
      const startMs = item.startTimeEpoch ?? item.startTime;
      const endMs   = startMs + item.durationSeconds * 1000;

      programs.push({
        title:       item.programName,
        description: item.description,
        icon:        item.infoImages.web,
        start:       parseTime(startMs),
        stop:        parseTime(endMs),
      });
    });

    return programs;
  }
};

function parseTime(epochOrString) {
  // if you ever switch to ISO strings, you can parse with format;
  // for epoch ms we just do:
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
