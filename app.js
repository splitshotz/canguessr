// --- STATE ---
let setupMap, guessMap, resultMap, panoViewer;
let usGeoJSON = null, canadaGeoJSON = null;
let previewLayer = null, drawPoints = [];
let resultLayers = [];
let usedUrls = new Set();

let gameState = {
    mode: 'country',
    subRegion: null,
    round: 1,
    maxRounds: 5,
    score: 0,
    actualLoc: null,
    guessLoc: null,
    guessMarker: null,
    activePoly: null,
    targetCity: null
};

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', async () => {
    initMaps();
    initControls();
    initImageZoomPan();
    await loadBorders();
    updateMenuState('country');
});

async function loadBorders() {
    try {
        const [usRes, canRes] = await Promise.all([
            fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries/USA.geo.json'),
            fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries/CAN.geo.json')
        ]);
        usGeoJSON = await usRes.json();
        canadaGeoJSON = await canRes.json();
        
        [setupMap, guessMap, resultMap].forEach(applySouthCanadaMask);
    } catch (e) {
        console.warn("Could not load GeoJSON borders", e);
    }
}

// --- MAP CREATION & "SOUTH CANADA" MASK ---
function createMap(id) {
    const map = L.map(id, { center: [56.5, -98.0], zoom: 4, zoomControl: false, worldCopyJump: true });
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19, attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    
    L.control.zoom({ position: 'bottomleft' }).addTo(map);
    return map;
}

function applySouthCanadaMask(map) {
    if (!usGeoJSON) return;
    const pane = 'southCanadaPane';
    if (!map.getPane(pane)) {
        map.createPane(pane);
        map.getPane(pane).style.zIndex = 380;
        map.getPane(pane).style.pointerEvents = 'none';
    }

    // Dim, low-detail fog covering the US
    L.geoJSON(usGeoJSON, {
        pane: pane,
        style: {
            fillColor: '#090b10',
            fillOpacity: 0.94, // Hides US roads and cities
            color: '#272a35',
            weight: 1.5,
            dashArray: '6, 6'
        }
    }).addTo(map);

    // Mainland US Label
    const mainLabel = L.divIcon({
        className: 'south-canada-label',
        html: `<div>SOUTH CANADA</div><div class="south-canada-sub">(Unexplored Territory)</div>`,
        iconSize: [500, 60], iconAnchor: [250, 30]
    });
    L.marker([39.5, -98.5], { icon: mainLabel, pane: pane, interactive: false }).addTo(map);

    // Alaska Label
    const akLabel = L.divIcon({
        className: 'south-canada-label',
        html: `<div style="font-size: 13px; letter-spacing: 5px;">WEST N.W.T.</div>`,
        iconSize: [220, 30], iconAnchor: [110, 15]
    });
    L.marker([64.5, -152.0], { icon: akLabel, pane: pane, interactive: false }).addTo(map);
}

function initMaps() {
    setupMap = createMap('setup-map');
    guessMap = createMap('guess-map');
    resultMap = createMap('result-map');

    // Polygon drawing on Setup Map
    setupMap.on('click', (e) => {
        if (gameState.mode !== 'draw') return;
        drawPoints.push([e.latlng.lng, e.latlng.lat]);
        renderSetupPreview();
    });

    // Placing a pin on Guess Map
    guessMap.on('click', (e) => {
        gameState.guessLoc = e.latlng;
        if (gameState.guessMarker) guessMap.removeLayer(gameState.guessMarker);
        
        const guessIcon = L.divIcon({ className: 'pin-guess', iconSize: [22, 22], iconAnchor: [11, 11] });
        gameState.guessMarker = L.marker(e.latlng, { icon: guessIcon }).addTo(guessMap);
        document.getElementById('submit-guess').style.display = 'block';
    });

    const wrapper = document.getElementById('guess-wrapper');
    new ResizeObserver(() => guessMap.invalidateSize()).observe(wrapper);
}

// --- MENU & UI CONTROLS ---
function initControls() {
    document.querySelectorAll('.mode-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            updateMenuState(card.dataset.mode);
        });
    });

    document.getElementById('sub-select').addEventListener('change', renderSetupPreview);
    
    document.getElementById('clear-draw').addEventListener('click', () => {
        drawPoints = [];
        renderSetupPreview();
    });

    document.getElementById('pin-map-btn').addEventListener('click', (e) => {
        document.getElementById('guess-wrapper').classList.toggle('pinned');
        e.target.classList.toggle('active');
    });

    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('submit-guess').addEventListener('click', () => evaluateGuess(null));
    document.getElementById('next-round-btn').addEventListener('click', nextRound);
    document.getElementById('exit-btn').addEventListener('click', returnToMenu);
    document.getElementById('play-again-btn').addEventListener('click', returnToMenu);

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && document.getElementById('game-screen').classList.contains('active')) {
            if (document.getElementById('result-overlay').style.display === 'flex') {
                nextRound();
            } else if (gameState.guessLoc) {
                evaluateGuess(null);
            }
        }
    });
}

