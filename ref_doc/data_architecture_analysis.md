# Data Architecture Analysis: Resolving Interconnected Data

## 1. Executive Summary & Human POV
From a human, architectural perspective, the current system is suffering from a fundamental flaw: **data entanglement**. When company data becomes too interconnected without clear boundaries, the system state becomes "confused." This leads to unpredictable bugs, data bleed between contexts, and scaling issues.

We are analyzing this from a **Separation of Concerns (SOC)** and architectural point of view, establishing a clear hierarchy: **Company is Primary, User is Secondary**.

## 2. The Core Bug: Data Confusion
When data is interconnected without a strict hierarchy, the lines blur between who owns what data and how it should be accessed. 

**Symptoms of the Bug:**
- **Data Bleed:** A user might accidentally see or modify data belonging to another company or global company data because the query boundaries are loosely defined.
- **Logic Entanglement:** Business logic checks if a *user* can do something, rather than checking if the *user's role within the company* allows it.
- **Cascading Failures:** Updating a company record might inadvertently break user states, or vice versa, because their data models are too tightly woven together.

## 3. Separation of Concerns (SOC) & Architectural POV

To fix the "confused" data, we must decouple the entities. 

### Company as Primary (The Base/Tenant)
The Company is the central pillar of the architecture. It is the absolute source of truth for business data.
- **Independence:** A Company record should exist and make sense entirely independently of any specific User.
- **Data Ownership:** Assets, billing, configurations, and core operational data belong *strictly* to the Company. 

### User as Secondary (The Actor)
The User is merely an actor who interacts with the Company data.
- **Contextual Access:** A User only has context *through* their relationship with a Company. 
- **Stateless (Relatively):** User profiles (name, password, personal preferences) should be completely isolated from Company data. 

## 4. Proposed A/B Architecture Model

We need to move from a web of interconnected tables/models to a strict, directional hierarchy.

### A. The Abstract Level (Global/User Identity)
- **`Users` Table:** Only contains authentication and global profile info (Email, Password Hash, Global ID). No company-specific flags here.

### B. The Base Level (Tenant/Company Data)
- **`Companies` Table:** Contains core tenant data (Name, Tax ID, Global Settings). No user-specific data here.

### The Bridge (The Intersect)
To connect them without tangling them, we use a strict intersection layer:
- **`Company_Users` (or `Memberships`) Table:** This is the *only* place where a User and a Company interconnect. 
  - `user_id`
  - `company_id`
  - `role_in_company` (e.g., Admin, Viewer)
  - `status` (Active, Suspended)

## 5. Conclusion and Next Steps
By enforcing this SOC, the data is no longer "confused." If you need to load a dashboard, you load the **Primary** (Company) data based on the explicit permissions granted to the **Secondary** (User) via the Bridge. 

**Next Steps to Implement:**
1. **Audit Data Models:** Identify fields in the `Users` table that actually belong to the `Company` (or vice versa).
2. **Sever Direct Links:** Remove foreign keys or API endpoints that try to query Company data directly through a User object without explicitly passing through a defined role/tenant context.
3. **Refactor Queries:** Ensure all database queries for business data are scoped strictly by `company_id` first, and user authorization second.
