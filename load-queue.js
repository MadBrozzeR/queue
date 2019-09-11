function Element (params, queue) {
  this.params = params;
  this.queue = queue;
}

Element.prototype.done = function elementDone () {
  const queue = this.queue;
  const index = queue.current.indexOf(this);

  queue.current.splice(index, 1);
  queue.listeners.done && queue.listeners.done.apply(this, arguments);
  start(queue);
}

function start (queue) {
  if (!queue.queue.length && !queue.current.length) {
    queue.listeners.end && queue.listeners.end.call(queue);
  } else if (queue.current.length < queue.max && queue.queue.length) {
    const element = queue.queue.shift();
    queue.current.push(element);
    queue.listeners.init && queue.listeners.init.call(element, element.params);
  }
}

function Queue (max, listeners = {}) {
  this.max = max;
  this.listeners = listeners;
  this.queue = [];
  this.current = [];
}

Queue.prototype.push = function queuePush (element) {
  this.queue.push(new Element(element, this));
  start(this);
};

module.exports = Queue;
