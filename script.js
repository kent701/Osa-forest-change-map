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
// COLOR SCHEME FOR LAND COVER CLASSES
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
    console.log('Fetching via CORS proxy:', url);
    
    const proxyPrefix = 'https://corsproxy.io/?';
    const proxiedUrl = proxyPrefix + encodeURIComponent(url);
    
    const response = await fetch(proxiedUrl);
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const text = await response.text();
    
    // Safety check - in case LFS pointer was uploaded instead of real file
    if (text.startsWith('version https://git-lfs.github.com')) {
        throw new Error('LFS pointer file received. Please re-upload the actual GeoJSON file to the release (not just the pointer).');
    }
    
    try {
        return JSON.parse(text);
    } catch (e) {
        throw new Error('Failed to parse GeoJSON: ' + e.message);
    }
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
    
    // Base layers
    const lightGrayLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Tiles &copy; Esri', maxZoom: 19 }
    );
    
    const cartoLightLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        { attribution: '&copy; OpenStreetMap &copy; CartoDB', maxZoom: 19 }
    );
    
    const satelliteLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Tiles &copy; Esri', maxZoom: 19, opacity: 0.4 }
    );
    
    lightGrayLayer.addTo(map);
    
    const baseMaps = {
        "Light Gray (Recommended)": lightGrayLayer,
        "Clean White": cartoLightLayer,
        "Satellite (Dim)": satelliteLayer
    };
    
    L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);
    
    setupCompass();
    loadForestData();
}

// ============================================================
// LOAD FOREST DATA
// ============================================================
function loadForestData() {
    console.log('Loading forest data with CORS proxy...');
    
    const baseUrl = 'https://github.com/kent701/Osa-forest-change-map/releases/download/v1.0/';
    const url2000 = baseUrl + 'osa_2000_forest.geojson';
    const url2024 = baseUrl + 'osa_2024_forest.geojson';
    
    let loaded2000 = false;
    let loaded2024 = false;
    
    // Load 2000
    fetchWithProxy(url2000)
        .then(data => {
            console.log('✅ 2000 data loaded successfully');
            console.log('Features:', data.features ? data.features.length : 0);
            
            stats2000 = calculateStatistics(data);
            forestLayer2000 = createGeoJSONLayer(data, '2000');
            
            loaded2000 = true;
            if (loaded2000 && loaded2024) finishLoading();
        })
        .catch(err => {
            console.error('❌ 2000 load failed:', err);
            alert(`Failed to load 2000 data.\n\n${err.message}\n\nMake sure the file is uploaded correctly to release v1.0`);
        });
    
    // Load 2024
    fetchWithProxy(url2024)
        .then(data => {
            console.log('✅ 2024 data loaded successfully');
            console.log('Features:', data.features ? data.features.length : 0);
            
            stats2024 = calculateStatistics(data);
            forestLayer2024 = createGeoJSONLayer(data, '2024');
            
            loaded2024 = true;
            if (loaded2000 && loaded2024) finishLoading();
        })
        .catch(err => {
            console.error('❌ 2024 load failed:', err);
            alert(`Failed to load 2024 data.\n\n${err.message}`);
        });
}

// Helper to create GeoJSON layer
function createGeoJSONLayer(data, year) {
    return L.geoJSON(data, {
        style: feature => ({
            fillColor: getColorByClass(feature.properties.ClassLabel),
            color: '#ffffff',
            weight: 0.5,
            fillOpacity: 0.8
        }),
        onEachFeature: (feature, layer) => {
            layer.bindPopup(`
                <div style="font-family: 'Inter', sans-serif;">
                    <h4 style="margin: 0 0 8px 0; color: #1B5E20;">Land Cover (${year})</h4>
                    <div><strong>Class:</strong> ${feature.properties.ClassLabel}</div>
                    <div><strong>Area:</strong> ${feature.properties.area_ha ? Math.round(feature.properties.area_ha).toLocaleString() : 'N/A'} ha</div>
                </div>
            `);
            addPolygonHoverEffects(layer, feature);
        }
    });
}

// Finish loading both datasets
function finishLoading() {
    setTimeout(() => {
        showYear('2000');
        updateChangeIndicators();
        setupHoverHighlights();
        console.log('🎉 Application ready! Both datasets loaded.');
    }, 500);
}

// ============================================================
// CALCULATE STATISTICS
// ============================================================
function calculateStatistics(geojson) {
    const stats = {};
    let total = 0;
    
    if (!geojson?.features) return stats;
    
    geojson.features.forEach(f => {
        const cls = f.properties.ClassLabel;
        const area = Number(f.properties.area_ha) || 0;
        stats[cls] = (stats[cls] || 0) + area;
        total += area;
    });
    
    stats.Total = total;
    return stats;
}

