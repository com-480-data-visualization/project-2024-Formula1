const dataFile = 'data/rc_data.json';

document.addEventListener('DOMContentLoaded', () => {
    fetch(dataFile)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(rawData => {
            try {
                const data = parseData(rawData);
                console.log('Parsed Data:', data);  // Debugging
                populateYearSelect(data);
                updateMapAndHeader(data); // Initial update to map and header
            } catch (error) {
                console.error('Error parsing data:', error);
            }
        })
        .catch(error => console.error('Error loading data:', error));
});



function populateYearSelect(data) {
    const yearSelect = document.getElementById('year');
    const years = Object.keys(data).sort((a, b) => b - a);  // Sort years in descending order
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });
    yearSelect.addEventListener('change', () => updateMapAndHeader(data));
    yearSelect.value = years[0];  // Set default value to the most recent year
}

function updateMapAndHeader(data) {
    updateMap(data);
    updateHeader(data);
}

function updateMap(data) {
    const yearSelect = document.getElementById('year');
    const year = yearSelect.value;
    const yearData = data[year];
    
    if (!yearData) {
        console.error(`No data found for year: ${year}`);
        return;
    }

    d3.select('#map').selectAll('*').remove();
    
    const width = 700;
    const height = 700;

    const svg = d3.select('#map').append('svg')
        .attr('width', width)
        .attr('height', height);

    const g = svg.append('g');

    const projection = d3.geoEquirectangular().scale(300).translate([width / 2-100, height / 2+100]);
    const path = d3.geoPath().projection(projection);

    // Define arrow markers for the paths
    svg.append('defs').selectAll('marker')
        .data(['arrow'])
        .enter()
        .append('marker')
        .attr('id', 'arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 10)
        .attr('refY', 0)
        .attr('markerWidth', 3)
        .attr('markerHeight', 3)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#FF2E27');

    d3.json('https://d3js.org/world-110m.v1.json').then(worldData => {
        g.append('path')
            .datum(topojson.feature(worldData, worldData.objects.countries))
            .attr('d', path)
            .attr('class', 'land')
            .style('fill', '#1f1f27');

        g.append('path')
            .datum(topojson.mesh(worldData, worldData.objects.countries, (a, b) => a !== b))
            .attr('d', path)
            .attr('class', 'border')
            .style('fill', 'none')
            .style('stroke', '#080b0c')
            .style('stroke-width', 1.5);

        drawCurvedPaths(g, yearData.originalEdges, projection, 'original', yearData.nodes, yearData.coord2CircuitRef);
        drawCurvedPaths(g, yearData.revisedEdges, projection, 'revised', yearData.nodes, yearData.coord2CircuitRef);

        // Highlight source of origin
        highlightOrigin(g, yearData.nodes, yearData.originalPath[0], yearData.revisedPath[0], projection);
        // Add circuit dots and labels
        drawCircuits(g, yearData.nodes, projection);
        drawCircuitLabels(g, yearData.nodes, projection);
        // Update calendars
        // updateCalendar('original-list', yearData.originalPath, yearData.nodes);
        // updateCalendar('revised-list', yearData.revisedPath, yearData.nodes);
        // Example usage:
        // Assuming you have your originalPath, revisedPath, and nodes data ready.
        updateCalendarTable('calendar-table-container', yearData.originalPath, yearData.revisedPath, yearData.nodes)

    }).catch(error => console.error('Error loading map data:', error));

    const zoom = d3.zoom().on('zoom', (event) => {
        g.attr('transform', event.transform);
        g.selectAll('.land').style('stroke-width', `${1 / event.transform.k}px`);
        g.selectAll('.border').style('stroke-width', `${1.5 / event.transform.k}px`);
        g.selectAll('.circuit').attr('r', 3 / event.transform.k);
        g.selectAll('.circuit-label').style('font-size', `${12 / event.transform.k}px`);
        g.selectAll('.distance-label').style('font-size', `${12 / event.transform.k}px`);
        g.selectAll('.arrow').attr('refX', 10 / event.transform.k)
                            .attr('markerWidth', 4 / event.transform.k)
                            .attr('markerHeight', 4 / event.transform.k);
    });

    svg.call(zoom);
}

function updateHeader(data) {
    const yearSelect = document.getElementById('year');
    const year = yearSelect.value;
    const yearData = data[year];
    
    if (!yearData) {
        console.error(`No data found for year: ${year}`);
        return;
    }

    const originalDistance = yearData.originalTotalDistance;
    const revisedDistance = yearData.revisedTotalDistance;
    const co2Assumption = 0.09; // Example value for CO2 emission per km
    const teamMembers = 50; // Example value for the number of staff members per team per race

    const delta = (revisedDistance / originalDistance - 1).toFixed(2);
    const co2 = (delta * originalDistance * co2Assumption * teamMembers).toFixed(1);

    document.getElementById('original-distance').textContent = `${Math.round(originalDistance).toLocaleString()} km`;
    document.getElementById('revised-distance').textContent = `${Math.round(revisedDistance).toLocaleString()} km`;
    document.getElementById('delta').textContent = `${(delta * 100).toFixed(1)}%`;
    document.getElementById('reduced-co2').textContent = `${Math.round(co2).toLocaleString()} ton`;
}

function drawCurvedPaths(g, edges, projection, type, nodes, coord2CircuitRef) {
    const color = type === 'original' ? '#90100C' : '#FF2E27';
    const hoverColor = '#FF2E27';  // Color on hover
    const link = edges.map(d => {
        return {
            type: "LineString",
            coordinates: [[d.lng1, d.lat1], [d.lng2, d.lat2]],
            source: coord2CircuitRef[`(${d.lat1}, ${d.lng1})`].circuitRef,
            target: coord2CircuitRef[`(${d.lat2}, ${d.lng2})`].circuitRef,
            distance: d.distance
        };
    });

    const lineGenerator = d3.line()
        .curve(d3.curveBundle.beta(0.85))  // Use curveBundle or curveBasis for smoother lines
        .x(d => projection(d)[0])
        .y(d => projection(d)[1]);

    const pathGroup = g.selectAll(`.${type}`)
        .data(link)
        .enter()
        .append('g')
        .attr('class', type)
        .each(function(d) {
            // Append an invisible path for easier hover
            d3.select(this)
                .append('path')
                .attr('d', lineGenerator(d.coordinates))
                .style('fill', 'none')
                .style('stroke', 'transparent')
                .style('stroke-width', '15px')
                .attr('class', 'hover-path')
                .on('mouseover', function() {
                    g.selectAll(`.${type === 'original' ? 'revised' : 'original'}`)
                        .style('opacity', 0.3);
                    g.selectAll(`.${type} path.visible-path`).style('stroke', hoverColor);
                    g.selectAll(`.${type} .distance-label`).style('display', 'block');
                    g.selectAll('.circuit-label').style('opacity', 0.2)
                })
                .on('mouseout', function() {
                    g.selectAll(`.${type === 'original' ? 'revised' : 'original'}`)
                        .style('opacity', 1);
                    g.selectAll(`.${type} path.visible-path`).style('stroke', color);
                    g.selectAll(`.${type} .distance-label`).style('display', 'none');
                    g.selectAll('.circuit-label').style('opacity', 1)
                });

            // Append the visible path
            d3.select(this)
                .append('path')
                .attr('d', lineGenerator(d.coordinates))
                .style('fill', 'none')
                .style('stroke', color)
                .style('stroke-width', 2)
                .style('stroke-dasharray', type === 'original' ? '3,3' : 'none')  // Dotted line for original path
                .attr('class', 'visible-path')
                .attr('marker-end', 'url(#arrow)')
                .style('vector-effect', 'non-scaling-stroke');  // Ensure the stroke width does not scale with zoom
            
            d3.select(this)
                .append('text')
                .attr('class', 'distance-label')
                .attr('x', (projection(d.coordinates[0])[0] + projection(d.coordinates[1])[0]) / 2)
                .attr('y', (projection(d.coordinates[0])[1] + projection(d.coordinates[1])[1]) / 2)
                .attr('dy', -5)
                .attr('text-anchor', 'middle')
                .style('fill', 'white')
                .style('font-size', '10px')  // Change font size to 12px
                .style('display', 'none')
                .text(`${Math.round(d.distance).toLocaleString()} km`);  // Remove decimals and format distance
        });
}

function drawCircuits(g, nodes, projection) {
    const circuits = Object.values(nodes);

    g.selectAll('.circuit')
        .data(circuits)
        .enter()
        .append('circle')
        .attr('cx', d => projection([d.lng, d.lat])[0])
        .attr('cy', d => projection([d.lng, d.lat])[1])
        .attr('r', 3)
        .attr('class', 'circuit')
        .style('fill', 'white')
        .style('stroke', 'none');
}

function drawCircuitLabels(g, nodes, projection) {
    const circuits = Object.values(nodes);

    g.selectAll('.circuit-label')
        .data(circuits)
        .enter()
        .append('text')
        .attr('x', d => projection([d.lng, d.lat])[0])
        .attr('y', d => projection([d.lng, d.lat])[1])
        .attr('dy', -10)
        .attr('class', 'circuit-label')
        .style('font-size', '10px')
        .style('fill', 'white')
        .style('text-anchor', 'middle')
        .text(d => d.location);
}

function highlightOrigin(g, nodes, originalOrigin, revisedOrigin, projection) {
    const origins = [nodes[originalOrigin], nodes[revisedOrigin]];

    g.selectAll('.origin')
        .data(origins)
        .enter()
        .append('circle')
        .attr('cx', d => projection([d.lng, d.lat])[0])
        .attr('cy', d => projection([d.lng, d.lat])[1])
        .attr('r', 10)
        .attr('class', 'origin')
        .style('fill', '#FF2E27')
        .style('opacity', 0.3);

    g.selectAll('.inner-origin')
        .data(origins)
        .enter()
        .append('circle')
        .attr('cx', d => projection([d.lng, d.lat])[0])
        .attr('cy', d => projection([d.lng, d.lat])[1])
        .attr('r', 5)
        .attr('class', 'inner-origin')
        .style('fill', '#FF2E27')
        .style('opacity', 0.5);
}

// function updateCalendar(listId, path, nodes) {
//     const list = document.getElementById(listId);
//     list.innerHTML = '';  // Clear existing list
//     path.forEach((circuitRef, index) => {
//         const row = document.createElement('div');
//         row.className = 'calendar-row';
//         row.innerHTML = `
//             <div class="calendar-order">${index + 1}.</div>
//             <div class="calendar-cell">
//                 <div class="calendar-continent" style="background-color: ${getContinentColor(nodes[circuitRef].continent)} width=10px height=100%"></div>
//                 <div class="calendar-country">${nodes[circuitRef].country}</div>
//             </div>
//         `;
//         list.appendChild(row);
//     });
// }

function parseData(rawData) {
    // Transform the array of year data into an object keyed by year
    const data = {};
    rawData.forEach(entry => {
        data[entry.year] = entry;
    });
    return data;
}

function updateCalendarTable(containerId, originalPath, revisedPath, nodes) {
    // Remove existing tables
    d3.selectAll('.calendar-table').remove();

    const container = document.getElementById(containerId);
    const table = generateTable(originalPath, revisedPath, nodes);
    container.appendChild(table);
}


function generateTable(originalPath, revisedPath, nodes) {
    const table = document.createElement('table');
    table.className = 'calendar-table';

    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const headers = ['', '', 'Original', '', 'Revised'];
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');

    const maxLength = Math.max(originalPath.length, revisedPath.length);

    for (let i = 0; i < maxLength; i++) {
        const row = document.createElement('tr');

        // Round
        const roundCell = document.createElement('td');
        roundCell.textContent = `${i + 1}.`;
        row.appendChild(roundCell);

        // Original Path
        if (i < originalPath.length) {
            const originalRef = originalPath[i];
            const originalNode = nodes[originalRef];

            const continentCellOriginal = document.createElement('td');
            continentCellOriginal.className = 'continent-cell';
            continentCellOriginal.style.backgroundColor = getContinentColor(originalNode.continent);
            row.appendChild(continentCellOriginal);

            const originalCell = document.createElement('td');
            originalCell.textContent = originalNode.country;
            row.appendChild(originalCell);
        } else {
            row.appendChild(document.createElement('td'));
            row.appendChild(document.createElement('td'));
        }

        // Revised Path
        if (i < revisedPath.length) {
            const revisedRef = revisedPath[i];
            const revisedNode = nodes[revisedRef];

            const continentCellRevised = document.createElement('td');
            continentCellRevised.className = 'continent-cell';
            continentCellRevised.style.backgroundColor = getContinentColor(revisedNode.continent);
            row.appendChild(continentCellRevised);

            const revisedCell = document.createElement('td');
            revisedCell.textContent = revisedNode.country;
            row.appendChild(revisedCell);
        } else {
            row.appendChild(document.createElement('td'));
            row.appendChild(document.createElement('td'));
        }

        tbody.appendChild(row);
    }

    table.appendChild(tbody);

    return table;
}

function getContinentColor(continent) {
    const mapContinentColor = {
        'Europe': '#90100C',
        'North America': '#E10801',
        'Asia': '#FF2E27',
        'South America': '#FF5F5A',
        'Oceania': '#FF9996',
        'Africa': '#FFDEDD'
    };
    return mapContinentColor[continent] || '#ffffff';
}