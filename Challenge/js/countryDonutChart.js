class CountryDonutChart {
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 520,
            containerHeight: _config.containerHeight || 360,
            tooltipPadding: _config.tooltipPadding || 14,
        };
        this.data = _data;
        this.selectedCountry = _config.selectedCountry || "Portugal";
        this.activeSlice = null;
        this.colorScale = d3.scaleOrdinal()
            .domain(["Fossil", "Solar", "Wind", "Other low-carbon"])
            .range(["#b84a38", "#d17a22", "#1f6f78", "#6a994e"]);
        this.initVis();
    }

    initVis() {
        let vis = this;
        vis.width = vis.config.containerWidth;
        vis.height = vis.config.containerHeight;
        vis.radius = Math.min(vis.width, vis.height) / 2 - 36;

        vis.svg = d3.select(vis.config.parentElement)
            .append("svg")
            .attr("width", vis.width)
            .attr("height", vis.height);

        vis.chart = vis.svg.append("g")
            .attr("transform", `translate(${vis.width / 2 - 84},${vis.height / 2})`);

        vis.pie = d3.pie().value((d) => d.value).sort(null);
        vis.arc = d3.arc().innerRadius(vis.radius * 0.56).outerRadius(vis.radius);
        vis.arcExpanded = d3.arc().innerRadius(vis.radius * 0.56).outerRadius(vis.radius + 14);

        vis.centerTitle = vis.chart.append("text")
            .attr("text-anchor", "middle")
            .attr("y", -8)
            .attr("fill", "#5f706c")
            .attr("font-size", 13);

        vis.centerValue = vis.chart.append("text")
            .attr("text-anchor", "middle")
            .attr("y", 18)
            .attr("fill", "#1f2f2b")
            .attr("font-size", 22)
            .attr("font-weight", 700);

        vis.legend = vis.svg.append("g")
            .attr("transform", `translate(${vis.width - 164},42)`);

        vis.tooltip = d3.select("#tooltip");
        vis.updateCountry(vis.selectedCountry);
    }

    updateCountry(countryName) {
        this.selectedCountry = countryName;
        const row = this.data.find((d) => d.country === countryName);
        if (!row) {
            return;
        }
        this.selectedYear = row.year;

        const otherLowCarbon = Math.max(0, row.low_carbon_share_energy - row.solar_share_energy - row.wind_share_energy);
        this.displayData = [
            { label: "Fossil", value: row.fossil_share_energy },
            { label: "Solar", value: row.solar_share_energy },
            { label: "Wind", value: row.wind_share_energy },
            { label: "Other low-carbon", value: otherLowCarbon },
        ].filter((d) => d.value > 0);

        this.activeSlice = this.activeSlice && this.displayData.some((d) => d.label === this.activeSlice) ? this.activeSlice : null;
        this.renderVis();
    }

    renderVis() {
        let vis = this;
        const arcs = vis.pie(vis.displayData);
        const selectedLabel = vis.activeSlice || "Total low-carbon";
        const selectedDatum = vis.displayData.find((d) => d.label === vis.activeSlice);
        const totalLowCarbon = d3.sum(vis.displayData.filter((d) => d.label !== "Fossil"), (d) => d.value);

        const paths = vis.chart.selectAll(".donut-slice").data(arcs, (d) => d.data.label);
        paths.enter()
            .append("path")
            .attr("class", "donut-slice")
            .attr("stroke", "#fff")
            .attr("stroke-width", 2)
            .merge(paths)
            .attr("fill", (d) => vis.colorScale(d.data.label))
            .on("mouseover", (event, d) => {
                vis.tooltip
                    .style("display", "block")
                    .html(
                        `<div class="tooltip-title">${d.data.label}</div>` +
                        `<div>Share: <strong>${d3.format(".1f")(d.data.value)}%</strong></div>` +
                        `<div>${vis.selectedCountry} · ${vis.selectedYear}</div>`
                    );
            })
            .on("mousemove", (event) => {
                vis.tooltip
                    .style("left", `${event.pageX + vis.config.tooltipPadding}px`)
                    .style("top", `${event.pageY + vis.config.tooltipPadding}px`);
            })
            .on("mouseleave", () => vis.tooltip.style("display", "none"))
            .on("click", (event, d) => {
                vis.activeSlice = vis.activeSlice === d.data.label ? null : d.data.label;
                vis.renderVis();
            })
            .transition()
            .duration(650)
            .attr("d", (d) => vis.activeSlice === d.data.label ? vis.arcExpanded(d) : vis.arc(d));
        paths.exit().remove();

        const legendRows = vis.legend.selectAll(".donut-legend-item").data(vis.displayData, (d) => d.label);
        const legendEnter = legendRows.enter().append("g").attr("class", "donut-legend-item");
        legendEnter.append("rect").attr("width", 12).attr("height", 12).attr("rx", 2);
        legendEnter.append("text").attr("x", 18).attr("y", 10).attr("class", "legend-label");

        legendEnter.merge(legendRows)
            .attr("transform", (d, i) => `translate(0,${i * 24})`)
            .on("click", (event, d) => {
                vis.activeSlice = vis.activeSlice === d.label ? null : d.label;
                vis.renderVis();
            });

        legendEnter.merge(legendRows).select("rect")
            .attr("fill", (d) => vis.colorScale(d.label))
            .attr("opacity", (d) => !vis.activeSlice || vis.activeSlice === d.label ? 1 : 0.3);

        legendEnter.merge(legendRows).select("text")
            .text((d) => `${d.label} (${d3.format(".1f")(d.value)}%)`)
            .style("opacity", (d) => !vis.activeSlice || vis.activeSlice === d.label ? 1 : 0.35);

        legendRows.exit().remove();

        vis.centerTitle.text(selectedLabel);
        vis.centerValue.text(`${d3.format(".1f")(selectedDatum ? selectedDatum.value : totalLowCarbon)}%`);
    }
}
