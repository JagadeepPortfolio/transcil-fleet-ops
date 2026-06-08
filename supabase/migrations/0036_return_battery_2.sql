-- Dual-battery return verification: capture the second returned battery number
-- on the RETURN activity_log row (mirrors deployments.battery_number_2, 0035).
-- No view recreation needed — activity_log is consumed via aggregates / select *.

ALTER TABLE activity_log ADD COLUMN battery_number_2 text;