// ============================================================
// HOVER EFFECTS
// ============================================================
function addPolygonHoverEffects(layer, feature) {
    const className = feature.properties.ClassLabel;
    
    layer.on('mouseover', () => {
        layer.setStyle({ weight: 3, color: '#FFD700', fillOpacity: 0.95 });
        document.querySelector(`.legend-item[data-class="${className}"]`)?.classList.add('highlighted');
    });
    
    layer.on('mouseout', () => {
        layer.setStyle({ weight: 0.5, color: '#ffffff', fillOpacity: 0.8 });
        document.querySelector(`.legend-item[data-class="${className}"]`)?.classList.remove('highlighted');
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

function highlightPolygonsByClass(className) {
    const layer = currentYear === '2000' ? forestLayer2000 : forestLayer2024;
    layer?.eachLayer(l => {
        if (l.feature.properties.ClassLabel === className) {
            l.setStyle({ weight: 3, color: '#FFD700', fillOpacity: 0.95 });
        }
    });
}

function removeAllHighlights() {
    const layer = currentYear === '2000' ? forestLayer2000 : forestLayer2024;
    layer?.eachLayer(l => {
        l.setStyle({ weight: 0.5, color: '#ffffff', fillOpacity: 0.8 });
    });
}

// ============================================================
// SHOW YEAR + STATS + CHART
// ============================================================
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
    
    document.querySelectorAll('.year-btn').forEach(btn => 
        btn.classList.toggle('active', btn.textContent === year)
    );
    
    document.getElementById('currentYearTitle')?.textContent = `Land Cover ${year}`;
}

function updateStatisticsPanel(stats) {
    const tbody = document.querySelector('#statsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    Object.keys(stats).forEach(key => {
        if (key === 'Total') return;
        const area = stats[key];
        const percent = stats.Total ? ((area / stats.Total) * 100).toFixed(1) : 0;
        
        const row = tbody.insertRow();
        row.innerHTML = `
            <td><span class="color-box" style="background-color:${getColorByClass(key)}"></span> ${key}</td>
            <td>${Math.round(area).toLocaleString()} ha</td>
            <td>${percent}%</td>
        `;
    });
    
    updateChart(stats);
}

function updateChart(stats) {
    const ctx = document.getElementById('statsChart');
    if (!ctx) return;
    
    const labels = [], dataVals = [], colors = [];
    Object.keys(stats).forEach(key => {
        if (key === 'Total') return;
        labels.push(key);
        dataVals.push(stats[key]);
        colors.push(getColorByClass(key));
    });
    
    if (myChart) myChart.destroy();
    
    myChart = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data: dataVals, backgroundColor: colors, borderColor: '#fff', borderWidth: 2 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

function updateChangeIndicators() {
    if (!stats2000.Total || !stats2024.Total) return;
    
    const forestClasses = ['Mature Forest', 'Secondary Forest'];
    let f2000 = forestClasses.reduce((sum, c) => sum + (stats2000[c] || 0), 0);
    let f2024 = forestClasses.reduce((sum, c) => sum + (stats2024[c] || 0), 0);
    
    const change = f2024 - f2000;
    const percent = f2000 ? ((change / f2000) * 100).toFixed(1) : '0';
    
    const el = document.getElementById('forestChange');
    const elP = document.getElementById('forestChangePercent');
    
    if (el) {
        el.textContent = `${change >= 0 ? '+' : ''}${Math.round(change).toLocaleString()} ha`;
        el.style.color = change >= 0 ? '#4CAF50' : '#E53935';
    }
    if (elP) elP.textContent = `(${percent}%)`;
}

// ============================================================
// COMPASS
// ============================================================
function setupCompass() {
    const needle = document.getElementById('compassNeedle');
    const bearingEl = document.getElementById('compassBearing');
    if (!needle || !bearingEl) return;
    
    const update = () => {
        const bearing = map.getBearing ? map.getBearing() : 0;
        needle.style.transform = `translate(-50%, -50%) rotate(${-bearing}deg)`;
        bearingEl.textContent = Math.round(Math.abs(bearing)) + '°';
    };
    
    map.on('rotate', update);
    map.on('rotateend', update);
}

// ============================================================
// PDF DOWNLOAD (unchanged logic)
// ============================================================
function setupPdfDownload() {
    const btn = document.getElementById('downloadPdfBtn');
    if (!btn) return;
    
    btn.addEventListener('click', () => {
        if (typeof window.jspdf === 'undefined') {
            downloadTextReport();
            return;
        }
        // Your original PDF code here (jsPDF logic)
        // ... paste your PDF generation code if needed ...
        console.log('PDF download triggered');
    });
}

function downloadTextReport() {
    // Your original fallback if needed
}

// ============================================================
// INITIALIZE
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Forest Change Monitor...');
    initMap();
    
    document.querySelectorAll('.year-btn').forEach(btn => {
        btn.addEventListener('click', () => showYear(btn.textContent));
    });
    
    setupPdfDownload();
    console.log('Application initialized');
});
