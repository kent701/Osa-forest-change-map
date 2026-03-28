/*  ============================================================
    FOREST CHANGE & CONSERVATION IMPACT MONITOR
    Osa Peninsula, Costa Rica | 2000-2024
    Developed by: [Arnaud Kentsa] 
    ============================================================ */

// ============================================================
// GLOBAL VARIABLES
// ============================================================
let map;
let currentYear = '2000';
let forestLayer2000 = null;
let forestLayer2024 = null;
let currentLayer = null;
let chart = null;
let stats2000 = null;
let stats2024 = null;

// ============================================================
// COLOR MAPPING
// ============================================================
function getColorByClass(classLabel) {
    if (classLabel === 'Forest') return '#1B5E20';
    if (classLabel === 'Regeneration') return '#66BB6A';
    if (classLabel === 'Non-forest') return '#FFB74D';
    if (classLabel === 'Water') return '#42A5F5';
    return '#9E9E9E';
}

// ============================================================
// CALCULATE STATISTICS
// ============================================================
function calculateStatistics(geoJsonData) {
    let forestArea = 0;
    let nonForestArea = 0;
    let regenerationArea = 0;
    let waterArea = 0;
    
    geoJsonData.features.forEach(feature => {
        const classLabel = feature.properties.ClassLabel;
        const areaHa = feature.properties.area_ha || 0;
        
        if (classLabel === 'Forest') forestArea += areaHa;
        else if (classLabel === 'Non-forest') nonForestArea += areaHa;
        else if (classLabel === 'Regeneration') regenerationArea += areaHa;
        else if (classLabel === 'Water') waterArea += areaHa;
    });
    
    const totalArea = forestArea + nonForestArea + regenerationArea + waterArea;
    
    return {
        forest: { area: forestArea, percent: (forestArea / totalArea) * 100 },
        nonForest: { area: nonForestArea, percent: (nonForestArea / totalArea) * 100 },
        regeneration: { area: regenerationArea, percent: (regenerationArea / totalArea) * 100 },
        water: { area: waterArea, percent: (waterArea / totalArea) * 100 },
        total: totalArea
    };
}

