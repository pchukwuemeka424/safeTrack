export type UserRole = "ADMIN" | "INVESTIGATOR" | "REVIEWER";

export type InvestigationStatus =
  | "DRAFT"
  | "ACTIVE"
  | "UNDER_REVIEW"
  | "CLOSED"
  | "ARCHIVED";

export type InvestigationPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type InvestigationType =
  | "SAFEGUARDING"
  | "MISSING_PERSON"
  | "DIGITAL_INVESTIGATION"
  | "SECURITY_INCIDENT"
  | "OTHER";

export type LinkStatus = "ACTIVE" | "EXPIRED" | "REVOKED" | "MAX_VIEWS" | "INACTIVE";

export type ConsentStatus =
  | "PENDING"
  | "GRANTED"
  | "DENIED"
  | "UNAVAILABLE"
  | "TIMEOUT";

export type AccessEventType =
  | "PAGE_VIEW"
  | "CONSENT_REQUESTED"
  | "CONSENT_GRANTED"
  | "CONSENT_DENIED"
  | "IMAGE_UNLOCKED"
  | "ERROR";

export type RiskIndicator = "LOW" | "MEDIUM" | "HIGH";

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "CASE_CREATED"
  | "CASE_UPDATED"
  | "IMAGE_UPLOADED"
  | "LINK_CREATED"
  | "LINK_REVOKED"
  | "LINK_ACCESSED"
  | "LOCATION_CONSENT_REQUESTED"
  | "LOCATION_CONSENT_GRANTED"
  | "LOCATION_CONSENT_DENIED"
  | "EVIDENCE_VIEWED"
  | "CASE_EXPORTED"
  | "USER_CREATED"
  | "USER_ROLE_CHANGED"
  | "USER_SUSPENDED"
  | "AI_ANALYSIS_RUN"
  | "SETTINGS_UPDATED";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  emailVerified: boolean;
  mfaEnabled: boolean;
}
