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
// FETCH GEOJSON FROM RAW GITHUB (No proxy needed)
// ============================================================
async function fetchGeoJSON(url) {
    console.log('Fetching:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const text = await response.text();
    
    if (text.startsWith('version https://git-lfs.github.com')) {
        throw new Error('LFS pointer file detected. Please upload the actual GeoJSON file.');
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

    L.control.layers({
        "Light Gray (Recommended)": lightGrayLayer,
        "Clean White": cartoLightLayer,
        "Satellite (Dim)": satelliteLayer
    }, null, { position: 'topright' }).addTo(map);

    setupCompass();
    loadForestData();
}

// ============================================================
// LOAD FOREST DATA (Using raw.githubusercontent.com)
// ============================================================
function loadForestData() {
    console.log('Loading forest data from GitHub...');

    const url2000 = 'https://raw.githubusercontent.com/kent701/Osa-forest-change-map/main/osa_2000_forest.geojson';
    const url2024 = 'https://raw.githubusercontent.com/kent701/Osa-forest-change-map/main/osa_2024_forest.geojson';

    let loaded2000 = false;
    let loaded2024 = false;

    // Load 2000
    fetchGeoJSON(url2000)
        .then(data => {
            console.log('✅ 2000 data loaded successfully');
            console.log('Features:', data.features ? data.features.length : 0);
            
            stats2000 = calculateStatistics(data);
            forestLayer2000 = createGeoJSONLayer(data, '2000');
            
            loaded2000 = true;
            if (loaded2000 && loaded2024) finishLoading();
        })
        .catch(err => {
            console.error('❌ Error loading 2000:', err);
            alert('Failed to load 2000 data.\nMake sure osa_2000_forest.geojson exists in the main branch.');
        });

    // Load 2024
    fetchGeoJSON(url2024)
        .then(data => {
            console.log('✅ 2024 data loaded successfully');
            console.log('Features:', data.features ? data.features.length : 0);
            
            stats2024 = calculateStatistics(data);
            forestLayer2024 = createGeoJSONLayer(data, '2024');
            
            loaded2024 = true;
            if (loaded2000 && loaded2024) finishLoading();
        })
        .catch(err => {
            console.error('❌ Error loading 2024:', err);
            alert('Failed to load 2024 data.\nMake sure osa_2024_forest.geojson exists in the main branch.');
        });
}

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
                    <h4 style="margin:0 0 8px 0; color:#1B5E20;">Land Cover (${year})</h4>
                    <div><strong>Class:</strong> ${feature.properties.ClassLabel}</div>
                    <div><strong>Area:</strong> ${feature.properties.area_ha ? Math.round(feature.properties.area_ha).toLocaleString() : 'N/A'} ha</div>
                </div>
            `);
            addPolygonHoverEffects(layer, feature);
        }
    });
}

function finishLoading() {
    setTimeout(() => {
        showYear('2000');
        updateChangeIndicators();
        setupHoverHighlights();
        console.log('🎉 Both datasets loaded successfully! Application is ready.');
    }, 500);
}

// ============================================================
// CALCULATE STATISTICS
// ============================================================
function calculateStatistics(geojson) {
    const stats = {};
    let totalArea = 0;

    if (!geojson?.features) return stats;

    geojson.features.forEach(feature => {
        const className = feature.properties.ClassLabel;
        const area = Number(feature.properties.area_ha) || 0;
        stats[className] = (stats[className] || 0) + area;
        totalArea += area;
    });

    stats.Total = totalArea;
    return stats;
}

// ============================================================
// HOVER EFFECTS
// ============================================================
function addPolygonHoverEffects(layer, feature) {
    const className = feature.properties.ClassLabel;
    
    layer.on('mouseover', function() {
        this.setStyle({ weight: 3, color: '#FFD700', fillOpacity: 0.95 });
        document.querySelector(`.legend-item[data-class="${className}"]`)?.classList.add('highlighted');
    });
    
    layer.on('mouseout', function() {
        this.setStyle({ weight: 0.5, color: '#ffffff', fillOpacity: 0.8 });
        document.querySelector(`.legend-item[data-class="${className}"]`)?.classList.remove('highlighted');
    });
}

function setupHoverHighlights() {
    document.querySelectorAll('.legend-item').forEach(item => {
        const className = item.getAttribute('data-class');
        item.addEventListener('mouseenter', () => {
            highlightPolygonsByClass(className);
            item.classList.add('highlighted');
        });
        item.addEventListener('mouseleave', () => {
            removeAllHighlights();
            item.classList.remove('highlighted');
        });
    });
}

function highlightPolygonsByClass(className) {
    const currentLayer = currentYear === '2000' ? forestLayer2000 : forestLayer2024;
    currentLayer?.eachLayer(layer => {
        if (layer.feature.properties.ClassLabel === className) {
            layer.setStyle({ weight: 3, color: '#FFD700', fillOpacity: 0.95 });
        }
    });
}

function removeAllHighlights() {
    const currentLayer = currentYear === '2000' ? forestLayer2000 : forestLayer2024;
    currentLayer?.eachLayer(layer => {
        layer.setStyle({ weight: 0.5, color: '#ffffff', fillOpacity: 0.8 });
    });
}

// ============================================================
// SHOW YEAR, UPDATE STATS & CHART
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

    document.querySelectorAll('.year-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent === year);
    });

    document.getElementById('currentYearTitle')?.textContent = `Land Cover ${year}`;
}

function updateStatisticsPanel(stats) {
    const tbody = document.querySelector('#statsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    Object.keys(stats).forEach(className => {
        if (className === 'Total') return;
        const area = stats[className];
        const percent = stats.Total ? ((area / stats.Total) * 100).toFixed(1) : 0;

        const row = tbody.insertRow();
        row.innerHTML = `
            <td><span class="color-box" style="background-color: ${getColorByClass(className)}"></span> ${className}</td>
            <td>${Math.round(area).toLocaleString()} ha</td>
            <td>${percent}%</td>
        `;
    });

    updateChart(stats);
}

function updateChart(stats) {
    const ctx = document.getElementById('statsChart');
    if (!ctx) return;

    const labels = [], data = [], colors = [];
    Object.keys(stats).forEach(key => {
        if (key === 'Total') return;
        labels.push(key);
        data.push(stats[key]);
        colors.push(getColorByClass(key));
    });

    if (myChart) myChart.destroy();

    myChart = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

function updateChangeIndicators() {
    const forestClasses = ['Mature Forest', 'Secondary Forest'];
    let forest2000 = forestClasses.reduce((sum, c) => sum + (stats2000[c] || 0), 0);
    let forest2024 = forestClasses.reduce((sum, c) => sum + (stats2024[c] || 0), 0);

    const change = forest2024 - forest2000;
    const percent = forest2000 ? ((change / forest2000) * 100).toFixed(1) : '0';

    const changeEl = document.getElementById('forestChange');
    const percentEl = document.getElementById('forestChangePercent');

    if (changeEl) {
        changeEl.textContent = `${change >= 0 ? '+' : ''}${Math.round(change).toLocaleString()} ha`;
        changeEl.style.color = change >= 0 ? '#4CAF50' : '#E53935';
    }
    if (percentEl) percentEl.textContent = `(${percent}%)`;
}

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
// PDF DOWNLOAD (Basic version)
// ============================================================
function setupPdfDownload() {
    const btn = document.getElementById('downloadPdfBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        alert("PDF download is not fully implemented yet.\nYou can add jsPDF + html2canvas later if needed.");
    });
}

// ============================================================
// INITIALIZE APPLICATION
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Forest Change Monitor...');
    initMap();

    document.querySelectorAll('.year-btn').forEach(btn => {
        btn.addEventListener('click', () => showYear(btn.textContent));
    });

    setupPdfDownload();
    console.log('Application initialized successfully');
});
