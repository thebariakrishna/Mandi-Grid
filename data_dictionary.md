# Data Dictionary — Mandi-to-Market Supply Chain Optimizer

## 1. Mandi Master (`clean_mandi_master.csv`)

| Column Name | Data Type | Description | Unit / Format | Handling & Cleaning Notes |
|---|---|---|---|---|
| `mandi_id` | Object | Primary identifier for the agricultural yard | Canonical string (`MANDIxxx`) | Zero-padded to 3 digits (e.g., `MANDI026`) |
| `mandi_name` | Object | Commercial name of the agricultural market | Text | Whitespace stripped and trimmed |
| `district` | Object | Administrative district location | Text | Title-cased; missing entries labeled `'Unknown'` |
| `state` | Object | State where the mandi operates | Text | Imputed using district mapping table |
| `mandi_type` | Object | Classification (APMC, Private, Direct) | Text | Standardized casing; missing entries labeled `'Unknown'` |
| `total_area_acres` | Float64 | Physical market area | Acres | Genuine unrecorded values preserved as `NaN` |

---

## 2. Arrivals (`clean_mandi_arrivals.csv`)

| Column Name | Data Type | Constraint | Description | Handling & Cleaning Notes |
|---|---|---|---|---|
| `arrival_id` | Object | Primary Key | Unique transaction record ID | Deduplicated; exact and secondary duplicate IDs removed |
| `date` | Object | Not Null | Date of arrival at the mandi yard | Parsed with `dayfirst=True` to resolve mixed Indian date formats |
| `mandi_id` | Object | Foreign Key | Originating mandi identifier | Regex-padded to canonical `MANDIxxx` to match Mandi Master |
| `crop_name` | Object | Not Null | Standardized canonical English crop name | Normalized via `CROP_MAP` (e.g., *Gehun* / *Kanak* → Wheat) |
| `variety` | Object | Nullable | Seed strain / market grade | Whitespace trimmed; missing varieties preserved as `NaN` |
| `arrival_quantity` | Object | Raw Entry | Original unparsed quantity string | Kept for data provenance and audit trail |
| `unit` | Object | Raw Entry | Original unstandardized unit label | Trimmed and casing normalized (`KG`, `Qtl`, `T`, `MT`) |
| `unit_standardized` | Object | Standardized | Standardized unit token | Identified canonical unit (`qtl`, `kg`, `t`) |
| `arrival_quantity_qtl`| Float64 | >= 0 | Standardized volume in Quintals (1 Qtl = 100 kg) | Converted to metric Quintals via `UNIT_TO_QTL` scaling |
| `farmer_count` | Float64 | >= 0 | Number of participating farmers | Coerced to numeric; missing counts preserved as `NaN` |

---

## 3. Weather Sensors (`weather_cleaned.csv`)

| Column Name | Data Type | Constraint | Description | Transformation & Imputation Logic |
|---|---|---|---|---|
| `sensor_id` | Object | Primary Key | Sensor hardware ID (`SEN001`–`SEN050` + `UNKNOWN`) | Whitespace trimmed; 51 unique sensors mapped |
| `timestamp` | Object | Raw Entry | Raw multi-format timestamp string | Retained for raw data provenance |
| `timestamp_ist` | Object | Not Null | Standardized Indian Standard Time (IST) | Converted across 7 patterns; UTC shifted +5.5 hrs to IST |
| `temperature` | Object | Raw Entry | Original temperature reading string | Extracted numeric values and units via regular expressions |
| `temp_unit` | Object | Raw Entry | Original recorded unit (`°F`, `Celsius`, `f`, `c`) | Mapped to `"C"` or `"F"` |
| `temperature_celsius`| Float64 | [-10.0, 55.0] | Normalized temperature in Degrees Celsius (°C) | Fahrenheit converted via `(°F - 32) * 5/9`; Celsius kept as-is |
| `rainfall` | Float64 | Raw Entry | Original rainfall reading | Raw input containing negative spikes and unit variants |
| `rain_unit` | Object | Raw Entry | Original precipitation unit token | Extracted unit string (`mm`, `in`, `inch`, `MM`) |
| `rain_unit_clean` | Object | Standardized | Canonical unit token (`mm`) | Stripped and lowercased |
| `rainfall_mm` | Float64 | >= 0 | Standardized precipitation in Millimeters (mm) | Inches converted via `× 25.4`; negative sensor glitches set to `NaN` |
| `humidity_percent` | Float64 | [0.0, 100.0] | Relative humidity percentage | Sensor ticks preserved; genuine missing readings kept as `NaN` |
| `district` | Object | Not Null | Geographically mapped district | Mapped by cycling sorted master districts per dataset specification |

