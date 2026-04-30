class CountryScatterplot {
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 720,
            containerHeight: _config.containerHeight || 380,
            margin: _config.margin || { top: 18, right: 26, bottom: 52, left: 68 },
            tooltipPadding: _config.tooltipPadding || 14,
            onCountryClick: _config.onCountryClick || (() => {}),
        };
        this.data = _data;
        this.selectedCountry = "Portugal";
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
        vis.sizeScale = d3.scaleSqrt().range([4, 20]);
        vis.colorScale = d3.scaleSequential().interpolator(d3.interpolateYlGnBu);

        vis.gridX = vis.chart.append("g").attr("class", "grid");
        vis.gridY = vis.chart.append("g").attr("class", "grid");
        vis.xAxisGroup = vis.chart
            .append("g")
            .attr("class", "x-axis axis")
            .attr("transform", `translate(0,${vis.height})`);
        vis.yAxisGroup = vis.chart.append("g").attr("class", "y-axis axis");

        vis.chart
            .append("text")
            .attr("class", "axis-label")
            .attr("x", vis.width / 2)
            .attr("y", vis.height + 40)
            .attr("text-anchor", "middle")
            .text("Renewables share in primary energy");

        vis.svg
            .append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -(vis.config.margin.top + vis.height / 2))
            .attr("y", 18)
            .text("Carbon intensity of electricity");

        vis.tooltip = d3.select("#tooltip");
        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        vis.xScale.domain([0, d3.max(vis.data, (d) => d.renewables_share_energy) * 1.06]);
        vis.yScale.domain([0, d3.max(vis.data, (d) => d.carbon_intensity_elec) * 1.06]);
        vis.sizeScale.domain(d3.extent(vis.data, (d) => d.primary_energy_consumption));
        vis.colorScale.domain(d3.extent(vis.data, (d) => d.fossil_share_energy));

        vis.gridX.call(d3.axisBottom(vis.xScale).ticks(6).tickSize(vis.height).tickFormat("")).attr("transform", `translate(0,0)`);
        vis.gridY.call(d3.axisLeft(vis.yScale).ticks(6).tickSize(-vis.width).tickFormat(""));
        vis.xAxisGroup.call(d3.axisBottom(vis.xScale).ticks(6).tickFormat((d) => `${d}%`));
        vis.yAxisGroup.call(d3.axisLeft(vis.yScale).ticks(6).tickFormat((d) => `${d3.format(".0f")(d)}`));

        const points = vis.chart.selectAll(".point").data(vis.data, (d) => d.country);

        points.enter()
            .append("circle")
            .attr("class", "point")
            .attr("cx", (d) => vis.xScale(d.renewables_share_energy))
            .attr("cy", vis.height)
            .attr("r", 0)
            .merge(points)
            .on("mouseover", (event, d) => {
                vis.tooltip
                    .style("display", "block")
                    .html(
                        `<div class="tooltip-title">${d.country}</div>` +
                        `<div>Renewables share: <strong>${d3.format(".1f")(d.renewables_share_energy)}%</strong></div>` +
                        `<div>Carbon intensity: ${d3.format(".0f")(d.carbon_intensity_elec)} gCO2/kWh</div>` +
                        `<div>Primary energy: ${d3.format(".3s")(d.primary_energy_consumption)} TWh</div>`
                    );
            })
            .on("mousemove", (event) => {
                vis.tooltip
                    .style("left", `${event.pageX + vis.config.tooltipPadding}px`)
                    .style("top", `${event.pageY + vis.config.tooltipPadding}px`);
            })
            .on("mouseleave", () => vis.tooltip.style("display", "none"))
            .on("click", (event, d) => {
                vis.selectedCountry = d.country;
                vis.config.onCountryClick(d);
                vis.renderLabels();
                vis.updateSelectedStyle();
            })
            .transition()
            .duration(700)
            .attr("cx", (d) => vis.xScale(d.renewables_share_energy))
            .attr("cy", (d) => vis.yScale(d.carbon_intensity_elec))
            .attr("r", (d) => vis.sizeScale(d.primary_energy_consumption))
            .attr("fill", (d) => vis.colorScale(d.fossil_share_energy))
            .attr("opacity", 0.8)
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.2);

        points.exit().transition().duration(300).attr("r", 0).remove();

        vis.renderLabels();
        vis.updateSelectedStyle();
        const initial = vis.data.find((d) => d.country === vis.selectedCountry) || vis.data[0];
        if (initial) {
            vis.config.onCountryClick(initial);
        }
    }

    updateSelectedStyle() {
        let vis = this;
        vis.chart.selectAll(".point")
            .attr("stroke", (d) => (d.country === vis.selectedCountry ? "#1f2f2b" : "#fff"))
            .attr("stroke-width", (d) => (d.country === vis.selectedCountry ? 2.4 : 1.2))
            .attr("opacity", (d) => (d.country === vis.selectedCountry ? 1 : 0.78));
    }

    renderLabels() {
        let vis = this;
        const labelsData = vis.data.filter((d) =>
            ["Portugal", "Spain", "Germany", "France", "United States", "China"].includes(d.country)
        );

        const labels = vis.chart.selectAll(".annotation").data(labelsData, (d) => d.country);
        labels.enter()
            .append("text")
            .attr("class", "annotation")
            .merge(labels)
            .attr("x", (d) => vis.xScale(d.renewables_share_energy) + vis.sizeScale(d.primary_energy_consumption) + 4)
            .attr("y", (d) => vis.yScale(d.carbon_intensity_elec) + 4)
            .text((d) => d.country);
        labels.exit().remove();
    }
}
