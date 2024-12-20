import { Schema, model } from "mongoose";

const pujaSchema = new Schema(
  {
    adminID: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pujaName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxLength: 30,
    },
    pujaImage: {
      type: String,
      required: true,
    },
    baseFare: {
      type: Number,
      trim: true,
      required: true,
      maxLength: 65,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      enum: ["Astrology", "Puja", "Homam", "Vastu", "Others"],
    },
    duration: {
      type: Number,
      required: true,
      trim: true,
      maxLength: 30,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxLength: 30,
    },
  },
  {
    timestamps: true,
  }
);

//create a table
const Puja = model("Puja", pujaSchema);

export default Puja;
