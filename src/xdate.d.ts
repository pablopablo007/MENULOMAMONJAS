/**
 * Tipos mínimos para "xdate" (la usa react-native-calendars y no trae tipos).
 * Solo se declara lo que la app usa: la configuración de idioma (LocaleConfig).
 */
declare module 'xdate' {
  export interface LocaleXDate {
    monthNames: string[];
    monthNamesShort: string[];
    dayNames: string[];
    dayNamesShort: string[];
    today?: string;
    amDesignator?: string;
    pmDesignator?: string;
  }

  export default class XDate {
    static locales: Record<string, LocaleXDate>;
    static defaultLocale: string;
    constructor(...args: (string | number | Date)[]);
    toString(formato?: string): string;
    getFullYear(): number;
    getMonth(): number;
    getDate(): number;
  }
}
