# Plovdiv map data attribution and licenses

Current regional version `82fcfff53ff4b561` includes **40,382** missing footprints from the Bulgarian Agency for Geodesy, Cartography and Cadastre (АГКК) public OpenData archives for two cities and ten surrounding villages, and **214,557** independent Overture/Microsoft ML footprints from release `2026-10-21.0`. The addition of **9,151** disjoint village footprints preserves all earlier OSM, cadastre and Overture objects, rendered dimensions and roads. The regional total is **321,481 buildings and 46,037 road features**. AGKK archive Last-Modified times are 2026-10-15; Overture release time is not imagery acquisition time. Neither source establishes every object's construction date or current physical condition.

Attribution: **© OpenStreetMap contributors · АГКК — отворени кадастрални данни, преобразувани · Overture Maps Foundation / Microsoft ML Buildings**. OSM and Overture-derived portions use ODbL 1.0. AGKK public-data reuse is assessed under the Bulgarian [standard conditions for public-sector information reuse](https://pitay.government.bg/documents/naredba-za-standartnite-usloviya-za-povtorno-izpolzvane-na-informaciya), not an invented archive-specific CC-BY grant. See the bundled `docs/CADASTRE_REUSE_REVIEW_2026-11-05.md` for the primary-source assessment, inference and CRS limitations. No ownership records, personal data or source address fields are in the derived supplement.

The current machine-readable independent source is [supplement-buildings.geojson](./plovdiv-region/82fcfff53ff4b561/supplement-buildings.geojson), with full feature identifiers, per-component dates and upstream source receipts. The current version's `manifest.json` checksums it. Combined reconstruction uses the exact Geofabrik extract plus this accepted-only supplement via `scripts/compose-regional-buildings.py`; `scripts/build-direct-osm-tiles.js` produces MVT. Province clipping, whole-object conflict rejection, at-grade road buffering and explicitly estimated display heights are adaptations. Later current OSM features supersede intersecting supplements. The ten new village archives contain buildings, not a new street or routing dataset.

The current regional roads, street names and building outlines are derived from the [Geofabrik Bulgaria OpenStreetMap extract](https://download.geofabrik.de/europe/bulgaria.html). They are available as machine-readable versioned vector tiles under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/), with **© OpenStreetMap contributors** attribution. The reviewed clip is [OSM relation 1739536](https://www.openstreetmap.org/relation/1739536), packaged as [plovdiv-province.geojson](./plovdiv-province.geojson). The version manifest records the exact extract and its OSM observation clock. `scripts/extract-plovdiv-osm.py` and `scripts/build-direct-osm-tiles.js` reproduce the geometry. Reviewed dimensions may be retained for equivalent current outlines with their original height provenance. In the absence of those dimensions, suitable mapped footprints can receive a bounded visual height estimate based on their area and building type. Feature properties distinguish those values from recorded heights. OpenFreeMap supplies the separate land, water, labels and fallback context.

The public Plovdiv building database and regional building tiles are derived from OpenStreetMap and the Overture Maps Foundation buildings theme. This derived geographic database is made available under the [Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/).

Attribution: **© OpenStreetMap contributors, Overture Maps Foundation**.

The editable source database is [plovdiv-buildings.geojson](./plovdiv-buildings.geojson). It includes original source identifiers, geometry provenance, height provenance and confidence. The bundled build tooling converts those records into regional MVT tiles without changing this database license. Map tiles outside imported city coverage are supplied directly by OpenFreeMap/OpenMapTiles; their source attribution remains visible as well.

The separate derived OSM database [plovdiv-environment.geojson](./plovdiv-environment.geojson) retains actual mapped trees, rows, street objects and ground-area geometry under ODbL 1.0. Its coverage is central Plovdiv and the station corridor, not the entire province. Missing tree/furniture dimensions remain unknown in this database; the renderer uses explicitly cartographic symbols. Park areas do not create invented individual trees. Import provenance and checksums are described in the accompanying environment documentation.

The separate [plovdiv-grade-separated.geojson](./plovdiv-grade-separated.geojson) derives actual motor-road bridge and tunnel centerlines from the existing Plovdiv road import and a fresh OpenStreetMap API export over the central Maritsa crossings. It is supplied under ODbL 1.0 with original way identities, source URLs and checksums. The thirteen bridge decks have **estimated** five-metre visual separation and lane-derived widths; OSM `layer=1` is relative ordering, not a surveyed height. Eight tunnel road segments have no surveyed depth or architectural portals: only their mapped endpoint context is shown. Rendering assumes a thin cartographic slab and bounded grade transitions without inventing bridge piers, towers, railings or tunnel arches. Details and reproducible offline import instructions are in `docs/plovdiv-grade-separated-roads.md`.

The separate [plovdiv-canopy.geojson](./plovdiv-canopy.geojson) adapts positive observations from the [Copernicus Woody Vegetation Layer 2021](https://doi.org/10.2909/7fba3498-71d1-45bc-a76e-0ca4a237b21c), a historical 5 m classified raster. Generated using European Union's Copernicus Land Monitoring Service information (adapted); this application is not endorsed by the European Union. The derived database also uses an OSM/Overture building-footprint mask and is supplied under ODbL 1.0, with the original [CLMS data policy](https://land.copernicus.eu/en/data-policy) and attribution retained. These are generalized observed woody areas, not surveyed tree positions or heights. NoData stays unknown; renderer height is symbolic. The offline source and import provenance are documented in `docs/plovdiv-canopy-data.md`.

Upstream information:

- [OpenStreetMap copyright and ODbL](https://www.openstreetmap.org/copyright)
- [Overture buildings attribution and licenses](https://docs.overturemaps.org/attribution/#buildings)
- [Overture buildings dataset and sources](https://docs.overturemaps.org/guides/buildings/)
- [OpenFreeMap hosting, attribution and free commercial use](https://openfreemap.org/)
- [OpenMapTiles](https://openmaptiles.org/)

The database contains estimated heights as explicitly recorded in each feature. Availability under an open license does not imply that those heights have been surveyed. This notice applies to geographic data; application source code, vehicle models and media retain their own licenses.

The current passenger dataset also includes separately labelled low-confidence
stylized presentation volumes for dimensions missing from the source hierarchy.
They derive from actual Plovdiv height/floor donors, mapped use and footprint
morphology, retain original height/source and donor identities, and are not
surveyed dimensions. Parent footprints partially covered by grounded mapped
building parts are partitioned using the exact source polygons; original parent
outlines remain in the source database. The derived database remains ODbL 1.0.
Method, limitations and reproducibility are in
`docs/unified-passenger-city-materials-2026-10-04.md`.

Some footprints also use adapted **European Union's Copernicus Land Monitoring Service information**, [Urban Atlas Building Block Height 2012 V3](https://doi.org/10.2909/42690e05-edf4-43fc-8020-33e130f62023). This information is available under the [Copernicus full, open and free data policy](https://land.copernicus.eu/en/data-policy). Generated using European Union's Copernicus Land Monitoring Service information (adapted); this application is not endorsed by the European Union.

The public 10 m ImageServer returns **height class intervals**, not individual heights in metres. The offline compiler retains the interval, year, source checksum, coverage and estimated flag, uses a conservative lower bound only where the current footprint has substantial consistent raster overlap, and gives current mapped height/floor evidence priority. NoData, small roofs, sparse/mixed cells and unsupported wide intervals are rejected. Historical 2011–2014 imagery cannot certify today's buildings. Original city GeoTIFF archives and the newer 2021 product require their own documented access; their availability does not imply they were downloaded or imported here.
