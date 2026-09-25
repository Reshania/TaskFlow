import { Router } from "express";
import { createUser, deleteUser, listDevelopers, listUsers, updateUser } from "../controllers/userController.js";
import { requireRoles } from "../middleware/auth.js";

export const userRouter = Router();

userRouter.get("/developers", requireRoles("ADMIN", "PROJECT_MANAGER"), listDevelopers);
userRouter.get("/", requireRoles("ADMIN"), listUsers);
userRouter.post("/", requireRoles("ADMIN"), createUser);
userRouter.patch("/:id", requireRoles("ADMIN"), updateUser);
userRouter.delete("/:id", requireRoles("ADMIN"), deleteUser);
