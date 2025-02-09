DROP TABLE IF EXISTS city_tags, item_tag_goods, item_tags, cities, items, players, player_inventories, transactions, ships, ship_inventories CASCADE;


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
    tags TEXT[] DEFAULT NULL,
    volatility NUMERIC DEFAULT 0.02
);

-- Tags Table
CREATE TABLE city_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    effects JSONB NOT NULL,
    random BOOLEAN DEFAULT FALSE
);

-- Item Tags Table
CREATE TABLE item_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- Item Tag Goods Table
CREATE TABLE item_tag_goods (
    item_tag_id INT REFERENCES item_tags(id) ON DELETE CASCADE,
    good_name VARCHAR(100) NOT NULL,
    PRIMARY KEY (item_tag_id, good_name)
);

CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    gold NUMERIC(10,2) DEFAULT 1000.00 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE player_inventories (
    player_id INT REFERENCES players(id) ON DELETE CASCADE,
    item_name VARCHAR(100) REFERENCES items(name) ON DELETE CASCADE,
    quantity INT DEFAULT 0,
    PRIMARY KEY (player_id, item_name)
);

CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    player_id INT REFERENCES players(id) ON DELETE CASCADE,
    ship_id INT, -- Assuming you have a ships table or will add one
    city_name VARCHAR(100),
    scheduled_date DATE,
    actions JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    needs_return BOOLEAN DEFAULT TRUE
);

CREATE TABLE ships (
    id SERIAL PRIMARY KEY,
    player_id INT REFERENCES players(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    speed NUMERIC(10,2) NOT NULL,
    cargo_space INT NOT NULL,
    attributes JSONB DEFAULT '{}', -- For storing additional attributes like unique abilities
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'ready'
);

CREATE TABLE ship_inventories (
    ship_id INT REFERENCES ships(id) ON DELETE CASCADE,
    item_name VARCHAR(100) REFERENCES items(name) ON DELETE CASCADE,
    quantity INT DEFAULT 0,
    PRIMARY KEY (ship_id, item_name)
);