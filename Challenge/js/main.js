const formatNumber = (value) => new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(value);
const formatNumberOneDecimal = (value) => new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(value);

let worldTrendChart;
let rankedBarChart;
let scatterplot;
let peerTrendChart;
let donutChart;
let heatmapChart;
let radarChart;
let treemapChart;
let worldMapChart;
let latestCountryMetrics;
let summaryKpis;

Promise.all([
    d3.json("data/summary.json"),
    d3.csv("data/world_energy_mix.csv", d3.autoType),
    d3.csv("data/latest_country_metrics.csv", d3.autoType),
    d3.csv("data/peer_trends.csv", d3.autoType),
    d3.json("data/world_countries.geojson"),
])
    .then(([summary, worldEnergyMix, latestMetrics, peerTrends, worldCountries]) => {
        latestCountryMetrics = latestMetrics;
        summaryKpis = summary.kpis;

        renderHeaderNote(summary.kpis);
        renderKpis(summary.kpis);
        renderQuality(summary.quality);

        worldTrendChart = new WorldTrendChart(
            {
                parentElement: "#world-trend-chart",
                containerWidth: 980,
                margin: { top: 18, right: 28, bottom: 48, left: 108 },
                metric: "renewables_share_energy",
            },
            worldEnergyMix
        );

        rankedBarChart = new RankedBarChart(
            {
                parentElement: "#ranking-chart",
                containerWidth: 760,
                containerHeight: 380,
                margin: { top: 12, right: 52, bottom: 36, left: 156 },
                metric: "primary_energy_consumption",
            },
            latestMetrics
        );

        scatterplot = new CountryScatterplot(
            {
                parentElement: "#scatter-chart",
                containerWidth: 620,
                containerHeight: 380,
                onCountryClick: renderCountryDetail,
            },
            latestMetrics
        );

        peerTrendChart = new PeerTrendChart(
            {
                parentElement: "#peer-chart",
                containerWidth: 960,
                margin: { top: 18, right: 112, bottom: 48, left: 72 },
                metric: "renewables_share_energy",
            },
            peerTrends
        );

        donutChart = new CountryDonutChart(
            {
                parentElement: "#donut-chart",
                containerWidth: 600,
                selectedCountry: "Portugal",
            },
            latestMetrics
        );

        heatmapChart = new PeerHeatmapChart(
            {
                parentElement: "#heatmap-chart",
                containerWidth: 920,
                metric: "renewables_share_energy",
            },
            peerTrends
        );

        radarChart = new CountryRadarChart(
            {
                parentElement: "#radar-chart",
                containerWidth: 620,
                selectedCountry: "Portugal",
            },
            latestMetrics
        );

        treemapChart = new EnergyTreemapChart(
            {
                parentElement: "#treemap-chart",
                onCountryClick: renderTreemapDetail,
            },
            latestMetrics
        );

        worldMapChart = new WorldChoroplethMap(
            {
                parentElement: "#map-chart",
                containerWidth: 760,
                containerHeight: 470,
                metric: "energy_per_capita",
                onCountryClick: renderMapDetail,
            },
            latestMetrics,
            worldCountries
        );

        populateSelects(latestMetrics);
        renderTreemapDetail(latestMetrics.find((d) => d.country === "Portugal") || latestMetrics[0]);

        bindControls();
    })
    .catch((error) => {
        console.error("Error loading challenge data:", error);
    });

function renderHeaderNote(kpis) {
    d3.select("#header-note").html(
        `Último ano no ficheiro: <strong>${kpis.latestYearInFile}</strong>. ` +
        `Último ano comparável completo usado nos gráficos: <strong>${kpis.latestComparableYear}</strong>.`
    );
}

