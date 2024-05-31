const bmapWidth = 1100;
const bmapHeight = 500;
const minZoom = 0.5;
const maxZoom = 10;

const map_continent_color = {
    'Europe': '#90100C',
    'North America': '#E10801',
    'Asia': '#FF2E27',
    'South America': '#FF5F5A',
    'Oceania': '#FF9996',
    'Africa': '#FFDEDD'
};

const bmapSvg = d3.select("#map").append("svg")
    .attr("width", bmapWidth)
    .attr("height", bmapHeight)
    .style("background-color", "transparent"); // Water color

const gBmap = bmapSvg.append("g");

const projection = d3.geoMercator()
    .scale(100)
    .translate([bmapWidth / 2, bmapHeight / 2 + 100]);

const path = d3.geoPath().projection(projection);

const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

const zoom = d3.zoom()
    .scaleExtent([minZoom, maxZoom]) // Set the minimum and maximum zoom level
    .on("zoom", function (event) {
        gBmap.attr("transform", event.transform);
        gBmap.selectAll("circle").attr("r", d => Math.sqrt(d.races) * 2 / event.transform.k);
        gBmap.selectAll(".country-label").style("font-size", `${10 / event.transform.k}px`);
        gBmap.selectAll(".country").style("stroke-width", `${1 / event.transform.k}px`);
    });

bmapSvg.call(zoom);

// Prevent page scrolling when the zoom level is at the minimum or at the maximum
bmapSvg.on("wheel", function(event) {
    const transform = d3.zoomTransform(bmapSvg.node());
    if ((transform.k <= minZoom && event.deltaY > 0) || (transform.k >= maxZoom && event.deltaY < 0)) {
        event.preventDefault();
    }
});

