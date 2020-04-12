const Element = require('./element.js');
const INIT = 'init';

function debug (queue, type, element, data) {
  if (queue.debug instanceof Function) {
    queue.debug.call(queue, type, element, data);
  }
}

function Queue () {
  this.queue = [];
  this.onEnd = null;
}
Queue.prototype.push = function (listeners = {}, params) {
  const element = new Element(this, listeners, params);

  debug(this, 'push', element, params);

  if (this.queue.push(element) === 1) {
     this.trigger(INIT);
  }

  return element;
};
Queue.prototype.trigger = function (eventName, data) {
  debug(this, 'trigger:' + eventName, this.queue[0], data);

  return this.queue[0]
    && this.queue[0].listeners[eventName] instanceof Function
    && this.queue[0].listeners[eventName].call(this.queue[0], data)
    || null;
};
Queue.prototype.next = function (data) {
  const element = this.queue.shift();

  debug(this, 'shift', element, data);

  element && element.clearTimeout();

  if (this.queue[0]) {
    this.trigger(INIT, data);
    return this.queue[0];
  }

  this.onEnd && this.onEnd(data);
  return null;
};
Queue.prototype.clear = function () {
  debug(this, 'clear');
  this.queue = [];
  return this;
};
Queue.prototype.isEmpty = function () {
  return !this.queue.length;
};

module.exports = Queue;
