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

    d3.select('#race-calendar-map').selectAll('*').remove();
    
    const width = 700;
    const height = 700;

    const svg = d3.select('#race-calendar-map').append('svg')
        .attr('width', width)
        .attr('height', height);

    const g = svg.append('g');

    const projection = d3.geoEquirectangular().scale(300).translate([width / 2 - 100, height / 2 + 100]);
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
        updateCalendarTable('calendar-table-container', yearData.originalPath, yearData.revisedPath, yearData.nodes, yearData.originalEdges, yearData.revisedEdges, projection, g);

    }).catch(error => console.error('Error loading map data:', error));

    const minZoom = 0.5;
    const maxZoom = 10;
    const zoom = d3.zoom()
    .scaleExtent([minZoom, maxZoom]) // Set the minimum and maximum zoom level
    .on('zoom', (event) => {
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

    // Prevent page scrolling when the zoom level is at the minimum or at the maximum
    bmapSvg.on("wheel", function(event) {
    const transform = d3.zoomTransform(bmapSvg.node());
    if ((transform.k <= minZoom && event.deltaY > 0) || (transform.k >= maxZoom && event.deltaY < 0)) {
        event.preventDefault();
    }
    });

    applyZoom(svg);
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
    const co2Assumption = 0.115; // Assumption from this (115g/km per passenger): https://www.carbonindependent.org/22.html
    const teamMembers = 75; // Assumption from this: https://us.motorsport.com/f1/news/insiders-guide-f1-team-who-does-what/8025043/

    const delta = (revisedDistance / originalDistance - 1).toFixed(2);
    const co2 = (delta * originalDistance * co2Assumption * teamMembers).toFixed(1);

    document.getElementById('original-distance').textContent = `${Math.round(originalDistance).toLocaleString()} km`;
    document.getElementById('revised-distance').textContent = `${Math.round(revisedDistance).toLocaleString()} km`;
    document.getElementById('delta').textContent = `${(delta * 100).toFixed(1)}%`;
    document.getElementById('reduced-co2').textContent = `${Math.round(co2).toLocaleString()} tons`;
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
        .attr('data-lat1', d => d.coordinates[0][1])
        .attr('data-lng1', d => d.coordinates[0][0])
        .attr('data-lat2', d => d.coordinates[1][1])
        .attr('data-lng2', d => d.coordinates[1][0])
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
                    g.selectAll('.circuit-label').style('opacity', 0.2);
                    g.selectAll('.circuit').style('opacity', 0.2); // Add this line
                })
                .on('mouseout', function() {
                    g.selectAll(`.${type === 'original' ? 'revised' : 'original'}`)
                        .style('opacity', 1);
                    g.selectAll(`.${type} path.visible-path`).style('stroke', color);
                    g.selectAll(`.${type} .distance-label`).style('display', 'none');
                    g.selectAll('.circuit-label').style('opacity', 1);
                    g.selectAll('.circuit').style('opacity', 1); // Add this line
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
        .style('stroke', 'none')
        .on('mouseover', function() {
            d3.select(this).style('opacity', 1);  // Highlight the circuit
        })
        .on('mouseout', function() {
            d3.select(this).style('opacity', 1);  // Reset highlight
        });
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
        .text(d => d.location)
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

function parseData(rawData) {
    // Transform the array of year data into an object keyed by year
    const data = {};
    rawData.forEach(entry => {
        data[entry.year] = entry;
    });
    return data;
}

function updateCalendarTable(containerId, originalPath, revisedPath, nodes, originalEdges, revisedEdges, projection, g) {
    // Remove existing tables
    d3.selectAll('.calendar-table').remove();

    const container = document.getElementById(containerId);
    const table = generateTable(originalPath, revisedPath, nodes, originalEdges, revisedEdges, projection, g);
    container.appendChild(table);
}

function generateTable(originalPath, revisedPath, nodes, originalEdges, revisedEdges, projection, g) {
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
        
        // Add hover effect for rows except the first row
        if (i > 0) {
            row.addEventListener('mouseover', () => {
                Array.from(tbody.children).forEach(tr => {
                    if (tr !== row) {
                        tr.style.opacity = '0.5';
                    }
                });
                // Highlight the edges corresponding to this row
                const originalRef = originalPath[i];
                const revisedRef = revisedPath[i];
                highlightEdges(originalRef, revisedRef, nodes, originalEdges, revisedEdges, projection, g);
            });

            row.addEventListener('mouseout', () => {
                Array.from(tbody.children).forEach(tr => {
                    tr.style.opacity = '1';
                });
                // Reset edges highlighting
                resetEdgesHighlighting(g);
            });
        }

        tbody.appendChild(row);
    }

    table.appendChild(tbody);

    return table;
}

function highlightEdges(originalRef, revisedRef, nodes, originalEdges, revisedEdges, projection, g) {
    const originalCoord = [nodes[originalRef].lat, nodes[originalRef].lng];
    const revisedCoord = [nodes[revisedRef].lat, nodes[revisedRef].lng];

    const originalEdge = originalEdges.find(edge => 
        (edge.lat2 === originalCoord[0] && edge.lng2 === originalCoord[1])
    );

    const revisedEdge = revisedEdges.find(edge => 
        (edge.lat2 === revisedCoord[0] && edge.lng2 === revisedCoord[1])
    );

    g.selectAll('.original').transition().duration(200).style('opacity', function() {
        const lat2 = +this.getAttribute('data-lat2');
        const lng2 = +this.getAttribute('data-lng2');
        return (lat2 === originalCoord[0] && lng2 === originalCoord[1]) ? 1 : 0.1;
    });

    g.selectAll('.revised').transition().duration(200).style('opacity', function() {
        const lat2 = +this.getAttribute('data-lat2');
        const lng2 = +this.getAttribute('data-lng2');
        return (lat2 === revisedCoord[0] && lng2 === revisedCoord[1]) ? 1 : 0.1;
    });

    // Reposition map to fit both original and revised edges
    const bounds = getBounds([originalEdge, revisedEdge], projection);
    console.log('bounds', bounds)
    const [[x0, y0], [x1, y1]] = bounds;
    const width = x1 - x0;
    const height = y1 - y0;
    const centerX = (x0 + x1) / 2;
    const centerY = (y0 + y1) / 2;
    const scale = Math.min(700 / width, 700 / height) * 0.9; // Scale down slightly to fit within the viewbox
    const translate = [700 / 2 - scale * centerX, 700 / 2 - scale * centerY];

    // Update zoom
    applyZoom(g, translate, scale);
}

function resetEdgesHighlighting(g) {
    g.selectAll('.original').transition().duration(200).style('opacity', 1);
    g.selectAll('.revised').transition().duration(200).style('opacity', 1);
}

function getBounds(edges, projection) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    edges.forEach(edge => {
        if (edge) {
            const coords = [[edge.lng1, edge.lat1], [edge.lng2, edge.lat2]];
            coords.forEach(([lng, lat]) => {
                const [x, y] = projection([lng, lat]);
                if (x < x0) x0 = x;
                if (x > x1) x1 = x;
                if (y < y0) y0 = y;
                if (y > y1) y1 = y;
            });
        }
    });
    return [[x0, y0], [x1, y1]];
}

