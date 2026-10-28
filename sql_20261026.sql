CREATE TABLE public.t_ec_products (
    -- Mandatory Standard Columns
    id              VARCHAR(50) NOT NULL,
    pid             VARCHAR(50),
    createdby       VARCHAR(50),
    createddate     TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedby       VARCHAR(50),
    updateddate     TIMESTAMP WITHOUT TIME ZONE,
    delflag         VARCHAR(50) DEFAULT 'NO'::CHARACTER VARYING,

    -- Business / Product Columns
    category        VARCHAR(250),
    name_1          VARCHAR(250),
    name_2          VARCHAR(250),
    stock_qty       INTEGER DEFAULT 0,
    price           MONEY DEFAULT 0,
    sold_qty        INTEGER DEFAULT 0,
    returned_qty    INTEGER DEFAULT 0,
    file            VARCHAR(250),
    love_qty        INTEGER DEFAULT 0,
    share_qty       INTEGER DEFAULT 0,

    -- Primary Key Constraint
    CONSTRAINT t_ec_products_pkey PRIMARY KEY (id)
);

INSERT INTO public.t_form (
    id,
    pid,
    label,
    description,
    tablename,
    issql,
    sqlid,
    status,
    createdby,
    createddate,
    updatedby,
    updateddate,
    delflag,
    orderby,
    groupby,
    filetemplate
) VALUES (
    'f_ec_products',
    'ROOT',
    'E-Commerce Products',
    'Form configuration for E-Commerce Products management',
    't_ec_products',
    'NO',
    NULL,
    'ACTIVE',
    'SYSTEM',
    CURRENT_TIMESTAMP,
    NULL,
    NULL,
    'NO',
    'createddate DESC',
    NULL,
    NULL
);

INSERT INTO public.t_mn (
    id, 
    pid, 
    label, 
    description, 
    status, 
    level, 
    seqno, 
    formid, 
    target_tsx, 
    root_menu, 
    pub_tsx, 
    icon
) VALUES 
(
    gen_random_uuid()::text,
    '',
    'eCommerce Products',
    'Portal Management System',
    'ACTIVE',
    1,
    1,
    'f_ec_products',
    'PortalManagementPanel',
    'PORTAL_ROOT',
    'management',
    'globe'
);

INSERT INTO public.t_t_cols_def (
    id,
    pid,
    label,
    seq,
    col_name,
    dt_type,
    html_type,
    visible,
    ref_col,
    def_val,
    isdisabled,
    isempty,
    dupvalue,
    merge_with_col_name,
    hint,
    validatevalue
) VALUES 
(gen_random_uuid()::text, 'f_ec_products', 'ID',           1,  'id',           'varchar', 'text',     'NO',  NULL, NULL, 'YES', 'NO', NULL, NULL, NULL, NULL),
(gen_random_uuid()::text, 'f_ec_products', 'PID',          2,  'pid',          'varchar', 'text',     'NO',  NULL, NULL, 'YES', 'YES', NULL, NULL, NULL, NULL),
(gen_random_uuid()::text, 'f_ec_products', 'Created By',   3,  'createdby',    'varchar', 'text',     'NO',  NULL, NULL, 'YES', 'YES', NULL, NULL, NULL, NULL),
(gen_random_uuid()::text, 'f_ec_products', 'Created Date', 4,  'createddate',  'timestamp','datetime','NO',  NULL, NULL, 'YES', 'YES', NULL, NULL, NULL, NULL),
(gen_random_uuid()::text, 'f_ec_products', 'Updated By',   5,  'updatedby',    'varchar', 'text',     'NO',  NULL, NULL, 'YES', 'YES', NULL, NULL, NULL, NULL),
(gen_random_uuid()::text, 'f_ec_products', 'Updated Date', 6,  'updateddate',  'timestamp','datetime','NO',  NULL, NULL, 'YES', 'YES', NULL, NULL, NULL, NULL),
(gen_random_uuid()::text, 'f_ec_products', 'Del Flag',     7,  'delflag',      'varchar', 'dropdown',     'NO',  NULL, 'NO', 'YES', 'YES', NULL, NULL, NULL, NULL),
(gen_random_uuid()::text, 'f_ec_products', 'Category',     8,  'category',     'varchar', 'dropdown',   'YES', NULL, NULL, 'NO',  'YES', NULL, NULL, 'Select Category', NULL),
(gen_random_uuid()::text, 'f_ec_products', 'Product Name', 9,  'name_1',       'varchar', 'text',     'YES', NULL, NULL, 'NO',  'NO',  NULL, NULL, 'Primary Product Name', NULL),
(gen_random_uuid()::text, 'f_ec_products', 'Alt Name',     10, 'name_2',       'varchar', 'text',     'YES', NULL, NULL, 'NO',  'YES', NULL, NULL, 'Secondary Product Name', NULL),
(gen_random_uuid()::text, 'f_ec_products', 'Stock Qty',    11, 'stock_qty',    'int',     'number',   'YES', NULL, '0',  'NO',  'NO',  NULL, NULL, 'Available Stock Quantity', NULL),
(gen_random_uuid()::text, 'f_ec_products', 'Price',        12, 'price',        'money',   'number',   'YES', NULL, '0',  'NO',  'NO',  NULL, NULL, 'Unit Price', NULL),
(gen_random_uuid()::text, 'f_ec_products', 'Sold Qty',     13, 'sold_qty',     'int',     'number',   'YES', NULL, '0',  'YES', 'YES', NULL, NULL, 'Total Sold Quantity', NULL),
(gen_random_uuid()::text, 'f_ec_products', 'Returned Qty', 14, 'returned_qty', 'int',     'number',   'YES', NULL, '0',  'YES', 'YES', NULL, NULL, 'Total Returned Quantity', NULL),
(gen_random_uuid()::text, 'f_ec_products', 'Image/File',   15, 'file',         'varchar', 'file',     'YES', NULL, NULL, 'NO',  'YES', NULL, NULL, 'Upload Product Image', NULL),
(gen_random_uuid()::text, 'f_ec_products', 'Love Qty',     16, 'love_qty',     'int',     'number',   'YES', NULL, '0',  'YES', 'YES', NULL, NULL, 'Likes / Favorites', NULL),
(gen_random_uuid()::text, 'f_ec_products', 'Share Qty',    17, 'share_qty',    'int',     'number',   'YES', NULL, '0',  'YES', 'YES', NULL, NULL, 'Total Share Count', NULL);


