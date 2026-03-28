// ============================================================
// FOREST CHANGE MONITOR - OSA PENINSULA, COSTA RICA
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
// LOCAL FILE PATHS
// ============================================================
const url2000 = 'osa_2000_forest.geojson';
const url2024 = 'osa_2024_forest.geojson';

// ============================================================
// COLOR SCHEME
// ============================================================
function getColorByClass(className) {
    const classNameLower = String(className).toLowerCase();
    
    if (classNameLower.includes('forest') || classNameLower.includes('mature')) {
        return '#1B5E20';
    } else if (classNameLower.includes('secondary') || classNameLower.includes('regeneration')) {
        return '#4CAF50';
    } else if (classNameLower.includes('non') || classNameLower.includes('cleared')) {
        return '#FFB74D';
    } else if (classNameLower.includes('water')) {
        return '#1976D2';
    } else if (classNameLower.includes('urban')) {
        return '#E53935';
    } else {
        return '#BDBDBD';
    }
}

// ============================================================
// GET CLASS NAME FROM FEATURE
// ============================================================
function getClassNameFromFeature(properties) {
    const possibleNames = ['ClassLabel', 'class', 'CLASS', 'label', 'Label', 'LandCover', 'Type'];
    
    for (const name of possibleNames) {
        if (properties[name] !== undefined && properties[name] !== null) {
            return String(properties[name]);
        }
    }
    
    console.warn('Available properties:', Object.keys(properties));
    return 'Unknown';
}

// ============================================================
// GET AREA FROM FEATURE
// ============================================================
function getAreaFromFeature(properties) {
    const possibleAreas = ['area_ha', 'Area_ha', 'AREA_HA', 'Area', 'area', 'hectares'];
    
    for (const name of possibleAreas) {
        if (properties[name] !== undefined && properties[name] !== null) {
            const area = parseFloat(properties[name]);
            if (!isNaN(area)) return area;
        }
    }
    return 0;
}

// ============================================================
// INITIALIZE MAP
// ============================================================
function initMap() {
    map = L.map('map').setView([8.7, -83.5], 10);
    
    // Add base layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CartoDB',
        maxZoom: 19
    }).addTo(map);
    
    console.log('Map initialized');
    loadForestData();
}

// ============================================================
// LOAD GEOJSON DATA
// ============================================================
function loadForestData() {
    console.log('Loading forest data...');
    
    // Load 2000 data
    fetch(url2000)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        })
        .then(data => {
            console.log('✅ 2000 data loaded');
            console.log('Features count:', data.features.length);
            console.log('Sample feature:', data.features[0]);
            
            // Create the layer
            forestLayer2000 = L.geoJSON(data, {
                style: function(feature) {
                    const className = getClassNameFromFeature(feature.properties);
                    const color = getColorByClass(className);
                    console.log('Styling:', className, '->', color);
                    return {
                        fillColor: color,
                        color: '#ffffff',
                        weight: 0.5,
                        fillOpacity: 0.7
                    };
                },
                onEachFeature: function(feature, layer) {
                    const className = getClassNameFromFeature(feature.properties);
                    const area = getAreaFromFeature(feature.properties);
                    
                    layer.bindPopup(`
                        <strong>Land Cover (2000)</strong><br>
                        Class: ${className}<br>
                        Area: ${area > 0 ? Math.round(area).toLocaleString() : 'N/A'} ha
                    `);
                    
                    layer.on('mouseover', function() {
                        this.setStyle({
                            weight: 3,
                            color: '#FFD700',
                            fillOpacity: 0.9
                        });
                    });
                    
                    layer.on('mouseout', function() {
                        this.setStyle({
                            weight: 0.5,
                            color: '#ffffff',
                            fillOpacity: 0.7
                        });
                    });
                }
            });
            
            console.log('2000 layer created, bounds:', forestLayer2000.getBounds());
            
            // Add to map and zoom to fit
            forestLayer2000.addTo(map);
            map.fitBounds(forestLayer2000.getBounds());
            console.log('2000 layer added to map and zoomed');
            
            // Calculate stats
            stats2000 = calculateStatistics(data);
            console.log('2000 stats:', stats2000);
            
            // Load 2024 data
            load2024Data();
        })
        .catch(error => {
            console.error('Error loading 2000 data:', error);
            alert('Failed to load 2000 data. Check console for details.');
        });
}

function load2024Data() {
    fetch(url2024)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        })
        .then(data => {
            console.log('✅ 2024 data loaded');
            console.log('Features count:', data.features.length);
            
            forestLayer2024 = L.geoJSON(data, {
                style: function(feature) {
                    const className = getClassNameFromFeature(feature.properties);
                    return {
                        fillColor: getColorByClass(className),
                        color: '#ffffff',
                        weight: 0.5,
                        fillOpacity: 0.7
                    };
                },
                onEachFeature: function(feature, layer) {
                    const className = getClassNameFromFeature(feature.properties);
                    const area = getAreaFromFeature(feature.properties);
                    
                    layer.bindPopup(`
                        <strong>Land Cover (2024)</strong><br>
                        Class: ${className}<br>
                        Area: ${area > 0 ? Math.round(area).toLocaleString() : 'N/A'} ha
                    `);
                    
                    layer.on('mouseover', function() {
                        this.setStyle({
                            weight: 3,
                            color: '#FFD700',
                            fillOpacity: 0.9
                        });
                    });
                    
                    layer.on('mouseout', function() {
                        this.setStyle({
                            weight: 0.5,
                            color: '#ffffff',
                            fillOpacity: 0.7
                        });
                    });
                }
            });
            
            stats2024 = calculateStatistics(data);
            console.log('2024 stats:', stats2024);
            
            // Update UI
            updateStatisticsPanel(stats2000);
            updateChangeIndicators();
            
            console.log('🎉 Both datasets loaded!');
            console.log('2000 Total Area:', Math.round(stats2000.Total).toLocaleString(), 'ha');
            console.log('2024 Total Area:', Math.round(stats2024.Total).toLocaleString(), 'ha');
            
            // Show success message
            showMessage('Map data loaded successfully!', 'success');
        })
        .catch(error => {
            console.error('Error loading 2024 data:', error);
            showMessage('Failed to load 2024 data', 'error');
        });
}