function updateMenuState(mode) {
    gameState.mode = mode;
    const subGroup = document.getElementById('sub-select-group');
    const subSelect = document.getElementById('sub-select');
    const drawBanner = document.getElementById('draw-banner');

    subSelect.innerHTML = '';
    drawPoints = [];

    if (mode === 'country' || mode === 'city-quiz') {
        subGroup.style.display = 'none';
        drawBanner.style.display = 'none';
    } else if (mode === 'province' || mode === 'city') {
        subGroup.style.display = 'flex';
        drawBanner.style.display = 'none';
        document.getElementById('sub-select-label').innerText = mode === 'province' ? 'Select Province / Territory' : 'Select Metro City';
        
        const list = mode === 'province' ? REGIONS.provinces : REGIONS.cities;
        Object.keys(list).forEach(k => {
            const opt = document.createElement('option');
            opt.value = k; opt.innerText = k;
            subSelect.appendChild(opt);
        });
    } else if (mode === 'draw') {
        subGroup.style.display = 'none';
        drawBanner.style.display = 'flex';
    }
    renderSetupPreview();
}

function renderSetupPreview() {
    if (previewLayer) setupMap.removeLayer(previewLayer);
    const mode = gameState.mode;
    const subVal = document.getElementById('sub-select').value;

    if (mode === 'draw') {
        if (drawPoints.length === 0) return;
        const latlngs = drawPoints.map(p => [p[1], p[0]]);
        previewLayer = drawPoints.length < 3 
            ? L.polyline(latlngs, { color: '#ff1e38', weight: 3 }).addTo(setupMap)
            : L.polygon(latlngs, { color: '#ff1e38', weight: 2, fillOpacity: 0.2 }).addTo(setupMap);
        return;
    }

    let bbox = REGIONS.countryBbox;
    if (mode === 'province' && REGIONS.provinces[subVal]) bbox = REGIONS.provinces[subVal].bbox;
    if (mode === 'city' && REGIONS.cities[subVal]) bbox = REGIONS.cities[subVal].bbox;

    const bounds = [[bbox[1], bbox[0]], [bbox[3], bbox[2]]];
    previewLayer = L.rectangle(bounds, { color: "#ff1e38", weight: 2, fillOpacity: 0.1 }).addTo(setupMap);
    setupMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
}