---

## 4. Market Price & MSP (`clean_price_msp.json`)

| Column Name | Data Type | Constraint | Description | Transformation & Imputation Logic |
|---|---|---|---|---|
| `record_id` | Object | Primary Key | Unique transaction record identifier | Deduplicated across auction records |
| `date` | Object | Not Null | Trading and price recording date | Standardized from mixed date formats |
| `mandi_id` | Object | Foreign Key | Identifier linking to Mandi Master | Padded to canonical `MANDIxxx` token |
| `district` | Object | Not Null | District where the trading mandi operates | Stripped, title-cased, and cross-referenced with Mandi Master |
| `crop_name` | Object | Not Null | Standardized canonical English crop name | Normalized via `CROP_MAP` |
| `min_price` | Float64 | >= 0 | Lowest recorded auction price (₹/Qtl) | Cleaned of commas and currency symbols (`₹`, `Rs.`); cast to `float64` |
| `max_price` | Float64 | >= 0 | Highest recorded auction price (₹/Qtl) | Currency symbols stripped; cast to `float64` |
| `modal_price` | Float64 | > 0 | Prevailing clearing price (₹/Qtl) | Stripped non-numeric characters; verified > 0 |
| `msp` | Float64 | > 0 | Statutory Minimum Support Price (₹/Qtl) | Aligned against official seasonal government MSP benchmarks |

---

## 5. Transport & Logistics (`clean_transport_logistics.csv`)

| Column Name | Data Type | Constraint | Description | Transformation & Imputation Logic |
|---|---|---|---|---|
| `trip_id` | Object | Primary Key | Unique trip manifest identifier | Verified unique; redundant manifests dropped |
| `mandi_id_clean` | Object | Foreign Key | Originating mandi identifier | Padded to canonical `MANDIxxx` format |
| `destination_warehouse`| Object | Not Null | Receiving storage silo or distribution hub | Casing unified and trailing spaces stripped |
| `departure_time_clean` | Object | Not Null | Departure timestamp from origin mandi | Normalized to standardized datetime format |
| `arrival_time_clean` | Object | Not Null | Arrival timestamp at destination warehouse | Verified that `arrival_time >= departure_time` |
| `transit_hours_final` | Float64 | > 0 | Elapsed transit duration in hours | Derived from timestamps; non-physical negative values dropped |
| `distance_km` | Float64 | > 0 | Route distance in kilometers (km) | Stripped text tokens (e.g., `'km'`), cast to `float64` |
| `vehicle_no_clean` | Object | Not Null | Standardized vehicle registration number | Standardized format and hyphens (e.g., `PB-08-AB-1234`) |
| `driver_id` | Object | Not Null | Assigned commercial driver identifier | Standardized and trimmed string token |

---

## Controlled Vocabularies & Mappings

### A. Commodity Standardization (`CROP_MAP`)

| Canonical Crop | Raw Spelling & Multilingual Variants Resolved |
|---|---|
| **Wheat** | `Wheat`, `WHEAT`, `गेहूं`, `Gehun`, `Kanak`, `gehun`, `kanak` |
| **Rice** | `Rice`, `चावल`, `धान`, `Paddy`, `Basmati`, `chawal`, `dhaan` |
| **Cotton** | `Cotton`, `कपास`, `Kapas`, `Narma`, `kapas`, `narma` |
| **Maize** | `Maize`, `Corn`, `मक्का`, `Makka`, `Makki`, `corn`, `makka` |
| **Mustard** | `Mustard`, `Sarson`, `Sarso`, `सरसों`, `sarson` |
| **Sugarcane** | `Sugarcane`, `गन्ना`, `Ganna`, `Ganne`, `ganna` |

### B. Unit Standardization (`UNIT_TO_QTL`)

* **Target Base Unit:** **Quintal (`Qtl`)** (1 Quintal = 100 kg = 0.1 Metric Tonne)
* `Qtl`, `Quintal`, `q`, `quintals` → Multiplier: `1.0`
* `KG`, `Kgs`, `kilo`, `kgs` → Multiplier: `0.01`
* `T`, `MT`, `Tonne`, `Tonnes` → Multiplier: `10.0`