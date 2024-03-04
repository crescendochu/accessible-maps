mapboxgl.accessToken = 'pk.eyJ1IjoiY3Jlc2NlbmRvY2h1IiwiYSI6ImNpdGR5MWZ5aDAycjIyc3A5ZHoxZzRwMGsifQ.nEaSxm520v7TpKAy2GG_kA';

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v10',
    center: [-98.5795, 39.8283],
    zoom: 4
});

REGION_MAP = {
    "NW": "Northwest",
    "NE": "Northeast",
    "SW": "Southwest",
    "SE": "Southeast",
    "W": "West",
    "E": "East",
    "N": "North",
    "S": "South",
    "C": "Central",
    "left_diagonal": "diagonally from Northwest to Southeast",
    "right_diagonal": "diagonally from Southwest to Northeast",
    "horizontal": "horizontally across the center",
    "vertical": "vertically through the center"
}

function updateStats(sourceURL) {
    let bounds = map.getBounds();
    let url = `/stats_in_view?minLon=${bounds.getWest()}&minLat=${bounds.getSouth()}&maxLon=${bounds.getEast()}&maxLat=${bounds.getNorth()}&sourceURL=${sourceURL}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            let content = '<p>In the current view, the spatial trend is:</p>';

            console.log(data);
            
            let highs = [];
            let lows = [];
            for (const [section, trends] of Object.entries(data.trends)) {
                if (trends.high && trends.high.length > 0) {
                    highs.push(section);
                }
                if (trends.low && trends.low.length > 0) {
                    lows.push(section);
                }
            }

            if (highs.length > 0) {
                content += '<p>The population density is high ';
                highs.forEach((section, index) => {
                    content += `${REGION_MAP[section]}${index < highs.length - 1 ? ', ' : ''}`;
                });
                content += `.</p>`;
            } else {
                content += '<p>No regions with particularly high population density.</p>';
            }

            if (lows.length > 0) {
                content += '<p>The population density is low ';
                lows.forEach((section, index) => {
                    content += `${REGION_MAP[section]}${index < lows.length - 1 ? ', ' : ''}`;
                });
                content += `.</p>`;
            } else {
                content += '<p>No regions with particularly low population density.</p>';
            }

            content += '<p>The statistics for the population density in the current view are:</p>';
            content += `<ul>
                            <li><strong>Average Density</strong>: ${data.average}</li>
                            <li><strong>Median Density</strong>: ${data.median}</li>
                            <li><strong>Maximum Density</strong>: ${data.max.ppl_density}</li>
                            <li><strong>Minimum Density</strong>: ${data.min.ppl_density}</li>
                        </ul>`;

            document.getElementById('stats-display').innerHTML = content;
        })
        .catch(error => console.error('Error fetching data:', error));
}

function fetchAndUpdateData() {
    var bounds = map.getBounds();
    var zoom = map.getZoom();
    var sourceURL = '/state_density_data'; // Default to state-level data

    if (zoom >= 7) {
        sourceURL = '/tract_density_data';
    } else if (zoom >= 5) {
        sourceURL = '/county_density_data';
    }

    // Construct the URL with bounds and zoom level if your API supports it
    var apiURL = `${sourceURL}?bbox=${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}&zoom=${zoom}`;

    map.getSource('stateDensity').setData(apiURL);

    // remove '/' from the beginning of the sourceURL
    updateStats(sourceURL.replace(/^\//, ''));
}

map.on('load', function () {
    map.addSource('stateDensity', {
        type: 'geojson',
        data: {
            "type": "FeatureCollection",
            "features": []
        } // Start with an empty GeoJSON FeatureCollection
    });

    map.addLayer({
        'id': 'density-layer',
        'type': 'fill',
        'source': 'stateDensity',
        'layout': {},
        'paint': {
            'fill-color': [
                'interpolate',
                ['linear'],
                ['get', 'ppl_densit'],
                0, '#F2F12D',    
                36, '#EED322',   
                72, '#E6B71E',     
                124, '#DA9C20', 
                188, '#CA8323',   
                290, '#B86B25',   
                500, '#A25626',    
                750, '#8B4225',   
                1000, '#723122',  
            ],
            'fill-opacity': 0.75
        }
    });

    map.addSource('highlight-max', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({
        id: 'highlight-max',
        type: 'fill',
        source: 'highlight-max',
        paint: {
            'fill-color': '#B2D235', // Green for max
            'fill-opacity': 0.8
        }
    });

    map.addSource('highlight-min', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({
        id: 'highlight-min',
        type: 'fill',
        source: 'highlight-min',
        paint: {
            'fill-color': '#EF6074', // Red for min
            'fill-opacity': 0.8
        }
    });        

    // Fetch and update data initially
    fetchAndUpdateData();

    // Update data on zoom end to avoid too many requests during zooming
    map.on('zoomend', fetchAndUpdateData);

    // Update data when the map is panned
    map.on('moveend', fetchAndUpdateData);
});
