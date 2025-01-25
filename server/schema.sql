DROP TABLE IF EXISTS city_tags, item_tag_goods, item_tags, cities, items CASCADE;

-- Items Table
CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    base_price NUMERIC NOT NULL,
    components TEXT[] DEFAULT NULL
);

-- Cities Table
CREATE TABLE cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    price_sheet JSONB NOT NULL,
    tags TEXT[] DEFAULT NULL
);

-- Tags Table
CREATE TABLE city_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    effects JSONB NOT NULL
);