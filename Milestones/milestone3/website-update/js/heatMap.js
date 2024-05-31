// Load data from JSON files
const driverData = 'data/hm_driver_positions.json';
const constructorData = 'data/hm_constructors_positions.json';
const roundMetadataData = 'data/hm_round_metadata.json';  // Add the new metadata file

// Points systems
const pointsSystems = {
    'current': {1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1},
    'old': {1: 10, 2: 8, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1},
    'revised (top 12)': {1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1},
    'revised (top 15)': {1: 30, 2: 25, 3: 22, 4: 19, 5: 17, 6: 15, 7: 13, 8: 11, 9: 9, 10: 7, 11: 5, 12: 4, 13: 3, 14: 2, 15: 1},
};

document.addEventListener('DOMContentLoaded', () => {
    // Populate points system select
    const pointsSystemSelect = document.getElementById('points-system-select');
    for (const [key, value] of Object.entries(pointsSystems)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = key.charAt(0).toUpperCase() + key.slice(1);
        pointsSystemSelect.appendChild(option);
    }

    // Load data and initialize visualization
    loadDataAndInitialize();
});

function loadDataAndInitialize() {
    Promise.all([
        d3.json(driverData),
        d3.json(constructorData),
        d3.json(roundMetadataData)  // Load the new metadata file
    ]).then(([drivers, constructors, roundMetadata]) => {
        initializeHeatmap(drivers, constructors, roundMetadata);
    });
}

function initializeHeatmap(drivers, constructors, roundMetadata) {
    const yearSelect = document.getElementById('year-select');
    const championshipSelect = document.getElementById('championship-select');
    const pointsSystemSelect = document.getElementById('points-system-select');

    // Populate year select based on the data
    const years = Array.from(new Set(Object.keys(drivers).map(d => d.split(',')[0].replace('(', '')))).sort((a, b) => b - a);
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });

    // Event listeners for the selects
    yearSelect.addEventListener('change', () => updateVisualizations(drivers, constructors, roundMetadata));
    championshipSelect.addEventListener('change', () => updateVisualizations(drivers, constructors, roundMetadata));
    pointsSystemSelect.addEventListener('change', () => updateVisualizations(drivers, constructors, roundMetadata));

    // Initial render
    updateVisualizations(drivers, constructors, roundMetadata);
}

function updateVisualizations(drivers, constructors, roundMetadata) {
    const year = document.getElementById('year-select').value;
    const championship = document.getElementById('championship-select').value;
    const pointsSystem = document.getElementById('points-system-select').value;
    const data = championship === 'drivers' ? drivers : constructors;
    const filteredData = filterDataByYear(data, year);

    renderHeatmap(filteredData, pointsSystems[pointsSystem], championship, roundMetadata);
    renderLineChart(filteredData, pointsSystems[pointsSystem], championship, roundMetadata);
    updateTop3(filteredData, pointsSystems[pointsSystem], championship);
}

function filterDataByYear(data, year) {
    const filtered = Object.entries(data)
        .filter(([key]) => key.startsWith(`(${year}`))
        .reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
        }, {});
    return filtered;
}

function prepareHeatmapData(data, pointsSystem, championship) {
    // Flatten and format data
    const formattedData = [];
    const totalPoints = {};
    Object.entries(data).forEach(([key, rounds]) => {
        let entity = key.split(', ')[1].replace("')", "").replace("'", ""); // Remove single quotes
        totalPoints[entity] = 0;
        Object.entries(rounds).forEach(([round, position]) => {
            let points = 0;
            if (championship === 'drivers') {
                points = position && pointsSystem[position] ? pointsSystem[position] : 0;
            } else {
                if (position !== null) {
                    points = position.reduce((sum, pos) => sum + (pointsSystem[pos] || 0), 0);
                }
            }
            if (position !== null) {
                totalPoints[entity] += points;
                formattedData.push({ entity, round: +round, points });
            }
        });
    });
    // Add total points to the formatted data
    Object.entries(totalPoints).forEach(([entity, points]) => {
        formattedData.push({ entity, round: 'Total', points });
    });
    return { formattedData, totalPoints };
}

