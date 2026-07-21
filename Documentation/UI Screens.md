# docs/28-UI-Screens.md

> **NexaForge Technologies**
>
> **NexaInvite UI Screens & User Experience Specification**
>
> **Product:** NexaInvite
>
> **Version:** 1.0
>
> **Classification:** Internal Design & Engineering Documentation
>
> **Document Owner:** Product Design Team
>
> **Last Updated:** July 2026

---

# UI Screens Specification

## Purpose

This document defines every major screen, page, user flow, and interaction of the NexaInvite platform.

It acts as the single source of truth for:

- UI/UX Designers
- Frontend Developers
- Backend Developers
- QA Engineers
- Product Managers

Each screen includes:

- Purpose
- Components
- User Actions
- API Dependencies
- Validation Rules
- Responsive Behavior
- Acceptance Criteria

---

# Design Philosophy

NexaInvite should feel:

- Modern
- Elegant
- Premium
- Fast
- Minimal
- Mobile First

Users should be able to create an invitation within **5 minutes** without needing design experience.

---

# Sitemap

```text
Landing Page
│
├── Login
├── Register
├── Forgot Password
│
├── Dashboard
│   ├── My Invitations
│   ├── Templates
│   ├── Analytics
│   ├── Guest List
│   ├── Notifications
│   ├── Billing
│   └── Settings
│
├── Invitation Editor
│   ├── Canvas
│   ├── Layers
│   ├── Assets
│   ├── Typography
│   ├── Background
│   ├── Preview
│   └── Export
│
├── Public Invitation
├── RSVP
├── Admin Portal
└── Help Center
```

---

# User Journey

```text
Landing Page

↓

Register

↓

Verify Email

↓

Dashboard

↓

Browse Templates

↓

Choose Template

↓

Customize

↓

Preview

↓

Publish

↓

Share

↓

Receive RSVPs

↓

Manage Guests
```

---

# Screen 1 — Landing Page

## Purpose

Introduce NexaInvite and convert visitors into users.

---

### Sections

- Navigation Bar
- Hero Section
- Product Demo
- Features
- Template Showcase
- Pricing
- Testimonials
- FAQ
- Footer

---

### CTA Buttons

- Get Started
- Explore Templates
- Watch Demo

---

### APIs

- Featured Templates
- Testimonials
- Pricing Plans

---

### Acceptance Criteria

- Loads in under 2 seconds
- Responsive on all devices
- SEO optimized
- Lighthouse score >90

---

# Screen 2 — Registration

## Components

- Full Name
- Email
- Password
- Confirm Password
- Google Sign In
- Terms Checkbox

---

### Validation

- Email format
- Strong password
- Duplicate email detection

---

### Success Flow

```
Register

↓

Email Verification

↓

Dashboard
```

---

# Screen 3 — Login

Components

- Email
- Password
- Remember Me
- Forgot Password
- Login Button
- Google Login

---

Errors

- Invalid credentials
- Locked account
- Unverified email

---

# Screen 4 — Forgot Password

Fields

- Email

Actions

- Send Reset Link

---

# Screen 5 — Dashboard

## Purpose

Central workspace.

---

Widgets

- Welcome Card
- Recent Invitations
- Drafts
- Published Invitations
- RSVP Summary
- Subscription Status
- Notifications
- Quick Actions

---

Sidebar

- Dashboard
- Templates
- Invitations
- Guests
- Billing
- Analytics
- Settings

---

Quick Actions

- New Invitation
- Browse Templates
- Import Guests
- Upgrade Plan

---

# Screen 6 — Template Gallery

Purpose

Allow users to browse templates.

---

Filters

- Wedding
- Birthday
- Anniversary
- Corporate
- Religious
- Baby Shower

---

Sorting

- Popular
- Newest
- Premium
- Free

---

Cards

Each card displays

- Thumbnail
- Name
- Category
- Price
- Preview Button
- Use Template Button

---

# Screen 7 — Template Preview

Large Preview

Information

- Designer
- Category
- Price
- Features

Buttons

- Use Template
- Favorite
- Share Preview

---

# Screen 8 — Invitation Editor

The most important screen.

---

Layout

```text
----------------------------------------------------

Top Toolbar

----------------------------------------------------

Left Panel

Canvas

Right Panel

----------------------------------------------------

Bottom Timeline

----------------------------------------------------
```

---

Top Toolbar

- Save
- Undo
- Redo
- Preview
- Publish
- Export

---

Left Sidebar

- Templates
- Backgrounds
- Text
- Images
- Icons
- Shapes
- Uploads

---

Canvas

Editable invitation.

Supports

- Drag
- Resize
- Rotate
- Duplicate
- Lock
- Delete

