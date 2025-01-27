import { AppRoutes } from "./presentation/appRoutes"
import { Server } from "./presentation/server"

(() => main())()


async function main() {

  const server = new Server({port:3000, routes:AppRoutes.routes() })

  server.start()

}