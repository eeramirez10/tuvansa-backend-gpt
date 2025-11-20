
import {ClientOptions} from 'openai'
import { envs } from './envs'

export const openAiConfig: ClientOptions = {
  apiKey: envs.OPEN_API_KEY
}