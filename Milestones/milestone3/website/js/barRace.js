const svg = d3.select("#racing-bar-chart");
const margin = {top: 20, right: 0, bottom: 40, left: 10};
const width = +svg.attr("width") - margin.left - margin.right;
const height = +svg.attr("height") - margin.top - margin.bottom;
const gBarChart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

const dataSelect = document.getElementById('data-select');
const metricSelect = document.getElementById('metric-select');

let data, metric, selectedData, years, yearIndex;
let interval;

dataSelect.addEventListener('change', update);
metricSelect.addEventListener('change', update);

function update() {
    selectedData = dataSelect.value;
    metric = metricSelect.value;
    clearInterval(interval);
    fetchData(selectedData).then(fetchedData => {
        data = fetchedData;
        years = [...new Set(data.map(d => d.year))];
        yearIndex = 0;
        resetChart();
        render(data, metric);
    });
}

function fetchData(type) {
    const url = type === 'drivers' ? 'data/rbc_drivers.json' : 'data/rbc_teams.json';
    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error("Network response was not ok " + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            console.log(`${type} data:`, data);
            return data;
        })
        .catch(error => {
            console.error("There was a problem with the fetch operation:", error);
        });
}

function resetChart() {
    gBarChart.selectAll(".bar").remove();
    gBarChart.selectAll(".label").remove();
    gBarChart.selectAll(".name-label").remove();
    gBarChart.selectAll(".year").remove();
    gBarChart.selectAll(".axis").remove(); // Remove axes
}