// --- GAME FLOW ---
function startGame() {
    const mode = gameState.mode;
    gameState.subRegion = document.getElementById('sub-select').value;

    if (mode === 'draw') {
        if (drawPoints.length < 3) return alert("Please click at least 3 points on the map to draw your custom area!");
        gameState.activePoly = turf.polygon([[...drawPoints, drawPoints[0]]]);
    } else {
        let bbox = REGIONS.countryBbox;
        if (mode === 'province') bbox = REGIONS.provinces[gameState.subRegion].bbox;
        if (mode === 'city') bbox = REGIONS.cities[gameState.subRegion].bbox;
        gameState.activePoly = turf.bboxPolygon(bbox);
    }

    gameState.round = 1;
    gameState.score = 0;

    let label = "All Canada";
    if (mode === 'province' || mode === 'city') label = gameState.subRegion;
    if (mode === 'draw') label = "Custom Zone";
    if (mode === 'city-quiz') label = "Guess The City";
    document.getElementById('hud-mode').innerText = label;

    document.getElementById('summary-modal').style.display = 'none';
    document.getElementById('menu-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    guessMap.invalidateSize();

    startRound();
}

async function startRound() {
    document.getElementById('result-overlay').style.display = 'none';
    document.getElementById('submit-guess').style.display = 'none';
    document.getElementById('hud-round').innerHTML = `${gameState.round} <span>/ ${gameState.maxRounds}</span>`;
    document.getElementById('hud-score').innerText = gameState.score.toLocaleString();

    if (gameState.guessMarker) guessMap.removeLayer(gameState.guessMarker);
    gameState.guessLoc = null;

    // Fit mini-map to active play region
    const bbox = turf.bbox(gameState.activePoly);
    guessMap.fitBounds([[bbox[1], bbox[0]], [bbox[3], bbox[2]]], { padding: [20, 20] });

    // Setup "Guess The City" Mode if active
    const quizPanel = document.getElementById('city-quiz-panel');
    if (gameState.mode === 'city-quiz') {
        const cityNames = Object.keys(REGIONS.cities);
        gameState.targetCity = cityNames[Math.floor(Math.random() * cityNames.length)];
        setupCityQuizChoices(gameState.targetCity);
        quizPanel.style.display = 'flex';
    } else {
        quizPanel.style.display = 'none';
        gameState.targetCity = null;
    }

    toggleLoader(true);
    const loc = await fetchSmartCanadianLocation();
    toggleLoader(false);

    gameState.actualLoc = loc;
    displayLocationImagery(loc);
}

function setupCityQuizChoices(correctCity) {
    const allCities = Object.keys(REGIONS.cities);
    const wrong = allCities.filter(c => c !== correctCity).sort(() => 0.5 - Math.random()).slice(0, 3);
    const choices = [correctCity, ...wrong].sort(() => 0.5 - Math.random());

    const container = document.getElementById('quiz-options');
    container.innerHTML = '';
    choices.forEach(city => {
        const btn = document.createElement('button');
        btn.className = 'city-choice-btn';
        btn.innerHTML = `<span>🏙️ ${city}</span> <span>→</span>`;
        btn.onclick = () => {
            const center = REGIONS.cities[city].center;
            gameState.guessLoc = { lat: center[0], lng: center[1] };
            evaluateGuess(city);
        };
        container.appendChild(btn);
    });
}

// --- SMART LOCATION & IMAGERY ENGINE (NO API KEY NEEDED) ---
function getCandidateCoordinates() {
    const mode = gameState.mode;

    if (mode === 'city' || mode === 'city-quiz') {
        const cityKey = mode === 'city-quiz' ? gameState.targetCity : gameState.subRegion;
        const c = REGIONS.cities[cityKey];
        return [
            c.center[0] + (Math.random() - 0.5) * c.spread,
            c.center[1] + (Math.random() - 0.5) * c.spread
        ];
    }

    if (mode === 'province') {
        const p = REGIONS.provinces[gameState.subRegion];
        if (Math.random() < 0.85 && p.hubs.length > 0) {
            const hub = p.hubs[Math.floor(Math.random() * p.hubs.length)];
            return [hub[0] + (Math.random() - 0.5) * 0.14, hub[1] + (Math.random() - 0.5) * 0.14];
        }
    }

    if (mode === 'country') {
        const provKeys = Object.keys(REGIONS.provinces);
        const p = REGIONS.provinces[provKeys[Math.floor(Math.random() * provKeys.length)]];
        const hub = p.hubs[Math.floor(Math.random() * p.hubs.length)];
        return [hub[0] + (Math.random() - 0.5) * 0.15, hub[1] + (Math.random() - 0.5) * 0.15];
    }

    // Custom polygon mode
    const bbox = turf.bbox(gameState.activePoly);
    for (let i = 0; i < 100; i++) {
        const lng = bbox[0] + Math.random() * (bbox[2] - bbox[0]);
        const lat = bbox[1] + Math.random() * (bbox[3] - bbox[1]);
        if (turf.booleanPointInPolygon(turf.point([lng, lat]), gameState.activePoly)) {
            return [lat, lng];
        }
    }
    return [51.0447, -114.0719];
}

async function fetchSmartCanadianLocation() {
    for (let attempt = 1; attempt <= 12; attempt++) {
        const [lat, lng] = getCandidateCoordinates();
        document.getElementById('loader-sub').innerText = `Scanning satellite & street coordinates (${lat.toFixed(2)}, ${lng.toFixed(2)})...`;

        try {
            // 1. Try Wikipedia Geotagged Places & Landmarks (High quality, real places)
            const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${lat}|${lng}&ggsradius=10000&ggslimit=35&prop=pageimages|coordinates&piprop=original|thumbnail&pithumbsize=1920&format=json&origin=*`;
            const wikiRes = await fetch(wikiUrl).then(r => r.json());

            if (wikiRes?.query?.pages) {
                const validPages = Object.values(wikiRes.query.pages).filter(p => {
                    const img = p.original?.source || p.thumbnail?.source;
                    if (!img || !p.coordinates || usedUrls.has(img)) return false;
                    const l = img.toLowerCase();
                    return (l.endsWith('.jpg') || l.endsWith('.jpeg')) &&
                           !l.includes('map') && !l.includes('flag') && !l.includes('coat_of_arms') &&
                           !l.includes('logo') && !l.includes('locator') && !l.includes('portrait') &&
                           (p.original?.width || 1920) > (p.original?.height || 1080); // Landscape only
                });

                if (validPages.length > 0) {
                    const pick = validPages[Math.floor(Math.random() * validPages.length)];
                    const imgUrl = pick.thumbnail?.source || pick.original?.source;
                    usedUrls.add(imgUrl);
                    return {
                        lat: pick.coordinates[0].lat,
                        lng: pick.coordinates[0].lon,
                        url: imgUrl,
                        title: gameState.targetCity ? `${pick.title} (${gameState.targetCity})` : pick.title,
                        isPano: false
                    };
                }
            }

            // 2. Try Wikimedia Commons Raw Geotagged Street Photos
            const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${lat}|${lng}&ggsradius=10000&ggslimit=35&ggsnamespace=6&prop=imageinfo|coordinates&iiprop=url|dimensions&iiurlwidth=1920&format=json&origin=*`;
            const comRes = await fetch(commonsUrl).then(r => r.json());

            if (comRes?.query?.pages) {
                const validFiles = Object.values(comRes.query.pages).filter(p => {
                    if (!p.imageinfo || !p.coordinates) return false;
                    const info = p.imageinfo[0];
                    const u = info.url.toLowerCase();
                    return (u.endsWith('.jpg') || u.endsWith('.jpeg')) &&
                           !usedUrls.has(info.url) &&
                           !u.includes('map') && !u.includes('flag') && !u.includes('diagram') &&
                           info.width >= 1200 && info.width > info.height;
                });

                if (validFiles.length > 0) {
                    const pick = validFiles[Math.floor(Math.random() * validFiles.length)];
                    const info = pick.imageinfo[0];
                    const ratio = info.width / info.height;
                    const finalUrl = info.thumburl || info.url;
                    usedUrls.add(info.url);

                    return {
                        lat: pick.coordinates[0].lat,
                        lng: pick.coordinates[0].lon,
                        url: finalUrl,
                        title: gameState.targetCity || pick.title.replace('File:', '').replace(/\.[^/.]+$/, ''),
                        isPano: ratio >= 1.95 && ratio <= 2.05
                    };
                }
            }
        } catch (err) {
            console.warn("Attempt error:", err);
        }
    }

    // Varied Backup Pool if user drew an empty wilderness box
    const fallback = BACKUP_POOL[Math.floor(Math.random() * BACKUP_POOL.length)];
    return { ...fallback, isPano: false };
}

// --- VIEWER & PAN/ZOOM ---
let imgScale = 1, imgX = 0, imgY = 0;

function displayLocationImagery(loc) {
    const panoEl = document.getElementById('pano');
    const flatEl = document.getElementById('flat-image');
    const backdrop = document.getElementById('photo-backdrop');
    const badge = document.getElementById('view-badge');

    if (panoViewer) { panoViewer.destroy(); panoViewer = null; }

    if (loc.isPano) {
        flatEl.style.display = 'none';
        backdrop.style.display = 'none';
        panoEl.style.display = 'block';
        badge.innerText = "360° Panorama";
        panoViewer = pannellum.viewer('pano', {
            type: 'equirectangular',
            panorama: loc.url,
            autoLoad: true,
            showControls: false,
            compass: true
        });
    } else {
        panoEl.style.display = 'none';
        backdrop.style.display = 'block';
        backdrop.style.backgroundImage = `url('${loc.url}')`;
        flatEl.style.display = 'block';
        flatEl.src = loc.url;
        badge.innerText = "Interactive Street Photo";
        resetImageTransform();
    }
}

function resetImageTransform() {
    imgScale = 1; imgX = 0; imgY = 0;
    document.getElementById('flat-image').style.transform = `translate(0px, 0px) scale(1)`;
}

function initImageZoomPan() {
    const img = document.getElementById('flat-image');
    let panning = false, start = { x: 0, y: 0 };

    const update = () => img.style.transform = `translate(${imgX}px, ${imgY}px) scale(${imgScale})`;

    img.addEventListener('mousedown', (e) => {
        e.preventDefault();
        start = { x: e.clientX - imgX, y: e.clientY - imgY };
        panning = true;
    });
    window.addEventListener('mouseup', () => panning = false);
    window.addEventListener('mousemove', (e) => {
        if (!panning) return;
        imgX = e.clientX - start.x;
        imgY = e.clientY - start.y;
        update();
    });

    document.getElementById('viewer-container').addEventListener('wheel', (e) => {
        if (img.style.display === 'none') return;
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
        imgScale = Math.min(Math.max(0.8, imgScale * factor), 9);
        update();
    });

    document.getElementById('zoom-in').onclick = () => { imgScale = Math.min(imgScale * 1.3, 9); update(); };
    document.getElementById('zoom-out').onclick = () => { imgScale = Math.max(imgScale / 1.3, 0.8); update(); };
    document.getElementById('zoom-reset').onclick = resetImageTransform;
}

// --- SCORING & RESULTS ---
function evaluateGuess(pickedCityName) {
    if (!gameState.guessLoc) return;

    const from = turf.point([gameState.guessLoc.lng, gameState.guessLoc.lat]);
    const to = turf.point([gameState.actualLoc.lng, gameState.actualLoc.lat]);
    const distKm = turf.distance(from, to, { units: 'kilometers' });

    let points = 0;
    if (gameState.mode === 'city-quiz' && pickedCityName) {
        points = (pickedCityName === gameState.targetCity) ? 5000 : 0;
    } else {
        const bbox = turf.bbox(gameState.activePoly);
        const diag = turf.distance(turf.point([bbox[0], bbox[1]]), turf.point([bbox[2], bbox[3]]));
        const scale = Math.max(25, diag * 0.35);
        points = Math.round(5000 * Math.exp(-distKm / scale));
        if (distKm < 0.08) points = 5000;
    }

    gameState.score += points;
    document.getElementById('hud-score').innerText = gameState.score.toLocaleString();

    // Populate Result UI
    document.getElementById('res-points').innerText = `+${points.toLocaleString()} pts`;
    document.getElementById('res-distance').innerText = pickedCityName 
        ? (points === 5000 ? `Correct! It was ${gameState.targetCity}` : `Wrong! You picked ${pickedCityName}`)
        : `${distKm < 1 ? (distKm * 1000).toFixed(0) + ' m' : distKm.toFixed(1) + ' km'} away`;
    
    document.getElementById('res-place').innerText = `📍 ${gameState.actualLoc.title || 'Canada'}`;
    document.getElementById('result-overlay').style.display = 'flex';
    
    setTimeout(() => {
        document.getElementById('res-bar').style.width = `${(points / 5000) * 100}%`;
    }, 50);

    // Render Result Map
    resultMap.invalidateSize();
    resultLayers.forEach(l => resultMap.removeLayer(l));
    resultLayers = [];

    const actualLL = [gameState.actualLoc.lat, gameState.actualLoc.lng];
    const guessLL = [gameState.guessLoc.lat, gameState.guessLoc.lng];

    const actualIcon = L.divIcon({ className: 'pin-actual', html: '🍁', iconSize: [34, 34], iconAnchor: [17, 17] });
    const guessIcon = L.divIcon({ className: 'pin-guess', iconSize: [22, 22], iconAnchor: [11, 11] });

    resultLayers.push(L.marker(actualLL, { icon: actualIcon }).addTo(resultMap));
    resultLayers.push(L.marker(guessLL, { icon: guessIcon }).addTo(resultMap));
    resultLayers.push(L.polyline([actualLL, guessLL], { color: '#ff1e38', weight: 3, dashArray: '8, 8' }).addTo(resultMap));

    resultMap.fitBounds([actualLL, guessLL], { padding: [70, 70], maxZoom: 14 });

    document.getElementById('next-round-btn').innerText = gameState.round >= gameState.maxRounds ? "View Final Summary →" : "Next Round →";
}

function nextRound() {
    document.getElementById('res-bar').style.width = '0%';
    if (gameState.round >= gameState.maxRounds) {
        showFinalSummary();
    } else {
        gameState.round++;
        startRound();
    }
}

function showFinalSummary() {
    document.getElementById('result-overlay').style.display = 'none';
    document.getElementById('summary-modal').style.display = 'flex';
    document.getElementById('final-score').innerText = `${gameState.score.toLocaleString()} / 25,000`;
    
    setTimeout(() => {
        document.getElementById('final-bar').style.width = `${(gameState.score / 25000) * 100}%`;
    }, 100);

    let rank = "Lost in the Tundra 🥶";
    if (gameState.score > 10000) rank = "Casual Hosers 🏒";
    if (gameState.score > 16000) rank = "Voyageur Navigator 🛶";
    if (gameState.score > 21500) rank = "True North Legend 🍁";
    document.getElementById('final-rank').innerText = `Rank: ${rank}`;
}

function returnToMenu() {
    document.getElementById('summary-modal').style.display = 'none';
    document.getElementById('result-overlay').style.display = 'none';
    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('menu-screen').classList.add('active');
    setupMap.invalidateSize();
}

function toggleLoader(show) {
    document.getElementById('loader').style.display = show ? 'flex' : 'none';
}
