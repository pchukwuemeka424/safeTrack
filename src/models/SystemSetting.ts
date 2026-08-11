import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const SystemSettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String, default: "" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

export type SystemSettingDocument = InferSchemaType<typeof SystemSettingSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SystemSetting: Model<SystemSettingDocument> =
  mongoose.models.SystemSetting ||
  mongoose.model<SystemSettingDocument>("SystemSetting", SystemSettingSchema);

export const DEFAULT_SETTINGS = {
  retentionDays: 7,
  maxUploadBytes: 10 * 1024 * 1024,
  storeRawIp: false,
  allowRegistration: true,
  aiModuleEnabled: true,
  mapProvider: "mapbox",
} as const;
