const INIT = 'init';
const TIMEOUT = 'timeout';

function Element (queue, listeners, params) {
  this.queue = queue;
  this.listeners = listeners;
  this.params = params;

  this.timeout = null;
}
Element.prototype.setTimeout = function (delay, message) {
  this.clearTimeout();
  const element = this;
  this.timeout = {
    delay: delay,
    callback: function () {
      element.queue.trigger(TIMEOUT, message);
    }
  };
  this.timeout.id = setTimeout(this.timeout.callback, delay);
};
Element.prototype.resetTimeout = function () {
  if (this.timeout) {
    clearTimeout(this.timeout.id);
    setTimeout(this.timeout.callback, this.timeout.delay);
  }
};
Element.prototype.clearTimeout = function () {
  if (this.timeout) {
    clearTimeout(this.timeout.id);
    this.timeout = null;
  }
};

function Queue () {
  this.queue = [];
  this.onEnd = null;
}
Queue.prototype.push = function (listeners = {}, params) {
  const element = new Element(this, listeners, params);
  if (this.queue.push(element) === 1) {
     this.trigger(INIT);
  }
  return element;
};
Queue.prototype.trigger = function (eventName, data) {
  this.queue[0]
    && this.queue[0].listeners[eventName] instanceof Function
    && this.queue[0].listeners[eventName].call(this.queue[0], data);
};
Queue.prototype.next = function (data) {
  this.queue.shift();
  this.queue[0] ? this.trigger(INIT, data) : (this.onEnd && this.onEnd(data));
};
Queue.prototype.clear = function () {
  this.queue = [];
  return this;
};
Queue.prototype.isEmpty = function () {
  return !this.queue.length;
};

module.exports = Queue;
