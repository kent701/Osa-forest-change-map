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
// INITIALIZE MAP WITH LIGHT BASEMAP
// ============================================================
function initMap() {
    map = L.map('map', {
        rotate: true,
        bearing: 0,
        touchRotate: true,
        rotateControl: {
            closeOnZeroBearing: false
        }
    }).setView([8.7, -83.5], 10);
    
    // Light Gray Canvas (BEST for data visualization)
    const lightGrayLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        { 
            attribution: 'Tiles &copy; Esri',
            maxZoom: 19
        }
    );
    
    // CartoDB Light background
    const cartoLightLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
            attribution: '&copy; OpenStreetMap &copy; CartoDB',
            maxZoom: 19
        }
    );
    
    // Satellite with dim opacity
    const satelliteLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
            attribution: 'Tiles &copy; Esri',
            maxZoom: 19,
            opacity: 0.4
        }
    );
    
    // Add default layer
    lightGrayLayer.addTo(map);
    
    // Layer control for switching
    const baseMaps = {
        "Light Gray (Recommended)": lightGrayLayer,
        "Clean White": cartoLightLayer,
        "Satellite (Dim)": satelliteLayer
    };
    
    L.control.layers(baseMaps, null, {
        position: 'topright'
    }).addTo(map);
    
    // Setup compass
    setupCompass();
    
    // Load data from GitHub Releases
    loadForestData();
}

// ============================================================
// LOAD GEOJSON DATA FROM GITHUB RELEASES
// ============================================================
function loadForestData() {
    console.log('Loading forest data from GitHub Releases...');
    
    // ✅ CORRECTED RAW LINKS FOR GITHUB RELEASES
    const url2000 = 'https://raw.githubusercontent.com/kent701/Osa-forest-change-map/refs/tags/v1.0/osa_2000_forest.geojson';
    const url2024 = 'https://raw.githubusercontent.com/kent701/Osa-forest-change-map/refs/tags/v1.0/osa_2024_forest.geojson';
    
    // Load 2000 data
    fetch(url2000)
        .then(response => {
            console.log('2000 response status:', response.status);
            if (!response.ok) throw new Error(`Failed to load 2000 data: ${response.status}`);
            return response.json();
        })
        .then(data => {
            console.log('✅ 2000 data loaded successfully');
            stats2000 = calculateStatistics(data);
            
            forestLayer2000 = L.geoJSON(data, {
                style: feature => ({
                    fillColor: getColorByClass(feature.properties.ClassLabel),
                    color: '#ffffff',
                    weight: 0.5,
                    fillOpacity: 0.8
                }),
                onEachFeature: (feature, layer) => {
                    layer.bindPopup(`
                        <div style="font-family: 'Inter', sans-serif;">
                            <h4 style="margin: 0 0 8px 0; color: #1B5E20;">Land Cover (2000)</h4>
                            <div><strong>Class:</strong> ${feature.properties.ClassLabel}</div>
                            <div><strong>Area:</strong> ${feature.properties.area_ha ? Math.round(feature.properties.area_ha).toLocaleString() : 'N/A'} ha</div>
                        </div>
                    `);
                    addPolygonHoverEffects(layer, feature);
                }
            });
        })
        .catch(error => {
            console.error('❌ Error loading 2000 data:', error);
            alert('Could not load 2000 data from GitHub Releases.\n\nCheck:\n1. Release exists (v1.0)\n2. File is attached to release\n3. Internet connection\n\nSee browser console (F12) for details.');
        });
    
    // Load 2024 data
    fetch(url2024)
        .then(response => {
            console.log('2024 response status:', response.status);
            if (!response.ok) throw new Error(`Failed to load 2024 data: ${response.status}`);
            return response.json();
        })
        .then(data => {
            console.log('✅ 2024 data loaded successfully');
            stats2024 = calculateStatistics(data);
            
            forestLayer2024 = L.geoJSON(data, {
                style: feature => ({
                    fillColor: getColorByClass(feature.properties.ClassLabel),
                    color: '#ffffff',
                    weight: 0.5,
                    fillOpacity: 0.8
                }),
                onEachFeature: (feature, layer) => {
                    layer.bindPopup(`
                        <div style="font-family: 'Inter', sans-serif;">
                            <h4 style="margin: 0 0 8px 0; color: #1B5E20;">Land Cover (2024)</h4>
                            <div><strong>Class:</strong> ${feature.properties.ClassLabel}</div>
                            <div><strong>Area:</strong> ${feature.properties.area_ha ? Math.round(feature.properties.area_ha).toLocaleString() : 'N/A'} ha</div>
                        </div>
                    `);
                    addPolygonHoverEffects(layer, feature);
                }
            });
            
            // After both datasets load, show initial year
            setTimeout(() => {
                if (forestLayer2000 && forestLayer2024) {
                    showYear('2000');
                    updateChangeIndicators();
                    setupHoverHighlights();
                    console.log('🎉 Both datasets loaded! Application ready.');
                }
            }, 1000);
        })
        .catch(error => {
            console.error('❌ Error loading 2024 data:', error);
            alert('Could not load 2024 data from GitHub Releases.\n\nCheck:\n1. Release exists (v1.0)\n2. File is attached to release\n3. Internet connection\n\nSee browser console (F12) for details.');
        });
}

