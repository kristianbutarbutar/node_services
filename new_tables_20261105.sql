
-- =========================================================================
-- 1. Create Core Table: t_ec_fin_accounts
-- =========================================================================
CREATE TABLE IF NOT EXISTS t_ec_fin_accounts (
    id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    account_no VARCHAR(100) NOT NULL,
    description1 VARCHAR(200),
    description2 VARCHAR(200),
    account_type VARCHAR(100),
    business_year VARCHAR(100),
    delflag VARCHAR(50) NOT NULL DEFAULT '0',
    createdby VARCHAR(50),
    createddate TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedby VARCHAR(50),
    updateddate TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_t_ec_fin_accounts_account_no ON t_ec_fin_accounts(account_no);
CREATE INDEX IF NOT EXISTS idx_t_ec_fin_accounts_account_type ON t_ec_fin_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_t_ec_fin_accounts_business_year ON t_ec_fin_accounts(business_year);
CREATE INDEX IF NOT EXISTS idx_t_ec_fin_accounts_delflag ON t_ec_fin_accounts(delflag);

-- =========================================================================
-- 2. Register Form in t_form
-- =========================================================================
INSERT INTO t_form (
    id, 
    label, 
    description, 
    tablename, 
    status, 
    delflag, 
    createddate
)
SELECT 
    gen_random_uuid()::text, 
    'Financial Accounts', 
    'Management of financial accounts and business years', 
    't_ec_fin_accounts', 
    'ACTIVE', 
    '0', 
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM t_form WHERE tablename = 't_ec_fin_accounts'
);

-- =========================================================================
-- 3. Register Menu in t_mn (Linking t_mn.formid = t_form.id)
-- =========================================================================
INSERT INTO t_mn (
    id, 
    label, 
    description, 
    status, 
    level, 
    seqno, 
    formid, 
    root_menu
)
SELECT 
    gen_random_uuid()::text, 
    'Financial Accounts', 
    'Management of financial accounts and business years', 
    'ACTIVE', 
    1, 
    10, 
    f.id, 
    'FIN_ROOT'
FROM t_form f
WHERE f.tablename = 't_ec_fin_accounts'
  AND NOT EXISTS (
      SELECT 1 FROM t_mn m WHERE m.formid = f.id
  );

-- =========================================================================
-- 4. Register Columns in t_t_cols_def (Linking pid = t_form.id)
-- =========================================================================
INSERT INTO t_t_cols_def (
    id, 
    pid, 
    label, 
    seq, 
    col_name, 
    dt_type, 
    html_type, 
    visible, 
    isdisabled, 
    isempty
)
SELECT 
    gen_random_uuid()::text,
    f.id,
    v.label,
    v.seq,
    v.col_name,
    v.dt_type,
    v.html_type,
    'YES',
    'NO',
    'NO'
FROM t_form f
CROSS JOIN (VALUES
    ('ID', 1, 'id', 'varchar', 'text'),
    ('Account Number', 2, 'account_no', 'varchar', 'text'),
    ('Description 1', 3, 'description1', 'varchar', 'text'),
    ('Description 2', 4, 'description2', 'varchar', 'text'),
    ('Account Type', 5, 'account_type', 'varchar', 'dropdown'),
    ('Business Year', 6, 'business_year', 'varchar', 'text'),
    ('Delete Flag', 7, 'delflag', 'varchar', 'hidden'),
    ('Created By', 8, 'createdby', 'varchar', 'text'),
    ('Created Date', 9, 'createddate', 'timestamp', 'datetime'),
    ('Updated By', 10, 'updatedby', 'varchar', 'text'),
    ('Updated Date', 11, 'updateddate', 'timestamp', 'datetime')
) AS v(label, seq, col_name, dt_type, html_type)
WHERE f.tablename = 't_ec_fin_accounts'
  AND NOT EXISTS (
      SELECT 1 FROM t_t_cols_def c 
      WHERE c.pid = f.id AND c.col_name = v.col_name
  );

  -- =========================================================================
