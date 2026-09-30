// The installed date-fns ships without .d.ts files; declare the one locale we
// register with react-datepicker (see src/components/useDatePickerI18n.ts).
declare module "date-fns/locale" {
  export const bn: Parameters<typeof import("react-datepicker").registerLocale>[1];
}
