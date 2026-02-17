import { Router } from "express";
import {
  deleteMessage,
  getAllMessages,
  sendMessage,
} from "../controllers/message.controllers.js";

import { verifyJWT } from "../middelwares/auth.middelware.js";
import { upload } from "../middelwares/multer.middelware.js";

const router = Router();

router.use(verifyJWT);

router
  .route("/:chatId")
  .get( getAllMessages)
  .post(
    upload.fields([{ name: "attachments", maxCount: 5 }]),
    sendMessage
  );

//Delete message route based on Message id

router
  .route("/:chatId/:messageId")
  .delete(
    deleteMessage
  );

export default router;
