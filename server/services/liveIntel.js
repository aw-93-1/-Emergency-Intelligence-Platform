// Data: live Open-Meteo, USGS, NASA FIRMS, GDACS, ReliefWeb, and Overpass APIs; weather is a flood proxy.
const CITY_RADIUS = 1.5;

const sourceUrls = {
  earthquakes: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
  fires: 'https://firms.modaps.eosdis.nasa.gov/api/area/csv/DEMO_KEY/VIIRS_SNPP_NRT',
  gdacs: 'https://www.gdacs.org/xml/rss.xml',
  reliefweb: 'https://api.reliefweb.int/v1/reports?appname=myapp&query[value]=Pakistan',
  hospitals: 'https://overpass-api.de/api/interpreter',
  water: 'https://overpass-api.de/api/interpreter'
};

const withinCity = (lat, lon, city) =>
  Number.isFinite(lat) && Number.isFinite(lon) &&
  Math.abs(lat - city.lat) <= CITY_RADIUS && Math.abs(lon - city.lon) <= CITY_RADIUS;

const severity = value => Math.max(1, Math.min(10, Math.round(Number(value) || 5)));

const normalized = (incident, city, source, coordinates) => ({
  id: incident.id,
  category: incident.category,
  type: incident.type || incident.category,
  severity: severity(incident.severity),
  title: incident.title,
  description: incident.description || incident.title,
  location: incident.location || city.name,
  source,
  timestamp: incident.timestamp || new Date().toISOString(),
  coords: coordinates || [city.lat, city.lon],
  needs: incident.needs || []
});

const fetchJson = async (url, signal) => {
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`${response.status} from ${url}`);
  return response.json();
};

const fetchText = async (url, signal, accept) => {
  const response = await fetch(url, { signal, headers: { Accept: accept } });
  if (!response.ok) throw new Error(`${response.status} from ${url}`);
  return response.text();
};

const parseTag = (xml, tag) =>
  xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i'))?.[1]
    ?.replace(/<[^>]+>/g, '').trim() || '';

const parseCsv = csv => {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(value => value.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    return Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() || '']));
  });
};