-- 1. Create Core Table: t_ec_bank_accounts
-- =========================================================================
CREATE TABLE IF NOT EXISTS t_ec_bank_accounts (
    id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    account_no VARCHAR(100) NOT NULL,
    bank_issuer VARCHAR(100),
    branch_location VARCHAR(200),
    document VARCHAR(100),
    description VARCHAR(200),
    status VARCHAR(200) DEFAULT 'ACTIVE',
    account_type VARCHAR(100),
    delflag VARCHAR(50) NOT NULL DEFAULT '0',
    createdby VARCHAR(50),
    createddate TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedby VARCHAR(50),
    updateddate TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_t_ec_bank_accounts_account_no ON t_ec_bank_accounts(account_no);
CREATE INDEX IF NOT EXISTS idx_t_ec_bank_accounts_bank_issuer ON t_ec_bank_accounts(bank_issuer);
CREATE INDEX IF NOT EXISTS idx_t_ec_bank_accounts_status ON t_ec_bank_accounts(status);
CREATE INDEX IF NOT EXISTS idx_t_ec_bank_accounts_delflag ON t_ec_bank_accounts(delflag);

-- =========================================================================
-- 2. Register Form in t_form
-- =========================================================================
INSERT INTO t_form (
    id, 
    label, 
    description, 
    tablename, 
    status, 
    delflag, 
    createddate
)
SELECT 
    gen_random_uuid()::text, 
    'Bank Accounts', 
    'Management of merchant and user bank accounts for settlements', 
    't_ec_bank_accounts', 
    'ACTIVE', 
    '0', 
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM t_form WHERE tablename = 't_ec_bank_accounts'
);

-- =========================================================================
-- 3. Register Menu in t_mn (Linking t_mn.formid = t_form.id)
-- =========================================================================
INSERT INTO t_mn (
    id, 
    label, 
    description, 
    status, 
    level, 
    seqno, 
    formid, 
    root_menu
)
SELECT 
    gen_random_uuid()::text, 
    'Bank Accounts', 
    'Management of merchant and user bank accounts for settlements', 
    'ACTIVE', 
    1, 
    20, 
    f.id, 
    'FIN_ROOT'
FROM t_form f
WHERE f.tablename = 't_ec_bank_accounts'
  AND NOT EXISTS (
      SELECT 1 FROM t_mn m WHERE m.formid = f.id
  );

-- =========================================================================
-- 4. Register Columns in t_t_cols_def (Linking pid = t_form.id)
-- =========================================================================
INSERT INTO t_t_cols_def (
    id, 
    pid, 
    label, 
    seq, 
    col_name, 
    dt_type, 
    html_type, 
    visible, 
    isdisabled, 
    isempty
)
SELECT 
    gen_random_uuid()::text,
    f.id,
    v.label,
    v.seq,
    v.col_name,
    v.dt_type,
    v.html_type,
    'YES',
    'NO',
    'NO'
FROM t_form f
CROSS JOIN (VALUES
    ('ID', 1, 'id', 'varchar', 'text'),
    ('Account Number', 2, 'account_no', 'varchar', 'text'),
    ('Bank Issuer', 3, 'bank_issuer', 'varchar', 'dropdown'),
    ('Branch Location', 4, 'branch_location', 'varchar', 'text'),
    ('Document', 5, 'document', 'varchar', 'file'),
    ('Description', 6, 'description', 'varchar', 'text'),
    ('Status', 7, 'status', 'varchar', 'dropdown'),
    ('Account Type', 8, 'account_type', 'varchar', 'dropdown'),
    ('Delete Flag', 9, 'delflag', 'varchar', 'hidden'),
    ('Created By', 10, 'createdby', 'varchar', 'text'),
    ('Created Date', 11, 'createddate', 'timestamp', 'datetime'),
    ('Updated By', 12, 'updatedby', 'varchar', 'text'),
    ('Updated Date', 13, 'updateddate', 'timestamp', 'datetime')
) AS v(label, seq, col_name, dt_type, html_type)
WHERE f.tablename = 't_ec_bank_accounts'
  AND NOT EXISTS (
      SELECT 1 FROM t_t_cols_def c 
      WHERE c.pid = f.id AND c.col_name = v.col_name
  );

  -- =========================================================================
-- 1. Create Core Table: t_ec_journal
-- =========================================================================
CREATE TABLE IF NOT EXISTS t_ec_journal (
    id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    bank_account_no VARCHAR(100) NOT NULL,
    amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00, -- High-precision numeric storage for IDR currency
    description VARCHAR(200),
    status VARCHAR(200) DEFAULT 'PENDING',
    trxrefno VARCHAR(100) UNIQUE,
    trx_type VARCHAR(100),
    amount_comp_type VARCHAR(100),
    delflag VARCHAR(50) NOT NULL DEFAULT '0',
    createdby VARCHAR(50),
    createddate TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedby VARCHAR(50),
    updateddate TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_t_ec_journal_bank_account_no ON t_ec_journal(bank_account_no);
CREATE INDEX IF NOT EXISTS idx_t_ec_journal_trxrefno ON t_ec_journal(trxrefno);
CREATE INDEX IF NOT EXISTS idx_t_ec_journal_trx_type ON t_ec_journal(trx_type);
CREATE INDEX IF NOT EXISTS idx_t_ec_journal_status ON t_ec_journal(status);
CREATE INDEX IF NOT EXISTS idx_t_ec_journal_delflag ON t_ec_journal(delflag);

-- =========================================================================
-- 2. Register Form in t_form
-- =========================================================================
INSERT INTO t_form (
    id, 
    label, 
    description, 
    tablename, 
    status, 
    delflag, 
    createddate
)
SELECT 
    gen_random_uuid()::text, 
    'Financial Journal', 
    'General ledger and financial transaction journal entries', 
    't_ec_journal', 
    'ACTIVE', 
    '0', 
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM t_form WHERE tablename = 't_ec_journal'
);