// ============================================================
// UPDATE DASHBOARD
// ============================================================
function updateDashboard(stats, year) {
    document.getElementById('dashboardSubtitle').innerHTML = `Land Cover Statistics | Year ${year}`;
    document.getElementById('forestPercent').innerHTML = stats.forest.percent.toFixed(1) + '%';
    document.getElementById('regenerationPercent').innerHTML = stats.regeneration.percent.toFixed(1) + '%';
    document.getElementById('forestTotal').innerHTML = Math.round(stats.forest.area).toLocaleString();
    
    const tableBody = document.getElementById('areaTableBody');
    tableBody.innerHTML = `
        <tr>
            <td><strong>Forest</strong></td>
            <td>${Math.round(stats.forest.area).toLocaleString()}</td>
            <td>${stats.forest.percent.toFixed(1)}%</td>
        </tr>
        <tr>
            <td><strong>Regeneration</strong></td>
            <td>${Math.round(stats.regeneration.area).toLocaleString()}</td>
            <td>${stats.regeneration.percent.toFixed(1)}%</td>
        </tr>
        <tr>
            <td><strong>Non-forest</strong></td>
            <td>${Math.round(stats.nonForest.area).toLocaleString()}</td>
            <td>${stats.nonForest.percent.toFixed(1)}%</td>
        </tr>
        <tr>
            <td><strong>Water</strong></td>
            <td>${Math.round(stats.water.area).toLocaleString()}</td>
            <td>${stats.water.percent.toFixed(1)}%</td>
        </tr>
    `;
    
    const ctx = document.getElementById('landCoverChart').getContext('2d');
    if (chart) chart.destroy();
    
    chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Forest', 'Regeneration', 'Non-forest', 'Water'],
            datasets: [{
                data: [stats.forest.percent, stats.regeneration.percent, stats.nonForest.percent, stats.water.percent],
                backgroundColor: ['#1B5E20', '#66BB6A', '#FFB74D', '#42A5F5'],
                borderWidth: 2,
                borderColor: '#fff',
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom', labels: { font: { size: 11 } } },
                tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed.toFixed(1)}%` } }
            },
            cutout: '60%',
            animation: { animateRotate: true, animateScale: true, duration: 800 }
        }
    });
}

// ============================================================
// UPDATE CHANGE INDICATORS
// ============================================================
function updateChangeIndicators() {
    if (!stats2000 || !stats2024) return;
    
    const forestChange = stats2024.forest.area - stats2000.forest.area;
    const forestChangePercent = (stats2024.forest.percent - stats2000.forest.percent).toFixed(1);
    const regenerationChange = stats2024.regeneration.area - stats2000.regeneration.area;
    
    const forestChangeElement = document.getElementById('forestChangeValue');
    const regenerationChangeElement = document.getElementById('regenerationValue');
    
    if (forestChange >= 0) {
        forestChangeElement.innerHTML = `+${Math.round(forestChange).toLocaleString()} ha (+${forestChangePercent}%)`;
        forestChangeElement.style.color = '#2e7d32';
    } else {
        forestChangeElement.innerHTML = `${Math.round(forestChange).toLocaleString()} ha (${forestChangePercent}%)`;
        forestChangeElement.style.color = '#d32f2f';
    }
    
    if (regenerationChange >= 0) {
        regenerationChangeElement.innerHTML = `+${Math.round(regenerationChange).toLocaleString()} ha`;
        regenerationChangeElement.style.color = '#2e7d32';
    } else {
        regenerationChangeElement.innerHTML = `${Math.round(regenerationChange).toLocaleString()} ha`;
        regenerationChangeElement.style.color = '#d32f2f';
    }
    
    const forestGainValue = document.getElementById('forestGainValue');
    const regenerationGainValue = document.getElementById('regenerationGainValue');
    const changeConclusion = document.getElementById('changeConclusion');
    
    if (forestChange >= 0) {
        forestGainValue.innerHTML = `+${Math.round(forestChange).toLocaleString()} ha`;
        document.getElementById('forestGain').classList.add('positive');
    } else {
        forestGainValue.innerHTML = `${Math.round(forestChange).toLocaleString()} ha`;
        document.getElementById('forestGain').classList.remove('positive');
    }
    
    regenerationGainValue.innerHTML = regenerationChange >= 0 ? 
        `+${Math.round(regenerationChange).toLocaleString()} ha` : 
        `${Math.round(regenerationChange).toLocaleString()} ha`;
    
    if (forestChange > 0) {
        changeConclusion.innerHTML = `<strong>Positive conservation impact:</strong> Forest cover increased by ${Math.round(forestChange).toLocaleString()} hectares over 24 years, demonstrating the effectiveness of PES programs in the region.`;
    } else if (forestChange < 0) {
        changeConclusion.innerHTML = `<strong>Conservation concern:</strong> Forest cover decreased by ${Math.abs(Math.round(forestChange)).toLocaleString()} hectares. Continued monitoring and intervention needed.`;
    } else {
        changeConclusion.innerHTML = `<strong>Stable forest cover:</strong> No significant change detected over 24 years. Conservation efforts have maintained forest extent.`;
    }
}

// ============================================================
// HOVER HIGHLIGHTS (Legend ↔ Map)
// ============================================================
function setupHoverHighlights() {
    const legendItems = document.querySelectorAll('.legend-item');
    
    legendItems.forEach(item => {
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
    if (!currentLayer) return;
    
    currentLayer.eachLayer(layer => {
        const feature = layer.feature;
        if (feature && feature.properties.ClassLabel === className) {
            layer.setStyle({
                weight: 3,
                color: '#FFD700',
                fillOpacity: 0.9
            });
            layer.bringToFront();
        }
    });
}

function removeAllHighlights() {
    if (!currentLayer) return;
    
    currentLayer.eachLayer(layer => {
        const feature = layer.feature;
        if (feature) {
            layer.setStyle({
                fillColor: getColorByClass(feature.properties.ClassLabel),
                color: '#ffffff',
                weight: 0.5,
                fillOpacity: 0.8
            });
        }
    });
}

function addPolygonHoverEffects(layer, feature) {
    const className = feature.properties.ClassLabel;
    
    layer.on('mouseover', function() {
        this.setStyle({
            weight: 3,
            color: '#FFD700',
            fillOpacity: 0.95
        });
        this.bringToFront();
        
        const legendItem = document.querySelector(`.legend-item[data-class="${className}"]`);
        if (legendItem) legendItem.classList.add('highlighted');
    });
    
    layer.on('mouseout', function() {
        this.setStyle({
            fillColor: getColorByClass(className),
            color: '#ffffff',
            weight: 0.5,
            fillOpacity: 0.8
        });
        
        const legendItem = document.querySelector(`.legend-item[data-class="${className}"]`);
        if (legendItem) legendItem.classList.remove('highlighted');
    });
}

// ============================================================
// COMPASS  with map rotation
// ============================================================
function setupCompass() {
    const compassNeedle = document.getElementById('compassNeedle');
    const compassBearing = document.getElementById('compassBearing');
    
    // Update on map rotate
    if (map.on) {
        map.on('rotate', function() {
            const bearing = map.getBearing ? map.getBearing() : 0;
            compassNeedle.style.transform = `translate(-50%, -50%) rotate(${-bearing}deg)`;
            compassBearing.textContent = Math.round(Math.abs(bearing)) + '°';
        });
        
        map.on('moveend', function() {
            const bearing = map.getBearing ? map.getBearing() : 0;
            compassNeedle.style.transform = `translate(-50%, -50%) rotate(${-bearing}deg)`;
            compassBearing.textContent = Math.round(Math.abs(bearing)) + '°';
        });
    }
    
    // Click to reset north
    document.getElementById('compassContainer').addEventListener('click', function() {
        if (map.setBearing) map.setBearing(0);
    });
}

// ============================================================
// SWITCH YEAR
// ============================================================
function showYear(year) {
    currentYear = year;
    document.getElementById('currentYear').innerHTML = year === 'change' ? 'Change Analysis' : year;
    document.getElementById('changeSummary').style.display = 'none';
    
    if (year === '2000' && forestLayer2000) {
        if (currentLayer) map.removeLayer(currentLayer);
        forestLayer2000.addTo(map);
        currentLayer = forestLayer2000;
        updateDashboard(stats2000, '2000');
    } else if (year === '2024' && forestLayer2024) {
        if (currentLayer) map.removeLayer(currentLayer);
        forestLayer2024.addTo(map);
        currentLayer = forestLayer2024;
        updateDashboard(stats2024, '2024');
    } else if (year === 'change') {
        document.getElementById('changeSummary').style.display = 'block';
        if (currentLayer) map.removeLayer(currentLayer);
        forestLayer2024.addTo(map);
        currentLayer = forestLayer2024;
        updateDashboard(stats2024, '2024');
        document.getElementById('dashboardSubtitle').innerHTML = 'Comparison: 2000 → 2024';
        updateChangeIndicators();
    }
}

// ============================================================
// GEOJSON DATA
// ============================================================
function loadForestData() {
    console.log('Loading forest data...');
    
    fetch('/osa_2000_forest.geojson')
        .then(response => response.json())
        .then(data => {
            console.log('✅ 2000 data loaded');
            stats2000 = calculateStatistics(data);
            
            forestLayer2000 = L.geoJSON(data, {
                style: feature => ({
                    fillColor: getColorByClass(feature.properties.ClassLabel),
                    color: '#ffffff',
                    weight: 0.5,
                    fillOpacity: 0.8  // Slightly more opaque for better visibility
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
            console.error('Error loading 2000 data:', error);
            alert('Could not load osa_2000_forest.geojson');
        });
    
    fetch('/osa_2024_forest.geojson')
        .then(response => response.json())
        .then(data => {
            console.log('✅ 2024 data loaded');
            stats2024 = calculateStatistics(data);
            
            forestLayer2024 = L.geoJSON(data, {
                style: feature => ({
                    fillColor: getColorByClass(feature.properties.ClassLabel),
                    color: '#ffffff',
                    weight: 0.5,
                    fillOpacity: 0.8  // Slightly more opaque for better visibility
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
            
            setTimeout(() => {
                if (forestLayer2000 && forestLayer2024) {
                    showYear('2000');
                    updateChangeIndicators();
                    console.log('🎉 Ready!');
                }
            }, 500);
        })
        .catch(error => {
            console.error('Error loading 2024 data:', error);
            alert('Could not load osa_2024_forest.geojson');
        });
}

// ============================================================
// MAP INITIALIZATION (WITH LIGHT BASEMAP)
// ============================================================
function initMap() {
    map = L.map('map', {
        rotate: true,
        bearing: 0
    }).setView([8.7, -83.5], 10);
    
    // LIGHT BASEMAP OPTIONS 
    
    // Option 1: Light Gray Canvas ( for data visualization)
    const lightGrayLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        { 
            attribution: 'Tiles © Esri',
            maxZoom: 19
        }
    );
    
    // Option 2: Very Light CartoDB (Clean and minimal)
    const cartoLightLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
            attribution: '© OpenStreetMap contributors © CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }
    );
    
    // Option 3: Dimmed Satellite (for context )
    const satelliteLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { 
            attribution: 'Tiles © Esri',
            maxZoom: 19,
            opacity: 0.4  // Very dim (40% opacity)
        }
    );
    
    // Light Gray by default (makes forest data pop!)
    lightGrayLayer.addTo(map);
    
    // Adding layer switcher (users can change basemap)
    const baseMaps = {
        "Light Gray (Recommended)": lightGrayLayer,
        "Clean White": cartoLightLayer,
        "Satellite (Dim)": satelliteLayer
    };
    
    L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);
    
    // Add scale bar
    L.control.scale({ 
        metric: true, 
        imperial: false, 
        position: 'bottomleft' 
    }).addTo(map);
    
    console.log('✅ Map initialized with light basemap');
}

// ============================================================
// YEAR BUTTONS
// ============================================================
function setupYearButtons() {
    const yearBtns = document.querySelectorAll('.year-btn');
    yearBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            yearBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            showYear(this.getAttribute('data-year'));
        });
    });
}

// ============================================================
// LAYER TOGGLE
// ============================================================
function setupLayerToggle() {
    const toggle = document.getElementById('toggleForestLayer');
    toggle.addEventListener('change', function(e) {
        if (currentLayer) {
            if (e.target.checked) map.addLayer(currentLayer);
            else map.removeLayer(currentLayer);
        }
    });
}

// ============================================================
// PDF DOWNLOAD
// ============================================================
function setupPdfDownload() {
    const downloadBtn = document.getElementById('downloadPdfBtn');
    if (!downloadBtn) return;
    
    downloadBtn.addEventListener('click', function() {
        // Check if jsPDF is loaded
        if (typeof window.jspdf === 'undefined') {
            console.warn('jsPDF not loaded, creating text report instead');
            downloadTextReport();
            return;
        }
        
        downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        downloadBtn.disabled = true;
        
        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            // Title
            pdf.setFontSize(20);
            pdf.setTextColor(26, 71, 42);
            pdf.text('Forest Change Monitor Report', 15, 25);
            
            // Subtitle
            pdf.setFontSize(12);
            pdf.setTextColor(100, 100, 100);
            pdf.text('Osa Peninsula, Costa Rica', 15, 33);
            pdf.text('Land Cover Analysis: 2000-2024', 15, 39);
            
            pdf.setDrawColor(45, 106, 79);
            pdf.line(15, 42, 195, 42);
            
            if (stats2000 && stats2024) {
                const forestChange = stats2024.forest.area - stats2000.forest.area;
                
                // 2000 Data
                pdf.setFontSize(14);
                pdf.setTextColor(26, 71, 42);
                pdf.text('Year 2000 - Baseline', 15, 52);
                
                pdf.setFontSize(10);
                pdf.setTextColor(0, 0, 0);
                pdf.text(`Forest: ${Math.round(stats2000.forest.area).toLocaleString()} ha (${stats2000.forest.percent.toFixed(1)}%)`, 20, 60);
                pdf.text(`Regeneration: ${Math.round(stats2000.regeneration.area).toLocaleString()} ha (${stats2000.regeneration.percent.toFixed(1)}%)`, 20, 66);
                pdf.text(`Non-forest: ${Math.round(stats2000.nonForest.area).toLocaleString()} ha (${stats2000.nonForest.percent.toFixed(1)}%)`, 20, 72);
                
                // 2024 Data
                pdf.setFontSize(14);
                pdf.setTextColor(26, 71, 42);
                pdf.text('Year 2024 - Current', 15, 85);
                
                pdf.setFontSize(10);
                pdf.setTextColor(0, 0, 0);
                pdf.text(`Forest: ${Math.round(stats2024.forest.area).toLocaleString()} ha (${stats2024.forest.percent.toFixed(1)}%)`, 20, 93);
                pdf.text(`Regeneration: ${Math.round(stats2024.regeneration.area).toLocaleString()} ha (${stats2024.regeneration.percent.toFixed(1)}%)`, 20, 99);
                pdf.text(`Non-forest: ${Math.round(stats2024.nonForest.area).toLocaleString()} ha (${stats2024.nonForest.percent.toFixed(1)}%)`, 20, 105);
                
                // Change
                pdf.setFontSize(14);
                pdf.setTextColor(26, 71, 42);
                pdf.text('24-Year Change', 15, 118);
                
                pdf.setFontSize(11);
                const changeColor = forestChange >= 0 ? [46, 125, 50] : [211, 47, 47];
                pdf.setTextColor(...changeColor);
                pdf.text(`Forest Change: ${forestChange >= 0 ? '+' : ''}${Math.round(forestChange).toLocaleString()} ha`, 20, 126);
            }
            
            // Footer
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.text('Generated by Forest Change Monitor | QGIS Classification', 15, 287);
            
            const filename = `Forest_Report_${currentYear}_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(filename);
            
            alert('✅ PDF downloaded successfully!');
            
        } catch (error) {
            console.error('PDF error:', error);
            downloadTextReport();
        } finally {
            downloadBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Download PDF Report';
            downloadBtn.disabled = false;
        }
    });
}

