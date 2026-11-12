// Curated Canadian Hubs, Provinces, and Cities for smart population-weighted spawning
const REGIONS = {
    countryBbox: [-141.0, 41.7, -52.6, 70.0],
    provinces: {
        "Alberta": {
            bbox: [-120.0, 49.0, -110.0, 60.0],
            hubs: [[51.0447, -114.0719], [53.5461, -113.4938], [51.1784, -115.5708], [52.8737, -118.0814], [49.6956, -112.8451], [52.2681, -113.8112], [56.726, -111.379], [55.1699, -118.7986]]
        },
        "British Columbia": {
            bbox: [-139.0, 48.3, -114.0, 60.0],
            hubs: [[49.2827, -123.1207], [48.4284, -123.3656], [49.8880, -119.4960], [50.1163, -122.9574], [53.9171, -122.7497], [50.6745, -120.3273], [49.1666, -123.9401], [54.3150, -130.3208], [49.0955, -125.9069]]
        },
        "Manitoba": {
            bbox: [-102.0, 49.0, -89.0, 60.0],
            hubs: [[49.8951, -97.1384], [49.8485, -99.9501], [58.7684, -94.1650], [55.7435, -97.8551], [49.9723, -98.2919]]
        },
        "New Brunswick": {
            bbox: [-69.0, 44.6, -63.7, 48.1],
            hubs: [[45.9636, -66.6431], [45.2733, -66.0633], [46.0878, -64.7782], [45.0680, -67.0539], [47.6114, -65.6517]]
        },
        "Newfoundland and Labrador": {
            bbox: [-67.8, 46.6, -52.6, 60.4],
            hubs: [[47.5615, -52.7126], [48.9544, -57.9478], [49.5142, -57.8825], [48.9569, -54.6089], [53.3017, -60.3261]]
        },
        "Northwest Territories": {
            bbox: [-136.5, 60.0, -102.0, 70.0],
            hubs: [[62.4540, -114.3718], [68.3607, -133.7230], [60.8167, -115.7999], [60.0055, -111.8849]]
        },
        "Nova Scotia": {
            bbox: [-66.4, 43.4, -59.7, 47.0],
            hubs: [[44.6488, -63.5752], [46.1368, -60.1942], [44.3768, -64.3188], [44.4991, -63.9169], [45.0912, -64.3619]]
        },
        "Nunavut": {
            bbox: [-110.0, 60.0, -61.0, 75.0],
            hubs: [[63.7467, -68.5170], [62.8084, -92.0853], [69.1169, -105.0597], [66.1456, -65.7136]]
        },
        "Ontario": {
            bbox: [-95.2, 41.7, -74.3, 56.9],
            hubs: [[43.6532, -79.3832], [45.4215, -75.6972], [43.0896, -79.0849], [44.2312, -76.4860], [43.2557, -79.8711], [42.9849, -81.2453], [48.3809, -89.2477], [46.4917, -80.9930], [46.5219, -84.3461]]
        },
        "Prince Edward Island": {
            bbox: [-64.4, 45.9, -62.0, 47.1],
            hubs: [[46.2382, -63.1311], [46.3959, -63.7876], [46.4913, -63.3812]]
        },
        "Quebec": {
            bbox: [-79.8, 45.0, -57.1, 62.6],
            hubs: [[45.5017, -73.5673], [46.8139, -71.2080], [45.4042, -71.8929], [46.3432, -72.5477], [48.4284, -71.0685], [46.1185, -74.5962], [48.8312, -64.4820]]
        },
        "Saskatchewan": {
            bbox: [-110.0, 49.0, -101.3, 60.0],
            hubs: [[52.1579, -106.6702], [50.4452, -104.6189], [53.2033, -105.7531], [50.3934, -105.5519]]
        },
        "Yukon": {
            bbox: [-141.0, 60.0, -123.8, 69.6],
            hubs: [[60.7212, -135.0568], [64.0601, -139.4320], [60.7540, -137.5108]]
        }
    },
    cities: {
        "Toronto, ON": { center: [43.6532, -79.3832], spread: 0.08, bbox: [-79.639, 43.581, -79.116, 43.855] },
        "Montreal, QC": { center: [45.5017, -73.5673], spread: 0.07, bbox: [-73.97, 45.41, -73.47, 45.70] },
        "Vancouver, BC": { center: [49.2827, -123.1207], spread: 0.06, bbox: [-123.27, 49.19, -122.9, 49.31] },
        "Calgary, AB": { center: [51.0447, -114.0719], spread: 0.08, bbox: [-114.31, 50.84, -113.86, 51.21] },
        "Ottawa, ON": { center: [45.4215, -75.6972], spread: 0.06, bbox: [-75.93, 45.24, -75.45, 45.53] },
        "Edmonton, AB": { center: [53.5461, -113.4938], spread: 0.08, bbox: [-113.71, 53.39, -113.27, 53.71] },
        "Quebec City, QC": { center: [46.8139, -71.2080], spread: 0.05, bbox: [-71.45, 46.72, -71.12, 46.92] },
        "Winnipeg, MB": { center: [49.8951, -97.1384], spread: 0.06, bbox: [-97.35, 49.71, -96.95, 49.99] },
        "Halifax, NS": { center: [44.6488, -63.5752], spread: 0.05, bbox: [-63.72, 44.59, -63.46, 44.75] },
        "Victoria, BC": { center: [48.4284, -123.3656], spread: 0.04, bbox: [-123.43, 48.40, -123.30, 48.48] },
        "St. John's, NL": { center: [47.5615, -52.7126], spread: 0.04, bbox: [-52.85, 47.48, -52.65, 47.63] },
        "Saskatoon, SK": { center: [52.1332, -106.6700], spread: 0.05, bbox: [-106.78, 52.05, -106.52, 52.21] },
        "Regina, SK": { center: [50.4452, -104.6189], spread: 0.05, bbox: [-104.75, 50.38, -104.50, 50.52] },
        "Charlottetown, PE": { center: [46.2382, -63.1311], spread: 0.03, bbox: [-63.20, 46.20, -63.08, 46.29] },
        "Yellowknife, NT": { center: [62.4540, -114.3718], spread: 0.03, bbox: [-114.48, 62.42, -114.30, 62.50] },
        "Whitehorse, YT": { center: [60.7212, -135.0568], spread: 0.04, bbox: [-135.20, 60.65, -134.95, 60.80] }
    }
};