function applyZoom(svg) {
    const zoom = d3.zoom().on('zoom', (event) => {
        svg.select('g').attr('transform', event.transform);
        svg.selectAll('.land').style('stroke-width', `${1 / event.transform.k}px`);
        svg.selectAll('.border').style('stroke-width', `${1.5 / event.transform.k}px`);
        svg.selectAll('.circuit').attr('r', 3 / event.transform.k);
        svg.selectAll('.circuit-label').style('font-size', `${12 / event.transform.k}px`);
        svg.selectAll('.distance-label').style('font-size', `${12 / event.transform.k}px`);
        svg.selectAll('.arrow').attr('refX', 10 / event.transform.k)
                               .attr('markerWidth', 4 / event.transform.k)
                               .attr('markerHeight', 4 / event.transform.k);
    });

    svg.call(zoom);
}

// const zoom = d3.zoom().on('zoom', (event) => {
//     g.attr('transform', event.transform);
//     g.selectAll('.land').style('stroke-width', `${1 / event.transform.k}px`);
//     g.selectAll('.border').style('stroke-width', `${1.5 / event.transform.k}px`);
//     g.selectAll('.circuit').attr('r', 3 / event.transform.k);
//     g.selectAll('.circuit-label').style('font-size', `${12 / event.transform.k}px`);
//     g.selectAll('.distance-label').style('font-size', `${12 / event.transform.k}px`);
//     g.selectAll('.arrow').attr('refX', 10 / event.transform.k)
//                         .attr('markerWidth', 4 / event.transform.k)
//                         .attr('markerHeight', 4 / event.transform.k);
// });

function applyZoom(g, translate, scale) {
    g.transition().duration(2000).attr('transform', `translate(${translate})scale(${scale})`);
    
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
