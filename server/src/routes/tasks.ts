import { Router } from "express";
import { createTask, deleteTask, getTask, listTasks, updateTask } from "../controllers/taskController.js";

export const taskRouter = Router();

taskRouter.get("/", listTasks);
taskRouter.post("/", createTask);
taskRouter.get("/:id", getTask);
taskRouter.patch("/:id", updateTask);
taskRouter.delete("/:id", deleteTask);
