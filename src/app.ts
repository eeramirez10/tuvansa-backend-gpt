import { AppRoutes } from "./presentation/appRoutes"
import { Server } from "./presentation/server"

(() => main())()


async function main() {

  const server = new Server({ port: process.env.PORT || '4000', routes: AppRoutes.routes() })

  server.start()

}