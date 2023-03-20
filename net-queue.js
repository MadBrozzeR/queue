const Element = require('./element.js');
const INIT = 'init';

function debug (queue, type, element, data) {
  if (queue.debug instanceof Function) {
    queue.debug.call(queue, type, element, data);
  }
}

function Queue () {
  this.first = null;
  this.last = null;
  this.data = null;
  this.onEnd = null;
  this.handlers = {};
}
Queue.prototype.push = function (listeners = {}, params) {
  const element = new Element(this, listeners, params);

  debug(this, 'push', element, params);

  this.last && (this.last.next = element);
  this.last = element;
  if (!this.first) {
    this.first = element;
    this.trigger(INIT);
  }

  return element;
};
Queue.prototype.trigger = function (eventName, data) {
  const element = this.first;
  const listener = element && element.listeners[eventName] instanceof Function ? element.listeners[eventName] : null;

  debug(this, 'trigger:' + eventName, element, data);

  if (listener) {
    // Element has listener
    try {
      return listener.call(element, data) || null;
    } catch (error) {
      if (eventName !== 'error') {
        return this.trigger('error', error) || null;
      }
    }
  }

  if (eventName === 'error') {
    // Handle error
    try {
      return this.handlers.error && this.handlers.error.call(this, data) || null;
    } catch (error) {
      return console.log(error) || null;
    }
  }

  try {
    if (element && element.listeners.unhandled instanceof Function) {
      // Handle unexpected event by element's listener
      return element.listeners.unhandled.call(element, eventName, data) || null;
    }

    if (this.listeners.unhandled) {
      // Handle unexpected event by queue
      return this.listeners.unhandled.call(this, eventName, data) || null;
    }
  } catch (error) {
    return this.trigger('error', error) || null;
  }
};
Queue.prototype.next = function (data) {
  const element = this.first;
  debug(this, 'shift', element, data);

  if (element) {
    this.first = element.next;
    element.clearTimeout();
  }

  if (this.first) {
    this.trigger(INIT, data);

    return this.first;
  }

  this.last = null;

  try {
    this.onEnd && this.onEnd(data);
    this.handlers.end && this.handlers.end.call(this, data);
  } catch (error) {
    this.handlers.error && this.handlers.error.call(this, error);
  }

  return null;
};
Queue.prototype.clear = function () {
  debug(this, 'clear');
  this.last = this.first = null;

  return this;
};
Queue.prototype.isEmpty = function () {
  return !this.first;
};
Queue.prototype.on = function (listeners) {
  for (const handler in listeners) {
    if (listeners[handler] instanceof Function) {
      this.handlers[handler] = listeners[handler];
    }
  }

  return this;
}

module.exports = Queue;