CREATE TABLE public.t_ec_order (
    -- Mandatory Standard Columns
    id                  VARCHAR(50) NOT NULL,
    pid                 VARCHAR(50),
    createdby           VARCHAR(50),
    createddate         TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedby           VARCHAR(50),
    updateddate         TIMESTAMP WITHOUT TIME ZONE,
    delflag             VARCHAR(50) DEFAULT 'NO'::CHARACTER VARYING,

    -- Business / Order Columns
    order_qty           INTEGER DEFAULT 0,
    voucher_code        VARCHAR(250),
    voucher_ammount     MONEY DEFAULT 0,
    total_price         MONEY DEFAULT 0,
    payment_method      VARCHAR(100),
    payment_status      VARCHAR(50),

    -- Primary Key Constraint
    CONSTRAINT t_ec_order_pkey PRIMARY KEY (id)
);

DO $$ 
DECLARE
    v_form_id VARCHAR(50) := gen_random_uuid()::text;
    v_mn_id   VARCHAR(50) := gen_random_uuid()::text;
BEGIN

    -- 1. Register t_ec_order into t_form
    INSERT INTO public.t_form (
        id,
        pid,
        label,
        description,
        tablename,
        issql,
        sqlid,
        status,
        createdby,
        createddate,
        updatedby,
        updateddate,
        delflag,
        orderby,
        groupby,
        filetemplate
    ) VALUES (
        v_form_id,
        'ROOT',
        'E-Commerce Orders',
        'Form configuration for E-Commerce Order management',
        't_ec_order',
        'NO',
        NULL,
        'ACTIVE',
        'SYSTEM',
        CURRENT_TIMESTAMP,
        NULL,
        NULL,
        'NO',
        'createddate DESC',
        NULL,
        NULL
    );

    -- 2. Register menu in t_mn linking to t_form.id
    INSERT INTO public.t_mn (
        id,
        pid,
        label,
        description,
        status,
        level,
        seqno,
        formid,
        target_tsx,
        root_menu,
        pub_tsx,
        icon
    ) VALUES (
        v_mn_id,
        'ROOT',
        'EC - Orders',
        'E-Commerce Order Management Menu',
        'ACTIVE',
        1,
        4,
        v_form_id, -- FK referencing t_form.id
        'OrderPanel',
        'EC_ORDER_ROOT',
        'order',
        'receipt'
    );

    -- 3. Register all columns of t_ec_order into t_t_cols_def
    INSERT INTO public.t_t_cols_def (
        id,
        pid,
        label,
        seq,
        col_name,
        dt_type,
        html_type,
        visible,
        ref_col,
        def_val,
        isdisabled,
        isempty,
        dupvalue,
        merge_with_col_name,
        hint,
        validatevalue
    ) VALUES 
    -- Mandatory Columns
    (gen_random_uuid()::text, v_form_id, 'ID',             1,  'id',             'varchar',   'text',     'NO',  NULL, NULL, 'YES', 'NO',  NULL, NULL, NULL, NULL),
    (gen_random_uuid()::text, v_form_id, 'PID',            2,  'pid',            'varchar',   'text',     'NO',  NULL, NULL, 'YES', 'YES', NULL, NULL, NULL, NULL),
    (gen_random_uuid()::text, v_form_id, 'Created By',     3,  'createdby',      'varchar',   'text',     'NO',  NULL, NULL, 'YES', 'YES', NULL, NULL, NULL, NULL),
    (gen_random_uuid()::text, v_form_id, 'Created Date',   4,  'createddate',    'timestamp', 'datetime', 'NO',  NULL, NULL, 'YES', 'YES', NULL, NULL, NULL, NULL),
    (gen_random_uuid()::text, v_form_id, 'Updated By',     5,  'updatedby',      'varchar',   'text',     'NO',  NULL, NULL, 'YES', 'YES', NULL, NULL, NULL, NULL),
    (gen_random_uuid()::text, v_form_id, 'Updated Date',   6,  'updateddate',    'timestamp', 'datetime', 'NO',  NULL, NULL, 'YES', 'YES', NULL, NULL, NULL, NULL),
    (gen_random_uuid()::text, v_form_id, 'Del Flag',       7,  'delflag',        'varchar',   'dropdown',     'NO',  NULL, 'NO', 'YES', 'YES', NULL, NULL, NULL, NULL),
    
    -- Business / Order Columns
    (gen_random_uuid()::text, v_form_id, 'Order Qty',      8,  'order_qty',      'int',       'number',   'YES', NULL, '1',  'NO',  'NO',  NULL, NULL, 'Quantity ordered', NULL),
    (gen_random_uuid()::text, v_form_id, 'Voucher Code',   9,  'voucher_code',   'varchar',   'text',     'YES', NULL, NULL, 'NO',  'YES', NULL, NULL, 'Voucher promo code', NULL),
    (gen_random_uuid()::text, v_form_id, 'Voucher Amount', 10, 'voucher_ammount','money',     'number',   'YES', NULL, '0',  'NO',  'YES', NULL, NULL, 'Discount amount', NULL),
    (gen_random_uuid()::text, v_form_id, 'Total Price',    11, 'total_price',    'money',     'number',   'YES', NULL, '0',  'NO',  'NO',  NULL, NULL, 'Grand total price', NULL),
    (gen_random_uuid()::text, v_form_id, 'Payment Method', 12, 'payment_method', 'varchar',   'dropdown',   'YES', NULL, NULL, 'NO',  'YES', NULL, NULL, 'Select payment method', NULL),
    (gen_random_uuid()::text, v_form_id, 'Payment Status', 13, 'payment_status', 'varchar',   'dropdown',   'YES', NULL, 'PENDING','NO','YES', NULL, NULL, 'Order payment status', NULL);

