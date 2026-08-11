import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const AccessEventSchema = new Schema(
  {
    linkId: {
      type: Schema.Types.ObjectId,
      ref: "InvestigationLink",
      required: true,
      index: true,
    },
    caseId: {
      type: Schema.Types.ObjectId,
      ref: "Investigation",
      required: true,
      index: true,
    },
    timestamp: { type: Date, default: Date.now, index: true },
    consentStatus: {
      type: String,
      enum: ["PENDING", "GRANTED", "DENIED", "UNAVAILABLE", "TIMEOUT"],
      default: "PENDING",
    },
    consentRequestedAt: { type: Date, default: null },
    consentGrantedAt: { type: Date, default: null },
    /** Encrypted lat/lng payload — never stored in plaintext */
    encryptedCoordinates: { type: String, default: null },
    accuracy: { type: Number, default: null },
    /** Encrypted street address from consented GPS reverse-geocode */
    encryptedAddress: { type: String, default: null },
    approximateIpLocation: { type: String, default: null },
    ipHash: { type: String, default: null },
    encryptedIp: { type: String, default: null },
    userAgent: { type: String, default: null },
    deviceCategory: { type: String, default: null },
    browser: { type: String, default: null },
    operatingSystem: { type: String, default: null },
    country: { type: String, default: null },
    city: { type: String, default: null },
    eventType: {
      type: String,
      enum: [
        "PAGE_VIEW",
        "CONSENT_REQUESTED",
        "CONSENT_GRANTED",
        "CONSENT_DENIED",
        "CAMERA_CAPTURED",
        "CAMERA_DENIED",
        "IMAGE_UNLOCKED",
        "ERROR",
      ],
      required: true,
    },
  },
  { timestamps: true },
);

AccessEventSchema.index({ caseId: 1, timestamp: -1 });
AccessEventSchema.index({ linkId: 1, timestamp: -1 });

export type AccessEventDocument = InferSchemaType<typeof AccessEventSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AccessEvent: Model<AccessEventDocument> =
  mongoose.models.AccessEvent ||
  mongoose.model<AccessEventDocument>("AccessEvent", AccessEventSchema);
