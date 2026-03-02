# Decisions Log

This document records the key architectural and implementation decisions made during the project.

## Local Development Environment

*   **Decision:** Proceed with the existing remote Supabase project (`lbdmxtssrnflfawsccow`) instead of a local Docker-based setup.
*   **Reason:** The `supabase start` command, required for local development, depends on Docker, which is not available in the execution environment. The repository provides a `.env.remote` file with credentials for a live, healthy Supabase project, and the instructions explicitly allow for using existing credentials. This approach unblocks development and aligns with the project's provided resources.