// ============================================================
// SHOW SELECTED YEAR
// ============================================================
function showYear(year) {
    currentYear = year;
    
    if (!forestLayer2000 || !forestLayer2024) {
        console.log('Layers not ready yet');
        return;
    }
    
    // Remove both layers
    if (map.hasLayer(forestLayer2000)) map.removeLayer(forestLayer2000);
    if (map.hasLayer(forestLayer2024)) map.removeLayer(forestLayer2024);
    
    // Add selected year
    if (year === '2000') {
        forestLayer2000.addTo(map);
        updateStatisticsPanel(stats2000);
        console.log('Showing 2000 data');
    } else {
        forestLayer2024.addTo(map);
        updateStatisticsPanel(stats2024);
        console.log('Showing 2024 data');
    }
    
    // Update buttons
    document.querySelectorAll('.year-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent === year);
    });
    
    // Update title
    const titleElement = document.getElementById('currentYearTitle');
    if (titleElement) titleElement.textContent = `Land Cover ${year}`;
}

// ============================================================
// CALCULATE STATISTICS
// ============================================================
function calculateStatistics(geojson) {
    const stats = {};
    let totalArea = 0;
    
    if (!geojson.features) return stats;
    
    geojson.features.forEach(feature => {
        const className = getClassNameFromFeature(feature.properties);
        const area = getAreaFromFeature(feature.properties);
        
        if (!stats[className]) stats[className] = 0;
        stats[className] += area;
        totalArea += area;
    });
    
    stats['Total'] = totalArea;
    return stats;
}

// ============================================================
// UPDATE STATISTICS PANEL
// ============================================================
function updateStatisticsPanel(stats) {
    const tbody = document.querySelector('#statsTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    Object.keys(stats).forEach(className => {
        if (className === 'Total') return;
        
        const row = tbody.insertRow();
        const area = stats[className];
        const percent = ((area / stats['Total']) * 100).toFixed(1);
        
        row.insertCell(0).innerHTML = `<span style="display:inline-block;width:12px;height:12px;background-color:${getColorByClass(className)};margin-right:8px;"></span>${className}`;
        row.insertCell(1).textContent = Math.round(area).toLocaleString() + ' ha';
        row.insertCell(2).textContent = percent + '%';
    });
    
    updateChart(stats);
}

// ============================================================
// UPDATE CHART
// ============================================================
function updateChart(stats) {
    const ctx = document.getElementById('statsChart');
    if (!ctx) return;
    
    const labels = [];
    const data = [];
    const colors = [];
    
    Object.keys(stats).forEach(className => {
        if (className === 'Total') return;
        labels.push(className);
        data.push(stats[className]);
        colors.push(getColorByClass(className));
    });
    
    if (myChart) myChart.destroy();
    
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
                legend: { display: false },
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
    if (!stats2000.Total || !stats2024.Total) return;
    
    const forestTypes = ['Forest', 'Mature Forest', 'Secondary Forest'];
    let forest2000 = 0, forest2024 = 0;
    
    forestTypes.forEach(type => {
        forest2000 += stats2000[type] || 0;
        forest2024 += stats2024[type] || 0;
    });
    
    const change = forest2024 - forest2000;
    const percent = ((change / forest2000) * 100).toFixed(1);
    
    const changeEl = document.getElementById('forestChange');
    const percentEl = document.getElementById('forestChangePercent');
    
    if (changeEl) {
        changeEl.textContent = `${change > 0 ? '+' : ''}${Math.round(change).toLocaleString()} ha`;
        changeEl.style.color = change >= 0 ? '#4CAF50' : '#E53935';
    }
    if (percentEl) percentEl.textContent = `(${percent}%)`;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function showMessage(msg, type) {
    const div = document.createElement('div');
    div.textContent = msg;
    div.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 10px 20px;
        background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
        color: white;
        border-radius: 5px;
        z-index: 1000;
        font-family: monospace;
    `;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

// ============================================================
// PDF DOWNLOAD
// ============================================================
function setupPdfDownload() {
    const btn = document.getElementById('downloadPdfBtn');
    if (!btn) return;
    
    btn.addEventListener('click', () => {
        let report = 'FOREST CHANGE MONITOR REPORT\n';
        report += 'Osa Peninsula, Costa Rica (2000-2024)\n\n';
        report += 'YEAR 2000:\n';
        Object.keys(stats2000).forEach(c => {
            if (c !== 'Total') report += `  ${c}: ${Math.round(stats2000[c]).toLocaleString()} ha\n`;
        });
        report += '\nYEAR 2024:\n';
        Object.keys(stats2024).forEach(c => {
            if (c !== 'Total') report += `  ${c}: ${Math.round(stats2024[c]).toLocaleString()} ha\n`;
        });
        
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `forest_report_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    });
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
});
