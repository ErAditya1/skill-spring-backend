import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    console.log(localFilePath);
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    fs.unlinkSync(localFilePath);

    return response;
  } catch (error) {
    console.log(error);

    fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload operation got failed

    return null;
  }
};

const deleteCloudinaryFile = async (cloudinaryFileURL) => {
  if (!cloudinaryFileURL) return null;

  try {
    const response = cloudinary.uploader.destroy(cloudinaryFileURL);

    return response;
  } catch (error) {
    console.log("error in deleting cloudinary file");
    return null;
  }
};

export { uploadOnCloudinary, deleteCloudinaryFile };