function renderHeatmap(data, pointsSystem, championship, roundMetadata) {
    // Clear existing heatmap
    d3.select('#heatmap-container').selectAll('*').remove();

    // Prepare data for heatmap
    const { formattedData, totalPoints } = prepareHeatmapData(data, pointsSystem, championship);

    // Sort entities by total points in descending order
    const entities = Object.keys(totalPoints).sort((a, b) => totalPoints[b] - totalPoints[a]);
    let rounds = Array.from(new Set(formattedData.map(d => d.round)));
    rounds = rounds.sort((a, b) => {
        if (a === 'Total') return 1;
        if (b === 'Total') return -1;
        return a - b;
    });

    const margin = { top: 50, right: 0, bottom: 50, left: 130};
    const width = 1100 - margin.left - margin.right;
    const height = Math.max(600, entities.length * 20) - margin.top - margin.bottom;

    const svg = d3.select('#heatmap-container').append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().range([0, width]).domain(rounds).padding(0.05);
    const y = d3.scaleBand().range([0, height]).domain(entities).padding(0.05);
    const color = d3.scaleSequential(d3.interpolateRdBu).domain([0, d3.max(formattedData, d => d.points)]);

    svg.append('g')
        .attr('transform', `translate(0, ${height})`)
        .style('font-size', 12)
        .call(d3.axisBottom(x).tickSize(0))
        .selectAll("text")
        .style("fill", "white")
        .select('.domain').remove();

    svg.append('g')
        .style('font-size', 12)
        .call(d3.axisLeft(y).tickSize(0))
        .selectAll("text")
        .style("fill", "white")
        .select('.domain').remove();

    // Add vertical gridlines
    svg.selectAll('line.vertical')
        .data(rounds)
        .enter()
        .append('line')
        .attr('class', 'vertical')
        .attr('x1', d => x(d) + x.bandwidth() / 2)
        .attr('x2', d => x(d) + x.bandwidth() / 2)
        .attr('y1', 0)
        .attr('y2', height)
        .attr('stroke', 'gray')
        .attr('stroke-width', '1px');

    // Add horizontal gridlines
    svg.selectAll('line.horizontal')
        .data(entities)
        .enter()
        .append('line')
        .attr('class', 'horizontal')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', d => y(d) + y.bandwidth() / 2)
        .attr('y2', d => y(d) + y.bandwidth() / 2)
        .attr('stroke', 'gray')
        .attr('stroke-width', '1px');

        // Tooltip setup
        const tooltipHeatmap = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);
        
        // Accumulated points calculation
        const accumulatedPoints = {};
        entities.forEach(entity => accumulatedPoints[entity] = 0);
        
        const cells = svg.selectAll()
        .data(formattedData, d => d.entity + ':' + d.round)
        .enter()
        .append('rect')
        .attr('x', d => x(d.round))
        .attr('y', d => y(d.entity))
        .attr('width', x.bandwidth())
        .attr('height', y.bandwidth())
        .style('fill', d => color(d.points))
        .on('mouseover', function(event, d) {
            // Update accumulated points up to this round
            const roundsUpToCurrent = rounds.slice(0, rounds.indexOf(d.round) + 1);
            const accumulatedPointsUpToCurrent = roundsUpToCurrent.reduce((acc, round) => {
                const dataPoint = formattedData.find(f => f.entity === d.entity && f.round === round);
                return acc + (dataPoint ? dataPoint.points : 0);
            }, 0);
            
            const year = document.getElementById('year-select').value;
            const roundKey = `(${year}, ${d.round})`;
            const metadata = roundMetadata[roundKey] || {};

            tooltipHeatmap.transition()
                .duration(100)
                .style("opacity", .9);

            tooltipHeatmap.html(`<strong style="font-size: 12px;">${d.entity}</strong><br/>
                          <span style="font-size: 10px;">
                          Round: ${d.round}<br/>
                          Circuit: ${metadata.circuit_name || 'N/A'}<br/>
                          Location: ${metadata.location || 'N/A'}, ${metadata.country || 'N/A'}<br/>
                          Continent: ${metadata.continent|| 'N/A'}<br/>
                          <strong style="font-size: 10px;">Round Points: ${d.points}</strong><br/>
                          <strong style="font-size: 10px;">Accumulated Points: ${accumulatedPointsUpToCurrent}</strong><br/>`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");

            d3.selectAll('.cell')
                .style('opacity', 0.6);
            d3.selectAll(`.cell-${d.entity.replace(/[^a-zA-Z0-9]/g, '')}`)
                .style('opacity', 1);
            d3.selectAll(`.round-${d.round}`)
                .style('opacity', 1);

            // Trigger line chart hover
            highlightLineChart(d.entity, d.round);
        })
        .on('mouseout', function(event, d) {
            tooltipHeatmap.transition()
                .duration(100)
                .style("opacity", 0);
            d3.selectAll('.cell')
                .style('opacity', 1);
            
            // Remove line chart hover effect
            resetLineChartHighlight();
        })
        .attr('class', d => `cell cell-${d.entity.replace(/[^a-zA-Z0-9]/g, '')} round-${d.round}`);

    // Add cell values
    svg.selectAll()
        .data(formattedData, d => d.entity + ':' + d.round)
        .enter()
        .append('text')
        .attr('x', d => x(d.round) + x.bandwidth() / 2)
        .attr('y', d => y(d.entity) + y.bandwidth() / 2)
        .attr('dy', '.35em')
        .attr('text-anchor', 'middle')
        .style('fill', '#FFF')
        .style('font-size', '10px')
        .text(d => d.points)
        .style("pointer-events", "none"); // Disable hover on labels;

    // Add axis titles
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style("fill", "#FFF")
        .text('Round');

    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -margin.left + 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style("fill", "#FFF")
        .text(championship === 'drivers' ? 'Drivers' : 'Teams');

    // Make the heatmap scrollable if there are too many entities
    d3.select('#heatmap-container').style('overflow-y', 'scroll').style('height', '600px');
}

