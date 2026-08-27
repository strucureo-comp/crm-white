# API & Backend Requirements for Marketing Components

This document outlines the required API connections, third-party integrations, and database schemas needed to build the Marketing components shown in the UI. Please discuss these requirements with the Team Lead to ensure the backend is prepared for frontend integration.

## 1. Content Hub
*Purpose: Central repository for all marketing copy, blog posts, email templates, and landing page content.*

**Questions / Requirements for Team Lead:**
- **CRUD Endpoints for Content:** Need REST/GraphQL endpoints to Create, Read, Update, and Delete content drafts and published items.
  - `GET /api/content` (List all content with pagination and filtering by type/status)
  - `POST /api/content` (Create new content)
  - `PUT /api/content/:id` (Update content)
- **Versioning:** Do we need a version history API to revert to older versions of a document?
- **Rich Text Storage:** How is rich-text/HTML data being stored in the database?
- **Headless CMS Integration:** Are we using a third-party CMS (like Sanity, Strapi, Contentful) or a custom Supabase table for this?

## 2. Assets
*Purpose: Media library for images, videos, PDFs, and brand assets.*

**Questions / Requirements for Team Lead:**
- **Storage Solution:** Are we using Supabase Storage buckets, AWS S3, or Cloudinary for hosting these files?
- **Upload Endpoints:** 
  - `POST /api/assets/upload` (Endpoint for multi-part file uploads, handling large files like videos).
  - Do we need pre-signed URLs for direct-to-storage uploads from the frontend to save server bandwidth?
- **Asset Metadata API:** 
  - `GET /api/assets` (Fetch files, folders, and metadata like size, dimensions, uploader).
- **Folder Structure:** Does the API support nested folders/directories for organizing assets?

## 3. Campaigns
*Purpose: Managing multi-channel marketing campaigns (Email, SMS, Ads).*

**Questions / Requirements for Team Lead:**
- **Campaign CRUD:**
  - `GET /api/campaigns` (Fetch active, completed, and draft campaigns).
- **Email/SMS Provider Integrations:** 
  - Which third-party services are we using to actually send the emails/SMS? (e.g., SendGrid, Mailchimp, Twilio). 
  - Do we have the API keys and server-side functions ready to trigger these?
- **Analytics & Tracking API:**
  - `GET /api/campaigns/:id/metrics` (Need an endpoint to fetch open rates, click-through rates (CTR), and conversions for the campaign dashboard).
- **Audience/List API:** Endpoint to attach specific contact segments or lists to a campaign.

## 4. Scheduling Calendar
*Purpose: A unified calendar view for scheduled content, campaigns, and social media posts.*

**Questions / Requirements for Team Lead:**
- **Aggregated Calendar Endpoint:**
  - `GET /api/calendar/events?start_date=X&end_date=Y` (We need a single endpoint that returns *all* scheduled items—emails, social posts, meetings—within a given date range).
- **Timezone Handling:** How is the backend handling timezones for scheduled posts? (Everything should ideally be stored in UTC and parsed on the frontend).
- **Rescheduling API:**
  - `PATCH /api/calendar/events/:id` (Endpoint to quickly update the scheduled timestamp if a user drags-and-drops an item on the calendar).

## 5. Social Media Manager
*Purpose: Connecting social accounts, drafting posts, and auto-publishing to platforms like LinkedIn, Twitter/X, Facebook.*

**Questions / Requirements for Team Lead:**
- **OAuth / Account Linking:**
  - How are we handling OAuth2 flows for users to connect their social media accounts? We need endpoints to initiate the OAuth flow and store the access/refresh tokens securely.
- **Publishing Endpoints:**
  - `POST /api/social/publish` (Endpoint to send a drafted post directly to the connected social media APIs).
- **Scheduled Publishing (Cron Jobs):**
  - If posts are scheduled for the future, does the backend have a cron job / background worker system set up to execute the publishing at the correct time?
- **Third-party Aggregators:** Are we building direct API connections to Meta/X/LinkedIn, or are we using an aggregator API like Ayrshare or Buffer?