// ============================================================
// CALCULATE STATISTICS FROM GEOJSON
// ============================================================
function calculateStatistics(geojson) {
    const stats = {};
    let totalArea = 0;
    
    geojson.features.forEach(feature => {
        const className = feature.properties.ClassLabel;
        const area = feature.properties.area_ha || 0;
        
        if (!stats[className]) {
            stats[className] = 0;
        }
        stats[className] += area;
        totalArea += area;
    });
    
    stats['Total'] = totalArea;
    return stats;
}

// ============================================================
// POLYGON HOVER EFFECTS (Map -> Legend highlighting)
// ============================================================
function addPolygonHoverEffects(layer, feature) {
    const className = feature.properties.ClassLabel;
    
    layer.on('mouseover', function() {
        // Highlight polygon
        this.setStyle({
            weight: 3,
            color: '#FFD700',
            fillOpacity: 0.95
        });
        
        // Highlight corresponding legend item
        const legendItem = document.querySelector(`.legend-item[data-class="${className}"]`);
        if (legendItem) {
            legendItem.classList.add('highlighted');
        }
    });
    
    layer.on('mouseout', function() {
        // Reset polygon style
        this.setStyle({
            weight: 0.5,
            color: '#ffffff',
            fillOpacity: 0.8
        });
        
        // Remove legend highlight
        const legendItem = document.querySelector(`.legend-item[data-class="${className}"]`);
        if (legendItem) {
            legendItem.classList.remove('highlighted');
        }
    });
}

// ============================================================
// LEGEND HOVER EFFECTS (Legend -> Map highlighting)
// ============================================================
function setupHoverHighlights() {
    const legendItems = document.querySelectorAll('.legend-item');
    
    legendItems.forEach(item => {
        const className = item.getAttribute('data-class');
        
        // Mouse enter legend item
        item.addEventListener('mouseenter', () => {
            highlightPolygonsByClass(className);
            item.classList.add('highlighted');
        });
        
        // Mouse leave legend item
        item.addEventListener('mouseleave', () => {
            removeAllHighlights();
            item.classList.remove('highlighted');
        });
    });
}

function highlightPolygonsByClass(className) {
    const currentLayer = currentYear === '2000' ? forestLayer2000 : forestLayer2024;
    if (!currentLayer) return;
    
    currentLayer.eachLayer(layer => {
        if (layer.feature.properties.ClassLabel === className) {
            layer.setStyle({
                weight: 3,
                color: '#FFD700',
                fillOpacity: 0.95
            });
        }
    });
}

