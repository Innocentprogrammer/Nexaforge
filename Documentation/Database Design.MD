# docs/19-Database-Design.md

> **NexaForge Technologies**
>
> **Database Architecture & Schema Design**
>
> **Product:** NexaInvite (MVP)
>
> **Version:** 1.0
>
> **Classification:** Internal Engineering Documentation
>
> **Document Owner:** Database Architecture Team
>
> **Last Updated:** July 2026

---

# Database Design

## Purpose

This document defines the database architecture, schema, relationships, indexing strategy, security considerations, and scalability guidelines for the NexaInvite platform.

The database is designed to support:

- High availability
- Scalability
- Data integrity
- Security
- Future product expansion

---

# Database Technology

## Primary Database

PostgreSQL

Reason:

- ACID compliance
- Strong relational capabilities
- JSON support
- Advanced indexing
- High reliability
- Mature ecosystem

---

# Supporting Databases

## Redis

Purpose

- Session storage
- Caching
- Rate limiting
- Background job queue

---

# High-Level ER Diagram

```text
Users
 │
 ├──────── Invitations
 │              │
 │              ├──────── Invitation_Template
 │              │
 │              ├──────── Guest_List
 │              │
 │              ├──────── RSVP
 │              │
 │              ├──────── Media
 │              │
 │              └──────── Share_Link
 │
 ├──────── Subscription
 │
 ├──────── Payment
 │
 └──────── Notification
```

---

# Core Tables

---

# users

Stores platform users.

### Columns

| Column | Type |
|---------|------|
| id | UUID |
| full_name | VARCHAR(120) |
| email | VARCHAR(255) UNIQUE |
| password_hash | TEXT |
| phone | VARCHAR(20) |
| role | ENUM |
| is_verified | BOOLEAN |
| profile_image | TEXT |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

Indexes

- email
- role

---

# invitation_templates

Stores invitation templates.

### Columns

| Column | Type |
|---------|------|
| id | UUID |
| name | VARCHAR |
| category | VARCHAR |
| thumbnail | TEXT |
| preview_image | TEXT |
| template_json | JSONB |
| premium | BOOLEAN |
| price | NUMERIC |
| active | BOOLEAN |
| created_at | TIMESTAMP |

Indexes

- category
- premium

---

# invitations

Stores invitations created by customers.

### Columns

| Column | Type |
|---------|------|
| id | UUID |
| user_id | UUID |
| template_id | UUID |
| title | VARCHAR |
| slug | VARCHAR UNIQUE |
| event_type | VARCHAR |
| event_date | DATE |
| venue | TEXT |
| invitation_json | JSONB |
| status | ENUM |
| qr_code | TEXT |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

Foreign Keys

- user_id
- template_id

Indexes

- slug
- event_date
- status

---

# guests

Stores guest information.

### Columns

| Column | Type |
|---------|------|
| id | UUID |
| invitation_id | UUID |
| full_name | VARCHAR |
| email | VARCHAR |
| phone | VARCHAR |
| group_name | VARCHAR |
| invitation_sent | BOOLEAN |
| created_at | TIMESTAMP |

Indexes

- invitation_id
- phone
- email

---

# rsvp

Stores guest responses.

### Columns

| Column | Type |
|---------|------|
| id | UUID |
| guest_id | UUID |
| invitation_id | UUID |
| response | ENUM |
| message | TEXT |
| responded_at | TIMESTAMP |

Allowed Responses

- ACCEPTED
- DECLINED
- MAYBE

Indexes

- guest_id
- invitation_id

---

# payments

Stores payment records.

### Columns

| Column | Type |
|---------|------|
| id | UUID |
| user_id | UUID |
| order_id | VARCHAR |
| gateway | VARCHAR |
| amount | NUMERIC |
| currency | VARCHAR |
| status | ENUM |
| transaction_id | VARCHAR |
| created_at | TIMESTAMP |

Indexes

- order_id
- transaction_id
- status

---

# subscriptions

Stores customer subscriptions.

### Columns

| Column | Type |
|---------|------|
| id | UUID |
| user_id | UUID |
| plan | VARCHAR |
| start_date | DATE |
| end_date | DATE |
| status | ENUM |

Indexes

- user_id
- status

---

# notifications

