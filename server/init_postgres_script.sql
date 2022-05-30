CREATE user kchap WITH ENCRYPTED PASSWORD 'SECRET';

CREATE DATABASE kchap;

REVOKE CONNECT ON DATABASE kchap FROM public;
GRANT CONNECT ON DATABASE kchap TO kchap;

\c kchap

ALTER DEFAULT privileges for ROLE postgres IN SCHEMA public grant select, insert, update, delete ON tables TO kchap;
ALTER DEFAULT privileges for ROLE postgres IN SCHEMA public grant usage, select ON sequences TO kchap;



ALTER DATABASE kchap SET timezone TO 'UTC';
CREATE EXTENSION pg_trgm;                                           -- used for text pattern search of location

----------/      Auth        /----------
create type users_main_provider_enum as enum ('local', 'fb');       -- treated as int, best of int and string


create table users (                -- user is pg keyword
    id bigserial primary key,
    name varchar(40) not null,
    main_provider users_main_provider_enum not null,
    is_deleted boolean not null default false
);

create table users_kchap (
    user_id bigint references users(id) ON DELETE CASCADE primary key,
    email varchar(254) not null,
    password varchar(60) not null      -- bcrypt hashed, fixed length (library documentation)
);
create unique index users_kchap_lower_email_idx on users_kchap(lower(email));

-- Users authenticated via secondary provider can always revoke app access from their provider's control panel.
-- In this case our error handler for the provider should prompt them to relogin using this provider. Generally, the 
-- provider's API will tell us an abstract error message, like "The user has not authorized application <app_id>", the 
-- solution to which is to just relogin, thus reauthorizing the app. There will be no tracking of whether the user has
-- revoked app's access or not, indicating to us that we should mark their (maybe linked) account as disabled.
create table users_fb (                                                 -- do not keep accessTokens, they would need encryption if stored
    fb_id character varying(128) primary key,                           -- fb graph api returns numberic string
    user_id bigint references users(id) ON DELETE CASCADE not null      -- user may link multiple fb accounts
);

----------/      Group        /----------
create table groups (
    id bigserial primary key,
    name varchar(70) not null, 
    invite_code varchar(10),
    overwrite boolean not null default false,
    created_on timestamp with time zone not null default now(),
    version int not null default 1
);
create index groups_invite_code_idx on groups(invite_code);  


/*
 *          ***
 *
 *   SOME OBJECTS OMITTED
 *
 *          ***
 */

----------/      Content        /----------

create table transfer (
    id bigserial primary key,
    group_id bigint references groups(id) ON DELETE CASCADE not null,
    description character varying(200),
    amount bigint not null,
    from_user_id bigint references users(id) not null,
    to_user_id bigint references users(id) not null,
 	date_time timestamp with time zone not null,   
    created_on timestamp with time zone not null,
    uploaded_on timestamp with time zone not null default now(),
    modified_on timestamp with time zone default now(),
    created_by bigint references users(id) not null,              
    location jsonb,
    version int not null default 1
);
create index transfer_location_name_idx on transfer using gin ((location->>'name') gin_trgm_ops);


/***   DB SCRIPTS   ***/
CREATE OR REPLACE FUNCTION upd_content_timestamp() RETURNS TRIGGER 
LANGUAGE plpgsql
AS
$$
BEGIN
    NEW.modified_on = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_upd_transaction_timestamp
  BEFORE UPDATE
  ON transaction
  FOR EACH ROW
  EXECUTE PROCEDURE upd_content_timestamp();

CREATE TRIGGER tr_upd_transfer_timestamp
  BEFORE UPDATE
  ON transfer
  FOR EACH ROW
  EXECUTE PROCEDURE upd_content_timestamp();

CREATE OR REPLACE FUNCTION ins_group_user() RETURNS TRIGGER 
LANGUAGE plpgsql
AS
$$
DECLARE
    noOfUsers integer;
BEGIN
    SELECT COUNT(user_id) FROM groups_users INTO noOfUsers WHERE group_id = NEW.group_id;

    IF (noOfUsers >= 15) THEN RAISE EXCEPTION 'Max number of users for group reached'; END IF;

    -- We could select here to check whether the user is already a member and raise an exception,
    -- but it is an extra query and the only unique constraint exception that can be thrown is 
    -- about this case

    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_ins_group_user
  BEFORE INSERT
  ON groups_users
  FOR EACH ROW
  EXECUTE PROCEDURE ins_group_user();