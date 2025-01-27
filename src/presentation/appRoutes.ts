import { Request, Response, Router } from "express";

export class AppRoutes {

  static routes(): Router {

    const router = Router()

    router.get('/', (req, res) => {
      res.json({ msg: 'hola mundo'})
    })

    return router
  }
}