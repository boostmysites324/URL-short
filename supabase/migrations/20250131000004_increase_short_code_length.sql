-- Increase short_code length from VARCHAR(10) to VARCHAR(15)
ALTER TABLE public.links 
ALTER COLUMN short_code TYPE VARCHAR(15);