function removeAllHighlights() {
    const currentLayer = currentYear === '2000' ? forestLayer2000 : forestLayer2024;
    if (!currentLayer) return;
    
    currentLayer.eachLayer(layer => {
        layer.setStyle({
            weight: 0.5,
            color: '#ffffff',
            fillOpacity: 0.8
        });
    });
}

// ============================================================
// SHOW SELECTED YEAR ON MAP
// ============================================================
function showYear(year) {
    currentYear = year;
    
    // Remove both layers
    if (forestLayer2000 && map.hasLayer(forestLayer2000)) {
        map.removeLayer(forestLayer2000);
    }
    if (forestLayer2024 && map.hasLayer(forestLayer2024)) {
        map.removeLayer(forestLayer2024);
    }
    
    // Add selected year with fade animation
    if (year === '2000' && forestLayer2000) {
        forestLayer2000.addTo(map);
        updateStatisticsPanel(stats2000);
    } else if (year === '2024' && forestLayer2024) {
        forestLayer2024.addTo(map);
        updateStatisticsPanel(stats2024);
    }
    
    // Update button states
    document.querySelectorAll('.year-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent === year);
    });
    
    // Update title
    document.getElementById('currentYearTitle').textContent = `Land Cover ${year}`;
}

// ============================================================
// UPDATE STATISTICS PANEL
// ============================================================
function updateStatisticsPanel(stats) {
    const tbody = document.querySelector('#statsTable tbody');
    tbody.innerHTML = '';
    
    Object.keys(stats).forEach(className => {
        if (className === 'Total') return;
        
        const row = tbody.insertRow();
        const cellClass = row.insertCell(0);
        const cellArea = row.insertCell(1);
        const cellPercent = row.insertCell(2);
        
        const area = stats[className];
        const percent = ((area / stats['Total']) * 100).toFixed(1);
        
        cellClass.innerHTML = `<span class="color-box" style="background-color: ${getColorByClass(className)}"></span> ${className}`;
        cellArea.textContent = Math.round(area).toLocaleString() + ' ha';
        cellPercent.textContent = percent + '%';
    });
    
    // Update chart
    updateChart(stats);
}

