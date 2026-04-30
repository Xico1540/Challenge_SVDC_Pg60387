class WorldTrendChart {
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 1040,
            containerHeight: _config.containerHeight || 360,
            margin: _config.margin || { top: 18, right: 28, bottom: 48, left: 72 },
            tooltipPadding: _config.tooltipPadding || 14,
            metric: _config.metric || "renewables_share_energy",
        };
        this.data = _data;
        this.metricConfig = {
            renewables_share_energy: { label: "Renewables share", color: "#6a994e", format: (d) => `${d3.format(".1f")(d)}%` },
            fossil_share_energy: { label: "Fossil share", color: "#b84a38", format: (d) => `${d3.format(".1f")(d)}%` },
            carbon_intensity_elec: { label: "Carbon intensity", color: "#1f6f78", format: (d) => `${d3.format(".0f")(d)} gCO2/kWh` },
        };
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

        vis.xAxisGroup = vis.chart
            .append("g")
            .attr("class", "x-axis axis")
            .attr("transform", `translate(0,${vis.height})`);

        vis.yAxisGroup = vis.chart.append("g").attr("class", "y-axis axis");
        vis.gridGroup = vis.chart.append("g").attr("class", "grid");

        vis.area = d3.area()
            .x((d) => vis.xScale(d.year))
            .y0(vis.height)
            .y1((d) => vis.yScale(d[vis.config.metric]))
            .curve(d3.curveMonotoneX);

        vis.line = d3.line()
            .x((d) => vis.xScale(d.year))
            .y((d) => vis.yScale(d[vis.config.metric]))
            .curve(d3.curveMonotoneX);

        vis.areaPath = vis.chart.append("path").attr("opacity", 0.18);
        vis.linePath = vis.chart.append("path").attr("fill", "none").attr("stroke-width", 3);

        vis.focusCircle = vis.chart.append("circle").attr("r", 5).attr("stroke", "#fff").attr("stroke-width", 2).style("display", "none");
        vis.focusLine = vis.chart.append("line").attr("stroke", "#9fb0ad").attr("stroke-dasharray", "4 4").style("display", "none");

        vis.tooltip = d3.select("#tooltip");
        vis.bisect = d3.bisector((d) => d.year).left;

        vis.overlay = vis.chart
            .append("rect")
            .attr("width", vis.width)
            .attr("height", vis.height)
            .attr("fill", "transparent")
            .on("mouseenter", () => {
                vis.focusCircle.style("display", "block");
                vis.focusLine.style("display", "block");
            })
            .on("mouseleave", () => {
                vis.focusCircle.style("display", "none");
                vis.focusLine.style("display", "none");
                vis.tooltip.style("display", "none");
            })
            .on("mousemove", function (event) {
                const xValue = vis.xScale.invert(d3.pointer(event, this)[0]);
                const index = vis.bisect(vis.data, xValue, 1);
                const a = vis.data[index - 1];
                const b = vis.data[index];
                const datum = b && xValue - a.year > b.year - xValue ? b : a;
                if (!datum) {
                    return;
                }

                const metric = vis.metricConfig[vis.config.metric];
                const cx = vis.xScale(datum.year);
                const cy = vis.yScale(datum[vis.config.metric]);
                vis.focusCircle.attr("cx", cx).attr("cy", cy).attr("fill", metric.color);
                vis.focusLine.attr("x1", cx).attr("x2", cx).attr("y1", 0).attr("y2", vis.height);
                vis.tooltip
                    .style("display", "block")
                    .style("left", `${event.pageX + vis.config.tooltipPadding}px`)
                    .style("top", `${event.pageY + vis.config.tooltipPadding}px`)
                    .html(
                        `<div class="tooltip-title">${datum.year}</div>` +
                        `<div>${metric.label}: <strong>${metric.format(datum[vis.config.metric])}</strong></div>` +
                        `<div>Primary energy: ${d3.format(".3s")(datum.primary_energy_consumption)} TWh</div>` +
                        `<div>Electricity demand: ${d3.format(".3s")(datum.electricity_demand)} TWh</div>`
                    );
            });

        vis.updateVis();
    }

    updateMetric(metric) {
        this.config.metric = metric;
        this.updateVis();
    }

    updateVis() {
        let vis = this;
        const metric = vis.metricConfig[vis.config.metric];

        vis.xScale.domain(d3.extent(vis.data, (d) => d.year));
        vis.yScale.domain([0, d3.max(vis.data, (d) => d[vis.config.metric]) * 1.08]);

        vis.area.y1((d) => vis.yScale(d[vis.config.metric]));
        vis.line.y((d) => vis.yScale(d[vis.config.metric]));

        vis.gridGroup.call(d3.axisLeft(vis.yScale).ticks(6).tickSize(-vis.width).tickFormat(""));
        vis.xAxisGroup.call(d3.axisBottom(vis.xScale).ticks(6).tickFormat(d3.format("d")));
        vis.yAxisGroup.call(d3.axisLeft(vis.yScale).ticks(6).tickFormat(metric.format));

        vis.areaPath.datum(vis.data).transition().duration(700).attr("d", vis.area).attr("fill", metric.color);
        vis.linePath.datum(vis.data).transition().duration(700).attr("d", vis.line).attr("stroke", metric.color);
    }
}
