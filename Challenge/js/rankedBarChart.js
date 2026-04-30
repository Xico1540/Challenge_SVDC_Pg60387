class RankedBarChart {
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 1040,
            containerHeight: _config.containerHeight || 430,
            margin: _config.margin || { top: 12, right: 58, bottom: 36, left: 180 },
            tooltipPadding: _config.tooltipPadding || 14,
            metric: _config.metric || "primary_energy_consumption",
        };
        this.data = _data;
        this.metricConfig = {
            primary_energy_consumption: {
                label: "Primary energy",
                accessor: (d) => d.primary_energy_consumption,
                formatter: (d) => `${d3.format(".3s")(d)} TWh`,
                color: "#1f6f78",
                sort: (a, b) => b.primary_energy_consumption - a.primary_energy_consumption,
            },
            renewables_share_energy: {
                label: "Renewables share",
                accessor: (d) => d.renewables_share_energy,
                formatter: (d) => `${d3.format(".1f")(d)}%`,
                color: "#6a994e",
                sort: (a, b) => b.renewables_share_energy - a.renewables_share_energy,
            },
            carbon_intensity_elec: {
                label: "Carbon intensity",
                accessor: (d) => d.carbon_intensity_elec,
                formatter: (d) => `${d3.format(".0f")(d)} gCO2/kWh`,
                color: "#b84a38",
                sort: (a, b) => a.carbon_intensity_elec - b.carbon_intensity_elec,
            },
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
        vis.yScale = d3.scaleBand().range([0, vis.height]).padding(0.18);

        vis.xAxisGroup = vis.chart
            .append("g")
            .attr("class", "x-axis axis")
            .attr("transform", `translate(0,${vis.height})`);
        vis.yAxisGroup = vis.chart.append("g").attr("class", "y-axis axis");

        vis.axisLabel = vis.chart
            .append("text")
            .attr("class", "axis-label")
            .attr("x", vis.width / 2)
            .attr("y", vis.height + 34)
            .attr("text-anchor", "middle");

        vis.tooltip = d3.select("#tooltip");
        vis.updateVis();
    }

    updateMetric(metric) {
        this.config.metric = metric;
        this.updateVis();
    }

    updateVis() {
        let vis = this;
        const metric = vis.metricConfig[vis.config.metric];
        const filtered = [...vis.data]
            .filter((d) => metric.accessor(d) != null)
            .sort(metric.sort)
            .slice(0, 15);

        vis.displayData = filtered;
        vis.yScale.domain(filtered.map((d) => d.country));
        vis.xScale.domain([0, d3.max(filtered, metric.accessor) * 1.08]);
        vis.axisLabel.text(metric.label);

        const bars = vis.chart.selectAll(".bar").data(filtered, (d) => d.country);

        bars.enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", 0)
            .attr("y", (d) => vis.yScale(d.country))
            .attr("height", vis.yScale.bandwidth())
            .attr("width", 0)
            .merge(bars)
            .on("mouseover", (event, d) => {
                vis.tooltip
                    .style("display", "block")
                    .html(
                        `<div class="tooltip-title">${d.country}</div>` +
                        `<div>${metric.label}: <strong>${metric.formatter(metric.accessor(d))}</strong></div>` +
                        `<div>Renewables: ${d3.format(".1f")(d.renewables_share_energy)}%</div>` +
                        `<div>Carbon intensity: ${d3.format(".0f")(d.carbon_intensity_elec)} gCO2/kWh</div>`
                    );
            })
            .on("mousemove", (event) => {
                vis.tooltip
                    .style("left", `${event.pageX + vis.config.tooltipPadding}px`)
                    .style("top", `${event.pageY + vis.config.tooltipPadding}px`);
            })
            .on("mouseleave", () => vis.tooltip.style("display", "none"))
            .transition()
            .duration(700)
            .attr("y", (d) => vis.yScale(d.country))
            .attr("height", vis.yScale.bandwidth())
            .attr("width", (d) => vis.xScale(metric.accessor(d)))
            .attr("fill", metric.color);

        bars.exit().transition().duration(300).attr("width", 0).remove();

        const labels = vis.chart.selectAll(".bar-value").data(filtered, (d) => d.country);
        labels.enter()
            .append("text")
            .attr("class", "bar-value")
            .attr("fill", "#5f706c")
            .attr("font-size", 11)
            .merge(labels)
            .transition()
            .duration(700)
            .attr("x", (d) => vis.xScale(metric.accessor(d)) + 6)
            .attr("y", (d) => vis.yScale(d.country) + vis.yScale.bandwidth() / 2 + 4)
            .text((d) => metric.formatter(metric.accessor(d)));

        labels.exit().remove();

        vis.xAxisGroup.call(d3.axisBottom(vis.xScale).ticks(6).tickFormat((d) => {
            if (vis.config.metric === "primary_energy_consumption") {
                return d3.format(".2s")(d);
            }
            return d3.format(".0f")(d);
        }));
        vis.yAxisGroup.call(d3.axisLeft(vis.yScale).tickSizeOuter(0));
    }
}
