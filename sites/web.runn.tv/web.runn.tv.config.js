const axios = require('axios');
const dayjs = require('dayjs');
const plugins = ['utc', 'timezone', 'customParseFormat'];
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
    console.log(`https://prod-epg.runn.tv/runtv/v1/schedule/getChannelEpg/${channel.site_id}`);
    return `https://prod-epg.runn.tv/runtv/v1/schedule/getChannelEpg/${channel.site_id}`;
  },
  request: {
    method: 'GET',
    headers: function() {
      return setHeaders();
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
function setHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'content-type': 'application/json'
  };
}
