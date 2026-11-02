-- Enable pgcrypto extension if not already present for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
    v_form_id UUID := gen_random_uuid();
    v_menu_id UUID := gen_random_uuid();
BEGIN
    -- 1. Create the new t_app_mn table with mandatory and custom columns
    CREATE TABLE IF NOT EXISTS t_app_mn (
        id          VARCHAR(150),
        pid         VARCHAR(150),
        label       VARCHAR(150),
        root_menu   VARCHAR(100),
        group_by    VARCHAR(150),
        createdby   VARCHAR(50) NOT NULL,
        createddate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedby   VARCHAR(50),
        updateddate TIMESTAMP
    );

    -- Create indexing for high-performance retrieval and parent-child tree queries
    CREATE INDEX IF NOT EXISTS idx_t_app_mn_pid ON t_app_mn(pid);
    CREATE INDEX IF NOT EXISTS idx_t_app_mn_root_menu ON t_app_mn(root_menu);

    -- 2. Register the table into t_form
    INSERT INTO t_form (
        id, pid, label, description, tablename, issql, sqlid, status, createdby, createddate, delflag
    ) VALUES (
        v_form_id::text, 
        NULL, 
        'App Menu Management', 
        'Metadata form for t_app_mn application navigation structure', 
        't_app_mn', 
        'NO', 
        NULL, 
        'ACTIVE', 
        'system', 
        CURRENT_TIMESTAMP, 
        '0'
    );

    -- 3. Register into t_mn (Linking t_mn.formid = t_form.id)
    INSERT INTO t_mn (
        id, pid, label, description, status, level, seqno, formid, target_tsx, root_menu, pub_tsx, icon
    ) VALUES (
        v_menu_id::text, 
        'ROOT', 
        'App Menus', 
        'Navigation menu entry for App Menu Management', 
        'ACTIVE', 
        1, 
        20, 
        v_form_id::text, 
        'AppMenuPanel', 
        'main', 
        NULL, 
        'layers'
    );

    -- 4. Register all columns of t_app_mn into t_t_cols_def (Linking t_t_cols_def.pid = t_form.id)
    INSERT INTO t_t_cols_def (id, pid, label, seq, col_name, dt_type, html_type, visible, isdisabled, isempty)
    VALUES 
    (gen_random_uuid()::text, v_form_id::text, 'ID', 1, 'id', 'uuid', 'text', 'YES', 'YES', 'NO'),
    (gen_random_uuid()::text, v_form_id::text, 'Parent ID', 2, 'pid', 'uuid', 'text', 'YES', 'NO', 'YES'),
    (gen_random_uuid()::text, v_form_id::text, 'Label', 3, 'label', 'varchar', 'text', 'YES', 'NO', 'NO'),
    (gen_random_uuid()::text, v_form_id::text, 'Root Menu', 4, 'root_menu', 'varchar', 'dropdown', 'YES', 'NO', 'YES'),
    (gen_random_uuid()::text, v_form_id::text, 'Group By', 5, 'group_by', 'varchar', 'text', 'YES', 'NO', 'YES'),
    (gen_random_uuid()::text, v_form_id::text, 'Created By', 6, 'createdby', 'varchar', 'text', 'YES', 'YES', 'NO'),
    (gen_random_uuid()::text, v_form_id::text, 'Created Date', 7, 'createddate', 'timestamp', 'datetime', 'YES', 'YES', 'NO'),
    (gen_random_uuid()::text, v_form_id::text, 'Updated By', 8, 'updatedby', 'varchar', 'text', 'YES', 'YES', 'YES'),
    (gen_random_uuid()::text, v_form_id::text, 'Updated Date', 9, 'updateddate', 'timestamp', 'datetime', 'YES', 'YES', 'YES');

END $$;

-- Begin atomic transaction for schema and metadata synchronization
BEGIN;

-- 1. Add the seqno column to t_app_mn with a default sequence value
ALTER TABLE IF EXISTS t_app_mn 
ADD COLUMN IF NOT EXISTS seqno INT DEFAULT 0;

-- 2. Create index for high-performance sequence sorting
CREATE INDEX IF NOT EXISTS idx_t_app_mn_seqno ON t_app_mn(seqno);
CREATE INDEX IF NOT EXISTS idx_t_app_mn_root_group_seq ON t_app_mn(root_menu, group_by, seqno);

-- 3. Register the new column into t_t_cols_def for the t_app_mn form metadata
INSERT INTO t_t_cols_def (id, pid, label, seq, col_name, dt_type, html_type, visible, isdisabled, isempty, def_val)
SELECT 
    gen_random_uuid()::text,
    f.id,
    'Sequence Number',
    10,
    'seqno',
    'integer',
    'number',
    'YES',
    'NO',
    'NO',
    '0'
FROM t_form f
WHERE f.tablename = 't_app_mn'
  AND NOT EXISTS (
      SELECT 1 FROM t_t_cols_def c 
      WHERE c.pid = f.id AND c.col_name = 'seqno'
  );

COMMIT;