import { Router } from "express";
import { createClient, deleteClient, getClient, listClients, updateClient } from "../controllers/clientController.js";
import { requireRoles } from "../middleware/auth.js";

export const clientRouter = Router();

clientRouter.use(requireRoles("ADMIN", "PROJECT_MANAGER"));
clientRouter.get("/", listClients);
clientRouter.post("/", createClient);
clientRouter.get("/:id", getClient);
clientRouter.patch("/:id", updateClient);
clientRouter.delete("/:id", deleteClient);