-- =========================================================================
-- 3. Register Menu in t_mn (Linking t_mn.formid = t_form.id)
-- =========================================================================
INSERT INTO t_mn (
    id, 
    label, 
    description, 
    status, 
    level, 
    seqno, 
    formid, 
    root_menu
)
SELECT 
    gen_random_uuid()::text, 
    'Financial Journal', 
    'General ledger and financial transaction journal entries', 
    'ACTIVE', 
    1, 
    30, 
    f.id, 
    'FIN_ROOT'
FROM t_form f
WHERE f.tablename = 't_ec_journal'
  AND NOT EXISTS (
      SELECT 1 FROM t_mn m WHERE m.formid = f.id
  );

-- =========================================================================
-- 4. Register Columns in t_t_cols_def (Linking pid = t_form.id)
-- =========================================================================
INSERT INTO t_t_cols_def (
    id, 
    pid, 
    label, 
    seq, 
    col_name, 
    dt_type, 
    html_type, 
    visible, 
    isdisabled, 
    isempty
)
SELECT 
    gen_random_uuid()::text,
    f.id,
    v.label,
    v.seq,
    v.col_name,
    v.dt_type,
    v.html_type,
    'YES',
    'NO',
    'NO'
FROM t_form f
CROSS JOIN (VALUES
    ('ID', 1, 'id', 'varchar', 'text'),
    ('Bank Account No', 2, 'bank_account_no', 'varchar', 'text'),
    ('Amount (IDR)', 3, 'amount', 'numeric', 'number'),
    ('Description', 4, 'description', 'varchar', 'text'),
    ('Status', 5, 'status', 'varchar', 'select'),
    ('Transaction Ref No', 6, 'trxrefno', 'varchar', 'text'),
    ('Transaction Type', 7, 'trx_type', 'varchar', 'dropdown'),
    ('Amount Comp Type', 8, 'amount_comp_type', 'varchar', 'dropdown'),
    ('Delete Flag', 9, 'delflag', 'varchar', 'hidden'),
    ('Created By', 10, 'createdby', 'varchar', 'text'),
    ('Created Date', 11, 'createddate', 'timestamp', 'datetime'),
    ('Updated By', 12, 'updatedby', 'varchar', 'text'),
    ('Updated Date', 13, 'updateddate', 'timestamp', 'datetime')
) AS v(label, seq, col_name, dt_type, html_type)
WHERE f.tablename = 't_ec_journal'
  AND NOT EXISTS (
      SELECT 1 FROM t_t_cols_def c 
      WHERE c.pid = f.id AND c.col_name = v.col_name
  );

update t_t_cols_def set html_type = 'dropdown', ref_col= 't_group.id, t_group.label' where id = '15daa643-266f-4a8f-a64f-f5233f2292f8';


insert into t_t_cols_def
(    id, 
    pid, 
    label, 
    seq, 
    col_name, 
    dt_type, 
    html_type, 
    visible, 
    isdisabled, 
    isempty)
values (gen_random_uuid()::text,'dd005d1a-e29e-434d-9e16-cad323c5ce58','PID', 2, 'pid', 'varchar', 'text', 'YES','NO','NO');




insert into t_t_cols_def
(    id, 
    pid, 
    label, 
    seq, 
    col_name, 
    dt_type, 
    html_type, 
    visible, 
    isdisabled, 
    isempty)
values (gen_random_uuid()::text,'04404e06-edb3-4fa5-b279-811515f57c1d','PID', 2, 'pid', 'varchar', 'text', 'YES','NO','NO');



insert into t_t_cols_def
(    id, 
    pid, 
    label, 
    seq, 
    col_name, 
    dt_type, 
    html_type, 
    visible, 
    isdisabled, 
    isempty)
values (gen_random_uuid()::text,'e79cf820-c58f-48f9-bb8f-082f57da8385','PID', 2, 'pid', 'varchar', 'text', 'YES','NO','NO');
