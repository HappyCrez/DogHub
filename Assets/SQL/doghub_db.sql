--
-- PostgreSQL database dump
--

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

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
-- Name: application_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.application_status AS ENUM (
    'IN_PROGRESS',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public.application_status OWNER TO postgres;

--
-- Name: program_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.program_type AS ENUM (
    'PERSONAL',
    'GROUP'
);


ALTER TYPE public.program_type OWNER TO postgres;

--
-- Name: service_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.service_status AS ENUM (
    'REQUESTED',
    'SCHEDULED',
    'DONE',
    'CANCELED'
);


ALTER TYPE public.service_status OWNER TO postgres;

--
-- Name: sex_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.sex_enum AS ENUM (
    'M',
    'F'
);


ALTER TYPE public.sex_enum OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: application; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.application (
    id integer NOT NULL,
    submitted_at timestamp without time zone NOT NULL,
    contract_date timestamp without time zone,
    contract_number character varying(50),
    status public.application_status NOT NULL,
    member_id integer NOT NULL
);


ALTER TABLE public.application OWNER TO postgres;

--
-- Name: application_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.application_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.application_id_seq OWNER TO postgres;

--
-- Name: application_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.application_id_seq OWNED BY public.application.id;


--
-- Name: dog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dog (
    id integer NOT NULL,
    member_id integer NOT NULL,
    name character varying(120) NOT NULL,
    breed character varying(120) NOT NULL,
    sex public.sex_enum NOT NULL,
    birth_date date,
    chip_number character varying(64),
    photo text,
    bio text,
    tags text[]
);


ALTER TABLE public.dog OWNER TO postgres;

--
-- Name: dog_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dog_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dog_id_seq OWNER TO postgres;

--
-- Name: dog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dog_id_seq OWNED BY public.dog.id;


--
-- Name: dog_service; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dog_service (
    id integer NOT NULL,
    dog_id integer NOT NULL,
    service_type_id integer NOT NULL,
    requested_at timestamp without time zone NOT NULL,
    performed_at timestamp without time zone,
    price numeric(10,2),
    status public.service_status NOT NULL,
    service_name character varying(200)
);


ALTER TABLE public.dog_service OWNER TO postgres;

--
-- Name: dog_service_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dog_service_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dog_service_id_seq OWNER TO postgres;

--
-- Name: dog_service_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dog_service_id_seq OWNED BY public.dog_service.id;


--
-- Name: event; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event (
    id integer NOT NULL,
    title character varying(200) NOT NULL,
    category character varying(80) NOT NULL,
    start_at timestamp without time zone NOT NULL,
    end_at timestamp without time zone,
    venue character varying(200) NOT NULL,
    price numeric(10,2),
    description text
);


ALTER TABLE public.event OWNER TO postgres;

--
-- Name: event_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.event_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_id_seq OWNER TO postgres;

--
-- Name: event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.event_id_seq OWNED BY public.event.id;


--
-- Name: event_registration; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_registration (
    id integer NOT NULL,
    event_id integer NOT NULL,
    member_id integer,
    dog_id integer,
    registered_at timestamp without time zone NOT NULL
);


ALTER TABLE public.event_registration OWNER TO postgres;

--
-- Name: event_registration_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.event_registration_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_registration_id_seq OWNER TO postgres;

--
-- Name: event_registration_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.event_registration_id_seq OWNED BY public.event_registration.id;


--
-- Name: member; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.member (
    id integer NOT NULL,
    full_name character varying(200) NOT NULL,
    phone character varying(50),
    email character varying(150),
    city character varying(50),
    avatar_url text,
    bio text,
    join_date date,
    membership_end_date date,
    role character varying(40) NOT NULL,
    password_hash text
);


ALTER TABLE public.member OWNER TO postgres;

--
-- Name: member_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.member_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.member_id_seq OWNER TO postgres;

--
-- Name: member_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.member_id_seq OWNED BY public.member.id;


--
-- Name: payment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment (
    id integer NOT NULL,
    member_id integer NOT NULL,
    payment_type_id integer NOT NULL,
    paid_at timestamp without time zone NOT NULL,
    receipt_number character varying(40),
    amount numeric(10,2) NOT NULL
);


ALTER TABLE public.payment OWNER TO postgres;

--
-- Name: payment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_id_seq OWNER TO postgres;

--
-- Name: payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_id_seq OWNED BY public.payment.id;


--
-- Name: payment_type; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_type (
    id integer NOT NULL,
    name character varying(80) NOT NULL
);


ALTER TABLE public.payment_type OWNER TO postgres;

--
-- Name: payment_type_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_type_id_seq OWNER TO postgres;

--
-- Name: payment_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_type_id_seq OWNED BY public.payment_type.id;


--
-- Name: program; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.program (
    id integer NOT NULL,
    title character varying(200) NOT NULL,
    type public.program_type NOT NULL,
    price numeric(10,2),
    description text
);


ALTER TABLE public.program OWNER TO postgres;

--
-- Name: program_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.program_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.program_id_seq OWNER TO postgres;

--
-- Name: program_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.program_id_seq OWNED BY public.program.id;


--
-- Name: program_registration; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.program_registration (
    id integer NOT NULL,
    program_id integer NOT NULL,
    dog_id integer NOT NULL,
    registered_at timestamp without time zone NOT NULL
);


ALTER TABLE public.program_registration OWNER TO postgres;

--
-- Name: program_registration_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.program_registration_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.program_registration_id_seq OWNER TO postgres;

--
-- Name: program_registration_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.program_registration_id_seq OWNED BY public.program_registration.id;


--
-- Name: program_session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.program_session (
    id integer NOT NULL,
    program_id integer NOT NULL,
    session_datetime timestamp without time zone NOT NULL,
    duration_min integer,
    attendance integer,
    location character varying(200) NOT NULL,
    description text
);


ALTER TABLE public.program_session OWNER TO postgres;

--
-- Name: program_session_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.program_session_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.program_session_id_seq OWNER TO postgres;

--
-- Name: program_session_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.program_session_id_seq OWNED BY public.program_session.id;


--
-- Name: service_type; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.service_type (
    id integer NOT NULL,
    name character varying(120) NOT NULL
);


ALTER TABLE public.service_type OWNER TO postgres;

--
-- Name: service_type_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.service_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.service_type_id_seq OWNER TO postgres;

--
-- Name: service_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.service_type_id_seq OWNED BY public.service_type.id;


--
-- Name: application id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application ALTER COLUMN id SET DEFAULT nextval('public.application_id_seq'::regclass);


--
-- Name: dog id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dog ALTER COLUMN id SET DEFAULT nextval('public.dog_id_seq'::regclass);


--
-- Name: dog_service id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dog_service ALTER COLUMN id SET DEFAULT nextval('public.dog_service_id_seq'::regclass);


--
-- Name: event id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event ALTER COLUMN id SET DEFAULT nextval('public.event_id_seq'::regclass);


--
-- Name: event_registration id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_registration ALTER COLUMN id SET DEFAULT nextval('public.event_registration_id_seq'::regclass);


--
-- Name: member id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.member ALTER COLUMN id SET DEFAULT nextval('public.member_id_seq'::regclass);


--
-- Name: payment id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment ALTER COLUMN id SET DEFAULT nextval('public.payment_id_seq'::regclass);


--
-- Name: payment_type id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_type ALTER COLUMN id SET DEFAULT nextval('public.payment_type_id_seq'::regclass);


--
-- Name: program id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program ALTER COLUMN id SET DEFAULT nextval('public.program_id_seq'::regclass);


--
-- Name: program_registration id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program_registration ALTER COLUMN id SET DEFAULT nextval('public.program_registration_id_seq'::regclass);


--
-- Name: program_session id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program_session ALTER COLUMN id SET DEFAULT nextval('public.program_session_id_seq'::regclass);


--
-- Name: service_type id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_type ALTER COLUMN id SET DEFAULT nextval('public.service_type_id_seq'::regclass);


--
-- Data for Name: application; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.application (id, submitted_at, contract_date, contract_number, status, member_id) FROM stdin;
\.


--
-- Data for Name: dog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.dog (id, member_id, name, breed, sex, birth_date, chip_number, photo, bio, tags) FROM stdin;
1	4	Лаки	Лабрадор	M	2023-09-20	985111111111111	https://i.pinimg.com/736x/2d/5c/1c/2d5c1c3d6e8d39f94a12c2a1ccbd6bfa.jpg	Обожает вкусности и мячики.	{дружелюбный,игривый}
2	2	Альфа	Хаски	F	2024-05-20	985111111111112	https://i.pinimg.com/736x/ab/55/a2/ab55a2098c49e2b52c8d9da0419e5904.jpg	Нужны долгие прогулки.	{энергичная,говорун}
3	1	Бакс	Бульдог	M	2022-07-20	985111111111113	https://i.pinimg.com/736x/87/05/84/8705849db4f8538954070e6d205f5f69.jpg	Любит дремать на солнце.	{спокойный,домосед}
4	1	Белла	Бигль	F	2024-09-20	985111111111114	https://i.pinimg.com/1200x/8a/ef/5f/8aef5f12ba8fedba1e901b9ee09b8dc7.jpg	Делает трюки за угощение.	{нюхач,ласковая}
5	2	Рэкс	Овчарка	M	2023-05-20	985111111111115	https://i.pinimg.com/736x/d8/ad/22/d8ad223a330282d0cc888c7790ff0004.jpg	Идеален для соревнований.	{умный,обучаемый}
6	3	Дейзи	Пудель	F	2024-01-20	\N	https://i.pinimg.com/736x/5e/49/31/5e493149700f50704293733183d5b54d.jpg	Легко обучается трюкам.	{сообразительная,игривая}
7	3	Миша	Метис	M	2025-01-20	\N	https://i.pinimg.com/736x/71/19/f1/7119f17fa5078e3441d496a7147750a3.jpg	Ищет друзей для игр.	{щенок,ласковый}
8	11	Нора	Метис	F	2021-04-20	985111111111118	https://i.pinimg.com/736x/e9/d5/b6/e9d5b63d900ebbb93f13b1c97000e5a2.jpg	Очень дружелюбная к детям.	{спасённая,терпеливая}
9	5	Бим	Кокер-спаниель	M	2021-11-20	\N	https://dog-hub.ru/Dogs/bim.jpg	Самый лучший и заботливый друг.	{активный,весёлый}
11	10	Мартин	Метис	M	2020-11-24	\N	https://dog-hub.ru/Dogs/martinn.jpg	Спокойный метис Мартин, любит долгие прогулки и игры с мячом.	{спокойный,дружелюбный,игривый}
10	12	Бекон	Корги	M	2021-11-24	985111111111119	http://dog-hub.ru/Dogs/bekon.jpg	Энергичный корги по кличке Бекон.	{активный,дружелюбный,"любит музыку"}
\.


--
-- Data for Name: dog_service; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.dog_service (id, dog_id, service_type_id, requested_at, performed_at, price, status, service_name) FROM stdin;
\.


--
-- Data for Name: event; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event (id, title, category, start_at, end_at, venue, price, description) FROM stdin;
1	Осенний клубный митап	Митап	2025-11-02 17:00:00	2025-11-02 19:00:00	Парк Изумрудный	0.00	Неформальные игры, общение и фото.
2	Тренировка по аджилити	Тренировка	2025-11-09 16:30:00	2025-11-09 18:00:00	Площадка «ДогПро»	800.00	Барьеры, тоннели, снаряды. Инструктор Тимофей.
3	Mini Dog Show	Шоу	2025-12-06 18:00:00	2025-12-06 20:00:00	КЦ «Зоомир»	500.00	Показательные выступления и конкурсы.
4	Митап щенков	Митап	2025-10-12 17:00:00	2025-10-12 19:00:00	Сквер у набережной	0.00	Социализация для самых юных хвостиков.
5	Тренировка послушания	Тренировка	2025-10-18 15:00:00	2025-10-18 17:00:00	Школа «ХвостAcademy»	900.00	Базовые команды, развитие выдержки в условиях отвлекающих факторов.
6	Фотосессия клуба	Митап	2025-11-23 19:00:00	2025-11-23 21:00:00	Ботанический сад	300.00	Групповые и личные фото, осенние декорации.
7	Лекция: первая помощь собаке	Образование	2025-11-15 18:30:00	2025-11-15 20:30:00	Коворкинг «DogHub Space»	700.00	Разбор частых неотложных ситуаций и базовых действий до визита к ветеринару.
8	Семинар: коммуникция и язык тела собаки	Образование	2025-10-26 18:00:00	2025-10-26 20:00:00	КЦ «Зоомир»	600.00	Как читать сигналы собаки, предотвращать конфликты и снижать стресс на прогулках.
9	Воркшоп: жизнь с собакой в городе	Образование	2025-11-27 19:00:00	2025-11-27 21:00:00	Школа «ХвостAcademy»	900.00	Маршруты прогулок, транспорт, лифты, встречи с людьми и другими собаками.
10	Курс для новичков: ответственный владелец	Образование	2025-12-04 18:00:00	2025-12-04 20:00:00	Онлайн (платформа DogHub)	1200.00	Комплексный разбор ухода, воспитания и безопасности для новых владельцев собак.
11	Конкурс костюмов для собак	Конкурс	2025-11-03 18:00:00	2025-11-03 20:00:00	КЦ «Зоомир»	400.00	Тематический конкурс костюмов, призы за самый креативный образ и парные луки человек+собака.
12	Зимняя выставка DogHub	Выставка	2025-12-13 11:00:00	2025-12-13 16:00:00	Выставочный центр «СибирьЭкспо»	700.00	Любительская выставка собак клуба: ринги по классам, разбор экспертом и мини-мастер-классы.
13	Соревнования по каникроссу	Спорт	2025-10-05 10:00:00	2025-10-05 13:00:00	Лесопарк за городом	500.00	Забеги с собаками на 2 и 5 км, отдельный заезд для новичков и юниоров.
14	Поход с собаками в предгорья	Активный отдых	2025-11-30 09:00:00	2025-11-30 15:00:00	Сбор у парковки ТРЦ «Галактика»	0.00	Неспешный маршрут по простому треку, привалы, отработка команд в реальных условиях.
15	Ночной квест с фонариками	Активный отдых	2025-12-01 19:30:00	2025-12-01 21:30:00	Парк Изумрудный	350.00	Квест по контрольным точкам в парке: поиск меток, выполнение маленьких заданий с собакой.
\.


--
-- Data for Name: event_registration; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event_registration (id, event_id, member_id, dog_id, registered_at) FROM stdin;
1	1	\N	1	2025-10-28 12:00:00
2	1	\N	3	2025-10-28 12:05:00
3	1	\N	4	2025-10-29 09:30:00
4	1	\N	9	2025-10-29 10:15:00
5	2	\N	2	2025-11-03 14:00:00
6	2	\N	5	2025-11-03 14:10:00
7	2	\N	9	2025-11-04 18:20:00
8	3	\N	3	2025-11-28 16:30:00
9	3	\N	4	2025-11-28 16:35:00
10	3	\N	5	2025-11-29 11:00:00
11	3	\N	9	2025-11-29 11:05:00
12	4	\N	6	2025-10-05 13:00:00
13	4	\N	7	2025-10-05 13:10:00
14	5	\N	1	2025-10-10 12:30:00
15	5	\N	2	2025-10-10 12:40:00
16	5	\N	6	2025-10-11 09:15:00
17	6	\N	1	2025-11-15 13:45:00
18	6	\N	4	2025-11-15 13:50:00
19	6	\N	5	2025-11-16 10:20:00
20	6	\N	6	2025-11-16 10:25:00
21	6	\N	9	2025-11-17 18:10:00
22	7	1	\N	2025-11-05 10:00:00
23	7	2	\N	2025-11-05 10:05:00
24	7	4	\N	2025-11-06 09:30:00
25	7	5	\N	2025-11-06 09:45:00
26	8	1	\N	2025-10-18 11:00:00
27	8	3	\N	2025-10-18 11:10:00
28	8	4	\N	2025-10-19 15:20:00
29	9	2	\N	2025-11-19 12:00:00
30	9	3	\N	2025-11-19 12:05:00
31	9	5	\N	2025-11-20 18:30:00
32	10	1	\N	2025-11-25 09:30:00
33	10	2	\N	2025-11-25 09:35:00
34	10	3	\N	2025-11-26 14:10:00
35	10	4	\N	2025-11-26 14:15:00
36	10	5	\N	2025-11-27 08:50:00
37	11	\N	4	2025-10-27 15:00:00
38	11	\N	6	2025-10-27 15:05:00
39	11	\N	7	2025-10-28 12:40:00
40	11	\N	9	2025-10-28 12:45:00
41	12	\N	1	2025-12-01 13:00:00
42	12	\N	2	2025-12-01 13:05:00
43	12	\N	3	2025-12-02 10:20:00
44	12	\N	5	2025-12-02 10:25:00
45	13	\N	1	2025-09-25 09:00:00
46	13	\N	2	2025-09-25 09:05:00
47	13	\N	5	2025-09-26 11:30:00
48	13	\N	8	2025-09-26 11:35:00
49	14	\N	1	2025-11-20 10:30:00
50	14	\N	2	2025-11-20 10:35:00
51	14	\N	5	2025-11-21 09:40:00
52	14	\N	8	2025-11-21 09:45:00
53	14	\N	9	2025-11-21 09:50:00
54	15	\N	1	2025-11-22 18:00:00
55	15	\N	6	2025-11-22 18:05:00
56	15	\N	7	2025-11-23 16:20:00
57	15	\N	8	2025-11-23 16:25:00
58	15	\N	9	2025-11-24 19:10:00
59	9	1	\N	2025-11-05 10:00:00
60	10	1	\N	2025-11-05 10:00:00
62	12	\N	9	2025-12-02 20:00:48.342908
\.


--
-- Data for Name: member; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.member (id, full_name, phone, email, city, avatar_url, bio, join_date, membership_end_date, role, password_hash) FROM stdin;
2	Илья Морозов	+7-913-000-22-33	ilya.morozov@gmail.com	Новоалтайск	https://i.pinimg.com/736x/c1/f3/64/c1f3646bd04979226e04d4ad8519b2a5.jpg	Тренирует Рэкса для аджилити. Ответственный за организацию встреч клуба.	2024-01-21	\N	Пользователь	$2b$12$yZ7UI73xmN2CrtdUlQSlAO1DpQ6w2PQ0FmktCsHgH0AIDx6lzED8y
9	Наталья Гусева	+7-913-400-55-66	natalia.guseva@gmail.com	Бийск	https://i.pinimg.com/736x/67/01/7b/67017b709d528d2dbde30278b7032e6d.jpg	Кинолог, ведёт курсы по социализации и коррекции поведения.	2023-03-05	\N	Кинолог	$2b$12$w8PLl/oLyVvE8R5XGdEWgu12eJ42bvFf1CDp75sfYwctJhmOHwUli
5	Тимофей Тычков	+7-961-999-54-73	timofeytychkov@gmail.com	Романово	https://dog-hub.ru/Users/tima.jpg	Организую прогулки для собак в нашем районе, интересуюсь аджилити и фото. Бим — энергичный компаньон, любим длинные прогулки по парку и обучение трюкам.	2022-04-13	\N	Пользователь	$2b$12$EYu5yANhGkdEkdagYoTF/ehKOSQPMl7mN8C6jq0FosR729ONgVSYG
13	Александра Тен	+7-932-686-00-89	asperaa63@gmail.com	Тюмень	\N	\N	2025-12-01	\N	Пользователь	$2a$11$qjVf8wYJNdgL89ibvaYlP.0Lxez4Ki4mkei.2EdD4yo6dlNfsl392
3	Мария Лебедева	+7-913-000-33-44	maria.lebedeva@gmail.com	Новосибирск	https://i.pinimg.com/736x/36/c3/79/36c3793009503ea561a7f2f61828d9a1.jpg	Занимается грумингом и любит участвовать в шоу с Дейзи.	2024-09-05	\N	Пользователь	$2b$12$2jkMtsCj359lrQd5lDh4X.CwtYLenv4Dl9m2HiMl0L1Wbd4qDrFUW
4	Дмитрий Серов	+7-913-000-44-55	dmitry.serov@gmail.com	Барнаул	https://i.pinimg.com/736x/e2/1d/33/e21d3336f9167e51204981bde6d7d723.jpg	Любит плавать с Лаки и помогает новым участникам адаптироваться в клубе.	2022-11-03	\N	Пользователь	$2b$12$7wI/fCFFAUuZQ1cgFi1sJeBCiN4KL50J4l28HNkwPsGCvEG4NRy6C
12	Владимир Сабанцев	+7-913-000-88-99	vladimir.sabantsev@gmail.com	Барнаул	https://dog-hub.ru/Users/vova2.jpg	Любит активные прогулки и участвует в спортивных мероприятиях клуба. Организует музыкальные концерты для участников клуба DogHub	2022-04-13	\N	Пользователь	$2b$12$eKiBP7uoNOzcTcdB5LaXQ.vzPn4JNjHjW4YgoMAxs5YG926BerWl.
1	Анна Крылова	+7-913-000-11-22	anna.krylova@gmail.com	Барнаул	https://i.pinimg.com/1200x/b4/f0/4d/b4f04de35a64a288d4a325ef3ca3be6e.jpg	Любит прогулки по парку с Беллой и участвует в фотосессиях DogHub.	2023-06-14	\N	Пользователь	$2b$12$WqkwIEe1rYoClJJ5kaT3UecRjpWwjOnVWJI1gLmkWabl0ZR4ZgxoC
10	Артём Шевцов	+7-958-848-63-07	shevcov_2k4_2@mail.ru	Троицкое	https://dog-hub.ru/Users/member-10-1764680929166.jpg	bim bim bom bom	2022-04-13	\N	Пользователь	$2b$12$jXoraDmgqK6QJTmoa1ku7.kQ7wfXimjOpQEXp5LpHmocXQJ0y.mo6
6	Ольга Романенко	+7-913-100-11-22	olga.romanenko@gmail.com	Барнаул	https://i.pinimg.com/1200x/0c/80/8d/0c808d71a7bf20730dcd6a63d059dc9f.jpg	Тренер по базовому послушанию. Ведёт групповые и индивидуальные занятия.	2021-03-10	\N	Тренер	$2b$12$NXJxBcNWiBeFSij8vbqdiu1FMVedUbL3MjqAlA2eUqkLdlZq1GPAK
7	Сергей Петров	+7-913-200-22-33	sergey.petrov@gmail.com	Новоалтайск	https://i.pinimg.com/1200x/7f/b8/7b/7fb87b373cb67abc23018136d0c424b4.jpg	Ветеринар клуба. Консультирует по здоровью и питанию собак.	2020-09-01	\N	Ветеринар	$2b$12$pXEEGqNxt4loBP05k9fCuuyQXZz9YP31f8kfBWhz/awMt.bs9VP4.
8	Алексей Смирнов	+7-913-300-33-44	alexey.smirnov@gmail.com	Барнаул	https://i.pinimg.com/736x/d1/fb/e4/d1fbe448e2f118f4108ed6fed7e03e9b.jpg	Администрирует расписание занятий и помогает с записью в клуб.	2021-07-20	\N	Администратор	$2b$12$s/LWouBXBVuuwRzD9dkzFeGRYwBuAhxAjKOGqR4Bm4YC4wErMguLC
11	Владимир Горбунов	+7-983-101-47-77	gorbunov-2004@bk.ru	Барнаул	https://dog-hub.ru/Users/member-11-1764681194426.png	- Как вы реагируете на изменение погоды?\n- Вот ты доебался со своей погодой!\n\nМечтает о добермане и закрыть сессию без долгов	2022-04-13	\N	Пользователь	$2b$12$JzBJn1P4BNROA5zyod90YuYzyM/jngtgDcM6e2D6BTX1GRYtMO0mK
\.


--
-- Data for Name: payment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment (id, member_id, payment_type_id, paid_at, receipt_number, amount) FROM stdin;
\.


--
-- Data for Name: payment_type; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_type (id, name) FROM stdin;
1	Членский взнос
2	Оплата программы
3	Оплата участия в мероприятии
4	Пожертвование
5	Прочее
\.


--
-- Data for Name: program; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.program (id, title, type, price, description) FROM stdin;
1	Базовое послушание	GROUP	4500.00	Групповой курс для собак от 6 месяцев: работа над вниманием к владельцу, командами «сидеть», «лежать», «рядом», «ко мне», умением спокойно ждать и не тянуть поводок.
2	Социализация щенков	GROUP	4000.00	Курс для щенков до 8–9 месяцев: знакомство с другими собаками и людьми, безопасные игры, привыкание к городскому шуму, предметам и базовой обработке (лапы, уши, ошейник).
3	Персональная коррекция поведения	PERSONAL	2500.00	Индивидуальные занятия с кинологом: работа с тревожностью, лаем, разрушительным поведением, боязнью улицы или агрессией к собакам/людям. План под конкретную собаку.
4	Подготовка к аджилити	GROUP	5000.00	Курс для активных собак: освоение базовых снарядов аджилити (барьеры, тоннели, слалом), развитие скорости, концентрации и управляемости на дистанции.
5	Городская собака	GROUP	4800.00	Практический курс в условиях города: спокойные прогулки на оживлённых улицах, транспорт, лифты, встречи с людьми и собаками, запрет подбора с земли и прыжков на людей.
6	Персональный курс для щенка	PERSONAL	3000.00	Индивидуальная программа для щенков: режим дня, приучение к туалету, мягкое введение правил дома, первые команды и игровые упражнения для развития уверенности.
7	Чуткий нос	GROUP	4200.00	Групповые занятия по развитию обоняния: поиск лакомства и предметов, простые «следовые» задания. Помогает утомить активных собак и снизить уровень стресса.
\.


--
-- Data for Name: program_registration; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.program_registration (id, program_id, dog_id, registered_at) FROM stdin;
1	1	1	2025-09-05 18:30:00
2	5	1	2025-10-10 19:00:00
3	7	1	2025-11-01 12:00:00
4	4	2	2025-09-12 17:15:00
5	1	2	2025-09-20 18:00:00
6	1	3	2025-08-25 18:00:00
7	5	3	2025-10-05 17:30:00
8	3	3	2025-10-20 19:00:00
9	2	4	2025-09-03 16:00:00
10	1	4	2025-09-10 18:00:00
11	4	5	2025-09-15 18:00:00
12	7	5	2025-10-25 12:30:00
13	2	6	2025-08-30 16:30:00
14	1	6	2025-09-18 18:10:00
15	2	7	2025-09-22 16:30:00
16	6	7	2025-10-12 15:00:00
17	5	8	2025-09-28 17:00:00
19	1	9	2025-09-07 18:15:00
20	4	9	2025-10-18 17:45:00
21	7	9	2025-11-08 11:30:00
22	3	8	2025-12-02 18:14:36.377077
\.


--
-- Data for Name: program_session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.program_session (id, program_id, session_datetime, duration_min, attendance, location, description) FROM stdin;
1	1	2025-10-01 19:00:00	90	6	Школа «ХвостAcademy»	Вводное занятие: внимание к владельцу, кличка, первые команды.
2	1	2025-10-08 19:00:00	90	7	Школа «ХвостAcademy»	Отработка «сидеть», «лежать», работа с поводком.
3	1	2025-10-15 19:00:00	90	6	Школа «ХвостAcademy»	Команда «ко мне», выдержка и самоконтроль.
4	1	2025-10-22 19:00:00	90	5	Школа «ХвостAcademy»	Обобщение навыков в присутствии отвлекающих факторов.
5	2	2025-09-05 17:00:00	75	5	Парк Изумрудный	Знакомство щенков друг с другом, свободная игра под контролем тренера.
6	2	2025-09-12 17:00:00	75	6	Парк Изумрудный	Привыкание к городским звукам, прохожим и детям.
7	2	2025-09-19 17:00:00	75	5	Площадка «ДогПро»	Игры на уверенность: туннели, лёгкие препятствия, контакт с людьми.
8	3	2025-10-05 18:00:00	60	1	Коворкинг «DogHub Space»	Индивидуальная консультация по проблемам лая и тревожности.
9	3	2025-10-19 18:00:00	60	1	Коворкинг «DogHub Space»	Работа над страхом улицы и транспорта, подбор упражнений.
10	3	2025-11-02 18:00:00	60	2	Онлайн (платформа DogHub)	Разбор кейсов по агрессии к другим собакам, домашнее задание.
11	4	2025-09-21 11:00:00	90	4	Площадка «ДогПро»	Знакомство со снарядами: барьеры, тоннели, правила безопасности.
12	4	2025-09-28 11:00:00	90	5	Площадка «ДогПро»	Связки из простых препятствий, работа на скорость и точность.
13	4	2025-10-05 11:00:00	90	6	Площадка «ДогПро»	Тренировка трассы, смена направлений, работа на дистанции.
14	5	2025-11-09 18:30:00	80	6	Центр города, маршрут от пл. Октября	Прогулка по шумным улицам, работа над спокойствием и не тянуть поводок.
15	5	2025-11-16 18:30:00	80	7	ТЦ «Город» и прилегающая территория	Отработка поведения у входов, эскалаторов, в толпе людей.
16	5	2025-11-23 18:30:00	80	5	Жилой район и дворы	Не подбирать с земли, спокойная реакция на дворняг и детей.
17	6	2025-09-07 16:00:00	60	1	Домашний выезд к владельцу	Режим дня, организация пространства дома, приучение к месту.
18	6	2025-09-14 16:00:00	60	1	Домашний выезд к владельцу	Приучение к туалету, первые команды через игру.
19	6	2025-09-21 16:00:00	60	2	Онлайн (платформа DogHub)	Ответы на вопросы владельцев, разбор видео и корректировка плана.
20	7	2025-11-02 12:00:00	90	5	Парк Изумрудный	Основы поисковых игр: поиск лакомства и игрушек в траве.
21	7	2025-11-09 12:00:00	90	6	Лесопарк за городом	Поиск предметов по запаху владельца, простые «следы».
22	7	2025-11-16 12:00:00	90	7	Площадка «ДогПро»	Командная работа: мини-эстафеты и задания на обоняние в группе.
\.


--
-- Data for Name: service_type; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.service_type (id, name) FROM stdin;
1	Чипирование
2	Вакцинация
3	Груминг
4	Ветеринарный осмотр
5	Кинологическая консультация
\.


--
-- Name: application_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.application_id_seq', 1, false);


--
-- Name: dog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.dog_id_seq', 11, true);


--
-- Name: dog_service_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.dog_service_id_seq', 1, false);


--
-- Name: event_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.event_id_seq', 15, true);


--
-- Name: event_registration_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.event_registration_id_seq', 62, true);


--
-- Name: member_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.member_id_seq', 14, false);


--
-- Name: payment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_id_seq', 1, false);


--
-- Name: payment_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_type_id_seq', 1, false);


--
-- Name: program_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.program_id_seq', 7, true);


--
-- Name: program_registration_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.program_registration_id_seq', 22, true);


--
-- Name: program_session_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.program_session_id_seq', 22, true);


--
-- Name: service_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.service_type_id_seq', 1, false);


--
-- Name: application application_contract_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application
    ADD CONSTRAINT application_contract_number_key UNIQUE (contract_number);


--
-- Name: application application_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application
    ADD CONSTRAINT application_pkey PRIMARY KEY (id);


--
-- Name: dog dog_chip_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dog
    ADD CONSTRAINT dog_chip_number_key UNIQUE (chip_number);


--
-- Name: dog dog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dog
    ADD CONSTRAINT dog_pkey PRIMARY KEY (id);


--
-- Name: dog_service dog_service_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dog_service
    ADD CONSTRAINT dog_service_pkey PRIMARY KEY (id);


--
-- Name: event event_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event
    ADD CONSTRAINT event_pkey PRIMARY KEY (id);


--
-- Name: event_registration event_registration_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_registration
    ADD CONSTRAINT event_registration_pkey PRIMARY KEY (id);


--
-- Name: member member_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT member_email_key UNIQUE (email);


--
-- Name: member member_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT member_pkey PRIMARY KEY (id);


--
-- Name: payment payment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_pkey PRIMARY KEY (id);


--
-- Name: payment payment_receipt_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_receipt_number_key UNIQUE (receipt_number);


--
-- Name: payment_type payment_type_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_type
    ADD CONSTRAINT payment_type_name_key UNIQUE (name);


--
-- Name: payment_type payment_type_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_type
    ADD CONSTRAINT payment_type_pkey PRIMARY KEY (id);


--
-- Name: program program_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program
    ADD CONSTRAINT program_pkey PRIMARY KEY (id);


--
-- Name: program_registration program_registration_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program_registration
    ADD CONSTRAINT program_registration_pkey PRIMARY KEY (id);


--
-- Name: program_session program_session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program_session
    ADD CONSTRAINT program_session_pkey PRIMARY KEY (id);


--
-- Name: service_type service_type_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_type
    ADD CONSTRAINT service_type_name_key UNIQUE (name);


--
-- Name: service_type service_type_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_type
    ADD CONSTRAINT service_type_pkey PRIMARY KEY (id);


--
-- Name: event_registration_event_id_dog_id_member_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX event_registration_event_id_dog_id_member_id_idx ON public.event_registration USING btree (event_id, dog_id, member_id);


--
-- Name: program_registration_program_id_dog_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX program_registration_program_id_dog_id_idx ON public.program_registration USING btree (program_id, dog_id);


--
-- Name: application application_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application
    ADD CONSTRAINT application_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.member(id);


--
-- Name: dog dog_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dog
    ADD CONSTRAINT dog_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.member(id);


--
-- Name: dog_service dog_service_dog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dog_service
    ADD CONSTRAINT dog_service_dog_id_fkey FOREIGN KEY (dog_id) REFERENCES public.dog(id);


--
-- Name: dog_service dog_service_service_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dog_service
    ADD CONSTRAINT dog_service_service_type_id_fkey FOREIGN KEY (service_type_id) REFERENCES public.service_type(id);


--
-- Name: event_registration event_registration_dog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_registration
    ADD CONSTRAINT event_registration_dog_id_fkey FOREIGN KEY (dog_id) REFERENCES public.dog(id);


--
-- Name: event_registration event_registration_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_registration
    ADD CONSTRAINT event_registration_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.event(id);


--
-- Name: event_registration event_registration_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_registration
    ADD CONSTRAINT event_registration_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.member(id);


--
-- Name: payment payment_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.member(id);


--
-- Name: payment payment_payment_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_payment_type_id_fkey FOREIGN KEY (payment_type_id) REFERENCES public.payment_type(id);


--
-- Name: program_registration program_registration_dog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program_registration
    ADD CONSTRAINT program_registration_dog_id_fkey FOREIGN KEY (dog_id) REFERENCES public.dog(id);


--
-- Name: program_registration program_registration_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program_registration
    ADD CONSTRAINT program_registration_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.program(id);


--
-- Name: program_session program_session_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program_session
    ADD CONSTRAINT program_session_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.program(id);


--
-- PostgreSQL database dump complete
--