// ============================================================
// FOREST CHANGE MONITOR - OSA PENINSULA, COSTA RICA
// Comparing land cover changes between 2000 and 2024
// ============================================================

// Global variables
let map;
let forestLayer2000;
let forestLayer2024;
let currentYear = '2000';
let stats2000 = {};
let stats2024 = {};
let myChart;

// ============================================================
// COLOR SCHEME
// ============================================================
function getColorByClass(className) {
    const colors = {
        'Mature Forest': '#1B5E20',
        'Secondary Forest': '#4CAF50',
        'Plantation': '#81C784',
        'Pasture': '#FFF59D',
        'Agriculture': '#FFD54F',
        'Urban/Built-up': '#E53935',
        'Water': '#1976D2',
        'Bare Soil': '#8D6E63',
        'Mangrove': '#00695C',
        'Wetland': '#0097A7'
    };
    return colors[className] || '#BDBDBD';
}

// ============================================================
// FETCH WITH RELIABLE CORS PROXY (corsproxy.io)
// ============================================================
async function fetchWithProxy(url) {
    console.log('Fetching via corsproxy.io:', url);
    
    const proxy = 'https://corsproxy.io/?';
    const proxiedUrl = proxy + encodeURIComponent(url);

    const response = await fetch(proxiedUrl);
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    }

    const text = await response.text();

    if (text.startsWith('version https://git-lfs.github.com')) {
        throw new Error('LFS pointer detected. Upload the actual GeoJSON file to the release.');
    }

    return JSON.parse(text);
}

// ============================================================
// INITIALIZE MAP
// ============================================================
function initMap() {
    map = L.map('map', {
        rotate: true,
        bearing: 0,
        touchRotate: true,
        rotateControl: { closeOnZeroBearing: false }
    }).setView([8.7, -83.5], 10);

    const lightGray = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19
    });

    const carto = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CartoDB',
        maxZoom: 19
    });

    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19,
        opacity: 0.4
    });

    lightGray.addTo(map);

    L.control.layers({
        "Light Gray (Recommended)": lightGray,
        "Clean White": carto,
        "Satellite (Dim)": satellite
    }, null, { position: 'topright' }).addTo(map);

    setupCompass();
    loadForestData();
}

// ============================================================
// LOAD DATA
// ============================================================
function loadForestData() {
    console.log('Loading forest data with CORS proxy...');

    const base = 'https://github.com/kent701/Osa-forest-change-map/releases/download/v1.0/';
    const url2000 = base + 'osa_2000_forest.geojson';
    const url2024 = base + 'osa_2024_forest.geojson';

    let done2000 = false;
    let done2024 = false;

    fetchWithProxy(url2000)
        .then(data => {
            console.log('✅ 2000 data loaded');
            stats2000 = calculateStatistics(data);
            forestLayer2000 = createLayer(data, '2000');
            done2000 = true;
            if (done2000 && done2024) finishLoading();
        })
        .catch(err => console.error('2000 error:', err.message));

    fetchWithProxy(url2024)
        .then(data => {
            console.log('✅ 2024 data loaded');
            stats2024 = calculateStatistics(data);
            forestLayer2024 = createLayer(data, '2024');
            done2024 = true;
            if (done2000 && done2024) finishLoading();
        })
        .catch(err => console.error('2024 error:', err.message));
}

function createLayer(data, year) {
    return L.geoJSON(data, {
        style: f => ({
            fillColor: getColorByClass(f.properties.ClassLabel),
            color: '#ffffff',
            weight: 0.5,
            fillOpacity: 0.8
        }),
        onEachFeature: (f, layer) => {
            layer.bindPopup(`
                <h4 style="margin:0 0 8px 0;color:#1B5E20">Land Cover (${year})</h4>
                <strong>Class:</strong> ${f.properties.ClassLabel}<br>
                <strong>Area:</strong> ${f.properties.area_ha ? Math.round(f.properties.area_ha).toLocaleString() : 'N/A'} ha
            `);
            addPolygonHoverEffects(layer, f);
        }
    });
}

function finishLoading() {
    setTimeout(() => {
        showYear('2000');
        updateChangeIndicators();
        setupHoverHighlights();
        console.log('🎉 Both datasets loaded successfully!');
    }, 500);
}

// ============================================================
// STATISTICS
// ============================================================
function calculateStatistics(geojson) {
    const stats = {};
    let total = 0;
    geojson.features?.forEach(f => {
        const c = f.properties.ClassLabel;
        const a = Number(f.properties.area_ha) || 0;
        stats[c] = (stats[c] || 0) + a;
        total += a;
    });
    stats.Total = total;
    return stats;
}

// Hover effects
function addPolygonHoverEffects(layer, feature) {
    const cls = feature.properties.ClassLabel;
    layer.on('mouseover', () => {
        layer.setStyle({weight: 3, color: '#FFD700', fillOpacity: 0.95});
        document.querySelector(`.legend-item[data-class="${cls}"]`)?.classList.add('highlighted');
    });
    layer.on('mouseout', () => {
        layer.setStyle({weight: 0.5, color: '#ffffff', fillOpacity: 0.8});
        document.querySelector(`.legend-item[data-class="${cls}"]`)?.classList.remove('highlighted');
    });
}

