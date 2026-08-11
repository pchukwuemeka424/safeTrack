import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const InvestigationLinkSchema = new Schema(
  {
    shortCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    caseId: {
      type: Schema.Types.ObjectId,
      ref: "Investigation",
      required: true,
      index: true,
    },
    imageId: {
      type: Schema.Types.ObjectId,
      ref: "ImageAsset",
      required: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "EXPIRED", "REVOKED", "MAX_VIEWS", "INACTIVE"],
      default: "ACTIVE",
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expiresAt: { type: Date, required: true, index: true },
    maximumViews: { type: Number, default: 1 },
    currentViews: { type: Number, default: 0 },
    locationRequired: { type: Boolean, default: true },
    allowViewWithoutLocation: { type: Boolean, default: false },
    consentText: { type: String, required: true },
    revokedAt: { type: Date, default: null },
    firstAccessAt: { type: Date, default: null },
    lastAccessAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type InvestigationLinkDocument = InferSchemaType<
  typeof InvestigationLinkSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const InvestigationLink: Model<InvestigationLinkDocument> =
  mongoose.models.InvestigationLink ||
  mongoose.model<InvestigationLinkDocument>(
    "InvestigationLink",
    InvestigationLinkSchema,
  );
