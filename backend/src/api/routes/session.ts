import { Router, Request, Response } from "express";
import { sessions } from "./chat";

export function createSessionRouter() {
  const router = Router();

  // GET /api/session/:id
  router.get("/:id", (req: Request, res: Response) => {
    const state = sessions.get(req.params.id as string);
    if (!state) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    res.json({
      session_id: req.params.id as string,
      birth_details: state.birthDetails ?? null,
      natal_chart: state.natalChart ?? null,
      message_count: state.messages?.length ?? 0,
    });
  });

  // DELETE /api/session/:id
  router.delete("/:id", (req: Request, res: Response) => {
    sessions.delete(req.params.id as string);
    res.json({ deleted: true });
  });

  return router;
}
