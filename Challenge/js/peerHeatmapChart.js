class PeerHeatmapChart {
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 520,
            containerHeight: _config.containerHeight || 360,
            margin: _config.margin || { top: 30, right: 24, bottom: 36, left: 76 },
            tooltipPadding: _config.tooltipPadding || 14,
            metric: _config.metric || "renewables_share_energy",
        };
        this.data = _data;
        this.focusCountry = "Portugal";
        this.metricConfig = {
            renewables_share_energy: { label: "Renewables share", interpolator: d3.interpolateYlGn, format: (d) => `${d3.format(".1f")(d)}%` },
            fossil_share_energy: { label: "Fossil share", interpolator: d3.interpolateOrRd, format: (d) => `${d3.format(".1f")(d)}%` },
            carbon_intensity_elec: { label: "Carbon intensity", interpolator: d3.interpolatePuBu, format: (d) => `${d3.format(".0f")(d)} gCO2/kWh` },
        };
        this.initVis();
    }

    initVis() {
        let vis = this;
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        vis.svg = d3.select(vis.config.parentElement)
            .append("svg")
            .attr("width", vis.config.containerWidth)
            .attr("height", vis.config.containerHeight);

        vis.chart = vis.svg.append("g")
            .attr("transform", `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        vis.tooltip = d3.select("#tooltip");
        vis.updateMetric(vis.config.metric);
    }

    updateMetric(metric) {
        this.config.metric = metric;
        this.renderVis();
    }

    renderVis() {
        let vis = this;
        const countries = ["Portugal", "Spain", "France", "Germany", "World"];
        const years = Array.from(new Set(vis.data.map((d) => d.year))).sort((a, b) => a - b);
        const labelYears = years.filter((year, index) => index % 4 === 0 || index === years.length - 1);
        const metric = vis.metricConfig[vis.config.metric];
        const filtered = vis.data.filter((d) => countries.includes(d.country));

        vis.xScale = d3.scaleBand().domain(years).range([0, vis.width]).padding(0.05);
        vis.yScale = d3.scaleBand().domain(countries).range([0, vis.height]).padding(0.08);
        vis.colorScale = d3.scaleSequential(metric.interpolator)
            .domain(d3.extent(filtered, (d) => d[vis.config.metric]));

        const cells = vis.chart.selectAll(".heat-cell").data(filtered, (d) => `${d.country}-${d.year}`);
        cells.enter()
            .append("rect")
            .attr("class", "heat-cell")
            .attr("rx", 4)
            .merge(cells)
            .attr("x", (d) => vis.xScale(d.year))
            .attr("y", (d) => vis.yScale(d.country))
            .attr("width", vis.xScale.bandwidth())
            .attr("height", vis.yScale.bandwidth())
            .attr("fill", (d) => vis.colorScale(d[vis.config.metric]))
            .attr("stroke", (d) => d.country === vis.focusCountry ? "#1f2f2b" : "#fff")
            .attr("stroke-width", (d) => d.country === vis.focusCountry ? 2.2 : 1)
            .on("mouseover", (event, d) => {
                vis.tooltip
                    .style("display", "block")
                    .html(
                        `<div class="tooltip-title">${d.country} · ${d.year}</div>` +
                        `<div>${metric.label}: <strong>${metric.format(d[vis.config.metric])}</strong></div>`
                    );
            })
            .on("mousemove", (event) => {
                vis.tooltip
                    .style("left", `${event.pageX + vis.config.tooltipPadding}px`)
                    .style("top", `${event.pageY + vis.config.tooltipPadding}px`);
            })
            .on("mouseleave", () => vis.tooltip.style("display", "none"))
            .on("click", (event, d) => {
                vis.focusCountry = d.country;
                vis.renderVis();
            });
        cells.exit().remove();

        vis.chart.selectAll(".heatmap-year").data(labelYears, (d) => d)
            .join("text")
            .attr("class", "heatmap-year legend-label")
            .attr("x", (d) => vis.xScale(d) + vis.xScale.bandwidth() / 2)
            .attr("y", -8)
            .attr("text-anchor", "middle")
            .text((d) => d);

        vis.chart.selectAll(".heatmap-row-label").data(countries, (d) => d)
            .join("text")
            .attr("class", "heatmap-row-label legend-label")
            .attr("x", -12)
            .attr("y", (d) => vis.yScale(d) + vis.yScale.bandwidth() / 2 + 4)
            .attr("text-anchor", "end")
            .style("font-weight", (d) => d === vis.focusCountry ? 700 : 500)
            .text((d) => d)
            .on("click", (event, d) => {
                vis.focusCountry = d;
                vis.renderVis();
            });
    }
}
