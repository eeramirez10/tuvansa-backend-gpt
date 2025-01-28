// src/docs/swagger.ts

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';
import path from 'path';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Generación y Ejecución de Consultas SQL',
      version: '1.0.0',
      description: 'API para generar consultas SQL con OpenAI, ejecutarlas en MySQL y generar resúmenes humanizados.',
    },
    servers: [
      {
        url: 'https://tuvansa-gpt-71d64b682e77.herokuapp.com/api',
        description: 'Servidor de Produccion',
      },
      {
        url: 'http://localhost:3000/api',
        description: 'Servidor de Desarrollo',
      },
      // Puedes añadir más servidores (producción, staging, etc.)
    ],
    "paths": {
    "/gpt/user-prompt-to-sql": {
      "post": {
        "summary": "Genera y ejecuta una consulta SQL basada en un prompt del usuario, y devuelve un resumen.",
        "tags": [
          "GPT"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UserPrompt"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Respuesta exitosa con la consulta SQL generada, el resumen y el total de ventas.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessResponse"
                }
              }
            }
          },
          "400": {
            "description": "Solicitud inválida.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          },
          "500": {
            "description": "Error interno del servidor.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/gpt/test": {
      "get": {
        "summary": "Endpoint de prueba para verificar Swagger.",
        "tags": [
          "GPT"
        ],
        "responses": {
          "200": {
            "description": "Respuesta de prueba.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "message": {
                      "type": "string",
                      "example": "Swagger está funcionando correctamente."
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
    components: {
      schemas: {
        UserPrompt: {
          type: 'object',
          required: ['prompt'],
          properties: {
            prompt: {
              type: 'string',
              description: 'La solicitud del usuario para generar la consulta SQL.',
            },
          },
          example: {
            prompt: "Cual es mi mejor cleinte del 2024",
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Descripción del error.',
            },
          },
          example: {
            error: "El campo 'prompt' es requerido y debe ser una cadena de texto.",
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            sql: {
              type: 'string',
              description: 'La consulta SQL generada.',
            },
            summary: {
              type: 'string',
              description: 'Resumen humanizado de los resultados de la consulta.',
            },
            total: {
              type: 'integer',
              description: 'Total de ventas obtenidas.',
            },
          },
          example: {
            sql: "SELECT * FROM ventas WHERE fecha = CURDATE();",
            summary: "Las ventas totales fueron de 200 unidades.",
            total: 200,
          },
        },
      },
    },
  },
  // Ruta a los archivos que contienen anotaciones de Swagger (JSDoc)
  apis: [path.join(__dirname, '../presentation/gpt/controller.ts')],
};

const specs = swaggerJsdoc(options);
// console.log("Swagger specs generated:", JSON.stringify(specs, null, 2)); // Para depuración

export const setupSwagger = (app: Application) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
};