d3.json("https://unpkg.com/world-atlas@1.1.4/world/110m.json").then(world => {
    const countries = topojson.feature(world, world.objects.countries).features;

    gBmap.selectAll(".country")
        .data(countries)
        .enter().append("path")
        .attr("class", "country")
        .attr("d", path)
        .style("fill", "#1f1f27") // Land color
        .style("stroke", "#070b0c") // Border color
        .style("stroke-width", "1px");

    d3.json("data/circuits.json").then(data => {
        const circles = gBmap.selectAll("circle")
            .data(data)
            .enter().append("circle")
            .attr("cx", d => projection([d.lng, d.lat])[0])
            .attr("cy", d => projection([d.lng, d.lat])[1])
            .attr("r", d => Math.sqrt(d.races) * 2)
            .style("fill", d => map_continent_color[d.continent])
            .style("opacity", 0.8);

        circles.on("mouseover", (event, d) => {
            tooltip.transition()
                .duration(100)
                .style("opacity", .9);
            tooltip.html(`<strong style="font-size: 12px;">${d.circuit_name}</strong><br/>
                        <span style="font-size: 10px;">
                        Country: ${d.country}<br/>
                        Continent: ${d.continent}<br/>
                        Longitude: ${d.lng}<br/>
                        Latitude: ${d.lat}<br/>
                        Altitude: ${d.alt}<br/>
                        Races: ${d.races}<br/>
                        First Race: ${d.firstRace}<br/>
                        Last Race: ${d.lastRace}</span>`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");

            circles.transition().duration(100).style("opacity", 0.2);
            d3.select(event.target).transition().duration(100).style("opacity", 0.8);
            circles.filter(c => c.continent === d.continent && c !== d)
                       .transition().duration(100).style("opacity", 0.5);

            // Highlight the corresponding bar
            d3.selectAll("#bar-chart .bar").transition().duration(100).style("opacity", 0.2);
            d3.select(`#bar-chart .bar-${d.continent.replace(/\s+/g, '-')}`).transition().duration(100).style("opacity", 0.8);
            // Highlight the corresponding area
            d3.selectAll("#area-chart .area").transition().duration(100).style("opacity", 0.2);
            d3.select(`#area-chart .area-${d.continent.replace(/\s+/g, '-')}`).transition().duration(100).style("opacity", 0.8);
        })
        .on("mouseout", d => {
            tooltip.transition()
                .duration(100)
                .style("opacity", 0);

            // Reset opacity of bars
            d3.selectAll("#bar-chart .bar, #area-chart .area").transition().duration(100).style("opacity", 0.8);
            circles.transition().duration(100).style("opacity", 0.8);
        });

        // Calculate races per continent
        const racesByContinent = d3.rollup(data, v => d3.sum(v, d => d.races), d => d.continent);
        const continentData = Array.from(racesByContinent, ([continent, races]) => ({ continent, races }));
        
        // Sort the continentData in descending order of races
        continentData.sort((a, b) => b.races - a.races);
        
        // Create the stacked bar chart
        createStackedBarChart(continentData, circles);
        // Create the stacked area chart
        fetchAndProcessAreaChartData(circles);
    });
});

function createStackedBarChart(data, circles) {
    const barChartWidth = bmapWidth,
          barChartHeight = 50;

    const totalRaces = d3.sum(data, d => d.races);

    const x = d3.scaleLinear()
        .domain([0, totalRaces])
        .range([0, barChartWidth]);

    const barSvg = d3.select("#bar-chart").append("svg")
        .attr("width", barChartWidth)
        .attr("height", barChartHeight)
        .append("g");

    let cumulativeWidth = 0;

    barSvg.selectAll(".bar")
        .data(data)
        .enter().append("rect")
        .attr("class", d => `bar bar-${d.continent.replace(/\s+/g, '-')}`)
        .attr("x", (d, i) => {
            const previousWidth = cumulativeWidth;
            cumulativeWidth += x(d.races);
            return previousWidth;
        })
        .attr("y", 0)
        .attr("width", d => x(d.races))
        .attr("height", barChartHeight)
        .attr("fill", d => map_continent_color[d.continent])
        .style("opacity", 0.8)
        .on("mouseover", (event, d) => {
            // Highlight the corresponding circles
            circles.transition().duration(100).style("opacity", 0.2);
            circles.filter(c => c.continent === d.continent)
                   .transition().duration(100).style("opacity", 0.8);

            // Highlight the corresponding bar and label
            barSvg.selectAll(".bar, .label").transition().duration(100).style("opacity", 0.2);
            barSvg.selectAll(`.bar-${d.continent.replace(/\s+/g, '-')}, .label-${d.continent.replace(/\s+/g, '-')}`)
                .transition().duration(100).style("opacity", 1);

            // Highlight the corresponding area
            d3.selectAll("#area-chart .area").transition().duration(100).style("opacity", 0.2);
            d3.selectAll(`#area-chart .area-${d.continent.replace(/\s+/g, '-')}`).transition().duration(100).style("opacity", 0.8);
        })
        .on("mouseout", d => {
            // Reset opacity of circles, bars, labels, and areas
            circles.transition().duration(100).style("opacity", 0.8);
            barSvg.selectAll(".bar, .label, .area").transition().duration(100).style("opacity", 0.8);
            d3.selectAll("#area-chart .area").transition().duration(100).style("opacity", 0.8);
        });

    cumulativeWidth = 0;

    barSvg.selectAll(".label")
        .data(data)
        .enter().append("text")
        .attr("class", d => `label label-${d.continent.replace(/\s+/g, '-')}`)
        .attr("y", barChartHeight / 2)
        .attr("dy", ".35em")
        .html((d, i) => {
            const previousWidth = i === 0 ? 0 : d3.sum(data.slice(0, i), d => x(d.races));
            return `<tspan x="${previousWidth + x(d.races) / 2}" dy="-0.2em" font-size="12px">${d.continent}</tspan>
                    <tspan x="${previousWidth + x(d.races) / 2}" dy="1.1em" font-size="10px">${d.races}</tspan>`;
        })
        .style("fill", "#fff")
        .style("text-anchor", "middle")
        .style("pointer-events", "none"); // Disable hover on labels

    barSvg.append("g")
        .attr("transform", `translate(0,${barChartHeight})`)
        .call(d3.axisBottom(x).ticks(5))
        .selectAll("text")
        .style("fill", "white");

    barSvg.selectAll(".tick line")
        .style("stroke", "white");

    barSvg.selectAll(".domain")
        .style("stroke", "white");
}

function createStackedAreaChart(data, circles) {
    const marginAreaChart = {top: 10, right: 0, bottom: 30, left: 30};
    const widthAreaChart = bmapWidth - marginAreaChart.left - marginAreaChart.right;
    const heightAreaChart = 150 - marginAreaChart.top - marginAreaChart.bottom;

    const areaSvg = d3.select("#area-chart").append("svg")
        .attr("width", widthAreaChart + marginAreaChart.left + marginAreaChart.right)
        .attr("height", heightAreaChart + marginAreaChart.top + marginAreaChart.bottom)
        .append("g")
        .attr("transform", `translate(${marginAreaChart.left},${marginAreaChart.top})`);

    // Define the order of keys
    const orderedKeys = ['Europe', 'North America', 'Asia', 'South America', 'Oceania', 'Africa'];
    const keys = orderedKeys.slice();

    const x = d3.scaleTime()
        .domain(d3.extent(data, d => d.year))
        .range([0, widthAreaChart]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d3.sum(keys, key => +d[key]))])
        .nice()
        .range([heightAreaChart, 0]);

    const color = d3.scaleOrdinal()
        .domain(keys)
        .range(orderedKeys.map(key => map_continent_color[key]));

    const area = d3.area()
        .x(d => x(d.data.year))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]));

    const stack = d3.stack()
        .keys(keys)
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetNone);

    const series = stack(data);

    // Append the areas
    areaSvg.selectAll("path")
        .data(series)
        .enter().append("path")
        .attr("class", d => `area area-${d.key.replace(/\s+/g, '-')}`)
        .attr("d", area)
        .attr("fill", ({ key }) => color(key))
        .style("opacity", 0.8)
        .on("mouseover", (event, d) => {
            const index = series.indexOf(d);
            const continent = orderedKeys[index];
            
            // Highlight the corresponding circles
            circles.transition().duration(100).style("opacity", 0.2);
            circles.filter(c => c.continent === continent)
                   .transition().duration(100).style("opacity", 0.8);
            
            // Highlight the corresponding area
            areaSvg.selectAll(".area").transition().duration(100).style("opacity", 0.2);
            d3.select(event.target).transition().duration(100).style("opacity", 0.8);

            // Highlight the corresponding bar and label
            d3.select("#bar-chart").selectAll(".bar, .label").transition().duration(100).style("opacity", 0.2);
            d3.select("#bar-chart").selectAll(`.bar-${continent.replace(/\s+/g, '-')}, .label-${continent.replace(/\s+/g, '-')}`)
                .transition().duration(100).style("opacity", 0.8);
        })
        .on("mouseout", d => {
            areaSvg.selectAll("path").transition().duration(100).style("opacity", 0.8);
            circles.transition().duration(100).style("opacity", 0.8);
            barSvg.selectAll(".bar, .label").transition().duration(100).style("opacity", 0.8);
        });

    areaSvg.append("g")
        .attr("transform", `translate(0,${heightAreaChart})`)
        .call(d3.axisBottom(x).ticks(5).tickPadding(10))
        .selectAll("text")
        .style("fill", "white"); // Ensure tick labels are white

    areaSvg.append("g")
        .call(d3.axisLeft(y).ticks(5).tickPadding(10))
        .selectAll("text")
        .style("fill", "white"); // Ensure tick labels are white

    // Ensure the color of the ticks
    areaSvg.selectAll(".tick text")
        .style("fill", "white"); // Set the text color to white

    // Customize the axes to only show white lines on the left and bottom
    areaSvg.selectAll(".domain")
        .style("stroke", "none"); // Remove all domain lines

    // Add left axis line manually
    areaSvg.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", 0)
        .attr("y2", heightAreaChart)
        .style("stroke", "white");

    // Add bottom axis line manually
    areaSvg.append("line")
        .attr("x1", 0)
        .attr("y1", heightAreaChart)
        .attr("x2", widthAreaChart)
        .attr("y2", heightAreaChart)
        .style("stroke", "white");
}


// Fetch and process the data for the stacked area chart
function fetchAndProcessAreaChartData(circles) {
    d3.json("data/ts_races_per_continent.json").then(data => {
        data.forEach(d => {
            d.year = new Date(d.year, 0, 1); // Convert year to Date object
            for (const key in d) {
                if (key !== "year") {
                    d[key] = +d[key] || 0; // Convert values to numbers or 0 if null
                }
            }
        });

        // Call the function to create the stacked area chart
        createStackedAreaChart(data, circles);
    });
}