---

Right Sidebar

Properties

- Font
- Color
- Opacity
- Layer Order
- Alignment
- Border
- Shadow
- Animation (Future)

---

Bottom

Zoom

Page Navigation

Guides

---

# Screen 9 — AI Assistant (Future)

Features

- Generate invitation text
- Suggest color palette
- Improve typography
- Auto align objects
- Generate invitation in one click

Chat interface with design suggestions.

---

# Screen 10 — Guest Management

Table Columns

- Guest Name
- Phone
- Email
- Group
- RSVP Status

Actions

- Add
- Edit
- Delete
- Import CSV
- Export CSV
- Send Reminder

---

# Screen 11 — RSVP Dashboard

Charts

- Accepted
- Declined
- Pending
- Maybe

Statistics

- Response Rate
- Total Guests
- Attendance %

---

# Screen 12 — Share Invitation

Methods

- WhatsApp
- Email
- QR Code
- Copy Link

Settings

- Public
- Password Protected
- Expiry Date

---

# Screen 13 — Billing

Cards

- Current Plan
- Payment History
- Upgrade
- Invoice Download

---

# Screen 14 — Analytics

Charts

- Invitation Views
- RSVP Trend
- Link Clicks
- Device Usage
- Location Distribution

KPIs

- Total Views
- Shares
- Guests
- Conversion Rate

---

# Screen 15 — Settings

Tabs

- Profile
- Security
- Notifications
- Subscription
- Language
- Privacy

---

# Screen 16 — Public Invitation

Guest View

Displays

- Invitation
- Event Details
- Location
- RSVP Button
- Contact Information

No login required.

---

# Screen 17 — RSVP Form

Fields

- Name
- Attendance
- Guest Count
- Message

Buttons

- Submit
- Cancel

---

# Screen 18 — Payment

Steps

```text
Plan Selection

↓

Checkout

↓

Payment Gateway

↓

Success

↓

Invoice
```

---

# Screen 19 — Success Screen

Displays

- Success Animation
- Invitation Link
- Share Buttons
- Return to Dashboard

---

# Screen 20 — Admin Dashboard

Widgets

- Users
- Revenue
- Templates
- Active Subscriptions
- Support Tickets

---

Sidebar

- Dashboard
- Users
- Templates
- Payments
- Reports
- Settings

---

# Empty States

Every screen should include meaningful empty states.

Example:

No Invitations

Illustration

Text:

> "Create your first invitation and start celebrating."

CTA

Create Invitation

---

# Loading States

Use:

- Skeleton Loaders
- Progress Indicators
- Button Loading States

Avoid blank screens.

---

# Error States

Examples

404

Invitation Not Found

500

Something Went Wrong

Network Error

Retry Button

---

# Responsive Design

Desktop

1440px+

Tablet

768px

Mobile

375px+

Priority:

Mobile-first.

---

# Accessibility

Comply with WCAG 2.2 AA.

Requirements

- Keyboard navigation
- Screen reader support
- High contrast
- Focus indicators
- Alt text
- Semantic HTML

---

# Animations

Subtle only.

Examples

- Fade
- Slide
- Scale

Duration

200–300 ms

Avoid excessive motion.

---

# UI Components

Reusable components

- Button
- Card
- Input
- Modal
- Drawer
- Toast
- Dropdown
- Tabs
- Table
- Pagination
- Breadcrumb
- Tooltip
- Avatar
- Badge
- Loader

---

# Navigation Flow

```text
Landing

↓

Login

↓

Dashboard

↓

Template Gallery

↓

Editor

↓

Preview

↓

Publish

↓

Share

↓

Analytics
```

---

# Acceptance Criteria

Every screen must satisfy:

- Responsive layout
- Accessible controls
- Fast rendering
- API integration
- Validation handling
- Error handling
- Loading states
- Unit & UI tests
- Cross-browser compatibility

---

# Future Screens

- AI Design Studio
- Wedding Website Builder
- Vendor Marketplace
- Seating Planner
- Gift Registry
- Mobile App
- Team Collaboration
- Theme Marketplace
- API Management
- White Label Portal

---

# UI Success Metrics

Measure:

- Time to create invitation
- Screen load time
- User completion rate
- Click-through rate
- User satisfaction
- Feature adoption
- Drop-off rate

---

# Conclusion

The NexaInvite UI is designed to provide a premium, intuitive, and highly customizable experience while remaining simple enough for first-time users.

Every interface should minimize friction, guide users naturally through the invitation creation process, and reinforce the premium identity of the NexaForge ecosystem. A consistent design system, reusable components, and accessibility-first approach ensure that the product remains scalable, maintainable, and user-friendly as new features are introduced.