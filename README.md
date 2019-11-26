# vanguard-services
Raid import/export, storage, and whatever else we need

Home: https://vanguard-ashkandi.com/ui/  
API Docs: https://vanguard-ashkandi.com/docs  
Upload: https://vanguard-ashkandi.com/upload.html  

## Infrastructure

- Runs on GCP Kubernetes
  - See: `deployment/vanguard-k8s.yaml`
- Uses GCP Cloud SQL (Postgres flavor)
- App containers build with GCP CloudBuild and are stored in GCR
  - master: `gcr.io/vanguard-255823/vanguard-services:master`
  - Images for each `master` sha also exist
- DNS
  - https://vanguard-ashkandi.com

### GCP Setup

1. Create a Cloud SQL Postgres database @ 11
1. Create a GKE cluster of any size and set it to be able to talk to Cloud SQL
1. Attach Cloudbuild to the git repo, and commit something

## Deployment

Commit something to `master`.  If tests pass, CI will spit it out into the cloud.

## Developing Locally

1. Install Node
1. Install Postgres
1. Create db `vanguard_test` and user `vanguard` with password `vanguard`

  ```
  CREATE DATABASE vanguard_test;
  CREATE USER vanguard WITH PASSWORD 'vanguard';
  \c vanguard_test
  GRANT USAGE ON SCHEMA public to vanguard;
  GRANT ALL ON ALL TABLES IN SCHEMA public to vanguard;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public to vanguard;
  GRANT ALL ON ALL FUNCTIONS IN SCHEMA public to vanguard;
  CREATE USER 'vanguard'@'%' IDENTIFIED BY 'vanguard';
  GRANT ALL on vanguard_test.* to 'vanguard'@'%';
  ```

1. `npm i && npm start`
1. Go to `http://localhost:3000`

## Security

All mutating operations need authentication.  

Authentication is implemented via JWT.  `POST` to `/api/auth/login` with username/password in the body, and you will get a JWT back with your roles.

Include this as a header when making API requests `Authorization: JWT <your_jwt>`.  JWTs are valid for 12 hours.

Account creation is only needed for officers, and is currently manual.


## FUN FACTS

### Values that are considered identical in a unique utf8mb4 index according to MySQL

qUAliTy sOFtwaRe - thanks Oracle

```
// Unique index on `player_name`
[
  // EQUAL
  {
    "player_name": "Töd",
    "officer_note": "",
    "class": "Warrior",
    "level": 1,
    "rank_index": 9,
    "rank": "Trial Member"
  },
  {
    "player_name": "Tod",
    "officer_note": "",
    "class": "Rogue",
    "level": 60,
    "rank_index": 7,
    "rank": "Trial Raider"
  },
  // EQUAL
  {
    "player_name": "Jústín",
    "officer_note": "",
    "class": "Druid",
    "level": 12,
    "rank_index": 9,
    "rank": "Trial Member"
  },
  {
    "player_name": "Justiñ",
    "officer_note": "",
    "class": "Warrior",
    "level": 60,
    "rank_index": 6,
    "rank": "Raid Team"
  },
  // EQUAL
  {
    "player_name": "Ravagê",
    "officer_note": "",
    "class": "Hunter",
    "level": 18,
    "rank_index": 8,
    "rank": "Member"
  },
  {
    "player_name": "Ravâge",
    "officer_note": "Ravika Alt",
    "class": "Mage",
    "level": 22,
    "rank_index": 9,
    "rank": "Trial Member"
  },
]
```