// ============================================================
// UPDATE CHART
// ============================================================
function updateChart(stats) {
    const ctx = document.getElementById('statsChart').getContext('2d');
    
    const labels = [];
    const data = [];
    const colors = [];
    
    Object.keys(stats).forEach(className => {
        if (className === 'Total') return;
        labels.push(className);
        data.push(stats[className]);
        colors.push(getColorByClass(className));
    });
    
    if (myChart) {
        myChart.destroy();
    }
    
    myChart = new Chart(ctx, {
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
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percent = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ${Math.round(value).toLocaleString()} ha (${percent}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ============================================================
// UPDATE CHANGE INDICATORS
// ============================================================
function updateChangeIndicators() {
    if (!stats2000['Total'] || !stats2024['Total']) return;
    
    // Calculate changes for key classes
    const forestClasses = ['Mature Forest', 'Secondary Forest'];
    let forest2000 = 0;
    let forest2024 = 0;
    
    forestClasses.forEach(className => {
        forest2000 += stats2000[className] || 0;
        forest2024 += stats2024[className] || 0;
    });
    
    const forestChange = forest2024 - forest2000;
    const forestChangePercent = ((forestChange / forest2000) * 100).toFixed(1);
    
    // Update UI
    document.getElementById('forestChange').textContent = `${forestChange > 0 ? '+' : ''}${Math.round(forestChange).toLocaleString()} ha`;
    document.getElementById('forestChangePercent').textContent = `(${forestChangePercent}%)`;
    document.getElementById('forestChange').style.color = forestChange >= 0 ? '#4CAF50' : '#E53935';
}

// ============================================================
// SETUP COMPASS (Real rotation tracking)
// ============================================================
function setupCompass() {
    const compassNeedle = document.getElementById('compassNeedle');
    const compassBearing = document.getElementById('compassBearing');
    
    if (!compassNeedle || !compassBearing) return;
    
    map.on('rotate', function() {
        const bearing = map.getBearing ? map.getBearing() : 0;
        compassNeedle.style.transform = `translate(-50%, -50%) rotate(${-bearing}deg)`;
        compassBearing.textContent = Math.round(Math.abs(bearing)) + '°';
    });
    
    map.on('rotateend', function() {
        const bearing = map.getBearing ? map.getBearing() : 0;
        compassNeedle.style.transform = `translate(-50%, -50%) rotate(${-bearing}deg)`;
        compassBearing.textContent = Math.round(Math.abs(bearing)) + '°';
    });
}

// ============================================================
// PDF DOWNLOAD FUNCTIONALITY
// ============================================================
function setupPdfDownload() {
    const downloadBtn = document.getElementById('downloadPdfBtn');
    if (!downloadBtn) return;
    
    downloadBtn.addEventListener('click', function() {
        // Check if libraries are loaded
        if (typeof window.jspdf === 'undefined' || typeof html2canvas === 'undefined') {
            console.error('PDF libraries not loaded');
            downloadTextReport();
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        // Title
        pdf.setFontSize(20);
        pdf.setTextColor(27, 94, 32);
        pdf.text('Forest Change Monitor Report', 105, 20, { align: 'center' });
        
        // Subtitle
        pdf.setFontSize(12);
        pdf.setTextColor(100, 100, 100);
        pdf.text('Osa Peninsula, Costa Rica (2000-2024)', 105, 28, { align: 'center' });
        
        // Statistics
        let yPos = 45;
        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Land Cover Statistics', 20, yPos);
        
        yPos += 10;
        pdf.setFontSize(10);
        
        // 2000 stats
        pdf.text('Year 2000:', 20, yPos);
        yPos += 7;
        Object.keys(stats2000).forEach(className => {
            if (className === 'Total') return;
            const area = Math.round(stats2000[className]).toLocaleString();
            pdf.text(`  ${className}: ${area} ha`, 25, yPos);
            yPos += 5;
        });
        
        yPos += 5;
        // 2024 stats
        pdf.text('Year 2024:', 20, yPos);
        yPos += 7;
        Object.keys(stats2024).forEach(className => {
            if (className === 'Total') return;
            const area = Math.round(stats2024[className]).toLocaleString();
            pdf.text(`  ${className}: ${area} ha`, 25, yPos);
            yPos += 5;
        });
        
        // Save
        const filename = `Osa_Forest_Change_Report_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(filename);
        
        console.log('PDF generated successfully');
    });
}

// Fallback text report
function downloadTextReport() {
    let report = 'FOREST CHANGE MONITOR REPORT\n';
    report += 'Osa Peninsula, Costa Rica (2000-2024)\n\n';
    
    report += '=== YEAR 2000 ===\n';
    Object.keys(stats2000).forEach(className => {
        if (className === 'Total') return;
        report += `${className}: ${Math.round(stats2000[className]).toLocaleString()} ha\n`;
    });
    
    report += '\n=== YEAR 2024 ===\n';
    Object.keys(stats2024).forEach(className => {
        if (className === 'Total') return;
        report += `${className}: ${Math.round(stats2024[className]).toLocaleString()} ha\n`;
    });
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Osa_Forest_Change_Report_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
}

// ============================================================
// INITIALIZE APPLICATION
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Forest Change Monitor...');
    
    // Initialize map
    initMap();
    
    // Setup year buttons
    document.querySelectorAll('.year-btn').forEach(btn => {
        btn.addEventListener('click', () => showYear(btn.textContent));
    });
    
    // Setup PDF download
    setupPdfDownload();
    
    console.log('Application initialized successfully');
});
