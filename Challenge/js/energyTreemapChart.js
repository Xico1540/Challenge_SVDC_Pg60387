class EnergyTreemapChart {
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 700,
            containerHeight: _config.containerHeight || 340,
            tooltipPadding: _config.tooltipPadding || 14,
            onCountryClick: _config.onCountryClick || (() => {}),
        };
        this.data = _data;
        this.selectedCountry = "Portugal";
        this.initVis();
    }

    initVis() {
        let vis = this;
        vis.svg = d3.select(vis.config.parentElement)
            .append("svg")
            .attr("width", vis.config.containerWidth)
            .attr("height", vis.config.containerHeight);

        vis.tooltip = d3.select("#tooltip");
        vis.renderVis();
    }

    renderVis() {
        let vis = this;
        const top = [...vis.data]
            .sort((a, b) => b.primary_energy_consumption - a.primary_energy_consumption)
            .slice(0, 18);

        const root = d3.hierarchy({ children: top }).sum((d) => d.primary_energy_consumption);
        d3.treemap().size([vis.config.containerWidth, vis.config.containerHeight]).padding(4)(root);

        const colorScale = d3.scaleSequential(d3.interpolateYlGnBu)
            .domain(d3.extent(top, (d) => d.renewables_share_energy));

        const nodes = vis.svg.selectAll(".tree-node").data(root.leaves(), (d) => d.data.country);
        const nodeEnter = nodes.enter().append("g").attr("class", "tree-node");
        nodeEnter.append("rect").attr("rx", 10);
        nodeEnter.append("text").attr("class", "legend-label tree-label").attr("x", 10).attr("y", 20);
        nodeEnter.append("text").attr("class", "legend-label tree-value").attr("x", 10).attr("y", 38).attr("font-size", 11);

        nodeEnter.merge(nodes)
            .attr("transform", (d) => `translate(${d.x0},${d.y0})`)
            .on("mouseover", (event, d) => {
                vis.tooltip
                    .style("display", "block")
                    .html(
                        `<div class="tooltip-title">${d.data.country}</div>` +
                        `<div>Primary energy: <strong>${d3.format(".3s")(d.data.primary_energy_consumption)} TWh</strong></div>` +
                        `<div>Renewables: ${d3.format(".1f")(d.data.renewables_share_energy)}%</div>`
                    );
            })
            .on("mousemove", (event) => {
                vis.tooltip
                    .style("left", `${event.pageX + vis.config.tooltipPadding}px`)
                    .style("top", `${event.pageY + vis.config.tooltipPadding}px`);
            })
            .on("mouseleave", () => vis.tooltip.style("display", "none"))
            .on("click", (event, d) => {
                vis.selectedCountry = d.data.country;
                vis.config.onCountryClick(d.data);
                vis.renderVis();
            });

        nodeEnter.merge(nodes).select("rect")
            .attr("width", (d) => Math.max(0, d.x1 - d.x0))
            .attr("height", (d) => Math.max(0, d.y1 - d.y0))
            .attr("fill", (d) => colorScale(d.data.renewables_share_energy))
            .attr("stroke", (d) => d.data.country === vis.selectedCountry ? "#1f2f2b" : "#fff")
            .attr("stroke-width", (d) => d.data.country === vis.selectedCountry ? 2.4 : 1.2);

        nodeEnter.merge(nodes).selectAll("text")
            .attr("display", (d) => (d.x1 - d.x0 > 90 && d.y1 - d.y0 > 42 ? null : "none"));

        nodeEnter.merge(nodes).select(".tree-label")
            .text((d) => d.data.country);

        nodeEnter.merge(nodes).select(".tree-value")
            .text((d) => `${d3.format(".2s")(d.data.primary_energy_consumption)} TWh`);

        nodes.exit().remove();
    }
}