function setupHoverHighlights() {
    document.querySelectorAll('.legend-item').forEach(item => {
        const cls = item.getAttribute('data-class');
        item.addEventListener('mouseenter', () => {
            highlightPolygonsByClass(cls);
            item.classList.add('highlighted');
        });
        item.addEventListener('mouseleave', () => {
            removeAllHighlights();
            item.classList.remove('highlighted');
        });
    });
}

function highlightPolygonsByClass(cls) {
    const layer = currentYear === '2000' ? forestLayer2000 : forestLayer2024;
    layer?.eachLayer(l => {
        if (l.feature.properties.ClassLabel === cls) l.setStyle({weight: 3, color: '#FFD700', fillOpacity: 0.95});
    });
}

function removeAllHighlights() {
    const layer = currentYear === '2000' ? forestLayer2000 : forestLayer2024;
    layer?.eachLayer(l => l.setStyle({weight: 0.5, color: '#ffffff', fillOpacity: 0.8}));
}

// Show year
function showYear(year) {
    currentYear = year;
    if (forestLayer2000 && map.hasLayer(forestLayer2000)) map.removeLayer(forestLayer2000);
    if (forestLayer2024 && map.hasLayer(forestLayer2024)) map.removeLayer(forestLayer2024);

    if (year === '2000' && forestLayer2000) {
        forestLayer2000.addTo(map);
        updateStatisticsPanel(stats2000);
    } else if (year === '2024' && forestLayer2024) {
        forestLayer2024.addTo(map);
        updateStatisticsPanel(stats2024);
    }

    document.querySelectorAll('.year-btn').forEach(b => b.classList.toggle('active', b.textContent === year));
    document.getElementById('currentYearTitle')?.textContent = `Land Cover ${year}`;
}

function updateStatisticsPanel(stats) {
    const tbody = document.querySelector('#statsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    Object.keys(stats).forEach(key => {
        if (key === 'Total') return;
        const area = stats[key];
        const pct = stats.Total ? ((area / stats.Total) * 100).toFixed(1) : 0;

        const row = tbody.insertRow();
        row.innerHTML = `
            <td><span class="color-box" style="background:${getColorByClass(key)}"></span> ${key}</td>
            <td>${Math.round(area).toLocaleString()} ha</td>
            <td>${pct}%</td>
        `;
    });

    updateChart(stats);
}

function updateChart(stats) {
    const canvas = document.getElementById('statsChart');
    if (!canvas) return;

    const labels = [], values = [], colors = [];
    Object.keys(stats).forEach(k => {
        if (k === 'Total') return;
        labels.push(k);
        values.push(stats[k]);
        colors.push(getColorByClass(k));
    });

    if (myChart) myChart.destroy();

    myChart = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: { labels, datasets: [{ data: values, backgroundColor: colors, borderColor: '#fff', borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }}
    });
}

function updateChangeIndicators() {
    const forest2000 = ['Mature Forest', 'Secondary Forest'].reduce((s, c) => s + (stats2000[c] || 0), 0);
    const forest2024 = ['Mature Forest', 'Secondary Forest'].reduce((s, c) => s + (stats2024[c] || 0), 0);
    
    const change = forest2024 - forest2000;
    const pct = forest2000 ? ((change / forest2000) * 100).toFixed(1) : '0';

    const elChange = document.getElementById('forestChange');
    const elPct = document.getElementById('forestChangePercent');

    if (elChange) {
        elChange.textContent = `${change >= 0 ? '+' : ''}${Math.round(change).toLocaleString()} ha`;
        elChange.style.color = change >= 0 ? '#4CAF50' : '#E53935';
    }
    if (elPct) elPct.textContent = `(${pct}%)`;
}

function setupCompass() {
    const needle = document.getElementById('compassNeedle');
    const bearing = document.getElementById('compassBearing');
    if (!needle || !bearing) return;

    const update = () => {
        const b = map.getBearing ? map.getBearing() : 0;
        needle.style.transform = `translate(-50%, -50%) rotate(${-b}deg)`;
        bearing.textContent = Math.round(Math.abs(b)) + '°';
    };

    map.on('rotate', update);
    map.on('rotateend', update);
}

// PDF Download (basic version - expand if needed)
function setupPdfDownload() {
    const btn = document.getElementById('downloadPdfBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        alert("PDF download not fully implemented in this version.\nUse the text fallback if needed.");
        // Add your jsPDF code here if you have the libraries loaded
    });
}

// ============================================================
// START
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Forest Change Monitor...');
    initMap();

    document.querySelectorAll('.year-btn').forEach(btn => {
        btn.addEventListener('click', () => showYear(btn.textContent));
    });

    setupPdfDownload();
});
