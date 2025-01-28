import 'dotenv/config'
import { get } from 'env-var'

export const envs = {
OPEN_API_KEY: get('OPEN_API_KEY').required().asString(),
URL_MYSQL: get('URL_MYSQL').required().asString(),
USER_MYSQL: get('USER_MYSQL').required().asString(),
PASSWORD_MYSQL: get('PASSWORD_MYSQL').required().asString(),
DB_MYSQL: get('DB_MYSQL').required().asString(),
PORT: get('PORT').required().asString(),
}