function renderKpis(kpis) {
    const cardsData = [
        {
            label: "Countries in 2024 comparison",
            value: formatNumber(kpis.countriesLatest),
            subvalue: "Países com métricas comparáveis suficientes",
        },
        {
            label: "World renewables share",
            value: `${formatNumberOneDecimal(kpis.worldRenewablesShare)}%`,
            subvalue: `Fossil share: ${formatNumberOneDecimal(kpis.worldFossilShare)}%`,
        },
        {
            label: "World carbon intensity",
            value: `${formatNumber(kpis.worldCarbonIntensity)} gCO2/kWh`,
            subvalue: `Ano de referência: ${kpis.latestComparableYear}`,
        },
        {
            label: "Portugal renewables share",
            value: `${formatNumberOneDecimal(kpis.portugalRenewablesShare)}%`,
            subvalue: `Ganho desde 2000: +${formatNumberOneDecimal(kpis.portugalRenewablesGain)} p.p.`,
        },
        {
            label: "Portugal carbon intensity",
            value: `${formatNumber(kpis.portugalCarbonIntensity)} gCO2/kWh`,
            subvalue: "Quanto menor, melhor",
        },
        {
            label: "Dataset coverage",
            value: `${kpis.yearStart}–${kpis.yearEnd}`,
            subvalue: `${formatNumber(kpis.sourceRows)} linhas analisadas`,
        },
    ];

    const cards = d3.select("#kpi-grid").selectAll(".kpi-card").data(cardsData);
    const enter = cards.enter().append("div").attr("class", "kpi-card");
    enter.append("div").attr("class", "kpi-label");
    enter.append("div").attr("class", "kpi-value");
    enter.append("div").attr("class", "kpi-subvalue");

    enter.merge(cards).select(".kpi-label").text((d) => d.label);
    enter.merge(cards).select(".kpi-value").text((d) => d.value);
    enter.merge(cards).select(".kpi-subvalue").text((d) => d.subvalue);
}

function renderQuality(quality) {
    const cardsData = [
        { label: "Source rows", value: formatNumber(quality.sourceRows) },
        { label: "Rows with ISO code", value: formatNumber(quality.rowsWithIsoCode) },
        { label: "Aggregate rows removed", value: formatNumber(quality.aggregateRowsRemoved) },
        { label: "Legacy entities removed", value: formatNumber(quality.legacyRowsRemoved) },
        { label: "Country rows kept", value: formatNumber(quality.countryRowsKept) },
        { label: "Latest comparable year", value: String(quality.latestComparableYear) },
    ];

    const cards = d3.select("#quality-grid").selectAll(".quality-card").data(cardsData);
    const enter = cards.enter().append("div").attr("class", "quality-card");
    enter.append("div").attr("class", "quality-label");
    enter.append("div").attr("class", "quality-value");

    enter.merge(cards).select(".quality-label").text((d) => d.label);
    enter.merge(cards).select(".quality-value").text((d) => d.value);
}

function bindControls() {
    d3.selectAll(".world-metric").on("click", function () {
        d3.selectAll(".world-metric").classed("active", false);
        d3.select(this).classed("active", true);
        worldTrendChart.updateMetric(d3.select(this).attr("data-metric"));
    });

    d3.selectAll(".ranking-metric").on("click", function () {
        d3.selectAll(".ranking-metric").classed("active", false);
        d3.select(this).classed("active", true);
        rankedBarChart.updateMetric(d3.select(this).attr("data-metric"));
    });

    d3.selectAll(".peer-metric").on("click", function () {
        d3.selectAll(".peer-metric").classed("active", false);
        d3.select(this).classed("active", true);
        peerTrendChart.updateMetric(d3.select(this).attr("data-metric"));
    });

    d3.selectAll(".map-metric").on("click", function () {
        d3.selectAll(".map-metric").classed("active", false);
        d3.select(this).classed("active", true);
        worldMapChart.updateMetric(d3.select(this).attr("data-metric"));
    });

    d3.select("#donut-country-select").on("change", function () {
        donutChart.updateCountry(this.value);
    });

    d3.select("#heatmap-metric-select").on("change", function () {
        heatmapChart.updateMetric(this.value);
    });

    d3.select("#radar-country-select").on("change", function () {
        radarChart.updateCountry(this.value);
    });
}

function renderCountryDetail(country) {
    const deltaRenewables = country.renewables_share_energy - summaryKpis.worldRenewablesShare;
    const deltaCarbon = country.carbon_intensity_elec - summaryKpis.worldCarbonIntensity;

    d3.select("#country-detail").html(
        `<h4>${country.country}</h4>` +
        `<p>${country.year} · ${country.iso_code}</p>` +
        `<div class="detail-grid">` +
        `<div class="detail-metric"><span>Renewables</span><strong>${formatNumberOneDecimal(country.renewables_share_energy)}%</strong></div>` +
        `<div class="detail-metric"><span>Fossil</span><strong>${formatNumberOneDecimal(country.fossil_share_energy)}%</strong></div>` +
        `<div class="detail-metric"><span>Carbon intensity</span><strong>${formatNumber(country.carbon_intensity_elec)} gCO2/kWh</strong></div>` +
        `<div class="detail-metric"><span>Primary energy</span><strong>${d3.format(".3s")(country.primary_energy_consumption)} TWh</strong></div>` +
        `</div>` +
        `<ul>` +
        `<li>Low-carbon share: <strong>${formatNumberOneDecimal(country.low_carbon_share_energy)}%</strong>.</li>` +
        `<li>Solar + wind: <strong>${formatNumberOneDecimal(country.solar_share_energy + country.wind_share_energy)}%</strong> do mix energético.</li>` +
        `<li>Face ao mundo, este país está <strong>${deltaRenewables >= 0 ? "acima" : "abaixo"}</strong> em renováveis por ${formatNumberOneDecimal(Math.abs(deltaRenewables))} p.p.</li>` +
        `<li>Na intensidade carbónica está <strong>${deltaCarbon <= 0 ? "melhor" : "pior"}</strong> do que o valor mundial por ${formatNumber(Math.abs(deltaCarbon))} gCO2/kWh.</li>` +
        `</ul>`
    );
}