const weatherIncidents = (weather, city) => {
  const precipitation = Number(weather.current?.precipitation || 0);
  const current = weather.current || {};
  if (precipitation <= 0) return [];
  return [normalized({
    id: `weather-${city.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    category: 'flood',
    type: 'precipitation',
    severity: precipitation >= 10 ? 8 : precipitation >= 5 ? 6 : 3,
    title: `Live precipitation: ${precipitation} mm`,
    description: `Open-Meteo reports ${precipitation} mm of current precipitation and weather code ${current.weathercode ?? current.weather_code ?? 'unknown'}.`,
    timestamp: current.time
  }, city, 'Open-Meteo')];
};

async function earthquakes(city, signal) {
  const data = await fetchJson(sourceUrls.earthquakes, signal);
  return (data.features || []).filter(feature => {
    const [lon, lat] = feature.geometry?.coordinates || [];
    return withinCity(lat, lon, city);
  }).map(feature => {
    const [lon, lat, depth] = feature.geometry.coordinates;
    return normalized({
      id: `usgs-${feature.id}`,
      category: 'earthquake',
      type: 'earthquake',
      severity: Math.min(10, Math.max(2, Math.round(Number(feature.properties?.mag || 1) * 2))),
      title: feature.properties?.title || 'Earthquake detected',
      description: `Magnitude ${feature.properties?.mag ?? 'unknown'} at ${depth ?? 'unknown'} km depth.`,
      location: feature.properties?.place || city.name,
      timestamp: feature.properties?.time ? new Date(feature.properties.time).toISOString() : undefined
    }, city, 'USGS', [lat, lon]);
  });
}

async function fires(city, signal) {
  const west = city.lon - CITY_RADIUS;
  const east = city.lon + CITY_RADIUS;
  const south = city.lat - CITY_RADIUS;
  const north = city.lat + CITY_RADIUS;
  const csv = await fetchText(`${sourceUrls.fires}/${west},${south},${east},${north}/1`, signal, 'text/csv');
  return parseCsv(csv).filter(row => row.latitude && row.longitude).map((row, index) =>
    normalized({
      id: `firms-${row.acq_date || 'unknown'}-${row.latitude}-${row.longitude}-${index}`,
      category: 'fire',
      type: 'active_fire',
      severity: Number(row.frp) >= 50 ? 8 : 5,
      title: 'Active fire detected',
      description: `NASA FIRMS VIIRS detection with ${row.frp || 'unknown'} MW fire radiative power.`,
      location: city.name,
      timestamp: row.acq_date ? `${row.acq_date}T${row.acq_time || '00:00'}Z` : undefined
    }, city, 'NASA FIRMS', [Number(row.latitude), Number(row.longitude)])
  );
}

async function gdacs(city, signal) {
  const xml = await fetchText(sourceUrls.gdacs, signal, 'application/rss+xml, application/xml');
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].flatMap(([_, item], index) => {
    const eventType = parseTag(item, 'gdacs:eventtype');
    const latitude = Number(parseTag(item, 'geo:lat'));
    const longitude = Number(parseTag(item, 'geo:long'));
    if (eventType !== 'FL' || (Number.isFinite(latitude) && Number.isFinite(longitude) && !withinCity(latitude, longitude, city))) return [];
    return [normalized({
      id: `gdacs-${parseTag(item, 'guid') || index}`,
      category: 'flood',
      type: 'gdacs_flood',
      severity: 8,
      title: parseTag(item, 'title') || 'GDACS flood alert',
      description: parseTag(item, 'description'),
      location: parseTag(item, 'gdacs:country') || city.name,
      timestamp: parseTag(item, 'pubDate')
    }, city, 'GDACS', Number.isFinite(latitude) && Number.isFinite(longitude) ? [latitude, longitude] : undefined)];
  });
}

async function reliefReports(city, signal) {
  const data = await fetchJson(sourceUrls.reliefweb, signal);
  return (data.data || []).filter(item => {
    const text = `${item.fields?.title || ''} ${item.fields?.description || ''}`.toLowerCase();
    return text.includes(city.name.split('/')[0].toLowerCase()) || text.includes('pakistan');
  }).slice(0, 30).map(item => normalized({
    id: `reliefweb-${item.id}`,
    category: 'relief',
    type: 'humanitarian_report',
    severity: 6,
    title: item.fields?.title || 'Humanitarian report',
    description: item.fields?.description || item.fields?.title,
    location: item.fields?.primary_country?.name || city.name,
    timestamp: item.fields?.date?.original || item.fields?.date?.created
  }, city, 'ReliefWeb'));
}

async function overpass(query, city, signal, source, category, type) {
  const data = await fetchJson(`${sourceUrls.hospitals}?data=${encodeURIComponent(query)}`, signal);
  return (data.elements || []).filter(element => Number.isFinite(element.lat) && Number.isFinite(element.lon))
    .map(element => normalized({
      id: `osm-${type}-${element.id}`,
      category,
      type,
      severity: 2,
      title: element.tags?.name || (type === 'hospital' ? 'Medical facility' : 'Drinking water point'),
      description: `OpenStreetMap ${type} mapped near ${city.name}.`,
      location: element.tags?.['addr:street'] || city.name
    }, city, source, [element.lat, element.lon]));
}

export async function fetchCityIntel(city, signal) {
  const bounds = `${city.lat - CITY_RADIUS},${city.lon - CITY_RADIUS},${city.lat + CITY_RADIUS},${city.lon + CITY_RADIUS}`;
  const hospitalQuery = `[out:json];node["amenity"="hospital"](${bounds});out;`;
  const waterQuery = `[out:json];node["amenity"="drinking_water"](${bounds});out;`;
  const requests = [
    fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,precipitation,weathercode,wind_speed_10m,wind_gusts_10m,is_day&hourly=precipitation`, signal),
    earthquakes(city, signal),
    fires(city, signal),
    gdacs(city, signal),
    reliefReports(city, signal),
    overpass(hospitalQuery, city, signal, 'OpenStreetMap Overpass', 'medical', 'hospital'),
    overpass(waterQuery, city, signal, 'OpenStreetMap Overpass', 'relief_water', 'drinking_water')
  ];
  const settled = await Promise.allSettled(requests);
  const value = index => settled[index].status === 'fulfilled' ? settled[index].value : [];
  const weather = settled[0].status === 'fulfilled' ? settled[0].value : null;
  const incidents = [
    ...(weather ? weatherIncidents(weather, city) : []),
    ...value(1), ...value(2), ...value(3), ...value(4), ...value(5), ...value(6)
  ];
  return {
    city,
    weather,
    incidents,
    hospitals: value(5),
    waterPoints: value(6),
    sources: settled.map((result, index) => ({
      name: ['Open-Meteo', 'USGS', 'NASA FIRMS', 'GDACS', 'ReliefWeb', 'Overpass hospitals', 'Overpass water'][index],
      status: result.status
    })),
    fetchedAt: new Date().toISOString()
  };
}
