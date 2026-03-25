-- Create separate schemas for AVG/WPG data isolation
CREATE SCHEMA IF NOT EXISTS avg;
CREATE SCHEMA IF NOT EXISTS wpg;
CREATE SCHEMA IF NOT EXISTS shared;

-- Grant permissions
GRANT ALL ON SCHEMA avg TO thor;
GRANT ALL ON SCHEMA wpg TO thor;
GRANT ALL ON SCHEMA shared TO thor;
