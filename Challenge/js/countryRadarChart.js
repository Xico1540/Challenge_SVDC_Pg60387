class CountryRadarChart {
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 520,
            containerHeight: _config.containerHeight || 380,
            selectedCountry: _config.selectedCountry || "Portugal",
        };
        this.data = _data;
        this.compareCountries = ["Portugal", "Spain", "France", "Germany"];
        this.axes = [
            { key: "renewables_share_energy", label: "Renewables" },
            { key: "low_carbon_share_energy", label: "Low-carbon" },
            { key: "solar_share_energy", label: "Solar" },
            { key: "wind_share_energy", label: "Wind" },
            { key: "primary_energy_consumption", label: "Energy scale" },
            { key: "carbon_intensity_elec", label: "Carbon" },
        ];
        this.initVis();
    }

    initVis() {
        let vis = this;
        vis.width = vis.config.containerWidth;
        vis.height = vis.config.containerHeight;
        vis.radius = Math.min(vis.width, vis.height) / 2 - 54;

        vis.svg = d3.select(vis.config.parentElement)
            .append("svg")
            .attr("width", vis.width)
            .attr("height", vis.height);

        vis.chart = vis.svg.append("g")
            .attr("transform", `translate(${vis.width / 2 - 74},${vis.height / 2 + 8})`);

        vis.colorScale = d3.scaleOrdinal()
            .domain(vis.compareCountries)
            .range(["#d17a22", "#1f6f78", "#6a994e", "#49636a"]);

        vis.tooltip = d3.select("#tooltip");
        vis.updateCountry(vis.config.selectedCountry);
    }

    updateCountry(country) {
        this.config.selectedCountry = country;
        this.renderVis();
    }

    renderVis() {
        let vis = this;
        const rows = vis.data.filter((d) => vis.compareCountries.includes(d.country));
        const maxByAxis = {};
        vis.axes.forEach((axis) => {
            maxByAxis[axis.key] = d3.max(rows, (d) => d[axis.key]);
        });

        const radialScale = d3.scaleLinear().domain([0, 1]).range([0, vis.radius]);
        const angleSlice = (Math.PI * 2) / vis.axes.length;

        vis.chart.selectAll(".radar-grid-circle").data([0.25, 0.5, 0.75, 1]).join("circle")
            .attr("class", "radar-grid-circle")
            .attr("r", (d) => radialScale(d))
            .attr("fill", "none")
            .attr("stroke", "#d7ddd5");

        vis.chart.selectAll(".radar-axis-line").data(vis.axes).join("line")
            .attr("class", "radar-axis-line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", (d, i) => radialScale(1) * Math.cos(angleSlice * i - Math.PI / 2))
            .attr("y2", (d, i) => radialScale(1) * Math.sin(angleSlice * i - Math.PI / 2))
            .attr("stroke", "#d7ddd5");

        vis.chart.selectAll(".radar-axis-label").data(vis.axes).join("text")
            .attr("class", "legend-label")
            .attr("x", (d, i) => radialScale(1.1) * Math.cos(angleSlice * i - Math.PI / 2))
            .attr("y", (d, i) => radialScale(1.1) * Math.sin(angleSlice * i - Math.PI / 2))
            .attr("text-anchor", "middle")
            .text((d) => d.label);

        const line = d3.lineRadial()
            .radius((d) => radialScale(d.value))
            .angle((d) => d.angle)
            .curve(d3.curveLinearClosed);

        const polygons = rows.map((row) => ({
            country: row.country,
            values: vis.axes.map((axis, index) => ({
                axis: axis.label,
                value: maxByAxis[axis.key] ? row[axis.key] / maxByAxis[axis.key] : 0,
                rawValue: row[axis.key],
                angle: angleSlice * index,
            })),
        }));

        const series = vis.chart.selectAll(".radar-series").data(polygons, (d) => d.country);
        const seriesEnter = series.enter().append("g").attr("class", "radar-series");
        seriesEnter.append("path").attr("class", "radar-shape");

        seriesEnter.merge(series).select(".radar-shape")
            .attr("fill", (d) => vis.colorScale(d.country))
            .attr("fill-opacity", (d) => d.country === vis.config.selectedCountry ? 0.26 : 0.08)
            .attr("stroke", (d) => vis.colorScale(d.country))
            .attr("stroke-width", (d) => d.country === vis.config.selectedCountry ? 3 : 1.5)
            .attr("d", (d) => line(d.values))
            .on("mouseover", (event, d) => {
                vis.tooltip
                    .style("display", "block")
                    .html(`<div class="tooltip-title">${d.country}</div><div>Passa no seletor para fixar destaque.</div>`);
            })
            .on("mousemove", (event) => {
                vis.tooltip
                    .style("left", `${event.pageX + 14}px`)
                    .style("top", `${event.pageY + 14}px`);
            })
            .on("mouseleave", () => vis.tooltip.style("display", "none"));
        series.exit().remove();

        const legend = vis.svg.selectAll(".radar-legend-item").data(polygons, (d) => d.country);
        const legendEnter = legend.enter().append("g").attr("class", "radar-legend-item");
        legendEnter.append("rect").attr("width", 12).attr("height", 12).attr("rx", 2);
        legendEnter.append("text").attr("x", 18).attr("y", 10).attr("class", "legend-label");

        legendEnter.merge(legend)
            .attr("transform", (d, i) => `translate(${vis.width - 150},${34 + i * 22})`);

        legendEnter.merge(legend).select("rect")
            .attr("fill", (d) => vis.colorScale(d.country))
            .attr("opacity", (d) => d.country === vis.config.selectedCountry ? 1 : 0.45);

        legendEnter.merge(legend).select("text")
            .text((d) => d.country)
            .style("font-weight", (d) => d.country === vis.config.selectedCountry ? 700 : 500);
    }
}
