import { Schema, model } from "mongoose";

const pujaSchema = new Schema(
  {
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
      enum: ["Astrology", "PUja", "Homam", "Vastu", "Others"],
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