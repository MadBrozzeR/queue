const INIT = 'init';
const Element = require('./element.js');

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
  return this.queue[0]
    && this.queue[0].listeners[eventName] instanceof Function
    && this.queue[0].listeners[eventName].call(this.queue[0], data)
    || null;
};
Queue.prototype.next = function (data) {
  const element = this.queue.shift();
  element && element.clearTimeout();
  this.queue[0] ? this.trigger(INIT, data) : (this.onEnd && this.onEnd(data));
  return this.queue[0] || null;
};
Queue.prototype.clear = function () {
  this.queue = [];
  return this;
};
Queue.prototype.isEmpty = function () {
  return !this.queue.length;
};

module.exports = Queue;
