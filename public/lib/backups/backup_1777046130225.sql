--
-- PostgreSQL database dump
--

\restrict IA4SbpotAkMFVxA07dqWsRFaWcasqkoanAaIMJ8Hu6416lZggD6DK6fazAY3Mxw

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: sms; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA sms;


ALTER SCHEMA sms OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: sms; Owner: postgres
--

CREATE SEQUENCE sms.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sms.audit_logs_id_seq OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: sms; Owner: postgres
--

CREATE TABLE sms.audit_logs (
    id integer DEFAULT nextval('sms.audit_logs_id_seq'::regclass) NOT NULL,
    row_id text NOT NULL,
    user_id text,
    action character varying(200),
    entity_type character varying(50),
    entity_id text,
    cr_on timestamp without time zone DEFAULT now() NOT NULL,
    up_on timestamp without time zone DEFAULT now() NOT NULL,
    new_data jsonb,
    old_data jsonb,
    ip_address text,
    device_info text
);


ALTER TABLE sms.audit_logs OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: sms; Owner: postgres
--

CREATE SEQUENCE sms.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sms.categories_id_seq OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: sms; Owner: postgres
--

CREATE TABLE sms.categories (
    id integer DEFAULT nextval('sms.categories_id_seq'::regclass) NOT NULL,
    row_id text NOT NULL,
    department_id text,
    category_name text,
    cr_on timestamp without time zone DEFAULT now() NOT NULL,
    up_on timestamp without time zone DEFAULT now() NOT NULL,
    shop_id text
);


ALTER TABLE sms.categories OWNER TO postgres;

--
-- Name: chalan_items; Type: TABLE; Schema: sms; Owner: postgres
--

