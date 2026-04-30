import csv
import json
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
SOURCE_FILE = BASE_DIR / "owid-energy-data.csv"
DATA_DIR = BASE_DIR / "data"

LEGACY_ENTITIES = {
    "Czechoslovakia",
    "East Germany",
    "Serbia and Montenegro",
}
PEER_COUNTRIES = ["Portugal", "Spain", "France", "Germany", "World"]


def to_float(value):
    if value in ("", None):
        return None
    try:
        return float(value)
    except ValueError:
        return None


def to_int(value):
    number = to_float(value)
    if number is None:
        return None
    return int(number)


def write_csv(path, rows, fieldnames):
    with path.open("w", newline="", encoding="utf-8") as output:
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def parse_rows():
    rows = []
    with SOURCE_FILE.open(encoding="utf-8") as source:
        reader = csv.DictReader(source)
        for row in reader:
            parsed = {
                "country": row["country"],
                "year": to_int(row["year"]),
                "iso_code": row["iso_code"],
                "population": to_float(row["population"]),
                "gdp": to_float(row["gdp"]),
                "primary_energy_consumption": to_float(row["primary_energy_consumption"]),
                "electricity_demand": to_float(row["electricity_demand"]),
                "electricity_generation": to_float(row["electricity_generation"]),
                "energy_per_capita": to_float(row["energy_per_capita"]),
                "renewables_share_energy": to_float(row["renewables_share_energy"]),
                "fossil_share_energy": to_float(row["fossil_share_energy"]),
                "low_carbon_share_energy": to_float(row["low_carbon_share_energy"]),
                "solar_share_energy": to_float(row["solar_share_energy"]),
                "wind_share_energy": to_float(row["wind_share_energy"]),
                "coal_share_energy": to_float(row["coal_share_energy"]),
                "oil_share_energy": to_float(row["oil_share_energy"]),
                "gas_share_energy": to_float(row["gas_share_energy"]),
                "carbon_intensity_elec": to_float(row["carbon_intensity_elec"]),
                "renewables_electricity": to_float(row["renewables_electricity"]),
                "fossil_electricity": to_float(row["fossil_electricity"]),
                "low_carbon_electricity": to_float(row["low_carbon_electricity"]),
            }
            rows.append(parsed)
    return rows


def round_or_none(value, digits=2):
    if value is None:
        return None
    return round(value, digits)


def latest_complete_year(rows):
    world_rows = [row for row in rows if row["country"] == "World"]
    required = (
        "renewables_share_energy",
        "fossil_share_energy",
        "low_carbon_share_energy",
        "carbon_intensity_elec",
        "primary_energy_consumption",
    )
    valid_years = [
        row["year"]
        for row in world_rows
        if all(row[key] is not None for key in required)
    ]
    return max(valid_years)


def is_country_row(row):
    return (
        len(row["iso_code"] or "") == 3
        and row["country"] not in LEGACY_ENTITIES
    )


