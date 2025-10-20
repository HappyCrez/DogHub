CREATE DATABASE doghub_db;

-- Connect to db from psql shell env
-- Comment to use script in pgAdmin 
\c doghub_db;

CREATE TYPE "sex_enum" AS ENUM (
  'M',
  'F'
);

CREATE TYPE "application_status" AS ENUM (
  'IN_PROGRESS',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE "service_status" AS ENUM (
  'REQUESTED',
  'SCHEDULED',
  'DONE',
  'CANCELED'
);

CREATE TYPE "program_type" AS ENUM (
  'PERSONAL',
  'GROUP'
);

CREATE TYPE "event_status" AS ENUM (
  'PLANNED',
  'CANCELLED',
  'HELD'
);

CREATE TABLE "users" (
  "id" serial PRIMARY KEY,
  "full_name" varchar(200) NOT NULL,
  "phone" varchar(50),
  "email" varchar(150) UNIQUE,
  "join_date" date,
  "membership_end_date" date,
  "role" varchar(40) NOT NULL
);

CREATE TABLE "applications" (
  "id" serial PRIMARY KEY,
  "submitted_at" timestamp NOT NULL,
  "contract_date" timestamp,
  "contract_number" varchar(50) UNIQUE,
  "status" application_status NOT NULL,
  "user_id" int NOT NULL
);

CREATE TABLE "dogs" (
  "id" serial PRIMARY KEY,
  "user_id" int NOT NULL,
  "name" varchar(120) NOT NULL,
  "breed" varchar(120) NOT NULL,
  "sex" sex_enum NOT NULL,
  "birth_date" date,
  "chip_number" varchar(64) UNIQUE
);

CREATE TABLE "service_types" (
  "id" serial PRIMARY KEY,
  "name" varchar(120) UNIQUE NOT NULL
);

CREATE TABLE "dog_services" (
  "id" serial PRIMARY KEY,
  "service_type_id" int NOT NULL,
  "dog_id" int NOT NULL,
  "requested_at" timestamp NOT NULL,
  "performed_at" timestamp,
  "price" decimal(10,2),
  "status" service_status NOT NULL,
  "service_name" varchar(60)
);

CREATE TABLE "programs" (
  "id" serial PRIMARY KEY,
  "title" varchar(200) NOT NULL,
  "type" program_type NOT NULL,
  "price" decimal(10,2),
  "description" text
);

CREATE TABLE "program_sessions" (
  "id" serial PRIMARY KEY,
  "program_id" int NOT NULL,
  "session_datetime" timestamp NOT NULL,
  "duration_min" int,
  "attendance" int,
  "location" varchar(200) NOT NULL,
  "description" text
);

CREATE TABLE "program_registrations" (
  "id" serial PRIMARY KEY,
  "program_id" int NOT NULL,
  "dog_id" int NOT NULL,
  "registered_at" timestamp NOT NULL
);

CREATE TABLE "events" (
  "id" serial PRIMARY KEY,
  "title" varchar(200) NOT NULL,
  "category" varchar(80) NOT NULL,
  "status" event_status NOT NULL,
  "start_at" timestamp NOT NULL,
  "end_at" timestamp,
  "venue" varchar(200) NOT NULL,
  "price" decimal(10,2),
  "description" text
);

CREATE TABLE "event_registrations" (
  "id" serial PRIMARY KEY,
  "dog_id" int NOT NULL,
  "event_id" int NOT NULL,
  "registered_at" timestamp NOT NULL
);

CREATE TABLE "payment_types" (
  "id" serial PRIMARY KEY,
  "name" varchar(80) UNIQUE NOT NULL
);

CREATE TABLE "payments" (
  "id" serial PRIMARY KEY,
  "user_id" int NOT NULL,
  "payment_type_id" int NOT NULL,
  "paid_at" timestamp NOT NULL,
  "receipt_number" varchar(40) UNIQUE,
  "amount" decimal(10,2) NOT NULL
);

CREATE UNIQUE INDEX ON "program_registrations" ("program_id", "dog_id");

CREATE UNIQUE INDEX ON "event_registrations" ("event_id", "dog_id");

ALTER TABLE "applications" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE RESTRICT;

ALTER TABLE "dogs" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE RESTRICT;

ALTER TABLE "dog_services" ADD FOREIGN KEY ("dog_id") REFERENCES "dogs" ("id") ON DELETE CASCADE ON UPDATE RESTRICT;

ALTER TABLE "program_sessions" ADD FOREIGN KEY ("program_id") REFERENCES "programs" ("id") ON DELETE CASCADE ON UPDATE RESTRICT;

ALTER TABLE "program_registrations" ADD FOREIGN KEY ("program_id") REFERENCES "programs" ("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "program_registrations" ADD FOREIGN KEY ("dog_id") REFERENCES "dogs" ("id") ON DELETE CASCADE ON UPDATE RESTRICT;

ALTER TABLE "event_registrations" ADD FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE RESTRICT;

ALTER TABLE "event_registrations" ADD FOREIGN KEY ("dog_id") REFERENCES "dogs" ("id") ON DELETE CASCADE ON UPDATE RESTRICT;

ALTER TABLE "dog_services" ADD FOREIGN KEY ("service_type_id") REFERENCES "service_types" ("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "payments" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "payments" ADD FOREIGN KEY ("payment_type_id") REFERENCES "payment_types" ("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
