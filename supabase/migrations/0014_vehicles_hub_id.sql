-- Tag each vehicle to a hub so availability can be scoped per-hub.
ALTER TABLE vehicles ADD COLUMN hub_id int REFERENCES hubs(id);

CREATE INDEX vehicles_hub_id_idx ON vehicles(hub_id) WHERE deleted_at IS NULL;
