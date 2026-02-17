import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";


export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    // Get the token from the cookies or Authorization header
    // console.log("tokens from cookies", req.cookies)
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request. No token provided.");
    }
    
    // Extract deviceId from headers
    const deviceId = req.headers['x-unique-id'];
    if (!deviceId) {
      throw new ApiError(400, "No unique device ID provided.");
    }

    // Decode the token using JWT secret
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken?._id;
   

    if (!userId) {
      throw new ApiError(401, "Invalid token. User not found.");
    }

    // Find the user by ID and include the devices array
    const user = await User.findById(userId).select("-password -refreshToken");

    if (!user) {
      throw new ApiError(401, "User not found with this access token.");
    }


    const deviceIndex = user.devices.findIndex(
      device => device.deviceId === deviceId || device.accessToken == token
    );

 

    

    if (deviceIndex === -1) {
      throw new ApiError(401, "Invalid device ID. No matching device found.");
    }

    const device = user.devices[deviceIndex];
    
    

    // Optionally, you can check if the token matches the device's stored token
    if (device.accessToken !== token) {
      throw new ApiError(401, "Invalid access token for this device.");
    }

    // Attach the user and device information to the request object

    if(device && !device.deviceId && deviceId){
      device.deviceId = deviceId;
      await user.save();
    }
    
    req.user = user;
    req.device = device; // Store the device object, if you need it later in the request lifecycle
    req.deviceId = deviceId;
    req.accessToken = token

    next(); // Continue to the next middleware or route handler
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token.");
  }
});

