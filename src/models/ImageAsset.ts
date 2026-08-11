import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ImageAssetSchema = new Schema(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: "Investigation",
      required: true,
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    originalFilename: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    storageKey: { type: String, required: true },
    blurStorageKey: { type: String, required: true },
    thumbnailStorageKey: { type: String, required: true },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    checksumSha256: { type: String, required: true, index: true },
    malwareScanStatus: {
      type: String,
      enum: ["PENDING", "CLEAN", "SUSPICIOUS", "BLOCKED", "SKIPPED"],
      default: "SKIPPED",
    },
    metadataStripped: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type ImageAssetDocument = InferSchemaType<typeof ImageAssetSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ImageAsset: Model<ImageAssetDocument> =
  mongoose.models.ImageAsset ||
  mongoose.model<ImageAssetDocument>("ImageAsset", ImageAssetSchema);
