import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * LocationEvent stores consented location data separately for retention/deletion control.
 * Coordinates are always encrypted at rest.
 */
const LocationEventSchema = new Schema(
  {
    accessEventId: {
      type: Schema.Types.ObjectId,
      ref: "AccessEvent",
      required: true,
      index: true,
    },
    linkId: {
      type: Schema.Types.ObjectId,
      ref: "InvestigationLink",
      required: true,
    },
    caseId: {
      type: Schema.Types.ObjectId,
      ref: "Investigation",
      required: true,
      index: true,
    },
    encryptedCoordinates: { type: String, required: true },
    /** Encrypted reverse-geocoded address derived from consented coordinates */
    encryptedAddress: { type: String, default: null },
    city: { type: String, default: null },
    country: { type: String, default: null },
    accuracy: { type: Number, required: true },
    capturedAt: { type: Date, required: true },
    consentStatus: {
      type: String,
      enum: ["GRANTED"],
      default: "GRANTED",
    },
    retentionExpiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true },
);

export type LocationEventDocument = InferSchemaType<typeof LocationEventSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const LocationEvent: Model<LocationEventDocument> =
  mongoose.models.LocationEvent ||
  mongoose.model<LocationEventDocument>("LocationEvent", LocationEventSchema);
