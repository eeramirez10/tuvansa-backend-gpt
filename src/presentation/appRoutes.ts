import { Request, Response, Router } from "express";
import { GptRoutes } from "./gpt/routes";

export class AppRoutes {

  static routes(): Router {

    const router = Router()

    router.use('/api/gpt', GptRoutes.routes())

    return router
  }
}