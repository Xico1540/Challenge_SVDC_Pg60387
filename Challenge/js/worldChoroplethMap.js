class WorldChoroplethMap {
    constructor(_config, _data, _geoData) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 920,
            containerHeight: _config.containerHeight || 480,
            tooltipPadding: _config.tooltipPadding || 14,
            metric: _config.metric || "energy_per_capita",
            onCountryClick: _config.onCountryClick || (() => {}),
        };
        this.data = _data;
        this.geoData = _geoData;
        this.selectedCountry = "Portugal";
        this.metricMeta = {
            energy_per_capita: {
                label: "Energy per capita",
                unit: " kWh/person",
                format: d3.format(".0f"),
                interpolator: d3.interpolatePuBuGn,
            },
            electricity_demand: {
                label: "Electricity demand",
                unit: " TWh",
                format: d3.format(".0f"),
                interpolator: d3.interpolateYlOrBr,
            },
            population_millions: {
                label: "Population",
                unit: " M",
                format: d3.format(".1f"),
                interpolator: d3.interpolateGnBu,
            },
        };
        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.svg = d3
            .select(vis.config.parentElement)
            .append("svg")
            .attr("width", vis.config.containerWidth)
            .attr("height", vis.config.containerHeight);

        vis.defs = vis.svg.append("defs");
        vis.chart = vis.svg.append("g");
        vis.graticuleGroup = vis.chart.append("path").attr("class", "map-graticule");
        vis.countriesGroup = vis.chart.append("g").attr("class", "map-countries");
        vis.labelsGroup = vis.chart.append("g").attr("class", "map-labels");
        vis.legendGroup = vis.svg.append("g").attr("class", "map-legend");
        vis.tooltip = d3.select("#tooltip");

        vis.geoFeatures = vis.geoData.features.filter((feature) => {
            const isoCode = feature.properties["ISO3166-1-Alpha-3"];
            return isoCode && isoCode !== "ATA";
        });

        vis.countryByIso = new Map(vis.data.map((d) => [d.iso_code, d]));

        vis.projection = d3.geoNaturalEarth1();
        vis.path = d3.geoPath(vis.projection);
        vis.graticule = d3.geoGraticule10();

        vis.updateVis();
    }

    updateMetric(metric) {
        this.config.metric = metric;
        this.updateVis();
    }

    updateVis() {
        let vis = this;
        const metric = vis.config.metric;
        const meta = vis.metricMeta[metric];
        const values = vis.data.map((d) => d[metric]).filter((value) => value != null && !Number.isNaN(value));
        const domain = d3.extent(values);
        const mapBottomMargin = 112;

        vis.colorScale = d3.scaleSequential(meta.interpolator).domain(domain);
        vis.projection.fitExtent(
            [
                [12, 20],
                [vis.config.containerWidth - 12, vis.config.containerHeight - mapBottomMargin],
            ],
            { type: "FeatureCollection", features: vis.geoFeatures }
        );

        vis.graticuleGroup
            .datum(vis.graticule)
            .attr("d", vis.path)
            .attr("fill", "none")
            .attr("stroke", "rgba(95, 112, 108, 0.22)")
            .attr("stroke-width", 0.7);

        const countries = vis.countriesGroup
            .selectAll(".map-country")
            .data(vis.geoFeatures, (d) => d.properties["ISO3166-1-Alpha-3"]);

        countries.enter()
            .append("path")
            .attr("class", "map-country")
            .merge(countries)
            .attr("d", vis.path)
            .attr("fill", (d) => {
                const country = vis.countryByIso.get(d.properties["ISO3166-1-Alpha-3"]);
                return country ? vis.colorScale(country[metric]) : "#d8ddd7";
            })
            .attr("stroke", (d) => {
                const country = vis.countryByIso.get(d.properties["ISO3166-1-Alpha-3"]);
                return country && country.country === vis.selectedCountry ? "#173937" : "rgba(255, 255, 255, 0.85)";
            })
            .attr("stroke-width", (d) => {
                const country = vis.countryByIso.get(d.properties["ISO3166-1-Alpha-3"]);
                return country && country.country === vis.selectedCountry ? 2.4 : 0.9;
            })
            .attr("opacity", (d) => (vis.countryByIso.has(d.properties["ISO3166-1-Alpha-3"]) ? 1 : 0.82))
            .style("cursor", (d) => (vis.countryByIso.has(d.properties["ISO3166-1-Alpha-3"]) ? "pointer" : "default"))
            .on("mouseover", (event, d) => {
                const country = vis.countryByIso.get(d.properties["ISO3166-1-Alpha-3"]);
                const countryName = country ? country.country : d.properties.name;
                const body = country
                    ? `<div>${meta.label}: <strong>${meta.format(country[metric])}${meta.unit}</strong></div>` +
                      `<div>Energy per capita: ${d3.format(".0f")(country.energy_per_capita)} kWh/person</div>` +
                      `<div>Electricity demand: ${d3.format(".3s")(country.electricity_demand)} TWh</div>`
                    : `<div>Sem dados comparáveis em 2024 no subconjunto usado.</div>`;

                vis.tooltip
                    .style("display", "block")
                    .html(`<div class="tooltip-title">${countryName}</div>${body}`);
            })
            .on("mousemove", (event) => {
                vis.tooltip
                    .style("left", `${event.pageX + vis.config.tooltipPadding}px`)
                    .style("top", `${event.pageY + vis.config.tooltipPadding}px`);
            })
            .on("mouseleave", () => vis.tooltip.style("display", "none"))
            .on("click", (event, d) => {
                const country = vis.countryByIso.get(d.properties["ISO3166-1-Alpha-3"]);
                if (!country) {
                    return;
                }
                vis.selectedCountry = country.country;
                vis.config.onCountryClick(country);
                vis.updateVis();
            });

        countries.exit().remove();

        vis.renderLabels();
        vis.renderLegend(domain, meta);

        const initial = vis.data.find((d) => d.country === vis.selectedCountry) || vis.data[0];
        if (initial) {
            vis.config.onCountryClick(initial);
        }
    }

    renderLabels() {
        let vis = this;
        const highlighted = [
            { country: "Portugal", dx: -14, dy: 0, anchor: "end" },
            { country: "Spain", dx: 8, dy: 12, anchor: "start" },
            { country: "France", dx: 0, dy: -12, anchor: "middle" },
            { country: "Germany", dx: 16, dy: -4, anchor: "start" },
            { country: "United States", dx: 0, dy: -12, anchor: "middle" },
            { country: "China", dx: 10, dy: 0, anchor: "start" },
            { country: "Brazil", dx: 10, dy: 12, anchor: "start" },
            { country: "India", dx: 12, dy: 14, anchor: "start" },
        ];

        const annotations = highlighted
            .map((labelConfig) => {
                const datum = vis.data.find((d) => d.country === labelConfig.country);
                if (!datum) {
                    return null;
                }
                const feature = vis.geoFeatures.find((item) => item.properties["ISO3166-1-Alpha-3"] === datum.iso_code);
                if (!feature) {
                    return null;
                }
                const centroid = vis.path.centroid(feature);
                if (Number.isNaN(centroid[0]) || Number.isNaN(centroid[1])) {
                    return null;
                }
                return {
                    ...datum,
                    x: centroid[0] + labelConfig.dx,
                    y: centroid[1] + labelConfig.dy,
                    anchor: labelConfig.anchor,
                };
            })
            .filter(Boolean);

        const labels = vis.labelsGroup.selectAll(".map-label").data(annotations, (d) => d.country);

        labels.enter()
            .append("text")
            .attr("class", "annotation map-label")
            .merge(labels)
            .attr("x", (d) => d.x)
            .attr("y", (d) => d.y)
            .attr("text-anchor", (d) => d.anchor)
            .text((d) => d.country);

        labels.exit().remove();
    }

    renderLegend(domain, meta) {
        let vis = this;
        const legendX = 28;
        const noDataSwatchWidth = 14;
        const noDataGap = 12;
        const noDataLabelGap = 8;
        const noDataLabelWidth = 124;
        const legendWidth = vis.config.containerWidth - legendX * 2 - noDataSwatchWidth - noDataGap - noDataLabelGap - noDataLabelWidth;
        const legendHeight = 12;
        const legendY = vis.config.containerHeight - 46;
        const gradientId = `map-gradient-${vis.config.metric}`;

        vis.defs.selectAll(`#${gradientId}`).remove();

        const gradient = vis.defs
            .append("linearGradient")
            .attr("id", gradientId)
            .attr("x1", "0%")
            .attr("x2", "100%")
            .attr("y1", "0%")
            .attr("y2", "0%");

        d3.range(0, 1.01, 0.1).forEach((step) => {
            gradient.append("stop").attr("offset", `${step * 100}%`).attr("stop-color", vis.colorScale(domain[0] + (domain[1] - domain[0]) * step));
        });

        vis.legendGroup.selectAll("*").remove();

        vis.legendGroup
            .append("text")
            .attr("class", "legend-label")
            .attr("x", legendX)
            .attr("y", legendY - 10)
            .text(`${meta.label} in 2024`);

        vis.legendGroup
            .append("rect")
            .attr("x", legendX)
            .attr("y", legendY)
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .attr("rx", 6)
            .attr("fill", `url(#${gradientId})`);

        const legendScale = d3.scaleLinear().domain(domain).range([legendX, legendX + legendWidth]);
        const legendAxis = d3.axisBottom(legendScale).ticks(4).tickFormat((d) => `${meta.format(d)}${meta.unit}`);

        vis.legendGroup
            .append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0,${legendY + legendHeight})`)
            .call(legendAxis);

        vis.legendGroup
            .append("rect")
            .attr("x", legendX + legendWidth + noDataGap)
            .attr("y", legendY - 1)
            .attr("width", noDataSwatchWidth)
            .attr("height", 14)
            .attr("rx", 4)
            .attr("fill", "#d8ddd7");

        vis.legendGroup
            .append("text")
            .attr("class", "legend-label")
            .attr("x", legendX + legendWidth + noDataGap + noDataSwatchWidth + noDataLabelGap)
            .attr("y", legendY + 11)
            .text("No comparable data");
    }
}
