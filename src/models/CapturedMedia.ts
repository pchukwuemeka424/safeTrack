import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Recipient camera stills captured after explicit browser permission
 * on a public investigation link (same user-gesture model as location).
 */
const CapturedMediaSchema = new Schema(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: "Investigation",
      required: true,
      index: true,
    },
    linkId: {
      type: Schema.Types.ObjectId,
      ref: "InvestigationLink",
      required: true,
      index: true,
    },
    accessEventId: {
      type: Schema.Types.ObjectId,
      ref: "AccessEvent",
      default: null,
    },
    consentStatus: {
      type: String,
      enum: ["GRANTED", "DENIED", "UNAVAILABLE", "TIMEOUT"],
      required: true,
    },
    facingMode: {
      type: String,
      enum: ["user", "environment", "unknown"],
      default: "unknown",
    },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    storageKey: { type: String, required: true },
    thumbnailStorageKey: { type: String, required: true },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    checksumSha256: { type: String, required: true, index: true },
    capturedAt: { type: Date, default: Date.now, index: true },
    retentionExpiresAt: { type: Date, required: true, index: true },
    deviceCategory: { type: String, default: null },
    browser: { type: String, default: null },
    operatingSystem: { type: String, default: null },
  },
  { timestamps: true },
);

CapturedMediaSchema.index({ caseId: 1, capturedAt: -1 });

export type CapturedMediaDocument = InferSchemaType<
  typeof CapturedMediaSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const CapturedMedia: Model<CapturedMediaDocument> =
  mongoose.models.CapturedMedia ||
  mongoose.model<CapturedMediaDocument>("CapturedMedia", CapturedMediaSchema);
