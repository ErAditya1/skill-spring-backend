import { Router } from "express";
import {
  addNewParticipantInGroupChat,
  createAGroupChat,
  createOrGetAOneOnOneChat,
  deleteGroupChat,
  deleteOneOnOneChat,
  getAllChats,
  getGroupChatDetails,
  leaveGroupChat,
  removeParticipantFromGroupChat,
  renameGroupChat,
  searchAvailableUsers,
} from "../controllers/chat.controllers.js";

import { verifyJWT } from "../middelwares/auth.middelware.js";
import { upload } from "../middelwares/multer.middelware.js";


const router = Router();

router.use(verifyJWT);

router.route("/").get(getAllChats);

router.route("/users").get(searchAvailableUsers);

router
  .route("/c/:receiverId")
  .post(
    createOrGetAOneOnOneChat
  );

router
  .route("/group")
  .post( upload.single("avatar"), createAGroupChat);

router
  .route("/group/:chatId")
  .get(getGroupChatDetails)
  .patch(
    renameGroupChat
  )
  .delete(deleteGroupChat);

router
  .route("/group/:chatId/:participantId")
  .post(
    addNewParticipantInGroupChat
  )
  .delete(
    removeParticipantFromGroupChat
  );

router
  .route("/leave/group/:chatId")
  .delete( leaveGroupChat);

router
  .route("/remove/:chatId")
  .delete( deleteOneOnOneChat);

export default router;
