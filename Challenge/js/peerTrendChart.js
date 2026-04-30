class PeerTrendChart {
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 1040,
            containerHeight: _config.containerHeight || 380,
            margin: _config.margin || { top: 18, right: 36, bottom: 48, left: 72 },
            tooltipPadding: _config.tooltipPadding || 14,
            metric: _config.metric || "renewables_share_energy",
        };
        this.data = _data;
        this.metricConfig = {
            renewables_share_energy: { label: "Renewables share", format: (d) => `${d3.format(".1f")(d)}%` },
            fossil_share_energy: { label: "Fossil share", format: (d) => `${d3.format(".1f")(d)}%` },
            carbon_intensity_elec: { label: "Carbon intensity", format: (d) => `${d3.format(".0f")(d)} gCO2/kWh` },
        };
        this.colorScale = d3
            .scaleOrdinal()
            .domain(["Portugal", "Spain", "France", "Germany", "World"])
            .range(["#d17a22", "#1f6f78", "#6a994e", "#49636a", "#b84a38"]);
        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        vis.svg = d3
            .select(vis.config.parentElement)
            .append("svg")
            .attr("width", vis.config.containerWidth)
            .attr("height", vis.config.containerHeight);

        vis.chart = vis.svg
            .append("g")
            .attr("transform", `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        vis.xScale = d3.scaleLinear().range([0, vis.width]);
        vis.yScale = d3.scaleLinear().range([vis.height, 0]);

        vis.gridGroup = vis.chart.append("g").attr("class", "grid");
        vis.xAxisGroup = vis.chart
            .append("g")
            .attr("class", "x-axis axis")
            .attr("transform", `translate(0,${vis.height})`);
        vis.yAxisGroup = vis.chart.append("g").attr("class", "y-axis axis");

        vis.tooltip = d3.select("#tooltip");
        vis.updateVis();
    }

    updateMetric(metric) {
        this.config.metric = metric;
        this.updateVis();
    }

    updateVis() {
        let vis = this;
        const grouped = d3.groups(vis.data, (d) => d.country);
        const metric = vis.metricConfig[vis.config.metric];

        vis.groupedData = grouped;
        vis.xScale.domain(d3.extent(vis.data, (d) => d.year));
        vis.yScale.domain([0, d3.max(vis.data, (d) => d[vis.config.metric]) * 1.08]);

        vis.gridGroup.call(d3.axisLeft(vis.yScale).ticks(6).tickSize(-vis.width).tickFormat(""));
        vis.xAxisGroup.call(d3.axisBottom(vis.xScale).ticks(6).tickFormat(d3.format("d")));
        vis.yAxisGroup.call(d3.axisLeft(vis.yScale).ticks(6).tickFormat(metric.format));

        const lineGenerator = d3.line()
            .x((d) => vis.xScale(d.year))
            .y((d) => vis.yScale(d[vis.config.metric]))
            .curve(d3.curveMonotoneX);

        const series = vis.chart.selectAll(".peer-series").data(grouped, (d) => d[0]);

        const seriesEnter = series.enter().append("g").attr("class", "peer-series");
        seriesEnter.append("path").attr("class", "peer-line").attr("fill", "none");
        seriesEnter.append("text").attr("class", "legend-label");

        seriesEnter.merge(series).each(function ([country, values]) {
            d3.select(this)
                .select(".peer-line")
                .datum(values)
                .attr("stroke", vis.colorScale(country))
                .attr("class", country === "Portugal" ? "peer-line line-portugal" : "peer-line")
                .transition()
                .duration(700)
                .attr("d", lineGenerator);

            const last = values[values.length - 1];
            d3.select(this)
                .select(".legend-label")
                .attr("x", vis.xScale(last.year) + 8)
                .attr("y", vis.yScale(last[vis.config.metric]) + 4)
                .style("fill", vis.colorScale(country))
                .style("font-weight", country === "Portugal" ? 700 : 500)
                .text(country);
        });

        series.exit().remove();

        const hoverPoints = vis.chart.selectAll(".peer-point").data(vis.data, (d) => `${d.country}-${d.year}`);
        hoverPoints.enter()
            .append("circle")
            .attr("class", "peer-point")
            .attr("r", 4)
            .merge(hoverPoints)
            .attr("cx", (d) => vis.xScale(d.year))
            .attr("cy", (d) => vis.yScale(d[vis.config.metric]))
            .attr("fill", (d) => vis.colorScale(d.country))
            .attr("opacity", 0.01)
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
            .on("mouseleave", () => vis.tooltip.style("display", "none"));
        hoverPoints.exit().remove();
    }
}
