const isDev = import.meta.env.DEV

const noop = () => {}

export const logger = {
  debug: isDev ? console.debug.bind(console, "[tasche]") : noop,
  info: isDev ? console.info.bind(console, "[tasche]") : noop,
  warn: console.warn.bind(console, "[tasche]"),
  error: console.error.bind(console, "[tasche]"),
}
