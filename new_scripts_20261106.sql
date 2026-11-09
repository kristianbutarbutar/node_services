-- Ensure pgcrypto extension is available for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. Create Physical Table: t_user_devices
-- ==========================================
CREATE TABLE t_user_devices (
    id character varying(150) NOT NULL,
    pid character varying(150),
    device_id character varying(250) NOT NULL,
    user_agent character varying(200),
    platform character varying(200),
    hardware_concurrency character varying(200),
    device_memory character varying(200),
    screen_width character varying(200),
    screen_height character varying(200),
    timezone character varying(200),
    createdby character varying(150),
    createddate timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updatedby character varying(150),
    updateddate timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    delflag character varying(50) DEFAULT '0'::character varying,
    CONSTRAINT t_user_devices_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_t_user_devices_pid ON t_user_devices (pid);
CREATE INDEX idx_t_user_devices_delflag ON t_user_devices (delflag);

-- ==========================================
-- 2. Register Form Metadata in t_form
-- ==========================================
INSERT INTO t_form (
    id, pid, label, description, tablename, issql, sqlid, status, createdby, createddate, delflag
) VALUES (
    gen_random_uuid()::text, 
    NULL, 
    'User Devices Registry', 
    'Stores unique device fingerprint profiles and hardware characteristics', 
    't_user_devices', 
    'NO', 
    NULL, 
    'ACTIVE', 
    'SYSTEM', 
    CURRENT_TIMESTAMP, 
    '0'
);

-- ==========================================
-- 3. Register Navigation Node in t_mn & Link to t_form
-- ==========================================
DO $$ 
DECLARE 
    v_form_id text;
    v_menu_id text;
BEGIN
    -- Fetch the newly created form id for t_user_devices
    SELECT id INTO v_form_id FROM t_form WHERE tablename = 't_user_devices' ORDER BY createddate DESC LIMIT 1;
    v_menu_id := gen_random_uuid()::text;

    -- Insert Menu Node referencing formid
    INSERT INTO t_mn (
        id, pid, label, description, status, level, seqno, formid, target_tsx, root_menu, pub_tsx, icon
    ) VALUES (
        v_menu_id, 
        'root', 
        'User Devices', 
        'Manage and audit registered user device fingerprints', 
        'ACTIVE', 
        1, 
        15, 
        v_form_id, 
        'UserDevicesView', 
        'System Management', 
        'UserDevicesView', 
        'device'
    );

    -- ==========================================
    -- 4. Register Column Definitions in t_t_cols_def
    -- ==========================================
    INSERT INTO t_t_cols_def (id, pid, label, seq, col_name, dt_type, html_type, visible, isdisabled, isempty) VALUES
    (gen_random_uuid()::text, v_form_id, 'ID', 1, 'id', 'VARCHAR', 'text', 'YES', 'YES', 'NO'),
    (gen_random_uuid()::text, v_form_id, 'Parent ID', 2, 'pid', 'VARCHAR', 'text', 'NO', 'NO', 'YES'),
    (gen_random_uuid()::text, v_form_id, 'Device ID / Hash', 1, 'device_id', 'VARCHAR', 'text', 'YES', 'YES', 'NO'),
    (gen_random_uuid()::text, v_form_id, 'User Agent', 3, 'user_agent', 'VARCHAR', 'text', 'YES', 'YES', 'NO'),
    (gen_random_uuid()::text, v_form_id, 'Platform', 4, 'platform', 'VARCHAR', 'text', 'YES', 'YES', 'NO'),
    (gen_random_uuid()::text, v_form_id, 'Hardware Concurrency', 5, 'hardware_concurrency', 'VARCHAR', 'number', 'YES', 'YES', 'YES'),
    (gen_random_uuid()::text, v_form_id, 'Device Memory', 6, 'device_memory', 'VARCHAR', 'number', 'YES', 'YES', 'YES'),
    (gen_random_uuid()::text, v_form_id, 'Screen Width', 7, 'screen_width', 'VARCHAR', 'number', 'YES', 'YES', 'YES'),
    (gen_random_uuid()::text, v_form_id, 'Screen Height', 8, 'screen_height', 'VARCHAR', 'number', 'YES', 'YES', 'YES'),
    (gen_random_uuid()::text, v_form_id, 'Timezone', 9, 'timezone', 'VARCHAR', 'text', 'YES', 'YES', 'YES'),
    (gen_random_uuid()::text, v_form_id, 'Created By', 10, 'createdby', 'VARCHAR', 'text', 'NO', 'YES', 'YES'),
    (gen_random_uuid()::text, v_form_id, 'Created Date', 11, 'createddate', 'TIMESTAMP', 'datetime', 'NO', 'YES', 'YES'),
    (gen_random_uuid()::text, v_form_id, 'Updated By', 12, 'updatedby', 'VARCHAR', 'text', 'NO', 'YES', 'YES'),
    (gen_random_uuid()::text, v_form_id, 'Updated Date', 13, 'updateddate', 'TIMESTAMP', 'datetime', 'NO', 'YES', 'YES'),
    (gen_random_uuid()::text, v_form_id, 'Deletion Flag', 14, 'delflag', 'VARCHAR', 'text', 'NO', 'YES', 'YES');

END $$;