CREATE TABLE sms.chalan_items (
    id integer NOT NULL,
    row_id text NOT NULL,
    chalan_id text,
    sweet_id text,
    dispatched_quantity numeric NOT NULL,
    cr_on timestamp without time zone DEFAULT now() NOT NULL,
    up_on timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE sms.chalan_items OWNER TO postgres;

--
-- Name: chalan_items_id_seq; Type: SEQUENCE; Schema: sms; Owner: postgres
--

CREATE SEQUENCE sms.chalan_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sms.chalan_items_id_seq OWNER TO postgres;

--
-- Name: chalan_items_id_seq; Type: SEQUENCE OWNED BY; Schema: sms; Owner: postgres
--

ALTER SEQUENCE sms.chalan_items_id_seq OWNED BY sms.chalan_items.id;


--
-- Name: chalans_id_seq; Type: SEQUENCE; Schema: sms; Owner: postgres
--

CREATE SEQUENCE sms.chalans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sms.chalans_id_seq OWNER TO postgres;

--
-- Name: chalans; Type: TABLE; Schema: sms; Owner: postgres
--

CREATE TABLE sms.chalans (
    id integer DEFAULT nextval('sms.chalans_id_seq'::regclass) NOT NULL,
    row_id text NOT NULL,
    order_id text,
    supplier_id text,
    dispatch_date timestamp without time zone,
    transport_details text,
    cr_on timestamp without time zone DEFAULT now() NOT NULL,
    up_on timestamp without time zone DEFAULT now() NOT NULL,
    verification_code text,
    is_verified boolean DEFAULT false
);


ALTER TABLE sms.chalans OWNER TO postgres;

--
-- Name: counter_requests; Type: TABLE; Schema: sms; Owner: postgres
--

CREATE TABLE sms.counter_requests (
    id integer NOT NULL,
    row_id text NOT NULL,
    counter_id text,
    sweet_id text,
    quantity numeric,
    status text DEFAULT 'PENDING'::text,
    cr_on timestamp without time zone DEFAULT now() NOT NULL,
    up_on timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE sms.counter_requests OWNER TO postgres;

--
-- Name: counter_requests_id_seq; Type: SEQUENCE; Schema: sms; Owner: postgres
--

CREATE SEQUENCE sms.counter_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sms.counter_requests_id_seq OWNER TO postgres;

--
-- Name: counter_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: sms; Owner: postgres
--

ALTER SEQUENCE sms.counter_requests_id_seq OWNED BY sms.counter_requests.id;


--
-- Name: counters_id_seq; Type: SEQUENCE; Schema: sms; Owner: postgres
--

CREATE SEQUENCE sms.counters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sms.counters_id_seq OWNER TO postgres;

--
-- Name: counters; Type: TABLE; Schema: sms; Owner: postgres
--

CREATE TABLE sms.counters (
    id integer DEFAULT nextval('sms.counters_id_seq'::regclass) NOT NULL,
    row_id text NOT NULL,
    shop_id text,
    counter_name text,
    location text,
    cr_on timestamp without time zone DEFAULT now() NOT NULL,
    up_on timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE sms.counters OWNER TO postgres;

--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: sms; Owner: postgres
--

CREATE SEQUENCE sms.departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sms.departments_id_seq OWNER TO postgres;

--
-- Name: departments; Type: TABLE; Schema: sms; Owner: postgres
--

CREATE TABLE sms.departments (
    id integer DEFAULT nextval('sms.departments_id_seq'::regclass) NOT NULL,
    row_id text NOT NULL,
    department_name character varying(120) NOT NULL,
    description text,
    cr_on timestamp without time zone DEFAULT now() NOT NULL,
    up_on timestamp without time zone DEFAULT now() NOT NULL,
    shop_id text
);


ALTER TABLE sms.departments OWNER TO postgres;

--
-- Name: expiry_logs; Type: TABLE; Schema: sms; Owner: postgres
--

CREATE TABLE sms.expiry_logs (
    id integer NOT NULL,
    row_id text NOT NULL,
    counter_id text,
    sweet_id text,
    inventory_id text,
    quantity numeric NOT NULL,
    expiry_date date,
    loss_amount numeric(10,2) DEFAULT 0,
    reason text DEFAULT 'EXPIRED'::text,
    cr_on timestamp without time zone DEFAULT now() NOT NULL,
    up_on timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE sms.expiry_logs OWNER TO postgres;

--
-- Name: expiry_logs_id_seq; Type: SEQUENCE; Schema: sms; Owner: postgres
--

CREATE SEQUENCE sms.expiry_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sms.expiry_logs_id_seq OWNER TO postgres;

--
-- Name: expiry_logs_id_seq1; Type: SEQUENCE; Schema: sms; Owner: postgres
--

CREATE SEQUENCE sms.expiry_logs_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sms.expiry_logs_id_seq1 OWNER TO postgres;

--
-- Name: expiry_logs_id_seq1; Type: SEQUENCE OWNED BY; Schema: sms; Owner: postgres
--

ALTER SEQUENCE sms.expiry_logs_id_seq1 OWNED BY sms.expiry_logs.id;


--
-- Name: inventory_id_seq; Type: SEQUENCE; Schema: sms; Owner: postgres
--

CREATE SEQUENCE sms.inventory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sms.inventory_id_seq OWNER TO postgres;

--
-- Name: inventory; Type: TABLE; Schema: sms; Owner: postgres
--

CREATE TABLE sms.inventory (
    id integer DEFAULT nextval('sms.inventory_id_seq'::regclass) NOT NULL,
    row_id text NOT NULL,
    counter_id text,
    sweet_id text,
    quantity text DEFAULT 0,
    expiry_date date,
    cr_on timestamp without time zone DEFAULT now() NOT NULL,
    up_on timestamp without time zone DEFAULT now() NOT NULL,
    min_stock integer DEFAULT 0,
    max_stock integer DEFAULT 0
);


ALTER TABLE sms.inventory OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: sms; Owner: postgres
--

CREATE SEQUENCE sms.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sms.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: sms; Owner: postgres
--

CREATE TABLE sms.notifications (
    id integer DEFAULT nextval('sms.notifications_id_seq'::regclass) NOT NULL,
    row_id text NOT NULL,
    user_id text,
    title character varying(200),
    message text,
    is_read boolean DEFAULT false,
    cr_on timestamp without time zone DEFAULT now() NOT NULL,
    up_on timestamp without time zone DEFAULT now() NOT NULL,
    type text,
    reference_id text,
    reference_type text,
    priority text DEFAULT 'NORMAL'::text,
    is_deleted boolean DEFAULT false
);


ALTER TABLE sms.notifications OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: sms; Owner: postgres
--

CREATE SEQUENCE sms.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sms.order_items_id_seq OWNER TO postgres;

--
-- Name: order_items; Type: TABLE; Schema: sms; Owner: postgres
--

CREATE TABLE sms.order_items (
    id integer DEFAULT nextval('sms.order_items_id_seq'::regclass) NOT NULL,
    row_id text NOT NULL,
    order_id text,
    sweet_id text,
    quantity text,
    cr_on timestamp without time zone DEFAULT now() NOT NULL,
    up_on timestamp without time zone DEFAULT now() NOT NULL,
    item_status text DEFAULT 'PENDING'::text,
    supplied_quantity numeric DEFAULT 0,
    reject_reason text,
    counter_id text
);


ALTER TABLE sms.order_items OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: sms; Owner: postgres
--

CREATE SEQUENCE sms.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sms.orders_id_seq OWNER TO postgres;

--
-- Name: orders; Type: TABLE; Schema: sms; Owner: postgres
--

CREATE TABLE sms.orders (
    id integer DEFAULT nextval('sms.orders_id_seq'::regclass) NOT NULL,
    row_id text NOT NULL,
    supplier_id text,
    order_status text DEFAULT 'PENDING'::text,
    order_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    cr_on timestamp without time zone DEFAULT now() NOT NULL,
    up_on timestamp without time zone DEFAULT now() NOT NULL,
    shop_id text
);


ALTER TABLE sms.orders OWNER TO postgres;

--
-- Name: returns_id_seq; Type: SEQUENCE; Schema: sms; Owner: postgres
--

CREATE SEQUENCE sms.returns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sms.returns_id_seq OWNER TO postgres;

--
-- Name: returns; Type: TABLE; Schema: sms; Owner: postgres
--

CREATE TABLE sms.returns (
    id integer DEFAULT nextval('sms.returns_id_seq'::regclass) NOT NULL,
    row_id text NOT NULL,
    order_id text,
    sweet_id text,
    quantity text,
    reason text,
    cr_on timestamp without time zone DEFAULT now() NOT NULL,
    up_on timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE sms.returns OWNER TO postgres;

--
-- Name: shops_id_seq; Type: SEQUENCE; Schema: sms; Owner: postgres
--

CREATE SEQUENCE sms.shops_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sms.shops_id_seq OWNER TO postgres;

--
-- Name: shops; Type: TABLE; Schema: sms; Owner: postgres
--

CREATE TABLE sms.shops (
    id integer DEFAULT nextval('sms.shops_id_seq'::regclass) NOT NULL,
    row_id text NOT NULL,
    shop_name text NOT NULL,
    address text,
    cr_on timestamp without time zone DEFAULT now() NOT NULL,
    up_on timestamp without time zone DEFAULT now() NOT NULL,
    city text,
    state text,
    pincode text,
    phone text,
    email text,
    is_active boolean DEFAULT true,
    gst_number text,
    owner_name text,
    logo_url text
);


ALTER TABLE sms.shops OWNER TO postgres;

--
-- Name: stock_transactions_id_seq; Type: SEQUENCE; Schema: sms; Owner: postgres
--

CREATE SEQUENCE sms.stock_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sms.stock_transactions_id_seq OWNER TO postgres;

--
-- Name: stock_transactions; Type: TABLE; Schema: sms; Owner: postgres
--

CREATE TABLE sms.stock_transactions (
    id integer DEFAULT nextval('sms.stock_transactions_id_seq'::regclass) NOT NULL,
    row_id text NOT NULL,
    counter_id text,
    sweet_id text,
    transaction_type text,
    quantity text,
    reference_id text,
    notes text,
    cr_on timestamp without time zone DEFAULT now() NOT NULL,
    up_on timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE sms.stock_transactions OWNER TO postgres;

--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: sms; Owner: postgres
--

CREATE SEQUENCE sms.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sms.suppliers_id_seq OWNER TO postgres;

--
-- Name: suppliers; Type: TABLE; Schema: sms; Owner: postgres
--

CREATE TABLE sms.suppliers (
    id integer DEFAULT nextval('sms.suppliers_id_seq'::regclass) NOT NULL,
    row_id text NOT NULL,
    supplier_name text,
    phone text,
    email text,
    address text,
    cr_on timestamp without time zone DEFAULT now() NOT NULL,
    up_on timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE sms.suppliers OWNER TO postgres;

--
-- Name: sweets_id_seq; Type: SEQUENCE; Schema: sms; Owner: postgres
--

CREATE SEQUENCE sms.sweets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sms.sweets_id_seq OWNER TO postgres;

--
-- Name: sweets; Type: TABLE; Schema: sms; Owner: postgres
--

CREATE TABLE sms.sweets (
    id integer DEFAULT nextval('sms.sweets_id_seq'::regclass) NOT NULL,
    row_id text NOT NULL,
    category_id text,
    sweet_name text,
    shelf_life_days text,
    cr_on timestamp without time zone DEFAULT now() NOT NULL,
    up_on timestamp without time zone DEFAULT now() NOT NULL,
    unit text DEFAULT 'KG'::text,
    price numeric(10,2) DEFAULT 0,
    description text,
    image_url text,
    is_active boolean DEFAULT true,
    counter_id text,
    return_type text DEFAULT 'NONE'::text,
    shop_id text
);


ALTER TABLE sms.sweets OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: sms; Owner: postgres
--

CREATE SEQUENCE sms.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sms.users_id_seq OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: sms; Owner: postgres
--

CREATE TABLE sms.users (
    id integer DEFAULT nextval('sms.users_id_seq'::regclass) NOT NULL,
    row_id text NOT NULL,
    name text,
    email text,
    phone text,
    password text,
    role text,
    counter_id text,
    cr_on timestamp without time zone DEFAULT now() NOT NULL,
    up_on timestamp without time zone DEFAULT now() NOT NULL,
    shop_id text,
    supplier_id text
);


ALTER TABLE sms.users OWNER TO postgres;

--
-- Name: chalan_items id; Type: DEFAULT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.chalan_items ALTER COLUMN id SET DEFAULT nextval('sms.chalan_items_id_seq'::regclass);


--
-- Name: counter_requests id; Type: DEFAULT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.counter_requests ALTER COLUMN id SET DEFAULT nextval('sms.counter_requests_id_seq'::regclass);


--
-- Name: expiry_logs id; Type: DEFAULT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.expiry_logs ALTER COLUMN id SET DEFAULT nextval('sms.expiry_logs_id_seq1'::regclass);


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: sms; Owner: postgres
--

COPY sms.audit_logs (id, row_id, user_id, action, entity_type, entity_id, cr_on, up_on, new_data, old_data, ip_address, device_info) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: sms; Owner: postgres
--

COPY sms.categories (id, row_id, department_id, category_name, cr_on, up_on, shop_id) FROM stdin;
10	1774883329522_EnyE	1774883258741_6jHx	new cate 1	2026-03-30 15:08:49.521447	2026-03-30 15:08:49.521447	1774882974450_fvRK
11	1774883343192_vFkk	1774883279657_aptA	cate 2	2026-03-30 15:09:03.192774	2026-03-30 15:09:03.192774	1774883076928_dJxe
12	1774883355385_9SQW	1774883258741_6jHx	test cate	2026-03-30 15:09:15.385869	2026-03-30 15:09:15.385869	1774883076928_dJxe
13	1774933532920_dKPK	1774933396490_v1lT	Bengali	2026-03-31 05:05:32.918788	2026-03-31 05:05:32.918788	1774933113542_dAoT
14	1774972830542_Y8pS	1774972772144_fbLc	test catrgory 31	2026-03-31 16:00:30.541111	2026-03-31 16:00:30.541111	1774972180389_NKbD
15	1774973352330_GJ1a	1774973334751_5XW5	new cate	2026-03-31 16:09:12.329402	2026-03-31 16:09:12.329402	1774972180389_NKbD
16	1775977386976_2TU9	1775977257763_j94C	tes category	2026-04-12 12:33:06.977317	2026-04-12 12:33:06.977317	1774882974450_fvRK
17	1776961445362_iCYl	1776961142311_179m	tes category 34	2026-04-23 21:54:05.364258	2026-04-23 21:54:43.07586	1776958788911_4QpL
\.


--
-- Data for Name: chalan_items; Type: TABLE DATA; Schema: sms; Owner: postgres
--

COPY sms.chalan_items (id, row_id, chalan_id, sweet_id, dispatched_quantity, cr_on, up_on) FROM stdin;
13	1775667457737_cSCE	1775667457701_EZwK	1774884603377_3meD	10	2026-04-08 22:27:37.691515	2026-04-08 22:27:37.691515
14	1775667457761_IKJX	1775667457701_EZwK	1775005681892_VySe	12	2026-04-08 22:27:37.691515	2026-04-08 22:27:37.691515
\.


--
-- Data for Name: chalans; Type: TABLE DATA; Schema: sms; Owner: postgres
--

COPY sms.chalans (id, row_id, order_id, supplier_id, dispatch_date, transport_details, cr_on, up_on, verification_code, is_verified) FROM stdin;
1	1775059885955_JgFm	1775005765278_Ow2v	1774934591673_G1Ql	2026-04-01 00:00:00	Truck RJ14	2026-04-01 16:11:25.950568	2026-04-01 16:11:25.950568	\N	f
2	1775063222210_UfmR	1775063154116_1T8M	1774934591673_G1Ql	2026-04-01 00:00:00	ioooo	2026-04-01 17:07:02.206752	2026-04-01 17:07:02.206752	\N	f
3	1775318223749_ScDz	1775314637270_LA5O	1774934591673_G1Ql	2026-03-21 00:00:00	Truck RJ14 AB 1234	2026-04-04 21:27:03.743497	2026-04-04 21:27:03.743497	\N	f
4	1775379611669_tvb0	1775378888083_LTtT	1774934591673_G1Ql	2026-04-21 00:00:00	Truck RJ14 AB 1234	2026-04-05 14:30:11.658667	2026-04-05 14:30:11.658667	\N	f
12	1775667457701_EZwK	1775664792111_z0R3	1774934591673_G1Ql	2026-04-19 00:00:00	Truck RJ14 AB 1234 test	2026-04-08 22:27:37.691515	2026-04-08 22:27:37.691515	\N	f
13	1775744642583_hahJ	1775744536111_XFHB	1774934591673_G1Ql	2026-04-19 00:00:00	Truck RJ14 AB 1234 test00000	2026-04-09 19:54:02.583619	2026-04-09 19:54:02.583619	416345	t
14	1775750864828_QEvb	1775750009440_8Pqm	1774934591673_G1Ql	2026-04-19 00:00:00	Truck RJ14 AB 1234 test000008888888	2026-04-09 21:37:44.828732	2026-04-09 21:37:44.828732	700932	f
15	1775974840901_8SpJ	1775974190588_YUJg	1774884650469_lc1j	2026-03-21 00:00:00	Truck 9999999999	2026-04-12 11:50:40.901278	2026-04-12 11:50:40.901278	282318	t
16	1775975980826_x55d	1775975647894_PROX	1774884650469_lc1j	2026-03-21 00:00:00	test 	2026-04-12 12:09:40.827105	2026-04-12 12:09:40.827105	293879	f
17	1775978898764_Jh6Y	1775978261699_hpjb	1774884650469_lc1j	2026-03-21 00:00:00	test 7890 	2026-04-12 12:58:18.76469	2026-04-12 12:58:18.76469	243490	f
18	1775995153229_wJQD	1775995056129_xuxa	1774884650469_lc1j	2026-03-21 00:00:00	test 7890 	2026-04-12 17:29:13.229417	2026-04-12 18:18:20.899402	105127	t
\.


--
-- Data for Name: counter_requests; Type: TABLE DATA; Schema: sms; Owner: postgres
--

COPY sms.counter_requests (id, row_id, counter_id, sweet_id, quantity, status, cr_on, up_on) FROM stdin;
4	1774885042252_zAy3	1774883131475_B3JJ	1774884554515_K6XD	11	APPROVED	2026-03-30 15:37:22.24253	2026-03-30 15:37:22.24253
5	1774885167366_wiXm	1774883131475_B3JJ	1774884603377_3meD	90	APPROVED	2026-03-30 15:39:27.362774	2026-03-30 15:39:27.362774
9	1774973992796_5dxd	1774972657465_xKrH	1774973412089_sx9Y	124	PENDING	2026-03-31 16:19:52.791794	2026-03-31 16:19:52.791794
10	1774973992801_1jhT	1774972657465_xKrH	1774973098134_Lqlr	23	PENDING	2026-03-31 16:19:52.791794	2026-03-31 16:19:52.791794
6	1774945668380_6stq	1774933262679_vnmQ	1774934395657_tidx	5	APPROVED	2026-03-31 08:27:48.370234	2026-03-31 08:27:48.370234
11	1774974339687_fxwg	1774972657465_xKrH	1774974325659_DV79	9	PENDING	2026-03-31 16:25:39.681782	2026-03-31 16:25:39.681782
12	1774975424183_MCbS	1774933262679_vnmQ	1774934395657_tidx	1	APPROVED	2026-03-31 16:43:44.177529	2026-03-31 16:43:44.177529
13	1775005705561_QPO8	1774883131475_B3JJ	1775005681892_VySe	3	APPROVED	2026-04-01 01:08:25.559882	2026-04-01 01:08:25.559882
14	1775005896739_RNCC	1774883131475_B3JJ	1774884554515_K6XD	8	APPROVED	2026-04-01 01:11:36.737172	2026-04-01 01:11:36.737172
15	1775063116291_0Q2i	1774883131475_B3JJ	1774884554515_K6XD	78	APPROVED	2026-04-01 17:05:16.286933	2026-04-01 17:05:16.286933
26	1775314132272_z1C5	1774883131475_B3JJ	1774884603377_3meD	10	APPROVED	2026-04-04 20:18:52.254795	2026-04-04 20:18:52.254795
27	1775314132281_DdbB	1774883131475_B3JJ	1775005681892_VySe	5	APPROVED	2026-04-04 20:18:52.254795	2026-04-04 20:18:52.254795
30	1775378783356_39jd	1774883131475_B3JJ	1774884603377_3meD	20	APPROVED	2026-04-05 14:16:23.34323	2026-04-05 14:16:23.34323
31	1775378783362_8rbs	1774883131475_B3JJ	1775005681892_VySe	15	APPROVED	2026-04-05 14:16:23.34323	2026-04-05 14:16:23.34323
32	1775664681450_nG90	1774883131475_B3JJ	1774884603377_3meD	20	APPROVED	2026-04-08 21:41:21.422615	2026-04-08 21:41:21.422615
33	1775664681461_vsbs	1774883131475_B3JJ	1775005681892_VySe	15	APPROVED	2026-04-08 21:41:21.422615	2026-04-08 21:41:21.422615
34	1775744447757_w8co	1774883131475_B3JJ	1774884603377_3meD	20	APPROVED	2026-04-09 19:50:47.72078	2026-04-09 19:50:47.72078
35	1775744447777_ulTH	1774883131475_B3JJ	1775005681892_VySe	15	APPROVED	2026-04-09 19:50:47.72078	2026-04-09 19:50:47.72078
36	1775749961916_9NHN	1774883131475_B3JJ	1774884603377_3meD	720	APPROVED	2026-04-09 21:22:41.894772	2026-04-09 21:22:41.894772
37	1775749961926_pelh	1774883131475_B3JJ	1775005681892_VySe	165	APPROVED	2026-04-09 21:22:41.894772	2026-04-09 21:22:41.894772
38	1775972543274_SHVf	1774883131475_B3JJ	1774884603377_3meD	200	APPROVED	2026-04-12 11:12:23.242376	2026-04-12 11:12:23.242376
39	1775972543301_P2vP	1774883131475_B3JJ	1775005681892_VySe	150	APPROVED	2026-04-12 11:12:23.242376	2026-04-12 11:12:23.242376
40	1775975517184_AHaF	1774883131475_B3JJ	1774884603377_3meD	100	APPROVED	2026-04-12 12:01:57.160674	2026-04-12 12:01:57.160674
41	1775975517193_nxDl	1774883131475_B3JJ	1775005681892_VySe	30	APPROVED	2026-04-12 12:01:57.160674	2026-04-12 12:01:57.160674
42	1775975557306_wOoH	1775975405523_Bpig	1774884603377_3meD	50	APPROVED	2026-04-12 12:02:37.286548	2026-04-12 12:02:37.286548
43	1775975557313_km9B	1775975405523_Bpig	1775005681892_VySe	90	APPROVED	2026-04-12 12:02:37.286548	2026-04-12 12:02:37.286548
44	1775977627683_x7qh	1774883131475_B3JJ	1774884603377_3meD	23	APPROVED	2026-04-12 12:37:07.662234	2026-04-12 12:37:07.662234
45	1775977627690_qgQX	1774883131475_B3JJ	1775005681892_VySe	45	APPROVED	2026-04-12 12:37:07.662234	2026-04-12 12:37:07.662234
46	1775977676299_DMiK	1775975405523_Bpig	1775977547223_QJFg	13	APPROVED	2026-04-12 12:37:56.284611	2026-04-12 12:37:56.284611
47	1775977676304_akxt	1775975405523_Bpig	1775977566799_zdA3	25	APPROVED	2026-04-12 12:37:56.284611	2026-04-12 12:37:56.284611
48	1775995012969_j7LL	1775975405523_Bpig	1775977547223_QJFg	13	APPROVED	2026-04-12 17:26:52.93411	2026-04-12 17:26:52.93411
49	1775995013000_qqtF	1775975405523_Bpig	1775977566799_zdA3	25	APPROVED	2026-04-12 17:26:52.93411	2026-04-12 17:26:52.93411
50	1776603081758_wRLi	1774883131475_B3JJ	1774884554515_K6XD	13	APPROVED	2026-04-19 18:21:21.733252	2026-04-19 18:21:21.733252
51	1776603081786_iX6k	1774883131475_B3JJ	1774884603377_3meD	25	APPROVED	2026-04-19 18:21:21.733252	2026-04-19 18:21:21.733252
\.


--
-- Data for Name: counters; Type: TABLE DATA; Schema: sms; Owner: postgres
--

COPY sms.counters (id, row_id, shop_id, counter_name, location, cr_on, up_on) FROM stdin;
11	1774883226448_zcpD	1774883076928_dJxe	test 2 counter	jodhpur	2026-03-30 15:07:06.446499	2026-03-30 15:07:06.446499
12	1774933262679_vnmQ	1774933113542_dAoT	Bengali Sweet Counter	jodhpur	2026-03-31 05:01:02.675509	2026-03-31 05:01:02.675509
13	1774964290220_fRFc	1774933113542_dAoT	Milk	jodhpur	2026-03-31 13:38:10.215632	2026-03-31 13:38:10.215632
14	1774972657465_xKrH	1774972180389_NKbD	test new counter 31	jaipur	2026-03-31 15:57:37.463496	2026-03-31 15:57:37.463496
15	1774974460767_e5sF	1774972180389_NKbD	test56	kl	2026-03-31 16:27:40.765163	2026-03-31 16:27:40.765163
16	1774975183324_LV6Q	1774933113542_dAoT	test	fff	2026-03-31 16:39:43.322313	2026-03-31 16:39:43.322313
10	1774883131475_B3JJ	1774882974450_fvRK	new 99999	jodhpur	2026-03-30 15:05:31.474349	2026-03-30 15:05:31.474349
17	1775975405523_Bpig	1774882974450_fvRK	Main Counter shop admin	Ground Floor	2026-04-12 12:00:05.522832	2026-04-12 12:00:05.522832
18	1776960751329_C0nT	1776958788911_4QpL	Main Counter shop admin 12	Ground Floor 12	2026-04-23 21:42:31.328051	2026-04-23 21:44:13.210692
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: sms; Owner: postgres
--

COPY sms.departments (id, row_id, department_name, description, cr_on, up_on, shop_id) FROM stdin;
18	1774883258741_6jHx	new dep 1	desc1	2026-03-30 15:07:38.743782	2026-03-30 15:07:38.743782	1774882974450_fvRK
19	1774883279657_aptA	test 2 dep 2	desc 2	2026-03-30 15:07:59.656379	2026-03-30 15:07:59.656379	1774883076928_dJxe
20	1774933396490_v1lT	Milk-Based Sweets	Milk Based desc test	2026-03-31 05:03:16.48862	2026-03-31 05:03:16.48862	1774933113542_dAoT
21	1774972772144_fbLc	new dep 31	desc 31	2026-03-31 15:59:32.143796	2026-03-31 15:59:32.143796	1774972180389_NKbD
22	1774973334751_5XW5	test dep	des	2026-03-31 16:08:54.750139	2026-03-31 16:08:54.750139	1774972180389_NKbD
23	1775977257763_j94C	test sweets dep admin 1	d	2026-04-12 12:30:57.766473	2026-04-12 12:30:57.766473	1774882974450_fvRK
24	1776961142311_179m	test sweets dep admin 12	d12	2026-04-23 21:49:02.313541	2026-04-23 21:50:04.003703	1776958788911_4QpL
\.


--
-- Data for Name: expiry_logs; Type: TABLE DATA; Schema: sms; Owner: postgres
--

COPY sms.expiry_logs (id, row_id, counter_id, sweet_id, inventory_id, quantity, expiry_date, loss_amount, reason, cr_on, up_on) FROM stdin;
1	1775366692639_u6j5	1774883131475_B3JJ	1774884554515_K6XD	1774885753247_CHOR	208	2026-03-30	164112.00	Expired stock	2026-04-05 10:54:52.641975	2026-04-05 10:54:52.641975
2	1775366692685_cg37	1774972657465_xKrH	1774973412089_sx9Y	1774974099192_gw4h	10	2026-03-30	900.00	Expired stock	2026-04-05 10:54:52.68677	2026-04-05 10:54:52.68677
3	1775366692691_FyWb	1774972657465_xKrH	1774974325659_DV79	1774974721815_TXo9	89	2026-03-30	8010.00	Expired stock	2026-04-05 10:54:52.693255	2026-04-05 10:54:52.693255
4	1775366692696_Dcej	1774883131475_B3JJ	1775005681892_VySe	1775317305467_m4Uz	2	2026-03-31	112.00	Expired stock	2026-04-05 10:54:52.697331	2026-04-05 10:54:52.697331
5	1775367092377_PKap	1774883131475_B3JJ	1775005681892_VySe	1775317305467_m4Uz	8	2026-04-04	448.00	Expired stock	2026-04-05 11:01:32.379197	2026-04-05 11:01:32.379197
\.


--
-- Data for Name: inventory; Type: TABLE DATA; Schema: sms; Owner: postgres
--

COPY sms.inventory (id, row_id, counter_id, sweet_id, quantity, expiry_date, cr_on, up_on, min_stock, max_stock) FROM stdin;
2	1774946649164_fz2r	1774933262679_vnmQ	1774934395657_tidx	59	2026-04-22	2026-03-31 08:44:09.157573	2026-03-31 08:44:09.157573	2	5
1	1774885753247_CHOR	1774883131475_B3JJ	1774884554515_K6XD	0	2026-03-31	2026-03-30 15:49:13.241911	2026-03-30 15:49:13.241911	444	3333
3	1774974099192_gw4h	1774972657465_xKrH	1774973412089_sx9Y	0	2026-03-31	2026-03-31 16:21:39.187897	2026-03-31 16:21:39.187897	20	200
4	1774974721815_TXo9	1774972657465_xKrH	1774974325659_DV79	0	2026-03-31	2026-03-31 16:32:01.811006	2026-03-31 16:32:01.811006	45	100
10	1775995977958_nbjf	1775975405523_Bpig	1775977547223_QJFg	20	2026-03-30	2026-04-12 17:42:57.933841	2026-04-12 17:42:57.933841	0	0
11	1775995977995_eVfe	1775975405523_Bpig	1775977566799_zdA3	26	2026-03-21	2026-04-12 17:42:57.933841	2026-04-12 17:42:57.933841	0	0
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: sms; Owner: postgres
--

COPY sms.notifications (id, row_id, user_id, title, message, is_read, cr_on, up_on, type, reference_id, reference_type, priority, is_deleted) FROM stdin;
1	1775314132294_YqD0	1774882974452_YOkW	New Counter Request	2 item(s) requested from counter	f	2026-04-04 20:18:52.29495	2026-04-04 20:18:52.29495	REQUEST	1774883131475_B3JJ	\N	NORMAL	f
3	1775314637331_3R11	1774883131477_sthc	Request Approved	2 request(s) approved	f	2026-04-04 20:27:17.332017	2026-04-04 20:27:17.332017	REQUEST	1775314637270_LA5O	\N	NORMAL	f
2	1775314637325_WV8p	1774934591675_uLac	New Order Received	New order created with 2 item(s)	t	2026-04-04 20:27:17.326642	2026-04-04 20:27:17.326642	ORDER	1775314637270_LA5O	\N	NORMAL	f
4	1775316732744_wMPy	1774882974452_YOkW	Order Status Updated	Order is ACCEPTED	f	2026-04-04 21:02:12.744967	2026-04-04 21:02:12.744967	ORDER	1775314637270_LA5O	\N	NORMAL	f
5	1775316732753_JIlR	1774934591675_uLac	Order Update	Order is ACCEPTED	f	2026-04-04 21:02:12.754009	2026-04-04 21:02:12.754009	ORDER	1775314637270_LA5O	\N	NORMAL	f
6	1775316732766_f1OK	1774883131477_sthc	Order Update	Your requested items are ACCEPTED	f	2026-04-04 21:02:12.766795	2026-04-04 21:02:12.766795	ORDER	1775314637270_LA5O	\N	NORMAL	f
7	1775317425205_jLiu	1774883131477_sthc	Low Stock Alert	Only 2 items left	f	2026-04-04 21:13:45.207098	2026-04-04 21:13:45.207098	STOCK	1775005681892_VySe	\N	NORMAL	f
8	1775318223778_qKTI	1774882974452_YOkW	Order Dispatched	Order has been dispatched by supplier	f	2026-04-04 21:27:03.779065	2026-04-04 21:27:03.779065	CHALLAN	1775318223749_ScDz	\N	NORMAL	f
9	1775318223791_Ez03	1774883131477_sthc	Order Dispatched	Your requested items have been dispatched	f	2026-04-04 21:27:03.792586	2026-04-04 21:27:03.792586	CHALLAN	1775318223749_ScDz	\N	NORMAL	f
10	1775366692679_4i8i	1774883131477_sthc	Stock Expired	Some items expired and removed from inventory	f	2026-04-05 10:54:52.680363	2026-04-05 10:54:52.680363	EXPIRY	1774884554515_K6XD	\N	NORMAL	f
11	1775366692690_pPdw	1774972657467_dzSu	Stock Expired	Some items expired and removed from inventory	f	2026-04-05 10:54:52.691611	2026-04-05 10:54:52.691611	EXPIRY	1774973412089_sx9Y	\N	NORMAL	f
12	1775366692694_AbP6	1774972657467_dzSu	Stock Expired	Some items expired and removed from inventory	f	2026-04-05 10:54:52.695928	2026-04-05 10:54:52.695928	EXPIRY	1774974325659_DV79	\N	NORMAL	f
13	1775366692699_X0fX	1774883131477_sthc	Stock Expired	Some items expired and removed from inventory	f	2026-04-05 10:54:52.700527	2026-04-05 10:54:52.700527	EXPIRY	1775005681892_VySe	\N	NORMAL	f
14	1775367092393_Ds8j	1774883131477_sthc	Stock Expired	Some items expired and removed from inventory	f	2026-04-05 11:01:32.393996	2026-04-05 11:01:32.393996	EXPIRY	1775005681892_VySe	\N	NORMAL	f
15	1775378704626_lcNJ	1774882974452_YOkW	New Counter Request	2 item(s) requested from counter	f	2026-04-05 14:15:04.627324	2026-04-05 14:15:04.627324	REQUEST	1774883131475_B3JJ	\N	NORMAL	f
16	1775378783372_UFEX	1774882974452_YOkW	New Counter Request	2 item(s) requested from counter	f	2026-04-05 14:16:23.373237	2026-04-05 14:16:23.373237	REQUEST	1774883131475_B3JJ	\N	NORMAL	f
17	1775378888123_KXpN	1774934591675_uLac	New Order Received	New order created with 2 item(s)	f	2026-04-05 14:18:08.124159	2026-04-05 14:18:08.124159	ORDER	1775378888083_LTtT	\N	NORMAL	f
18	1775378888128_0RCN	1774883131477_sthc	Request Approved	2 request(s) approved	f	2026-04-05 14:18:08.129363	2026-04-05 14:18:08.129363	REQUEST	1775378888083_LTtT	\N	NORMAL	f
19	1775379596745_QA4u	1774882974452_YOkW	Order Status Updated	Order is ACCEPTED	f	2026-04-05 14:29:56.746105	2026-04-05 14:29:56.746105	ORDER	1775378888083_LTtT	\N	NORMAL	f
20	1775379596755_QpBN	1774934591675_uLac	Order Update	Order is ACCEPTED	f	2026-04-05 14:29:56.755621	2026-04-05 14:29:56.755621	ORDER	1775378888083_LTtT	\N	NORMAL	f
21	1775379596768_9LLi	1774883131477_sthc	Order Update	Your requested items are ACCEPTED	f	2026-04-05 14:29:56.769345	2026-04-05 14:29:56.769345	ORDER	1775378888083_LTtT	\N	NORMAL	f
22	1775379611694_hBcx	1774882974452_YOkW	Order Dispatched	Order has been dispatched by supplier	f	2026-04-05 14:30:11.694903	2026-04-05 14:30:11.694903	CHALLAN	1775379611669_tvb0	\N	NORMAL	f
23	1775379611707_t4YK	1774883131477_sthc	Order Dispatched	Your requested items have been dispatched	f	2026-04-05 14:30:11.708155	2026-04-05 14:30:11.708155	CHALLAN	1775379611669_tvb0	\N	NORMAL	f
24	1775664681470_e1rI	1774882974452_YOkW	New Counter Request	2 item(s) requested from counter	f	2026-04-08 21:41:21.47084	2026-04-08 21:41:21.47084	REQUEST	1774883131475_B3JJ	\N	NORMAL	f
25	1775664792146_VABY	1774934591675_uLac	New Order Received	New order created with 2 item(s)	f	2026-04-08 21:43:12.146656	2026-04-08 21:43:12.146656	ORDER	1775664792111_z0R3	\N	NORMAL	f
26	1775664792150_3d6y	1774883131477_sthc	Request Approved	2 request(s) approved	f	2026-04-08 21:43:12.150436	2026-04-08 21:43:12.150436	REQUEST	1775664792111_z0R3	\N	NORMAL	f
27	1775665499005_tA8P	1774882974452_YOkW	Order Dispatched	Order has been dispatched by supplier	f	2026-04-08 21:54:59.005836	2026-04-08 21:54:59.005836	CHALLAN	1775665498945_8DLA	\N	NORMAL	f
28	1775665499010_UodA	1774883131477_sthc	Order Dispatched	Your requested items have been dispatched	f	2026-04-08 21:54:59.011481	2026-04-08 21:54:59.011481	CHALLAN	1775665498945_8DLA	\N	NORMAL	f
29	1775666164204_QUnL	1774882974452_YOkW	Order Status Updated	Order is ACCEPTED	f	2026-04-08 22:06:04.205467	2026-04-08 22:06:04.205467	ORDER	1775664792111_z0R3	\N	NORMAL	f
30	1775666164212_PL58	1774934591675_uLac	Order Update	Order is ACCEPTED	f	2026-04-08 22:06:04.213355	2026-04-08 22:06:04.213355	ORDER	1775664792111_z0R3	\N	NORMAL	f
31	1775666164226_m0yv	1774883131477_sthc	Order Update	Your requested items are ACCEPTED	f	2026-04-08 22:06:04.227465	2026-04-08 22:06:04.227465	ORDER	1775664792111_z0R3	\N	NORMAL	f
32	1775666242367_YPAU	1774882974452_YOkW	Order Dispatched	Order has been dispatched by supplier	f	2026-04-08 22:07:22.369546	2026-04-08 22:07:22.369546	CHALLAN	1775666242282_sSSK	\N	NORMAL	f
33	1775666242374_2pGX	1774883131477_sthc	Order Dispatched	Your requested items have been dispatched	f	2026-04-08 22:07:22.375872	2026-04-08 22:07:22.375872	CHALLAN	1775666242282_sSSK	\N	NORMAL	f
34	1775666813923_wyIl	1774882974452_YOkW	Order Dispatched	Order has been dispatched by supplier	f	2026-04-08 22:16:53.923885	2026-04-08 22:16:53.923885	CHALLAN	1775666813841_qguc	\N	NORMAL	f
35	1775666813929_cyKD	1774883131477_sthc	Order Dispatched	Your requested items have been dispatched	f	2026-04-08 22:16:53.930263	2026-04-08 22:16:53.930263	CHALLAN	1775666813841_qguc	\N	NORMAL	f
36	1775666889359_wkVg	1774882974452_YOkW	Order Dispatched	Order has been dispatched by supplier	f	2026-04-08 22:18:09.359455	2026-04-08 22:18:09.359455	CHALLAN	1775666889282_MtqY	\N	NORMAL	f
37	1775666889365_QJck	1774883131477_sthc	Order Dispatched	Your requested items have been dispatched	f	2026-04-08 22:18:09.365527	2026-04-08 22:18:09.365527	CHALLAN	1775666889282_MtqY	\N	NORMAL	f
38	1775667457781_jvkP	1774882974452_YOkW	Order Dispatched	Order has been dispatched by supplier	f	2026-04-08 22:27:37.782652	2026-04-08 22:27:37.782652	CHALLAN	1775667457701_EZwK	\N	NORMAL	f
39	1775667457788_J75Y	1774883131477_sthc	Order Dispatched	Your requested items have been dispatched	f	2026-04-08 22:27:37.790264	2026-04-08 22:27:37.790264	CHALLAN	1775667457701_EZwK	\N	NORMAL	f
40	1775744447794_HkUT	1774882974452_YOkW	New Counter Request	2 item(s) requested from counter	f	2026-04-09 19:50:47.796138	2026-04-09 19:50:47.796138	REQUEST	1774883131475_B3JJ	\N	NORMAL	f
41	1775744536155_bJwe	1774934591675_uLac	New Order Received	New order created with 2 item(s)	f	2026-04-09 19:52:16.155835	2026-04-09 19:52:16.155835	ORDER	1775744536111_XFHB	\N	NORMAL	f
42	1775744536159_tUtq	1774883131477_sthc	Request Approved	2 request(s) approved	f	2026-04-09 19:52:16.160365	2026-04-09 19:52:16.160365	REQUEST	1775744536111_XFHB	\N	NORMAL	f
43	1775744601214_uE7b	1774882974452_YOkW	Order Status Updated	Order is ACCEPTED	f	2026-04-09 19:53:21.215246	2026-04-09 19:53:21.215246	ORDER	1775744536111_XFHB	\N	NORMAL	f
44	1775744601222_1CaP	1774934591675_uLac	Order Update	Order is ACCEPTED	f	2026-04-09 19:53:21.222791	2026-04-09 19:53:21.222791	ORDER	1775744536111_XFHB	\N	NORMAL	f
45	1775744601230_HuN9	1774883131477_sthc	Order Update	Your requested items are ACCEPTED	f	2026-04-09 19:53:21.231479	2026-04-09 19:53:21.231479	ORDER	1775744536111_XFHB	\N	NORMAL	f
46	1775749961941_0cBr	1774882974452_YOkW	New Counter Request	2 item(s) requested from counter	f	2026-04-09 21:22:41.942045	2026-04-09 21:22:41.942045	REQUEST	1774883131475_B3JJ	\N	NORMAL	f
47	1775750009477_Fqj1	1774934591675_uLac	New Order Received	New order created with 2 item(s)	f	2026-04-09 21:23:29.478365	2026-04-09 21:23:29.478365	ORDER	1775750009440_8Pqm	\N	NORMAL	f
48	1775750009485_792m	1774883131477_sthc	Request Approved	2 request(s) approved	f	2026-04-09 21:23:29.485952	2026-04-09 21:23:29.485952	REQUEST	1775750009440_8Pqm	\N	NORMAL	f
49	1775972543318_yjTQ	1774882974452_YOkW	New Counter Request	2 item(s) requested from counter	f	2026-04-12 11:12:23.318888	2026-04-12 11:12:23.318888	REQUEST	1774883131475_B3JJ	\N	NORMAL	f
50	1775974190655_eNvp	1774884650471_Bcz0	New Order Received	New order created with 2 item(s)	f	2026-04-12 11:39:50.656405	2026-04-12 11:39:50.656405	ORDER	1775974190588_YUJg	\N	NORMAL	f
51	1775974190679_Je0z	1774883131477_sthc	Request Approved	2 request(s) approved	f	2026-04-12 11:39:50.68012	2026-04-12 11:39:50.68012	REQUEST	1775974190588_YUJg	\N	NORMAL	f
52	1775974764234_HaKZ	1774882974452_YOkW	Order Status Updated	Order is ACCEPTED	f	2026-04-12 11:49:24.235868	2026-04-12 11:49:24.235868	ORDER	1775974190588_YUJg	\N	NORMAL	f
53	1775974764241_7O9v	1774884650471_Bcz0	Order Update	Order is ACCEPTED	f	2026-04-12 11:49:24.242508	2026-04-12 11:49:24.242508	ORDER	1775974190588_YUJg	\N	NORMAL	f
54	1775974764253_nktN	1774883131477_sthc	Order Update	Your requested items are ACCEPTED	f	2026-04-12 11:49:24.254114	2026-04-12 11:49:24.254114	ORDER	1775974190588_YUJg	\N	NORMAL	f
55	1775974840943_UuqE	1774882974452_YOkW	Order Dispatched (OTP)	Order dispatched. OTP: 282318	f	2026-04-12 11:50:40.944266	2026-04-12 11:50:40.944266	CHALLAN	1775974840901_8SpJ	\N	NORMAL	f
56	1775975517204_VULy	1774882974452_YOkW	New Counter Request	2 item(s) requested from counter	f	2026-04-12 12:01:57.204895	2026-04-12 12:01:57.204895	REQUEST	1774883131475_B3JJ	\N	NORMAL	f
57	1775975557326_spbt	1774882974452_YOkW	New Counter Request	2 item(s) requested from counter	f	2026-04-12 12:02:37.327737	2026-04-12 12:02:37.327737	REQUEST	1775975405523_Bpig	\N	NORMAL	f
58	1775975647941_u7xs	1774884650471_Bcz0	New Order Received	New order created with 2 item(s)	f	2026-04-12 12:04:07.942974	2026-04-12 12:04:07.942974	ORDER	1775975647894_PROX	\N	NORMAL	f
59	1775975647951_S7Xe	1774883131477_sthc	Request Approved	4 request(s) approved	f	2026-04-12 12:04:07.95192	2026-04-12 12:04:07.95192	REQUEST	1775975647894_PROX	\N	NORMAL	f
60	1775975647953_No0m	1775975405538_cfG8	Request Approved	4 request(s) approved	f	2026-04-12 12:04:07.954962	2026-04-12 12:04:07.954962	REQUEST	1775975647894_PROX	\N	NORMAL	f
61	1775975980856_nEaI	1774882974452_YOkW	Order Dispatched (OTP)	Order dispatched. OTP: 293879	f	2026-04-12 12:09:40.857419	2026-04-12 12:09:40.857419	CHALLAN	1775975980826_x55d	\N	NORMAL	f
62	1775977627702_HhCn	1774882974452_YOkW	New Counter Request	2 item(s) requested from counter	f	2026-04-12 12:37:07.703338	2026-04-12 12:37:07.703338	REQUEST	1774883131475_B3JJ	\N	NORMAL	f
63	1775977676313_odD0	1774882974452_YOkW	New Counter Request	2 item(s) requested from counter	f	2026-04-12 12:37:56.313995	2026-04-12 12:37:56.313995	REQUEST	1775975405523_Bpig	\N	NORMAL	f
64	1775978261741_heK8	1774884650471_Bcz0	New Order Received	New order created with 4 item(s)	f	2026-04-12 12:47:41.742626	2026-04-12 12:47:41.742626	ORDER	1775978261699_hpjb	\N	NORMAL	f
65	1775978261749_sEyV	1774883131477_sthc	Request Approved	4 request(s) approved	f	2026-04-12 12:47:41.749932	2026-04-12 12:47:41.749932	REQUEST	1775978261699_hpjb	\N	NORMAL	f
66	1775978261750_R1Le	1775975405538_cfG8	Request Approved	4 request(s) approved	f	2026-04-12 12:47:41.751403	2026-04-12 12:47:41.751403	REQUEST	1775978261699_hpjb	\N	NORMAL	f
67	1775978898793_RZlI	1774882974452_YOkW	Order Dispatched (OTP)	Order dispatched. OTP: 243490	f	2026-04-12 12:58:18.79459	2026-04-12 12:58:18.79459	CHALLAN	1775978898764_Jh6Y	\N	NORMAL	f
68	1775995013024_28W3	1774882974452_YOkW	New Counter Request	2 item(s) requested from counter	f	2026-04-12 17:26:53.025123	2026-04-12 17:26:53.025123	REQUEST	1775975405523_Bpig	\N	NORMAL	f
69	1775995056179_tkBu	1774884650471_Bcz0	New Order Received	New order created with 2 item(s)	f	2026-04-12 17:27:36.180344	2026-04-12 17:27:36.180344	ORDER	1775995056129_xuxa	\N	NORMAL	f
70	1775995056186_H6d2	1775975405538_cfG8	Request Approved	2 request(s) approved	f	2026-04-12 17:27:36.187516	2026-04-12 17:27:36.187516	REQUEST	1775995056129_xuxa	\N	NORMAL	f
71	1775995153267_RVdD	1774882974452_YOkW	Order Dispatched (OTP)	Order dispatched. OTP: 105127	f	2026-04-12 17:29:13.268021	2026-04-12 17:29:13.268021	CHALLAN	1775995153229_wJQD	\N	NORMAL	f
72	1776603081800_7FSi	1774882974452_YOkW	New Counter Request	2 item(s) requested from counter	f	2026-04-19 18:21:21.801261	2026-04-19 18:21:21.801261	REQUEST	1774883131475_B3JJ	\N	NORMAL	f
73	1776603147185_lzun	1774884650471_Bcz0	New Order Received	New order created with 2 item(s)	f	2026-04-19 18:22:27.18645	2026-04-19 18:22:27.18645	ORDER	1776603147138_4DFB	\N	NORMAL	f
74	1776603147192_feXE	1774883131477_sthc	Request Approved	2 request(s) approved	f	2026-04-19 18:22:27.193669	2026-04-19 18:22:27.193669	REQUEST	1776603147138_4DFB	\N	NORMAL	f
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: sms; Owner: postgres
--

COPY sms.order_items (id, row_id, order_id, sweet_id, quantity, cr_on, up_on, item_status, supplied_quantity, reject_reason, counter_id) FROM stdin;
1	1774970418600_nkZ6	1774970418598_pq9T	1774884554515_K6XD	11	2026-03-31 15:20:18.59196	2026-03-31 15:20:18.59196	PENDING	0	\N	\N
2	1774970418602_uROx	1774970418598_pq9T	1774884603377_3meD	90	2026-03-31 15:20:18.59196	2026-03-31 15:20:18.59196	PENDING	0	\N	\N
3	1774974336902_pQ8d	1774974336901_1VqZ	1774934395657_tidx	5	2026-03-31 16:25:36.896622	2026-03-31 16:25:36.896622	PENDING	0	\N	\N
4	1774976364575_WgQb	1774976364572_zgLA	1774934395657_tidx	1	2026-03-31 16:59:24.566882	2026-03-31 16:59:24.566882	PENDING	0	\N	\N
5	1775005765282_b91P	1775005765278_Ow2v	1775005681892_VySe	3	2026-04-01 01:09:25.19076	2026-04-01 01:09:25.19076	PENDING	0	\N	\N
6	1775034061737_j6bb	1775034061734_87Ou	1774884554515_K6XD	8	2026-04-01 09:01:01.727539	2026-04-01 09:01:01.727539	PENDING	0	\N	\N
7	1775063154121_YRE5	1775063154116_1T8M	1774884554515_K6XD	78	2026-04-01 17:05:54.10577	2026-04-01 17:05:54.10577	PENDING	0	\N	\N
10	1775378888100_BP1G	1775378888083_LTtT	1775005681892_VySe	15	2026-04-05 14:18:08.06501	2026-04-05 14:18:08.06501	ACCEPTED	12		\N
11	1775378888111_UXZ1	1775378888083_LTtT	1774884603377_3meD	20	2026-04-05 14:18:08.06501	2026-04-05 14:18:08.06501	REJECTED	10		\N
12	1775664792124_vTb9	1775664792111_z0R3	1775005681892_VySe	15	2026-04-08 21:43:12.095521	2026-04-08 21:43:12.095521	ACCEPTED	12		\N
13	1775664792134_5ZDD	1775664792111_z0R3	1774884603377_3meD	20	2026-04-08 21:43:12.095521	2026-04-08 21:43:12.095521	ACCEPTED	10		\N
14	1775744536126_Kl4B	1775744536111_XFHB	1775005681892_VySe	15	2026-04-09 19:52:16.090496	2026-04-09 19:52:16.090496	ACCEPTED	2		\N
15	1775744536137_F2vu	1775744536111_XFHB	1774884603377_3meD	20	2026-04-09 19:52:16.090496	2026-04-09 19:52:16.090496	ACCEPTED	1		\N
31	1775995056158_Gdyf	1775995056129_xuxa	1775977547223_QJFg	13	2026-04-12 17:27:36.113413	2026-04-12 17:27:36.113413	ACCEPTED	10		1775975405523_Bpig
30	1775995056143_dpfR	1775995056129_xuxa	1775977566799_zdA3	25	2026-04-12 17:27:36.113413	2026-04-12 17:27:36.113413	ACCEPTED	13		1775975405523_Bpig
32	1776603147153_0PV8	1776603147138_4DFB	1774884603377_3meD	25	2026-04-19 18:22:27.110824	2026-04-19 18:22:27.110824	PENDING	0	\N	1774883131475_B3JJ
33	1776603147169_a1bG	1776603147138_4DFB	1774884554515_K6XD	13	2026-04-19 18:22:27.110824	2026-04-19 18:22:27.110824	PENDING	0	\N	1774883131475_B3JJ
16	1775750009453_M50b	1775750009440_8Pqm	1775005681892_VySe	165	2026-04-09 21:23:29.42279	2026-04-09 21:23:29.42279	ACCEPTED	92		\N
17	1775750009463_PU01	1775750009440_8Pqm	1774884603377_3meD	720	2026-04-09 21:23:29.42279	2026-04-09 21:23:29.42279	ACCEPTED	71		\N
19	1775974190635_SDGw	1775974190588_YUJg	1774884603377_3meD	200	2026-04-12 11:39:50.554679	2026-04-12 11:39:50.554679	ACCEPTED	2		\N
18	1775974190616_pBie	1775974190588_YUJg	1775005681892_VySe	150	2026-04-12 11:39:50.554679	2026-04-12 11:39:50.554679	ACCEPTED	6		\N
21	1775975647921_CRf1	1775975647894_PROX	1774884603377_3meD	150	2026-04-12 12:04:07.868312	2026-04-12 12:04:07.868312	ACCEPTED	2		\N
20	1775975647908_D80F	1775975647894_PROX	1775005681892_VySe	120	2026-04-12 12:04:07.868312	2026-04-12 12:04:07.868312	ACCEPTED	6		\N
27	1775978261723_T5sI	1775978261699_hpjb	1774884603377_3meD	23	2026-04-12 12:47:41.680332	2026-04-12 12:47:41.680332	ACCEPTED	10		1774883131475_B3JJ
29	1775978261728_SQjU	1775978261699_hpjb	1775977547223_QJFg	13	2026-04-12 12:47:41.680332	2026-04-12 12:47:41.680332	ACCEPTED	13		1775975405523_Bpig
26	1775978261712_2UB0	1775978261699_hpjb	1775005681892_VySe	45	2026-04-12 12:47:41.680332	2026-04-12 12:47:41.680332	ACCEPTED	23		1774883131475_B3JJ
28	1775978261725_bGSz	1775978261699_hpjb	1775977566799_zdA3	25	2026-04-12 12:47:41.680332	2026-04-12 12:47:41.680332	ACCEPTED	5		1775975405523_Bpig
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: sms; Owner: postgres
--

COPY sms.orders (id, row_id, supplier_id, order_status, order_date, cr_on, up_on, shop_id) FROM stdin;
1	1774970418598_pq9T	1774884650469_lc1j	PENDING	2026-03-31 15:20:18.59196	2026-03-31 15:20:18.59196	2026-03-31 15:20:18.59196	1774882974450_fvRK
5	1775034061734_87Ou	1774884650469_lc1j	PENDING	2026-04-01 09:01:01.727539	2026-04-01 09:01:01.727539	2026-04-01 09:01:01.727539	1774882974450_fvRK
4	1775005765278_Ow2v	1774934591673_G1Ql	DISPATCHED	2026-04-01 01:09:25.19076	2026-04-01 01:09:25.19076	2026-04-01 01:09:25.19076	1774882974450_fvRK
3	1774976364572_zgLA	1774934591673_G1Ql	DISPATCHED	2026-03-31 16:59:24.566882	2026-03-31 16:59:24.566882	2026-03-31 16:59:24.566882	1774933113542_dAoT
2	1774974336901_1VqZ	1774934591673_G1Ql	DISPATCHED	2026-03-31 16:25:36.896622	2026-03-31 16:25:36.896622	2026-03-31 16:25:36.896622	1774933113542_dAoT
6	1775063154116_1T8M	1774934591673_G1Ql	DISPATCHED	2026-04-01 17:05:54.10577	2026-04-01 17:05:54.10577	2026-04-01 17:05:54.10577	1774882974450_fvRK
7	1775314637270_LA5O	1774934591673_G1Ql	DISPATCHED	2026-04-04 20:27:17.248333	2026-04-04 20:27:17.248333	2026-04-04 20:27:17.248333	1774882974450_fvRK
8	1775378888083_LTtT	1774934591673_G1Ql	DISPATCHED	2026-04-05 14:18:08.06501	2026-04-05 14:18:08.06501	2026-04-05 14:18:08.06501	1774882974450_fvRK
9	1775664792111_z0R3	1774934591673_G1Ql	DISPATCHED	2026-04-08 21:43:12.095521	2026-04-08 21:43:12.095521	2026-04-08 21:43:12.095521	1774882974450_fvRK
10	1775744536111_XFHB	1774934591673_G1Ql	ACCEPTED	2026-04-09 19:52:16.090496	2026-04-09 19:52:16.090496	2026-04-09 19:52:16.090496	1774882974450_fvRK
11	1775750009440_8Pqm	1774934591673_G1Ql	ACCEPTED	2026-04-09 21:23:29.42279	2026-04-09 21:23:29.42279	2026-04-09 21:23:29.42279	1774882974450_fvRK
12	1775974190588_YUJg	1774884650469_lc1j	ACCEPTED	2026-04-12 11:39:50.554679	2026-04-12 11:39:50.554679	2026-04-12 11:39:50.554679	1774882974450_fvRK
13	1775975647894_PROX	1774884650469_lc1j	DISPATCHED	2026-04-12 12:04:07.868312	2026-04-12 12:04:07.868312	2026-04-12 12:04:07.868312	1774882974450_fvRK
16	1775978261699_hpjb	1774884650469_lc1j	DISPATCHED	2026-04-12 12:47:41.680332	2026-04-12 12:47:41.680332	2026-04-12 12:47:41.680332	1774882974450_fvRK
17	1775995056129_xuxa	1774884650469_lc1j	DISPATCHED	2026-04-12 17:27:36.113413	2026-04-12 17:27:36.113413	2026-04-12 17:27:36.113413	1774882974450_fvRK
18	1776603147138_4DFB	1774884650469_lc1j	PENDING	2026-04-19 18:22:27.110824	2026-04-19 18:22:27.110824	2026-04-19 18:22:27.110824	1774882974450_fvRK
\.


--
-- Data for Name: returns; Type: TABLE DATA; Schema: sms; Owner: postgres
--

COPY sms.returns (id, row_id, order_id, sweet_id, quantity, reason, cr_on, up_on) FROM stdin;
\.


--
-- Data for Name: shops; Type: TABLE DATA; Schema: sms; Owner: postgres
--

COPY sms.shops (id, row_id, shop_name, address, cr_on, up_on, city, state, pincode, phone, email, is_active, gst_number, owner_name, logo_url) FROM stdin;
13	1774883076928_dJxe	test 2	test 2	2026-03-30 15:04:36.926445	2026-03-30 15:04:36.926445	jodhpur	rajeshtan	1234	9876543210	testshop2@gmail.com	t	8908	test 2 owner	
14	1774933113542_dAoT	Jodhpur Sweet Test	Sardarpura	2026-03-31 04:58:33.539224	2026-03-31 04:58:33.539224	Jodhpur	Rajasthan	342001	8888888888	mehul@gmail.com	t	ABCDE9999F1Z8	Mehul vyas	
15	1774972180389_NKbD	Sweet Palace	test new addess	2026-03-31 15:49:40.386761	2026-03-31 15:49:40.386761	jaipur	rajasthan	895609	8539674109	vijay@gmail.com	t	19088	vijay123	
16	1774972343337_97sh	test31	t	2026-03-31 15:52:23.33486	2026-03-31 15:52:23.33486	j	r	89	9088888888	56	t	78	testOwner31	
17	1775065625845_5aoe	test 4	Rajsthan	2026-04-01 17:47:05.843203	2026-04-01 17:47:05.843203	Jodhpur	Raj	342001	9858454454	harsh	t	123	raj	
12	1774882974450_fvRK	test 1	test address	2026-03-30 15:02:54.448828	2026-03-30 15:02:54.448828	test city	test state	8900	1234567890	t1estshop@gmail.com	t	5677gfghd	addd	
18	1776958788911_4QpL	Sharma Sweets 12	Main Market 12	2026-04-23 21:09:48.897174	2026-04-23 21:09:48.897174	Jaipur 12	Rajasthan 12	30200112	987684328012	shop@gmail12.com	t	08ABCDE1234F1Z512	Ramesh Sharma 12	
19	1776960450217_Z1Tz	Sharma Sweets 13	Main Market 12	2026-04-23 21:37:30.212296	2026-04-23 21:37:30.212296	Jaipur 12	Rajasthan 12	30200112	9876843212	shop@gmail13.com	t	08ABCDE1234F1Z512	Ramesh Sharma 12	
\.


--
-- Data for Name: stock_transactions; Type: TABLE DATA; Schema: sms; Owner: postgres
--

COPY sms.stock_transactions (id, row_id, counter_id, sweet_id, transaction_type, quantity, reference_id, notes, cr_on, up_on) FROM stdin;
1	1774885753242_O55x	1774883131475_B3JJ	1774884554515_K6XD	IN	1	3344	dd	2026-03-30 15:49:13.241911	2026-03-30 15:49:13.241911
3	1774885828207_gu1W	1774883131475_B3JJ	1774884554515_K6XD	OUT	1		ty	2026-03-30 15:50:28.205015	2026-03-30 15:50:28.205015
4	1774885886922_5T2Q	1774883131475_B3JJ	1774884554515_K6XD	ADJUST	10	null	ty	2026-03-30 15:51:26.921804	2026-03-30 15:51:26.921804
5	1774885928823_UtpB	1774883131475_B3JJ	1774884554515_K6XD	OUT	2		fs	2026-03-30 15:52:08.822927	2026-03-30 15:52:08.822927
6	1774886064101_vn7D	1774883131475_B3JJ	1774884554515_K6XD	IN	200	4	dsd	2026-03-30 15:54:24.10128	2026-03-30 15:54:24.10128
7	1774946649160_NJtF	1774933262679_vnmQ	1774934395657_tidx	IN	55	1	test	2026-03-31 08:44:09.157573	2026-03-31 08:44:09.157573
8	1774954288477_fQkO	1774933262679_vnmQ	1774934395657_tidx	IN	5	55		2026-03-31 10:51:28.473095	2026-03-31 10:51:28.473095
9	1774954396041_K54f	1774933262679_vnmQ	1774934395657_tidx	OUT	1		test	2026-03-31 10:53:16.03698	2026-03-31 10:53:16.03698
10	1774974099189_jRbr	1774972657465_xKrH	1774973412089_sx9Y	IN	10	1	kl	2026-03-31 16:21:39.187897	2026-03-31 16:21:39.187897
11	1774974721812_XUo1	1774972657465_xKrH	1774974325659_DV79	IN	89	9	8	2026-03-31 16:32:01.811006	2026-03-31 16:32:01.811006
12	1775317305447_totV	1774883131475_B3JJ	1775005681892_VySe	IN	30		New stock added	2026-04-04 21:11:45.448128	2026-04-04 21:11:45.448128
13	1775317399211_km4S	1774883131475_B3JJ	1775005681892_VySe	OUT	20		OUT stock 	2026-04-04 21:13:19.211742	2026-04-04 21:13:19.211742
14	1775317425187_FlAd	1774883131475_B3JJ	1775005681892_VySe	OUT	8		OUT stock 	2026-04-04 21:13:45.187583	2026-04-04 21:13:45.187583
16	1775367065135_9eS2	1774883131475_B3JJ	1775005681892_VySe	IN	8		IN stock 	2026-04-05 11:01:05.135359	2026-04-05 11:01:05.135359
25	1775666889327_I03q	1774883131475_B3JJ	1775005681892_VySe	IN	12	1775666889282_MtqY	Stock added via chalan	2026-04-08 22:18:09.273247	2026-04-08 22:18:09.273247
26	1775666889343_CZh4	1774883131475_B3JJ	1774884603377_3meD	IN	10	1775666889282_MtqY	Stock added via chalan	2026-04-08 22:18:09.273247	2026-04-08 22:18:09.273247
27	1775667457752_FntR	1774883131475_B3JJ	1774884603377_3meD	IN	10	1775667457701_EZwK	Stock added via chalan	2026-04-08 22:27:37.691515	2026-04-08 22:27:37.691515
28	1775667457764_vKrY	1774883131475_B3JJ	1775005681892_VySe	IN	12	1775667457701_EZwK	Stock added via chalan	2026-04-08 22:27:37.691515	2026-04-08 22:27:37.691515
29	1775745079701_hhBr	1774883131475_B3JJ	1774884603377_3meD	IN	1	1775744642583_hahJ	Verified stock	2026-04-09 20:01:19.66455	2026-04-09 20:01:19.66455
30	1775745079717_cU4Q	1774883131475_B3JJ	1775005681892_VySe	IN	2	1775744642583_hahJ	Verified stock	2026-04-09 20:01:19.66455	2026-04-09 20:01:19.66455
31	1775975054789_vzOs	1774883131475_B3JJ	1774884603377_3meD	IN	10	1775974840901_8SpJ	Verified stock	2026-04-12 11:54:14.758201	2026-04-12 11:54:14.758201
32	1775975054803_2NFc	1774883131475_B3JJ	1775005681892_VySe	IN	12	1775974840901_8SpJ	Verified stock	2026-04-12 11:54:14.758201	2026-04-12 11:54:14.758201
33	1775995977988_8pQw	1775975405523_Bpig	1775977547223_QJFg	IN	10	1775995153229_wJQD	Verified stock	2026-04-12 17:42:57.933841	2026-04-12 17:42:57.933841
34	1775995977997_vthE	1775975405523_Bpig	1775977566799_zdA3	IN	13	1775995153229_wJQD	Verified stock	2026-04-12 17:42:57.933841	2026-04-12 17:42:57.933841
35	1775998100942_kGHo	1775975405523_Bpig	1775977547223_QJFg	IN	10	1775995153229_wJQD	Verified stock	2026-04-12 18:18:20.899402	2026-04-12 18:18:20.899402
36	1775998100957_i3Gw	1775975405523_Bpig	1775977566799_zdA3	IN	13	1775995153229_wJQD	Verified stock	2026-04-12 18:18:20.899402	2026-04-12 18:18:20.899402
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: sms; Owner: postgres
--

COPY sms.suppliers (id, row_id, supplier_name, phone, email, address, cr_on, up_on) FROM stdin;
9	1774884650469_lc1j	test 1 supplier	8965743210	test1@gmail.com	test 2	2026-03-30 15:30:50.469121	2026-03-30 15:30:50.469121
10	1774884672074_YTNJ	test 2	5698743210	test2@gmail.com	test 2	2026-03-30 15:31:12.073761	2026-03-30 15:31:12.073761
11	1774934591673_G1Ql	new supplier 123	59990000210	supplier@gmail.com	address test	2026-03-31 05:23:11.669755	2026-03-31 05:23:11.669755
12	1776961618829_lQXi	Milk Supplier 12	99999999912	milk@supplier12.com	Jaipur 22	2026-04-23 21:56:58.827915	2026-04-23 21:58:24.821881
\.


--
-- Data for Name: sweets; Type: TABLE DATA; Schema: sms; Owner: postgres
--

COPY sms.sweets (id, row_id, category_id, sweet_name, shelf_life_days, cr_on, up_on, unit, price, description, image_url, is_active, counter_id, return_type, shop_id) FROM stdin;
14	1774884554515_K6XD	1774883355385_9SQW	sweets 1	4	2026-03-30 15:29:14.515774	2026-03-30 15:29:14.515774	kg	789.00	kl		t	1774883131475_B3JJ	RETURNABLE	1774882974450_fvRK
15	1774884603377_3meD	1774883329522_EnyE	sweets 2	1	2026-03-30 15:30:03.378236	2026-03-30 15:30:03.378236	kg	22.00	dd		t	1774883131475_B3JJ	RETURNABLE	1774882974450_fvRK
16	1774934395657_tidx	1774933532920_dKPK	Roshogolla	4	2026-03-31 05:19:55.65778	2026-03-31 05:19:55.65778	kg	450.00	Test	uploads/ShopMedia/1774934094918_anime1.jpg	t	1774933262679_vnmQ	RETURNABLE	1774933113542_dAoT
17	1774973098134_Lqlr	1774972830542_Y8pS	test sweets	8	2026-03-31 16:04:58.137795	2026-03-31 16:04:58.137795	kg	8000.00	i	uploads/ShopMedia/1774973091086_dashboard .png	t	1774972657465_xKrH	NON-RETURNABLE	1774972180389_NKbD
18	1774973412089_sx9Y	1774973352330_GJ1a	hello	8	2026-03-31 16:10:12.088783	2026-03-31 16:10:12.088783	kg	90.00	io	uploads/ShopMedia/1774973409268_dashboard .png	t	1774972657465_xKrH	NON-RETURNABLE	1774972180389_NKbD
19	1774974325659_DV79	1774972830542_Y8pS	uio	9	2026-03-31 16:25:25.658781	2026-03-31 16:25:25.658781	kg	90.00	9	uploads/ShopMedia/1774974319365_dashboard .png	t	1774972657465_xKrH	NON-RETURNABLE	1774972180389_NKbD
20	1775005681892_VySe	1774883355385_9SQW	sweets 3	2	2026-04-01 01:08:01.893356	2026-04-01 01:08:01.893356	kg	56.00	test a	uploads/ShopMedia/1775005678896_dashboard .png	t	1774883131475_B3JJ	RETURNABLE	1774882974450_fvRK
21	1775977547223_QJFg	1775977386976_2TU9	Kaju Katli	10	2026-04-12 12:35:47.224589	2026-04-12 12:35:47.224589	KG	850.00	kkl		t	1775975405523_Bpig	NONE	1774882974450_fvRK
22	1775977566799_zdA3	1775977386976_2TU9	tyu Kaju Katli uiiii	1	2026-04-12 12:36:06.800903	2026-04-12 12:36:06.800903	KG	850.00	kkl		t	1775975405523_Bpig	NONE	1774882974450_fvRK
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: sms; Owner: postgres
--

COPY sms.users (id, row_id, name, email, phone, password, role, counter_id, cr_on, up_on, shop_id, supplier_id) FROM stdin;
21	1774883076929_kYI2	test 2 owner	testshop2@gmail.com	9876543210	1234	SHOP_ADMIN	\N	2026-03-30 15:04:36.926445	2026-03-30 15:04:36.926445	1774883076928_dJxe	\N
23	1774883226449_EWn2	staff 2	staff2@gmail.com	4569871230	1234	COUNTER_USER	1774883226448_zcpD	2026-03-30 15:07:06.446499	2026-03-30 15:07:06.446499	1774883076928_dJxe	\N
24	1774884650471_Bcz0	test 1 supplier	test1@gmail.com	8965743210	1234	SUPPLIER	\N	2026-03-30 15:30:50.469121	2026-03-30 15:30:50.469121	\N	1774884650469_lc1j
25	1774884672075_Jhzy	test 2	test2@gmail.com	5698743210	1234	SUPPLIER	\N	2026-03-30 15:31:12.073761	2026-03-30 15:31:12.073761	\N	1774884672074_YTNJ
26	1774933113545_uPXd	Mehul vyas	mehul@gmail.com	8888888888	1234	SHOP_ADMIN	\N	2026-03-31 04:58:33.539224	2026-03-31 04:58:33.539224	1774933113542_dAoT	\N
27	1774933262680_y0bS	Raj	raj@gmail.com	7777777777	1234	COUNTER_USER	1774933262679_vnmQ	2026-03-31 05:01:02.675509	2026-03-31 05:01:02.675509	1774933113542_dAoT	\N
29	1774964290222_HJEa	ravi	ravi@gmail.com	1111111111	1234	COUNTER_USER	1774964290220_fRFc	2026-03-31 13:38:10.215632	2026-03-31 13:38:10.215632	1774933113542_dAoT	\N
30	1774972180393_VyKp	vijay123	vijay@gmail.com	8539674109	1234	SHOP_ADMIN	\N	2026-03-31 15:49:40.386761	2026-03-31 15:49:40.386761	1774972180389_NKbD	\N
31	1774972343338_nZK0	testOwner31	56	9088888888	1234	SHOP_ADMIN	\N	2026-03-31 15:52:23.33486	2026-03-31 15:52:23.33486	1774972343337_97sh	\N
32	1774972657467_dzSu	person 1 staff	staff1@gmai.com	7890000000	1234	COUNTER_USER	1774972657465_xKrH	2026-03-31 15:57:37.463496	2026-03-31 15:57:37.463496	1774972180389_NKbD	\N
33	1774974460772_CS0V	staff34	staff34@gmail.com	2310000000	1234	COUNTER_USER	1774974460767_e5sF	2026-03-31 16:27:40.765163	2026-03-31 16:27:40.765163	1774972180389_NKbD	\N
34	1774975183325_lUqi	ff	fdsfd@gmail.com	7698475453	1234	COUNTER_USER	1774975183324_LV6Q	2026-03-31 16:39:43.322313	2026-03-31 16:39:43.322313	1774933113542_dAoT	\N
35	1775065625848_SieJ	raj	harsh	9858454454	1234	SHOP_ADMIN	\N	2026-04-01 17:47:05.843203	2026-04-01 17:47:05.843203	1775065625845_5aoe	\N
37	1776958788921_E9yA	Ramesh Sharma 12	shop@gmail12.com	987684328012	123412	SHOP_ADMIN	\N	2026-04-23 21:09:48.897174	2026-04-23 21:36:11.347576	1776958788911_4QpL	\N
38	1776960450231_KYtj	Ramesh Sharma 12	shop@gmail13.com	9876843212	123412	SHOP_ADMIN	\N	2026-04-23 21:37:30.212296	2026-04-23 21:37:30.212296	1776960450217_Z1Tz	\N
39	1776960751352_xgel	Ravi 12	c1ounter9@test.com12	187654329012	12345612	COUNTER_USER	1776960751329_C0nT	2026-04-23 21:42:31.328051	2026-04-23 21:44:13.210692	1776958788911_4QpL	\N
41	1776961618846_w0t3	Milk Supplier 12	milk@supplier12.com	99999999912	1234562	SUPPLIER	\N	2026-04-23 21:56:58.827915	2026-04-23 21:58:24.821881	\N	1776961618829_lQXi
28	1774934591675_uLac	test supplier 111	supplier@gmail.com	59990000210	1234	SUPPLIER	\N	2026-03-31 05:23:11.669755	2026-03-31 05:23:11.669755	\N	1774934591673_G1Ql
22	1774883131477_sthc	test staff 111	staff1@gmail.com	5678943210	1234	COUNTER_USER	1774883131475_B3JJ	2026-03-30 15:05:31.474349	2026-03-30 15:05:31.474349	1774882974450_fvRK	\N
20	1774882974452_YOkW	test 1owner	t1estshop@gmail.com	1234567890	1234	SHOP_ADMIN	\N	2026-03-30 15:02:54.448828	2026-03-30 15:02:54.448828	1774882974450_fvRK	\N
36	1775975405538_cfG8	Ravi	c1ounter@test.com	1876543210	1234	COUNTER_USER	1775975405523_Bpig	2026-04-12 12:00:05.522832	2026-04-12 12:00:05.522832	1774882974450_fvRK	\N
1	1773576248141_czEK	test 1owner	t2estshop@gmail.com	9999999999	123456	ADMIN	0	2026-03-15 17:34:08.143202	2026-03-15 17:34:08.143202	\N	\N
\.


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: sms; Owner: postgres
--

SELECT pg_catalog.setval('sms.audit_logs_id_seq', 1, false);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: sms; Owner: postgres
--

SELECT pg_catalog.setval('sms.categories_id_seq', 17, true);


--
-- Name: chalan_items_id_seq; Type: SEQUENCE SET; Schema: sms; Owner: postgres
--

SELECT pg_catalog.setval('sms.chalan_items_id_seq', 14, true);


--
-- Name: chalans_id_seq; Type: SEQUENCE SET; Schema: sms; Owner: postgres
--

SELECT pg_catalog.setval('sms.chalans_id_seq', 18, true);


--
-- Name: counter_requests_id_seq; Type: SEQUENCE SET; Schema: sms; Owner: postgres
--

SELECT pg_catalog.setval('sms.counter_requests_id_seq', 51, true);


--
-- Name: counters_id_seq; Type: SEQUENCE SET; Schema: sms; Owner: postgres
--

SELECT pg_catalog.setval('sms.counters_id_seq', 19, true);


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: sms; Owner: postgres
--

SELECT pg_catalog.setval('sms.departments_id_seq', 24, true);


--
-- Name: expiry_logs_id_seq; Type: SEQUENCE SET; Schema: sms; Owner: postgres
--

SELECT pg_catalog.setval('sms.expiry_logs_id_seq', 1, false);


--
-- Name: expiry_logs_id_seq1; Type: SEQUENCE SET; Schema: sms; Owner: postgres
--

SELECT pg_catalog.setval('sms.expiry_logs_id_seq1', 5, true);


--
-- Name: inventory_id_seq; Type: SEQUENCE SET; Schema: sms; Owner: postgres
--

SELECT pg_catalog.setval('sms.inventory_id_seq', 13, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: sms; Owner: postgres
--

SELECT pg_catalog.setval('sms.notifications_id_seq', 74, true);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: sms; Owner: postgres
--

SELECT pg_catalog.setval('sms.order_items_id_seq', 33, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: sms; Owner: postgres
--

SELECT pg_catalog.setval('sms.orders_id_seq', 18, true);


--
-- Name: returns_id_seq; Type: SEQUENCE SET; Schema: sms; Owner: postgres
--

SELECT pg_catalog.setval('sms.returns_id_seq', 1, false);


--
-- Name: shops_id_seq; Type: SEQUENCE SET; Schema: sms; Owner: postgres
--

SELECT pg_catalog.setval('sms.shops_id_seq', 19, true);


--
-- Name: stock_transactions_id_seq; Type: SEQUENCE SET; Schema: sms; Owner: postgres
--

SELECT pg_catalog.setval('sms.stock_transactions_id_seq', 36, true);


--
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: sms; Owner: postgres
--

SELECT pg_catalog.setval('sms.suppliers_id_seq', 12, true);


--
-- Name: sweets_id_seq; Type: SEQUENCE SET; Schema: sms; Owner: postgres
--

SELECT pg_catalog.setval('sms.sweets_id_seq', 22, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: sms; Owner: postgres
--

SELECT pg_catalog.setval('sms.users_id_seq', 41, true);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (row_id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (row_id);


--
-- Name: chalan_items chalan_items_pkey; Type: CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.chalan_items
    ADD CONSTRAINT chalan_items_pkey PRIMARY KEY (row_id);


--
-- Name: chalans chalans_pkey; Type: CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.chalans
    ADD CONSTRAINT chalans_pkey PRIMARY KEY (row_id);


--
-- Name: counter_requests counter_requests_pkey; Type: CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.counter_requests
    ADD CONSTRAINT counter_requests_pkey PRIMARY KEY (row_id);


--
-- Name: counters counters_pkey; Type: CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.counters
    ADD CONSTRAINT counters_pkey PRIMARY KEY (row_id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (row_id);


--
-- Name: expiry_logs expiry_logs_pkey; Type: CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.expiry_logs
    ADD CONSTRAINT expiry_logs_pkey PRIMARY KEY (row_id);


--
-- Name: inventory inventory_counter_id_sweet_id_key; Type: CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.inventory
    ADD CONSTRAINT inventory_counter_id_sweet_id_key UNIQUE (counter_id, sweet_id);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (row_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (row_id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (row_id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (row_id);


--
-- Name: returns returns_pkey; Type: CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.returns
    ADD CONSTRAINT returns_pkey PRIMARY KEY (row_id);


--
-- Name: shops shops_pkey; Type: CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.shops
    ADD CONSTRAINT shops_pkey PRIMARY KEY (row_id);


--
-- Name: stock_transactions stock_transactions_pkey; Type: CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.stock_transactions
    ADD CONSTRAINT stock_transactions_pkey PRIMARY KEY (row_id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (row_id);


--
-- Name: sweets sweets_pkey; Type: CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.sweets
    ADD CONSTRAINT sweets_pkey PRIMARY KEY (row_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (row_id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES sms.users(row_id);


--
-- Name: categories categories_department_id_fkey; Type: FK CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.categories
    ADD CONSTRAINT categories_department_id_fkey FOREIGN KEY (department_id) REFERENCES sms.departments(row_id);


--
-- Name: chalan_items chalan_items_chalan_id_fkey; Type: FK CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.chalan_items
    ADD CONSTRAINT chalan_items_chalan_id_fkey FOREIGN KEY (chalan_id) REFERENCES sms.chalans(row_id) ON DELETE CASCADE;


--
-- Name: chalan_items chalan_items_sweet_id_fkey; Type: FK CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.chalan_items
    ADD CONSTRAINT chalan_items_sweet_id_fkey FOREIGN KEY (sweet_id) REFERENCES sms.sweets(row_id);


--
-- Name: chalans chalans_order_id_fkey; Type: FK CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.chalans
    ADD CONSTRAINT chalans_order_id_fkey FOREIGN KEY (order_id) REFERENCES sms.orders(row_id);


--
-- Name: chalans chalans_supplier_id_fkey; Type: FK CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.chalans
    ADD CONSTRAINT chalans_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES sms.suppliers(row_id);


--
-- Name: counter_requests counter_requests_counter_id_fkey; Type: FK CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.counter_requests
    ADD CONSTRAINT counter_requests_counter_id_fkey FOREIGN KEY (counter_id) REFERENCES sms.counters(row_id);


--
-- Name: counter_requests counter_requests_sweet_id_fkey; Type: FK CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.counter_requests
    ADD CONSTRAINT counter_requests_sweet_id_fkey FOREIGN KEY (sweet_id) REFERENCES sms.sweets(row_id);


--
-- Name: counters counters_shop_id_fkey; Type: FK CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.counters
    ADD CONSTRAINT counters_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES sms.shops(row_id) ON DELETE CASCADE;


--
-- Name: departments departments_shop_id_fkey; Type: FK CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.departments
    ADD CONSTRAINT departments_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES sms.shops(row_id);


--
-- Name: expiry_logs expiry_logs_counter_id_fkey; Type: FK CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.expiry_logs
    ADD CONSTRAINT expiry_logs_counter_id_fkey FOREIGN KEY (counter_id) REFERENCES sms.counters(row_id);


--
-- Name: expiry_logs expiry_logs_sweet_id_fkey; Type: FK CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.expiry_logs
    ADD CONSTRAINT expiry_logs_sweet_id_fkey FOREIGN KEY (sweet_id) REFERENCES sms.sweets(row_id);


--
-- Name: inventory inventory_counter_id_fkey; Type: FK CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.inventory
    ADD CONSTRAINT inventory_counter_id_fkey FOREIGN KEY (counter_id) REFERENCES sms.counters(row_id);


--
-- Name: inventory inventory_sweet_id_fkey; Type: FK CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.inventory
    ADD CONSTRAINT inventory_sweet_id_fkey FOREIGN KEY (sweet_id) REFERENCES sms.sweets(row_id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES sms.users(row_id);


--
-- Name: order_items order_items_counter_id_fkey; Type: FK CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.order_items
    ADD CONSTRAINT order_items_counter_id_fkey FOREIGN KEY (counter_id) REFERENCES sms.counters(row_id);


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES sms.orders(row_id) ON DELETE CASCADE;


--
-- Name: order_items order_items_sweet_id_fkey; Type: FK CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.order_items
    ADD CONSTRAINT order_items_sweet_id_fkey FOREIGN KEY (sweet_id) REFERENCES sms.sweets(row_id);


--
-- Name: orders orders_shop_id_fkey; Type: FK CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.orders
    ADD CONSTRAINT orders_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES sms.shops(row_id);


--
-- Name: orders orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.orders
    ADD CONSTRAINT orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES sms.suppliers(row_id);


--
-- Name: returns returns_order_id_fkey; Type: FK CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.returns
    ADD CONSTRAINT returns_order_id_fkey FOREIGN KEY (order_id) REFERENCES sms.orders(row_id);


--
-- Name: returns returns_sweet_id_fkey; Type: FK CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.returns
    ADD CONSTRAINT returns_sweet_id_fkey FOREIGN KEY (sweet_id) REFERENCES sms.sweets(row_id);


--
-- Name: stock_transactions stock_transactions_counter_id_fkey; Type: FK CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.stock_transactions
    ADD CONSTRAINT stock_transactions_counter_id_fkey FOREIGN KEY (counter_id) REFERENCES sms.counters(row_id);


--
-- Name: stock_transactions stock_transactions_sweet_id_fkey; Type: FK CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.stock_transactions
    ADD CONSTRAINT stock_transactions_sweet_id_fkey FOREIGN KEY (sweet_id) REFERENCES sms.sweets(row_id);


--
-- Name: sweets sweets_category_id_fkey; Type: FK CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.sweets
    ADD CONSTRAINT sweets_category_id_fkey FOREIGN KEY (category_id) REFERENCES sms.categories(row_id);


--
-- Name: sweets sweets_counter_id_fkey; Type: FK CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.sweets
    ADD CONSTRAINT sweets_counter_id_fkey FOREIGN KEY (counter_id) REFERENCES sms.counters(row_id);


--
-- Name: users users_shop_id_fkey; Type: FK CONSTRAINT; Schema: sms; Owner: postgres
--

ALTER TABLE ONLY sms.users
    ADD CONSTRAINT users_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES sms.shops(row_id);


--
-- PostgreSQL database dump complete
--

\unrestrict IA4SbpotAkMFVxA07dqWsRFaWcasqkoanAaIMJ8Hu6416lZggD6DK6fazAY3Mxw

