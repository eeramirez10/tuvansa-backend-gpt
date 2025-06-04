export function sanitizeSQL(sql: string): string {
  return sql.replace(/\bLIMIT\s+\d+/gi, '')
    .replace(/\bOFFSET\s+\d+/gi, '')
    .trim();
}