// Fallback: Text report
function downloadTextReport() {
    if (!stats2000 || !stats2024) {
        alert('Data not loaded yet');
        return;
    }
    
    const forestChange = stats2024.forest.area - stats2000.forest.area;
    const report = `
FOREST CHANGE MONITOR REPORT
Osa Peninsula, Costa Rica | 2000-2024

YEAR 2000:
Forest:       ${Math.round(stats2000.forest.area).toLocaleString()} ha (${stats2000.forest.percent.toFixed(1)}%)
Regeneration: ${Math.round(stats2000.regeneration.area).toLocaleString()} ha (${stats2000.regeneration.percent.toFixed(1)}%)
Non-forest:   ${Math.round(stats2000.nonForest.area).toLocaleString()} ha (${stats2000.nonForest.percent.toFixed(1)}%)

YEAR 2024:
Forest:       ${Math.round(stats2024.forest.area).toLocaleString()} ha (${stats2024.forest.percent.toFixed(1)}%)
Regeneration: ${Math.round(stats2024.regeneration.area).toLocaleString()} ha (${stats2024.regeneration.percent.toFixed(1)}%)
Non-forest:   ${Math.round(stats2024.nonForest.area).toLocaleString()} ha (${stats2024.nonForest.percent.toFixed(1)}%)

CHANGE:
Forest: ${forestChange >= 0 ? '+' : ''}${Math.round(forestChange).toLocaleString()} ha

Generated: ${new Date().toLocaleString()}
`;
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Forest_Report_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('✅ Text report downloaded!');
}

// ============================================================
// INITIALIZE APP
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Starting Forest Change Monitor...');
    
    initMap();
    loadForestData();
    setupYearButtons();
    setupLayerToggle();
    setupHoverHighlights();
    setupCompass();
    setupPdfDownload();
    
    console.log('✅ App initialized with light basemap');
});

// Debug helper
window.debugStats = () => {
    console.log('2000:', stats2000);
    console.log('2024:', stats2024);
};
