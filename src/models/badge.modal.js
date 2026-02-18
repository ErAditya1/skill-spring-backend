const badgeSchema = new mongoose.Schema({
  user_Id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  title: String,
  description: String,
  icon: String,
}, { timestamps: true });

export const Badge = mongoose.model("Badge", badgeSchema);
