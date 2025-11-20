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
        description: 'Servidor de Producción',
      },
      {
        url: 'http://localhost:3000/api',
        description: 'Servidor de Desarrollo',
      },
    ],
    paths: {
      "/purchase-analisys": {
        post: {
          summary: "Genera una consulta SQL desde un prompt del usuario y devuelve resultados paginados",
          tags: ["GPT"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserPrompt"
                }
              }
            }
          },
          responses: {
            200: {
              description: "Consulta generada y ejecutada exitosamente",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/PaginatedResponse"
                  }
                }
              }
            },
            400: {
              description: "Error en la solicitud",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" }
                }
              }
            },
            500: {
              description: "Error del servidor",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" }
                }
              }
            }
          }
        }
      },
      "/sql/query": {
        get: {
          summary: "Ejecuta una consulta previamente generada usando su queryId con paginación",
          tags: ["GPT"],
          parameters: [
            {
              name: "queryId",
              in: "query",
              required: true,
              schema: { type: "string" },
              description: "Identificador único de la consulta previamente generada"
            },
            {
              name: "page",
              in: "query",
              required: false,
              schema: { type: "integer", default: 1 },
              description: "Número de página actual"
            },
            {
              name: "pageSize",
              in: "query",
              required: false,
              schema: { type: "integer", default: 10 },
              description: "Cantidad de resultados por página"
            }
          ],
          responses: {
            200: {
              description: "Consulta ejecutada exitosamente",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/PaginatedResponse"
                  }
                }
              }
            },
            400: {
              description: "Parámetros inválidos",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" }
                }
              }
            },
            500: {
              description: "Error del servidor",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" }
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
            prompt: "Genera un análisis de reabastecimiento para Monterrey.",
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            queryId: {
              type: 'string',
              description: 'ID de la consulta almacenada',
              example: 'f3a1e8bc-bfe2-4e88-83f2-4f4d1c29e231'
            },
            items: {
              type: 'array',
              items: {
                type: 'object'
              },
              description: 'Array de resultados paginados'
            },
            page: {
              type: 'integer',
              example: 1
            },
            pageSize: {
              type: 'integer',
              example: 10
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Mensaje de error',
              example: 'queryId es requerido'
            },
          }
        }
      },
    },
  },
  apis: [path.join(__dirname, '../presentation/gpt/controller.ts')],
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Application) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
};