Stores system notifications.

### Columns

| Column | Type |
|---------|------|
| id | UUID |
| user_id | UUID |
| title | VARCHAR |
| message | TEXT |
| type | ENUM |
| read | BOOLEAN |
| created_at | TIMESTAMP |

---

# media

Stores uploaded assets.

### Columns

| Column | Type |
|---------|------|
| id | UUID |
| invitation_id | UUID |
| file_name | VARCHAR |
| file_url | TEXT |
| mime_type | VARCHAR |
| file_size | BIGINT |
| uploaded_at | TIMESTAMP |

---

# share_links

Stores invitation sharing links.

### Columns

| Column | Type |
|---------|------|
| id | UUID |
| invitation_id | UUID |
| token | VARCHAR UNIQUE |
| expires_at | TIMESTAMP |
| created_at | TIMESTAMP |

---

# Audit Tables

Every critical table should maintain audit history.

Examples:

- audit_users
- audit_payments
- audit_invitations

Purpose:

- Compliance
- Rollback
- Activity tracking

---

# Relationships

```
User

↓

Invitations

↓

Guests

↓

RSVP
```

```
Template

↓

Invitation
```

```
Invitation

↓

Media
```

```
User

↓

Payments

↓

Subscription
```

---

# Constraints

Examples

Email

UNIQUE

Invitation Slug

UNIQUE

Guest Phone

Optional

Payment Transaction

UNIQUE

Foreign Keys

ON DELETE RESTRICT where appropriate.

---

# Naming Conventions

Tables

snake_case

Columns

snake_case

Primary Keys

id

Foreign Keys

entity_id

Example

user_id

template_id

---

# Index Strategy

Index

- Email
- Slug
- Status
- Created Date
- Event Date
- Payment Status
- Token

Composite indexes

Example

(user_id, status)

(event_date, status)

---

# Soft Delete

Instead of deleting:

Use

deleted_at

Benefits

- Recovery
- Auditing
- Compliance

---

# JSON Storage

Use JSONB only when flexibility is required.

Example

Invitation Design

```json
{
  "background":"theme1.jpg",
  "fonts":[...],
  "layers":[...]
}
```

Structured relational data should remain in dedicated tables.

---

# File Storage

Do not store files in PostgreSQL.

Store:

- Images
- Videos
- PDFs

In Object Storage.

Database stores only metadata and URLs.

---

# Transactions

Use database transactions for:

- Payments
- Subscription updates
- Invitation publishing
- Guest imports

Ensures consistency.

---

# Backup Strategy

Daily

Incremental

Weekly

Full Backup

Monthly

Archive Backup

Retention

90 Days

---

# Security

Encrypt

- Passwords
- Sensitive tokens

Never store

- Plain passwords
- Payment card details

Use least-privilege database accounts.

---

# Performance Guidelines

Target

Query response

<100 ms

Connection Pooling

Enabled

Prepared Statements

Enabled

Pagination

Mandatory

Lazy Loading

Where appropriate

---

# Scalability Strategy

Phase 1

Single PostgreSQL instance

---

Phase 2

Read Replicas

---

Phase 3

Partitioning

---

Phase 4

Sharding (only if justified)

---

# Migration Strategy

Use migration tools.

Never modify production schema manually.

Migration requirements:

- Version controlled
- Reversible
- Tested

---

# Data Retention

Inactive accounts

Review after 24 months.

Logs

Retain for one year unless legal or contractual requirements dictate otherwise.

---

# Monitoring

Track:

- Slow queries
- Lock contention
- Connection count
- Disk usage
- Replication lag
- Backup status

---

# Database Standards

- UUID primary keys
- Foreign key constraints
- ACID transactions
- Indexed search columns
- Audit logging
- Soft deletes where applicable
- Timestamp columns on all business entities

---

# Future Expansion

Additional modules

- Vendor Marketplace
- Seating Planner
- AI Suggestions
- Gift Registry
- Wedding Website
- Multi-language Support

Schema should remain extensible.

---

# Conclusion

The NexaInvite database is designed with a strong relational foundation while allowing flexibility through selective JSONB usage.

By emphasizing normalization, indexing, security, and scalability, the architecture supports both the MVP and future growth into a comprehensive event management platform.