// Emergency backup pool of varied Canadian locations in case user draws an empty ocean/tundra polygon
const BACKUP_POOL = [
    { lat: 46.8122, lng: -71.2045, title: "Old Quebec, QC", city: "Quebec City, QC", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Ch%C3%A2teau_Frontenac_after_a_freezing_rain_day_in_Quebec_city.jpg/1920px-Ch%C3%A2teau_Frontenac_after_a_freezing_rain_day_in_Quebec_city.jpg" },
    { lat: 49.2838, lng: -123.1187, title: "False Creek, Vancouver, BC", city: "Vancouver, BC", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Concord_Pacific_Master_Plan_Area.jpg/1920px-Concord_Pacific_Master_Plan_Area.jpg" },
    { lat: 47.5675, lng: -52.6814, title: "Signal Hill, St. John's, NL", city: "St. John's, NL", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Cabot_Tower_from_Signal_Hill.jpg/1920px-Cabot_Tower_from_Signal_Hill.jpg" },
    { lat: 45.4248, lng: -75.6997, title: "Parliament Hill, Ottawa, ON", city: "Ottawa, ON", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Centre_Block_-_Parliament_Hill.jpg/1920px-Centre_Block_-_Parliament_Hill.jpg" },
    { lat: 43.6426, lng: -79.3871, title: "Downtown Toronto, ON", city: "Toronto, ON", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Toronto_-_ON_-_Toronto_Skyline2.jpg/1920px-Toronto_-_ON_-_Toronto_Skyline2.jpg" },
    { lat: 51.0453, lng: -114.0630, title: "Centre Street, Calgary, AB", city: "Calgary, AB", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Calgary_Skyline_2020.jpg/1920px-Calgary_Skyline_2020.jpg" }
];