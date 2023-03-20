const TIMEOUT = 'timeout';

function Element (queue, listeners, params) {
  this.queue = queue;
  this.data = null;
  this.listeners = listeners;
  this.params = params;
  this.next = null;

  this.timeout = null;
}
Element.prototype.setTimeout = function (delay, message) {
  const queue = this.queue;
  this.clearTimeout();
  this.timeout = {
    delay: delay,
    callback: function () {
      queue.trigger(TIMEOUT, message);
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

module.exports = Element;
