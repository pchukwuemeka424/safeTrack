import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const EvidenceSchema = new Schema(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: "Investigation",
      required: true,
      index: true,
    },
    imageId: {
      type: Schema.Types.ObjectId,
      ref: "ImageAsset",
      default: null,
    },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    evidenceType: {
      type: String,
      enum: ["IMAGE", "LOCATION", "ACCESS_EVENT", "NOTE", "OTHER"],
      default: "OTHER",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export type EvidenceDocument = InferSchemaType<typeof EvidenceSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Evidence: Model<EvidenceDocument> =
  mongoose.models.Evidence ||
  mongoose.model<EvidenceDocument>("Evidence", EvidenceSchema);
