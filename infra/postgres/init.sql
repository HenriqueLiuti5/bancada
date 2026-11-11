CREATE ROLE reparium_app WITH LOGIN PASSWORD 'reparium' CREATEDB;

ALTER SCHEMA public OWNER TO reparium_app;

GRANT ALL PRIVILEGES ON DATABASE reparium TO reparium_app;
