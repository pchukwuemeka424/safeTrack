import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const InvestigationSubjectSchema = new Schema(
  {
    label: {
      type: String,
      enum: ["PERSON_OF_INTEREST", "SUBJECT", "WATCHLIST_REFERENCE", "INVESTIGATION_SUBJECT"],
      default: "INVESTIGATION_SUBJECT",
    },
    referenceCode: { type: String, default: null },
    notes: { type: String, default: null },
  },
  { _id: false },
);

const InvestigationSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    caseReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    description: { type: String, default: "" },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
    },
    investigationType: {
      type: String,
      enum: [
        "SAFEGUARDING",
        "MISSING_PERSON",
        "DIGITAL_INVESTIGATION",
        "SECURITY_INCIDENT",
        "OTHER",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ["DRAFT", "ACTIVE", "UNDER_REVIEW", "CLOSED", "ARCHIVED"],
      default: "ACTIVE",
    },
    locationRequired: { type: Boolean, default: true },
    linkExpiryHours: { type: Number, default: 72 },
    maximumViews: { type: Number, default: 1 },
    consentMessage: {
      type: String,
      default:
        "OALS is requesting your current location because this investigation link has been configured to require location verification before the image can be viewed.",
    },
    allowViewWithoutLocation: { type: Boolean, default: false },
    subject: { type: InvestigationSubjectSchema, default: () => ({}) },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assignedReviewers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    retentionDays: { type: Number, default: 7 },
    notes: { type: String, default: "" },
    aiAnalysis: {
      riskIndicator: {
        type: String,
        enum: ["LOW", "MEDIUM", "HIGH", null],
        default: null,
      },
      summary: { type: String, default: null },
      indicators: [{ type: String }],
      humanReviewStatus: {
        type: String,
        enum: ["NOT_RUN", "PENDING_REVIEW", "REVIEWED", "DISMISSED"],
        default: "NOT_RUN",
      },
      reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
      reviewedAt: { type: Date, default: null },
      disclaimer: {
        type: String,
        default:
          "AI-generated analysis is an investigative aid and must not be treated as proof of criminal activity.",
      },
    },
  },
  { timestamps: true },
);

export type InvestigationDocument = InferSchemaType<typeof InvestigationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Investigation: Model<InvestigationDocument> =
  mongoose.models.Investigation ||
  mongoose.model<InvestigationDocument>("Investigation", InvestigationSchema);