function render(data, metric) {
    if (!data) return;

    const yearData = data.filter(d => d.year === years[yearIndex] && d[metric] > 0)
        .sort((a, b) => b[metric] - a[metric])
        .slice(0, 10);  // Keep only top 10 for better visualization

    const x = d3.scaleLinear()
        .domain([0, d3.max(yearData, d => d[metric])])
        .range([0, width]);

    const y = d3.scaleBand()
        .domain(yearData.map(d => d.name))
        .range([0, height])
        .padding(0.1);

    const color = d3.scaleOrdinal(d3.schemeCategory10)
        .domain(yearData.map(d => d.name));

    const xAxis = d3.axisTop(x).ticks(width / 100).tickSize(-height).tickPadding(10);

    gBarChart.append("g")
        .attr("class", "axis x-axis")
        .call(xAxis)
        .selectAll("text")
        .style("fill", "#ffffff");

    const bars = gBarChart.selectAll(".bar")
        .data(yearData, d => d.name);

    bars.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("y", d => y(d.name))
        .attr("width", d => x(d[metric]))
        .attr("height", y.bandwidth())
        .attr("fill", d => color(d.name))
        .merge(bars)
        .transition()
        .duration(750)
        .attr("y", d => y(d.name))
        .attr("width", d => x(d[metric]))
        .attr("height", y.bandwidth());

    bars.exit()
        .transition()
        .duration(750)
        .attr("width", 0)
        .remove();

    const labels = gBarChart.selectAll(".label")
        .data(yearData, d => d.name);

    labels.enter()
        .append("text")
        .attr("class", "label")
        .attr("x", d => Math.min(x(d[metric]) - 5, width - 5))
        .attr("y", d => y(d.name) + y.bandwidth() / 2)
        .attr("dy", "0.7em")
        .attr("text-anchor", "end")
        .style("fill", "white")
        .style("font-size", "10px")
        .style("opacity", 0.8)
        .text(d => d[metric])
        .merge(labels)
        .transition()
        .duration(750)
        .attr("x", d => Math.min(x(d[metric]) - 5, width - 5))
        .attr("y", d => y(d.name) + y.bandwidth() / 2)
        .attr("text-anchor", d => (x(d[metric]) - 5 < 50) ? "start" : "end")
        .attr("dx", d => (x(d[metric]) - 5 < 50) ? "5" : "-5")
        .text(d => d[metric]);

    labels.exit()
        .transition()
        .duration(750)
        .attr("x", 0)
        .remove();

    const nameLabels = gBarChart.selectAll(".name-label")
        .data(yearData, d => d.name);

    nameLabels.enter()
        .append("text")
        .attr("class", "name-label")
        .attr("x", d => Math.min(x(d[metric]) - 5, width - 5))
        .attr("y", d => y(d.name) + y.bandwidth() / 2)
        .attr("dy", "-0.3em")
        .attr("text-anchor", "end")
        .style("fill", "white")
        .style("font-size", "12px")
        .text(d => d.name)
        .merge(nameLabels)
        .transition()
        .duration(750)
        .attr("x", d => Math.min(x(d[metric]) - 5, width - 5))
        .attr("y", d => y(d.name) + y.bandwidth() / 2)
        .attr("text-anchor", d => (x(d[metric]) - 5 < 50) ? "start" : "end")
        .attr("dx", d => (x(d[metric]) - 5 < 50) ? "5" : "-5")
        .text(d => d.name);

    nameLabels.exit()
        .transition()
        .duration(750)
        .attr("x", 0)
        .remove();

    const yearLabel = gBarChart.selectAll(".year")
        .data([years[yearIndex]])
        .join("text")
        .attr("class", "year")
        .attr("x", width)
        .attr("y", height - margin.bottom)
        .attr("text-anchor", "end")
        .attr("font-size", "48px")
        .attr("font-weight", "bold")
        .attr("fill", "white")
        .text(d => d);

    function updateChart() {
        yearIndex = (yearIndex + 1) % years.length;

        const yearData = data.filter(d => d.year === years[yearIndex] && d[metric] > 0)
            .sort((a, b) => b[metric] - a[metric])
            .slice(0, 10);

        x.domain([0, d3.max(yearData, d => d[metric])]);
        y.domain(yearData.map(d => d.name));

        gBarChart.select(".x-axis")
            .transition()
            .duration(750)
            .call(xAxis);

        gBarChart.select(".x-axis").selectAll("text").style("fill", "#ffffff");

        const bars = gBarChart.selectAll(".bar")
            .data(yearData, d => d.name);
        
                    // Change gridline color to dark gray
        gBarChart.selectAll(".tick line")
            .attr('class', 'vertical')
            // .style("class", "#333333"); // Set the stroke color to dark gray

        bars.enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", 0)
            .attr("y", d => y(d.name))
            .attr("width", 0)
            .attr("height", y.bandwidth())
            .attr("fill", d => color(d.name))
            .merge(bars)
            .transition()
            .duration(750)
            .attr("y", d => y(d.name))
            .attr("width", d => x(d[metric]))
            .attr("height", y.bandwidth());

        bars.exit()
            .transition()
            .duration(750)
            .attr("width", 0)
            .remove();

        const labels = gBarChart.selectAll(".label")
            .data(yearData, d => d.name);

        labels.enter()
            .append("text")
            .attr("class", "label")
            .attr("x", 0)
            .attr("y", d => y(d.name) + y.bandwidth() / 2)
            .attr("dy", "0.7em")
            .attr("text-anchor", "end")
            .style("fill", "white")
            .style("font-size", "10px")
            .style("opacity", 0.8)
            .text(d => d[metric])
            .merge(labels)
            .transition()
            .duration(750)
            .attr("x", d => Math.min(x(d[metric]) - 5, width - 5))
            .attr("y", d => y(d.name) + y.bandwidth() / 2)
            .attr("text-anchor", d => (x(d[metric]) - 5 < 50) ? "start" : "end")
            .attr("dx", d => (x(d[metric]) - 5 < 50) ? "5" : "-5")
            .text(d => d[metric]);

        labels.exit()
            .transition()
            .duration(750)
            .attr("x", 0)
            .remove();

        const nameLabels = gBarChart.selectAll(".name-label")
            .data(yearData, d => d.name);

        nameLabels.enter()
            .append("text")
            .attr("class", "name-label")
            .attr("x", 0)
            .attr("y", d => y(d.name) + y.bandwidth() / 2)
            .attr("dy", "-0.3em")
            .attr("text-anchor", "end")
            .style("fill", "white")
            .style("font-size", "12px")
            .text(d => d.name)
            .merge(nameLabels)
            .transition()
            .duration(750)
            .attr("x", d => Math.min(x(d[metric]) - 5, width - 5))
            .attr("y", d => y(d.name) + y.bandwidth() / 2)
            .attr("text-anchor", d => (x(d[metric]) - 5 < 50) ? "start" : "end")
            .attr("dx", d => (x(d[metric]) - 5 < 50) ? "5" : "-5")
            .text(d => d.name);

        nameLabels.exit()
            .transition()
            .duration(750)
            .attr("x", 0)
            .remove();

        yearLabel
            .data([years[yearIndex]])
            .join("text")
            .transition()
            .duration(750)
            .attr("x", width)
            .attr("y", height - margin.bottom)
            .attr("text-anchor", "end")
            .attr("font-size", "48px")
            .attr("font-weight", "bold")
            .attr("fill", "white")
            .text(d => d);
    }

    interval = setInterval(updateChart, 1000);
}

update();