function populateSelects(metrics) {
    const highlighted = ["Portugal", "Spain", "France", "Germany", "United States", "China", "Norway", "Brazil"];
    const countries = highlighted.filter((country) => metrics.some((d) => d.country === country));
    const compareCountries = ["Portugal", "Spain", "France", "Germany"].filter((country) => metrics.some((d) => d.country === country));

    d3.select("#donut-country-select")
        .selectAll("option")
        .data(countries)
        .join("option")
        .attr("value", (d) => d)
        .property("selected", (d) => d === "Portugal")
        .text((d) => d);

    d3.select("#radar-country-select")
        .selectAll("option")
        .data(compareCountries)
        .join("option")
        .attr("value", (d) => d)
        .property("selected", (d) => d === "Portugal")
        .text((d) => d);
}

function renderMapDetail(country) {
    const rankByEnergyPerCapita = getMetricRank(country.country, "energy_per_capita");
    const rankByElectricityDemand = getMetricRank(country.country, "electricity_demand");
    const rankByPopulation = getMetricRank(country.country, "population_millions");

    d3.select("#map-detail").html(
        `<h4>${country.country}</h4>` +
        `<p>${country.year} · ${country.iso_code}</p>` +
        `<div class="detail-grid">` +
        `<div class="detail-metric"><span>Energy per capita</span><strong>${formatNumber(country.energy_per_capita)} kWh</strong></div>` +
        `<div class="detail-metric"><span>Electricity demand</span><strong>${d3.format(".3s")(country.electricity_demand)} TWh</strong></div>` +
        `<div class="detail-metric"><span>Population</span><strong>${formatNumberOneDecimal(country.population_millions)} M</strong></div>` +
        `<div class="detail-metric"><span>Primary energy</span><strong>${d3.format(".3s")(country.primary_energy_consumption)} TWh</strong></div>` +
        `</div>` +
        `<ul>` +
        `<li>Posição em consumo energético por habitante: <strong>${rankByEnergyPerCapita} / ${latestCountryMetrics.length}</strong>.</li>` +
        `<li>Posição em procura elétrica absoluta: <strong>${rankByElectricityDemand} / ${latestCountryMetrics.length}</strong>.</li>` +
        `<li>Posição em população no subconjunto comparável: <strong>${rankByPopulation} / ${latestCountryMetrics.length}</strong>.</li>` +
        `<li>Este mapa ajuda a separar países grandes de países intensivos no uso de energia por pessoa.</li>` +
        `</ul>`
    );
}

function getMetricRank(countryName, metric) {
    const ranking = [...latestCountryMetrics]
        .filter((d) => d[metric] != null)
        .sort((a, b) => b[metric] - a[metric]);

    return ranking.findIndex((d) => d.country === countryName) + 1;
}

function renderTreemapDetail(country) {
    d3.select("#treemap-detail").html(
        `<h4>${country.country}</h4>` +
        `<p>${country.year} · ${country.iso_code}</p>` +
        `<div class="detail-grid">` +
        `<div class="detail-metric"><span>Primary energy</span><strong>${d3.format(".3s")(country.primary_energy_consumption)} TWh</strong></div>` +
        `<div class="detail-metric"><span>Electricity demand</span><strong>${d3.format(".3s")(country.electricity_demand)} TWh</strong></div>` +
        `<div class="detail-metric"><span>Renewables</span><strong>${formatNumberOneDecimal(country.renewables_share_energy)}%</strong></div>` +
        `<div class="detail-metric"><span>Carbon</span><strong>${formatNumber(country.carbon_intensity_elec)} gCO2/kWh</strong></div>` +
        `</div>` +
        `<ul>` +
        `<li>Solar share: <strong>${formatNumberOneDecimal(country.solar_share_energy)}%</strong>.</li>` +
        `<li>Wind share: <strong>${formatNumberOneDecimal(country.wind_share_energy)}%</strong>.</li>` +
        `<li>Low-carbon share: <strong>${formatNumberOneDecimal(country.low_carbon_share_energy)}%</strong>.</li>` +
        `</ul>`
    );
}
