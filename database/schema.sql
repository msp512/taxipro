CREATE TABLE services (

 id SERIAL PRIMARY KEY,

 taxi_id TEXT,

 origin TEXT,
 destination TEXT,

 distance_km NUMERIC,
 duration_min NUMERIC,

 estimated_price NUMERIC,
 meter_price NUMERIC,

 deviation NUMERIC,

 city TEXT,

 created_at TIMESTAMP DEFAULT NOW()

);