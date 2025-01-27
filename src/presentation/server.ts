
import express, { Router } from 'express'
import cors from 'cors'

interface Option {
  port: any
  routes: Router
}

export class Server {

  private app = express()

  private readonly port: any
  private routes: Router

  constructor(options:Option) {
    this.port = options.port
    this.routes = options.routes
  }

  

  async start() {

    console.log(this.port)

    //Middelwares 
    this.app.use(express.urlencoded({ extended: true}))
    this.app.use(express.json())
    this.app.use(cors())


    // Routes 
    this.app.use(this.routes)


    this.app.listen(this.port, () => {
      console.log(`Server on port ${this.port}`)
    })
  }

}