function renderLineChart(data, pointsSystem, championship, roundMetadata) {
    // Prepare data for line chart
    const { formattedData, totalPoints } = prepareHeatmapData(data, pointsSystem, championship);
    
    // Clear existing line chart
    d3.select('#linechart-container').selectAll('*').remove();

    const entities = Object.keys(totalPoints).sort((a, b) => totalPoints[b] - totalPoints[a]);
    let rounds = Array.from(new Set(formattedData.map(d => d.round)));
    rounds = rounds.sort((a, b) => {
        if (a === 'Total') return 1;
        if (b === 'Total') return -1;
        return a - b;
    });

    const lineChartMargin = { top: 50, right: 0, bottom: 50, left: 50 };
    const lineChartWidth = 900 - lineChartMargin.left - lineChartMargin.right;
    const lineChartHeight = 300 - lineChartMargin.top - lineChartMargin.bottom;

    const svgLine = d3.select('#linechart-container').append('svg')
        .attr('width', lineChartWidth + lineChartMargin.left + lineChartMargin.right)
        .attr('height', lineChartHeight + lineChartMargin.top + lineChartMargin.bottom)
        .append('g')
        .attr('transform', `translate(${lineChartMargin.left},${lineChartMargin.top})`);

    const xLine = d3.scaleLinear().domain([1, d3.max(rounds.filter(r => r !== 'Total'))]).range([0, lineChartWidth]);
    const yLine = d3.scaleLinear().domain([0, d3.max(Object.values(totalPoints))]).range([lineChartHeight, 0]);
    const colorLine = d3.scaleOrdinal(d3.schemeCategory10).domain(entities);

    svgLine.append('g')
        .attr('transform', `translate(0, ${lineChartHeight})`)
        .call(d3.axisBottom(xLine).ticks(rounds.length - 1));

    svgLine.append('g')
        .call(d3.axisLeft(yLine));

    const line = d3.line()
        .x(d => xLine(d.round))
        .y(d => yLine(d.cumulativePoints));

    const entityData = entities.map(entity => {
        let cumulativePoints = 0;
        return {
            entity: entity,
            values: rounds.filter(r => r !== 'Total').map(round => {
                const dataPoint = formattedData.find(f => f.entity === entity && f.round === round);
                cumulativePoints += dataPoint ? dataPoint.points : 0;
                return { round: round, cumulativePoints: cumulativePoints };
            })
        };
    });

    const tooltipLineChart = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);
        
    const lines = svgLine.selectAll('.line-group')
        .data(entityData)
        .enter()
        .append('g')
        .attr('class', 'line-group')
        .each(function(d, i) {
            d3.select(this).attr('data-entity', d.entity);
        })
        .on('mousemove', function(event, d) {
            svgLine.selectAll('.line').style('opacity', 0.3);
            d3.select(this).selectAll('.line').style('opacity', 1).style('stroke-width', 3);
            // Tooltip setup
            const roundIndex = Math.round(xLine.invert(d3.pointer(event, this)[0]));
            const roundData = d.values.find(val => val.round === roundIndex);
            const year = document.getElementById('year-select').value;
            const roundKey = `(${year}, ${roundData.round})`;
            const metadata = roundMetadata[roundKey] || {};

            tooltipLineChart.transition()
                .duration(100)
                .style("opacity", .9);

            tooltipLineChart.html(`<strong style="font-size: 12px;">${d.entity}</strong><br/>
                          <span style="font-size: 10px;">
                          Round: ${roundData.round}<br/>
                          Circuit: ${metadata.circuit_name || 'N/A'}<br/>
                          Location: ${metadata.location || 'N/A'}, ${metadata.country || 'N/A'}<br/>
                          Continent: ${metadata.continent || 'N/A'}<br/>
                          <strong style="font-size: 10px;">Accumulated Points: ${roundData.cumulativePoints}</strong><br/>`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
            
            highlightHeatmap(d.entity, roundData.round);
        })
        .on('mouseout', function() {
            svgLine.selectAll('.line').style('opacity', 1).style('stroke-width', 2);
            d3.selectAll('.dot').style('opacity', 1).style('fill', d => colorLine(d.entity));
            // d3.select("body").selectAll(".tooltip").remove();
            tooltipLineChart.transition()
                .duration(100)
                .style("opacity", 0);
            resetHeatmapHighlight();
        });

    lines.append('path')
        .attr('class', 'line')
        .attr('d', d => line(d.values))
        .style('stroke', d => colorLine(d.entity))
        .style('stroke-width', 2)
        .style('fill', 'none');

    svgLine.append('text')
        .attr('x', lineChartWidth / 2)
        .attr('y', lineChartHeight + lineChartMargin.bottom - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style("fill", "#FFF")
        .text('Round');

        
    svgLine.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -lineChartHeight / 2)
        .attr('y', -lineChartMargin.left + 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style("fill", "#FFF")
        .text('Cumulative Points');
}

function highlightLineChart(entity, round) {
    const svgLine = d3.select('#linechart-container svg g');

    svgLine.selectAll('.line').style('opacity', 0.3).style('stroke-width', 1);
    svgLine.selectAll('.line-group').filter(function(d) {
        return d.entity === entity;
    }).select('.line').style('opacity', 1).style('stroke-width', 3);

    svgLine.selectAll('.dot').attr('display', 'none');
    svgLine.selectAll('.line-group').filter(function(d) {
        return d.entity === entity;
    }).selectAll('.dot').attr('display', null);
}

function resetLineChartHighlight() {
    const svgLine = d3.select('#linechart-container svg g');

    svgLine.selectAll('.line').style('opacity', 1).style('stroke-width', 2);
    svgLine.selectAll('.dot').attr('display', 'none');
}


function highlightHeatmap(entity, round) {
    d3.selectAll('.cell')
        .style('opacity', 0.6);
    d3.selectAll(`.cell-${entity.replace(/[^a-zA-Z0-9]/g, '')}`)
        .style('opacity', 1);
    d3.selectAll(`.round-${round}`)
        .style('opacity', 1);
}

function resetHeatmapHighlight() {
    d3.selectAll('.cell')
        .style('opacity', 1);
}

function updateTop3(data, pointsSystem, championship) {
    const { formattedData, totalPoints } = prepareHeatmapData(data, pointsSystem, championship);
    const sortedEntities = Object.keys(totalPoints).sort((a, b) => totalPoints[b] - totalPoints[a]).slice(0, 3);

    const top3Container = d3.select('#top-3-container');
    top3Container.selectAll('.top-3').remove();

    sortedEntities.forEach((entity, index) => {
        top3Container.append('div')
            .attr('class', 'top-3')
            .style('display', 'flex')
            .style('flex-direction', 'column')
            .style('align-items', 'left')
            .style('margin', '0 20px')
            .html(`<div class="points">${totalPoints[entity]} pts</div>
                   <div style="opacity: 0.6">${entity}</div>`);
    });
}