def main():
    DATA_DIR.mkdir(exist_ok=True)
    rows = parse_rows()

    source_rows = len(rows)
    rows_with_iso = sum(1 for row in rows if row["iso_code"])
    aggregate_rows_removed = sum(1 for row in rows if not row["iso_code"] and row["country"] != "World")
    legacy_rows_removed = sum(1 for row in rows if row["country"] in LEGACY_ENTITIES)

    latest_year_in_file = max(row["year"] for row in rows if row["year"] is not None)
    latest_year_complete = latest_complete_year(rows)

    country_rows = [row for row in rows if is_country_row(row)]
    latest_country_rows = [
        row
        for row in country_rows
        if row["year"] == latest_year_complete
        and row["primary_energy_consumption"] is not None
        and row["renewables_share_energy"] is not None
        and row["carbon_intensity_elec"] is not None
    ]

    world_mix_rows = []
    for row in rows:
        if row["country"] != "World":
            continue
        if row["year"] is None or row["year"] > latest_year_complete:
            continue
        required = [
            row["fossil_share_energy"],
            row["low_carbon_share_energy"],
            row["renewables_share_energy"],
            row["solar_share_energy"],
            row["wind_share_energy"],
            row["primary_energy_consumption"],
            row["electricity_demand"],
            row["carbon_intensity_elec"],
        ]
        if any(value is None for value in required):
            continue
        world_mix_rows.append(
            {
                "year": row["year"],
                "primary_energy_consumption": round_or_none(row["primary_energy_consumption"]),
                "electricity_demand": round_or_none(row["electricity_demand"]),
                "fossil_share_energy": round_or_none(row["fossil_share_energy"]),
                "low_carbon_share_energy": round_or_none(row["low_carbon_share_energy"]),
                "renewables_share_energy": round_or_none(row["renewables_share_energy"]),
                "solar_share_energy": round_or_none(row["solar_share_energy"]),
                "wind_share_energy": round_or_none(row["wind_share_energy"]),
                "carbon_intensity_elec": round_or_none(row["carbon_intensity_elec"]),
            }
        )

    top_energy_countries = sorted(
        latest_country_rows,
        key=lambda row: row["primary_energy_consumption"],
        reverse=True,
    )[:15]

    top_renewable_countries = [
        row
        for row in latest_country_rows
        if row["primary_energy_consumption"] is not None and row["primary_energy_consumption"] >= 100
    ]
    top_renewable_countries = sorted(
        top_renewable_countries,
        key=lambda row: row["renewables_share_energy"],
        reverse=True,
    )[:15]

    lowest_carbon_countries = [
        row
        for row in latest_country_rows
        if row["primary_energy_consumption"] is not None and row["primary_energy_consumption"] >= 100
    ]
    lowest_carbon_countries = sorted(
        lowest_carbon_countries,
        key=lambda row: row["carbon_intensity_elec"],
    )[:15]

    latest_country_metrics = sorted(latest_country_rows, key=lambda row: row["country"])
    latest_country_metrics_rows = []
    for row in latest_country_metrics:
        latest_country_metrics_rows.append(
            {
                "country": row["country"],
                "iso_code": row["iso_code"],
                "year": row["year"],
                "population_millions": round_or_none((row["population"] or 0) / 1_000_000),
                "primary_energy_consumption": round_or_none(row["primary_energy_consumption"]),
                "electricity_demand": round_or_none(row["electricity_demand"]),
                "energy_per_capita": round_or_none(row["energy_per_capita"]),
                "renewables_share_energy": round_or_none(row["renewables_share_energy"]),
                "fossil_share_energy": round_or_none(row["fossil_share_energy"]),
                "low_carbon_share_energy": round_or_none(row["low_carbon_share_energy"]),
                "solar_share_energy": round_or_none(row["solar_share_energy"]),
                "wind_share_energy": round_or_none(row["wind_share_energy"]),
                "carbon_intensity_elec": round_or_none(row["carbon_intensity_elec"]),
            }
        )

    peer_trends = []
    for row in rows:
        if row["country"] not in PEER_COUNTRIES:
            continue
        if row["year"] is None or row["year"] < 2000 or row["year"] > latest_year_complete:
            continue
        required = [
            row["renewables_share_energy"],
            row["fossil_share_energy"],
            row["carbon_intensity_elec"],
            row["electricity_demand"],
        ]
        if any(value is None for value in required):
            continue
        peer_trends.append(
            {
                "country": row["country"],
                "year": row["year"],
                "renewables_share_energy": round_or_none(row["renewables_share_energy"]),
                "fossil_share_energy": round_or_none(row["fossil_share_energy"]),
                "carbon_intensity_elec": round_or_none(row["carbon_intensity_elec"]),
                "electricity_demand": round_or_none(row["electricity_demand"]),
            }
        )

    portugal_2000 = next(
        row for row in rows if row["country"] == "Portugal" and row["year"] == 2000
    )
    portugal_2024 = next(
        row for row in rows if row["country"] == "Portugal" and row["year"] == latest_year_complete
    )
    world_2024 = next(
        row for row in rows if row["country"] == "World" and row["year"] == latest_year_complete
    )

    summary = {
        "kpis": {
            "sourceRows": source_rows,
            "countryRows": len(country_rows),
            "countriesLatest": len(latest_country_rows),
            "yearStart": min(row["year"] for row in rows if row["year"] is not None),
            "yearEnd": latest_year_complete,
            "latestYearInFile": latest_year_in_file,
            "latestComparableYear": latest_year_complete,
            "worldRenewablesShare": round_or_none(world_2024["renewables_share_energy"]),
            "worldFossilShare": round_or_none(world_2024["fossil_share_energy"]),
            "worldCarbonIntensity": round_or_none(world_2024["carbon_intensity_elec"]),
            "portugalRenewablesShare": round_or_none(portugal_2024["renewables_share_energy"]),
            "portugalCarbonIntensity": round_or_none(portugal_2024["carbon_intensity_elec"]),
            "portugalRenewablesGain": round_or_none(
                portugal_2024["renewables_share_energy"] - portugal_2000["renewables_share_energy"]
            ),
        },
        "quality": {
            "sourceRows": source_rows,
            "rowsWithIsoCode": rows_with_iso,
            "aggregateRowsRemoved": aggregate_rows_removed,
            "legacyRowsRemoved": legacy_rows_removed,
            "countryRowsKept": len(country_rows),
            "latestComparableYear": latest_year_complete,
            "latestYearInFile": latest_year_in_file,
        },
    }

    write_csv(
        DATA_DIR / "world_energy_mix.csv",
        world_mix_rows,
        [
            "year",
            "primary_energy_consumption",
            "electricity_demand",
            "fossil_share_energy",
            "low_carbon_share_energy",
            "renewables_share_energy",
            "solar_share_energy",
            "wind_share_energy",
            "carbon_intensity_elec",
        ],
    )

    def serialize_country_rows(country_rows_data):
        return [
            {
                "country": row["country"],
                "iso_code": row["iso_code"],
                "year": row["year"],
                "primary_energy_consumption": round_or_none(row["primary_energy_consumption"]),
                "electricity_demand": round_or_none(row["electricity_demand"]),
                "renewables_share_energy": round_or_none(row["renewables_share_energy"]),
                "fossil_share_energy": round_or_none(row["fossil_share_energy"]),
                "carbon_intensity_elec": round_or_none(row["carbon_intensity_elec"]),
            }
            for row in country_rows_data
        ]

    write_csv(
        DATA_DIR / "top_energy_countries.csv",
        serialize_country_rows(top_energy_countries),
        [
            "country",
            "iso_code",
            "year",
            "primary_energy_consumption",
            "electricity_demand",
            "renewables_share_energy",
            "fossil_share_energy",
            "carbon_intensity_elec",
        ],
    )
    write_csv(
        DATA_DIR / "top_renewable_countries.csv",
        serialize_country_rows(top_renewable_countries),
        [
            "country",
            "iso_code",
            "year",
            "primary_energy_consumption",
            "electricity_demand",
            "renewables_share_energy",
            "fossil_share_energy",
            "carbon_intensity_elec",
        ],
    )
    write_csv(
        DATA_DIR / "lowest_carbon_countries.csv",
        serialize_country_rows(lowest_carbon_countries),
        [
            "country",
            "iso_code",
            "year",
            "primary_energy_consumption",
            "electricity_demand",
            "renewables_share_energy",
            "fossil_share_energy",
            "carbon_intensity_elec",
        ],
    )
    write_csv(
        DATA_DIR / "latest_country_metrics.csv",
        latest_country_metrics_rows,
        [
            "country",
            "iso_code",
            "year",
            "population_millions",
            "primary_energy_consumption",
            "electricity_demand",
            "energy_per_capita",
            "renewables_share_energy",
            "fossil_share_energy",
            "low_carbon_share_energy",
            "solar_share_energy",
            "wind_share_energy",
            "carbon_intensity_elec",
        ],
    )
    write_csv(
        DATA_DIR / "peer_trends.csv",
        peer_trends,
        [
            "country",
            "year",
            "renewables_share_energy",
            "fossil_share_energy",
            "carbon_intensity_elec",
            "electricity_demand",
        ],
    )

    with (DATA_DIR / "summary.json").open("w", encoding="utf-8") as output:
        json.dump(summary, output, indent=2)


if __name__ == "__main__":
    main()
