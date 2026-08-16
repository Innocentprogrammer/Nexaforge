# docs/20-API-Specification.md

> **NexaForge Technologies**
>
> **REST API Specification**
>
> **Product:** NexaInvite
>
> **Version:** 1.0
>
> **Status:** Engineering Standard
>
> **Document Owner:** Backend Engineering Team
>
> **Last Updated:** July 2026

---

# REST API Specification

## Purpose

This document defines the official REST API standards and endpoints for the NexaInvite platform.

It serves as the single source of truth for:

- Backend Developers
- Frontend Developers
- Mobile Developers
- QA Engineers
- DevOps Engineers
- Third-party Integrators

---

# API Principles

Every API should be:

- RESTful
- Stateless
- Secure
- Versioned
- Predictable
- Well documented
- Backward compatible where practical

---

# Base URL

Development

```
http://localhost:8000/api/v1
```

Staging

```
https://staging-api.nexaforge.tech/api/v1
```

Production

```
https://api.nexaforge.tech/api/v1
```

---

# API Versioning

URI Versioning

```
/api/v1/
/api/v2/
```

Breaking changes require a new version.

---

# Authentication

Authentication Method

```
JWT Access Token
JWT Refresh Token
```

Header

```
Authorization: Bearer <access_token>
```

Public endpoints do not require authentication.

---

# Standard Response Format

## Success

```json
{
    "success": true,
    "message": "Invitation created successfully.",
    "data": {},
    "meta": {}
}
```

---

## Error

```json
{
    "success": false,
    "message": "Validation failed.",
    "errors": [
        {
            "field": "title",
            "message": "Title is required."
        }
    ]
}
```

---

# HTTP Status Codes

| Code | Meaning |
|-------|---------|
|200|Success|
|201|Created|
|204|No Content|
|400|Bad Request|
|401|Unauthorized|
|403|Forbidden|
|404|Not Found|
|409|Conflict|
|422|Validation Error|
|429|Too Many Requests|
|500|Internal Server Error|

---

# Pagination

Query Parameters

```
?page=1
&page_size=20
```

Response

```json
{
  "count":320,
  "page":1,
  "page_size":20,
  "results":[]
}
```

---

# Filtering

Examples

```
?status=published

?category=wedding

?premium=true
```

---

# Sorting

Ascending

```
?ordering=created_at
```

Descending

```
?ordering=-created_at
```

---

# Search

```
?search=Royal Wedding
```

---

# Rate Limiting

Anonymous Users

```
100 requests/hour
```

Authenticated Users

```
1000 requests/hour
```

Admin

Configurable.

---

# Authentication APIs

---

## Register

POST

```
/auth/register/
```

Body

```json
{
    "name":"Rahul",
    "email":"rahul@example.com",
    "password":"Password@123"
}
```

Response

```
201 Created
```

---

## Login

POST

```
/auth/login/
```

Response

```json
{
    "access":"jwt_token",
    "refresh":"jwt_refresh"
}
```

---

## Refresh Token

POST

```
/auth/refresh/
```

---

## Logout

POST

```
/auth/logout/
```

---

## Forgot Password

POST

```
/auth/forgot-password/
```

---

## Reset Password

POST

```
/auth/reset-password/
```

---

# User APIs

---

## Get Profile

GET

```
/users/me/
```

---

## Update Profile

PATCH

```
/users/me/
```

---

## Upload Profile Image

POST

```
/users/profile-image/
```

---

# Template APIs

---

## List Templates

GET

```
/templates/
```

Filters

- Category
- Premium
- Search

---

## Template Details

GET

```
/templates/{id}/
```

---

## Featured Templates

GET

```
/templates/featured/
```

---

## Trending Templates

GET

```
/templates/trending/
```

---

# Invitation APIs

---

## Create Invitation

POST

```
/invitations/
```

---

## List Invitations

GET

```
/invitations/
```

---

## Get Invitation

GET

```
/invitations/{id}/
```

---

## Update Invitation

PATCH

```
/invitations/{id}/
```

---

## Delete Invitation

DELETE

```
/invitations/{id}/
```

Soft delete only.

---

## Publish Invitation

POST

```
/invitations/{id}/publish/
```

---

## Duplicate Invitation

POST

```
/invitations/{id}/duplicate/
```

---

## Generate QR Code

POST

```
/invitations/{id}/qr/
```

---

## Preview Invitation

GET

