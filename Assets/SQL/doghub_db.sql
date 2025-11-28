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

CREATE TABLE "member" (
  "id" serial PRIMARY KEY,
  "full_name" varchar(200) NOT NULL,
  "phone" varchar(50),
  "email" varchar(150) UNIQUE,
  "city" varchar(50),
  "avatar_url" text,
  "bio" text,
  "join_date" date,
  "membership_end_date" date,
  "role" varchar(40) NOT NULL
  "password_hash" text
);

CREATE TABLE "application" (
  "id" serial PRIMARY KEY,
  "submitted_at" timestamp NOT NULL,
  "contract_date" timestamp,
  "contract_number" varchar(50) UNIQUE,
  "status" application_status NOT NULL,
  "member_id" int NOT NULL
);

CREATE TABLE "dog" (
  "id" serial PRIMARY KEY,
  "member_id" int NOT NULL,
  "name" varchar(120) NOT NULL,
  "breed" varchar(120) NOT NULL,
  "sex" sex_enum NOT NULL,
  "birth_date" date,
  "chip_number" varchar(64) UNIQUE,
  "photo" text,
  "bio" text,
  "tags" text[]
);

CREATE TABLE "service_type" (
  "id" serial PRIMARY KEY,
  "name" varchar(120) UNIQUE NOT NULL
);

CREATE TABLE "dog_service" (
  "id" serial PRIMARY KEY,
  "dog_id" int NOT NULL,
  "service_type_id" int NOT NULL,
  "requested_at" timestamp NOT NULL,
  "performed_at" timestamp,
  "price" decimal(10,2),
  "status" service_status NOT NULL,
  "service_name" varchar(200)
);

CREATE TABLE "program" (
  "id" serial PRIMARY KEY,
  "title" varchar(200) NOT NULL,
  "type" program_type NOT NULL,
  "price" decimal(10,2),
  "description" text
);

CREATE TABLE "program_session" (
  "id" serial PRIMARY KEY,
  "program_id" int NOT NULL,
  "session_datetime" timestamp NOT NULL,
  "duration_min" int,
  "attendance" int,
  "location" varchar(200) NOT NULL,
  "description" text
);

CREATE TABLE "program_registration" (
  "id" serial PRIMARY KEY,
  "program_id" int NOT NULL,
  "dog_id" int NOT NULL,
  "registered_at" timestamp NOT NULL
);

CREATE TABLE "event" (
  "id" serial PRIMARY KEY,
  "title" varchar(200) NOT NULL,
  "category" varchar(80) NOT NULL,
  "start_at" timestamp NOT NULL,
  "end_at" timestamp,
  "venue" varchar(200) NOT NULL,
  "price" decimal(10,2),
  "description" text
);

CREATE TABLE "event_registration" (
  "id" serial PRIMARY KEY,
  "event_id" int NOT NULL,
  "member_id" int,
  "dog_id" int,
  "registered_at" timestamp NOT NULL
);

CREATE TABLE "payment_type" (
  "id" serial PRIMARY KEY,
  "name" varchar(80) UNIQUE NOT NULL
);

CREATE TABLE "payment" (
  "id" serial PRIMARY KEY,
  "member_id" int NOT NULL,
  "payment_type_id" int NOT NULL,
  "paid_at" timestamp NOT NULL,
  "receipt_number" varchar(40) UNIQUE,
  "amount" decimal(10,2) NOT NULL
);

CREATE UNIQUE INDEX ON "program_registration" ("program_id", "dog_id");

CREATE UNIQUE INDEX ON "event_registration" ("event_id", "dog_id", "member_id");

ALTER TABLE "application" ADD FOREIGN KEY ("member_id") REFERENCES "member" ("id");

ALTER TABLE "dog" ADD FOREIGN KEY ("member_id") REFERENCES "member" ("id");

ALTER TABLE "dog_service" ADD FOREIGN KEY ("dog_id") REFERENCES "dog" ("id");

ALTER TABLE "dog_service" ADD FOREIGN KEY ("service_type_id") REFERENCES "service_type" ("id");

ALTER TABLE "program_session" ADD FOREIGN KEY ("program_id") REFERENCES "program" ("id");

ALTER TABLE "program_registration" ADD FOREIGN KEY ("program_id") REFERENCES "program" ("id");

ALTER TABLE "program_registration" ADD FOREIGN KEY ("dog_id") REFERENCES "dog" ("id");

ALTER TABLE "event_registration" ADD FOREIGN KEY ("event_id") REFERENCES "event" ("id");

ALTER TABLE "event_registration" ADD FOREIGN KEY ("member_id") REFERENCES "member" ("id");

ALTER TABLE "event_registration" ADD FOREIGN KEY ("dog_id") REFERENCES "dog" ("id");

ALTER TABLE "payment" ADD FOREIGN KEY ("member_id") REFERENCES "member" ("id");

ALTER TABLE "payment" ADD FOREIGN KEY ("payment_type_id") REFERENCES "payment_type" ("id");
