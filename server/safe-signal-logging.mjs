// Some libsignal diagnostics include session keys or chat identifiers.
export function installSafeSignalLogging(logger) {
  for (const method of ['warn', 'error']) {
    const original = logger[method].bind(logger);
    logger[method] = (...args) => {
      const first = typeof args[0] === 'string' ? args[0] : '';
      if (/^(Session already closed|Session error:|V1 session storage migration error|Unhandled bucket type)/.test(first)) {
        original('WhatsApp session diagnostic withheld for privacy.');
      } else original(...args);
    };
  }
}
