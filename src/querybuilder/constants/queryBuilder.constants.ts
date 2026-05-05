export const QUERYBUILDER_DEFAULT = 'QUERYBUILDER_DEFAULT';

export function getQuerybuilderToken(name?: string): string {
  return name ? `QUERYBUILDER_SERVICE_${name}` : QUERYBUILDER_DEFAULT;
}