END $$;

-- Enable uuid-ossp extension if not already enabled (for uuid_generate_v4())
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--------------------------------------------------------------------------------
-- 1. CREATE TABLE: t_html_content
--------------------------------------------------------------------------------
CREATE TABLE public.t_html_content (
    id character varying(50) NOT NULL,
    pid character varying(50),
    content character varying(250),
    createdby character varying(50),
    createddate timestamp without time zone,
    updatedby character varying(50),
    updateddate timestamp without time zone,
    CONSTRAINT t_html_content_pkey PRIMARY KEY (id)
);

--------------------------------------------------------------------------------
-- 2. REGISTER INTO t_form AND t_mn USING MATCHING UUID (formid)
--------------------------------------------------------------------------------
DO $$
DECLARE
    v_form_id character varying(50) := uuid_generate_v4()::text;
    v_menu_id character varying(50) := uuid_generate_v4()::text;
BEGIN

    -- Register Form in t_form
    INSERT INTO public.t_form (
        id, pid, label, description, tablename, status, createdby, createddate
    ) VALUES (
        v_form_id,
        'ROOT',
        'HTML Content Form',
        'Form definition for managing HTML Content',
        't_html_content',
        'ACTIVE',
        'SYSTEM',
        NOW()
    );

    -- Register Menu in t_mn (Linking t_mn.formid = t_form.id)
    INSERT INTO public.t_mn (
        id, pid, label, description, status, formid, target_tsx, pub_tsx
    ) VALUES (
        v_menu_id,
        '',
        'HTML Content',
        'Menu entry for HTML Content',
        'ACTIVE',
        v_form_id,
        'HtmlContentPanel',
        'HtmlContentDetail'
    );

    ----------------------------------------------------------------------------
    -- 3. REGISTER ALL COLUMNS INTO t_t_cols_def (t_t_cols_def.pid = t_form.id)
    ----------------------------------------------------------------------------
    
    -- Field: id
    INSERT INTO public.t_t_cols_def (
        id, pid, label, seq, col_name, dt_type, html_type, visible, isdisabled, isempty
    ) VALUES (
        uuid_generate_v4()::text, v_form_id, 'ID', 1, 'id', 'VARCHAR', 'text', 'NO', 'YES', 'NO'
    );

    -- Field: pid
    INSERT INTO public.t_t_cols_def (
        id, pid, label, seq, col_name, dt_type, html_type, visible, isdisabled, isempty
    ) VALUES (
        uuid_generate_v4()::text, v_form_id, 'Parent ID', 2, 'pid', 'VARCHAR', 'text', 'NO', 'NO', 'YES'
    );

    -- Field: content (html_type = "html")
    INSERT INTO public.t_t_cols_def (
        id, pid, label, seq, col_name, dt_type, html_type, visible, isdisabled, isempty
    ) VALUES (
        uuid_generate_v4()::text, v_form_id, 'Content', 3, 'content', 'VARCHAR', 'html', 'YES', 'NO', 'YES'
    );

    -- Audit Field: createdby
    INSERT INTO public.t_t_cols_def (
        id, pid, label, seq, col_name, dt_type, html_type, visible, isdisabled, isempty
    ) VALUES (
        uuid_generate_v4()::text, v_form_id, 'Created By', 4, 'createdby', 'VARCHAR', 'text', 'NO', 'YES', 'YES'
    );

    -- Audit Field: createddate
    INSERT INTO public.t_t_cols_def (
        id, pid, label, seq, col_name, dt_type, html_type, visible, isdisabled, isempty
    ) VALUES (
        uuid_generate_v4()::text, v_form_id, 'Created Date', 5, 'createddate', 'TIMESTAMP', 'datetime', 'NO', 'YES', 'YES'
    );

    -- Audit Field: updatedby
    INSERT INTO public.t_t_cols_def (
        id, pid, label, seq, col_name, dt_type, html_type, visible, isdisabled, isempty
    ) VALUES (
        uuid_generate_v4()::text, v_form_id, 'Updated By', 6, 'updatedby', 'VARCHAR', 'text', 'NO', 'YES', 'YES'
    );

    -- Audit Field: updateddate
    INSERT INTO public.t_t_cols_def (
        id, pid, label, seq, col_name, dt_type, html_type, visible, isdisabled, isempty
    ) VALUES (
        uuid_generate_v4()::text, v_form_id, 'Updated Date', 7, 'updateddate', 'TIMESTAMP', 'datetime', 'NO', 'YES', 'YES'
    );