```
/invitations/{id}/preview/
```

---

# Guest APIs

---

## List Guests

GET

```
/invitations/{id}/guests/
```

---

## Add Guest

POST

```
/invitations/{id}/guests/
```

---

## Update Guest

PATCH

```
/guests/{id}/
```

---

## Delete Guest

DELETE

```
/guests/{id}/
```

---

## Import CSV

POST

```
/guests/import/
```

Multipart upload.

---

# RSVP APIs

---

## Submit RSVP

POST

```
/rsvp/
```

Guest authentication not required.

---

## Get RSVP Summary

GET

```
/invitations/{id}/rsvp/
```

---

## Export RSVP

GET

```
/invitations/{id}/rsvp/export/
```

CSV format.

---

# Media APIs

---

## Upload Image

POST

```
/media/
```

---

## Delete Image

DELETE

```
/media/{id}/
```

---

## List Media

GET

```
/media/
```

---

# Payment APIs

---

## Create Order

POST

```
/payments/order/
```

---

## Verify Payment

POST

```
/payments/verify/
```

---

## Payment History

GET

```
/payments/
```

---

# Subscription APIs

---

## Current Plan

GET

```
/subscriptions/current/
```

---

## Upgrade Plan

POST

```
/subscriptions/upgrade/
```

---

## Cancel Subscription

POST

```
/subscriptions/cancel/
```

---

# Notification APIs

---

## List Notifications

GET

```
/notifications/
```

---

## Mark Read

PATCH

```
/notifications/{id}/read/
```

---

# Admin APIs

Accessible only to administrators.

Examples

```
/admin/users/

/admin/templates/

/admin/payments/

/admin/reports/

/admin/dashboard/
```

---

# Webhooks

Supported Events

- Payment Success
- Payment Failed
- Invitation Published
- RSVP Submitted
- Subscription Renewed

Example Payload

```json
{
    "event":"payment.success",
    "timestamp":"2026-07-01T12:00:00Z",
    "data":{}
}
```

---

# Error Codes

| Code | Description |
|-------|-------------|
|AUTH001|Invalid Credentials|
|AUTH002|Token Expired|
|USER001|User Not Found|
|INV001|Invitation Not Found|
|TEMP001|Template Not Found|
|PAY001|Payment Failed|
|RSVP001|Duplicate RSVP|

---

# Validation Rules

Examples

Email

Valid email required.

Password

Minimum

- 8 characters
- Uppercase
- Lowercase
- Number
- Special character

Invitation Title

Maximum

100 characters.

---

# Security

Mandatory

- HTTPS
- JWT
- Input validation
- Output encoding
- Rate limiting
- CSRF protection where applicable
- Audit logging

---

# Idempotency

Required for

- Payment APIs
- Subscription APIs

Clients should send an `Idempotency-Key` header to prevent duplicate processing.

---

# CORS Policy

Allowed Origins

- Web application
- Admin portal
- Mobile applications

Development origins may be configured separately.

---

# API Documentation

Generate automatically using

OpenAPI 3.1

Swagger UI

ReDoc

Documentation must be updated with every API change.

---

# Deprecation Policy

Deprecated endpoints should:

- Remain functional during the announced support window.
- Include deprecation headers.
- Provide migration guidance.

---

# Monitoring

Track

- Request count
- Error rate
- Latency
- Authentication failures
- Rate limit violations
- Endpoint popularity

---

# Testing

Every endpoint must include

- Unit tests
- Integration tests
- API contract tests
- Performance tests
- Security tests

Target API coverage

≥90%

---

# API Naming Standards

Use plural nouns.

Examples

```
/users/

/templates/

/invitations/

/guests/

/payments/
```

Avoid verbs in resource names unless representing actions (e.g., `/publish/`, `/verify/`).

---

# Future APIs

Planned

- AI Designer
- Wedding Website Builder
- Marketplace
- Vendor Management
- Seating Planner
- Gift Registry
- Event Timeline
- Calendar Integration

---

# API Lifecycle

```
Design

↓

Review

↓

Implementation

↓

Testing

↓

Documentation

↓

Release

↓

Monitoring

↓

Iteration
```

---

# Conclusion

The NexaInvite API is designed to provide a secure, consistent, and scalable interface for all client applications and integrations.

Following these standards ensures interoperability, simplifies maintenance, and enables rapid development across web, mobile, and third-party ecosystems while supporting future expansion of the NexaForge platform.