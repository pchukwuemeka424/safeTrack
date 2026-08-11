import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const NotificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "LINK_ACCESSED",
        "LOCATION_GRANTED",
        "LOCATION_DENIED",
        "CAMERA_CAPTURED",
        "LINK_EXPIRED",
        "MAX_VIEWS_REACHED",
        "SYSTEM",
      ],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    caseId: { type: Schema.Types.ObjectId, ref: "Investigation", default: null },
    linkId: { type: Schema.Types.ObjectId, ref: "InvestigationLink", default: null },
    read: { type: Boolean, default: false },
    emailed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type NotificationDocument = InferSchemaType<typeof NotificationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Notification: Model<NotificationDocument> =
  mongoose.models.Notification ||
  mongoose.model<NotificationDocument>("Notification", NotificationSchema);