END $$;

-- Enable uuid-ossp extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--------------------------------------------------------------------------------
-- 1. CREATE TABLE: t_ec_review
--------------------------------------------------------------------------------
CREATE TABLE public.t_ec_review (
    id character varying(50) NOT NULL,
    pid character varying(50),
    review1 character varying(250),
    review2 character varying(250),
    createdby character varying(50),
    createddate timestamp without time zone,
    updatedby character varying(50),
    updateddate timestamp without time zone,
    delflag character varying(50),
    CONSTRAINT t_ec_review_pkey PRIMARY KEY (id)
);

--------------------------------------------------------------------------------
-- 2. REGISTER INTO t_form AND t_mn USING MATCHING UUID (formid)
--------------------------------------------------------------------------------
DO $$
DECLARE
    v_form_id character varying(50) := uuid_generate_v4()::text;
    v_menu_id character varying(50) := uuid_generate_v4()::text;
BEGIN

    -- Register Form in t_form
    INSERT INTO public.t_form (
        id, pid, label, description, tablename, status, createdby, createddate
    ) VALUES (
        v_form_id,
        'ROOT',
        'E-Commerce Review Form',
        'Form definition for managing e-commerce product reviews',
        't_ec_review',
        'ACTIVE',
        'SYSTEM',
        NOW()
    );

    -- Register Menu in t_mn (Linking t_mn.formid = t_form.id)
    INSERT INTO public.t_mn (
        id, pid, label, description, status, formid, target_tsx, pub_tsx
    ) VALUES (
        v_menu_id,
        'ROOT',
        'E-Commerce Review',
        'Menu entry for E-Commerce Reviews',
        'ACTIVE',
        v_form_id,
        'EcReviewPanel',
        'EcReviewDetail'
    );

    ----------------------------------------------------------------------------
    -- 3. REGISTER ALL COLUMNS INTO t_t_cols_def (t_t_cols_def.pid = t_form.id)
    ----------------------------------------------------------------------------
    
    -- Field: id
    INSERT INTO public.t_t_cols_def (
        id, pid, label, seq, col_name, dt_type, html_type, visible, isdisabled, isempty
    ) VALUES (
        uuid_generate_v4()::text, v_form_id, 'ID', 1, 'id', 'VARCHAR', 'text', 'NO', 'YES', 'NO'
    );

    -- Field: pid
    INSERT INTO public.t_t_cols_def (
        id, pid, label, seq, col_name, dt_type, html_type, visible, isdisabled, isempty
    ) VALUES (
        uuid_generate_v4()::text, v_form_id, 'Parent ID', 2, 'pid', 'VARCHAR', 'text', 'NO', 'NO', 'YES'
    );

    -- Field: review1
    INSERT INTO public.t_t_cols_def (
        id, pid, label, seq, col_name, dt_type, html_type, visible, isdisabled, isempty
    ) VALUES (
        uuid_generate_v4()::text, v_form_id, 'Review 1', 3, 'review1', 'VARCHAR', 'text', 'YES', 'NO', 'YES'
    );

    -- Field: review2
    INSERT INTO public.t_t_cols_def (
        id, pid, label, seq, col_name, dt_type, html_type, visible, isdisabled, isempty
    ) VALUES (
        uuid_generate_v4()::text, v_form_id, 'Review 2', 4, 'review2', 'VARCHAR', 'text', 'YES', 'NO', 'YES'
    );

    -- Audit Field: createdby
    INSERT INTO public.t_t_cols_def (
        id, pid, label, seq, col_name, dt_type, html_type, visible, isdisabled, isempty
    ) VALUES (
        uuid_generate_v4()::text, v_form_id, 'Created By', 5, 'createdby', 'VARCHAR', 'text', 'NO', 'YES', 'YES'
    );

    -- Audit Field: createddate
    INSERT INTO public.t_t_cols_def (
        id, pid, label, seq, col_name, dt_type, html_type, visible, isdisabled, isempty
    ) VALUES (
        uuid_generate_v4()::text, v_form_id, 'Created Date', 6, 'createddate', 'TIMESTAMP', 'datetime', 'NO', 'YES', 'YES'
    );

    -- Audit Field: updatedby
    INSERT INTO public.t_t_cols_def (
        id, pid, label, seq, col_name, dt_type, html_type, visible, isdisabled, isempty
    ) VALUES (
        uuid_generate_v4()::text, v_form_id, 'Updated By', 7, 'updatedby', 'VARCHAR', 'text', 'NO', 'YES', 'YES'
    );

    -- Audit Field: updateddate
    INSERT INTO public.t_t_cols_def (
        id, pid, label, seq, col_name, dt_type, html_type, visible, isdisabled, isempty
    ) VALUES (
        uuid_generate_v4()::text, v_form_id, 'Updated Date', 8, 'updateddate', 'TIMESTAMP', 'datetime', 'NO', 'YES', 'YES'
    );

    -- Audit Field: delflag
    INSERT INTO public.t_t_cols_def (
        id, pid, label, seq, col_name, dt_type, html_type, visible, isdisabled, isempty
    ) VALUES (
        uuid_generate_v4()::text, v_form_id, 'Delete Flag', 9, 'delflag', 'VARCHAR', 'text', 'NO', 'YES', 'YES'
    );

END $$;
