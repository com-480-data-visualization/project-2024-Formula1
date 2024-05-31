function initializeTooltips() {
    const tooltip = d3.select("body").append("div")
        .attr("class", "infoButtons")
        .style("opacity", 0);

    // Apply tooltip behavior to elements with class 'info'
    d3.selectAll('.tooltip_infoButtons')
        .on('mouseover', function(event) {
            const tooltipText = d3.select(this).attr('data-tooltip');
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(tooltipText)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on('mouseout', function() {
            tooltip.transition()
                .duration(200)
                .style("opacity", 0);
        })
        .on('mousemove', function(event) {
            tooltip.style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        });
}
document.addEventListener('DOMContentLoaded', initializeTooltips);
